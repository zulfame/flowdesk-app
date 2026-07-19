from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone

from db import db
from helpers import new_id, now_iso, log_activity
from security import get_current_user
from services import delete_task
from notifications import create_notification, get_settings, _send_email, whatsapp_url

router = APIRouter(prefix="/tasks", tags=["tasks"])

MANUAL_STATUSES = {"Draft", "Cancelled", "Archived"}


class Person(BaseModel):
    user_id: Optional[str] = None
    name: Optional[str] = ""
    department: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""


EMPTY_PERSON = {"user_id": None, "name": "", "department": "", "phone": "", "email": ""}


class DocResponse(BaseModel):
    id: Optional[str] = None
    kind: str = "file"           # file | url
    file_id: Optional[str] = None
    filename: Optional[str] = None
    url: Optional[str] = None
    label: Optional[str] = None
    status: str = "revisi"       # revisi | final
    note: Optional[str] = ""
    created_at: Optional[str] = None


class SourceDoc(BaseModel):
    id: Optional[str] = None
    kind: str = "file"           # file | url
    file_id: Optional[str] = None
    filename: Optional[str] = None
    url: Optional[str] = None
    label: Optional[str] = None
    responses: List[DocResponse] = []
    created_at: Optional[str] = None


class TaskItem(BaseModel):
    id: Optional[str] = None
    title: str
    done: bool = False
    done_at: Optional[str] = None
    due_date: Optional[str] = None
    documents: List[SourceDoc] = []


class TaskCreate(BaseModel):
    id: Optional[str] = None
    title: str
    description: Optional[str] = ""
    requester: Optional[Person] = None
    pic: Optional[Person] = None
    priority: str = "Medium"
    deadline: Optional[str] = None
    items: List[TaskItem] = []
    documents: List[SourceDoc] = []
    status: str = "Pending"
    meeting_id: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    requester: Optional[Person] = None
    pic: Optional[Person] = None
    priority: Optional[str] = None
    deadline: Optional[str] = None
    items: Optional[List[TaskItem]] = None
    documents: Optional[List[SourceDoc]] = None
    status: Optional[str] = None


class CommentBody(BaseModel):
    text: str


class BroadcastBody(BaseModel):
    message: Optional[str] = None
    channels: List[str] = ["email", "whatsapp"]


def compute(task: dict) -> dict:
    items = task.get("items")
    if items is None:
        # backward compat with old 'checklist'
        items = task.get("checklist", [])
    total = len(items)
    done = sum(1 for c in items if c.get("done"))
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


def _norm_docs(docs) -> list:
    out = []
    for doc in docs or []:
        d = doc.model_dump() if hasattr(doc, "model_dump") else dict(doc)
        if not d.get("id"):
            d["id"] = new_id()
        if not d.get("created_at"):
            d["created_at"] = now_iso()
        responses = []
        for r in d.get("responses", []) or []:
            rd = r.model_dump() if hasattr(r, "model_dump") else dict(r)
            if not rd.get("id"):
                rd["id"] = new_id()
            if not rd.get("created_at"):
                rd["created_at"] = now_iso()
            responses.append(rd)
        d["responses"] = responses
        out.append(d)
    return out


def _norm_items(items) -> list:
    out = []
    for it in items or []:
        d = it.model_dump() if hasattr(it, "model_dump") else dict(it)
        if not d.get("id"):
            d["id"] = new_id()
        d["documents"] = _norm_docs(d.get("documents", []))
        if d.get("done"):
            if not d.get("done_at"):
                d["done_at"] = now_iso()
        else:
            d["done_at"] = None
        out.append(d)
    return out


async def _notify_pic(task: dict):
    """Notify the assigned PIC: in-app notification + best-effort email; returns wa.me URL if phone set."""
    pic = task.get("pic") or {}
    if isinstance(pic, str):
        pic = {"name": pic}
    name = pic.get("name")
    if not name:
        return None
    msg = (f"Halo {name}, Anda ditugaskan sebagai PIC pada tugas '{task['title']}' "
           f"(prioritas {task.get('priority', '-')}). Mohon ditindaklanjuti.")
    await create_notification(pic.get("user_id"), "Tugas Ditugaskan",
                              f"Tugas '{task['title']}' ditugaskan kepada Anda", "task", f"/tasks/{task['id']}")
    if pic.get("email"):
        settings = await get_settings()
        _send_email(settings.get("email", {}), f"Penugasan Tugas: {task['title']}", msg, to_override=pic["email"])
    if pic.get("phone"):
        return whatsapp_url(pic["phone"], msg)
    return None


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
    tid = body.id or new_id()
    if await db.tasks.find_one({"id": tid}):
        raise HTTPException(status_code=400, detail="Tugas dengan id ini sudah ada")
    doc = body.model_dump()
    doc.pop("id", None)
    doc["requester"] = (body.requester.model_dump() if body.requester else dict(EMPTY_PERSON))
    doc["pic"] = (body.pic.model_dump() if body.pic else dict(EMPTY_PERSON))
    doc["items"] = _norm_items(body.items)
    doc["documents"] = _norm_docs(body.documents)
    doc.update({
        "id": tid,
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
    doc["pic_wa_url"] = await _notify_pic(doc)
    return doc


@router.put("/{task_id}")
async def update_task(task_id: str, body: TaskUpdate, user: dict = Depends(get_current_user)):
    existing = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Tugas tidak ditemukan")
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if "items" in update:
        update["items"] = _norm_items(body.items)
    if "documents" in update:
        update["documents"] = _norm_docs(body.documents)
    if body.requester is not None:
        update["requester"] = body.requester.model_dump()
    if body.pic is not None:
        update["pic"] = body.pic.model_dump()
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
    result = compute(result)

    # Notify PIC if assignment changed
    pic_wa_url = None
    if body.pic is not None:
        new_pic = update.get("pic") or {}
        old_pic = existing.get("pic") or {}
        old_pic = old_pic if isinstance(old_pic, dict) else {"name": old_pic}
        if new_pic.get("name") and (new_pic.get("user_id") != old_pic.get("user_id") or new_pic.get("name") != old_pic.get("name")):
            pic_wa_url = await _notify_pic(result)
    result["pic_wa_url"] = pic_wa_url
    return result


@router.post("/{task_id}/comments")
async def add_comment(task_id: str, body: CommentBody, user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Tugas tidak ditemukan")
    comment = {"id": new_id(), "text": body.text, "by": user["name"], "user_id": user["id"], "at": now_iso()}
    await db.tasks.update_one({"id": task_id}, {"$push": {"comments": comment}})
    await log_activity(db, user, "comment", "task", task_id, f"Berkomentar pada '{task['title']}'")
    return comment


@router.post("/{task_id}/broadcast")
async def broadcast_task(task_id: str, body: BroadcastBody, user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Tugas tidak ditemukan")
    task = compute(task)
    req = task.get("requester") or {}
    if isinstance(req, str):
        req = {"name": req}
    message = body.message or (
        f"Halo {req.get('name', '')}, update tugas '{task['title']}': "
        f"status {task['status']}, progres {task['progress']}%."
    )
    result = {"wa_url": None, "email_sent": False}

    if "whatsapp" in body.channels and req.get("phone"):
        result["wa_url"] = whatsapp_url(req["phone"], message)

    if "email" in body.channels and req.get("email"):
        settings = await get_settings()
        _send_email(settings.get("email", {}), f"Pemberitahuan Tugas: {task['title']}", message, to_override=req["email"])
        result["email_sent"] = True

    await create_notification(None, "Broadcast Tugas", f"Pemberitahuan tugas '{task['title']}' dikirim ke pemberi tugas", "task", f"/tasks/{task_id}")
    await log_activity(db, user, "update", "task", task_id, f"Mengirim broadcast pemberitahuan untuk '{task['title']}'")
    return result


@router.delete("/{task_id}")
async def remove_task(task_id: str, user: dict = Depends(get_current_user)):
    ok = await delete_task(task_id, user)
    if not ok:
        raise HTTPException(status_code=404, detail="Tugas tidak ditemukan")
    return {"message": "Tugas dihapus"}
