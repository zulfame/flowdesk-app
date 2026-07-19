from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone

from db import db
from helpers import new_id, now_iso, log_activity
from security import get_current_user
from services import delete_task
from notifications import create_notification

router = APIRouter(prefix="/tasks", tags=["tasks"])

MANUAL_STATUSES = {"Draft", "Cancelled", "Archived"}


class ChecklistItem(BaseModel):
    id: Optional[str] = None
    text: str
    done: bool = False


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    requester: Optional[str] = ""
    pic: Optional[str] = ""
    priority: str = "Medium"
    deadline: Optional[str] = None
    checklist: List[ChecklistItem] = []
    status: str = "Pending"
    meeting_id: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    requester: Optional[str] = None
    pic: Optional[str] = None
    priority: Optional[str] = None
    deadline: Optional[str] = None
    checklist: Optional[List[ChecklistItem]] = None
    status: Optional[str] = None


class CommentBody(BaseModel):
    text: str


def compute(task: dict) -> dict:
    checklist = task.get("checklist", [])
    total = len(checklist)
    done = sum(1 for c in checklist if c.get("done"))
    progress = round(done / total * 100) if total else (100 if task.get("status") == "Completed" else 0)
    task["progress"] = progress

    status = task.get("status", "Pending")
    if status not in MANUAL_STATUSES:
        overdue = False
        if task.get("deadline"):
            try:
                dl = datetime.fromisoformat(task["deadline"].replace("Z", "+00:00"))
                if dl.tzinfo is None:
                    dl = dl.replace(tzinfo=timezone.utc)
                overdue = dl < datetime.now(timezone.utc)
            except Exception:
                overdue = False
        if total and done == total:
            status = "Completed"
        elif overdue:
            status = "Overdue"
        elif progress > 0:
            status = "On Progress"
        else:
            status = "Pending"
    task["status"] = status
    return task


def _norm_checklist(items) -> list:
    out = []
    for c in items:
        d = c.model_dump() if hasattr(c, "model_dump") else dict(c)
        if not d.get("id"):
            d["id"] = new_id()
        out.append(d)
    return out


@router.get("")
async def list_tasks(status: Optional[str] = None, pic: Optional[str] = None,
                     priority: Optional[str] = None, meeting_id: Optional[str] = None,
                     user: dict = Depends(get_current_user)):
    q = {}
    if pic:
        q["pic"] = pic
    if priority:
        q["priority"] = priority
    if meeting_id:
        q["meeting_id"] = meeting_id
    tasks = await db.tasks.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    tasks = [compute(t) for t in tasks]
    if status:
        tasks = [t for t in tasks if t["status"] == status]
    return tasks


@router.get("/{task_id}")
async def get_task(task_id: str, user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Tugas tidak ditemukan")
    task = compute(task)
    task["attachments"] = await db.files.find(
        {"parent_id": task_id, "is_deleted": False}, {"_id": 0}
    ).to_list(200)
    return task


@router.post("")
async def create_task(body: TaskCreate, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc["checklist"] = _norm_checklist(body.checklist)
    doc.update({
        "id": new_id(),
        "comments": [],
        "history": [{"action": "created", "by": user["name"], "at": now_iso()}],
        "created_by": user["id"],
        "created_by_name": user["name"],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    })
    doc = compute(doc)
    await db.tasks.insert_one(dict(doc))
    doc.pop("_id", None)
    await log_activity(db, user, "create", "task", doc["id"], f"Membuat tugas '{doc['title']}'")
    if doc.get("pic"):
        await create_notification(None, "Tugas Baru", f"Tugas '{doc['title']}' ditugaskan ke {doc['pic']}", "task", f"/tasks/{doc['id']}")
    return doc


@router.put("/{task_id}")
async def update_task(task_id: str, body: TaskUpdate, user: dict = Depends(get_current_user)):
    existing = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Tugas tidak ditemukan")
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if "checklist" in update:
        update["checklist"] = _norm_checklist(body.checklist)
    update["updated_at"] = now_iso()
    merged = {**existing, **update}
    merged = compute(merged)
    update["progress"] = merged["progress"]
    update["status"] = merged["status"]
    history = existing.get("history", [])
    history.append({"action": "updated", "by": user["name"], "at": now_iso()})
    update["history"] = history
    await db.tasks.update_one({"id": task_id}, {"$set": update})
    await log_activity(db, user, "update", "task", task_id, f"Memperbarui tugas '{existing['title']}'")
    result = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    return compute(result)


@router.post("/{task_id}/comments")
async def add_comment(task_id: str, body: CommentBody, user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Tugas tidak ditemukan")
    comment = {"id": new_id(), "text": body.text, "by": user["name"], "user_id": user["id"], "at": now_iso()}
    await db.tasks.update_one({"id": task_id}, {"$push": {"comments": comment}})
    await log_activity(db, user, "comment", "task", task_id, f"Berkomentar pada '{task['title']}'")
    return comment


@router.delete("/{task_id}")
async def remove_task(task_id: str, user: dict = Depends(get_current_user)):
    ok = await delete_task(task_id, user)
    if not ok:
        raise HTTPException(status_code=404, detail="Tugas tidak ditemukan")
    return {"message": "Tugas dihapus"}
