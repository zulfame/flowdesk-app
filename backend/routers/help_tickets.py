from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

from db import db
from security import get_current_user
from helpers import new_id, now_iso, log_activity, is_admin, scope_user_ids, subordinate_users
from notifications import create_notification

router = APIRouter(prefix="/help-tickets", tags=["help-tickets"])

CATEGORIES = ["Perangkat Keras", "Perangkat Lunak", "Jaringan", "Hapus Transaksi", "Operasional", "Data & Transaksi", "Lainnya"]
PRIORITIES = ["Low", "Medium", "High", "Urgent"]
STATUSES = ["Baru", "Ditugaskan", "Diproses", "Menunggu Info", "Selesai", "Ditutup"]
OPEN_STATUSES = ["Baru", "Ditugaskan", "Diproses", "Menunggu Info"]


class Person(BaseModel):
    user_id: Optional[str] = None
    name: Optional[str] = None


class TicketCreate(BaseModel):
    title: str
    description: str = ""
    category: str = "Lainnya"
    priority: str = "Medium"
    assignee: Optional[Person] = None
    attachments: List[Dict[str, Any]] = []


class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    assignee: Optional[Person] = None
    status: Optional[str] = None
    resolution: Optional[str] = None
    attachments: Optional[List[Dict[str, Any]]] = None


class CommentBody(BaseModel):
    message: str


async def _next_number() -> str:
    prefix = f"TKT-{datetime.now(timezone.utc).strftime('%Y%m')}"
    last = await db.help_tickets.find_one(
        {"number": {"$regex": f"^{prefix}"}}, {"_id": 0, "number": 1}, sort=[("number", -1)]
    )
    seq = int(last["number"].split("-")[-1]) + 1 if last else 1
    return f"{prefix}-{seq:04d}"


async def _visibility(user: dict) -> dict:
    """Pelapor & penerima tiket selalu melihat tiketnya; atasan melihat milik bawahannya."""
    ids = await scope_user_ids(db, user)
    if ids is None:
        return {}
    return {"$or": [{"created_by": {"$in": ids}}, {"assignee.user_id": {"$in": ids}}]}


async def _get(ticket_id: str, user: dict) -> dict:
    t = await db.help_tickets.find_one({"id": ticket_id, "is_deleted": {"$ne": True}}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Tiket tidak ditemukan")
    uid = user.get("id")
    if t.get("created_by") == uid or (t.get("assignee") or {}).get("user_id") == uid:
        return t
    ids = await scope_user_ids(db, user)
    if ids is None or t.get("created_by") in ids or (t.get("assignee") or {}).get("user_id") in ids:
        return t
    raise HTTPException(status_code=403, detail="Akses ditolak")


def _is_handler(user: dict, t: dict) -> bool:
    """Penerima tiket (atau Super Admin) yang berhak mengubah status pengerjaan."""
    return is_admin(user) or (t.get("assignee") or {}).get("user_id") == user.get("id")


async def _sub_ids(user: dict) -> set:
    return {u["id"] for u in await subordinate_users(db, user)}


async def _can_reassign(user: dict, t: dict) -> bool:
    """Pelapor, Super Admin, atau ATASAN penerima tiket dapat memindahkan tujuan tiket."""
    if is_admin(user) or t.get("created_by") == user.get("id"):
        return True
    assignee_id = (t.get("assignee") or {}).get("user_id")
    return bool(assignee_id) and assignee_id in await _sub_ids(user)


def _norm_atts(items) -> list:
    out = []
    for a in items or []:
        a = dict(a)
        a.setdefault("id", new_id())
        out.append(a)
    return out


@router.get("/meta")
async def meta(user: dict = Depends(get_current_user)):
    return {"categories": CATEGORIES, "priorities": PRIORITIES, "statuses": STATUSES}


@router.get("")
async def list_tickets(status: Optional[str] = None, mine: Optional[str] = None,
                       user: dict = Depends(get_current_user)):
    q = {"is_deleted": {"$ne": True}, **await _visibility(user)}
    if status == "open":
        q["status"] = {"$in": OPEN_STATUSES}
    elif status:
        q["status"] = status
    if mine == "assigned":
        q["assignee.user_id"] = user["id"]
    elif mine == "created":
        q["created_by"] = user["id"]
    return await db.help_tickets.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)


@router.get("/{ticket_id}")
async def get_ticket(ticket_id: str, user: dict = Depends(get_current_user)):
    t = await _get(ticket_id, user)
    return {
        **t,
        "can_handle": _is_handler(user, t),
        "can_reassign": await _can_reassign(user, t),
        "can_edit": is_admin(user) or t.get("created_by") == user.get("id") or _is_handler(user, t),
    }


@router.post("")
async def create_ticket(body: TicketCreate, user: dict = Depends(get_current_user)):
    if not body.title.strip():
        raise HTTPException(status_code=400, detail="Judul tiket wajib diisi")
    assignee = body.assignee.model_dump() if body.assignee else None
    doc = {
        "id": new_id(),
        "number": await _next_number(),
        "title": body.title.strip(),
        "description": body.description,
        "category": body.category if body.category in CATEGORIES else "Lainnya",
        "priority": body.priority if body.priority in PRIORITIES else "Medium",
        "status": "Ditugaskan" if (assignee or {}).get("user_id") else "Baru",
        "assignee": assignee,
        "attachments": _norm_atts(body.attachments),
        "comments": [],
        "resolution": "",
        "resolved_at": None,
        "created_by": user["id"],
        "created_by_name": user["name"],
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "is_deleted": False,
    }
    await db.help_tickets.insert_one(dict(doc))
    doc.pop("_id", None)
    await log_activity(db, user, "create", "help_ticket", doc["id"], f"Membuat tiket {doc['number']}")
    if (assignee or {}).get("user_id"):
        await create_notification(assignee["user_id"], "Tiket Bantuan Baru",
                                  f"{doc['number']} · {doc['title']}", "info",
                                  f"/help-tickets/{doc['id']}")
    return doc


@router.put("/{ticket_id}")
async def update_ticket(ticket_id: str, body: TicketUpdate, user: dict = Depends(get_current_user)):
    t = await _get(ticket_id, user)
    handler = _is_handler(user, t)
    owner = t.get("created_by") == user.get("id") or is_admin(user)
    patch = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}

    if "status" in patch:
        if not handler:
            raise HTTPException(status_code=403, detail="Hanya penerima tiket yang dapat mengubah status")
        if patch["status"] not in STATUSES:
            raise HTTPException(status_code=400, detail="Status tidak dikenal")
        patch["resolved_at"] = now_iso() if patch["status"] in ("Selesai", "Ditutup") else None
    if "attachments" in patch:
        patch["attachments"] = _norm_atts(patch["attachments"])
    if {"title", "description", "category", "priority", "attachments"} & patch.keys() and not (owner or handler):
        raise HTTPException(status_code=403, detail="Hanya pelapor atau penerima yang dapat mengubah tiket")
    if "assignee" in patch:
        if not await _can_reassign(user, t):
            raise HTTPException(
                status_code=403,
                detail="Hanya pelapor atau atasan penerima tiket yang dapat mengubah tujuan tiket",
            )
        new_id_ = (patch["assignee"] or {}).get("user_id")
        if new_id_ and not owner:
            if new_id_ not in await _sub_ids(user):
                raise HTTPException(
                    status_code=403,
                    detail="Tiket hanya dapat dialihkan ke pegawai di bawah jabatan Anda",
                )
    if "assignee" in patch and t.get("status") == "Baru" and (patch["assignee"] or {}).get("user_id"):
        patch["status"] = "Ditugaskan"

    patch["updated_at"] = now_iso()
    await db.help_tickets.update_one({"id": ticket_id}, {"$set": patch})
    updated = await db.help_tickets.find_one({"id": ticket_id}, {"_id": 0})
    await log_activity(db, user, "update", "help_ticket", ticket_id,
                       f"Memperbarui tiket {t.get('number')}")

    link = f"/help-tickets/{ticket_id}"
    old_assignee = (t.get("assignee") or {}).get("user_id")
    new_assignee = (patch.get("assignee") or {}).get("user_id") if "assignee" in patch else None
    me = user.get("id")

    async def notify(uid, title, message):
        if uid and uid != me:
            await create_notification(uid, title, message, "info", link)

    if "status" in patch:
        msg = f"{t.get('number')} → {patch['status']}"
        await notify(t.get("created_by"), "Status Tiket Diperbarui", msg)
        await notify(old_assignee, "Status Tiket Diperbarui", msg)
    if "assignee" in patch and new_assignee != old_assignee:
        label = (patch.get("assignee") or {}).get("name") or "tidak ditujukan"
        await notify(new_assignee, "Tiket Bantuan Ditujukan ke Anda",
                     f"{t.get('number')} · {t.get('title')}")
        await notify(old_assignee, "Tiket Dialihkan ke Orang Lain",
                     f"{t.get('number')} kini ditujukan ke {label}")
        await notify(t.get("created_by"), "Tujuan Tiket Diubah",
                     f"{t.get('number')} kini ditujukan ke {label}")
    return {
        **updated,
        "can_handle": _is_handler(user, updated),
        "can_reassign": await _can_reassign(user, updated),
        "can_edit": is_admin(user) or updated.get("created_by") == user.get("id") or _is_handler(user, updated),
    }


@router.delete("/{ticket_id}")
async def delete_ticket(ticket_id: str, user: dict = Depends(get_current_user)):
    t = await _get(ticket_id, user)
    if t.get("created_by") != user.get("id") and not is_admin(user):
        raise HTTPException(status_code=403, detail="Hanya pelapor atau Super Admin yang dapat menghapus")
    await db.help_tickets.update_one({"id": ticket_id},
                                     {"$set": {"is_deleted": True, "deleted_at": now_iso()}})
    await log_activity(db, user, "delete", "help_ticket", ticket_id, f"Menghapus tiket {t.get('number')}")
    return {"message": "Tiket dihapus"}


@router.post("/{ticket_id}/comments")
async def add_comment(ticket_id: str, body: CommentBody, user: dict = Depends(get_current_user)):
    t = await _get(ticket_id, user)
    if not body.message.strip():
        raise HTTPException(status_code=400, detail="Komentar tidak boleh kosong")
    comment = {
        "id": new_id(),
        "message": body.message.strip(),
        "author_id": user["id"],
        "author_name": user["name"],
        "created_at": now_iso(),
    }
    await db.help_tickets.update_one(
        {"id": ticket_id}, {"$push": {"comments": comment}, "$set": {"updated_at": now_iso()}}
    )
    targets = {t.get("created_by"), (t.get("assignee") or {}).get("user_id")} - {user["id"], None}
    for uid in targets:
        await create_notification(uid, "Komentar Baru pada Tiket",
                                  f"{t.get('number')} · {user['name']}: {comment['message'][:80]}",
                                  "info", f"/help-tickets/{ticket_id}")
    return comment


@router.delete("/{ticket_id}/comments/{comment_id}")
async def delete_comment(ticket_id: str, comment_id: str, user: dict = Depends(get_current_user)):
    t = await _get(ticket_id, user)
    comment = next((c for c in t.get("comments", []) if c["id"] == comment_id), None)
    if not comment:
        raise HTTPException(status_code=404, detail="Komentar tidak ditemukan")
    if comment["author_id"] != user["id"] and not is_admin(user):
        raise HTTPException(status_code=403, detail="Hanya penulis komentar yang dapat menghapus")
    await db.help_tickets.update_one({"id": ticket_id}, {"$pull": {"comments": {"id": comment_id}}})
    return {"message": "Komentar dihapus"}
