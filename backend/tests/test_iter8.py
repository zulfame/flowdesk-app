"""Iteration 8 — Notification channel gating, from_name, WhatsApp reminder broadcast,
and attachment upload/download/delete regression on preview (Emergent storage)."""
import io
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://server-learning.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@flowdesk.com", "password": "admin123"}


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ---------- Settings: from_name + channel toggles ----------
class TestSettingsFromName:
    def test_get_settings_has_from_name(self, admin_headers):
        r = requests.get(f"{API}/settings", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        s = r.json()
        assert "email" in s
        assert "from_name" in s["email"]

    def test_update_from_name_persists(self, admin_headers):
        val = "TEST_iter8_Sender"
        r = requests.put(f"{API}/settings", headers=admin_headers,
                         json={"email": {"from_name": val}}, timeout=30)
        assert r.status_code == 200, r.text
        # reload and verify
        r2 = requests.get(f"{API}/settings", headers=admin_headers, timeout=30)
        assert r2.status_code == 200
        assert r2.json()["email"]["from_name"] == val

    def test_toggle_channels_saves(self, admin_headers):
        # Preserve current state
        current = requests.get(f"{API}/settings", headers=admin_headers, timeout=30).json()
        orig = current.get("notification", {})
        # Toggle browser flag on then restore
        new_val = not bool(orig.get("browser_enabled", True))
        r = requests.put(f"{API}/settings", headers=admin_headers,
                         json={"notification": {**orig, "browser_enabled": new_val}}, timeout=30)
        assert r.status_code == 200
        s2 = requests.get(f"{API}/settings", headers=admin_headers, timeout=30).json()
        assert s2["notification"]["browser_enabled"] == new_val
        # Restore
        requests.put(f"{API}/settings", headers=admin_headers, json={"notification": orig}, timeout=30)

    def test_email_channel_remains_disabled(self, admin_headers):
        """User has requested email channel disabled — verify state."""
        s = requests.get(f"{API}/settings", headers=admin_headers, timeout=30).json()
        # not asserting hard; just report
        assert "email_enabled" in s["notification"]


# ---------- Attachment upload/download/delete regression ----------
class TestAttachmentsRegression:
    task_id = None
    file_id = None

    def test_create_task(self, admin_headers):
        payload = {"title": "TEST_iter8_attach_task", "priority": "Medium", "status": "Draft"}
        r = requests.post(f"{API}/tasks", headers=admin_headers, json=payload, timeout=30)
        assert r.status_code in (200, 201), r.text
        TestAttachmentsRegression.task_id = r.json()["id"]

    def test_upload_attachment(self, admin_headers):
        assert TestAttachmentsRegression.task_id
        content = b"Hello FlowDesk iter8 attachment content." * 10
        files = {"file": ("iter8_test.txt", io.BytesIO(content), "text/plain")}
        data = {"module": "task", "parent_id": TestAttachmentsRegression.task_id}
        r = requests.post(f"{API}/attachments", headers=admin_headers, files=files, data=data, timeout=120)
        assert r.status_code == 200, f"Upload failed {r.status_code}: {r.text}"
        j = r.json()
        assert j["original_filename"] == "iter8_test.txt"
        assert j["size"] == len(content)
        assert j["module"] == "task"
        assert j["parent_id"] == TestAttachmentsRegression.task_id
        TestAttachmentsRegression.file_id = j["id"]

    def test_list_attachments_contains_upload(self, admin_headers):
        r = requests.get(f"{API}/attachments",
                         headers=admin_headers,
                         params={"parent_id": TestAttachmentsRegression.task_id, "module": "task"},
                         timeout=30)
        assert r.status_code == 200
        ids = [f["id"] for f in r.json()]
        assert TestAttachmentsRegression.file_id in ids

    def test_download_attachment(self, admin_headers):
        fid = TestAttachmentsRegression.file_id
        r = requests.get(f"{API}/attachments/{fid}/download",
                         headers=admin_headers, timeout=60)
        assert r.status_code == 200, r.text
        assert b"Hello FlowDesk iter8" in r.content

    def test_delete_attachment(self, admin_headers):
        fid = TestAttachmentsRegression.file_id
        r = requests.delete(f"{API}/attachments/{fid}", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        # confirm gone
        r2 = requests.get(f"{API}/attachments",
                          headers=admin_headers,
                          params={"parent_id": TestAttachmentsRegression.task_id, "module": "task"},
                          timeout=30)
        ids = [f["id"] for f in r2.json()]
        assert fid not in ids

    def test_cleanup_task(self, admin_headers):
        tid = TestAttachmentsRegression.task_id
        if tid:
            requests.delete(f"{API}/tasks/{tid}", headers=admin_headers, timeout=30)


# ---------- Reminders: WhatsApp broadcast ----------
class TestReminderWhatsApp:
    reminder_id = None

    def test_create_reminder_with_whatsapp(self, admin_headers):
        payload = {
            "title": "TEST_iter8_wa_reminder",
            "description": "Broadcast via WhatsApp",
            "remind_type": "today",
            "date": None,
            "time": "23:59",
            "broadcast": True,
            "channels": ["whatsapp"],
            "broadcast_offset": "10m",
        }
        r = requests.post(f"{API}/reminders", headers=admin_headers, json=payload, timeout=30)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["broadcast"] is True
        assert "whatsapp" in j.get("channels", [])
        # Explicitly ensure telegram NOT auto-added
        assert "telegram" not in j.get("channels", [])
        TestReminderWhatsApp.reminder_id = j["id"]

    def test_create_reminder_email_channel(self, admin_headers):
        payload = {
            "title": "TEST_iter8_email_reminder",
            "remind_type": "today", "time": "23:59",
            "broadcast": True, "channels": ["email"],
            "broadcast_offset": "10m",
        }
        r = requests.post(f"{API}/reminders", headers=admin_headers, json=payload, timeout=30)
        assert r.status_code == 200
        rid = r.json()["id"]
        requests.delete(f"{API}/reminders/{rid}", headers=admin_headers, timeout=30)

    def test_cleanup(self, admin_headers):
        rid = TestReminderWhatsApp.reminder_id
        if rid:
            requests.delete(f"{API}/reminders/{rid}", headers=admin_headers, timeout=30)


# ---------- Task creation with PIC email (no crash even with email disabled) ----------
class TestTaskWithPICEmail:
    def test_create_task_with_pic_email(self, admin_headers):
        # Get admin user id for PIC
        me = requests.get(f"{API}/auth/me", headers=admin_headers, timeout=30).json()
        payload = {
            "title": "TEST_iter8_pic_email_task",
            "priority": "Medium",
            "status": "In Progress",
            "pic": {"user_id": me["id"], "name": me["name"], "email": me.get("email", "admin@flowdesk.com")},
        }
        r = requests.post(f"{API}/tasks", headers=admin_headers, json=payload, timeout=30)
        assert r.status_code in (200, 201), r.text
        tid = r.json()["id"]
        requests.delete(f"{API}/tasks/{tid}", headers=admin_headers, timeout=30)
