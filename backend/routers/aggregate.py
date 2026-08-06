from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone

from db import db
from helpers import new_id, now_iso, log_activity, task_scope_query, meeting_scope_query, is_privileged
from security import get_current_user
from routers.tasks import compute
from services import delete_event

router = APIRouter(tags=["aggregate"])


class EventCreate(BaseModel):
    title: str
    date: str
    description: Optional[str] = ""
    color: Optional[str] = "#4F46E5"


# ---------- Dashboard ----------
@router.get("/dashboard/stats")
async def dashboard_stats(user: dict = Depends(get_current_user)):
    tasks = await db.tasks.find({**(await task_scope_query(db, user)), "is_deleted": {"$ne": True}}, {"_id": 0}).to_list(2000)
    tasks = [compute(t) for t in tasks]
    by_status = {}
    for t in tasks:
        by_status[t["status"]] = by_status.get(t["status"], 0) + 1

    total_meetings = await db.meetings.count_documents({**(await meeting_scope_query(db, user)), "is_deleted": {"$ne": True}})
    total_reminders = await db.reminders.count_documents({"created_by": user["id"], "done": {"$ne": True}, "is_deleted": {"$ne": True}})
    total_notes = await db.notes.count_documents({"is_deleted": {"$ne": True}})

    today = datetime.now(timezone.utc).date().isoformat()
    upcoming_meetings = await db.meetings.find(
        {"date": {"$gte": today}, **(await meeting_scope_query(db, user)), "is_deleted": {"$ne": True}}, {"_id": 0, "id": 1, "title": 1, "date": 1, "start_time": 1, "location": 1}
    ).sort("date", 1).limit(5).to_list(5)

    recent_tasks = sorted(tasks, key=lambda t: t.get("created_at", ""), reverse=True)[:5]

    overdue = [t for t in tasks if t["status"] == "Overdue"]

    ACTIVE_STATUS = {"Pending", "On Progress", "Overdue"}
    today_meetings = await db.meetings.find(
        {"date": today, **(await meeting_scope_query(db, user)), "is_deleted": {"$ne": True}},
        {"_id": 0, "id": 1, "title": 1, "date": 1, "start_time": 1, "end_time": 1, "location": 1,
         "meeting_type": 1, "participants": 1},
    ).sort("start_time", 1).to_list(20)

    def _due_key(t):
        return t.get("deadline") or ""

    due_soon = sorted(
        [t for t in tasks if t.get("deadline") and t["status"] in ACTIVE_STATUS],
        key=_due_key,
    )[:50]
    due_soon = [
        {
            "id": t["id"], "title": t["title"], "deadline": t["deadline"], "status": t["status"],
            "priority": t.get("priority"), "progress": t.get("progress", 0),
            "pic": t.get("pic"),
        }
        for t in due_soon
    ]

    awaiting_approval = sum(
        1
        for t in tasks
        if t.get("created_by") == user["id"]
        for it in (t.get("items") or [])
        if it.get("pic_done") and not it.get("done")
    )
    active_tasks = sum(1 for t in tasks if t["status"] in ACTIVE_STATUS)

    activity = await db.activity_logs.find({}, {"_id": 0}).sort("created_at", -1).limit(8).to_list(8)

    # PIC workload (active tasks per PIC)
    ACTIVE = {"Pending", "On Progress", "Overdue"}
    workload = {}
    for t in tasks:
        if t["status"] in ACTIVE:
            pic = t.get("pic")
            name = pic.get("name") if isinstance(pic, dict) else pic
            if name:
                workload[name] = workload.get(name, 0) + 1
    workload_list = sorted([{"name": k, "count": v} for k, v in workload.items()], key=lambda x: -x["count"])[:6]

    # Weekly trend: last 6 weeks (created vs completed)
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    trend = []
    for w in range(5, -1, -1):
        start = (now - timedelta(days=now.weekday() + w * 7)).replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=7)
        created = sum(1 for t in tasks if t.get("created_at") and start.isoformat() <= t["created_at"] < end.isoformat())
        completed = sum(1 for t in tasks if t.get("status") == "Completed" and t.get("updated_at") and start.isoformat() <= t["updated_at"] < end.isoformat())
        trend.append({"label": start.strftime("%d/%m"), "created": created, "completed": completed})

    # Tiket Bantuan terkait pengguna
    from routers.help_tickets import OPEN_STATUSES, _visibility as ticket_visibility

    open_tickets = await db.help_tickets.count_documents({
        "is_deleted": {"$ne": True}, "status": {"$in": OPEN_STATUSES},
        **(await ticket_visibility(user)),
    })
    my_tickets = await db.help_tickets.find(
        {"is_deleted": {"$ne": True}, "status": {"$in": OPEN_STATUSES},
         "assignee.user_id": user["id"]},
        {"_id": 0, "id": 1, "number": 1, "title": 1, "status": 1, "priority": 1,
         "category": 1, "created_by_name": 1, "created_at": 1},
    ).sort("created_at", -1).to_list(50)
    PR_ORDER = {"Urgent": 0, "High": 1, "Medium": 2, "Low": 3}
    my_tickets.sort(key=lambda t: (PR_ORDER.get(t.get("priority"), 9), t.get("created_at") or ""))

    scoped_tickets = await db.help_tickets.find(
        {"is_deleted": {"$ne": True}, **(await ticket_visibility(user))},
        {"_id": 0, "category": 1, "priority": 1, "status": 1},
    ).to_list(5000)
    cat_count, pr_count = {}, {}
    for tk in scoped_tickets:
        cat_count[tk.get("category") or "Lainnya"] = cat_count.get(tk.get("category") or "Lainnya", 0) + 1
        pr_count[tk.get("priority") or "Medium"] = pr_count.get(tk.get("priority") or "Medium", 0) + 1
    tickets_by_category = sorted(
        [{"label": k, "count": v} for k, v in cat_count.items()], key=lambda x: -x["count"]
    )
    tickets_by_priority = [
        {"label": p, "count": pr_count.get(p, 0)} for p in ("Urgent", "High", "Medium", "Low")
    ]

    return {
        "total_tasks": len(tasks),
        "tasks_by_status": by_status,
        "total_meetings": total_meetings,
        "active_reminders": total_reminders,
        "total_notes": total_notes,
        "completed": by_status.get("Completed", 0),
        "on_progress": by_status.get("On Progress", 0),
        "overdue_count": len(overdue),
        "active_tasks": active_tasks,
        "awaiting_approval": awaiting_approval,
        "today_meetings": today_meetings,
        "due_soon": due_soon,
        "upcoming_meetings": upcoming_meetings,
        "recent_tasks": recent_tasks,
        "recent_activity": activity,
        "workload": workload_list,
        "trend": trend,
        "open_tickets": open_tickets,
        "my_tickets": my_tickets,
        "tickets_by_category": tickets_by_category,
        "tickets_by_priority": tickets_by_priority,
    }


# ---------- Nav badges ----------
@router.get("/nav-badges")
async def nav_badges(user: dict = Depends(get_current_user)):
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    nm = (start + timedelta(days=32)).replace(day=1)
    calendar_month_tasks = await db.tasks.count_documents({
        "deadline": {"$gte": start.date().isoformat(), "$lt": nm.date().isoformat()}, **(await task_scope_query(db, user)), "is_deleted": {"$ne": True}
    })
    my_tasks = await db.tasks.count_documents({
        "pic.user_id": user["id"], "status": {"$nin": ["Completed", "Cancelled", "Archived"]}, "is_deleted": {"$ne": True}
    })
    return {"calendar_month_tasks": calendar_month_tasks, "my_tasks": my_tasks}


# ---------- Calendar ----------
@router.get("/calendar")
async def calendar(user: dict = Depends(get_current_user)):
    """Tampilan kalender perusahaan: SEMUA rapat, tenggat tugas, dan pengingat
    dari seluruh pengguna (bukan hanya pengguna yang login)."""
    events = []

    meetings = await db.meetings.find({"is_deleted": {"$ne": True}}, {"_id": 0}).to_list(2000)
    for m in meetings:
        if m.get("date"):
            events.append({
                "id": m["id"], "title": m["title"], "date": m["date"],
                "type": "meeting", "time": m.get("start_time"), "color": "#4F46E5",
                "link": f"/meetings/{m['id']}",
            })

    tasks = await db.tasks.find({"deadline": {"$ne": None}, "is_deleted": {"$ne": True}}, {"_id": 0}).to_list(2000)
    for t in tasks:
        if t.get("deadline"):
            events.append({
                "id": t["id"], "title": t["title"], "date": t["deadline"][:10],
                "type": "task", "color": "#F59E0B", "link": f"/tasks/{t['id']}",
            })

    reminders = await db.reminders.find({"is_deleted": {"$ne": True}}, {"_id": 0}).to_list(2000)
    for r in reminders:
        if r.get("date"):
            events.append({
                "id": r["id"], "title": r["title"], "date": r["date"][:10],
                "type": "reminder", "color": "#10B981", "link": "/reminders",
            })

    return events


@router.post("/events")
async def create_event(body: EventCreate, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc.update({"id": new_id(), "created_by": user["id"], "created_at": now_iso()})
    await db.events.insert_one(dict(doc))
    doc.pop("_id", None)
    await log_activity(db, user, "create", "event", doc["id"], f"Membuat acara '{doc['title']}'")
    return doc


@router.delete("/events/{event_id}")
async def remove_event(event_id: str, user: dict = Depends(get_current_user)):
    ok = await delete_event(event_id, user)
    if not ok:
        raise HTTPException(status_code=404, detail="Acara tidak ditemukan")
    return {"message": "Acara dihapus"}


# ---------- Global Search ----------
@router.get("/search")
async def global_search(q: str, user: dict = Depends(get_current_user)):
    if not q or len(q) < 1:
        return {"tasks": [], "meetings": [], "reminders": [], "notes": [], "attachments": []}
    rx = {"$regex": q, "$options": "i"}
    nd = {"is_deleted": {"$ne": True}}
    tasks = await db.tasks.find({"$or": [{"title": rx}, {"description": rx}], **(await task_scope_query(db, user)), **nd}, {"_id": 0, "id": 1, "title": 1, "status": 1}).limit(10).to_list(10)
    meetings = await db.meetings.find({"$or": [{"title": rx}, {"agenda": rx}, {"notes": rx}], **(await meeting_scope_query(db, user)), **nd}, {"_id": 0, "id": 1, "title": 1, "date": 1}).limit(10).to_list(10)
    reminders = await db.reminders.find({"$or": [{"title": rx}, {"description": rx}], "created_by": user["id"], **nd}, {"_id": 0, "id": 1, "title": 1}).limit(10).to_list(10)
    notes = await db.notes.find({"$or": [{"title": rx}, {"content": rx}], **nd}, {"_id": 0, "id": 1, "title": 1}).limit(10).to_list(10)
    attachments = await db.files.find({"original_filename": rx, "is_deleted": False}, {"_id": 0, "id": 1, "original_filename": 1, "module": 1, "parent_id": 1}).limit(10).to_list(10)
    return {"tasks": tasks, "meetings": meetings, "reminders": reminders, "notes": notes, "attachments": attachments}
