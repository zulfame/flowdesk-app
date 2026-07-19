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

from routers import auth, users, tasks, meetings, reminders, notes, attachments, feeds, aggregate, settings, profile, database, push, archive, time_schedule

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
api_router.include_router(push.router)
api_router.include_router(archive.router)
api_router.include_router(time_schedule.router)

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
            "name": "Super Administrator",
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "role": "admin",
            "permissions": ["*"],
            "phone": None,
            "department": "Sistem",
            "avatar": None,
            "is_active": True,
            "created_at": now_iso(),
        })
        logger.info("Superadmin user seeded")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info("Admin password updated")


async def _migrate_notif_wording():
    """Sekali jalan: ubah notifikasi in-app lama yang berbunyi 'Anda' menjadi nama penerima,
    agar riwayat konsisten. (Pesan Telegram yang sudah terkirim tidak dapat diubah dari sini.)"""
    done = await db.migrations.find_one({"key": "notif_wording_v1"})
    if done:
        return
    cursor = db.notifications.find({"$or": [
        {"message": {"$regex": "Anda"}}, {"title": "Anda disebut"},
    ]})
    n_updated = 0
    async for n in cursor:
        uid = n.get("user_id")
        name = None
        if uid:
            u = await db.users.find_one({"id": uid}, {"_id": 0, "name": 1})
            name = (u or {}).get("name")
        if not name:
            continue
        msg = n.get("message", "") or ""
        title = n.get("title", "") or ""
        new_msg = (msg.replace("ditugaskan kepada Anda", f"ditugaskan kepada {name}")
                      .replace("menyebut Anda", f"menyebut {name}"))
        new_title = title.replace("Anda disebut", f"{name} disebut")
        if new_msg != msg or new_title != title:
            await db.notifications.update_one({"id": n["id"]}, {"$set": {"message": new_msg, "title": new_title}})
            n_updated += 1
    await db.migrations.insert_one({"key": "notif_wording_v1", "at": now_iso(), "updated": n_updated})
    logger.info(f"Notif wording migration done: {n_updated} updated")


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.tasks.create_index("id", unique=True)
    await db.meetings.create_index("id", unique=True)
    await seed_admin()
    # Sinkronkan peran bawaan (idempoten): pastikan izin baru seperti 'time_schedule'
    # ikut ditambahkan ke peran member/manager yang sudah ada di DB.
    from routers.users import DEFAULT_ROLES
    for r in DEFAULT_ROLES:
        await db.roles.update_one(
            {"name": r["name"]},
            {"$setOnInsert": {"id": new_id()},
             "$set": {"label": r["label"]},
             "$addToSet": {"permissions": {"$each": r["permissions"]}}},
            upsert=True,
        )
    await _migrate_notif_wording()
    try:
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
    import asyncio
    asyncio.create_task(deadline_reminder_loop())
    asyncio.create_task(scheduled_backup_loop())


async def scheduled_backup_loop():
    import asyncio
    from datetime import datetime, timezone
    from notifications import get_settings
    from routers.database import run_backup
    while True:
        try:
            s = await get_settings()
            cfg = s.get("backup", {}) or {}
            if cfg.get("auto_enabled"):
                now = datetime.now(timezone.utc)
                hh, mm = (cfg.get("time") or "02:00").split(":")
                due_today = now.hour > int(hh) or (now.hour == int(hh) and now.minute >= int(mm))
                last = cfg.get("last_run")
                last_date = last[:10] if last else None
                today = now.date().isoformat()
                should = False
                if cfg.get("frequency") == "daily":
                    should = due_today and last_date != today
                elif cfg.get("frequency") == "weekly":
                    # run on configured weekday (1=Mon..7=Sun) once that day
                    if now.isoweekday() == int(cfg.get("weekday", 1)) and due_today and last_date != today:
                        should = True
                if should:
                    try:
                        await run_backup(cfg.get("destination", "s3"), "Backup Otomatis", None)
                        await db.settings.update_one({"key": "app"}, {"$set": {"backup.last_run": now.isoformat()}})
                        logger.info("Scheduled backup completed")
                    except Exception as e:
                        logger.error(f"Scheduled backup failed: {e}")
        except Exception as e:
            logger.error(f"scheduled_backup_loop: {e}")
        await asyncio.sleep(300)


async def deadline_reminder_loop():
    import asyncio
    from datetime import datetime, timezone, timedelta
    from notifications import create_notification, get_settings, _send_email, _send_telegram, dispatch_email
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
                    await dispatch_email(f"Pengingat Tenggat: {t.get('title')}", msg, to_override=pic["email"])
                await db.tasks.update_one({"id": t["id"]}, {"$set": {"deadline_reminded": True}})

            # Dispatch user reminders that are due (broadcast via email/telegram)
            await _dispatch_reminders(now)
        except Exception as e:
            logger.error(f"deadline_reminder_loop: {e}")
        await asyncio.sleep(300)


async def _dispatch_reminders(now):
    from datetime import datetime, timedelta
    from notifications import create_notification, dispatch_email, whatsapp_url
    now_local = now.isoformat()

    # 1) In-app notification to creator at remind_at
    cursor = db.reminders.find({
        "done": {"$ne": True}, "is_deleted": {"$ne": True},
        "dispatched": {"$ne": True},
        "remind_at": {"$ne": None, "$lte": now_local},
    })
    async for r in cursor:
        title = r.get("title", "Pengingat")
        body = r.get("description") or "Waktunya pengingat Anda."
        await create_notification(r.get("created_by"), f"Pengingat: {title}", body, "reminder", "/reminders")
        if r.get("remind_type") == "recurring" and r.get("date"):
            try:
                base = datetime.fromisoformat(r["date"])
                step = {"daily": timedelta(days=1), "weekly": timedelta(weeks=1), "monthly": timedelta(days=30)}.get(r.get("recurrence"), timedelta(days=1))
                nxt = base
                while nxt <= now.replace(tzinfo=None):
                    nxt = nxt + step
                nd = nxt.date().isoformat()
                await db.reminders.update_one({"id": r["id"]}, {"$set": {
                    "date": nd, "remind_at": f"{nd}T{r.get('time', '09:00')}:00", "dispatched": False, "broadcast_sent": False,
                }})
            except Exception:
                await db.reminders.update_one({"id": r["id"]}, {"$set": {"dispatched": True}})
        else:
            await db.reminders.update_one({"id": r["id"]}, {"$set": {"dispatched": True}})

    # 2) Broadcast pengingat pribadi KE PEMBUAT: Email (bila kanal aktif) / WhatsApp (link wa.me).
    #    Chat/Group ID Telegram sistem TIDAK dipakai untuk pengingat pribadi.
    bcur = db.reminders.find({
        "done": {"$ne": True}, "is_deleted": {"$ne": True}, "broadcast": True,
        "broadcast_sent": {"$ne": True},
        "broadcast_at": {"$ne": None, "$lte": now_local},
    })
    async for r in bcur:
        title = r.get("title", "Pengingat")
        body = r.get("description") or "Waktunya pengingat Anda."
        channels = r.get("channels", []) or []
        creator = await db.users.find_one({"id": r.get("created_by")}, {"_id": 0, "email": 1, "phone": 1}) or {}
        if "email" in channels and creator.get("email"):
            await dispatch_email(f"Pengingat: {title}", body, to_override=creator["email"])
        if "whatsapp" in channels and creator.get("phone"):
            wa = whatsapp_url(creator["phone"], f"Pengingat: {title}\n{body}")
            await create_notification(
                r.get("created_by"),
                f"Pengingat siap dikirim ke WhatsApp: {title}",
                f"{body}\n\nBuka WhatsApp untuk mengirim: {wa}",
                "reminder", "/reminders",
            )
        await db.reminders.update_one({"id": r["id"]}, {"$set": {"broadcast_sent": True}})


@app.on_event("shutdown")
async def shutdown():
    client.close()
