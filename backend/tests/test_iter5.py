"""
Iteration 5 backend tests — profile, users pagination + import + permissions,
roles create/delete, reminders envelope + broadcast/channels + own-only,
settings split (public/general/test-notification), database
storage/test + backup lifecycle + nav-badges, activity-logs pagination.
"""
import io
import os
import time
import gzip
import json
from pathlib import Path

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    for line in Path("/app/frontend/.env").read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
            break
API = f"{BASE_URL}/api"
ADMIN_EMAIL = "admin@flowdesk.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_client(admin_token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"})
    return s


# ---------- Profile ----------
class TestProfile:
    def test_get_profile(self, admin_client):
        r = admin_client.get(f"{API}/profile")
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_profile_email_uniqueness_and_propagation(self, admin_client):
        # Create temp member user
        stamp = int(time.time() * 1000)
        email = f"iter5user_{stamp}@example.com"
        pw = "member12345"
        cu = admin_client.post(f"{API}/users", json={
            "name": "IterFive User", "email": email, "password": pw,
            "role": "member", "phone": "628999888777", "department": "Ops",
        })
        assert cu.status_code == 200, cu.text
        uid = cu.json()["id"]

        # Create task as admin with the new user as pic
        ct = admin_client.post(f"{API}/tasks", json={
            "title": "TEST_iter5_propagate",
            "priority": "Medium",
            "pic": {"user_id": uid, "name": "IterFive User",
                    "department": "Ops", "phone": "628999888777", "email": email},
            "items": [{"title": "step", "done": False}],
        })
        assert ct.status_code == 200, ct.text
        tid = ct.json()["id"]

        # Login as new user
        lr = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=15)
        assert lr.status_code == 200, lr.text
        utok = lr.json()["token"]
        uh = {"Authorization": f"Bearer {utok}", "Content-Type": "application/json"}

        # PUT profile -> update name/phone
        new_name = "IterFive Renamed"
        new_phone = "628111000222"
        pr = requests.put(f"{API}/profile", json={"name": new_name, "phone": new_phone}, headers=uh)
        assert pr.status_code == 200, pr.text
        assert pr.json()["name"] == new_name
        assert pr.json()["phone"] == new_phone

        # Admin fetches task -> pic must reflect propagation
        gt = admin_client.get(f"{API}/tasks/{tid}")
        assert gt.status_code == 200
        pic = gt.json()["pic"]
        assert pic["name"] == new_name, f"pic.name should propagate, got {pic}"
        assert pic["phone"] == new_phone, f"pic.phone should propagate, got {pic}"

        # Email uniqueness: try change new user's email to admin's -> 400
        conflict = requests.put(f"{API}/profile", json={"email": ADMIN_EMAIL}, headers=uh)
        assert conflict.status_code == 400

        # Password change wrong current
        bad = requests.put(f"{API}/profile/password",
                           json={"current_password": "wrongpass", "new_password": "newpw123"},
                           headers=uh)
        assert bad.status_code == 400

        # Correct current
        good = requests.put(f"{API}/profile/password",
                            json={"current_password": pw, "new_password": "newpw123"},
                            headers=uh)
        assert good.status_code == 200

        # Verify new password works
        relogin = requests.post(f"{API}/auth/login", json={"email": email, "password": "newpw123"}, timeout=15)
        assert relogin.status_code == 200

        # Cleanup
        admin_client.delete(f"{API}/tasks/{tid}")
        admin_client.delete(f"{API}/users/{uid}")


# ---------- Users pagination + import + permissions ----------
class TestUsersPermissions:
    def test_paginated_envelope(self, admin_client):
        r = admin_client.get(f"{API}/users?page=1&page_size=15")
        assert r.status_code == 200
        data = r.json()
        for key in ("items", "total", "page", "page_size"):
            assert key in data
        assert data["page"] == 1
        assert data["page_size"] == 15
        assert isinstance(data["items"], list)

    def test_all_true_returns_all(self, admin_client):
        r = admin_client.get(f"{API}/users?all=true")
        assert r.status_code == 200
        assert isinstance(r.json()["items"], list)

    def test_permissions(self, admin_client):
        r = admin_client.get(f"{API}/permissions")
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list) and len(arr) == 12
        assert all("key" in p and "label" in p for p in arr)

    def test_csv_import_upsert(self, admin_client, admin_token):
        stamp = int(time.time())
        e1 = f"iter5imp1_{stamp}@example.com"
        e2 = f"iter5imp2_{stamp}@example.com"
        csv_body = (
            "name,email,role,phone,department\n"
            f"Iter5 Imp1,{e1},member,628111,Eng\n"
            f"Iter5 Imp2,{e2},member,628222,Ops\n"
        )
        headers = {"Authorization": f"Bearer {admin_token}"}
        files = {"file": ("users.csv", io.BytesIO(csv_body.encode()), "text/csv")}
        r = requests.post(f"{API}/users/import", files=files, headers=headers)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["created"] == 2 and j["updated"] == 0

        # Re-import same file -> created=0 updated=2
        files2 = {"file": ("users.csv", io.BytesIO(csv_body.encode()), "text/csv")}
        r2 = requests.post(f"{API}/users/import", files=files2, headers=headers)
        assert r2.status_code == 200
        j2 = r2.json()
        assert j2["created"] == 0 and j2["updated"] == 2

        # Cleanup
        listing = admin_client.get(f"{API}/users?all=true").json()["items"]
        for u in listing:
            if u["email"] in (e1, e2):
                admin_client.delete(f"{API}/users/{u['id']}")


# ---------- Roles ----------
class TestRoles:
    def test_default_roles_seeded(self, admin_client):
        r = admin_client.get(f"{API}/roles")
        assert r.status_code == 200
        names = {x["name"] for x in r.json()}
        assert {"admin", "manager", "member"}.issubset(names)

    def test_create_update_delete_custom_role(self, admin_client):
        rname = f"iter5role_{int(time.time())}"
        c = admin_client.post(f"{API}/roles", json={"name": rname, "label": "Iter5", "permissions": ["task", "reminder"]})
        assert c.status_code == 200
        rid = c.json()["id"]

        u = admin_client.put(f"{API}/roles/{rid}", json={"name": rname, "label": "Iter5 v2", "permissions": ["task"]})
        assert u.status_code == 200 and u.json()["label"] == "Iter5 v2"

        d = admin_client.delete(f"{API}/roles/{rid}")
        assert d.status_code == 200

    def test_cannot_delete_core_role(self, admin_client):
        roles = admin_client.get(f"{API}/roles").json()
        admin_role = next(r for r in roles if r["name"] == "admin")
        d = admin_client.delete(f"{API}/roles/{admin_role['id']}")
        assert d.status_code == 400


# ---------- Reminders (broadcast + channels + envelope + own-only) ----------
class TestReminders:
    def test_create_with_broadcast_channels(self, admin_client):
        r = admin_client.post(f"{API}/reminders", json={
            "title": "TEST_iter5_broadcast",
            "remind_type": "custom",
            "date": "2026-06-01",
            "time": "10:30",
            "broadcast": True,
            "channels": ["email", "telegram"],
        })
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["remind_at"] == "2026-06-01T10:30:00"
        assert j["broadcast"] is True
        assert set(j["channels"]) == {"email", "telegram"}
        TestReminders.rid = j["id"]

    def test_list_envelope_and_own_only(self, admin_client):
        r = admin_client.get(f"{API}/reminders?status=active")
        assert r.status_code == 200
        data = r.json()
        for k in ("items", "total", "page", "page_size"):
            assert k in data
        # Every returned reminder must belong to admin
        me = admin_client.get(f"{API}/auth/me").json()
        for it in data["items"]:
            assert it["created_by"] == me["id"]

    def test_other_user_cannot_touch(self, admin_client, admin_token):
        # Create a temp user & attempt to update admin's reminder -> 404
        stamp = int(time.time())
        email = f"iter5rem_{stamp}@example.com"
        pw = "member12345"
        cu = admin_client.post(f"{API}/users", json={
            "name": "RemUser", "email": email, "password": pw, "role": "member"
        })
        uid = cu.json()["id"]
        tok = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}).json()["token"]
        h = {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}

        upd = requests.put(f"{API}/reminders/{TestReminders.rid}", json={"done": True}, headers=h)
        assert upd.status_code == 404
        dr = requests.delete(f"{API}/reminders/{TestReminders.rid}", headers=h)
        assert dr.status_code == 404

        admin_client.delete(f"{API}/users/{uid}")

    def test_cleanup_reminder(self, admin_client):
        admin_client.delete(f"{API}/reminders/{TestReminders.rid}")


# ---------- Settings ----------
class TestSettings:
    def test_public_no_auth(self):
        r = requests.get(f"{API}/settings/public", timeout=10)
        assert r.status_code == 200
        j = r.json()
        for k in ("app_name", "primary_color", "favicon", "logo", "thumbnail", "meta_description"):
            assert k in j

    def test_settings_full(self, admin_client):
        r = admin_client.get(f"{API}/settings")
        assert r.status_code == 200
        j = r.json()
        for section in ("general", "email", "telegram", "notification", "storage"):
            assert section in j
        for k in ("favicon", "logo", "thumbnail", "meta_description", "app_url", "primary_color"):
            assert k in j["general"]
        for k in ("endpoint", "bucket", "access_key", "secret_key", "region", "path"):
            assert k in j["storage"]

    def test_put_settings(self, admin_client):
        r = admin_client.put(f"{API}/settings", json={"general": {"company": "TEST_iter5_co"}})
        assert r.status_code == 200
        assert r.json()["general"]["company"] == "TEST_iter5_co"
        # revert
        admin_client.put(f"{API}/settings", json={"general": {"company": ""}})

    def test_test_notification(self, admin_client):
        for ch in ("email", "telegram"):
            r = admin_client.post(f"{API}/settings/test-notification", json={"channel": ch})
            assert r.status_code == 200


# ---------- Database ----------
class TestDatabase:
    def test_nav_badges(self, admin_client):
        r = admin_client.get(f"{API}/nav-badges")
        assert r.status_code == 200
        j = r.json()
        assert "calendar_month_tasks" in j and "my_tasks" in j
        assert isinstance(j["calendar_month_tasks"], int)

    def test_storage_test_empty(self, admin_client):
        r = admin_client.post(f"{API}/database/storage/test", json={})
        assert r.status_code == 200
        assert r.json().get("ok") is False

    def test_backup_lifecycle(self, admin_client):
        # Create local backup
        c = admin_client.post(f"{API}/database/backup?destination=local")
        assert c.status_code == 200, c.text
        j = c.json()
        assert j.get("id") and j.get("filename") and j.get("total_records") is not None
        bid = j["id"]

        # List
        lst = admin_client.get(f"{API}/database/backups")
        assert lst.status_code == 200
        assert any(b["id"] == bid for b in lst.json())

        # Inspect
        ins = admin_client.get(f"{API}/database/backups/{bid}/inspect")
        assert ins.status_code == 200
        ij = ins.json()
        assert ij["valid"] is True and ij["total_records"] >= 0 and isinstance(ij["collections"], dict)

        # Download
        dl = admin_client.get(f"{API}/database/backups/{bid}/download")
        assert dl.status_code == 200
        # Must be gzip payload
        raw = dl.content
        data = json.loads(gzip.decompress(raw).decode("utf-8"))
        assert "collections" in data

        # Delete
        rm = admin_client.delete(f"{API}/database/backups/{bid}")
        assert rm.status_code == 200


# ---------- Activity logs pagination ----------
class TestActivityLogs:
    def test_paginated_envelope_and_filters(self, admin_client):
        r = admin_client.get(f"{API}/activity-logs?page=1&page_size=25")
        assert r.status_code == 200
        j = r.json()
        for k in ("items", "total", "page", "page_size"):
            assert k in j
        assert j["page"] == 1 and j["page_size"] == 25
        # filter by entity_type
        r2 = admin_client.get(f"{API}/activity-logs?entity_type=user&page=1&page_size=10")
        assert r2.status_code == 200
        for it in r2.json()["items"]:
            assert it["entity_type"] == "user"
