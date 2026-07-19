"""
Iteration 7: RBAC (task/meeting/note visibility & edit/delete), dashboard scoping,
attachment hard-delete + archive purge.
"""
import io
import os
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

ADMIN = ("admin@flowdesk.com", "admin123")
MEMBER = ("member@flowdesk.com", "member123")


def _login(email, pw):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=15)
    assert r.status_code == 200, r.text
    j = r.json()
    return j["token"], j["user"]


def _client(token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_ctx():
    t, u = _login(*ADMIN)
    return {"token": t, "user": u, "s": _client(t)}


@pytest.fixture(scope="module")
def member_ctx():
    t, u = _login(*MEMBER)
    return {"token": t, "user": u, "s": _client(t)}


@pytest.fixture(scope="module")
def task_with_member_pic(admin_ctx, member_ctx):
    """Admin creates: (1) a task where member is PIC, (2) an unrelated task."""
    m_user = member_ctx["user"]
    r1 = admin_ctx["s"].post(f"{API}/tasks", json={
        "title": "TEST_iter7_member_pic_task",
        "priority": "Medium",
        "deadline": "2027-08-15",
        "pic": {"user_id": m_user["id"], "name": m_user["name"], "email": m_user["email"]},
        "requester": {"user_id": None, "name": "-"},
        "items": [{"title": "step1", "done": False}],
    })
    assert r1.status_code == 200, r1.text
    tid_pic = r1.json()["id"]

    r2 = admin_ctx["s"].post(f"{API}/tasks", json={
        "title": "TEST_iter7_unrelated_task",
        "priority": "Low",
        "deadline": "2027-08-20",
        "pic": {"user_id": None, "name": "-"},
    })
    assert r2.status_code == 200
    tid_unrel = r2.json()["id"]

    yield {"pic": tid_pic, "unrel": tid_unrel}

    # cleanup
    admin_ctx["s"].delete(f"{API}/tasks/{tid_pic}")
    admin_ctx["s"].delete(f"{API}/tasks/{tid_unrel}")
    admin_ctx["s"].delete(f"{API}/archive/task/{tid_pic}")
    admin_ctx["s"].delete(f"{API}/archive/task/{tid_unrel}")


class TestTaskRBAC:
    def test_member_list_only_related(self, member_ctx, task_with_member_pic):
        r = member_ctx["s"].get(f"{API}/tasks")
        assert r.status_code == 200
        data = r.json()
        items = data["items"] if isinstance(data, dict) and "items" in data else data
        ids = [t["id"] for t in items]
        assert task_with_member_pic["pic"] in ids
        assert task_with_member_pic["unrel"] not in ids

    def test_admin_list_sees_all(self, admin_ctx, task_with_member_pic):
        r = admin_ctx["s"].get(f"{API}/tasks")
        data = r.json()
        items = data["items"] if isinstance(data, dict) and "items" in data else data
        ids = [t["id"] for t in items]
        assert task_with_member_pic["pic"] in ids
        assert task_with_member_pic["unrel"] in ids

    def test_member_get_unrelated_403(self, member_ctx, task_with_member_pic):
        r = member_ctx["s"].get(f"{API}/tasks/{task_with_member_pic['unrel']}")
        assert r.status_code == 403

    def test_member_get_related_ok(self, member_ctx, task_with_member_pic):
        r = member_ctx["s"].get(f"{API}/tasks/{task_with_member_pic['pic']}")
        assert r.status_code == 200
        assert r.json()["id"] == task_with_member_pic["pic"]

    def test_member_delete_not_owned_403(self, member_ctx, task_with_member_pic):
        r = member_ctx["s"].delete(f"{API}/tasks/{task_with_member_pic['pic']}")
        assert r.status_code == 403

    def test_member_pic_can_update_status(self, member_ctx, task_with_member_pic):
        # PIC (not creator) is allowed to hit PUT with `status` field (no 403).
        # Note: server auto-derives status from checklist progress unless it's a manual status,
        # so the returned status may be recomputed to Pending — the key check is 200 (allowed).
        r = member_ctx["s"].put(f"{API}/tasks/{task_with_member_pic['pic']}", json={"status": "On Progress"})
        assert r.status_code == 200, r.text

    def test_member_pic_title_stripped(self, member_ctx, admin_ctx, task_with_member_pic):
        original = admin_ctx["s"].get(f"{API}/tasks/{task_with_member_pic['pic']}").json()["title"]
        r = member_ctx["s"].put(f"{API}/tasks/{task_with_member_pic['pic']}",
                                 json={"title": "HACKED_by_pic", "status": "On Progress"})
        # Either 200 with title unchanged, or (allowed status alone) success
        assert r.status_code == 200, r.text
        # Confirm title NOT changed
        after = admin_ctx["s"].get(f"{API}/tasks/{task_with_member_pic['pic']}").json()
        assert after["title"] == original
        assert after["title"] != "HACKED_by_pic"

    def test_admin_can_update_title(self, admin_ctx, task_with_member_pic):
        r = admin_ctx["s"].put(f"{API}/tasks/{task_with_member_pic['pic']}",
                                 json={"title": "TEST_iter7_member_pic_task_v2"})
        assert r.status_code == 200
        assert r.json()["title"] == "TEST_iter7_member_pic_task_v2"


@pytest.fixture(scope="module")
def meetings_setup(admin_ctx, member_ctx):
    m_name = member_ctx["user"]["name"]
    r1 = admin_ctx["s"].post(f"{API}/meetings", json={
        "title": "TEST_iter7_member_participant_meeting",
        "date": "2027-05-10", "start_time": "10:00", "end_time": "11:00",
        "meeting_type": "Internal",
        "participants": [m_name],
    })
    assert r1.status_code == 200, r1.text
    m1 = r1.json()["id"]

    r2 = admin_ctx["s"].post(f"{API}/meetings", json={
        "title": "TEST_iter7_unrelated_meeting",
        "date": "2027-05-11", "start_time": "10:00", "end_time": "11:00",
        "meeting_type": "Internal",
        "participants": ["Someone Else"],
    })
    m2 = r2.json()["id"]

    yield {"related": m1, "unrel": m2}
    admin_ctx["s"].delete(f"{API}/meetings/{m1}")
    admin_ctx["s"].delete(f"{API}/meetings/{m2}")
    admin_ctx["s"].delete(f"{API}/archive/meeting/{m1}")
    admin_ctx["s"].delete(f"{API}/archive/meeting/{m2}")


class TestMeetingRBAC:
    def test_member_list_only_related(self, member_ctx, meetings_setup):
        r = member_ctx["s"].get(f"{API}/meetings")
        assert r.status_code == 200
        items = r.json()
        ids = [x["id"] for x in items]
        assert meetings_setup["related"] in ids
        assert meetings_setup["unrel"] not in ids

    def test_admin_list_sees_all(self, admin_ctx, meetings_setup):
        r = admin_ctx["s"].get(f"{API}/meetings")
        ids = [x["id"] for x in r.json()]
        assert meetings_setup["related"] in ids
        assert meetings_setup["unrel"] in ids

    def test_member_get_unrelated_403(self, member_ctx, meetings_setup):
        r = member_ctx["s"].get(f"{API}/meetings/{meetings_setup['unrel']}")
        assert r.status_code == 403

    def test_member_delete_403(self, member_ctx, meetings_setup):
        r = member_ctx["s"].delete(f"{API}/meetings/{meetings_setup['related']}")
        assert r.status_code == 403

    def test_member_update_403(self, member_ctx, meetings_setup):
        r = member_ctx["s"].put(f"{API}/meetings/{meetings_setup['related']}", json={"title": "hacked"})
        assert r.status_code == 403


@pytest.fixture(scope="module")
def note_setup(admin_ctx):
    r = admin_ctx["s"].post(f"{API}/notes", json={"title": "TEST_iter7_admin_note", "content": "shared body"})
    assert r.status_code == 200
    nid = r.json()["id"]
    yield nid
    admin_ctx["s"].delete(f"{API}/notes/{nid}")
    admin_ctx["s"].delete(f"{API}/archive/note/{nid}")


class TestNotesRBAC:
    def test_member_can_view_all_notes(self, member_ctx, note_setup):
        r = member_ctx["s"].get(f"{API}/notes")
        assert r.status_code == 200
        items = r.json()
        items = items["items"] if isinstance(items, dict) and "items" in items else items
        assert any(n["id"] == note_setup for n in items)

    def test_member_get_single_note_ok(self, member_ctx, note_setup):
        r = member_ctx["s"].get(f"{API}/notes/{note_setup}")
        assert r.status_code == 200

    def test_member_update_others_note_403(self, member_ctx, note_setup):
        r = member_ctx["s"].put(f"{API}/notes/{note_setup}", json={"title": "hacked"})
        assert r.status_code == 403

    def test_member_delete_others_note_403(self, member_ctx, note_setup):
        r = member_ctx["s"].delete(f"{API}/notes/{note_setup}")
        assert r.status_code == 403

    def test_member_own_note_crud(self, member_ctx):
        r = member_ctx["s"].post(f"{API}/notes", json={"title": "TEST_iter7_member_own_note", "content": "mine"})
        assert r.status_code == 200
        nid = r.json()["id"]
        # update own
        r2 = member_ctx["s"].put(f"{API}/notes/{nid}", json={"title": "TEST_iter7_member_own_note_v2"})
        assert r2.status_code == 200
        assert r2.json()["title"] == "TEST_iter7_member_own_note_v2"
        # delete own
        r3 = member_ctx["s"].delete(f"{API}/notes/{nid}")
        assert r3.status_code == 200


class TestDashboardScoping:
    def test_stats_differ_admin_vs_member(self, admin_ctx, member_ctx, task_with_member_pic, meetings_setup):
        a = admin_ctx["s"].get(f"{API}/dashboard/stats").json()
        m = member_ctx["s"].get(f"{API}/dashboard/stats").json()
        # Admin sees ALL tasks; member sees only related. Admin's total_tasks >= member's + 1 (unrel task)
        assert a["total_tasks"] >= m["total_tasks"] + 1
        assert a["total_meetings"] >= m["total_meetings"] + 1

    def test_calendar_scoping(self, admin_ctx, member_ctx, task_with_member_pic, meetings_setup):
        a_events = admin_ctx["s"].get(f"{API}/calendar").json()
        m_events = member_ctx["s"].get(f"{API}/calendar").json()
        a_ids = {e["id"] for e in a_events}
        m_ids = {e["id"] for e in m_events}
        assert task_with_member_pic["unrel"] in a_ids
        assert task_with_member_pic["unrel"] not in m_ids
        assert meetings_setup["unrel"] in a_ids
        assert meetings_setup["unrel"] not in m_ids


class TestAttachmentHardDelete:
    def test_upload_hard_delete_and_purge(self, admin_ctx):
        # Create a task
        ct = admin_ctx["s"].post(f"{API}/tasks", json={
            "title": "TEST_iter7_attach_task", "priority": "Low",
            "pic": {"user_id": None, "name": "-"},
        })
        tid = ct.json()["id"]

        # Upload attachment (multipart - remove content-type header)
        headers = {"Authorization": f"Bearer {admin_ctx['token']}"}
        files = {"file": ("hello.txt", io.BytesIO(b"hello iter7"), "text/plain")}
        data = {"module": "task", "parent_id": tid}
        up = requests.post(f"{API}/attachments", headers=headers, files=files, data=data)
        assert up.status_code == 200, up.text
        fid = up.json()["id"]

        # Verify it shows in task.attachments
        t = admin_ctx["s"].get(f"{API}/tasks/{tid}").json()
        assert any(a["id"] == fid for a in t.get("attachments", []))

        # Hard delete
        d = admin_ctx["s"].delete(f"{API}/attachments/{fid}")
        assert d.status_code == 200

        # No longer listed
        t2 = admin_ctx["s"].get(f"{API}/tasks/{tid}").json()
        assert not any(a["id"] == fid for a in t2.get("attachments", []))

        # File record truly gone (not just is_deleted=True) — /api/attachments returns none
        lst = admin_ctx["s"].get(f"{API}/attachments?parent_id={tid}").json()
        assert not any(a["id"] == fid for a in lst)

        # Also upload another to test cascade-purge
        files2 = {"file": ("bye.txt", io.BytesIO(b"bye iter7"), "text/plain")}
        up2 = requests.post(f"{API}/attachments", headers=headers, files=files2, data=data)
        fid2 = up2.json()["id"]

        # Soft-delete task
        admin_ctx["s"].delete(f"{API}/tasks/{tid}")
        # Confirm task in archive
        arch = admin_ctx["s"].get(f"{API}/archive?type=task&page=1&page_size=200").json()
        assert any(x["id"] == tid for x in arch["items"])

        # Purge task - should cascade delete attachments too
        p = admin_ctx["s"].delete(f"{API}/archive/task/{tid}")
        assert p.status_code == 200

        # Attachment record should be gone (files.delete_many({parent_id: tid}))
        lst2 = admin_ctx["s"].get(f"{API}/attachments?parent_id={tid}").json()
        assert not any(a["id"] == fid2 for a in lst2)
