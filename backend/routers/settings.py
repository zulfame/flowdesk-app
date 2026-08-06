from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any

from db import db
from helpers import new_id, now_iso, log_activity
from security import get_current_user, require_admin
from notifications import _send_telegram, _send_email, get_settings

router = APIRouter(prefix="/settings", tags=["settings"])

DEFAULT_SETTINGS = {
    "key": "app",
    "general": {
        "app_name": "FlowDesk", "company": "", "timezone": "Asia/Jakarta", "language": "id",
        "primary_color": "#4F46E5", "favicon": "", "logo": "", "thumbnail": "",
        "meta_description": "Sistem Manajemen Kerja Internal", "app_url": "", "date_format": "DD/MM/YYYY",
        "tagline": "", "brand_initials": "", "logo_dark": "",
        "meta_keywords": "", "canonical_url": "", "search_visible": False,
        "og_title": "", "og_description": "", "og_image": "",
        "support_email": "", "footer_text": "",
    },
    "email": {"smtp_host": "", "smtp_port": 587, "smtp_user": "", "smtp_password": "",
              "from_name": "", "from_email": "", "notify_email": ""},
    "telegram": {"bot_token": "", "chat_id": "", "thread_id": ""},
    "notification": {"telegram_enabled": False, "email_enabled": False, "browser_enabled": True},
    "storage": {"max_file_mb": 50, "allowed_types": "image,pdf,office,zip,video,audio",
                "endpoint": "", "bucket": "", "access_key": "", "secret_key": "", "region": "", "path": ""},
    "application": {"theme": "system", "primary_color": "#4F46E5", "date_format": "DD/MM/YYYY"},
    "backup": {"auto_enabled": False, "frequency": "daily", "time": "02:00", "weekday": 1, "destination": "s3", "last_run": None},
}


def _with_defaults(s: dict) -> dict:
    """Ensure any newly-added default keys exist on an older stored settings doc."""
    s = dict(s)
    for section, defaults in DEFAULT_SETTINGS.items():
        if section == "key":
            continue
        merged = {**defaults, **(s.get(section) or {})}
        s[section] = merged
    return s


class SettingsUpdate(BaseModel):
    general: Optional[Dict[str, Any]] = None
    email: Optional[Dict[str, Any]] = None
    telegram: Optional[Dict[str, Any]] = None
    notification: Optional[Dict[str, Any]] = None
    storage: Optional[Dict[str, Any]] = None
    application: Optional[Dict[str, Any]] = None
    backup: Optional[Dict[str, Any]] = None


class TestNotifyBody(BaseModel):
    channel: str  # telegram | email


async def _ensure_settings():
    s = await db.settings.find_one({"key": "app"}, {"_id": 0})
    if not s:
        await db.settings.insert_one(dict(DEFAULT_SETTINGS))
        s = dict(DEFAULT_SETTINGS)
    return _with_defaults(s)


@router.get("/public")
async def public_settings():
    """Branding info exposed without auth (for login page, favicon, title)."""
    s = await _ensure_settings()
    g = s.get("general", {})
    return {
        "app_name": g.get("app_name", "FlowDesk"),
        "company": g.get("company", ""),
        "primary_color": g.get("primary_color", "#4F46E5"),
        "favicon": g.get("favicon", ""),
        "logo": g.get("logo", ""),
        "thumbnail": g.get("thumbnail", ""),
        "meta_description": g.get("meta_description", ""),
        "tagline": g.get("tagline", ""),
        "brand_initials": g.get("brand_initials", ""),
        "logo_dark": g.get("logo_dark", ""),
        "support_email": g.get("support_email", ""),
        "footer_text": g.get("footer_text", ""),
    }


@router.get("")
async def get_settings_endpoint(user: dict = Depends(get_current_user)):
    s = await _ensure_settings()
    # mask password for non-admin
    if user.get("role") != "admin":
        s = dict(s)
        if "email" in s:
            s["email"] = {**s["email"], "smtp_password": ""}
        if "telegram" in s:
            s["telegram"] = {**s["telegram"], "bot_token": ""}
        if "storage" in s:
            s["storage"] = {**s["storage"], "secret_key": "", "access_key": ""}
    return s


@router.put("")
async def update_settings(body: SettingsUpdate, admin: dict = Depends(require_admin)):
    current = await _ensure_settings()
    update = {}
    for section, value in body.model_dump().items():
        if value is not None:
            merged = {**current.get(section, {}), **value}
            update[section] = merged
    await db.settings.update_one({"key": "app"}, {"$set": update}, upsert=True)
    await log_activity(db, admin, "update", "settings", None, "Memperbarui konfigurasi sistem")
    return await db.settings.find_one({"key": "app"}, {"_id": 0})


@router.post("/test-notification")
async def test_notification(body: TestNotifyBody, admin: dict = Depends(require_admin)):
    s = await get_settings()
    if body.channel == "telegram":
        _send_telegram(s.get("telegram", {}), "Uji Coba", "Notifikasi Telegram FlowDesk berfungsi! ✅")
    elif body.channel == "email":
        _send_email(s.get("email", {}), "Uji Coba", "Notifikasi Email FlowDesk berfungsi!")
    return {"message": f"Notifikasi uji ke {body.channel} dikirim (best-effort)"}
