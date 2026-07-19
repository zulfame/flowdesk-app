from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta

from db import db
from helpers import new_id, now_iso, log_activity
from security import get_current_user
from services import delete_reminder

router = APIRouter(prefix="/reminders", tags=["reminders"])

OFFSETS = {"10m": timedelta(minutes=10), "1h": timedelta(hours=1), "1d": timedelta(days=1)}


def _remind_at(date: Optional[str], time: Optional[str]) -> Optional[str]:
    if not date:
        return None
    return f"{date}T{time or '09:00'}:00"


def _broadcast_at(remind_at: Optional[str], offset: str, custom: Optional[str]) -> Optional[str]:
    if not remind_at:
        return None
    if offset == "custom":
        return custom or None
    try:
        base = datetime.fromisoformat(remind_at)
    except Exception:
        return None
    return (base - OFFSETS.get(offset, OFFSETS["10m"])).isoformat()


class ReminderCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    remind_type: str = "custom"
    date: Optional[str] = None
    time: Optional[str] = "09:00"
    recurrence: Optional[str] = None
    broadcast: bool = False
    channels: List[str] = []
    broadcast_offset: str = "10m"  # 10m | 1h | 1d | custom
    broadcast_at: Optional[str] = None  # used when offset == custom
    done: bool = False


class ReminderUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    remind_type: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    recurrence: Optional[str] = None
    broadcast: Optional[bool] = None
    channels: Optional[List[str]] = None
    broadcast_offset: Optional[str] = None
    broadcast_at: Optional[str] = None
    done: Optional[bool] = None


@router.get("")
async def list_reminders(page: int = 1, page_size: int = 50, status: Optional[str] = None,
                         user: dict = Depends(get_current_user)):
    query = {"created_by": user["id"], "is_deleted": {"$ne": True}}
    if status == "active":
        query["done"] = {"$ne": True}
    elif status == "done":
        query["done"] = True
    total = await db.reminders.count_documents(query)
    page = max(1, page); page_size = min(max(1, page_size), 200)
    items = await db.reminders.find(query, {"_id": 0}).sort("remind_at", 1) \
        .skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.post("")
async def create_reminder(body: ReminderCreate, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc["remind_at"] = _remind_at(doc.get("date"), doc.get("time"))
    doc["broadcast_at"] = _broadcast_at(doc["remind_at"], doc.get("broadcast_offset", "10m"), doc.get("broadcast_at")) if doc.get("broadcast") else None
    doc.update({
        "id": new_id(), "dispatched": False, "broadcast_sent": False, "is_deleted": False,
        "created_by": user["id"], "created_by_name": user["name"], "created_at": now_iso(),
    })
    await db.reminders.insert_one(dict(doc))
    doc.pop("_id", None)
    await log_activity(db, user, "create", "reminder", doc["id"], f"Membuat pengingat '{doc['title']}'")
    return doc


@router.put("/{reminder_id}")
async def update_reminder(reminder_id: str, body: ReminderUpdate, user: dict = Depends(get_current_user)):
    existing = await db.reminders.find_one({"id": reminder_id, "created_by": user["id"]}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Pengingat tidak ditemukan")
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    touched = any(k in update for k in ("date", "time", "broadcast_offset", "broadcast_at", "broadcast"))
    if touched:
        remind_at = _remind_at(update.get("date", existing.get("date")), update.get("time", existing.get("time")))
        update["remind_at"] = remind_at
        bc = update.get("broadcast", existing.get("broadcast"))
        update["broadcast_at"] = _broadcast_at(remind_at, update.get("broadcast_offset", existing.get("broadcast_offset", "10m")), update.get("broadcast_at", existing.get("broadcast_at"))) if bc else None
        update["dispatched"] = False
        update["broadcast_sent"] = False
    await db.reminders.update_one({"id": reminder_id}, {"$set": update})
    await log_activity(db, user, "update", "reminder", reminder_id, f"Memperbarui pengingat '{existing['title']}'")
    return await db.reminders.find_one({"id": reminder_id}, {"_id": 0})


@router.delete("/{reminder_id}")
async def remove_reminder(reminder_id: str, user: dict = Depends(get_current_user)):
    r = await db.reminders.find_one({"id": reminder_id, "created_by": user["id"], "is_deleted": {"$ne": True}})
    if not r:
        raise HTTPException(status_code=404, detail="Pengingat tidak ditemukan")
    await delete_reminder(reminder_id, user)
    return {"message": "Pengingat dihapus"}
