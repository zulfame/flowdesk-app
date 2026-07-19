import uuid
from datetime import datetime, timezone


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


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
