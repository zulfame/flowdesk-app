from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List

from db import db
from helpers import new_id, now_iso, log_activity
from security import hash_password, get_current_user, require_admin

router = APIRouter(tags=["users"])

DEFAULT_ROLES = [
    {"name": "admin", "label": "Administrator", "permissions": ["*"]},
    {"name": "manager", "label": "Manajer", "permissions": ["task", "meeting", "reminder", "note", "report"]},
    {"name": "member", "label": "Anggota", "permissions": ["task", "meeting", "reminder", "note"]},
]


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    role: str = "member"
    phone: Optional[str] = None
    department: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class RoleBody(BaseModel):
    name: str
    label: str
    permissions: List[str] = []


def _clean(u: dict) -> dict:
    u.pop("password_hash", None)
    u.pop("_id", None)
    return u


@router.get("/users")
async def list_users(user: dict = Depends(get_current_user)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(1000)
    return users


@router.post("/users")
async def create_user(body: UserCreate, admin: dict = Depends(require_admin)):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")
    doc = {
        "id": new_id(),
        "name": body.name,
        "email": email,
        "password_hash": hash_password(body.password),
        "role": body.role,
        "permissions": [],
        "phone": body.phone,
        "department": body.department,
        "avatar": None,
        "is_active": True,
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    await log_activity(db, admin, "create", "user", doc["id"], f"Membuat pengguna {email}")
    return _clean(dict(doc))


@router.put("/users/{user_id}")
async def update_user(user_id: str, body: UserUpdate, admin: dict = Depends(require_admin)):
    existing = await db.users.find_one({"id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Pengguna tidak ditemukan")
    update = {k: v for k, v in body.model_dump().items() if v is not None and k != "password"}
    if body.password:
        update["password_hash"] = hash_password(body.password)
    await db.users.update_one({"id": user_id}, {"$set": update})
    await log_activity(db, admin, "update", "user", user_id, f"Memperbarui pengguna {existing['email']}")
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return updated


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Tidak dapat menghapus akun sendiri")
    existing = await db.users.find_one({"id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Pengguna tidak ditemukan")
    await db.users.delete_one({"id": user_id})
    await log_activity(db, admin, "delete", "user", user_id, f"Menghapus pengguna {existing['email']}")
    return {"message": "Pengguna dihapus"}


@router.get("/roles")
async def list_roles(user: dict = Depends(get_current_user)):
    roles = await db.roles.find({}, {"_id": 0}).to_list(100)
    if not roles:
        for r in DEFAULT_ROLES:
            await db.roles.insert_one({"id": new_id(), **r})
        roles = await db.roles.find({}, {"_id": 0}).to_list(100)
    return roles


@router.post("/roles")
async def create_role(body: RoleBody, admin: dict = Depends(require_admin)):
    if await db.roles.find_one({"name": body.name}):
        raise HTTPException(status_code=400, detail="Role sudah ada")
    doc = {"id": new_id(), **body.model_dump()}
    await db.roles.insert_one(doc)
    doc.pop("_id", None)
    await log_activity(db, admin, "create", "role", doc["id"], f"Membuat role {body.name}")
    return doc


@router.put("/roles/{role_id}")
async def update_role(role_id: str, body: RoleBody, admin: dict = Depends(require_admin)):
    await db.roles.update_one({"id": role_id}, {"$set": body.model_dump()})
    return await db.roles.find_one({"id": role_id}, {"_id": 0})


@router.delete("/roles/{role_id}")
async def delete_role(role_id: str, admin: dict = Depends(require_admin)):
    role = await db.roles.find_one({"id": role_id})
    if role and role.get("name") in ("admin", "manager", "member"):
        raise HTTPException(status_code=400, detail="Role bawaan tidak dapat dihapus")
    await db.roles.delete_one({"id": role_id})
    return {"message": "Role dihapus"}
