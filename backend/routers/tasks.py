from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone

from db import db
from helpers import new_id, now_iso, log_activity, is_privileged, is_admin, can_manage, task_visibility_query
from security import get_current_user
from services import delete_task
from notifications import create_notification, get_settings, _send_email, whatsapp_url, dispatch_email

router = APIRouter(prefix="/tasks", tags=["tasks"])

MANUAL_STATUSES = {"Draft", "Cancelled", "Archived"}


class Person(BaseModel):
    user_id: Optional[str] = None
    name: Optional[str] = ""
    department: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""


EMPTY_PERSON = {"user_id": None, "name": "", "department": "", "phone": "", "email": ""}


class DocResponse(BaseModel):
    id: Optional[str] = None
    kind: str = "file"           # file | url
    file_id: Optional[str] = None
    filename: Optional[str] = None
    url: Optional[str] = None
    label: Optional[str] = None
    status: str = "revisi"       # revisi | final
    note: Optional[str] = ""
    created_at: Optional[str] = None


class SourceDoc(BaseModel):
    id: Optional[str] = None
    kind: str = "file"           # file | url
    file_id: Optional[str] = None
    filename: Optional[str] = None
    url: Optional[str] = None
    label: Optional[str] = None
    responses: List[DocResponse] = []
    created_at: Optional[str] = None


class TaskItem(BaseModel):
    id: Optional[str] = None
    title: str
    done: bool = False
    done_at: Optional[str] = None
    due_date: Optional[str] = None
    documents: List[SourceDoc] = []


class TaskCreate(BaseModel):
    id: Optional[str] = None
    title: str
    description: Optional[str] = ""
    requester: Optional[Person] = None
    pic: Optional[Person] = None
    priority: str = "Medium"
    deadline: Optional[str] = None
    items: List[TaskItem] = []
    documents: List[SourceDoc] = []
    status: str = "Pending"
    meeting_id: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    requester: Optional[Person] = None
    pic: Optional[Person] = None
    priority: Optional[str] = None
    deadline: Optional[str] = None
    items: Optional[List[TaskItem]] = None
    documents: Optional[List[SourceDoc]] = None
    status: Optional[str] = None


class CommentBody(BaseModel):
    text: str


class BroadcastBody(BaseModel):
    message: Optional[str] = None
    channels: List[str] = ["email", "whatsapp"]


def compute(task: dict) -> dict:
    items = task.get("items")
    if items is None:
        # backward compat with old 'checklist'
        items = task.get("checklist", [])
    total = len(items)
    done = sum(1 for c in items if c.get("done"))
    progress = round(done / total * 100) if total else (100 if task.get("status") == "Completed" else 0)
    task["progress"] = progress

    status = task.get("status", "Pending")
    if status not in MANUAL_STATUSES:
        overdue = False
        if task.get("deadline"):
            try:
                dl = datetime.fromisoformat(task["deadline"].replace("Z", "+00:00"))
                if dl.tzinfo is None:
                    dl = dl.replace(tzinfo=timezone.utc)
                overdue = dl < datetime.now(timezone.utc)
            except Exception:
                overdue = False
        if total and done == total:
            status = "Completed"
        elif overdue:
            status = "Overdue"
        elif progress > 0:
            status = "On Progress"
        else:
            status = "Pending"
    task["status"] = status
    return task


def _norm_docs(docs) -> list:
    out = []
    for doc in docs or []:
        d = doc.model_dump() if hasattr(doc, "model_dump") else dict(doc)
        if not d.get("id"):
            d["id"] = new_id()
        if not d.get("created_at"):
            d["created_at"] = now_iso()
        responses = []
        for r in d.get("responses", []) or []:
            rd = r.model_dump() if hasattr(r, "model_dump") else dict(r)
            if not rd.get("id"):
                rd["id"] = new_id()
            if not rd.get("created_at"):
                rd["created_at"] = now_iso()
            responses.append(rd)
        d["responses"] = responses
        out.append(d)
    return out


def _norm_items(items) -> list:
    out = []
    for it in items or []:
        d = it.model_dump() if hasattr(it, "model_dump") else dict(it)
        if not d.get("id"):
            d["id"] = new_id()
        d["documents"] = _norm_docs(d.get("documents", []))
        if d.get("done"):
            if not d.get("done_at"):
                d["done_at"] = now_iso()
        else:
            d["done_at"] = None
        out.append(d)
    return out


async def _notify_pic(task: dict):
    """Notify the assigned PIC: in-app notification + best-effort email; returns wa.me URL if phone set."""
    pic = task.get("pic") or {}
    if isinstance(pic, str):
        pic = {"name": pic}
    name = pic.get("name")
    if not name:
        return None
    msg = (f"Halo {name}, Anda ditugaskan sebagai PIC pada tugas '{task['title']}' "
           f"(prioritas {task.get('priority', '-')}). Mohon ditindaklanjuti.")
    await create_notification(pic.get("user_id"), "Tugas Ditugaskan",
                              f"Tugas '{task['title']}' ditugaskan kepada {name}", "task", f"/tasks/{task['id']}")
    if pic.get("email"):
        await dispatch_email(f"Penugasan Tugas: {task['title']}", msg, to_override=pic["email"])
    if pic.get("phone"):
        return whatsapp_url(pic["phone"], msg)
    return None


@router.get("")
async def list_tasks(status: Optional[str] = None, pic: Optional[str] = None,
                     priority: Optional[str] = None, meeting_id: Optional[str] = None,
                     user: dict = Depends(get_current_user)):
    q = {}
    if pic:
        q["pic"] = pic
    if priority:
        q["priority"] = priority
    if meeting_id:
        q["meeting_id"] = meeting_id
    tasks = await db.tasks.find({**q, **task_visibility_query(user), "is_deleted": {"$ne": True}}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    tasks = [compute(t) for t in tasks]
    if status:
        tasks = [t for t in tasks if t["status"] == status]
    return tasks


def _related_to_task(user: dict, task: dict) -> bool:
    uid = user.get("id")
    return (task.get("created_by") == uid
            or (task.get("pic") or {}).get("user_id") == uid
            or (task.get("requester") or {}).get("user_id") == uid)


@router.get("/{task_id}")
async def get_task(task_id: str, user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id, "is_deleted": {"$ne": True}}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Tugas tidak ditemukan")
    if not is_privileged(user) and not _related_to_task(user, task):
        raise HTTPException(status_code=403, detail="Anda tidak memiliki akses ke tugas ini")
    task = compute(task)
    task["attachments"] = await db.files.find(
        {"parent_id": task_id, "is_deleted": False}, {"_id": 0}
    ).to_list(200)
    return task


PRIORITY_LABEL = {"Low": "Rendah", "Medium": "Sedang", "High": "Tinggi", "Urgent": "Mendesak"}


def _total_responses(task: dict) -> int:
    total = 0
    for d in task.get("documents", []) or []:
        total += len(d.get("responses", []) or [])
    for it in task.get("items", []) or []:
        for d in it.get("documents", []) or []:
            total += len(d.get("responses", []) or [])
    return total


def _build_history(existing: dict, update: dict, user: str) -> list:
    entries = []
    at = now_iso()
    if "title" in update and update["title"] != existing.get("title"):
        entries.append(f"Judul diubah menjadi '{update['title']}'")
    if "priority" in update and update["priority"] != existing.get("priority"):
        old = PRIORITY_LABEL.get(existing.get("priority"), existing.get("priority"))
        new = PRIORITY_LABEL.get(update["priority"], update["priority"])
        entries.append(f"Prioritas: {old} → {new}")
    if "deadline" in update and update["deadline"] != existing.get("deadline"):
        entries.append("Tenggat diperbarui")
    if "pic" in update:
        old = (existing.get("pic") or {})
        old = old.get("name") if isinstance(old, dict) else old
        new = (update.get("pic") or {}).get("name")
        if new != old:
            entries.append(f"PIC: {old or '-'} → {new or '-'}")
    hist = existing.get("history", [])
    if entries:
        for e in entries:
            hist.append({"action": "updated", "by": user, "at": at, "detail": e})
    else:
        hist.append({"action": "updated", "by": user, "at": at})
    return hist


async def _notify_completion(task: dict):
    msg = f"Tugas '{task['title']}' telah SELESAI (100%)."
    for person in [task.get("requester"), task.get("pic")]:
        if not isinstance(person, dict):
            continue
        if person.get("user_id"):
            await create_notification(person["user_id"], "Tugas Selesai", msg, "task", f"/tasks/{task['id']}")
        if person.get("email"):
            await dispatch_email(f"Tugas Selesai: {task['title']}", msg, to_override=person["email"])


async def _notify_response(task: dict):
    req = task.get("requester") or {}
    if not isinstance(req, dict) or not req.get("name"):
        return
    msg = f"Ada dokumen balasan baru pada tugas '{task['title']}'."
    if req.get("user_id"):
        await create_notification(req["user_id"], "Dokumen Balasan Baru", msg, "task", f"/tasks/{task['id']}")
    if req.get("email"):
        await dispatch_email(f"Dokumen Balasan: {task['title']}", msg, to_override=req["email"])


@router.post("")
async def create_task(body: TaskCreate, user: dict = Depends(get_current_user)):
    tid = body.id or new_id()
    if await db.tasks.find_one({"id": tid}):
        raise HTTPException(status_code=400, detail="Tugas dengan id ini sudah ada")
    doc = body.model_dump()
    doc.pop("id", None)
    doc["requester"] = (body.requester.model_dump() if body.requester else dict(EMPTY_PERSON))
    doc["pic"] = (body.pic.model_dump() if body.pic else dict(EMPTY_PERSON))
    doc["items"] = _norm_items(body.items)
    doc["documents"] = _norm_docs(body.documents)
    doc.update({
        "id": tid,
        "comments": [],
        "history": [{"action": "created", "by": user["name"], "at": now_iso()}],
        "created_by": user["id"],
        "created_by_name": user["name"],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    })
    doc = compute(doc)
    await db.tasks.insert_one(dict(doc))
    doc.pop("_id", None)
    await log_activity(db, user, "create", "task", doc["id"], f"Membuat tugas '{doc['title']}'")
    doc["pic_wa_url"] = await _notify_pic(doc)
    return doc


@router.put("/{task_id}")
async def update_task(task_id: str, body: TaskUpdate, user: dict = Depends(get_current_user)):
    existing = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Tugas tidak ditemukan")
    full = can_manage(user, existing)  # admin atau pembuat
    is_pic = (existing.get("pic") or {}).get("user_id") == user["id"]
    if not full and not is_pic:
        raise HTTPException(status_code=403, detail="Anda tidak memiliki akses untuk mengubah tugas ini")
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if "items" in update:
        update["items"] = _norm_items(body.items)
    if "documents" in update:
        update["documents"] = _norm_docs(body.documents)
    if body.requester is not None:
        update["requester"] = body.requester.model_dump()
    if body.pic is not None:
        update["pic"] = body.pic.model_dump()
    # PIC (bukan pembuat/admin) hanya boleh memperbarui progres/status/checklist/dokumen
    if not full and is_pic:
        allowed = {"items", "documents", "status"}
        for k in list(update.keys()):
            if k not in allowed:
                update.pop(k, None)
        if not update:
            raise HTTPException(status_code=403, detail="Sebagai PIC Anda hanya dapat memperbarui progres, status, dan checklist")
    if "deadline" in update:
        update["deadline_reminded"] = False
    update["updated_at"] = now_iso()
    merged = {**existing, **update}
    merged = compute(merged)
    update["progress"] = merged["progress"]
    update["status"] = merged["status"]
    update["history"] = _build_history(existing, update, user["name"])
    await db.tasks.update_one({"id": task_id}, {"$set": update})
    await log_activity(db, user, "update", "task", task_id, f"Memperbarui tugas '{existing['title']}'")
    result = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    result = compute(result)

    # Auto-broadcast when task becomes Completed
    if result["status"] == "Completed" and existing.get("status") != "Completed":
        await _notify_completion(result)

    # Notify requester when a document response was added
    if _total_responses(result) > _total_responses(existing):
        await _notify_response(result)

    # Notify PIC if assignment changed
    pic_wa_url = None
    if body.pic is not None:
        new_pic = update.get("pic") or {}
        old_pic = existing.get("pic") or {}
        old_pic = old_pic if isinstance(old_pic, dict) else {"name": old_pic}
        if new_pic.get("name") and (new_pic.get("user_id") != old_pic.get("user_id") or new_pic.get("name") != old_pic.get("name")):
            pic_wa_url = await _notify_pic(result)
    result["pic_wa_url"] = pic_wa_url
    return result


@router.post("/{task_id}/comments")
async def add_comment(task_id: str, body: CommentBody, user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Tugas tidak ditemukan")
    comment = {"id": new_id(), "text": body.text, "by": user["name"], "user_id": user["id"], "at": now_iso()}
    await db.tasks.update_one({"id": task_id}, {"$push": {"comments": comment}})
    await log_activity(db, user, "comment", "task", task_id, f"Berkomentar pada '{task['title']}'")

    # @mention notifications
    import re
    mentions = re.findall(r"@([\w.\-]+)", body.text or "")
    if mentions:
        all_users = await db.users.find({}, {"_id": 0, "id": 1, "name": 1, "email": 1}).to_list(1000)
        for m in mentions:
            token = m.lower()
            for u in all_users:
                uname = (u.get("name") or "").lower().replace(" ", "")
                if token and (token in uname or token == (u.get("email") or "").split("@")[0].lower()):
                    await create_notification(u["id"], f"{u['name']} disebut", f"{user['name']} menyebut {u['name']} di '{task['title']}'", "task", f"/tasks/{task_id}")
                    break
    return comment


@router.post("/{task_id}/duplicate")
async def duplicate_task(task_id: str, user: dict = Depends(get_current_user)):
    src = await db.tasks.find_one({"id": task_id, "is_deleted": {"$ne": True}}, {"_id": 0})
    if not src:
        raise HTTPException(status_code=404, detail="Tugas tidak ditemukan")
    if not is_privileged(user) and not _related_to_task(user, src):
        raise HTTPException(status_code=403, detail="Anda tidak memiliki akses ke tugas ini")
    new = dict(src)
    new["id"] = new_id()
    new["title"] = f"{src.get('title', '')} (Salinan)"
    new["status"] = "Pending"
    new["comments"] = []
    new["documents"] = []
    new["items"] = [{"id": new_id(), "title": it.get("title", ""), "done": False, "done_at": None,
                     "due_date": it.get("due_date"), "documents": []} for it in src.get("items", [])]
    new["history"] = [{"action": "created", "by": user["name"], "at": now_iso(), "detail": f"Diduplikasi dari '{src.get('title')}'"}]
    new["created_by"] = user["id"]
    new["created_by_name"] = user["name"]
    new["created_at"] = now_iso()
    new["updated_at"] = now_iso()
    new = compute(new)
    await db.tasks.insert_one(dict(new))
    new.pop("_id", None)
    await log_activity(db, user, "create", "task", new["id"], f"Menduplikasi tugas menjadi '{new['title']}'")
    return new


class TemplateBody(BaseModel):
    name: str
    task_id: Optional[str] = None
    title: Optional[str] = ""
    description: Optional[str] = ""
    priority: str = "Medium"
    items: List[str] = []


@router.get("/templates/list")
async def list_templates(user: dict = Depends(get_current_user)):
    return await db.task_templates.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)


@router.post("/templates")
async def create_template(body: TemplateBody, user: dict = Depends(get_current_user)):
    if body.task_id:
        src = await db.tasks.find_one({"id": body.task_id}, {"_id": 0})
        if not src:
            raise HTTPException(status_code=404, detail="Tugas sumber tidak ditemukan")
        doc = {
            "id": new_id(), "name": body.name, "title": src.get("title", ""),
            "description": src.get("description", ""), "priority": src.get("priority", "Medium"),
            "items": [it.get("title", "") for it in src.get("items", [])],
            "created_by_name": user["name"], "created_at": now_iso(),
        }
    else:
        doc = {"id": new_id(), "name": body.name, "title": body.title or body.name,
               "description": body.description, "priority": body.priority, "items": body.items,
               "created_by_name": user["name"], "created_at": now_iso()}
    await db.task_templates.insert_one(dict(doc))
    doc.pop("_id", None)
    await log_activity(db, user, "create", "template", doc["id"], f"Membuat template '{doc['name']}'")
    return doc


@router.post("/templates/{template_id}/instantiate")
async def instantiate_template(template_id: str, user: dict = Depends(get_current_user)):
    tpl = await db.task_templates.find_one({"id": template_id}, {"_id": 0})
    if not tpl:
        raise HTTPException(status_code=404, detail="Template tidak ditemukan")
    task = {
        "id": new_id(), "title": tpl.get("title", tpl.get("name")), "description": tpl.get("description", ""),
        "requester": dict(EMPTY_PERSON), "pic": dict(EMPTY_PERSON), "priority": tpl.get("priority", "Medium"),
        "deadline": None, "documents": [],
        "items": [{"id": new_id(), "title": t, "done": False, "done_at": None, "due_date": None, "documents": []} for t in tpl.get("items", [])],
        "comments": [], "status": "Pending",
        "history": [{"action": "created", "by": user["name"], "at": now_iso(), "detail": f"Dari template '{tpl['name']}'"}],
        "created_by": user["id"], "created_by_name": user["name"], "created_at": now_iso(), "updated_at": now_iso(),
    }
    task = compute(task)
    await db.tasks.insert_one(dict(task))
    task.pop("_id", None)
    await log_activity(db, user, "create", "task", task["id"], f"Membuat tugas dari template '{tpl['name']}'")
    return task


@router.delete("/templates/{template_id}")
async def delete_template(template_id: str, user: dict = Depends(get_current_user)):
    await db.task_templates.delete_one({"id": template_id})
    return {"message": "Template dihapus"}


@router.post("/{task_id}/broadcast")
async def broadcast_task(task_id: str, body: BroadcastBody, user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Tugas tidak ditemukan")
    task = compute(task)
    req = task.get("requester") or {}
    if isinstance(req, str):
        req = {"name": req}
    message = body.message or (
        f"Halo {req.get('name', '')}, update tugas '{task['title']}': "
        f"status {task['status']}, progres {task['progress']}%."
    )
    result = {"wa_url": None, "email_sent": False}

    if "whatsapp" in body.channels and req.get("phone"):
        result["wa_url"] = whatsapp_url(req["phone"], message)

    if "email" in body.channels and req.get("email"):
        await dispatch_email(f"Pemberitahuan Tugas: {task['title']}", message, to_override=req["email"])
        result["email_sent"] = True

    await create_notification(None, "Broadcast Tugas", f"Pemberitahuan tugas '{task['title']}' dikirim ke pemberi tugas", "task", f"/tasks/{task_id}")
    await log_activity(db, user, "update", "task", task_id, f"Mengirim broadcast pemberitahuan untuk '{task['title']}'")
    return result


@router.delete("/{task_id}")
async def remove_task(task_id: str, user: dict = Depends(get_current_user)):
    existing = await db.tasks.find_one({"id": task_id, "is_deleted": {"$ne": True}}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Tugas tidak ditemukan")
    if not can_manage(user, existing):
        raise HTTPException(status_code=403, detail="Hanya pembuat tugas atau Admin yang dapat menghapus")
    await delete_task(task_id, user)
    return {"message": "Tugas dihapus"}
