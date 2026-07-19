"""Verify iteration_10 notification wording (Telegram group => use NAME, not 'Anda')."""
import os
import time
import requests

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") + "/api"
ADMIN = {"email": "admin@flowdesk.com", "password": "admin123"}
MEMBER = {"email": "member@flowdesk.com", "password": "member123"}


def _login(c):
    r = requests.post(f"{BASE}/auth/login", json=c, timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    return d["token"], d["user"]


def _notifs(headers):
    r = requests.get(f"{BASE}/notifications", headers=headers, timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    return d["items"] if isinstance(d, dict) else d


def test_pic_assignment_notification_uses_name():
    admin_tok, _ = _login(ADMIN)
    member_tok, member = _login(MEMBER)
    ah = {"Authorization": f"Bearer {admin_tok}"}
    mh = {"Authorization": f"Bearer {member_tok}"}

    before = {n["id"] for n in _notifs(mh)}

    title = f"TEST_NOTIF_PIC_{int(time.time())}"
    payload = {
        "title": title,
        "priority": "Medium",
        "deadline": "2025-12-31",
        "pic": {"user_id": member["id"], "name": member["name"], "email": member["email"]},
    }
    r = requests.post(f"{BASE}/tasks", json=payload, headers=ah, timeout=30)
    assert r.status_code in (200, 201), r.text
    task_id = r.json()["id"]

    time.sleep(1.0)
    new = [n for n in _notifs(mh) if n["id"] not in before]
    match = [n for n in new if title in (n.get("message") or "")]
    try:
        assert match, f"no notif referencing {title}: {new}"
        m = match[0]
        assert f"ditugaskan kepada {member['name']}" in m["message"], m
        assert "kepada Anda" not in m["message"], m
    finally:
        requests.delete(f"{BASE}/tasks/{task_id}", headers=ah, timeout=30)


def test_mention_notification_uses_name():
    admin_tok, admin = _login(ADMIN)
    member_tok, member = _login(MEMBER)
    ah = {"Authorization": f"Bearer {admin_tok}"}
    mh = {"Authorization": f"Bearer {member_tok}"}

    before = {n["id"] for n in _notifs(mh)}

    title = f"TEST_NOTIF_MENTION_{int(time.time())}"
    payload = {
        "title": title,
        "priority": "Low",
        "deadline": "2025-12-31",
        "pic": {"user_id": admin["id"], "name": admin["name"], "email": admin["email"]},
    }
    r = requests.post(f"{BASE}/tasks", json=payload, headers=ah, timeout=30)
    assert r.status_code in (200, 201), r.text
    task_id = r.json()["id"]

    # mention token that matches member's name after space-stripped lowercase
    token = (member["name"].split()[0]).lower()  # 'rina'
    cr = requests.post(
        f"{BASE}/tasks/{task_id}/comments",
        json={"text": f"halo @{token}, tolong review"},
        headers=ah, timeout=30,
    )
    assert cr.status_code in (200, 201), cr.text

    time.sleep(1.0)
    new = [n for n in _notifs(mh) if n["id"] not in before]
    ment = [n for n in new if "menyebut" in (n.get("message") or "").lower()]
    try:
        assert ment, f"no mention notif. new={new}"
        m = ment[0]
        assert m.get("title") == f"{member['name']} disebut", m
        assert f"menyebut {member['name']} di" in m["message"], m
        # ensure no 'Anda' verbiage
        assert "Anda" not in m["message"], m
    finally:
        requests.delete(f"{BASE}/tasks/{task_id}", headers=ah, timeout=30)
