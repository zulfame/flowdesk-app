import os
import gzip
import json
from pathlib import Path

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional

from db import db
from helpers import new_id, now_iso, log_activity
from security import require_admin
import s3_storage

router = APIRouter(prefix="/database", tags=["database"])

BACKUP_DIR = Path(os.environ.get("LOCAL_STORAGE_DIR", "/app/data")) / "backups"


def _ensure_backup_dir() -> Path:
    """Folder backup dibuat saat dibutuhkan agar import modul tidak gagal bila volume belum siap."""
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    return BACKUP_DIR

# Collections included in a full backup (login attempts & backups meta excluded)
BACKUP_COLLECTIONS = [
    "users", "roles", "tasks", "task_templates", "meetings", "reminders",
    "notes", "events", "files", "notifications", "activity_logs", "settings",
]


class StorageTestBody(BaseModel):
    endpoint: Optional[str] = ""
    bucket: Optional[str] = ""
    access_key: Optional[str] = ""
    secret_key: Optional[str] = ""
    region: Optional[str] = ""
    path: Optional[str] = ""


async def _get_storage_cfg() -> dict:
    s = await db.settings.find_one({"key": "app"}, {"_id": 0}) or {}
    return s.get("storage", {})


@router.post("/storage/test")
async def test_storage(body: StorageTestBody, admin: dict = Depends(require_admin)):
    return s3_storage.test_connection(body.model_dump())


async def _dump() -> tuple[bytes, dict]:
    payload = {"version": 1, "created_at": now_iso(), "collections": {}}
    counts = {}
    for name in BACKUP_COLLECTIONS:
        docs = await db[name].find({}, {"_id": 0}).to_list(100000)
        payload["collections"][name] = docs
        counts[name] = len(docs)
    raw = gzip.compress(json.dumps(payload, default=str).encode("utf-8"))
    return raw, counts


@router.post("/backup")
async def create_backup(destination: str = "local", admin: dict = Depends(require_admin)):
    if destination not in ("local", "s3"):
        raise HTTPException(status_code=400, detail="Tujuan tidak valid")
    return await run_backup(destination, admin["name"], admin)


async def run_backup(destination: str, by_name: str, admin: dict = None):
    raw, counts = await _dump()
    bid = new_id()
    filename = f"flowdesk-backup-{now_iso()[:19].replace(':', '-')}.json.gz"
    doc = {
        "id": bid, "filename": filename, "size": len(raw),
        "collections": counts, "total_records": sum(counts.values()),
        "destination": destination, "storage_key": None, "auto": admin is None,
        "created_at": now_iso(), "created_by_name": by_name,
    }
    if destination == "local":
        (_ensure_backup_dir() / f"{bid}.json.gz").write_bytes(raw)
    else:
        cfg = await _get_storage_cfg()
        if not s3_storage.is_configured(cfg):
            raise HTTPException(status_code=400, detail="Konfigurasi S3 belum lengkap. Isi & uji koneksi di bagian Penyimpanan.")
        key = s3_storage.put_bytes(cfg, f"backups/{filename}", raw, "application/gzip")
        doc["storage_key"] = key
    await db.backups.insert_one(dict(doc))
    doc.pop("_id", None)
    await log_activity(db, admin, "create", "backup", bid, f"Membuat backup ({destination}{'' if admin else ', otomatis'})")
    return doc


def _parse_backup(raw: bytes) -> dict:
    try:
        return json.loads(gzip.decompress(raw).decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Berkas backup rusak / tidak dapat dibaca")


async def _apply_restore(data: dict) -> dict:
    if not isinstance(data.get("collections"), dict):
        raise HTTPException(status_code=400, detail="Format backup tidak dikenali")
    restored = {}
    for name, docs in data["collections"].items():
        if name not in BACKUP_COLLECTIONS:
            continue
        await db[name].delete_many({})
        if docs:
            await db[name].insert_many([dict(d) for d in docs])
        restored[name] = len(docs)
    return restored


@router.get("/backups")
async def list_backups(admin: dict = Depends(require_admin)):
    return await db.backups.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


def _read_local(bid: str) -> bytes:
    p = BACKUP_DIR / f"{bid}.json.gz"
    if not p.exists():
        raise HTTPException(status_code=404, detail="Berkas backup tidak ada di server")
    return p.read_bytes()


async def _load_backup_bytes(meta: dict) -> bytes:
    if meta["destination"] == "local":
        return _read_local(meta["id"])
    cfg = await _get_storage_cfg()
    if not s3_storage.is_configured(cfg):
        raise HTTPException(status_code=400, detail="Konfigurasi S3 belum lengkap")
    try:
        return s3_storage.get_bytes(cfg, meta["storage_key"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal mengambil dari S3: {e}")


@router.get("/backups/{backup_id}/inspect")
async def inspect_backup(backup_id: str, admin: dict = Depends(require_admin)):
    meta = await db.backups.find_one({"id": backup_id}, {"_id": 0})
    if not meta:
        raise HTTPException(status_code=404, detail="Backup tidak ditemukan")
    raw = await _load_backup_bytes(meta)
    try:
        data = json.loads(gzip.decompress(raw).decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Berkas backup rusak / tidak dapat dibaca")
    counts = {k: len(v) for k, v in data.get("collections", {}).items()}
    return {"valid": True, "version": data.get("version"), "created_at": data.get("created_at"),
            "collections": counts, "total_records": sum(counts.values())}


@router.get("/backups/{backup_id}/download")
async def download_backup(backup_id: str, admin: dict = Depends(require_admin)):
    meta = await db.backups.find_one({"id": backup_id}, {"_id": 0})
    if not meta:
        raise HTTPException(status_code=404, detail="Backup tidak ditemukan")
    raw = await _load_backup_bytes(meta)
    return Response(content=raw, media_type="application/gzip",
                    headers={"Content-Disposition": f'attachment; filename="{meta["filename"]}"'})


@router.post("/backups/{backup_id}/restore")
async def restore_backup(backup_id: str, admin: dict = Depends(require_admin)):
    meta = await db.backups.find_one({"id": backup_id}, {"_id": 0})
    if not meta:
        raise HTTPException(status_code=404, detail="Backup tidak ditemukan")
    raw = await _load_backup_bytes(meta)
    restored = await _apply_restore(_parse_backup(raw))
    await log_activity(db, admin, "restore", "backup", backup_id, f"Memulihkan database dari backup {meta['filename']}")
    return {"message": "Database berhasil dipulihkan", "restored": restored}


@router.post("/restore-upload")
async def restore_upload(file: UploadFile = File(...), admin: dict = Depends(require_admin)):
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Berkas kosong")
    restored = await _apply_restore(_parse_backup(raw))
    await log_activity(db, admin, "restore", "backup", None, f"Memulihkan database dari unggahan '{file.filename}'")
    return {"message": "Database berhasil dipulihkan dari unggahan", "restored": restored}


@router.delete("/backups/{backup_id}")
async def delete_backup(backup_id: str, admin: dict = Depends(require_admin)):
    meta = await db.backups.find_one({"id": backup_id}, {"_id": 0})
    if not meta:
        raise HTTPException(status_code=404, detail="Backup tidak ditemukan")
    if meta["destination"] == "local":
        p = BACKUP_DIR / f"{backup_id}.json.gz"
        if p.exists():
            p.unlink()
    else:
        cfg = await _get_storage_cfg()
        if s3_storage.is_configured(cfg) and meta.get("storage_key"):
            try:
                s3_storage.delete_key(cfg, meta["storage_key"])
            except Exception:
                pass
    await db.backups.delete_one({"id": backup_id})
    await log_activity(db, admin, "delete", "backup", backup_id, f"Menghapus backup {meta['filename']}")
    return {"message": "Backup dihapus"}
