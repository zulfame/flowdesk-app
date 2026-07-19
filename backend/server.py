import os
import logging
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware

from db import db, client
from helpers import new_id, now_iso
from security import hash_password, verify_password
from storage import init_storage

from routers import auth, users, tasks, meetings, reminders, notes, attachments, feeds, aggregate, settings, profile, database

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("flowdesk")

app = FastAPI(title="FlowDesk API")
api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"message": "FlowDesk API", "status": "ok"}


api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(tasks.router)
api_router.include_router(meetings.router)
api_router.include_router(reminders.router)
api_router.include_router(notes.router)
api_router.include_router(attachments.router)
api_router.include_router(feeds.router)
api_router.include_router(aggregate.router)
api_router.include_router(settings.router)
api_router.include_router(profile.router)
api_router.include_router(database.router)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@flowdesk.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "id": new_id(),
            "name": "Administrator",
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "role": "admin",
            "permissions": ["*"],
            "phone": None,
            "avatar": None,
            "is_active": True,
            "created_at": now_iso(),
        })
        logger.info("Admin user seeded")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info("Admin password updated")


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.tasks.create_index("id", unique=True)
    await db.meetings.create_index("id", unique=True)
    await seed_admin()
    try:
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
    import asyncio
    asyncio.create_task(deadline_reminder_loop())


async def deadline_reminder_loop():
    import asyncio
    from datetime import datetime, timezone, timedelta
    from notifications import create_notification, get_settings, _send_email, _send_telegram
    while True:
        try:
            now = datetime.now(timezone.utc)
            soon = (now + timedelta(hours=24)).isoformat()
            cursor = db.tasks.find({
                "deadline": {"$ne": None, "$lte": soon, "$gte": now.isoformat()},
                "deadline_reminded": {"$ne": True},
            })
            async for t in cursor:
                if t.get("status") in ("Completed", "Cancelled", "Archived"):
                    continue
                pic = t.get("pic") or {}
                msg = f"Tenggat tugas '{t.get('title')}' kurang dari 24 jam lagi."
                uid = pic.get("user_id") if isinstance(pic, dict) else None
                await create_notification(uid, "Pengingat Tenggat", msg, "task", f"/tasks/{t['id']}")
                if isinstance(pic, dict) and pic.get("email"):
                    settings = await get_settings()
                    _send_email(settings.get("email", {}), f"Pengingat Tenggat: {t.get('title')}", msg, to_override=pic["email"])
                await db.tasks.update_one({"id": t["id"]}, {"$set": {"deadline_reminded": True}})

            # Dispatch user reminders that are due (broadcast via email/telegram)
            await _dispatch_reminders(now)
        except Exception as e:
            logger.error(f"deadline_reminder_loop: {e}")
        await asyncio.sleep(300)


async def _dispatch_reminders(now):
    from datetime import datetime, timedelta
    from notifications import create_notification, get_settings, _send_email, _send_telegram
    now_local = now.isoformat()
    cursor = db.reminders.find({
        "done": {"$ne": True},
        "dispatched": {"$ne": True},
        "remind_at": {"$ne": None, "$lte": now_local},
    })
    async for r in cursor:
        title = r.get("title", "Pengingat")
        body = r.get("description") or "Waktunya pengingat Anda."
        await create_notification(r.get("created_by"), f"Pengingat: {title}", body, "reminder", "/reminders")
        if r.get("broadcast"):
            settings = await get_settings()
            channels = r.get("channels", []) or []
            if "email" in channels:
                _send_email(settings.get("email", {}), f"Pengingat: {title}", body)
            if "telegram" in channels:
                _send_telegram(settings.get("telegram", {}), f"Pengingat: {title}", body)
        # Recurring: advance to next occurrence; otherwise mark dispatched
        if r.get("remind_type") == "recurring" and r.get("date"):
            try:
                base = datetime.fromisoformat(r["date"])
                step = {"daily": timedelta(days=1), "weekly": timedelta(weeks=1), "monthly": timedelta(days=30)}.get(r.get("recurrence"), timedelta(days=1))
                nxt = base
                while nxt <= now.replace(tzinfo=None):
                    nxt = nxt + step
                new_date = nxt.date().isoformat()
                await db.reminders.update_one({"id": r["id"]}, {"$set": {
                    "date": new_date, "remind_at": f"{new_date}T{r.get('time', '09:00')}:00", "dispatched": False,
                }})
            except Exception:
                await db.reminders.update_one({"id": r["id"]}, {"$set": {"dispatched": True}})
        else:
            await db.reminders.update_one({"id": r["id"]}, {"$set": {"dispatched": True}})


@app.on_event("shutdown")
async def shutdown():
    client.close()
