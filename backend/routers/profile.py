from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr, Field
from typing import Optional

from db import db
import authty
from helpers import now_iso, log_activity
from security import hash_password, verify_password, get_current_user

router = APIRouter(prefix="/profile", tags=["profile"])


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    avatar: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)


def _clean(u: dict) -> dict:
    u.pop("password_hash", None)
    u.pop("_id", None)
    return u


@router.get("")
async def get_profile(user: dict = Depends(get_current_user)):
    return user


async def _propagate_identity(uid: str, fields: dict):
    """Keep denormalized copies consistent when a user changes name/email/phone/department."""
    person = {k: v for k, v in {
        "name": fields.get("name"),
        "email": fields.get("email"),
        "phone": fields.get("phone"),
        "department": fields.get("department"),
    }.items() if v is not None}
    if person:
        await db.tasks.update_many(
            {"requester.user_id": uid},
            {"$set": {f"requester.{k}": v for k, v in person.items()}},
        )
        await db.tasks.update_many(
            {"pic.user_id": uid},
            {"$set": {f"pic.{k}": v for k, v in person.items()}},
        )
    if fields.get("name"):
        name = fields["name"]
        await db.meetings.update_many({"created_by": uid}, {"$set": {"created_by_name": name}})
        await db.notes.update_many({"created_by": uid}, {"$set": {"created_by_name": name}})
        await db.reminders.update_many({"created_by": uid}, {"$set": {"created_by_name": name}})
        await db.tasks.update_many({"created_by": uid}, {"$set": {"created_by_name": name}})


@router.put("")
async def update_profile(body: ProfileUpdate, user: dict = Depends(get_current_user)):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if "email" in update:
        email = update["email"].lower()
        existing = await db.users.find_one({"email": email, "id": {"$ne": user["id"]}})
        if existing:
            raise HTTPException(status_code=400, detail="Email sudah digunakan pengguna lain")
        update["email"] = email
    if not update:
        return user
    await db.users.update_one({"id": user["id"]}, {"$set": update})
    await _propagate_identity(user["id"], update)
    await log_activity(db, user, "update", "user", user["id"], "Memperbarui profil pengguna")
    return await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})


@router.put("/password")
async def change_password(body: PasswordChange, user: dict = Depends(get_current_user)):
    full_doc = await db.users.find_one({"id": user["id"]})
    if full_doc and full_doc.get("auth_source") == "authty" and await authty.enabled():
        res = await authty.change_password(full_doc["email"], body.current_password, body.new_password)
        if not res["ok"]:
            raise HTTPException(status_code=503 if res.get("unreachable") else 400,
                                detail=res["message"])
        await authty.upsert_user(res["data"])
        await db.users.update_one({"id": user["id"]},
                                  {"$set": {"password_hash": hash_password(body.new_password)}})
        await log_activity(db, user, "update", "user", user["id"],
                           "Mengganti kata sandi via Authty (SSO)")
        return {"message": "Kata sandi berhasil diganti di Authty (SSO)", "source": "authty"}

    full = await db.users.find_one({"id": user["id"]})
    if not full or not verify_password(body.current_password, full.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Kata sandi saat ini salah")
    await db.users.update_one({"id": user["id"]}, {"$set": {"password_hash": hash_password(body.new_password)}})
    await log_activity(db, user, "update", "user", user["id"], "Mengubah kata sandi")
    return {"message": "Kata sandi berhasil diperbarui"}
