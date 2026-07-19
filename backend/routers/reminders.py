from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List

from db import db
from helpers import new_id, now_iso, log_activity
from security import get_current_user
from services import delete_reminder

router = APIRouter(prefix="/reminders", tags=["reminders"])


class ReminderCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    remind_type: str = "custom"  # today | tomorrow | custom | recurring
    date: Optional[str] = None
    recurrence: Optional[str] = None  # daily | weekly | monthly
    done: bool = False


class ReminderUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    remind_type: Optional[str] = None
    date: Optional[str] = None
    recurrence: Optional[str] = None
    done: Optional[bool] = None


@router.get("")
async def list_reminders(user: dict = Depends(get_current_user)):
    return await db.reminders.find({}, {"_id": 0}).sort("date", 1).to_list(1000)


@router.post("")
async def create_reminder(body: ReminderCreate, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc.update({
        "id": new_id(),
        "created_by": user["id"],
        "created_by_name": user["name"],
        "created_at": now_iso(),
    })
    await db.reminders.insert_one(dict(doc))
    doc.pop("_id", None)
    await log_activity(db, user, "create", "reminder", doc["id"], f"Membuat pengingat '{doc['title']}'")
    return doc


@router.put("/{reminder_id}")
async def update_reminder(reminder_id: str, body: ReminderUpdate, user: dict = Depends(get_current_user)):
    existing = await db.reminders.find_one({"id": reminder_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Pengingat tidak ditemukan")
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    await db.reminders.update_one({"id": reminder_id}, {"$set": update})
    await log_activity(db, user, "update", "reminder", reminder_id, f"Memperbarui pengingat '{existing['title']}'")
    return await db.reminders.find_one({"id": reminder_id}, {"_id": 0})


@router.delete("/{reminder_id}")
async def remove_reminder(reminder_id: str, user: dict = Depends(get_current_user)):
    ok = await delete_reminder(reminder_id, user)
    if not ok:
        raise HTTPException(status_code=404, detail="Pengingat tidak ditemukan")
    return {"message": "Pengingat dihapus"}
