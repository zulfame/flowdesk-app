from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List

from db import db
from helpers import new_id, now_iso, log_activity
from security import get_current_user
from services import delete_reminder

router = APIRouter(prefix="/reminders", tags=["reminders"])


def _remind_at(date: Optional[str], time: Optional[str]) -> Optional[str]:
    if not date:
        return None
    t = time or "09:00"
    return f"{date}T{t}:00"


class ReminderCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    remind_type: str = "custom"  # today | tomorrow | custom | recurring
    date: Optional[str] = None
    time: Optional[str] = "09:00"
    recurrence: Optional[str] = None  # daily | weekly | monthly
    broadcast: bool = False
    channels: List[str] = []  # email | telegram
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
    done: Optional[bool] = None


@router.get("")
async def list_reminders(page: int = 1, page_size: int = 50, status: Optional[str] = None,
                         user: dict = Depends(get_current_user)):
    query = {"created_by": user["id"]}
    if status == "active":
        query["done"] = {"$ne": True}
    elif status == "done":
        query["done"] = True
    total = await db.reminders.count_documents(query)
    page = max(1, page)
    page_size = min(max(1, page_size), 200)
    items = await db.reminders.find(query, {"_id": 0}).sort("remind_at", 1) \
        .skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.post("")
async def create_reminder(body: ReminderCreate, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc["remind_at"] = _remind_at(doc.get("date"), doc.get("time"))
    doc.update({
        "id": new_id(),
        "dispatched": False,
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
    existing = await db.reminders.find_one({"id": reminder_id, "created_by": user["id"]}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Pengingat tidak ditemukan")
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if "date" in update or "time" in update:
        update["remind_at"] = _remind_at(update.get("date", existing.get("date")), update.get("time", existing.get("time")))
        update["dispatched"] = False
    await db.reminders.update_one({"id": reminder_id}, {"$set": update})
    await log_activity(db, user, "update", "reminder", reminder_id, f"Memperbarui pengingat '{existing['title']}'")
    return await db.reminders.find_one({"id": reminder_id}, {"_id": 0})


@router.delete("/{reminder_id}")
async def remove_reminder(reminder_id: str, user: dict = Depends(get_current_user)):
    r = await db.reminders.find_one({"id": reminder_id, "created_by": user["id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Pengingat tidak ditemukan")
    ok = await delete_reminder(reminder_id, user)
    if not ok:
        raise HTTPException(status_code=404, detail="Pengingat tidak ditemukan")
    return {"message": "Pengingat dihapus"}
