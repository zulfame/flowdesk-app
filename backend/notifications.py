import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr

import requests

from db import db
from helpers import new_id, now_iso


async def get_settings() -> dict:
    settings = await db.settings.find_one({"key": "app"}, {"_id": 0})
    return settings or {}


def _send_telegram(cfg: dict, title: str, message: str):
    token = cfg.get("bot_token")
    chat_id = cfg.get("chat_id")
    if not (token and chat_id):
        return
    text = f"*{title}*\n{message}"
    payload = {"chat_id": chat_id, "text": text, "parse_mode": "Markdown"}
    if cfg.get("thread_id"):
        payload["message_thread_id"] = cfg["thread_id"]
    try:
        requests.post(f"https://api.telegram.org/bot{token}/sendMessage", json=payload, timeout=15)
    except Exception:
        pass


def _send_email(cfg: dict, title: str, message: str, to_override: str = None):
    host = cfg.get("smtp_host")
    port = cfg.get("smtp_port")
    user = cfg.get("smtp_user")
    password = cfg.get("smtp_password")
    to_addr = to_override or cfg.get("notify_email") or user
    if not (host and port and user and password and to_addr):
        return
    try:
        msg = MIMEMultipart()
        from_addr = cfg.get("from_email") or user
        from_name = (cfg.get("from_name") or "").strip()
        msg["From"] = formataddr((from_name, from_addr)) if from_name else from_addr
        msg["To"] = to_addr
        msg["Subject"] = f"[FlowDesk] {title}"
        msg.attach(MIMEText(message, "plain"))
        context = ssl.create_default_context()
        with smtplib.SMTP(host, int(port), timeout=15) as server:
            server.starttls(context=context)
            server.login(user, password)
            server.send_message(msg)
    except Exception:
        pass


async def create_notification(user_id, title, message, ntype="info", link=None, dispatch=True):
    doc = {
        "id": new_id(),
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": ntype,
        "link": link,
        "is_read": False,
        "created_at": now_iso(),
    }
    await db.notifications.insert_one(doc)

    if dispatch:
        settings = await get_settings()
        notif_cfg = settings.get("notification", {})
        if notif_cfg.get("telegram_enabled"):
            _send_telegram(settings.get("telegram", {}), title, message)
        if notif_cfg.get("email_enabled"):
            _send_email(settings.get("email", {}), title, message)
        if notif_cfg.get("browser_enabled", True):
            try:
                from webpush import send_push
                await send_push(user_id, title, message, link or "/")
            except Exception:
                pass
    doc.pop("_id", None)
    return doc


async def dispatch_email(title, message, to_override=None):
    """Kirim email HANYA bila kanal Email aktif di pengaturan."""
    settings = await get_settings()
    if not settings.get("notification", {}).get("email_enabled"):
        return False
    _send_email(settings.get("email", {}), title, message, to_override=to_override)
    return True


async def dispatch_telegram(title, message):
    """Kirim Telegram (ke Chat/Group ID sistem) HANYA bila kanal Telegram aktif.
    Catatan: Chat/Group ID hanya untuk info sistem, bukan tujuan ke pengguna tertentu."""
    settings = await get_settings()
    if not settings.get("notification", {}).get("telegram_enabled"):
        return False
    _send_telegram(settings.get("telegram", {}), title, message)
    return True


def whatsapp_url(phone: str, message: str) -> str:
    from urllib.parse import quote
    phone = "".join(ch for ch in phone if ch.isdigit())
    return f"https://wa.me/{phone}?text={quote(message)}"
