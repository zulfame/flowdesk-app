from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Query, Header, Response
from typing import Optional

from db import db
from helpers import new_id, now_iso, log_activity
from security import get_current_user, get_current_user as _gcu
from storage import put_object, get_object, APP_NAME

router = APIRouter(tags=["attachments"])

MAX_SIZE = 50 * 1024 * 1024  # 50MB


@router.post("/attachments")
async def upload_attachment(
    module: str = Form(...),
    parent_id: str = Form(...),
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="Ukuran file melebihi 50MB")
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "bin"
    path = f"{APP_NAME}/uploads/{user['id']}/{new_id()}.{ext}"
    result = put_object(path, data, file.content_type or "application/octet-stream")
    doc = {
        "id": new_id(),
        "module": module,
        "parent_id": parent_id,
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": file.content_type or "application/octet-stream",
        "size": result.get("size", len(data)),
        "is_deleted": False,
        "uploaded_by": user["id"],
        "uploaded_by_name": user["name"],
        "created_at": now_iso(),
    }
    await db.files.insert_one(dict(doc))
    doc.pop("_id", None)
    await log_activity(db, user, "upload", module, parent_id, f"Mengunggah file '{file.filename}'")
    return doc


@router.get("/attachments")
async def list_attachments(parent_id: Optional[str] = None, module: Optional[str] = None,
                           user: dict = Depends(get_current_user)):
    q = {"is_deleted": False}
    if parent_id:
        q["parent_id"] = parent_id
    if module:
        q["module"] = module
    return await db.files.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)


@router.get("/attachments/{file_id}/download")
async def download_attachment(file_id: str, authorization: str = Header(None), auth: str = Query(None)):
    # auth via header or query token (for <img>/<a> tags)
    from security import get_current_user as _
    import jwt as _jwt, os
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
    elif auth:
        token = auth
    if not token:
        raise HTTPException(status_code=401, detail="Tidak terautentikasi")
    try:
        _jwt.decode(token, os.environ["JWT_SECRET"], algorithms=["HS256"])
    except Exception:
        raise HTTPException(status_code=401, detail="Token tidak valid")

    record = await db.files.find_one({"id": file_id, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="File tidak ditemukan")
    data, ctype = get_object(record["storage_path"])
    return Response(
        content=data,
        media_type=record.get("content_type", ctype),
        headers={"Content-Disposition": f'inline; filename="{record["original_filename"]}"'},
    )


@router.delete("/attachments/{file_id}")
async def delete_attachment(file_id: str, user: dict = Depends(get_current_user)):
    record = await db.files.find_one({"id": file_id, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="File tidak ditemukan")
    await db.files.update_one({"id": file_id}, {"$set": {"is_deleted": True, "deleted_at": now_iso()}})
    await log_activity(db, user, "delete", record["module"], record["parent_id"], f"Menghapus file '{record['original_filename']}'")
    return {"message": "File dihapus"}
