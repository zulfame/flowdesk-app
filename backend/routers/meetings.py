from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List

from db import db
from helpers import new_id, now_iso, log_activity
from security import get_current_user
from services import delete_meeting
from notifications import create_notification

router = APIRouter(prefix="/meetings", tags=["meetings"])


class ActionItemBody(BaseModel):
    id: Optional[str] = None
    text: str
    assignee: Optional[str] = ""
    done: bool = False
    converted_task_id: Optional[str] = None


class MeetingCreate(BaseModel):
    title: str
    date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    location: Optional[str] = ""
    meeting_type: str = "Internal"
    participants: List[str] = []
    agenda: Optional[str] = ""
    notes: Optional[str] = ""
    decisions: Optional[str] = ""
    action_items: List[ActionItemBody] = []


class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    location: Optional[str] = None
    meeting_type: Optional[str] = None
    participants: Optional[List[str]] = None
    agenda: Optional[str] = None
    notes: Optional[str] = None
    decisions: Optional[str] = None
    action_items: Optional[List[ActionItemBody]] = None


def _norm_items(items) -> list:
    out = []
    for it in items:
        d = it.model_dump() if hasattr(it, "model_dump") else dict(it)
        if not d.get("id"):
            d["id"] = new_id()
        out.append(d)
    return out


@router.get("")
async def list_meetings(user: dict = Depends(get_current_user)):
    meetings = await db.meetings.find({}, {"_id": 0}).sort("date", -1).to_list(1000)
    return meetings


@router.get("/{meeting_id}")
async def get_meeting(meeting_id: str, user: dict = Depends(get_current_user)):
    m = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    if not m:
        raise HTTPException(status_code=404, detail="Rapat tidak ditemukan")
    m["attachments"] = await db.files.find(
        {"parent_id": meeting_id, "is_deleted": False}, {"_id": 0}
    ).to_list(200)
    m["generated_tasks"] = await db.tasks.find(
        {"meeting_id": meeting_id}, {"_id": 0, "id": 1, "title": 1, "status": 1, "progress": 1}
    ).to_list(200)
    return m


@router.post("")
async def create_meeting(body: MeetingCreate, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc["action_items"] = _norm_items(body.action_items)
    doc.update({
        "id": new_id(),
        "history": [{"action": "created", "by": user["name"], "at": now_iso()}],
        "created_by": user["id"],
        "created_by_name": user["name"],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    })
    await db.meetings.insert_one(dict(doc))
    doc.pop("_id", None)
    await log_activity(db, user, "create", "meeting", doc["id"], f"Membuat rapat '{doc['title']}'")
    return doc


@router.put("/{meeting_id}")
async def update_meeting(meeting_id: str, body: MeetingUpdate, user: dict = Depends(get_current_user)):
    existing = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Rapat tidak ditemukan")
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if "action_items" in update:
        update["action_items"] = _norm_items(body.action_items)
    update["updated_at"] = now_iso()
    history = existing.get("history", [])
    history.append({"action": "updated", "by": user["name"], "at": now_iso()})
    update["history"] = history
    await db.meetings.update_one({"id": meeting_id}, {"$set": update})
    await log_activity(db, user, "update", "meeting", meeting_id, f"Memperbarui rapat '{existing['title']}'")
    return await db.meetings.find_one({"id": meeting_id}, {"_id": 0})


@router.post("/{meeting_id}/action-items/{item_id}/convert")
async def convert_action_item(meeting_id: str, item_id: str, user: dict = Depends(get_current_user)):
    meeting = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    if not meeting:
        raise HTTPException(status_code=404, detail="Rapat tidak ditemukan")
    item = next((i for i in meeting.get("action_items", []) if i.get("id") == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Action item tidak ditemukan")
    if item.get("converted_task_id"):
        raise HTTPException(status_code=400, detail="Sudah dikonversi menjadi tugas")

    task = {
        "id": new_id(),
        "title": item["text"],
        "description": f"Dibuat dari rapat: {meeting['title']}",
        "requester": meeting.get("created_by_name", ""),
        "pic": item.get("assignee", ""),
        "priority": "Medium",
        "deadline": None,
        "checklist": [],
        "comments": [],
        "history": [{"action": "created_from_meeting", "by": user["name"], "at": now_iso()}],
        "status": "Pending",
        "progress": 0,
        "meeting_id": meeting_id,
        "meeting_title": meeting["title"],
        "created_by": user["id"],
        "created_by_name": user["name"],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.tasks.insert_one(dict(task))
    await db.meetings.update_one(
        {"id": meeting_id, "action_items.id": item_id},
        {"$set": {"action_items.$.converted_task_id": task["id"]}},
    )
    task.pop("_id", None)
    await log_activity(db, user, "create", "task", task["id"], f"Mengonversi action item menjadi tugas '{task['title']}'")
    await create_notification(None, "Action Item Dikonversi", f"'{task['title']}' kini menjadi tugas", "task", f"/tasks/{task['id']}")
    return task


@router.delete("/{meeting_id}")
async def remove_meeting(meeting_id: str, user: dict = Depends(get_current_user)):
    ok = await delete_meeting(meeting_id, user)
    if not ok:
        raise HTTPException(status_code=404, detail="Rapat tidak ditemukan")
    return {"message": "Rapat dihapus"}
