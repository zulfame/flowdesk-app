import asyncio, sys
from pathlib import Path
from dotenv import load_dotenv
R = Path('/app/backend'); sys.path.insert(0, str(R)); load_dotenv(R/'.env')
import httpx
from db import db
from security import create_token, hash_password
from helpers import new_id, now_iso
BASE = "http://localhost:8001/api"

async def main():
    # dua user: pelapor & penerima (tanpa hubungan hierarki)
    ids = {}
    for name in ("uji_pelapor", "uji_penerima"):
        r = await db.roles.find_one({"name": name})
        rid = r["id"] if r else new_id()
        if not r:
            await db.roles.insert_one({"id": rid, "name": name, "label": name, "level": "Staff",
                                       "parent_id": None, "permissions": ["help_ticket"],
                                       "is_system": False, "created_at": now_iso()})
        u = await db.users.find_one({"email": f"{name}@flowdesk.test"})
        uid = u["id"] if u else new_id()
        if not u:
            await db.users.insert_one({"id": uid, "email": f"{name}@flowdesk.test", "name": name,
                                       "role": name, "password_hash": hash_password("uji12345"),
                                       "is_active": True, "created_at": now_iso()})
        ids[name] = (uid, create_token(uid, f"{name}@flowdesk.test"))

    h = lambda n: {"Authorization": f"Bearer {ids[n][1]}"}
    async with httpx.AsyncClient(base_url=BASE, timeout=20) as c:
        r = await c.post("/help-tickets", headers=h("uji_pelapor"), json={
            "title": "UJI izin", "description": "asli", "category": "Jaringan", "priority": "High",
            "assignee": {"user_id": ids["uji_penerima"][0], "name": "uji_penerima"}})
        tid = r.json()["id"]; print("1. buat tiket:", r.status_code, r.json()["number"])

        r = await c.put(f"/help-tickets/{tid}", headers=h("uji_penerima"), json={"title": "DIMANIPULASI"})
        print("2. penerima ubah judul (harus 403):", r.status_code, r.json().get("detail"))
        r = await c.put(f"/help-tickets/{tid}", headers=h("uji_penerima"), json={"priority": "Low"})
        print("3. penerima ubah prioritas (harus 403):", r.status_code)
        r = await c.put(f"/help-tickets/{tid}", headers=h("uji_penerima"),
                        json={"attachments": [{"kind": "url", "url": "http://x"}]})
        print("4. penerima ubah lampiran tiket (harus 403):", r.status_code)

        r = await c.put(f"/help-tickets/{tid}", headers=h("uji_penerima"), json={
            "status": "Diproses", "resolution": "sudah dicek",
            "resolution_attachments": [{"kind": "url", "url": "http://bukti", "label": "bukti"}]})
        d = r.json()
        print("5. penerima ubah status+bukti (harus 200):", r.status_code, d.get("status"),
              "bukti:", len(d.get("resolution_attachments") or []), "| can_edit:", d.get("can_edit"))

        r = await c.put(f"/help-tickets/{tid}", headers=h("uji_pelapor"),
                        json={"resolution_attachments": [{"kind": "url", "url": "http://palsu"}]})
        print("6. pelapor unggah bukti (harus 403):", r.status_code)
        r = await c.put(f"/help-tickets/{tid}", headers=h("uji_pelapor"), json={"title": "Judul baru"})
        print("7. pelapor ubah judul (harus 200):", r.status_code, r.json().get("title"),
              "| can_edit:", r.json().get("can_edit"))

        r = await c.post(f"/help-tickets/{tid}/comments", headers=h("uji_penerima"), json={
            "message": "", "attachments": [{"kind": "url", "url": "http://ss", "label": "tangkapan layar"}]})
        print("8. komentar hanya lampiran (harus 200):", r.status_code, "lampiran:",
              len(r.json().get("attachments") or []))
        r = await c.post(f"/help-tickets/{tid}/comments", headers=h("uji_penerima"), json={"message": ""})
        print("9. komentar kosong tanpa lampiran (harus 400):", r.status_code)

        await c.delete(f"/help-tickets/{tid}", headers=h("uji_pelapor"))
        await db.users.delete_many({"email": {"$regex": "@flowdesk.test$"}})
        await db.roles.delete_many({"name": {"$regex": "^uji_"}})
        await db.notifications.delete_many({"message": {"$regex": "UJI izin|Judul baru"}})
        print("10. bersih-bersih selesai")

asyncio.run(main())
