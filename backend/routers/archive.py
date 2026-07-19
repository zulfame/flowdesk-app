from fastapi import APIRouter, HTTPException, Depends

from db import db
from helpers import now_iso, log_activity
from security import require_admin
from services import _cascade_restore_files

router = APIRouter(prefix="/archive", tags=["archive"])

TYPES = {
    "task": ("tasks", "title"),
    "meeting": ("meetings", "title"),
    "note": ("notes", "title"),
    "reminder": ("reminders", "title"),
    "event": ("events", "title"),
}


@router.get("")
async def list_archive(type: str = "all", q: str = None, page: int = 1, page_size: int = 20,
                       admin: dict = Depends(require_admin)):
    keys = [type] if type in TYPES else list(TYPES.keys())
    query_extra = {}
    if q:
        query_extra["title"] = {"$regex": q, "$options": "i"}
    items = []
    for key in keys:
        coll, title_field = TYPES[key]
        cur = db[coll].find({"is_deleted": True, **query_extra}, {"_id": 0}).sort("deleted_at", -1).to_list(1000)
        for doc in await cur:
            items.append({
                "type": key, "id": doc["id"], "title": doc.get(title_field, "(tanpa judul)"),
                "deleted_at": doc.get("deleted_at"), "deleted_by_name": doc.get("deleted_by_name", "-"),
            })
    items.sort(key=lambda x: x.get("deleted_at") or "", reverse=True)
    total = len(items)
    start = (max(1, page) - 1) * page_size
    return {"items": items[start:start + page_size], "total": total, "page": page, "page_size": page_size}


@router.post("/{type}/{item_id}/restore")
async def restore_item(type: str, item_id: str, admin: dict = Depends(require_admin)):
    if type not in TYPES:
        raise HTTPException(status_code=400, detail="Tipe tidak valid")
    coll, title_field = TYPES[type]
    doc = await db[coll].find_one({"id": item_id, "is_deleted": True}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Data terhapus tidak ditemukan")
    await db[coll].update_one({"id": item_id}, {"$set": {"is_deleted": False}, "$unset": {"deleted_at": "", "deleted_by_name": ""}})
    await _cascade_restore_files(item_id)
    await log_activity(db, admin, "restore", type, item_id, f"Memulihkan {type} '{doc.get(title_field, '')}'")
    return {"message": "Data berhasil dipulihkan"}


@router.delete("/{type}/{item_id}")
async def purge_item(type: str, item_id: str, admin: dict = Depends(require_admin)):
    if type not in TYPES:
        raise HTTPException(status_code=400, detail="Tipe tidak valid")
    coll, title_field = TYPES[type]
    doc = await db[coll].find_one({"id": item_id, "is_deleted": True}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Data terhapus tidak ditemukan")
    # Hapus berkas fisik lampiran agar tidak menumpuk di storage
    from storage import delete_object
    files = await db.files.find({"parent_id": item_id}, {"_id": 0}).to_list(1000)
    for f in files:
        if f.get("storage_path"):
            delete_object(f["storage_path"])
    await db[coll].delete_one({"id": item_id})
    await db.files.delete_many({"parent_id": item_id})
    await log_activity(db, admin, "delete", type, item_id, f"Menghapus permanen {type} '{doc.get(title_field, '')}'")
    return {"message": "Data dihapus permanen"}
