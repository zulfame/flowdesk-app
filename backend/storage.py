import os
import time
import requests

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "flowdesk"

_storage_key = None


def init_storage():
    global _storage_key
    if _storage_key:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
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
