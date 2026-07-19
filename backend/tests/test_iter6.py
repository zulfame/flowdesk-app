"""
Iteration 6 backend tests — reminder broadcast timing, archive (soft-delete/restore/purge),
meeting->task convert validation, web push, database backup+restore-upload,
settings.backup section.
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


# ------------- Reminders broadcast_at timing -------------
class TestReminderBroadcastTiming:
    def test_offset_10m(self, admin_client):
        r = admin_client.post(f"{API}/reminders", json={
            "title": "TEST_iter6_bcast_10m",
            "remind_type": "custom",
            "date": "2027-01-15", "time": "12:00",
            "broadcast": True, "channels": ["email"],
            "broadcast_offset": "10m",
        })
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["remind_at"] == "2027-01-15T12:00:00"
        # 10 minutes before 12:00 -> 11:50:00
        assert j["broadcast_at"].startswith("2027-01-15T11:50:00")
        admin_client.delete(f"{API}/reminders/{j['id']}")

    def test_offset_1h(self, admin_client):
        r = admin_client.post(f"{API}/reminders", json={
            "title": "TEST_iter6_bcast_1h",
            "remind_type": "custom",
            "date": "2027-01-15", "time": "12:00",
            "broadcast": True, "channels": ["telegram"],
            "broadcast_offset": "1h",
        })
        assert r.status_code == 200
        j = r.json()
        assert j["broadcast_at"].startswith("2027-01-15T11:00:00")
        admin_client.delete(f"{API}/reminders/{j['id']}")

    def test_offset_1d(self, admin_client):
        r = admin_client.post(f"{API}/reminders", json={
            "title": "TEST_iter6_bcast_1d",
            "remind_type": "custom",
            "date": "2027-01-15", "time": "12:00",
            "broadcast": True, "channels": ["email"],
            "broadcast_offset": "1d",
        })
        assert r.status_code == 200
        j = r.json()
        assert j["broadcast_at"].startswith("2027-01-14T12:00:00")
        admin_client.delete(f"{API}/reminders/{j['id']}")

    def test_offset_custom(self, admin_client):
        r = admin_client.post(f"{API}/reminders", json={
            "title": "TEST_iter6_bcast_custom",
            "remind_type": "custom",
            "date": "2027-01-15", "time": "12:00",
            "broadcast": True, "channels": ["email"],
            "broadcast_offset": "custom",
            "broadcast_at": "2027-01-10T08:30:00",
        })
        assert r.status_code == 200
        j = r.json()
        assert j["remind_at"] == "2027-01-15T12:00:00"
        assert j["broadcast_at"] == "2027-01-10T08:30:00"
        admin_client.delete(f"{API}/reminders/{j['id']}")

    def test_list_envelope_own_only(self, admin_client):
        r = admin_client.get(f"{API}/reminders")
        assert r.status_code == 200
        data = r.json()
        for k in ("items", "total", "page", "page_size"):
            assert k in data


# ------------- Archive (soft delete -> restore -> purge) -------------
class TestArchive:
    def test_task_soft_delete_restore(self, admin_client):
        # create task
        ct = admin_client.post(f"{API}/tasks", json={
            "title": "TEST_iter6_archive_task",
            "priority": "Low",
            "pic": {"user_id": None, "name": "-", "department": "", "phone": "", "email": ""},
            "items": [{"title": "a", "done": False}],
        })
        assert ct.status_code == 200, ct.text
        tid = ct.json()["id"]

        # DELETE -> soft delete
        d = admin_client.delete(f"{API}/tasks/{tid}")
        assert d.status_code == 200

        # Should not appear in normal task listing
        listing = admin_client.get(f"{API}/tasks").json()
        items = listing["items"] if isinstance(listing, dict) and "items" in listing else listing
        assert not any(t["id"] == tid for t in items)

        # Should appear in archive
        arch = admin_client.get(f"{API}/archive?type=task&page=1&page_size=200")
        assert arch.status_code == 200
        aj = arch.json()
        for k in ("items", "total", "page", "page_size"):
            assert k in aj
        assert any(x["id"] == tid and x["type"] == "task" for x in aj["items"]), \
            f"task {tid} not in archive; got {[x['id'] for x in aj['items'][:5]]}"

        # Restore
        rr = admin_client.post(f"{API}/archive/task/{tid}/restore")
        assert rr.status_code == 200

        # Should be back in normal list
        listing2 = admin_client.get(f"{API}/tasks").json()
        items2 = listing2["items"] if isinstance(listing2, dict) and "items" in listing2 else listing2
        assert any(t["id"] == tid for t in items2)

        # Cleanup: delete again + purge
        admin_client.delete(f"{API}/tasks/{tid}")
        purge = admin_client.delete(f"{API}/archive/task/{tid}")
        assert purge.status_code == 200

        # Purged not in archive
        arch2 = admin_client.get(f"{API}/archive?type=task&page=1&page_size=200").json()
        assert not any(x["id"] == tid for x in arch2["items"])

    def test_note_soft_delete_restore_cycle(self, admin_client):
        cn = admin_client.post(f"{API}/notes", json={"title": "TEST_iter6_archive_note", "content": "body"})
        assert cn.status_code == 200, cn.text
        nid = cn.json()["id"]

        admin_client.delete(f"{API}/notes/{nid}")

        arch = admin_client.get(f"{API}/archive?type=note&page=1&page_size=200").json()
        assert any(x["id"] == nid for x in arch["items"])

        admin_client.post(f"{API}/archive/note/{nid}/restore")

        notes = admin_client.get(f"{API}/notes").json()
        items = notes["items"] if isinstance(notes, dict) and "items" in notes else notes
        assert any(n["id"] == nid for n in items)

        # cleanup
        admin_client.delete(f"{API}/notes/{nid}")
        admin_client.delete(f"{API}/archive/note/{nid}")

    def test_archive_type_all(self, admin_client):
        r = admin_client.get(f"{API}/archive?type=all&page=1&page_size=5")
        assert r.status_code == 200
        for k in ("items", "total", "page", "page_size"):
            assert k in r.json()


# ------------- Meeting -> Task convert validation -------------
class TestMeetingConvert:
    def test_convert_flow_and_validation(self, admin_client):
        # Create throwaway meeting
        cm = admin_client.post(f"{API}/meetings", json={
            "title": "TEST_iter6_convert_meeting",
            "date": "2026-06-01", "start_time": "09:00", "end_time": "10:00",
            "meeting_type": "Internal",
            "participants": ["Admin"],
            "action_items": [{"text": "Follow up A"}, {"text": "Follow up B"}, {"text": "Follow up C"}],
        })
        assert cm.status_code == 200, cm.text
        m = cm.json()
        mid = m["id"]
        items = m["action_items"]
        assert len(items) == 3
        ai_a, ai_b, ai_c = items[0]["id"], items[1]["id"], items[2]["id"]

        # 1) Missing PIC.name -> 400
        r1 = admin_client.post(
            f"{API}/meetings/{mid}/action-items/{ai_a}/convert",
            json={"pic": {"user_id": None, "name": ""}, "deadline": "2026-09-01", "priority": "High"},
        )
        assert r1.status_code == 400
        assert "PIC" in r1.json().get("detail", "")

        # 2) Missing deadline -> 400
        r2 = admin_client.post(
            f"{API}/meetings/{mid}/action-items/{ai_a}/convert",
            json={"pic": {"name": "Admin"}, "priority": "Medium"},
        )
        assert r2.status_code == 400
        assert "Tenggat" in r2.json().get("detail", "")

        # 3) Valid convert
        r3 = admin_client.post(
            f"{API}/meetings/{mid}/action-items/{ai_a}/convert",
            json={"pic": {"user_id": None, "name": "Admin", "email": "admin@flowdesk.com"},
                  "deadline": "2026-09-01", "priority": "High", "title": "Do follow up A"},
        )
        assert r3.status_code == 200, r3.text
        task = r3.json()
        assert task["meeting_id"] == mid
        assert task["meeting_title"] == "TEST_iter6_convert_meeting"

        # 4) Already-converted -> 400
        r4 = admin_client.post(
            f"{API}/meetings/{mid}/action-items/{ai_a}/convert",
            json={"pic": {"name": "Admin"}, "deadline": "2026-09-02"},
        )
        assert r4.status_code == 400

        # 5) Verify action_items.$.converted_task_id set
        m2 = admin_client.get(f"{API}/meetings/{mid}").json()
        found = next(i for i in m2["action_items"] if i["id"] == ai_a)
        assert found.get("converted_task_id") == task["id"]

        # Cleanup: delete task and meeting
        admin_client.delete(f"{API}/tasks/{task['id']}")
        admin_client.delete(f"{API}/meetings/{mid}")
        # Purge from archive
        admin_client.delete(f"{API}/archive/task/{task['id']}")
        admin_client.delete(f"{API}/archive/meeting/{mid}")


# ------------- Web Push -------------
class TestPush:
    def test_public_key(self, admin_client):
        r = admin_client.get(f"{API}/push/public-key")
        assert r.status_code == 200
        j = r.json()
        assert isinstance(j.get("public_key"), str) and len(j["public_key"]) > 0

    def test_subscribe_unsubscribe(self, admin_client):
        sub = {"endpoint": "https://example.com/testendpoint-iter6",
               "keys": {"p256dh": "x", "auth": "y"}}
        r1 = admin_client.post(f"{API}/push/subscribe", json={"subscription": sub})
        assert r1.status_code == 200
        r2 = admin_client.post(f"{API}/push/unsubscribe", json={"subscription": sub})
        assert r2.status_code == 200


# ------------- Database backup + restore-upload + settings.backup -------------
class TestDatabaseBackupRestore:
    def test_settings_has_backup_section(self, admin_client):
        r = admin_client.get(f"{API}/settings")
        assert r.status_code == 200
        j = r.json()
        assert "backup" in j
        for k in ("auto_enabled", "frequency", "time", "weekday", "destination"):
            assert k in j["backup"]

    def test_put_settings_backup(self, admin_client):
        # capture current
        cur = admin_client.get(f"{API}/settings").json().get("backup", {})
        payload = {"backup": {"auto_enabled": False, "frequency": "weekly",
                              "time": "03:15", "weekday": 3, "destination": "local"}}
        r = admin_client.put(f"{API}/settings", json=payload)
        assert r.status_code == 200
        b = r.json()["backup"]
        assert b["frequency"] == "weekly" and b["time"] == "03:15" and b["weekday"] == 3
        # revert to previous
        admin_client.put(f"{API}/settings", json={"backup": cur})

    def test_backup_download_restore_upload(self, admin_client, admin_token):
        # Create a local backup
        c = admin_client.post(f"{API}/database/backup?destination=local")
        assert c.status_code == 200, c.text
        bid = c.json()["id"]

        # Download
        dl = admin_client.get(f"{API}/database/backups/{bid}/download")
        assert dl.status_code == 200
        raw = dl.content
        # Sanity: should decompress
        data = json.loads(gzip.decompress(raw).decode("utf-8"))
        assert "collections" in data

        # Restore via upload (idempotent — same data reinserted)
        files = {"file": ("bck.json.gz", io.BytesIO(raw), "application/gzip")}
        headers = {"Authorization": f"Bearer {admin_token}"}
        r = requests.post(f"{API}/database/restore-upload", files=files, headers=headers)
        assert r.status_code == 200, r.text
        j = r.json()
        assert isinstance(j.get("restored"), dict)
        # Sanity: at least users collection restored count>0
        assert j["restored"].get("users", 0) > 0

        # Cleanup backup
        admin_client.delete(f"{API}/database/backups/{bid}")

    def test_restore_upload_bad_file(self, admin_client, admin_token):
        headers = {"Authorization": f"Bearer {admin_token}"}
        files = {"file": ("bad.json.gz", io.BytesIO(b"not a gzip"), "application/gzip")}
        r = requests.post(f"{API}/database/restore-upload", files=files, headers=headers)
        assert r.status_code == 400
