"""Uji penguncian tiket Selesai/Ditutup + batas hak pelapor vs penerima."""
import asyncio, sys
from pathlib import Path
from dotenv import load_dotenv

R = Path("/app/backend"); sys.path.insert(0, str(R)); load_dotenv(R / ".env")
import httpx
from db import db
from security import create_token, hash_password
from helpers import new_id, now_iso

BASE = "http://localhost:8001/api"


async def seed():
    ids = {}
    for name in ("uji_pelapor", "uji_penerima"):
        r = await db.roles.find_one({"name": name})
        rid = r["id"] if r else new_id()
        if not r:
            await db.roles.insert_one({"id": rid, "name": name, "label": name, "level": "Staff",
                                       "parent_id": None, "permissions": ["help_ticket"],
                                       "is_system": False, "created_at": now_iso()})
        email = f"{name}@flowdesk.test"
        u = await db.users.find_one({"email": email})
        uid = u["id"] if u else new_id()
        if not u:
            await db.users.insert_one({"id": uid, "email": email, "name": name, "role": name,
                                       "password_hash": hash_password("uji12345"),
                                       "is_active": True, "created_at": now_iso()})
        ids[name] = (uid, create_token(uid, email))
    return ids


async def main():
    ids = await seed()
    h = lambda n: {"Authorization": f"Bearer {ids[n][1]}"}
    async with httpx.AsyncClient(base_url=BASE, timeout=20) as c:
        r = await c.post("/help-tickets", headers=h("uji_pelapor"), json={
            "title": "UJI lock", "description": "asli", "category": "Hapus Transaksi",
            "priority": "Urgent",
            "assignee": {"user_id": ids["uji_penerima"][0], "name": "uji_penerima"}})
        tid = r.json()["id"]
        r = await c.post(f"/help-tickets/{tid}/comments", headers=h("uji_pelapor"),
                         json={"message": "bukti keluhan"})
        cid = r.json()["id"]
        print("1. tiket + komentar dibuat:", r.status_code)

        # penerima menyelesaikan
        r = await c.put(f"/help-tickets/{tid}", headers=h("uji_penerima"), json={
            "status": "Selesai", "resolution": "sudah dihapus",
            "resolution_attachments": [{"kind": "url", "url": "http://bukti"}]})
        d = r.json()
        print("2. penerima set Selesai:", r.status_code, "| is_locked:", d.get("is_locked"),
              "| can_edit:", d.get("can_edit"), "| can_reassign:", d.get("can_reassign"),
              "| can_delete(penerima):", d.get("can_delete"))

        # pelapor mencoba manipulasi setelah terkunci
        for field, payload in (("judul", {"title": "diubah"}),
                               ("lampiran", {"attachments": []}),
                               ("kategori", {"category": "Jaringan"})):
            r = await c.put(f"/help-tickets/{tid}", headers=h("uji_pelapor"), json=payload)
            print(f"3. pelapor ubah {field} saat terkunci (harus 403):", r.status_code)
        r = await c.delete(f"/help-tickets/{tid}/comments/{cid}", headers=h("uji_pelapor"))
        print("4. pelapor hapus komentar saat terkunci (harus 403):", r.status_code)
        r = await c.delete(f"/help-tickets/{tid}", headers=h("uji_pelapor"))
        print("5. pelapor hapus tiket saat terkunci (harus 403):", r.status_code, r.json().get("detail"))

        # penerima juga terkunci kecuali status
        r = await c.put(f"/help-tickets/{tid}", headers=h("uji_penerima"),
                        json={"resolution": "diubah diam-diam"})
        print("6. penerima ubah catatan saat terkunci (harus 403):", r.status_code)
        r = await c.put(f"/help-tickets/{tid}", headers=h("uji_penerima"),
                        json={"resolution_attachments": []})
        print("7. penerima hapus bukti saat terkunci (harus 403):", r.status_code)
        r = await c.put(f"/help-tickets/{tid}", headers=h("uji_pelapor"),
                        json={"assignee": {"user_id": ids["uji_pelapor"][0], "name": "uji_pelapor"}})
        print("8. pelapor alihkan tujuan saat terkunci (harus 403):", r.status_code)

        # buka kembali oleh penerima
        r = await c.put(f"/help-tickets/{tid}", headers=h("uji_penerima"), json={"status": "Diproses"})
        d = r.json()
        print("9. penerima buka kembali (harus 200):", r.status_code, d.get("status"),
              "| is_locked:", d.get("is_locked"))
        r = await c.put(f"/help-tickets/{tid}", headers=h("uji_pelapor"), json={"title": "Judul revisi"})
        print("10. pelapor ubah judul setelah dibuka (harus 200):", r.status_code, r.json().get("title"))
        r = await c.delete(f"/help-tickets/{tid}/comments/{cid}", headers=h("uji_pelapor"))
        print("11. pelapor hapus komentarnya setelah dibuka (harus 200):", r.status_code)

        # tutup lagi → hanya penerima yang boleh hapus
        await c.put(f"/help-tickets/{tid}", headers=h("uji_penerima"), json={"status": "Ditutup"})
        r = await c.get("/help-tickets", headers=h("uji_pelapor"))
        row = next(x for x in r.json() if x["id"] == tid)
        print("12. daftar bagi pelapor — can_delete:", row["can_delete"], "| is_locked:", row["is_locked"])
        r = await c.get("/help-tickets", headers=h("uji_penerima"))
        row = next(x for x in r.json() if x["id"] == tid)
        print("13. daftar bagi penerima — can_delete:", row["can_delete"])
        r = await c.delete(f"/help-tickets/{tid}", headers=h("uji_penerima"))
        print("14. penerima hapus tiket terkunci (harus 200):", r.status_code)

    await db.users.delete_many({"email": {"$regex": "@flowdesk.test$"}})
    await db.roles.delete_many({"name": {"$regex": "^uji_"}})
    await db.notifications.delete_many({"message": {"$regex": "UJI lock|Judul revisi"}})
    await db.help_tickets.delete_many({"title": {"$regex": "^(UJI lock|Judul revisi)"}})
    print("15. bersih-bersih selesai")


asyncio.run(main())
