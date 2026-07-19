"""
FlowDesk — Default Seeder / Fresh Reset.

Menyiapkan database bersih untuk uji coba dari awal:
- Menghapus SELURUH data (tugas, rapat, catatan, pengingat, acara, lampiran,
  notifikasi, log aktivitas, template, backup, langganan push, percobaan login).
- Mereset pengaturan sistem ke nilai default.
- Menyisakan hanya SATU pengguna: Super Administrator.
- Menyeed peran default (admin, manager, member).

Kredensial superadmin diambil dari environment (ADMIN_EMAIL / ADMIN_PASSWORD),
default: admin@flowdesk.com / admin123.

Cara pakai:
    cd /app/backend
    python seed.py            # minta konfirmasi
    python seed.py --force    # tanpa konfirmasi (untuk skrip/CI)
"""
import os
import sys
import asyncio
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from db import db
from helpers import new_id, now_iso
from security import hash_password
from routers.settings import DEFAULT_SETTINGS
from routers.users import DEFAULT_ROLES

# Koleksi yang dikosongkan total
CLEAR_COLLECTIONS = [
    "users", "tasks", "task_templates", "meetings", "reminders", "notes",
    "events", "files", "notifications", "activity_logs", "backups",
    "push_subscriptions", "login_attempts", "roles",
]


async def run(force: bool):
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@flowdesk.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")

    if not force:
        print("PERINGATAN: Ini akan MENGHAPUS SEMUA DATA dan mereset sistem.")
        ans = input("Ketik 'YA' untuk melanjutkan: ").strip()
        if ans != "YA":
            print("Dibatalkan.")
            return

    for coll in CLEAR_COLLECTIONS:
        await db[coll].delete_many({})
    print(f"✓ Mengosongkan {len(CLEAR_COLLECTIONS)} koleksi")

    # Reset pengaturan sistem ke default
    await db.settings.delete_many({})
    await db.settings.insert_one(dict(DEFAULT_SETTINGS))
    print("✓ Pengaturan sistem direset ke default")

    # Seed peran default
    for r in DEFAULT_ROLES:
        await db.roles.insert_one({"id": new_id(), **r})
    print(f"✓ Menyeed {len(DEFAULT_ROLES)} peran default")

    # Seed superadmin
    await db.users.insert_one({
        "id": new_id(),
        "name": "Super Administrator",
        "email": admin_email,
        "password_hash": hash_password(admin_password),
        "role": "admin",
        "permissions": ["*"],
        "phone": None,
        "department": "Sistem",
        "avatar": None,
        "is_active": True,
        "created_at": now_iso(),
    })
    print(f"✓ Superadmin dibuat: {admin_email}")
    print("\nSelesai. Login sebagai superadmin untuk memulai uji coba dari awal.")


if __name__ == "__main__":
    force = "--force" in sys.argv
    asyncio.run(run(force))
