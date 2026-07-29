from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List

from db import db
from helpers import new_id, now_iso, log_activity
from security import get_current_user
from services import delete_meeting
from notifications import create_notification, whatsapp_url, get_settings, _send_email, _send_telegram
from helpers import is_privileged, can_manage

router = APIRouter(prefix="/meetings", tags=["meetings"])


def _meeting_visibility(user: dict) -> dict:
    if is_privileged(user):
        return {}
    return {"$or": [{"created_by": user["id"]}, {"participants": user.get("name")}]}


def _can_see_meeting(user: dict, m: dict) -> bool:
    return is_privileged(user) or m.get("created_by") == user["id"] or user.get("name") in (m.get("participants") or [])


class ActionItemBody(BaseModel):
    id: Optional[str] = None
    text: str
    assignee: Optional[str] = ""
    done: bool = False
    converted_task_id: Optional[str] = None


class MeetingCreate(BaseModel):
    title: str
    date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    location: Optional[str] = ""
    meeting_type: str = "Internal"
    participants: List[str] = []
    agenda: Optional[str] = ""
    notes: Optional[str] = ""
    decisions: Optional[str] = ""
    action_items: List[ActionItemBody] = []


class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    location: Optional[str] = None
    meeting_type: Optional[str] = None
    participants: Optional[List[str]] = None
    agenda: Optional[str] = None
    notes: Optional[str] = None
    decisions: Optional[str] = None
    action_items: Optional[List[ActionItemBody]] = None


def _norm_items(items) -> list:
    out = []
    for it in items:
        d = it.model_dump() if hasattr(it, "model_dump") else dict(it)
        if not d.get("id"):
            d["id"] = new_id()
        out.append(d)
    return out


@router.get("")
async def list_meetings(user: dict = Depends(get_current_user)):
    meetings = await db.meetings.find({**_meeting_visibility(user), "is_deleted": {"$ne": True}}, {"_id": 0}).sort("date", -1).to_list(1000)
    return meetings


@router.get("/{meeting_id}")
async def get_meeting(meeting_id: str, user: dict = Depends(get_current_user)):
    m = await db.meetings.find_one({"id": meeting_id, "is_deleted": {"$ne": True}}, {"_id": 0})
    if not m:
        raise HTTPException(status_code=404, detail="Rapat tidak ditemukan")
    if not _can_see_meeting(user, m):
        raise HTTPException(status_code=403, detail="Anda tidak memiliki akses ke rapat ini")
    m["attachments"] = await db.files.find(
        {"parent_id": meeting_id, "is_deleted": False}, {"_id": 0}
    ).to_list(200)
    m["generated_tasks"] = await db.tasks.find(
        {"meeting_id": meeting_id, "is_deleted": {"$ne": True}}, {"_id": 0, "id": 1, "title": 1, "status": 1, "progress": 1}
    ).to_list(200)
    return m


@router.post("")
async def create_meeting(body: MeetingCreate, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc["action_items"] = _norm_items(body.action_items)
    doc.update({
        "id": new_id(),
        "history": [{"action": "created", "by": user["name"], "at": now_iso()}],
        "created_by": user["id"],
        "created_by_name": user["name"],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    })
    await db.meetings.insert_one(dict(doc))
    doc.pop("_id", None)
    await log_activity(db, user, "create", "meeting", doc["id"], f"Membuat rapat '{doc['title']}'")
    return doc


@router.put("/{meeting_id}")
async def update_meeting(meeting_id: str, body: MeetingUpdate, user: dict = Depends(get_current_user)):
    existing = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Rapat tidak ditemukan")
    if not can_manage(user, existing):
        raise HTTPException(status_code=403, detail="Hanya pembuat rapat atau Admin yang dapat mengubah")
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if "action_items" in update:
        update["action_items"] = _norm_items(body.action_items)
    update["updated_at"] = now_iso()
    history = existing.get("history", [])
    history.append({"action": "updated", "by": user["name"], "at": now_iso()})
    update["history"] = history
    await db.meetings.update_one({"id": meeting_id}, {"$set": update})
    await log_activity(db, user, "update", "meeting", meeting_id, f"Memperbarui rapat '{existing['title']}'")
    return await db.meetings.find_one({"id": meeting_id}, {"_id": 0})


class ConvertBody(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = ""
    requester: Optional[dict] = None
    pic: Optional[dict] = None
    priority: str = "Medium"
    deadline: Optional[str] = None
    items: List[str] = []


@router.post("/{meeting_id}/action-items/{item_id}/convert")
async def convert_action_item(meeting_id: str, item_id: str, body: ConvertBody = None, user: dict = Depends(get_current_user)):
    from routers.tasks import compute, EMPTY_PERSON
    meeting = await db.meetings.find_one({"id": meeting_id, "is_deleted": {"$ne": True}}, {"_id": 0})
    if not meeting:
        raise HTTPException(status_code=404, detail="Rapat tidak ditemukan")
    if not _can_see_meeting(user, meeting):
        raise HTTPException(status_code=403, detail="Anda tidak memiliki akses ke rapat ini")
    item = next((i for i in meeting.get("action_items", []) if i.get("id") == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Action item tidak ditemukan")
    if item.get("converted_task_id"):
        raise HTTPException(status_code=400, detail="Sudah dikonversi menjadi tugas")

    body = body or ConvertBody()
    pic = body.pic
    # If conversion form is used, PIC and deadline are required (data harus sesuai)
    if not pic or not pic.get("name"):
        raise HTTPException(status_code=400, detail="PIC pelaksana wajib dipilih untuk membuat tugas")
    if not body.deadline:
        raise HTTPException(status_code=400, detail="Tenggat tugas wajib diisi")

    requester = body.requester or {"user_id": None, "name": meeting.get("created_by_name", ""), "department": "", "phone": "", "email": ""}
    task = {
        "id": new_id(),
        "title": body.title or item["text"],
        "description": body.description or f"Dibuat dari rapat: {meeting['title']}",
        "requester": {**dict(EMPTY_PERSON), **requester},
        "pic": {**dict(EMPTY_PERSON), **pic},
        "priority": body.priority or "Medium",
        "deadline": body.deadline,
        "items": [{"id": new_id(), "title": t, "done": False, "done_at": None, "due_date": None, "documents": []} for t in (body.items or [])],
        "documents": [], "comments": [],
        "history": [{"action": "created_from_meeting", "by": user["name"], "at": now_iso()}],
        "status": "Pending", "progress": 0, "is_deleted": False,
        "meeting_id": meeting_id, "meeting_title": meeting["title"],
        "created_by": user["id"], "created_by_name": user["name"],
        "created_at": now_iso(), "updated_at": now_iso(),
    }
    task = compute(task)
    await db.tasks.insert_one(dict(task))
    await db.meetings.update_one(
        {"id": meeting_id, "action_items.id": item_id},
        {"$set": {"action_items.$.converted_task_id": task["id"]}},
    )
    task.pop("_id", None)
    await log_activity(db, user, "create", "task", task["id"], f"Mengonversi action item menjadi tugas '{task['title']}'")
    await create_notification(task["pic"].get("user_id"), "Action Item Dikonversi", f"'{task['title']}' kini menjadi tugas", "task", f"/tasks/{task['id']}")
    return task


class MeetingBroadcastBody(BaseModel):
    message: Optional[str] = None


@router.post("/{meeting_id}/broadcast")
async def broadcast_meeting(meeting_id: str, body: MeetingBroadcastBody, user: dict = Depends(get_current_user)):
    m = await db.meetings.find_one({"id": meeting_id, "is_deleted": {"$ne": True}}, {"_id": 0})
    if not m:
        raise HTTPException(status_code=404, detail="Rapat tidak ditemukan")
    if not _can_see_meeting(user, m):
        raise HTTPException(status_code=403, detail="Anda tidak memiliki akses ke rapat ini")

    # Ikuti pengaturan kanal dari "Kelola Notifikasi"
    settings = await get_settings()
    ncfg = settings.get("notification", {}) or {}
    email_on = bool(ncfg.get("email_enabled"))
    telegram_on = bool(ncfg.get("telegram_enabled"))
    browser_on = bool(ncfg.get("browser_enabled", True))

    participants = m.get("participants") or []
    users = await db.users.find(
        {"name": {"$in": participants}}, {"_id": 0, "id": 1, "name": 1, "email": 1, "phone": 1}
    ).to_list(500)
    by_name = {u["name"]: u for u in users}

    when = m.get("date") or ""
    time = m.get("start_time") or ""
    loc = m.get("location") or ""
    default_msg = (
        f"Pemberitahuan rapat '{m['title']}'"
        + (f" pada {when}" if when else "")
        + (f" pukul {time}" if time else "")
        + (f" di {loc}" if loc else "")
        + "."
    )
    message = body.message or default_msg
    title = f"Pemberitahuan Rapat: {m['title']}"

    wa_urls = []       # WhatsApp = tautan manual (click-to-chat), selalu tersedia
    email_sent = 0
    push_sent = 0
    for name in participants:
        u = by_name.get(name)
        if not u:
            continue
        if u.get("phone"):
            wa_urls.append({"name": name, "url": whatsapp_url(u["phone"], message)})
        if email_on and u.get("email"):
            _send_email(settings.get("email", {}), title, message, to_override=u["email"])
            email_sent += 1
        if browser_on and u.get("id"):
            await create_notification(u["id"], title, message, "meeting", f"/meetings/{meeting_id}", dispatch=False)
            try:
                from webpush import send_push
                await send_push(u["id"], title, message, f"/meetings/{meeting_id}")
                push_sent += 1
            except Exception:
                pass

    # Telegram = ringkasan ke grup sistem (bila kanal aktif)
    telegram_sent = False
    if telegram_on:
        _send_telegram(settings.get("telegram", {}), title, f"{message}\nPeserta: {', '.join(participants) or '-'}")
        telegram_sent = True

    await log_activity(db, user, "update", "meeting", meeting_id, f"Mengirim broadcast pemberitahuan rapat '{m['title']}'")
    return {
        "email_sent": email_sent,
        "push_sent": push_sent,
        "telegram_sent": telegram_sent,
        "wa_urls": wa_urls,
        "participant_count": len(participants),
        "resolved": len(users),
        "channels": {"email": email_on, "telegram": telegram_on, "browser": browser_on},
    }


@router.delete("/{meeting_id}")
async def remove_meeting(meeting_id: str, user: dict = Depends(get_current_user)):
    existing = await db.meetings.find_one({"id": meeting_id, "is_deleted": {"$ne": True}}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Rapat tidak ditemukan")
    if not can_manage(user, existing):
        raise HTTPException(status_code=403, detail="Hanya pembuat rapat atau Admin yang dapat menghapus")
    await delete_meeting(meeting_id, user)
    return {"message": "Rapat dihapus"}
