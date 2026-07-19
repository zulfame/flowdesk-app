"""
Iteration 4 tests: detailed history, completion/mention/response notifications,
duplicate, templates, dashboard workload+trend, PIC assignment notify (pic_wa_url).
"""
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


@pytest.fixture(scope="module")
def admin():
    r = requests.post(f"{API}/auth/login", json={"email": "admin@flowdesk.com", "password": "admin123"}, timeout=15)
    assert r.status_code == 200, r.text
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {r.json()['token']}", "Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def users(admin):
    payload = admin.get(f"{API}/users?all=true").json()
    lst = payload["items"] if isinstance(payload, dict) and "items" in payload else payload
    m = {u["email"]: u for u in lst}
    assert "budi@flowdesk.com" in m and "siti@flowdesk.com" in m, "seed users missing"
    return m


def _person(u):
    return {"user_id": u["id"], "name": u["name"], "department": u.get("department") or "",
            "phone": u.get("phone") or "", "email": u["email"]}


def _budi_client():
    r = requests.post(f"{API}/auth/login", json={"email": "budi@flowdesk.com", "password": "budi12345"}, timeout=15)
    assert r.status_code == 200, r.text
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {r.json()['token']}", "Content-Type": "application/json"})
    return s, r.json()["user"]["id"]


class TestHistoryDetail:
    def test_history_detail_entries(self, admin, users):
        budi, siti = users["budi@flowdesk.com"], users["siti@flowdesk.com"]
        r = admin.post(f"{API}/tasks", json={
            "title": "TEST_iter4_history", "priority": "Medium",
            "pic": _person(budi), "requester": _person(siti),
            "items": [{"title": "one", "done": False}],
        })
        assert r.status_code == 200, r.text
        tid = r.json()["id"]

        # Update priority + PIC + title + deadline
        new_deadline = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
        r2 = admin.put(f"{API}/tasks/{tid}", json={
            "title": "TEST_iter4_history_v2", "priority": "High",
            "pic": _person(siti), "deadline": new_deadline,
        })
        assert r2.status_code == 200, r2.text
        # pic_wa_url should be set (siti has phone? check)
        # Regardless verify history detail
        got = admin.get(f"{API}/tasks/{tid}").json()
        details = [h.get("detail") for h in got["history"] if h.get("detail")]
        assert any("Prioritas:" in (d or "") and "Sedang" in d and "Tinggi" in d for d in details), details
        assert any("PIC:" in (d or "") for d in details), details
        assert any("Judul diubah" in (d or "") for d in details), details
        assert any("Tenggat" in (d or "") for d in details), details
        admin.delete(f"{API}/tasks/{tid}")


class TestCompletionNotify:
    def test_notification_on_completion(self, admin, users):
        budi = users["budi@flowdesk.com"]
        siti = users["siti@flowdesk.com"]
        r = admin.post(f"{API}/tasks", json={
            "title": "TEST_iter4_complete",
            "requester": _person(siti), "pic": _person(budi),
            "items": [{"title": "only", "done": False}],
        })
        tid = r.json()["id"]

        # login as budi to see his notifications
        budi_client, budi_id = _budi_client()
        before = budi_client.get(f"{API}/notifications").json()
        before_count = sum(1 for x in before["items"] if x.get("title") == "Tugas Selesai")

        # Complete
        items = r.json()["items"]
        items[0]["done"] = True
        rc = admin.put(f"{API}/tasks/{tid}", json={"items": items})
        assert rc.status_code == 200 and rc.json()["status"] == "Completed"

        after = budi_client.get(f"{API}/notifications").json()
        after_count = sum(1 for x in after["items"] if x.get("title") == "Tugas Selesai")
        assert after_count > before_count, "Budi (PIC) should get 'Tugas Selesai' notification"
        admin.delete(f"{API}/tasks/{tid}")


class TestDocResponseNotify:
    def test_response_creates_notification(self, admin, users):
        siti = users["siti@flowdesk.com"]
        budi = users["budi@flowdesk.com"]
        r = admin.post(f"{API}/tasks", json={
            "title": "TEST_iter4_resp",
            "requester": _person(siti), "pic": _person(budi),
            "items": [{"title": "a", "done": False}],
            "documents": [{"kind": "url", "url": "https://ex.com/doc", "label": "Doc"}],
        })
        t = r.json()
        tid = t["id"]

        # login as siti to observe notifications
        rs = requests.post(f"{API}/auth/login", json={"email": "siti@flowdesk.com", "password": "siti12345"}).json()
        siti_client = requests.Session()
        siti_client.headers.update({"Authorization": f"Bearer {rs['token']}", "Content-Type": "application/json"})
        before = siti_client.get(f"{API}/notifications").json()
        before_c = sum(1 for x in before["items"] if x.get("title") == "Dokumen Balasan Baru")

        docs = t["documents"]
        docs[0]["responses"] = [{"kind": "url", "status": "revisi", "url": "https://ex.com/r", "label": "R1"}]
        r2 = admin.put(f"{API}/tasks/{tid}", json={"documents": docs})
        assert r2.status_code == 200

        after = siti_client.get(f"{API}/notifications").json()
        after_c = sum(1 for x in after["items"] if x.get("title") == "Dokumen Balasan Baru")
        assert after_c > before_c, "requester (Siti) should get 'Dokumen Balasan Baru'"
        admin.delete(f"{API}/tasks/{tid}")


class TestMention:
    def test_mention_creates_notification(self, admin, users):
        budi = users["budi@flowdesk.com"]
        r = admin.post(f"{API}/tasks", json={
            "title": "TEST_iter4_mention",
            "items": [{"title": "x", "done": False}],
        })
        tid = r.json()["id"]

        budi_client, _ = _budi_client()
        before = budi_client.get(f"{API}/notifications").json()
        bc = sum(1 for x in before["items"] if x.get("title") == "Anda disebut")

        r2 = admin.post(f"{API}/tasks/{tid}/comments", json={"text": "Halo @budi tolong review"})
        assert r2.status_code == 200

        after = budi_client.get(f"{API}/notifications").json()
        ac = sum(1 for x in after["items"] if x.get("title") == "Anda disebut")
        assert ac > bc, "budi should get mention notification"
        admin.delete(f"{API}/tasks/{tid}")


class TestDuplicate:
    def test_duplicate_task(self, admin, users):
        budi = users["budi@flowdesk.com"]
        r = admin.post(f"{API}/tasks", json={
            "title": "TEST_iter4_dupsrc", "priority": "High",
            "pic": _person(budi),
            "items": [{"title": "one", "done": True}, {"title": "two", "done": False}],
            "documents": [{"kind": "url", "url": "https://ex.com/x", "label": "L"}],
        })
        tid = r.json()["id"]
        d = admin.post(f"{API}/tasks/{tid}/duplicate")
        assert d.status_code == 200, d.text
        new = d.json()
        assert new["title"].endswith("(Salinan)")
        assert new["status"] == "Pending"
        assert new["id"] != tid
        assert all(not it["done"] for it in new["items"])
        assert all(not it.get("documents") for it in new["items"])
        assert new["documents"] == []
        # cleanup
        admin.delete(f"{API}/tasks/{tid}")
        admin.delete(f"{API}/tasks/{new['id']}")


class TestTemplates:
    def test_template_from_task_and_instantiate(self, admin):
        r = admin.post(f"{API}/tasks", json={
            "title": "TEST_iter4_tplsrc", "priority": "High",
            "items": [{"title": "step1", "done": False}, {"title": "step2", "done": False}],
        })
        tid = r.json()["id"]

        tpl = admin.post(f"{API}/tasks/templates", json={"name": "TEST_iter4_tpl", "task_id": tid})
        assert tpl.status_code == 200, tpl.text
        tid_tpl = tpl.json()["id"]
        assert tpl.json()["items"] == ["step1", "step2"]

        lst = admin.get(f"{API}/tasks/templates/list")
        assert lst.status_code == 200
        assert any(x["id"] == tid_tpl for x in lst.json())

        inst = admin.post(f"{API}/tasks/templates/{tid_tpl}/instantiate")
        assert inst.status_code == 200
        new_task = inst.json()
        assert new_task["priority"] == "High"
        assert [it["title"] for it in new_task["items"]] == ["step1", "step2"]
        assert new_task["status"] == "Pending"

        # delete template
        d = admin.delete(f"{API}/tasks/templates/{tid_tpl}")
        assert d.status_code == 200

        admin.delete(f"{API}/tasks/{tid}")
        admin.delete(f"{API}/tasks/{new_task['id']}")

    def test_template_from_scratch(self, admin):
        tpl = admin.post(f"{API}/tasks/templates", json={
            "name": "TEST_iter4_tpl2", "title": "New task from tpl",
            "priority": "Low", "items": ["a", "b", "c"],
        })
        assert tpl.status_code == 200
        tid = tpl.json()["id"]
        assert tpl.json()["items"] == ["a", "b", "c"]
        admin.delete(f"{API}/tasks/templates/{tid}")


class TestPicAssignmentNotify:
    def test_pic_wa_url_and_notification(self, admin, users):
        budi = users["budi@flowdesk.com"]  # has phone from seed
        assert budi.get("phone"), "budi seed should have phone"

        budi_client, _ = _budi_client()
        before = budi_client.get(f"{API}/notifications").json()
        bc = sum(1 for x in before["items"] if x.get("title") == "Tugas Ditugaskan")

        r = admin.post(f"{API}/tasks", json={
            "title": "TEST_iter4_pic_assign", "pic": _person(budi),
            "items": [{"title": "x", "done": False}],
        })
        assert r.status_code == 200
        data = r.json()
        assert data.get("pic_wa_url") and "wa.me/" in data["pic_wa_url"], data.get("pic_wa_url")

        after = budi_client.get(f"{API}/notifications").json()
        ac = sum(1 for x in after["items"] if x.get("title") == "Tugas Ditugaskan")
        assert ac > bc, "budi should have received 'Tugas Ditugaskan'"
        admin.delete(f"{API}/tasks/{data['id']}")


class TestDashboardStats:
    def test_workload_and_trend(self, admin, users):
        # Ensure at least one active task exists
        budi = users["budi@flowdesk.com"]
        r = admin.post(f"{API}/tasks", json={
            "title": "TEST_iter4_dash", "pic": _person(budi),
            "items": [{"title": "x", "done": False}],
        })
        tid = r.json()["id"]

        d = admin.get(f"{API}/dashboard/stats")
        assert d.status_code == 200
        data = d.json()
        assert "workload" in data and isinstance(data["workload"], list)
        assert "trend" in data and isinstance(data["trend"], list) and len(data["trend"]) == 6
        for row in data["trend"]:
            for k in ("label", "created", "completed"):
                assert k in row
        # our created active task should appear in workload
        names = [w["name"] for w in data["workload"]]
        assert budi["name"] in names, f"expected {budi['name']} in workload {names}"

        admin.delete(f"{API}/tasks/{tid}")
