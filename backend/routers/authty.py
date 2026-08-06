from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import authty
from db import db
from helpers import log_activity
from security import require_admin

router = APIRouter(prefix="/authty", tags=["authty"])


class TestBody(BaseModel):
    identity: str
    password: str


@router.get("/status")
async def status(admin: dict = Depends(require_admin)):
    cfg = await authty.get_config()
    return {**cfg, "ready": await authty.enabled()}


@router.post("/test")
async def test_credentials(body: TestBody, admin: dict = Depends(require_admin)):
    """Verifikasi kredensial + sinkronisasi, TANPA membuat sesi. Alat diagnosa pemetaan jabatan."""
    res = await authty.verify_credentials(body.identity.strip(), body.password)
    if not res["ok"]:
        await log_activity(db, admin, "update", "auth", None,
                           f"Uji Authty gagal untuk {body.identity}: {res['message']}")
        raise HTTPException(status_code=res.get("status") or 400, detail=res["message"])

    user = await authty.upsert_user(res["data"])
    mapping = await authty.role_summary(user.get("role"))
    await log_activity(db, admin, "update", "auth", user.get("id"),
                       f"Uji Authty sukses: {user['email']} → {mapping['label']}")
    return {
        "user": {
            "name": user.get("name"),
            "email": user.get("email"),
            "username": user.get("username"),
            "phone": user.get("phone"),
            "is_active": user.get("is_active", True),
            "authty_role": user.get("authty_role"),
        },
        "mapped_role": mapping,
    }
