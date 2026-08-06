#!/usr/bin/env python3
"""
Backend test for meeting broadcast endpoint following notification channel settings.
Tests POST /api/meetings/{id}/broadcast with various notification channel configurations.
"""
import requests
import json
import sys

# Base URL from frontend/.env: REACT_APP_BACKEND_URL
BASE_URL = "https://flowdesk-preview-5.preview.emergentagent.com/api"

# Admin credentials from test_credentials.md
ADMIN_EMAIL = "sa@bprbangunarta.co.id"
ADMIN_PASSWORD = "SA@4dm1n"

session = requests.Session()
token = None


def login(email, password):
    """Login and return token"""
    global token
    resp = session.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    if resp.status_code != 200:
        print(f"❌ Login failed: {resp.status_code} {resp.text}")
        sys.exit(1)
    data = resp.json()
    token = data.get("token")
    session.headers.update({"Authorization": f"Bearer {token}"})
    print(f"✅ Logged in as {email}")
    return data


def create_user(name, email, phone, password="Test@123"):
    """Create a user and return user data"""
    payload = {
        "name": name,
        "email": email,
        "phone": phone,
        "password": password,
        "role": "user",
        "department": "Test Dept",
        "position": "Tester"
    }
    resp = session.post(f"{BASE_URL}/users", json=payload)
    if resp.status_code != 200:
        print(f"❌ Failed to create user {name}: {resp.status_code} {resp.text}")
        sys.exit(1)
    user = resp.json()
    print(f"✅ Created user: {name} (id={user['id']}, email={email}, phone={phone})")
    return user


def create_meeting(title, date, start_time, location, participants):
    """Create a meeting and return meeting data"""
    payload = {
        "title": title,
        "date": date,
        "start_time": start_time,
        "location": location,
        "participants": participants,
        "meeting_type": "Internal",
        "agenda": "Test broadcast",
        "notes": "",
        "decisions": "",
        "action_items": []
    }
    resp = session.post(f"{BASE_URL}/meetings", json=payload)
    if resp.status_code != 200:
        print(f"❌ Failed to create meeting: {resp.status_code} {resp.text}")
        sys.exit(1)
    meeting = resp.json()
    print(f"✅ Created meeting: {title} (id={meeting['id']}, participants={participants})")
    return meeting


def get_settings():
    """Get current settings"""
    resp = session.get(f"{BASE_URL}/settings")
    if resp.status_code != 200:
        print(f"❌ Failed to get settings: {resp.status_code} {resp.text}")
        sys.exit(1)
    settings = resp.json()
    print(f"✅ Retrieved settings")
    return settings


def update_settings(settings):
    """Update settings"""
    # Extract only the sections that can be updated
    payload = {
        "general": settings.get("general"),
        "email": settings.get("email"),
        "telegram": settings.get("telegram"),
        "notification": settings.get("notification"),
        "storage": settings.get("storage"),
        "application": settings.get("application"),
        "backup": settings.get("backup")
    }
    resp = session.put(f"{BASE_URL}/settings", json=payload)
    if resp.status_code != 200:
        print(f"❌ Failed to update settings: {resp.status_code} {resp.text}")
        sys.exit(1)
    updated = resp.json()
    print(f"✅ Updated settings")
    return updated


def broadcast_meeting(meeting_id, message=None):
    """Broadcast meeting notification"""
    payload = {}
    if message:
        payload["message"] = message
    resp = session.post(f"{BASE_URL}/meetings/{meeting_id}/broadcast", json=payload)
    return resp


def test_broadcast_endpoint():
    """Main test function for broadcast endpoint"""
    print("\n" + "="*80)
    print("TESTING MEETING BROADCAST ENDPOINT WITH NOTIFICATION CHANNEL SETTINGS")
    print("="*80 + "\n")

    # Step 1: Login as admin
    print("\n--- STEP 1: Login as Admin ---")
    login(ADMIN_EMAIL, ADMIN_PASSWORD)

    # Step 2: Create 2 users with known names, emails, phones
    print("\n--- STEP 2: Create Test Users ---")
    user1 = create_user(
        name="Broadcast Alpha",
        email="broadcast.alpha@test.com",
        phone="628111111111"
    )
    user2 = create_user(
        name="Broadcast Beta",
        email="broadcast.beta@test.com",
        phone="628222222222"
    )

    # Step 3: Create a meeting with 2 real names + 1 ghost name
    print("\n--- STEP 3: Create Meeting with 3 Participants (2 real + 1 ghost) ---")
    meeting = create_meeting(
        title="Broadcast Test Meeting",
        date="2026-02-15",
        start_time="10:00",
        location="Test Room",
        participants=["Broadcast Alpha", "Broadcast Beta", "Ghost User"]
    )
    meeting_id = meeting["id"]

    # Step 4: Get original settings to restore later
    print("\n--- STEP 4: Get Original Settings ---")
    original_settings = get_settings()
    original_notification = original_settings.get("notification", {})
    print(f"   Original notification settings: {json.dumps(original_notification, indent=2)}")

    # Step 5: Test Scenario 1 - email=false, telegram=false, browser=true
    print("\n--- STEP 5: Test Scenario 1 (email=false, telegram=false, browser=true) ---")
    settings_copy = dict(original_settings)
    settings_copy["notification"] = {
        "email_enabled": False,
        "telegram_enabled": False,
        "browser_enabled": True
    }
    update_settings(settings_copy)
    print("   Set notification: email_enabled=False, telegram_enabled=False, browser_enabled=True")

    resp = broadcast_meeting(meeting_id)
    if resp.status_code != 200:
        print(f"❌ SCENARIO 1 FAILED: Expected 200, got {resp.status_code}")
        print(f"   Response: {resp.text}")
    else:
        result = resp.json()
        print(f"   Response: {json.dumps(result, indent=2)}")
        
        # Validate results
        errors = []
        if result.get("email_sent") != 0:
            errors.append(f"email_sent should be 0 (email disabled), got {result.get('email_sent')}")
        if result.get("telegram_sent") != False:
            errors.append(f"telegram_sent should be False (telegram disabled), got {result.get('telegram_sent')}")
        if result.get("push_sent") != 2:
            errors.append(f"push_sent should be 2 (browser enabled, 2 users with id), got {result.get('push_sent')}")
        if len(result.get("wa_urls", [])) != 2:
            errors.append(f"wa_urls length should be 2 (both matched users have phones), got {len(result.get('wa_urls', []))}")
        if result.get("resolved") != 2:
            errors.append(f"resolved should be 2 (2 users matched), got {result.get('resolved')}")
        if result.get("participant_count") != 3:
            errors.append(f"participant_count should be 3 (3 names in participants), got {result.get('participant_count')}")
        
        channels = result.get("channels", {})
        if channels.get("email") != False:
            errors.append(f"channels.email should be False, got {channels.get('email')}")
        if channels.get("telegram") != False:
            errors.append(f"channels.telegram should be False, got {channels.get('telegram')}")
        if channels.get("browser") != True:
            errors.append(f"channels.browser should be True, got {channels.get('browser')}")

        if errors:
            print(f"❌ SCENARIO 1 FAILED:")
            for err in errors:
                print(f"   - {err}")
        else:
            print(f"✅ SCENARIO 1 PASSED: All validations correct")

    # Step 6: Test Scenario 2 - email=true, telegram=true, browser=false
    print("\n--- STEP 6: Test Scenario 2 (email=true, telegram=true, browser=false) ---")
    settings_copy["notification"] = {
        "email_enabled": True,
        "telegram_enabled": True,
        "browser_enabled": False
    }
    update_settings(settings_copy)
    print("   Set notification: email_enabled=True, telegram_enabled=True, browser_enabled=False")

    resp = broadcast_meeting(meeting_id)
    if resp.status_code != 200:
        print(f"❌ SCENARIO 2 FAILED: Expected 200, got {resp.status_code}")
        print(f"   Response: {resp.text}")
    else:
        result = resp.json()
        print(f"   Response: {json.dumps(result, indent=2)}")
        
        # Validate results
        errors = []
        if result.get("email_sent") != 2:
            errors.append(f"email_sent should be 2 (email enabled, 2 users with email), got {result.get('email_sent')}")
        if result.get("telegram_sent") != True:
            errors.append(f"telegram_sent should be True (telegram enabled), got {result.get('telegram_sent')}")
        if result.get("push_sent") != 0:
            errors.append(f"push_sent should be 0 (browser disabled), got {result.get('push_sent')}")
        if len(result.get("wa_urls", [])) != 2:
            errors.append(f"wa_urls length should be 2 (both matched users have phones), got {len(result.get('wa_urls', []))}")
        if result.get("resolved") != 2:
            errors.append(f"resolved should be 2 (2 users matched), got {result.get('resolved')}")
        if result.get("participant_count") != 3:
            errors.append(f"participant_count should be 3 (3 names in participants), got {result.get('participant_count')}")
        
        channels = result.get("channels", {})
        if channels.get("email") != True:
            errors.append(f"channels.email should be True, got {channels.get('email')}")
        if channels.get("telegram") != True:
            errors.append(f"channels.telegram should be True, got {channels.get('telegram')}")
        if channels.get("browser") != False:
            errors.append(f"channels.browser should be False, got {channels.get('browser')}")

        if errors:
            print(f"❌ SCENARIO 2 FAILED:")
            for err in errors:
                print(f"   - {err}")
        else:
            print(f"✅ SCENARIO 2 PASSED: All validations correct")

    # Step 7: Test 404 for non-existent meeting
    print("\n--- STEP 7: Test 404 for Non-existent Meeting ---")
    resp = broadcast_meeting("nonexistent-meeting-id-12345")
    if resp.status_code == 404:
        print(f"✅ SCENARIO 3 PASSED: Broadcasting non-existent meeting returns 404")
    else:
        print(f"❌ SCENARIO 3 FAILED: Expected 404, got {resp.status_code}")
        print(f"   Response: {resp.text}")

    # Step 8: Restore original settings
    print("\n--- STEP 8: Restore Original Settings ---")
    original_settings["notification"] = original_notification
    update_settings(original_settings)
    print(f"   Restored notification settings: {json.dumps(original_notification, indent=2)}")

    print("\n" + "="*80)
    print("BROADCAST ENDPOINT TESTING COMPLETE")
    print("="*80 + "\n")


if __name__ == "__main__":
    try:
        test_broadcast_endpoint()
    except Exception as e:
        print(f"\n❌ TEST FAILED WITH EXCEPTION: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
