"""Service layer. ALL delete operations go through here (never from controllers directly).
Ensures no orphan data / no orphan files: related attachments are soft-deleted and
child references removed together with the parent, in a best-effort atomic sequence."""
from db import db
from helpers import log_activity, now_iso


async def _soft_delete_files(parent_id: str):
    await db.files.update_many(
        {"parent_id": parent_id, "is_deleted": False},
        {"$set": {"is_deleted": True, "deleted_at": now_iso()}},
    )


async def delete_task(task_id: str, user: dict):
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        return False
    await _soft_delete_files(task_id)
    await db.tasks.delete_one({"id": task_id})
    # remove link references from meeting action items
    await db.meetings.update_many(
        {"action_items.converted_task_id": task_id},
        {"$set": {"action_items.$[el].converted_task_id": None}},
        array_filters=[{"el.converted_task_id": task_id}],
    )
    await log_activity(db, user, "delete", "task", task_id, f"Menghapus tugas '{task.get('title')}'")
    return True


async def delete_meeting(meeting_id: str, user: dict):
    meeting = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    if not meeting:
        return False
    await _soft_delete_files(meeting_id)
    # unlink generated tasks (keep tasks but drop meeting reference)
    await db.tasks.update_many(
        {"meeting_id": meeting_id}, {"$set": {"meeting_id": None}}
    )
    await db.meetings.delete_one({"id": meeting_id})
    await log_activity(db, user, "delete", "meeting", meeting_id, f"Menghapus rapat '{meeting.get('title')}'")
    return True


async def delete_reminder(reminder_id: str, user: dict):
    rem = await db.reminders.find_one({"id": reminder_id}, {"_id": 0})
    if not rem:
        return False
    await _soft_delete_files(reminder_id)
    await db.reminders.delete_one({"id": reminder_id})
    await log_activity(db, user, "delete", "reminder", reminder_id, f"Menghapus pengingat '{rem.get('title')}'")
    return True


async def delete_note(note_id: str, user: dict):
    note = await db.notes.find_one({"id": note_id}, {"_id": 0})
    if not note:
        return False
    await _soft_delete_files(note_id)
    await db.notes.delete_one({"id": note_id})
    await log_activity(db, user, "delete", "note", note_id, f"Menghapus catatan '{note.get('title')}'")
    return True


async def delete_event(event_id: str, user: dict):
    ev = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not ev:
        return False
    await db.events.delete_one({"id": event_id})
    await log_activity(db, user, "delete", "event", event_id, f"Menghapus acara '{ev.get('title')}'")
    return True
