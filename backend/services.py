"""Service layer. ALL delete operations go through here (never from controllers directly).
Deletes are SOFT (is_deleted flag) so items can be restored from the Arsip page.
Related attachments are cascade soft-deleted and restored together with the parent.

Best-practice pengelolaan lampiran:
- Cascade mendukung parent_id komposit (mis. rapat per-peserta "<meetingId>:<userId>").
- Purge PERMANEN (`purge_files`) menghapus metadata DAN berkas fisik dari storage
  (local/S3) agar tidak menumpuk. Dipakai oleh Arsip, hapus user, & hapus peserta.
"""
import re
from db import db
from helpers import log_activity, now_iso
from storage import delete_object


def _parent_query(parent_id: str, prefix: bool = False) -> dict:
    if prefix:
        return {"$or": [{"parent_id": parent_id}, {"parent_id": {"$regex": f"^{re.escape(parent_id)}:"}}]}
    return {"parent_id": parent_id}


async def purge_files(parent_id: str, prefix: bool = False) -> int:
    """HARD delete berkas: hapus bytes dari storage lalu metadata. Return jumlah file."""
    q = _parent_query(parent_id, prefix)
    n = 0
    async for f in db.files.find(q, {"_id": 0, "storage_path": 1}):
        if f.get("storage_path"):
            try:
                delete_object(f["storage_path"])
            except Exception:
                pass
        n += 1
    await db.files.delete_many(q)
    return n


async def _cascade_delete_files(parent_id: str):
    await db.files.update_many(
        {**_parent_query(parent_id, prefix=True), "is_deleted": False},
        {"$set": {"is_deleted": True, "deleted_at": now_iso(), "cascade_deleted": True}},
    )


async def _cascade_restore_files(parent_id: str):
    await db.files.update_many(
        {**_parent_query(parent_id, prefix=True), "cascade_deleted": True},
        {"$set": {"is_deleted": False, "cascade_deleted": False}, "$unset": {"deleted_at": ""}},
    )


async def _soft_delete(collection: str, doc_id: str, user: dict, entity: str, title: str):
    await _cascade_delete_files(doc_id)
    await db[collection].update_one(
        {"id": doc_id},
        {"$set": {"is_deleted": True, "deleted_at": now_iso(), "deleted_by_name": user.get("name") if user else "System"}},
    )
    await log_activity(db, user, "delete", entity, doc_id, f"Menghapus {entity} '{title}'")


async def delete_task(task_id: str, user: dict):
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        return False
    await _soft_delete("tasks", task_id, user, "task", task.get("title", ""))
    return True


async def delete_meeting(meeting_id: str, user: dict):
    meeting = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    if not meeting:
        return False
    await _soft_delete("meetings", meeting_id, user, "meeting", meeting.get("title", ""))
    return True


async def delete_reminder(reminder_id: str, user: dict):
    rem = await db.reminders.find_one({"id": reminder_id}, {"_id": 0})
    if not rem:
        return False
    await _soft_delete("reminders", reminder_id, user, "reminder", rem.get("title", ""))
    return True


async def delete_note(note_id: str, user: dict):
    note = await db.notes.find_one({"id": note_id}, {"_id": 0})
    if not note:
        return False
    await _soft_delete("notes", note_id, user, "note", note.get("title", ""))
    return True


async def delete_event(event_id: str, user: dict):
    ev = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not ev:
        return False
    await _soft_delete("events", event_id, user, "event", ev.get("title", ""))
    return True
