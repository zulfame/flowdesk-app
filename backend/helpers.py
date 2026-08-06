import uuid
from datetime import datetime, timezone


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


ADMIN_ROLE = "super_admin"
GUEST_ROLE = "guest"


def is_admin(user: dict) -> bool:
    """Hanya Super Admin (atau pemegang izin '*') yang berstatus administrator."""
    u = user or {}
    return u.get("role") == ADMIN_ROLE or "*" in (u.get("permissions") or [])


def is_privileged(user: dict) -> bool:
    return is_admin(user)


def can_manage(user: dict, doc: dict) -> bool:
    """Boleh hapus / ubah info inti: Super Admin atau pembuat data."""
    if not user or not doc:
        return False
    return is_admin(user) or doc.get("created_by") == user.get("id")


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


# ── Hierarki jabatan (peran) ──────────────────────────────────────────────
ROLE_LEVELS = ["Komisaris", "Dirut", "Direksi", "Kabag", "Kasi", "Staff"]


def guess_role_level(label: str) -> str:
    """Tebak level dari nama jabatan bila kolom Level tidak tersedia."""
    t = (label or "").strip().lower()
    if t.startswith("dewan komisaris") or "komisaris" in t:
        return "Komisaris"
    if t.startswith("direktur utama"):
        return "Dirut"
    if t.startswith("direktur"):
        return "Direksi"
    if t.startswith("kabag") or t.startswith("kepala bagian"):
        return "Kabag"
    if t.startswith("kasi") or t.startswith("kepala seksi") or t.startswith("kepala kantor"):
        return "Kasi"
    return "Staff"


async def role_by_name(db, name: str) -> dict | None:
    if not name:
        return None
    return await db.roles.find_one({"name": name}, {"_id": 0})


async def sees_all(db, user: dict) -> bool:
    """Admin / Super Admin (izin '*') melihat seluruh data organisasi."""
    if not user:
        return False
    if is_admin(user):
        return True
    role = await role_by_name(db, user.get("role"))
    return bool(role and "*" in (role.get("permissions") or []))


async def role_subtree_names(db, role_name: str) -> set:
    """Nama peran milik sendiri + seluruh turunannya (anak, cucu, dst)."""
    roles = await db.roles.find({}, {"_id": 0, "id": 1, "name": 1, "parent_id": 1}).to_list(500)
    root = next((r for r in roles if r.get("name") == role_name), None)
    if not root:
        return {role_name} if role_name else set()
    children = {}
    for r in roles:
        children.setdefault(r.get("parent_id"), []).append(r)
    out, stack = set(), [root]
    while stack:
        cur = stack.pop()
        if cur["name"] in out:
            continue
        out.add(cur["name"])
        stack.extend(children.get(cur["id"], []))
    return out


async def scope_user_ids(db, user: dict):
    """ID pengguna yang boleh dilihat: diri sendiri + semua pemegang jabatan turunan.
    Mengembalikan None bila pengguna boleh melihat semua data."""
    if await sees_all(db, user):
        return None
    names = await role_subtree_names(db, user.get("role"))
    us = await db.users.find({"role": {"$in": list(names)}}, {"_id": 0, "id": 1}).to_list(1000)
    ids = {u["id"] for u in us}
    ids.add(user.get("id"))
    return list(ids)


async def subordinate_users(db, user: dict) -> list:
    """Pemegang jabatan DI BAWAH jabatan pengguna (tanpa dirinya) — kandidat PIC."""
    if await sees_all(db, user):
        return await db.users.find({"is_active": {"$ne": False}}, {"_id": 0, "password_hash": 0}).to_list(1000)
    names = await role_subtree_names(db, user.get("role")) - {user.get("role")}
    if not names:
        return []
    return await db.users.find(
        {"role": {"$in": list(names)}, "is_active": {"$ne": False}}, {"_id": 0, "password_hash": 0}
    ).to_list(1000)


async def task_scope_query(db, user: dict) -> dict:
    ids = await scope_user_ids(db, user)
    if ids is None:
        return {}
    return {"$or": [
        {"created_by": {"$in": ids}},
        {"pic.user_id": {"$in": ids}},
        {"requester.user_id": {"$in": ids}},
    ]}


async def meeting_scope_query(db, user: dict) -> dict:
    ids = await scope_user_ids(db, user)
    if ids is None:
        return {}
    return {"$or": [{"created_by": {"$in": ids}}, {"member_ids": {"$in": ids}}]}


async def schedule_scope_query(db, user: dict) -> dict:
    ids = await scope_user_ids(db, user)
    if ids is None:
        return {}
    return {"$or": [{"created_by": {"$in": ids}}, {"activities.pic.user_id": {"$in": ids}}]}
