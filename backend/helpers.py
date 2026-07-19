import uuid
from datetime import datetime, timezone


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


PRIVILEGED_ROLES = ("admin", "manager")


def is_privileged(user: dict) -> bool:
    """Admin & Manajer melihat semua data."""
    return (user or {}).get("role") in PRIVILEGED_ROLES


def is_admin(user: dict) -> bool:
    return (user or {}).get("role") == "admin"


def can_manage(user: dict, doc: dict) -> bool:
    """Boleh hapus / ubah info inti: Admin atau pembuat data."""
    if not user or not doc:
        return False
    return user.get("role") == "admin" or doc.get("created_by") == user.get("id")


def task_visibility_query(user: dict) -> dict:
    """Filter data tugas untuk pengguna non-privileged: hanya yang terkait dirinya."""
    if is_privileged(user):
        return {}
    uid = user.get("id")
    return {"$or": [
        {"created_by": uid},
        {"pic.user_id": uid},
        {"requester.user_id": uid},
    ]}


def meeting_visibility_query(user: dict) -> dict:
    if is_privileged(user):
        return {}
    return {"$or": [{"created_by": user.get("id")}, {"participants": user.get("name")}]}



async def log_activity(db, user, action, entity_type, entity_id=None, description=""):
    """Central activity logger. Never called directly from controllers for deletes;
    used by service layer and routers for audit trail."""
    doc = {
        "id": new_id(),
        "user_id": user.get("id") if user else None,
        "user_name": user.get("name") if user else "System",
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "description": description,
        "created_at": now_iso(),
    }
    await db.activity_logs.insert_one(doc)
    return doc
