"""
FlowDesk backend integration tests.
Covers: auth, tasks (auto progress/status), meetings + action-item convert,
calendar, reminders, notes, notifications, activity log, attachments, users,
roles, settings, global search.
"""
import io
import os
import time
from datetime import datetime, timezone, timedelta

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback to /app/frontend/.env
    from pathlib import Path
    for line in Path("/app/frontend/.env").read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
            break

API = f"{BASE_URL}/api"
ADMIN_EMAIL = "admin@flowdesk.com"
ADMIN_PASSWORD = "admin123"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and "user" in data
    assert data["user"]["email"] == ADMIN_EMAIL
    assert data["user"]["role"] == "admin"
    return data["token"]


@pytest.fixture(scope="session")
def admin_client(admin_token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"})
    return s


# ---------- Auth ----------
class TestAuth:
    def test_me(self, admin_client):
        r = admin_client.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_invalid_login(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=10)
        assert r.status_code == 401

    def test_missing_token(self):
        r = requests.get(f"{API}/auth/me", timeout=10)
        assert r.status_code in (401, 403)


# ---------- Tasks ----------
class TestTasks:
    def test_create_with_checklist_progress_and_status(self, admin_client):
        payload = {
            "title": "TEST_task_progress",
            "priority": "High",
            "checklist": [
                {"text": "a", "done": True},
                {"text": "b", "done": True},
                {"text": "c", "done": False},
                {"text": "d", "done": False},
            ],
        }
        r = admin_client.post(f"{API}/tasks", json=payload)
        assert r.status_code == 200, r.text
        t = r.json()
        assert t["progress"] == 50
        assert t["status"] == "On Progress"
        assert all(item.get("id") for item in t["checklist"])
        TestTasks.task_id = t["id"]

    def test_get_task(self, admin_client):
        r = admin_client.get(f"{API}/tasks/{TestTasks.task_id}")
        assert r.status_code == 200
        assert r.json()["progress"] == 50

    def test_update_checklist_completes(self, admin_client):
        r = admin_client.get(f"{API}/tasks/{TestTasks.task_id}")
        cl = r.json()["checklist"]
        for c in cl:
            c["done"] = True
        r = admin_client.put(f"{API}/tasks/{TestTasks.task_id}", json={"checklist": cl})
        assert r.status_code == 200
        assert r.json()["progress"] == 100
        assert r.json()["status"] == "Completed"

    def test_overdue_status(self, admin_client):
        past = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
        r = admin_client.post(f"{API}/tasks", json={
            "title": "TEST_overdue", "deadline": past,
            "checklist": [{"text": "x", "done": False}]
        })
        assert r.status_code == 200
        assert r.json()["status"] == "Overdue"
        # cleanup
        admin_client.delete(f"{API}/tasks/{r.json()['id']}")

    def test_add_comment(self, admin_client):
        r = admin_client.post(f"{API}/tasks/{TestTasks.task_id}/comments", json={"text": "hello"})
        assert r.status_code == 200
        assert r.json()["text"] == "hello"

    def test_delete_task(self, admin_client):
        r = admin_client.delete(f"{API}/tasks/{TestTasks.task_id}")
        assert r.status_code == 200
        r = admin_client.get(f"{API}/tasks/{TestTasks.task_id}")
        assert r.status_code == 404


# ---------- Meetings + convert ----------
class TestMeetings:
    def test_create_meeting_with_action_items(self, admin_client):
        payload = {
            "title": "TEST_meeting",
            "date": datetime.now(timezone.utc).date().isoformat(),
            "start_time": "10:00",
            "end_time": "11:00",
            "action_items": [
                {"text": "Follow up A", "assignee": "Alice"},
                {"text": "Follow up B", "assignee": "Bob"},
            ],
        }
        r = admin_client.post(f"{API}/meetings", json=payload)
        assert r.status_code == 200, r.text
        m = r.json()
        assert len(m["action_items"]) == 2
        assert all(ai.get("id") for ai in m["action_items"])
        TestMeetings.meeting_id = m["id"]
        TestMeetings.item_id = m["action_items"][0]["id"]

    def test_get_meeting_has_generated_tasks_list(self, admin_client):
        r = admin_client.get(f"{API}/meetings/{TestMeetings.meeting_id}")
        assert r.status_code == 200
        data = r.json()
        assert "generated_tasks" in data
        assert "attachments" in data

    def test_convert_action_item(self, admin_client):
        r = admin_client.post(f"{API}/meetings/{TestMeetings.meeting_id}/action-items/{TestMeetings.item_id}/convert")
        assert r.status_code == 200, r.text
        task = r.json()
        assert task["meeting_id"] == TestMeetings.meeting_id
        assert task["title"] == "Follow up A"
        TestMeetings.task_id = task["id"]

    def test_meeting_shows_generated_task(self, admin_client):
        r = admin_client.get(f"{API}/meetings/{TestMeetings.meeting_id}")
        gen = r.json()["generated_tasks"]
        assert any(t["id"] == TestMeetings.task_id for t in gen)
        ai = next(a for a in r.json()["action_items"] if a["id"] == TestMeetings.item_id)
        assert ai["converted_task_id"] == TestMeetings.task_id

    def test_convert_again_400(self, admin_client):
        r = admin_client.post(f"{API}/meetings/{TestMeetings.meeting_id}/action-items/{TestMeetings.item_id}/convert")
        assert r.status_code == 400

    def test_cleanup_meeting(self, admin_client):
        admin_client.delete(f"{API}/tasks/{TestMeetings.task_id}")
        r = admin_client.delete(f"{API}/meetings/{TestMeetings.meeting_id}")
        assert r.status_code == 200


# ---------- Calendar ----------
class TestCalendar:
    def test_calendar_returns_list(self, admin_client):
        r = admin_client.get(f"{API}/calendar")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        # Every event has required fields
        for e in data:
            assert "type" in e and "date" in e and "title" in e
            assert e["type"] in ("meeting", "task", "reminder", "event")


# ---------- Reminders ----------
class TestReminders:
    def test_reminder_flow(self, admin_client):
        for rtype in ("today", "tomorrow", "custom", "recurring"):
            r = admin_client.post(f"{API}/reminders", json={
                "title": f"TEST_rem_{rtype}", "remind_type": rtype,
                "date": datetime.now(timezone.utc).isoformat(),
                "recurrence": "daily" if rtype == "recurring" else None,
            })
            assert r.status_code == 200, r.text
            rid = r.json()["id"]
            # toggle done
            u = admin_client.put(f"{API}/reminders/{rid}", json={"done": True})
            assert u.status_code == 200 and u.json()["done"] is True
            # delete
            d = admin_client.delete(f"{API}/reminders/{rid}")
            assert d.status_code == 200


# ---------- Notes ----------
class TestNotes:
    def test_note_flow(self, admin_client):
        r = admin_client.post(f"{API}/notes", json={
            "title": "TEST_note", "content": "<p>hi</p>", "tags": ["a", "b"],
            "color": "yellow", "pinned": True,
        })
        assert r.status_code == 200
        nid = r.json()["id"]
        u = admin_client.put(f"{API}/notes/{nid}", json={"content": "<p>edited</p>"})
        assert u.status_code == 200 and u.json()["content"] == "<p>edited</p>"
        d = admin_client.delete(f"{API}/notes/{nid}")
        assert d.status_code == 200


# ---------- Notifications ----------
class TestNotifications:
    def test_list_and_mark(self, admin_client):
        r = admin_client.get(f"{API}/notifications")
        assert r.status_code == 200
        data = r.json()
        assert "items" in data and "unread" in data
        if data["items"]:
            nid = data["items"][0]["id"]
            r2 = admin_client.put(f"{API}/notifications/{nid}/read")
            assert r2.status_code == 200
        r3 = admin_client.put(f"{API}/notifications/read-all")
        assert r3.status_code == 200


# ---------- Activity log ----------
class TestActivity:
    def test_activity_logs(self, admin_client):
        r = admin_client.get(f"{API}/activity-logs")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_activity_filter(self, admin_client):
        r = admin_client.get(f"{API}/activity-logs?entity_type=task")
        assert r.status_code == 200
        for item in r.json():
            assert item["entity_type"] == "task"


# ---------- Attachments ----------
class TestAttachments:
    def test_upload_list_download_delete(self, admin_token):
        # Create a parent task first
        headers = {"Authorization": f"Bearer {admin_token}"}
        rt = requests.post(f"{API}/tasks", json={"title": "TEST_att_parent"},
                           headers={**headers, "Content-Type": "application/json"})
        assert rt.status_code == 200
        parent_id = rt.json()["id"]

        # upload
        files = {"file": ("hello.txt", io.BytesIO(b"hello world"), "text/plain")}
        data = {"module": "task", "parent_id": parent_id}
        r = requests.post(f"{API}/attachments", data=data, files=files, headers=headers)
        assert r.status_code == 200, r.text
        att = r.json()
        assert att["original_filename"] == "hello.txt"

        # list
        l = requests.get(f"{API}/attachments?parent_id={parent_id}", headers=headers)
        assert l.status_code == 200 and len(l.json()) >= 1

        # download via ?auth
        d = requests.get(f"{API}/attachments/{att['id']}/download?auth={admin_token}")
        assert d.status_code == 200
        assert d.content == b"hello world"

        # delete (soft)
        rm = requests.delete(f"{API}/attachments/{att['id']}", headers=headers)
        assert rm.status_code == 200

        # cleanup task
        requests.delete(f"{API}/tasks/{parent_id}", headers=headers)


# ---------- Users & Roles ----------
class TestUsersRoles:
    def test_list_users(self, admin_client):
        r = admin_client.get(f"{API}/users")
        assert r.status_code == 200
        assert any(u["email"] == ADMIN_EMAIL for u in r.json())

    def test_create_update_delete_user(self, admin_client):
        email = f"test_user_{int(time.time())}@example.com"
        r = admin_client.post(f"{API}/users", json={
            "name": "TEST_User", "email": email, "password": "secret123", "role": "member"
        })
        assert r.status_code == 200, r.text
        uid = r.json()["id"]

        u = admin_client.put(f"{API}/users/{uid}", json={"name": "TEST_User_Updated"})
        assert u.status_code == 200 and u.json()["name"] == "TEST_User_Updated"

        d = admin_client.delete(f"{API}/users/{uid}")
        assert d.status_code == 200

    def test_cannot_delete_self(self, admin_client):
        me = admin_client.get(f"{API}/auth/me").json()
        r = admin_client.delete(f"{API}/users/{me['id']}")
        assert r.status_code == 400

    def test_roles_defaults(self, admin_client):
        r = admin_client.get(f"{API}/roles")
        assert r.status_code == 200
        names = {x["name"] for x in r.json()}
        assert {"admin", "manager", "member"}.issubset(names)


# ---------- Settings ----------
class TestSettings:
    def test_get_settings(self, admin_client):
        r = admin_client.get(f"{API}/settings")
        assert r.status_code == 200
        s = r.json()
        assert "general" in s and "email" in s

    def test_update_settings_admin(self, admin_client):
        r = admin_client.put(f"{API}/settings", json={"general": {"company": "TEST_Co"}})
        assert r.status_code == 200
        assert r.json()["general"]["company"] == "TEST_Co"

    def test_non_admin_masked_and_forbidden(self, admin_client):
        # create a member user
        email = f"member_{int(time.time())}@example.com"
        cu = admin_client.post(f"{API}/users", json={
            "name": "M", "email": email, "password": "secret123", "role": "member"
        })
        assert cu.status_code == 200
        uid = cu.json()["id"]

        tok = requests.post(f"{API}/auth/login", json={"email": email, "password": "secret123"}).json()["token"]
        h = {"Authorization": f"Bearer {tok}"}
        g = requests.get(f"{API}/settings", headers=h)
        assert g.status_code == 200
        assert g.json()["email"]["smtp_password"] == ""
        assert g.json()["telegram"]["bot_token"] == ""

        p = requests.put(f"{API}/settings", json={"general": {"company": "X"}},
                         headers={**h, "Content-Type": "application/json"})
        assert p.status_code == 403

        admin_client.delete(f"{API}/users/{uid}")


# ---------- Global search ----------
class TestSearch:
    def test_search_returns_shape(self, admin_client):
        r = admin_client.get(f"{API}/search?q=a")
        assert r.status_code == 200
        data = r.json()
        for k in ("tasks", "meetings", "reminders", "notes", "attachments"):
            assert k in data and isinstance(data[k], list)
