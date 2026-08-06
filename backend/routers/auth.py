from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, EmailStr, Field

from db import db
import authty
from helpers import new_id, now_iso, log_activity
from security import hash_password, verify_password, create_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

MAX_ATTEMPTS = 5
LOCK_MINUTES = 15


class RegisterBody(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)


class LoginBody(BaseModel):
    # Kredensial fleksibel: email, username, atau nomor HP (Authty menerima ketiganya).
    email: str = Field(min_length=1)
    password: str


def _public_user(u: dict) -> dict:
    u = dict(u)
    u.pop("password_hash", None)
    u.pop("_id", None)
    return u


async def _with_perms(u: dict) -> dict:
    """Kembalikan user + daftar izin efektif (gabungan izin peran) untuk gating menu di frontend."""
    u = _public_user(u)
    own = set(u.get("permissions") or [])
    if u.get("role") == "super_admin" or "*" in own:
        u["permissions"] = ["*"]
        return u
    role = await db.roles.find_one({"name": u.get("role")}, {"_id": 0})
    if role:
        role_perms = set(role.get("permissions") or [])
        if not role_perms:  # peran mewarisi izin level jabatannya
            cfg = await db.settings.find_one({"key": "app"}, {"_id": 0, "role_levels": 1})
            levels = (cfg or {}).get("role_levels") or {}
            role_perms = set(levels.get(role.get("level") or "") or [])
        own |= role_perms
        if "*" in role_perms:
            u["permissions"] = ["*"]
            return u
    u["permissions"] = list(own)
    return u


@router.post("/register")
async def register(body: RegisterBody):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")
    count = await db.users.count_documents({})
    user = {
        "id": new_id(),
        "name": body.name,
        "email": email,
        "password_hash": hash_password(body.password),
        "role": "super_admin" if count == 0 else "guest",
        "permissions": [],
        "is_active": True,
        "avatar": None,
        "phone": None,
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    await log_activity(db, user, "create", "user", user["id"], f"Registrasi pengguna {email}")
    token = create_token(user["id"], email)
    return {"token": token, "user": await _with_perms(user)}


def _client_ip(request: Request) -> str:
    """Di belakang ingress, request.client.host = IP proxy — ambil IP pertama dari XFF."""
    xff = request.headers.get("x-forwarded-for") or ""
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.post("/login")
async def login(body: LoginBody, request: Request):
    identity = (body.email or "").strip()
    email = identity.lower()
    ip = _client_ip(request)
    identifier = f"{ip}:{email}"

    attempt = await db.login_attempts.find_one({"identifier": identifier})
    from datetime import datetime, timezone, timedelta
    now = datetime.now(timezone.utc)
    if attempt and attempt.get("count", 0) >= MAX_ATTEMPTS:
        locked_until = attempt.get("locked_until")
        if locked_until and datetime.fromisoformat(locked_until) > now:
            raise HTTPException(status_code=429, detail="Terlalu banyak percobaan. Coba lagi nanti.")

    async def _register_fail():
        new_count = (attempt.get("count", 0) if attempt else 0) + 1
        update = {"count": new_count, "identifier": identifier}
        if new_count >= MAX_ATTEMPTS:
            update["locked_until"] = (now + timedelta(minutes=LOCK_MINUTES)).isoformat()
        await db.login_attempts.update_one({"identifier": identifier}, {"$set": update}, upsert=True)

    user = None
    if await authty.enabled():
        res = await authty.verify_credentials(identity, body.password)
        if res["ok"]:
            user = await authty.upsert_user(res["data"])
            await log_activity(db, user, "login", "auth", user["id"],
                               f"Sinkron Authty {user['email']} → jabatan {user.get('role')}")
            if not user.get("is_active", True):
                raise HTTPException(status_code=403, detail="Akun dinonaktifkan")
        else:
            cfg = await authty.get_config()
            local = await db.users.find_one({"email": email})
            allow_local = (cfg["allow_local_fallback"] and local and local.get("password_hash")
                           and (local.get("role") == "super_admin"
                                or "*" in (local.get("permissions") or [])))
            if allow_local and verify_password(body.password, local["password_hash"]):
                user = local
            else:
                await _register_fail()
                raise HTTPException(status_code=503 if res.get("unreachable") else 401,
                                    detail=res["message"])
    else:
        user = await db.users.find_one({"email": email})
        if not user or not verify_password(body.password, user.get("password_hash") or ""):
            await _register_fail()
            raise HTTPException(status_code=401, detail="Email atau kata sandi salah")
        if not user.get("is_active", True):
            raise HTTPException(status_code=403, detail="Akun dinonaktifkan")

    email = user["email"]
    await db.login_attempts.delete_many({"identifier": {"$in": [identifier, f"{ip}:{email}"]}})
    await log_activity(db, user, "login", "auth", user["id"], f"{email} masuk")
    cfg = await db.settings.find_one({"key": "app"}, {"_id": 0, "security": 1})
    hours = ((cfg or {}).get("security") or {}).get("session_hours")
    token = create_token(user["id"], email, hours=hours)
    return {"token": token, "user": await _with_perms(user)}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return await _with_perms(user)


@router.post("/logout")
async def logout(user: dict = Depends(get_current_user)):
    await log_activity(db, user, "logout", "auth", user["id"], f"{user['email']} keluar")
    return {"message": "Berhasil keluar"}
