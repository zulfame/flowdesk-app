"""
FlowDesk backend integration tests (iteration 2).
Covers the reworked Task module: items + per-item docs + auto done_at + progress,
task-level & item-level source-documents with revisi/final responses,
structured requester object + broadcast (wa_url + email_sent),
plus regressions for meetings/convert, calendar, reminders, notes,
notifications, activity, attachments, users, roles, settings, search.
"""
import io
import os
import time
from datetime import datetime, timezone, timedelta

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
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
    assert "token" in data and data["user"]["role"] == "admin"
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


# ---------- Tasks: new items model, requester object, docs, broadcast ----------
class TestTasksItems:
    def test_create_task_with_items_and_requester(self, admin_client):
        payload = {
            "title": "TEST_task_items",
            "priority": "High",
            "requester": {"name": "Budi", "department": "Finance",
                          "phone": "628123456789", "email": "budi@example.com"},
            "items": [{"title": "Step A", "done": False},
                      {"title": "Step B", "done": False}],
            "documents": [{"kind": "url", "url": "https://example.com/spec",
                           "label": "Spec"}],
        }
        r = admin_client.post(f"{API}/tasks", json=payload)
        assert r.status_code == 200, r.text
        t = r.json()
        # requester stored as structured object
        assert isinstance(t["requester"], dict)
        assert t["requester"]["name"] == "Budi"
        assert t["requester"]["email"] == "budi@example.com"
        # items got generated ids
        assert len(t["items"]) == 2
        assert all(it.get("id") for it in t["items"])
        # documents got generated ids
        assert len(t["documents"]) == 1
        assert t["documents"][0].get("id")
        assert t["documents"][0]["kind"] == "url"
        # progress computed from items (0/2)
        assert t["progress"] == 0
        assert t["status"] == "Pending"
        TestTasksItems.task_id = t["id"]
        TestTasksItems.item_ids = [it["id"] for it in t["items"]]
        TestTasksItems.doc_id = t["documents"][0]["id"]

    def test_toggle_item_sets_done_at_and_progress(self, admin_client):
        # mark first item done (no done_at supplied -> backend auto-sets)
        r = admin_client.get(f"{API}/tasks/{TestTasksItems.task_id}")
        items = r.json()["items"]
        items[0]["done"] = True
        items[0]["done_at"] = None  # let backend set
        r = admin_client.put(f"{API}/tasks/{TestTasksItems.task_id}", json={"items": items})
        assert r.status_code == 200
        data = r.json()
        assert data["progress"] == 50
        assert data["status"] == "On Progress"
        first = next(it for it in data["items"] if it["id"] == TestTasksItems.item_ids[0])
        assert first["done"] is True
        assert first["done_at"], "done_at should be auto-set"

    def test_manual_done_at_preserved(self, admin_client):
        r = admin_client.get(f"{API}/tasks/{TestTasksItems.task_id}")
        items = r.json()["items"]
        manual = "2025-01-15T10:00:00+00:00"
        for it in items:
            if it["id"] == TestTasksItems.item_ids[0]:
                it["done"] = True
                it["done_at"] = manual
        r = admin_client.put(f"{API}/tasks/{TestTasksItems.task_id}", json={"items": items})
        assert r.status_code == 200
        first = next(it for it in r.json()["items"] if it["id"] == TestTasksItems.item_ids[0])
        assert first["done_at"] == manual

    def test_uncheck_clears_done_at(self, admin_client):
        r = admin_client.get(f"{API}/tasks/{TestTasksItems.task_id}")
        items = r.json()["items"]
        for it in items:
            it["done"] = False
        r = admin_client.put(f"{API}/tasks/{TestTasksItems.task_id}", json={"items": items})
        assert r.status_code == 200
        data = r.json()
        assert data["progress"] == 0
        assert all(it.get("done_at") in (None, "") for it in data["items"])

    def test_item_documents_and_task_doc_responses(self, admin_client):
        # Add item-level URL document and add response to task-level doc.
        r = admin_client.get(f"{API}/tasks/{TestTasksItems.task_id}")
        task = r.json()
        items = task["items"]
        items[0]["documents"] = [{"kind": "url", "url": "https://example.com/itemdoc",
                                  "label": "Item Doc"}]
        docs = task["documents"]
        docs[0]["responses"] = [
            {"kind": "url", "status": "revisi", "url": "https://example.com/rev1", "label": "Rev1"},
            {"kind": "url", "status": "final", "url": "https://example.com/final", "label": "Final"},
        ]
        r = admin_client.put(f"{API}/tasks/{TestTasksItems.task_id}",
                             json={"items": items, "documents": docs})
        assert r.status_code == 200, r.text
        data = r.json()
        # item doc has id
        item0 = next(it for it in data["items"] if it["id"] == TestTasksItems.item_ids[0])
        assert len(item0["documents"]) == 1
        assert item0["documents"][0].get("id")
        assert item0["documents"][0]["kind"] == "url"
        # task-level doc responses have ids and correct statuses
        doc = next(d for d in data["documents"] if d["id"] == TestTasksItems.doc_id)
        assert len(doc["responses"]) == 2
        assert all(r.get("id") for r in doc["responses"])
        assert {r["status"] for r in doc["responses"]} == {"revisi", "final"}

    def test_broadcast_with_phone_and_email(self, admin_client):
        r = admin_client.post(f"{API}/tasks/{TestTasksItems.task_id}/broadcast",
                              json={"channels": ["email", "whatsapp"]})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["wa_url"] and "wa.me/" in data["wa_url"]
        # URL-encoded message present
        assert "text=" in data["wa_url"]
        # email attempted (SMTP not configured -> best-effort, but endpoint reports True)
        assert data["email_sent"] is True

    def test_broadcast_no_contacts(self, admin_client):
        r = admin_client.post(f"{API}/tasks", json={
            "title": "TEST_task_nocontact",
            "requester": {"name": "NoOne", "department": "", "phone": "", "email": ""},
            "items": [{"title": "x", "done": False}],
        })
        assert r.status_code == 200
        tid = r.json()["id"]
        r2 = admin_client.post(f"{API}/tasks/{tid}/broadcast", json={"channels": ["email", "whatsapp"]})
        assert r2.status_code == 200
        d = r2.json()
        assert d["wa_url"] is None
        assert d["email_sent"] is False
        admin_client.delete(f"{API}/tasks/{tid}")

    def test_overdue_status(self, admin_client):
        past = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
        r = admin_client.post(f"{API}/tasks", json={
            "title": "TEST_overdue", "deadline": past,
            "items": [{"title": "x", "done": False}],
        })
        assert r.status_code == 200
        assert r.json()["status"] == "Overdue"
        admin_client.delete(f"{API}/tasks/{r.json()['id']}")

    def test_delete_cascades_attachments(self, admin_client, admin_token):
        # Create a task and upload attachment linked to it, then delete task,
        # verify attachment row is soft-deleted.
        r = admin_client.post(f"{API}/tasks", json={"title": "TEST_task_delcascade",
                                                    "items": [{"title": "a", "done": False}]})
        tid = r.json()["id"]
        headers = {"Authorization": f"Bearer {admin_token}"}
        files = {"file": ("d.txt", io.BytesIO(b"data"), "text/plain")}
        up = requests.post(f"{API}/attachments",
                           data={"module": "task", "parent_id": tid},
                           files=files, headers=headers)
        assert up.status_code == 200
        att_id = up.json()["id"]

        d = admin_client.delete(f"{API}/tasks/{tid}")
        assert d.status_code == 200

        # attachment listing for that parent should not include this file
        lst = requests.get(f"{API}/attachments?parent_id={tid}", headers=headers).json()
        assert not any(x["id"] == att_id for x in lst), "attachment should be soft-deleted"

    def test_cleanup_main_task(self, admin_client):
        admin_client.delete(f"{API}/tasks/{TestTasksItems.task_id}")


# ---------- Meetings + convert regression ----------
class TestMeetings:
    def test_create_meeting_with_action_items(self, admin_client):
        payload = {
            "title": "TEST_meeting",
            "date": datetime.now(timezone.utc).date().isoformat(),
            "start_time": "10:00", "end_time": "11:00",
            "action_items": [
                {"text": "Follow up A", "assignee": "Alice"},
                {"text": "Follow up B", "assignee": "Bob"},
            ],
        }
        r = admin_client.post(f"{API}/meetings", json=payload)
        assert r.status_code == 200, r.text
        m = r.json()
        assert all(ai.get("id") for ai in m["action_items"])
        TestMeetings.meeting_id = m["id"]
        TestMeetings.item_id = m["action_items"][0]["id"]

    def test_convert_action_item(self, admin_client):
        r = admin_client.post(f"{API}/meetings/{TestMeetings.meeting_id}/action-items/{TestMeetings.item_id}/convert")
        assert r.status_code == 200, r.text
        task = r.json()
        assert task["meeting_id"] == TestMeetings.meeting_id
        TestMeetings.task_id = task["id"]

    def test_convert_again_400(self, admin_client):
        r = admin_client.post(f"{API}/meetings/{TestMeetings.meeting_id}/action-items/{TestMeetings.item_id}/convert")
        assert r.status_code == 400

    def test_cleanup_meeting(self, admin_client):
        admin_client.delete(f"{API}/tasks/{TestMeetings.task_id}")
        r = admin_client.delete(f"{API}/meetings/{TestMeetings.meeting_id}")
        assert r.status_code == 200


# ---------- Calendar ----------
class TestCalendar:
    def test_calendar(self, admin_client):
        r = admin_client.get(f"{API}/calendar")
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---------- Reminders ----------
class TestReminders:
    def test_reminder_flow(self, admin_client):
        r = admin_client.post(f"{API}/reminders", json={
            "title": "TEST_rem", "remind_type": "today",
            "date": datetime.now(timezone.utc).isoformat(),
        })
        assert r.status_code == 200
        rid = r.json()["id"]
        u = admin_client.put(f"{API}/reminders/{rid}", json={"done": True})
        assert u.status_code == 200 and u.json()["done"] is True
        d = admin_client.delete(f"{API}/reminders/{rid}")
        assert d.status_code == 200


# ---------- Notes ----------
class TestNotes:
    def test_note_flow(self, admin_client):
        r = admin_client.post(f"{API}/notes", json={
            "title": "TEST_note", "content": "<p>hi</p>", "tags": ["a"], "color": "yellow", "pinned": True,
        })
        assert r.status_code == 200
        nid = r.json()["id"]
        u = admin_client.put(f"{API}/notes/{nid}", json={"content": "<p>edited</p>"})
        assert u.status_code == 200 and u.json()["content"] == "<p>edited</p>"
        assert admin_client.delete(f"{API}/notes/{nid}").status_code == 200


# ---------- Notifications ----------
class TestNotifications:
    def test_list_and_mark(self, admin_client):
        r = admin_client.get(f"{API}/notifications")
        assert r.status_code == 200
        data = r.json()
        assert "items" in data and "unread" in data
        assert admin_client.put(f"{API}/notifications/read-all").status_code == 200


# ---------- Activity ----------
class TestActivity:
    def test_activity(self, admin_client):
        r = admin_client.get(f"{API}/activity-logs?entity_type=task")
        assert r.status_code == 200
        payload = r.json()
        items = payload["items"] if isinstance(payload, dict) and "items" in payload else payload
        for x in items:
            assert x["entity_type"] == "task"


# ---------- Attachments ----------
class TestAttachments:
    def test_upload_list_download_delete(self, admin_token):
        h = {"Authorization": f"Bearer {admin_token}"}
        rt = requests.post(f"{API}/tasks", json={"title": "TEST_att_parent"},
                           headers={**h, "Content-Type": "application/json"})
        parent_id = rt.json()["id"]
        files = {"file": ("hello.txt", io.BytesIO(b"hello world"), "text/plain")}
        r = requests.post(f"{API}/attachments", data={"module": "task", "parent_id": parent_id},
                          files=files, headers=h)
        assert r.status_code == 200
        att = r.json()
        d = requests.get(f"{API}/attachments/{att['id']}/download?auth={admin_token}")
        assert d.status_code == 200 and d.content == b"hello world"
        assert requests.delete(f"{API}/attachments/{att['id']}", headers=h).status_code == 200
        requests.delete(f"{API}/tasks/{parent_id}", headers=h)


# ---------- Users & Roles ----------
class TestUsersRoles:
    def test_create_update_delete_user_with_department(self, admin_client):
        email = f"test_user_{int(time.time())}@example.com"
        r = admin_client.post(f"{API}/users", json={
            "name": "TEST_User", "email": email, "password": "secret123", "role": "member",
            "phone": "628111222333", "department": "QA"
        })
        assert r.status_code == 200, r.text
        u = r.json()
        assert u["department"] == "QA"
        assert u["phone"] == "628111222333"
        uid = u["id"]
        # verify list returns dept/phone/email
        lst_payload = admin_client.get(f"{API}/users?all=true").json()
        lst = lst_payload["items"] if isinstance(lst_payload, dict) else lst_payload
        me = next(x for x in lst if x["id"] == uid)
        assert me["department"] == "QA" and me["phone"] == "628111222333" and me["email"] == email
        # update department
        upd = admin_client.put(f"{API}/users/{uid}", json={"department": "Support"})
        assert upd.status_code == 200 and upd.json()["department"] == "Support"
        assert admin_client.delete(f"{API}/users/{uid}").status_code == 200


# ---------- Iteration 3: user-linked requester/pic + client-provided task id ----------
class TestTasksIter3:
    def test_client_provided_id_and_person_objects(self, admin_client):
        # Get an existing registered user to use as requester/pic
        users_payload = admin_client.get(f"{API}/users?all=true").json()
        users = users_payload["items"] if isinstance(users_payload, dict) else users_payload
        u = next((x for x in users if x["email"] == "budi@flowdesk.com"), users[0])
        client_id = f"e2e-{int(time.time()*1000)}"
        payload = {
            "id": client_id,
            "title": "TEST_iter3_person_link",
            "priority": "Medium",
            "requester": {"user_id": u["id"], "name": u["name"],
                          "department": u.get("department") or "",
                          "phone": u.get("phone") or "", "email": u["email"]},
            "pic": {"user_id": u["id"], "name": u["name"],
                    "department": u.get("department") or "",
                    "phone": u.get("phone") or "", "email": u["email"]},
            "items": [{"title": "A", "done": False}],
        }
        r = admin_client.post(f"{API}/tasks", json=payload)
        assert r.status_code == 200, r.text
        t = r.json()
        assert t["id"] == client_id, "client-provided id must be honored"
        assert t["requester"]["user_id"] == u["id"]
        assert t["pic"]["user_id"] == u["id"]
        assert t["requester"]["email"] == u["email"]
        # duplicate id -> 400
        dup = admin_client.post(f"{API}/tasks", json=payload)
        assert dup.status_code == 400
        # cleanup
        admin_client.delete(f"{API}/tasks/{client_id}")

    def test_edit_preserves_item_done_state(self, admin_client):
        r = admin_client.post(f"{API}/tasks", json={
            "title": "TEST_iter3_preserve",
            "items": [{"title": "one", "done": False}, {"title": "two", "done": False}],
            "documents": [{"kind": "url", "url": "https://ex.com/x", "label": "L"}],
        })
        tid = r.json()["id"]
        # check first item done
        items = r.json()["items"]
        items[0]["done"] = True
        admin_client.put(f"{API}/tasks/{tid}", json={"items": items})
        t2 = admin_client.get(f"{API}/tasks/{tid}").json()
        done_at = next(i for i in t2["items"] if i["id"] == items[0]["id"])["done_at"]
        # Now edit only title -> should preserve done + done_at + document ids
        items2 = t2["items"]
        for it in items2:
            it["title"] = it["title"] + " (edit)"
        docs2 = t2["documents"]
        r3 = admin_client.put(f"{API}/tasks/{tid}", json={"items": items2, "documents": docs2})
        assert r3.status_code == 200
        merged = r3.json()
        preserved = next(i for i in merged["items"] if i["id"] == items[0]["id"])
        assert preserved["done"] is True
        assert preserved["done_at"] == done_at, "done_at should be preserved on title-only edit"
        assert merged["documents"][0]["id"] == t2["documents"][0]["id"]
        admin_client.delete(f"{API}/tasks/{tid}")

    def test_roles_defaults(self, admin_client):
        r = admin_client.get(f"{API}/roles")
        assert r.status_code == 200
        assert {"admin", "manager", "member"}.issubset({x["name"] for x in r.json()})


# ---------- Settings ----------
class TestSettings:
    def test_settings(self, admin_client):
        r = admin_client.get(f"{API}/settings")
        assert r.status_code == 200
        assert "general" in r.json()


# ---------- Global search ----------
class TestSearch:
    def test_search(self, admin_client):
        r = admin_client.get(f"{API}/search?q=TEST")
        assert r.status_code == 200
        for k in ("tasks", "meetings", "reminders", "notes", "attachments"):
            assert k in r.json()
