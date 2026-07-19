"""Backend tests for Time Schedule module + RBAC."""
import os
import requests
import pytest

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") + "/api"

ADMIN = {"email": "admin@flowdesk.com", "password": "admin123"}
MEMBER = {"email": "member@flowdesk.com", "password": "member123"}


def _login(creds):
    r = requests.post(f"{BASE}/auth/login", json=creds, timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    return d["token"], d["user"]


@pytest.fixture(scope="module")
def admin_ctx():
    tok, user = _login(ADMIN)
    return {"h": {"Authorization": f"Bearer {tok}"}, "user": user}


@pytest.fixture(scope="module")
def member_ctx():
    tok, user = _login(MEMBER)
    return {"h": {"Authorization": f"Bearer {tok}"}, "user": user}


def test_login_permissions_admin(admin_ctx):
    assert admin_ctx["user"]["permissions"] == ["*"]


def test_login_permissions_member(member_ctx):
    perms = member_ctx["user"]["permissions"]
    assert "time_schedule" in perms
    assert "*" not in perms


def test_me_returns_permissions(admin_ctx):
    r = requests.get(f"{BASE}/auth/me", headers=admin_ctx["h"], timeout=30)
    assert r.status_code == 200
    assert r.json()["permissions"] == ["*"]


def test_permission_catalog_has_time_schedule(admin_ctx):
    r = requests.get(f"{BASE}/permissions", headers=admin_ctx["h"], timeout=30)
    assert r.status_code == 200
    keys = [p["key"] for p in r.json()]
    assert "time_schedule" in keys


def test_default_role_member_includes_time_schedule(admin_ctx):
    r = requests.get(f"{BASE}/roles", headers=admin_ctx["h"], timeout=30)
    assert r.status_code == 200
    roles = {r["name"]: r for r in r.json()}
    assert "time_schedule" in roles["member"]["permissions"]
    assert "time_schedule" in roles["manager"]["permissions"]


@pytest.fixture(scope="module")
def admin_schedule(admin_ctx):
    payload = {
        "title": "TEST_TS_Admin",
        "event_name": "Event A",
        "section": "Panitia",
        "start_date": "2025-11-01",
        "end_date": "2025-11-30",
    }
    r = requests.post(f"{BASE}/time-schedules", json=payload, headers=admin_ctx["h"], timeout=30)
    assert r.status_code == 200, r.text
    sched = r.json()
    yield sched
    requests.delete(f"{BASE}/time-schedules/{sched['id']}", headers=admin_ctx["h"], timeout=30)


def test_create_and_get_schedule(admin_ctx, admin_schedule):
    sid = admin_schedule["id"]
    r = requests.get(f"{BASE}/time-schedules/{sid}", headers=admin_ctx["h"], timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert d["title"] == "TEST_TS_Admin"
    assert d["start_date"] == "2025-11-01"


def test_add_activity_via_put(admin_ctx, admin_schedule):
    sid = admin_schedule["id"]
    activity = {
        "name": "TEST_Activity_1",
        "section": "Panitia",
        "pic": {"user_id": admin_ctx["user"]["id"], "name": admin_ctx["user"]["name"], "email": admin_ctx["user"]["email"]},
        "start_date": "2025-11-03",
        "end_date": "2025-11-10",
        "category": "pelaksanaan",
        "status": "Rencana",
    }
    r = requests.put(
        f"{BASE}/time-schedules/{sid}",
        json={"activities": [activity]},
        headers=admin_ctx["h"], timeout=30,
    )
    assert r.status_code == 200, r.text
    d = r.json()
    assert len(d["activities"]) == 1
    assert d["activities"][0]["id"]  # backend generated
    assert d["activities"][0]["name"] == "TEST_Activity_1"


def test_convert_activity_to_task(admin_ctx, admin_schedule):
    sid = admin_schedule["id"]
    s = requests.get(f"{BASE}/time-schedules/{sid}", headers=admin_ctx["h"], timeout=30).json()
    aid = s["activities"][0]["id"]
    body = {
        "pic": {"user_id": admin_ctx["user"]["id"], "name": admin_ctx["user"]["name"], "email": admin_ctx["user"]["email"]},
        "priority": "Medium",
        "deadline": "2025-11-10",
    }
    r = requests.post(
        f"{BASE}/time-schedules/{sid}/activities/{aid}/convert-task",
        json=body, headers=admin_ctx["h"], timeout=30,
    )
    assert r.status_code == 200, r.text
    task_id = r.json()["task_id"]
    assert task_id
    # schedule now has task_id linked
    s2 = requests.get(f"{BASE}/time-schedules/{sid}", headers=admin_ctx["h"], timeout=30).json()
    assert s2["activities"][0].get("task_id") == task_id
    # second convert should fail
    r2 = requests.post(
        f"{BASE}/time-schedules/{sid}/activities/{aid}/convert-task",
        json=body, headers=admin_ctx["h"], timeout=30,
    )
    assert r2.status_code == 400
    # cleanup task
    requests.delete(f"{BASE}/tasks/{task_id}", headers=admin_ctx["h"], timeout=30)


def test_export_xlsx(admin_ctx, admin_schedule):
    sid = admin_schedule["id"]
    r = requests.get(f"{BASE}/time-schedules/{sid}/export", headers=admin_ctx["h"], timeout=30)
    assert r.status_code == 200
    ct = r.headers.get("content-type", "")
    assert "spreadsheetml.sheet" in ct
    assert len(r.content) > 1000
    assert r.content[:2] == b"PK"  # xlsx zip magic


def test_update_holidays(admin_ctx, admin_schedule):
    sid = admin_schedule["id"]
    r = requests.put(
        f"{BASE}/time-schedules/{sid}",
        json={"holidays": ["2025-11-17"]},
        headers=admin_ctx["h"], timeout=30,
    )
    assert r.status_code == 200
    assert "2025-11-17" in r.json()["holidays"]


def test_rbac_member_cannot_view_admin_schedule(admin_schedule, member_ctx):
    sid = admin_schedule["id"]
    r = requests.get(f"{BASE}/time-schedules/{sid}", headers=member_ctx["h"], timeout=30)
    assert r.status_code == 403


def test_rbac_member_cannot_update_admin_schedule(admin_schedule, member_ctx):
    sid = admin_schedule["id"]
    r = requests.put(
        f"{BASE}/time-schedules/{sid}",
        json={"title": "hacked"},
        headers=member_ctx["h"], timeout=30,
    )
    assert r.status_code == 403


def test_rbac_member_cannot_delete_admin_schedule(admin_schedule, member_ctx):
    sid = admin_schedule["id"]
    r = requests.delete(f"{BASE}/time-schedules/{sid}", headers=member_ctx["h"], timeout=30)
    assert r.status_code == 403


def test_rbac_member_list_excludes_admin_only(admin_schedule, member_ctx):
    r = requests.get(f"{BASE}/time-schedules", headers=member_ctx["h"], timeout=30)
    assert r.status_code == 200
    ids = [s["id"] for s in r.json()]
    assert admin_schedule["id"] not in ids


def test_rbac_member_can_create_own(member_ctx):
    payload = {"title": "TEST_TS_Member", "start_date": "2025-11-01", "end_date": "2025-11-05"}
    r = requests.post(f"{BASE}/time-schedules", json=payload, headers=member_ctx["h"], timeout=30)
    assert r.status_code == 200
    sid = r.json()["id"]
    lr = requests.get(f"{BASE}/time-schedules", headers=member_ctx["h"], timeout=30)
    assert sid in [s["id"] for s in lr.json()]
    # cleanup
    requests.delete(f"{BASE}/time-schedules/{sid}", headers=member_ctx["h"], timeout=30)


def test_rbac_member_can_view_when_pic(admin_ctx, member_ctx):
    # admin creates schedule and assigns member as PIC on an activity
    payload = {"title": "TEST_TS_PIC", "start_date": "2025-11-01", "end_date": "2025-11-10"}
    s = requests.post(f"{BASE}/time-schedules", json=payload, headers=admin_ctx["h"], timeout=30).json()
    sid = s["id"]
    act = {
        "name": "TEST_Act_pic_member",
        "pic": {"user_id": member_ctx["user"]["id"], "name": member_ctx["user"]["name"]},
        "start_date": "2025-11-02", "end_date": "2025-11-05",
        "category": "pelaksanaan", "status": "Rencana",
    }
    requests.put(f"{BASE}/time-schedules/{sid}", json={"activities": [act]}, headers=admin_ctx["h"], timeout=30)
    # member should now be able to VIEW (but not update)
    r = requests.get(f"{BASE}/time-schedules/{sid}", headers=member_ctx["h"], timeout=30)
    assert r.status_code == 200
    ru = requests.put(f"{BASE}/time-schedules/{sid}", json={"title": "nope"}, headers=member_ctx["h"], timeout=30)
    assert ru.status_code == 403
    # member sees in list now
    lr = requests.get(f"{BASE}/time-schedules", headers=member_ctx["h"], timeout=30)
    assert sid in [x["id"] for x in lr.json()]
    # cleanup
    requests.delete(f"{BASE}/time-schedules/{sid}", headers=admin_ctx["h"], timeout=30)


def test_delete_schedule(admin_ctx):
    payload = {"title": "TEST_TS_DEL", "start_date": "2025-11-01", "end_date": "2025-11-02"}
    s = requests.post(f"{BASE}/time-schedules", json=payload, headers=admin_ctx["h"], timeout=30).json()
    sid = s["id"]
    r = requests.delete(f"{BASE}/time-schedules/{sid}", headers=admin_ctx["h"], timeout=30)
    assert r.status_code == 200
    r2 = requests.get(f"{BASE}/time-schedules/{sid}", headers=admin_ctx["h"], timeout=30)
    assert r2.status_code == 404
