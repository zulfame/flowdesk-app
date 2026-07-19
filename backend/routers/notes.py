from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List

from db import db
from helpers import new_id, now_iso, log_activity
from security import get_current_user
from services import delete_note

router = APIRouter(prefix="/notes", tags=["notes"])


class NoteCreate(BaseModel):
    title: str
    content: Optional[str] = ""
    tags: List[str] = []
    color: Optional[str] = "default"
    pinned: bool = False


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None
    color: Optional[str] = None
    pinned: Optional[bool] = None


@router.get("")
async def list_notes(user: dict = Depends(get_current_user)):
    notes = await db.notes.find({}, {"_id": 0}).sort("updated_at", -1).to_list(1000)
    notes.sort(key=lambda n: (not n.get("pinned", False)))
    return notes


@router.get("/{note_id}")
async def get_note(note_id: str, user: dict = Depends(get_current_user)):
    note = await db.notes.find_one({"id": note_id}, {"_id": 0})
    if not note:
        raise HTTPException(status_code=404, detail="Catatan tidak ditemukan")
    note["attachments"] = await db.files.find({"parent_id": note_id, "is_deleted": False}, {"_id": 0}).to_list(200)
    return note


@router.post("")
async def create_note(body: NoteCreate, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc.update({
        "id": new_id(),
        "created_by": user["id"],
        "created_by_name": user["name"],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    })
    await db.notes.insert_one(dict(doc))
    doc.pop("_id", None)
    await log_activity(db, user, "create", "note", doc["id"], f"Membuat catatan '{doc['title']}'")
    return doc


@router.put("/{note_id}")
async def update_note(note_id: str, body: NoteUpdate, user: dict = Depends(get_current_user)):
    existing = await db.notes.find_one({"id": note_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Catatan tidak ditemukan")
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    update["updated_at"] = now_iso()
    await db.notes.update_one({"id": note_id}, {"$set": update})
    await log_activity(db, user, "update", "note", note_id, f"Memperbarui catatan '{existing['title']}'")
    return await db.notes.find_one({"id": note_id}, {"_id": 0})


@router.delete("/{note_id}")
async def remove_note(note_id: str, user: dict = Depends(get_current_user)):
    ok = await delete_note(note_id, user)
    if not ok:
        raise HTTPException(status_code=404, detail="Catatan tidak ditemukan")
    return {"message": "Catatan dihapus"}
