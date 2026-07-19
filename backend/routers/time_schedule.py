import io
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List

from db import db
from helpers import new_id, now_iso, log_activity, is_privileged, can_manage
from security import get_current_user

router = APIRouter(prefix="/time-schedules", tags=["time-schedules"])

CATEGORIES = {"pelaksanaan", "event", "libur"}
CAT_FILL = {"pelaksanaan": "FFF176", "event": "81C784", "libur": "E57373"}


class Person(BaseModel):
    user_id: Optional[str] = None
    name: Optional[str] = ""
    department: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""


class Activity(BaseModel):
    id: Optional[str] = None
    name: str
    section: Optional[str] = ""
    pic: Optional[Person] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    category: str = "pelaksanaan"
    status: str = "Rencana"
    note: Optional[str] = ""
    task_id: Optional[str] = None


class ScheduleCreate(BaseModel):
    title: str
    event_name: Optional[str] = ""
    section: Optional[str] = ""
    description: Optional[str] = ""
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    holidays: List[str] = []
    event_dates: List[str] = []
    activities: List[Activity] = []


class ScheduleUpdate(BaseModel):
    title: Optional[str] = None
    event_name: Optional[str] = None
    section: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    holidays: Optional[List[str]] = None
    event_dates: Optional[List[str]] = None
    activities: Optional[List[Activity]] = None


class ConvertBody(BaseModel):
    pic: Optional[Person] = None
    priority: str = "Medium"
    deadline: Optional[str] = None


def _vis(user: dict) -> dict:
    if is_privileged(user):
        return {}
    uid = user.get("id")
    return {"$or": [{"created_by": uid}, {"activities.pic.user_id": uid}]}


def _can_view(user: dict, s: dict) -> bool:
    if is_privileged(user) or s.get("created_by") == user.get("id"):
        return True
    return any((a.get("pic") or {}).get("user_id") == user.get("id") for a in s.get("activities", []))


def _norm_activities(acts) -> list:
    out = []
    for a in acts or []:
        d = a.model_dump() if hasattr(a, "model_dump") else dict(a)
        if not d.get("id"):
            d["id"] = new_id()
        if d.get("category") not in CATEGORIES:
            d["category"] = "pelaksanaan"
        out.append(d)
    return out


@router.get("")
async def list_schedules(user: dict = Depends(get_current_user)):
    return await db.time_schedules.find(
        {**_vis(user), "is_deleted": {"$ne": True}}, {"_id": 0}
    ).sort("created_at", -1).to_list(500)


@router.post("")
async def create_schedule(body: ScheduleCreate, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc["activities"] = _norm_activities(body.activities)
    doc.update({
        "id": new_id(), "is_deleted": False,
        "created_by": user["id"], "created_by_name": user["name"],
        "created_at": now_iso(), "updated_at": now_iso(),
    })
    await db.time_schedules.insert_one(dict(doc))
    doc.pop("_id", None)
    await log_activity(db, user, "create", "time_schedule", doc["id"], f"Membuat jadwal '{doc['title']}'")
    return doc


@router.get("/{sid}")
async def get_schedule(sid: str, user: dict = Depends(get_current_user)):
    s = await db.time_schedules.find_one({"id": sid, "is_deleted": {"$ne": True}}, {"_id": 0})
    if not s:
        raise HTTPException(status_code=404, detail="Jadwal tidak ditemukan")
    if not _can_view(user, s):
        raise HTTPException(status_code=403, detail="Anda tidak memiliki akses ke jadwal ini")
    return s


@router.put("/{sid}")
async def update_schedule(sid: str, body: ScheduleUpdate, user: dict = Depends(get_current_user)):
    existing = await db.time_schedules.find_one({"id": sid, "is_deleted": {"$ne": True}}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Jadwal tidak ditemukan")
    if not can_manage(user, existing):
        raise HTTPException(status_code=403, detail="Hanya pembuat jadwal atau Admin yang dapat mengubah")
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if "activities" in update:
        update["activities"] = _norm_activities(body.activities)
    update["updated_at"] = now_iso()
    await db.time_schedules.update_one({"id": sid}, {"$set": update})
    await log_activity(db, user, "update", "time_schedule", sid, f"Memperbarui jadwal '{existing['title']}'")
    return await db.time_schedules.find_one({"id": sid}, {"_id": 0})


@router.delete("/{sid}")
async def delete_schedule(sid: str, user: dict = Depends(get_current_user)):
    existing = await db.time_schedules.find_one({"id": sid, "is_deleted": {"$ne": True}}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Jadwal tidak ditemukan")
    if not can_manage(user, existing):
        raise HTTPException(status_code=403, detail="Hanya pembuat jadwal atau Admin yang dapat menghapus")
    await db.time_schedules.update_one({"id": sid}, {"$set": {
        "is_deleted": True, "deleted_at": now_iso(), "deleted_by_name": user["name"],
    }})
    await log_activity(db, user, "delete", "time_schedule", sid, f"Menghapus jadwal '{existing['title']}'")
    return {"message": "Jadwal dihapus"}


@router.post("/{sid}/activities/{aid}/convert-task")
async def convert_activity(sid: str, aid: str, body: ConvertBody, user: dict = Depends(get_current_user)):
    s = await db.time_schedules.find_one({"id": sid, "is_deleted": {"$ne": True}}, {"_id": 0})
    if not s:
        raise HTTPException(status_code=404, detail="Jadwal tidak ditemukan")
    if not _can_view(user, s):
        raise HTTPException(status_code=403, detail="Anda tidak memiliki akses ke jadwal ini")
    act = next((a for a in s.get("activities", []) if a.get("id") == aid), None)
    if not act:
        raise HTTPException(status_code=404, detail="Kegiatan tidak ditemukan")
    if act.get("task_id"):
        raise HTTPException(status_code=400, detail="Kegiatan ini sudah memiliki tugas terkait")

    from routers.tasks import compute, EMPTY_PERSON, _notify_pic
    pic = body.pic.model_dump() if body.pic else (act.get("pic") or dict(EMPTY_PERSON))
    if not pic or not pic.get("name"):
        raise HTTPException(status_code=400, detail="PIC wajib dipilih untuk membuat tugas")
    deadline = body.deadline or act.get("end_date")

    task = {
        "id": new_id(),
        "title": act["name"],
        "description": act.get("note") or f"Dibuat dari jadwal '{s['title']}'",
        "requester": dict(EMPTY_PERSON),
        "pic": {**dict(EMPTY_PERSON), **pic},
        "priority": body.priority,
        "deadline": deadline,
        "items": [], "documents": [], "comments": [],
        "status": "Pending",
        "time_schedule_id": sid,
        "history": [{"action": "created", "by": user["name"], "at": now_iso(),
                     "detail": f"Dari kegiatan jadwal '{s['title']}'"}],
        "created_by": user["id"], "created_by_name": user["name"],
        "created_at": now_iso(), "updated_at": now_iso(),
    }
    task = compute(task)
    await db.tasks.insert_one(dict(task))
    task.pop("_id", None)
    await db.time_schedules.update_one(
        {"id": sid, "activities.id": aid}, {"$set": {"activities.$.task_id": task["id"]}}
    )
    await log_activity(db, user, "create", "task", task["id"], f"Membuat tugas dari kegiatan '{act['name']}'")
    try:
        await _notify_pic(task)
    except Exception:
        pass
    return {"task_id": task["id"], "title": task["title"]}


def _daterange(start: str, end: str):
    try:
        d = datetime.fromisoformat(start[:10])
        e = datetime.fromisoformat(end[:10])
    except Exception:
        return []
    if e < d or (e - d).days > 500:
        return []
    out = []
    while d <= e:
        out.append(d)
        d += timedelta(days=1)
    return out


@router.get("/{sid}/export")
async def export_schedule(sid: str, user: dict = Depends(get_current_user)):
    s = await db.time_schedules.find_one({"id": sid, "is_deleted": {"$ne": True}}, {"_id": 0})
    if not s:
        raise HTTPException(status_code=404, detail="Jadwal tidak ditemukan")
    if not _can_view(user, s):
        raise HTTPException(status_code=403, detail="Anda tidak memiliki akses ke jadwal ini")

    import openpyxl
    from openpyxl.styles import PatternFill, Font, Alignment, Border, Side

    activities = s.get("activities", [])
    start = s.get("start_date")
    end = s.get("end_date")
    if not start or not end:
        ds = [a.get("start_date") for a in activities if a.get("start_date")]
        de = [a.get("end_date") for a in activities if a.get("end_date")]
        start = start or (min(ds) if ds else datetime.now().date().isoformat())
        end = end or (max(de) if de else start)
    days = _daterange(start, end)

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Time Schedule"
    thin = Side(style="thin", color="D0D0D0")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)
    hdr_fill = PatternFill("solid", fgColor="4F46E5")
    holiday_fill = PatternFill("solid", fgColor="FDECEA")

    ws.cell(row=1, column=1, value=f"{s.get('title','')} — {s.get('event_name','')}").font = Font(bold=True, size=14)

    header_row = 3
    ws.cell(row=header_row, column=1, value="Seksi/Panitia")
    ws.cell(row=header_row, column=2, value="Kegiatan")
    holidays = set(s.get("holidays") or [])
    for i, d in enumerate(days):
        c = ws.cell(row=header_row, column=3 + i, value=d.strftime("%d/%m"))
        c.font = Font(color="FFFFFF", bold=True, size=8)
        c.fill = hdr_fill
        c.alignment = Alignment(horizontal="center")
        c.border = border
        ws.column_dimensions[c.column_letter].width = 4
    for col in (1, 2):
        hc = ws.cell(row=header_row, column=col)
        hc.font = Font(color="FFFFFF", bold=True)
        hc.fill = hdr_fill
        hc.border = border
    ws.column_dimensions["A"].width = 26
    ws.column_dimensions["B"].width = 40

    day_keys = [d.date().isoformat() for d in days]
    for r, a in enumerate(activities, start=header_row + 1):
        ws.cell(row=r, column=1, value=a.get("section") or s.get("section", "")).border = border
        ws.cell(row=r, column=2, value=a.get("name", "")).border = border
        fill = PatternFill("solid", fgColor=CAT_FILL.get(a.get("category", "pelaksanaan"), "FFF176"))
        a_start = (a.get("start_date") or "")[:10]
        a_end = (a.get("end_date") or "")[:10]
        for i, dk in enumerate(day_keys):
            cell = ws.cell(row=r, column=3 + i)
            cell.border = border
            if dk in holidays:
                cell.fill = holiday_fill
            if a_start and a_end and a_start <= dk <= a_end:
                cell.fill = fill

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    fname = (s.get("title") or "time-schedule").replace(" ", "_")
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{fname}.xlsx"'},
    )
