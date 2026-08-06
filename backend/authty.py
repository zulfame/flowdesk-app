"""Authty Secure Identity — verifikasi kredensial server-to-server + JIT provisioning.

Cakupan sengaja dibatasi pada SSO: login, sinkronisasi data pengguna & jabatan, dan
ganti kata sandi sendiri. Data kantor/device (office, mso_code, collector_code, geofence)
TIDAK diambil karena tidak dipakai FlowDesk.
"""
import re
from datetime import datetime, timezone

import httpx

import crypto
from db import db
from helpers import new_id, guess_role_level

GUEST_ROLE = "guest"


async def get_config(reveal: bool = False) -> dict:
    doc = await db.settings.find_one({"key": "app"}, {"_id": 0, "security": 1}) or {}
    sec = doc.get("security") or {}
    key = crypto.decrypt(sec.get("authty_api_key") or "")
    return {
        "enabled": bool(sec.get("authty_enabled")),
        "base_url": (sec.get("authty_base_url") or "").strip().rstrip("/"),
        "timeout": float(sec.get("authty_timeout") or 10),
        "allow_local_fallback": sec.get("authty_allow_local_superadmin") is not False,
        "api_key": key if reveal else crypto.mask(key),
        "api_key_set": bool(key),
    }


async def enabled() -> bool:
    cfg = await get_config(reveal=True)
    return bool(cfg["enabled"] and cfg["base_url"] and cfg["api_key"])


async def _call(path: str, payload: dict) -> dict:
    """-> {"ok": True, "data": {...}} | {"ok": False, "message", "status", "unreachable"}"""
    cfg = await get_config(reveal=True)
    if not (cfg["enabled"] and cfg["base_url"] and cfg["api_key"]):
        return {"ok": False, "status": 400, "unreachable": False,
                "message": "Autentikasi terpusat belum diaktifkan"}
    try:
        async with httpx.AsyncClient(timeout=cfg["timeout"]) as client:
            r = await client.post(
                f"{cfg['base_url']}{path}",
                json=payload,
                headers={"Accept": "application/json", "X-API-Key": cfg["api_key"]},
            )
    except httpx.HTTPError:
        return {"ok": False, "unreachable": True, "status": 503,
                "message": "Layanan autentikasi terpusat tidak dapat dihubungi"}
    try:
        body = r.json()
    except ValueError:
        body = {}
    if r.status_code < 300 and body.get("success"):
        data = body.get("data") or {}
        if not data.get("user"):
            return {"ok": False, "unreachable": False, "status": 502,
                    "message": "Balasan layanan autentikasi tidak dikenali"}
        return {"ok": True, "data": data}
    return {"ok": False, "unreachable": False, "status": r.status_code,
            "message": body.get("message") or "Permintaan ke Authty gagal"}


async def verify_credentials(username: str, password: str) -> dict:
    return await _call("/api/user-auth", {"username": username, "password": password})


async def change_password(email: str, current_password: str, password: str) -> dict:
    return await _call("/api/user-password", {
        "email": email,
        "current_password": current_password,
        "password": password,
        "confirmed_password": password,
    })


def _slug(value: str) -> str:
    return re.sub(r"^_+|_+$", "", re.sub(r"[^a-z0-9]+", "_", (value or "").lower()))


async def ensure_guest_role() -> None:
    if not await db.roles.find_one({"name": GUEST_ROLE}):
        await db.roles.insert_one({
            "id": new_id(), "name": GUEST_ROLE, "label": "Guest", "permissions": [],
            "parent_id": None, "level": "Staff", "is_system": True,
        })


async def resolve_role_name(authty_role: str) -> str:
    """Cocokkan nama jabatan Authty ke peran lokal: label (case-insensitive) lalu slug."""
    name = (authty_role or "").strip()
    if name:
        doc = await db.roles.find_one(
            {"label": {"$regex": f"^{re.escape(name)}$", "$options": "i"}}, {"_id": 0, "name": 1}
        )
        if doc:
            return doc["name"]
        doc = await db.roles.find_one({"name": _slug(name)}, {"_id": 0, "name": 1})
        if doc:
            return doc["name"]
    await ensure_guest_role()
    return GUEST_ROLE


async def upsert_user(data: dict) -> dict:
    """JIT provisioning: buat/perbarui pengguna lokal dari payload Authty."""
    u = data.get("user") or {}
    email = (u.get("email") or "").strip().lower()
    if not email:
        uname = (u.get("username") or "").strip().lower()
        if not uname:
            raise ValueError("Payload Authty tanpa email dan username")
        email = f"{uname}@authty.local"

    role_name = await resolve_role_name(u.get("role"))
    now = datetime.now(timezone.utc).isoformat()
    fields = {
        "email": email,
        "name": u.get("name") or email,
        "role": role_name,
        "is_active": bool(u.get("is_active", True)),
        "auth_source": "authty",
        "authty_id": u.get("id"),
        "authty_role": u.get("role") or "",
        "username": u.get("username") or "",
        "phone": str(u.get("phone") or ""),
        "alias": u.get("alias") or "",
        "authty_synced_at": now,
    }
    existing = await db.users.find_one({"email": email}, {"_id": 0, "id": 1})
    if existing:
        await db.users.update_one({"email": email}, {"$set": fields})
    else:
        await db.users.insert_one({
            "id": new_id(), "permissions": [], "avatar": None, "department": "",
            "created_at": now, **fields,
        })
    return await db.users.find_one({"email": email}, {"_id": 0})


async def role_summary(role_name: str) -> dict:
    """Info pemetaan untuk tombol Uji: label peran + jumlah izin efektif."""
    role = await db.roles.find_one({"name": role_name}, {"_id": 0}) or {}
    perms = role.get("permissions") or []
    inherited = False
    if not perms:
        cfg = await db.settings.find_one({"key": "app"}, {"_id": 0, "role_levels": 1}) or {}
        level = role.get("level") or guess_role_level(role.get("label"))
        perms = ((cfg.get("role_levels") or {}).get(level)) or []
        inherited = True
    return {
        "name": role_name,
        "label": role.get("label") or role_name,
        "level": role.get("level") or "",
        "permission_count": len(perms),
        "inherited": inherited,
    }
