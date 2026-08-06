"""Verifikasi hierarki Tiket Bantuan: pelapor, penerima, atasan keduanya, dan pengalihan tiket."""
import asyncio, os, sys, httpx
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
load_dotenv(ROOT / ".env")

from db import db
from security import create_token, hash_password
from helpers import new_id, now_iso

BASE = "http://localhost:8001/api"

ROLES = [
    ("uji_kabag_ti", "Uji Kabag TI", "Kabag", None),
    ("uji_staff_jaringan", "Uji Staff Jaringan", "Staff", "uji_kabag_ti"),
    ("uji_staff_helpdesk", "Uji Staff Helpdesk", "Staff", "uji_kabag_ti"),
    ("uji_kabag_ops", "Uji Kabag Ops", "Kabag", None),
    ("uji_teller", "Uji Teller", "Staff", "uji_kabag_ops"),
]
USERS = [
    ("uji.kabagti@flowdesk.test", "Uji Kabag TI", "uji_kabag_ti"),
    ("uji.jaringan@flowdesk.test", "Uji Staff Jaringan", "uji_staff_jaringan"),
    ("uji.helpdesk@flowdesk.test", "Uji Staff Helpdesk", "uji_staff_helpdesk"),
    ("uji.kabagops@flowdesk.test", "Uji Kabag Ops", "uji_kabag_ops"),
    ("uji.teller@flowdesk.test", "Uji Teller", "uji_teller"),
]


async def seed():
    ids = {}
    for name, label, level, parent in ROLES:
        parent_id = ids.get(parent)
        existing = await db.roles.find_one({"name": name})
        if existing:
            ids[name] = existing["id"]
            await db.roles.update_one({"name": name}, {"$set": {"parent_id": parent_id, "level": level}})
            continue
        rid = new_id()
        ids[name] = rid
        await db.roles.insert_one({
            "id": rid, "name": name, "label": label, "level": level,
            "parent_id": parent_id, "permissions": ["help_ticket"], "is_system": False,
            "created_at": now_iso(),
        })
    tokens = {}
    for email, name, role in USERS:
        u = await db.users.find_one({"email": email})
        if not u:
            uid = new_id()
            await db.users.insert_one({
                "id": uid, "email": email, "name": name, "role": role,
                "password_hash": hash_password("uji12345"), "is_active": True,
                "department": "Uji", "created_at": now_iso(),
            })
        else:
            uid = u["id"]
            await db.users.update_one({"id": uid}, {"$set": {"role": role, "is_active": True}})
        tokens[role] = create_token(uid, email)
        tokens[role + "_id"] = uid
    return tokens


def h(t):
    return {"Authorization": f"Bearer {t}"}


async def main():
    t = await seed()
    async with httpx.AsyncClient(base_url=BASE, timeout=20) as c:
        # 1. Teller membuat tiket ditujukan ke Staff Jaringan
        r = await c.post("/help-tickets", headers=h(t["uji_teller"]), json={
            "title": "UJI hierarki tiket", "description": "cek visibilitas",
            "category": "Jaringan", "priority": "High",
            "assignee": {"user_id": t["uji_staff_jaringan_id"], "name": "Uji Staff Jaringan"},
        })
        assert r.status_code == 200, r.text
        tid = r.json()["id"]
        print("1. Teller buat tiket:", r.json()["number"], r.json()["status"])

        async def visible(role):
            rr = await c.get("/help-tickets", headers=h(t[role]))
            return any(x["id"] == tid for x in rr.json())

        print("2. Pelapor (teller) lihat:", await visible("uji_teller"))
        print("3. Penerima (staff jaringan) lihat:", await visible("uji_staff_jaringan"))
        print("4. Atasan pelapor (Kabag Ops) lihat:", await visible("uji_kabag_ops"))
        print("5. Atasan penerima (Kabag TI) lihat:", await visible("uji_kabag_ti"))
        print("6. Staff lain (helpdesk, bukan penerima) lihat:", await visible("uji_staff_helpdesk"))

        # 7. Atasan penerima mengalihkan tiket ke staf lain di bawahnya
        r = await c.put(f"/help-tickets/{tid}", headers=h(t["uji_kabag_ti"]), json={
            "assignee": {"user_id": t["uji_staff_helpdesk_id"], "name": "Uji Staff Helpdesk"}})
        print("7. Kabag TI alihkan tiket:", r.status_code, r.json().get("assignee", {}).get("name"))

        # 8. Atasan pelapor TIDAK boleh mengalihkan (bukan atasan penerima)
        r = await c.put(f"/help-tickets/{tid}", headers=h(t["uji_kabag_ops"]), json={
            "assignee": {"user_id": t["uji_teller_id"], "name": "Uji Teller"}})
        print("8. Kabag Ops alihkan (harus 403):", r.status_code)

        # 9. Penerima baru ubah status
        r = await c.put(f"/help-tickets/{tid}", headers=h(t["uji_staff_helpdesk"]),
                        json={"status": "Diproses"})
        print("9. Penerima baru ubah status:", r.status_code, r.json().get("status"))

        # 10. Pelapor tidak boleh ubah status
        r = await c.put(f"/help-tickets/{tid}", headers=h(t["uji_teller"]), json={"status": "Selesai"})
        print("10. Pelapor ubah status (harus 403):", r.status_code)

        # 11. Komentar dua arah
        for role in ("uji_teller", "uji_staff_helpdesk"):
            r = await c.post(f"/help-tickets/{tid}/comments", headers=h(t[role]),
                             json={"message": f"balasan dari {role}"})
            assert r.status_code == 200, r.text
        r = await c.get(f"/help-tickets/{tid}", headers=h(t["uji_kabag_ti"]))
        d = r.json()
        print("11. Komentar:", len(d["comments"]), "| can_reassign kabag TI:", d["can_reassign"],
              "| can_handle:", d["can_handle"])

        # 12. Staff lain (bukan penerima/pelapor & tanpa bawahan) akses detail
        r = await c.get(f"/help-tickets/{tid}", headers=h(t["uji_staff_jaringan"]))
        print("12. Mantan penerima akses detail:", r.status_code)

        # 13. Notifikasi hanya ke pengguna terkait
        async def notifs(role):
            rr = await c.get("/notifications?page_size=50", headers=h(t[role]))
            return [n["title"] for n in rr.json()["items"]]

        print("13. Notif penerima lama (staff jaringan):", notifs_j := await notifs("uji_staff_jaringan"))
        print("14. Notif penerima baru (staff helpdesk):", await notifs("uji_staff_helpdesk"))
        print("15. Notif pelapor (teller):", await notifs("uji_teller"))
        print("16. Notif atasan penerima (kabag TI, pelaku alih):", await notifs("uji_kabag_ti"))
        assert any("Dialihkan" in x for x in notifs_j), "penerima lama tidak diberi tahu"

        # 17. Dashboard: KPI tiket terbuka + tiket perlu ditangani
        for role in ("uji_staff_helpdesk", "uji_kabag_ti", "uji_teller"):
            rr = await c.get("/dashboard/stats", headers=h(t[role]))
            d = rr.json()
            print(f"17. Dashboard {role}: open_tickets={d['open_tickets']} my_tickets={len(d['my_tickets'])}")

        await c.delete(f"/help-tickets/{tid}", headers=h(t["uji_teller"]))
        print("18. Hapus oleh pelapor: ok")


asyncio.run(main())
