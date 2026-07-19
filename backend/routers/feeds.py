from fastapi import APIRouter, Depends, HTTPException
from typing import Optional

from db import db
from helpers import now_iso
from security import get_current_user
from notifications import whatsapp_url
from pydantic import BaseModel

router = APIRouter(tags=["feeds"])


class WhatsAppBody(BaseModel):
    phone: str
    message: str


@router.get("/notifications")
async def list_notifications(user: dict = Depends(get_current_user)):
    q = {"$or": [{"user_id": user["id"]}, {"user_id": None}]}
    items = await db.notifications.find(q, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
    unread = sum(1 for i in items if not i.get("is_read"))
    return {"items": items, "unread": unread}


@router.put("/notifications/{notif_id}/read")
async def mark_read(notif_id: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"id": notif_id}, {"$set": {"is_read": True}})
    return {"message": "Ditandai dibaca"}


@router.put("/notifications/read-all")
async def mark_all_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {"$or": [{"user_id": user["id"]}, {"user_id": None}]}, {"$set": {"is_read": True}}
    )
    return {"message": "Semua ditandai dibaca"}


@router.post("/notifications/whatsapp-url")
async def gen_whatsapp(body: WhatsAppBody, user: dict = Depends(get_current_user)):
    return {"url": whatsapp_url(body.phone, body.message)}


@router.get("/activity-logs")
async def activity_logs(entity_type: Optional[str] = None, action: Optional[str] = None,
                        q: Optional[str] = None, page: int = 1, page_size: int = 30,
                        user: dict = Depends(get_current_user)):
    query = {}
    if entity_type and entity_type != "all":
        query["entity_type"] = entity_type
    if action and action != "all":
        query["action"] = action
    if q:
        rx = {"$regex": q, "$options": "i"}
        query["$or"] = [{"description": rx}, {"user_name": rx}]
    total = await db.activity_logs.count_documents(query)
    page = max(1, page)
    page_size = min(max(1, page_size), 100)
    items = await db.activity_logs.find(query, {"_id": 0}).sort("created_at", -1) \
        .skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    return {"items": items, "total": total, "page": page, "page_size": page_size}
