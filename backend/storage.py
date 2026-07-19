import os
import time
import mimetypes
from pathlib import Path

import requests

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "flowdesk"

# Fallback penyimpanan LOKAL (filesystem) untuk self-host / deploy lokal.
# Aktif bila LOCAL_STORAGE_DIR di-set ATAU EMERGENT_LLM_KEY tidak tersedia
# (mis. di mesin lokal tanpa integrasi Emergent). Di preview/pod Emergent,
# EMERGENT_LLM_KEY tersedia sehingga tetap memakai Object Storage Emergent.
LOCAL_STORAGE_DIR = os.environ.get("LOCAL_STORAGE_DIR")

_storage_key = None


def _use_local() -> bool:
    return bool(LOCAL_STORAGE_DIR) or not EMERGENT_KEY


def _local_base() -> Path:
    base = LOCAL_STORAGE_DIR or os.path.join(os.path.dirname(__file__), "data", "storage")
    return Path(base)


def _local_path(path: str) -> Path:
    # Cegah path traversal; simpan relatif terhadap base.
    safe = os.path.normpath(path).lstrip("/").replace("..", "_")
    return _local_base() / safe


def init_storage():
    global _storage_key
    if _use_local():
        _local_base().mkdir(parents=True, exist_ok=True)
        return "local"
    if _storage_key:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    if _use_local():
        full = _local_path(path)
        full.parent.mkdir(parents=True, exist_ok=True)
        full.write_bytes(data)
        return {"path": path, "size": len(data)}
    key = init_storage()
    for attempt in range(3):
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data,
            timeout=120,
        )
        if resp.status_code == 403:
            # refresh key
            globals()["_storage_key"] = None
            key = init_storage()
            continue
        if resp.status_code == 429:
            time.sleep(2 ** attempt)
            continue
        resp.raise_for_status()
        return resp.json()
    resp.raise_for_status()
    return resp.json()


def delete_object(path: str) -> bool:
    """Best-effort physical deletion of a stored object so files don't pile up."""
    if _use_local():
        try:
            full = _local_path(path)
            if full.exists():
                full.unlink()
            return True
        except Exception:
            return False
    try:
        key = init_storage()
        resp = requests.delete(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key},
            timeout=30,
        )
        if resp.status_code == 403:
            globals()["_storage_key"] = None
            key = init_storage()
            resp = requests.delete(
                f"{STORAGE_URL}/objects/{path}",
                headers={"X-Storage-Key": key},
                timeout=30,
            )
        return resp.status_code in (200, 202, 204, 404)
    except Exception:
        return False


def get_object(path: str):
    if _use_local():
        full = _local_path(path)
        if not full.exists():
            raise FileNotFoundError(path)
        ctype = mimetypes.guess_type(str(full))[0] or "application/octet-stream"
        return full.read_bytes(), ctype
    key = init_storage()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key},
        timeout=60,
    )
    if resp.status_code == 403:
        globals()["_storage_key"] = None
        key = init_storage()
        resp = requests.get(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key},
            timeout=60,
        )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")
