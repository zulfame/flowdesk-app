from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Dict, Any

from db import db
from helpers import now_iso
from security import get_current_user
from webpush import get_keys

router = APIRouter(prefix="/push", tags=["push"])


class SubscribeBody(BaseModel):
    subscription: Dict[str, Any]


@router.get("/public-key")
async def public_key(user: dict = Depends(get_current_user)):
    keys = await get_keys()
    return {"public_key": keys["public_key"]}


@router.post("/subscribe")
async def subscribe(body: SubscribeBody, user: dict = Depends(get_current_user)):
    endpoint = body.subscription.get("endpoint")
    doc = {
        "endpoint": endpoint,
        "user_id": user["id"],
        "subscription": body.subscription,
        "created_at": now_iso(),
    }
    await db.push_subscriptions.update_one({"endpoint": endpoint}, {"$set": doc}, upsert=True)
    return {"message": "Berlangganan notifikasi push"}


@router.post("/unsubscribe")
async def unsubscribe(body: SubscribeBody, user: dict = Depends(get_current_user)):
    endpoint = body.subscription.get("endpoint")
    await db.push_subscriptions.delete_one({"endpoint": endpoint})
    return {"message": "Berhenti berlangganan"}
