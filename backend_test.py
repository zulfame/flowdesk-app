#!/usr/bin/env python3
"""
FlowDesk Backend Test - Task Role & Validation Changes
Tests for:
- Item required validation (create & update)
- PIC permission safe-merge on PUT /tasks/{id}
"""

import requests
import json
import os
from datetime import datetime, timedelta

# Base URL from frontend/.env
BASE_URL = "https://server-learning.preview.emergentagent.com/api"

# Admin credentials from test_credentials.md
ADMIN_EMAIL = "sa@bprbangunarta.co.id"
ADMIN_PASSWORD = "SA@4dm1n"

# Test results
test_results = []

def log_test(group, test_num, description, passed, details=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    result = {
        "group": group,
        "test": test_num,
        "description": description,
        "status": status,
        "passed": passed,
        "details": details
    }
    test_results.append(result)
    print(f"{status} - {group} Test {test_num}: {description}")
    if details:
        print(f"   Details: {details}")

def login(email, password):
    """Login and return token"""
    response = requests.post(f"{BASE_URL}/auth/login", json={
        "email": email,
        "password": password
    })
    if response.status_code == 200:
        return response.json().get("token")
    else:
        raise Exception(f"Login failed for {email}: {response.status_code} - {response.text}")

def create_user(token, name, email, password, role="staff", department="Test Dept", phone="081234567890"):
    """Create a user via POST /api/users (requires admin token)"""
    response = requests.post(f"{BASE_URL}/users", 
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": name,
            "email": email,
            "password": password,
            "role": role,
            "department": department,
            "phone": phone
        }
    )
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"User creation failed: {response.status_code} - {response.text}")

def create_task(token, title, items, pic=None, documents=None):
    """Create a task via POST /api/tasks"""
    payload = {
        "title": title,
        "description": "Test task",
        "priority": "Medium",
        "items": items,
        "documents": documents or []
    }
    if pic:
        payload["pic"] = pic
    
    response = requests.post(f"{BASE_URL}/tasks",
        headers={"Authorization": f"Bearer {token}"},
        json=payload
    )
    return response

def update_task(token, task_id, **kwargs):
    """Update a task via PUT /api/tasks/{id}"""
    response = requests.put(f"{BASE_URL}/tasks/{task_id}",
        headers={"Authorization": f"Bearer {token}"},
        json=kwargs
    )
    return response

def get_task(token, task_id):
    """Get a task via GET /api/tasks/{id}"""
    response = requests.get(f"{BASE_URL}/tasks/{task_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    return response

def run_tests():
    """Run all backend tests"""
    print("=" * 80)
    print("FlowDesk Backend Test - Task Role & Validation Changes")
    print("=" * 80)
    print()
    
    # Setup: Login as admin
    print("SETUP: Logging in as admin...")
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    print(f"✓ Admin logged in successfully")
    print()
    
    # Setup: Create two test users (OWNER and PIC)
    print("SETUP: Creating test users...")
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    
    owner_email = f"owner_{timestamp}@test.com"
    pic_email = f"pic_{timestamp}@test.com"
    
    owner_user = create_user(admin_token, "Test Owner", owner_email, "password123", "staff", "Test Dept", "081111111111")
    pic_user = create_user(admin_token, "Test PIC", pic_email, "password123", "staff", "Test Dept", "082222222222")
    
    print(f"✓ Created OWNER user: {owner_user['name']} ({owner_user['email']}) - ID: {owner_user['id']}")
    print(f"✓ Created PIC user: {pic_user['name']} ({pic_user['email']}) - ID: {pic_user['id']}")
    print()
    
    # Login as OWNER and PIC
    print("SETUP: Logging in as test users...")
    owner_token = login(owner_email, "password123")
    pic_token = login(pic_email, "password123")
    print(f"✓ OWNER logged in successfully")
    print(f"✓ PIC logged in successfully")
    print()
    
    # ========================================================================
    # TEST GROUP A — Item required validation
    # ========================================================================
    print("=" * 80)
    print("TEST GROUP A — Item Required Validation")
    print("=" * 80)
    print()
    
    # Test A1: Create task with NO items -> expect 400
    print("Test A1: POST /api/tasks with NO items (items: [])")
    response = create_task(owner_token, "Task without items", items=[])
    passed = response.status_code == 400
    details = f"Status: {response.status_code}, Response: {response.text[:200]}"
    log_test("A", 1, "POST /api/tasks with NO items -> expect 400", passed, details)
    print()
    
    # Test A2: Create task WITH at least 1 item -> expect 200
    print("Test A2: POST /api/tasks WITH at least 1 item")
    pic_obj = {
        "user_id": pic_user['id'],
        "name": pic_user['name'],
        "email": pic_user['email'],
        "phone": pic_user['phone'],
        "department": pic_user['department']
    }
    response = create_task(owner_token, "Task with items", 
                          items=[{"title": "Item 1"}],
                          pic=pic_obj)
    passed = response.status_code == 200
    if passed:
        task_data = response.json()
        task_id = task_data['id']
        details = f"Status: {response.status_code}, Task ID: {task_id}"
    else:
        details = f"Status: {response.status_code}, Response: {response.text[:200]}"
        task_id = None
    log_test("A", 2, "POST /api/tasks WITH at least 1 item -> expect 200", passed, details)
    print()
    
    if not task_id:
        print("❌ Cannot continue tests without a valid task. Stopping.")
        return
    
    # Test A3: Owner tries to empty items -> expect 400
    print("Test A3: PUT /api/tasks/{id} with items: [] (as owner)")
    response = update_task(owner_token, task_id, items=[])
    passed = response.status_code == 400
    details = f"Status: {response.status_code}, Response: {response.text[:200]}"
    log_test("A", 3, "PUT /api/tasks/{id} with items: [] -> expect 400", passed, details)
    print()
    
    # ========================================================================
    # TEST GROUP B — PIC safe-merge permissions
    # ========================================================================
    print("=" * 80)
    print("TEST GROUP B — PIC Safe-Merge Permissions")
    print("=" * 80)
    print()
    
    # Get current task state
    response = get_task(owner_token, task_id)
    if response.status_code != 200:
        print(f"❌ Cannot get task {task_id}. Stopping.")
        return
    task = response.json()
    original_title = task['title']
    original_progress = task.get('progress', 0)
    item_id = task['items'][0]['id']
    
    # Test B4: PIC toggles first item done -> expect 200, progress increases
    print("Test B4: PIC toggles first item done")
    items_with_done = [{"id": item_id, "title": "Item 1", "done": True}]
    response = update_task(pic_token, task_id, items=items_with_done)
    passed = False
    if response.status_code == 200:
        updated_task = response.json()
        new_progress = updated_task.get('progress', 0)
        if new_progress > original_progress and updated_task.get('status') == 'Completed':
            passed = True
            details = f"Status: {response.status_code}, Progress: {original_progress}% -> {new_progress}%, Status: {updated_task.get('status')}"
        else:
            details = f"Status: {response.status_code}, but progress didn't increase correctly. Progress: {original_progress}% -> {new_progress}%"
    else:
        details = f"Status: {response.status_code}, Response: {response.text[:200]}"
    log_test("B", 4, "PIC toggles first item done -> progress increases, status Completed", passed, details)
    print()
    
    # Test B5: PIC attempts to change title -> title MUST remain unchanged
    print("Test B5: PIC attempts to change title")
    response = update_task(pic_token, task_id, title="HACKED")
    passed = False
    if response.status_code in [200, 403]:
        # Fetch task to verify title didn't change
        fetch_response = get_task(pic_token, task_id)
        if fetch_response.status_code == 200:
            fetched_task = fetch_response.json()
            if fetched_task['title'] == original_title and fetched_task['title'] != "HACKED":
                passed = True
                details = f"Title unchanged: '{fetched_task['title']}' (original: '{original_title}')"
            else:
                details = f"Title changed! Current: '{fetched_task['title']}', Original: '{original_title}'"
        else:
            details = f"Could not fetch task to verify. Status: {fetch_response.status_code}"
    else:
        details = f"Unexpected status: {response.status_code}, Response: {response.text[:200]}"
    log_test("B", 5, "PIC attempts to change title -> title MUST remain unchanged", passed, details)
    print()
    
    # Test B6: PIC attempts to delete an item -> item count MUST stay the same
    print("Test B6: PIC attempts to delete an item")
    response = update_task(pic_token, task_id, items=[])  # Try to send empty items
    passed = False
    # Fetch task to verify item count
    fetch_response = get_task(pic_token, task_id)
    if fetch_response.status_code == 200:
        fetched_task = fetch_response.json()
        if len(fetched_task['items']) == 1:  # Should still have 1 item
            passed = True
            details = f"Item count unchanged: {len(fetched_task['items'])} item(s)"
        else:
            details = f"Item count changed! Current: {len(fetched_task['items'])} items"
    else:
        details = f"Could not fetch task to verify. Status: {fetch_response.status_code}"
    log_test("B", 6, "PIC attempts to delete an item -> item count MUST stay the same", passed, details)
    print()
    
    # Test B7: PIC attempts to delete source document -> document MUST still exist
    print("Test B7: PIC attempts to delete source document")
    # First, as OWNER, add a source document
    print("  - Adding source document as OWNER...")
    doc = {
        "kind": "url",
        "url": "http://example.com/source",
        "label": "Source Doc 1",
        "responses": []
    }
    response = update_task(owner_token, task_id, documents=[doc])
    if response.status_code != 200:
        print(f"  ❌ Failed to add document as owner: {response.status_code}")
        log_test("B", 7, "PIC attempts to delete source document (setup failed)", False, "Could not add source document")
    else:
        print(f"  ✓ Source document added")
        # Now as PIC, try to delete it
        print("  - PIC attempting to delete document...")
        response = update_task(pic_token, task_id, documents=[])
        # Fetch task to verify document still exists
        fetch_response = get_task(pic_token, task_id)
        passed = False
        if fetch_response.status_code == 200:
            fetched_task = fetch_response.json()
            if len(fetched_task.get('documents', [])) == 1:
                passed = True
                details = f"Document still exists: {len(fetched_task['documents'])} document(s)"
            else:
                details = f"Document deleted! Current: {len(fetched_task.get('documents', []))} documents"
        else:
            details = f"Could not fetch task to verify. Status: {fetch_response.status_code}"
        log_test("B", 7, "PIC attempts to delete source document -> document MUST still exist", passed, details)
    print()
    
    # Test B8: PIC adds a response -> expect 200, response added with created_by == PIC user id
    print("Test B8: PIC adds a response (Dokumen Balasan)")
    # Get current task to get document id
    fetch_response = get_task(pic_token, task_id)
    if fetch_response.status_code != 200:
        print(f"  ❌ Cannot fetch task: {fetch_response.status_code}")
        log_test("B", 8, "PIC adds a response (cannot fetch task)", False, "Cannot fetch task")
    else:
        fetched_task = fetch_response.json()
        if len(fetched_task.get('documents', [])) == 0:
            print(f"  ❌ No documents found in task")
            log_test("B", 8, "PIC adds a response (no documents)", False, "No documents in task")
        else:
            doc_id = fetched_task['documents'][0]['id']
            existing_responses = fetched_task['documents'][0].get('responses', [])
            
            # PIC adds a response
            new_response = {
                "kind": "url",
                "url": "http://example.com/pic-response",
                "label": "PIC Response 1",
                "status": "revisi"
            }
            updated_doc = {
                "id": doc_id,
                "kind": fetched_task['documents'][0]['kind'],
                "url": fetched_task['documents'][0].get('url'),
                "label": fetched_task['documents'][0].get('label'),
                "responses": existing_responses + [new_response]
            }
            response = update_task(pic_token, task_id, documents=[updated_doc])
            passed = False
            if response.status_code == 200:
                # Fetch task to verify response was added with correct created_by
                verify_response = get_task(pic_token, task_id)
                if verify_response.status_code == 200:
                    verified_task = verify_response.json()
                    responses = verified_task['documents'][0].get('responses', [])
                    if len(responses) > len(existing_responses):
                        # Find the new response
                        new_resp = responses[-1]  # Last response should be the new one
                        if new_resp.get('created_by') == pic_user['id']:
                            passed = True
                            details = f"Response added with created_by={new_resp.get('created_by')} (PIC user id: {pic_user['id']})"
                        else:
                            details = f"Response added but created_by={new_resp.get('created_by')} != PIC user id {pic_user['id']}"
                    else:
                        details = f"Response not added. Count: {len(responses)}"
                else:
                    details = f"Could not verify response. Status: {verify_response.status_code}"
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:200]}"
            log_test("B", 8, "PIC adds a response -> created_by == PIC user id", passed, details)
    print()
    
    # Test B9: PIC deletes their OWN response -> expect it to be removed
    print("Test B9: PIC deletes their OWN response")
    fetch_response = get_task(pic_token, task_id)
    if fetch_response.status_code != 200:
        print(f"  ❌ Cannot fetch task: {fetch_response.status_code}")
        log_test("B", 9, "PIC deletes their OWN response (cannot fetch task)", False, "Cannot fetch task")
    else:
        fetched_task = fetch_response.json()
        doc_id = fetched_task['documents'][0]['id']
        responses = fetched_task['documents'][0].get('responses', [])
        
        # Find PIC's response
        pic_response = None
        for r in responses:
            if r.get('created_by') == pic_user['id']:
                pic_response = r
                break
        
        if not pic_response:
            print(f"  ❌ No PIC response found to delete")
            log_test("B", 9, "PIC deletes their OWN response (no PIC response found)", False, "No PIC response found")
        else:
            # Remove PIC's response
            remaining_responses = [r for r in responses if r.get('id') != pic_response.get('id')]
            updated_doc = {
                "id": doc_id,
                "kind": fetched_task['documents'][0]['kind'],
                "url": fetched_task['documents'][0].get('url'),
                "label": fetched_task['documents'][0].get('label'),
                "responses": remaining_responses
            }
            response = update_task(pic_token, task_id, documents=[updated_doc])
            passed = False
            if response.status_code == 200:
                # Verify response was removed
                verify_response = get_task(pic_token, task_id)
                if verify_response.status_code == 200:
                    verified_task = verify_response.json()
                    new_responses = verified_task['documents'][0].get('responses', [])
                    # Check if PIC's response is gone
                    pic_resp_still_exists = any(r.get('id') == pic_response.get('id') for r in new_responses)
                    if not pic_resp_still_exists:
                        passed = True
                        details = f"PIC's response removed. Responses count: {len(responses)} -> {len(new_responses)}"
                    else:
                        details = f"PIC's response still exists!"
                else:
                    details = f"Could not verify. Status: {verify_response.status_code}"
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:200]}"
            log_test("B", 9, "PIC deletes their OWN response -> removed", passed, details)
    print()
    
    # Test B10: Owner adds a response, then PIC tries to delete owner's response -> MUST remain
    print("Test B10: Owner adds a response, then PIC tries to delete it")
    # Owner adds a response
    print("  - Owner adding a response...")
    fetch_response = get_task(owner_token, task_id)
    if fetch_response.status_code != 200:
        print(f"  ❌ Cannot fetch task: {fetch_response.status_code}")
        log_test("B", 10, "Owner adds response, PIC tries to delete (cannot fetch task)", False, "Cannot fetch task")
    else:
        fetched_task = fetch_response.json()
        doc_id = fetched_task['documents'][0]['id']
        existing_responses = fetched_task['documents'][0].get('responses', [])
        
        owner_response = {
            "kind": "url",
            "url": "http://example.com/owner-response",
            "label": "Owner Response 1",
            "status": "final"
        }
        updated_doc = {
            "id": doc_id,
            "kind": fetched_task['documents'][0]['kind'],
            "url": fetched_task['documents'][0].get('url'),
            "label": fetched_task['documents'][0].get('label'),
            "responses": existing_responses + [owner_response]
        }
        response = update_task(owner_token, task_id, documents=[updated_doc])
        if response.status_code != 200:
            print(f"  ❌ Owner failed to add response: {response.status_code}")
            log_test("B", 10, "Owner adds response, PIC tries to delete (owner add failed)", False, "Owner could not add response")
        else:
            print(f"  ✓ Owner response added")
            # Get the owner response id
            verify_response = get_task(owner_token, task_id)
            verified_task = verify_response.json()
            owner_resp = verified_task['documents'][0]['responses'][-1]  # Last response
            owner_resp_id = owner_resp.get('id')
            
            # Now PIC tries to delete owner's response
            print("  - PIC attempting to delete owner's response...")
            current_responses = verified_task['documents'][0].get('responses', [])
            # Remove owner's response from the list
            pic_attempt_responses = [r for r in current_responses if r.get('id') != owner_resp_id]
            updated_doc = {
                "id": doc_id,
                "kind": verified_task['documents'][0]['kind'],
                "url": verified_task['documents'][0].get('url'),
                "label": verified_task['documents'][0].get('label'),
                "responses": pic_attempt_responses
            }
            response = update_task(pic_token, task_id, documents=[updated_doc])
            
            # Verify owner's response still exists
            final_response = get_task(pic_token, task_id)
            passed = False
            if final_response.status_code == 200:
                final_task = final_response.json()
                final_responses = final_task['documents'][0].get('responses', [])
                owner_resp_still_exists = any(r.get('id') == owner_resp_id for r in final_responses)
                if owner_resp_still_exists:
                    passed = True
                    details = f"Owner's response still exists (id: {owner_resp_id})"
                else:
                    details = f"Owner's response was deleted! (id: {owner_resp_id})"
            else:
                details = f"Could not verify. Status: {final_response.status_code}"
            log_test("B", 10, "PIC tries to delete owner's response -> MUST remain", passed, details)
    print()
    
    # ========================================================================
    # TEST GROUP C — Owner full control
    # ========================================================================
    print("=" * 80)
    print("TEST GROUP C — Owner Full Control")
    print("=" * 80)
    print()
    
    # Test C11: Owner changes title, priority, deadline -> expect 200 and changes applied
    print("Test C11: Owner changes title, priority, deadline")
    new_title = "Updated Task Title"
    new_priority = "High"
    new_deadline = (datetime.now() + timedelta(days=7)).isoformat()
    
    response = update_task(owner_token, task_id, 
                          title=new_title,
                          priority=new_priority,
                          deadline=new_deadline)
    passed = False
    if response.status_code == 200:
        updated_task = response.json()
        if (updated_task['title'] == new_title and 
            updated_task['priority'] == new_priority and 
            updated_task.get('deadline') is not None):
            passed = True
            details = f"Status: {response.status_code}, Title: '{updated_task['title']}', Priority: {updated_task['priority']}, Deadline set"
        else:
            details = f"Status: {response.status_code}, but changes not applied correctly. Title: '{updated_task['title']}', Priority: {updated_task['priority']}"
    else:
        details = f"Status: {response.status_code}, Response: {response.text[:200]}"
    log_test("C", 11, "Owner changes title, priority, deadline -> changes applied", passed, details)
    print()
    
    # ========================================================================
    # TEST GROUP D — 'result' field on task items
    # ========================================================================
    print("=" * 80)
    print("TEST GROUP D — 'result' Field on Task Items")
    print("=" * 80)
    print()
    
    # Create a new task for result field testing
    print("SETUP: Creating new task for result field testing...")
    timestamp_d = datetime.now().strftime("%Y%m%d%H%M%S")
    
    # Test D1: OWNER creates task with items containing result field
    print("Test D1: OWNER creates task with items containing result field")
    pic_obj_d = {
        "user_id": pic_user['id'],
        "name": pic_user['name'],
        "email": pic_user['email'],
        "phone": pic_user['phone'],
        "department": pic_user['department']
    }
    response = create_task(owner_token, f"Task Result Test {timestamp_d}", 
                          items=[{"title": "I1", "result": "hasil awal"}],
                          pic=pic_obj_d)
    passed = False
    if response.status_code == 200:
        task_d = response.json()
        task_d_id = task_d['id']
        # Verify result field is saved
        if task_d['items'][0].get('result') == "hasil awal":
            passed = True
            details = f"Status: {response.status_code}, Task ID: {task_d_id}, items[0].result = '{task_d['items'][0].get('result')}'"
        else:
            details = f"Status: {response.status_code}, but result field not saved correctly. items[0].result = '{task_d['items'][0].get('result')}'"
    else:
        details = f"Status: {response.status_code}, Response: {response.text[:200]}"
        task_d_id = None
    log_test("D", 1, "OWNER creates task with result field -> saved and readable", passed, details)
    print()
    
    if not task_d_id:
        print("❌ Cannot continue result field tests without a valid task. Skipping D2-D4.")
    else:
        # Get the item id for subsequent tests
        item_d_id = task_d['items'][0]['id']
        
        # Test D2: OWNER updates result field
        print("Test D2: OWNER updates result field")
        updated_items = [{"id": item_d_id, "title": "I1", "result": "hasil diperbarui owner"}]
        response = update_task(owner_token, task_d_id, items=updated_items)
        passed = False
        if response.status_code == 200:
            # Verify result was updated
            verify_response = get_task(owner_token, task_d_id)
            if verify_response.status_code == 200:
                verified_task = verify_response.json()
                if verified_task['items'][0].get('result') == "hasil diperbarui owner":
                    passed = True
                    details = f"Status: {response.status_code}, items[0].result = '{verified_task['items'][0].get('result')}'"
                else:
                    details = f"Result not updated correctly. items[0].result = '{verified_task['items'][0].get('result')}'"
            else:
                details = f"Could not verify. Status: {verify_response.status_code}"
        else:
            details = f"Status: {response.status_code}, Response: {response.text[:200]}"
        log_test("D", 2, "OWNER updates result field -> saved", passed, details)
        print()
        
        # Test D3: PIC updates result field (should be allowed)
        print("Test D3: PIC updates result field (should be allowed)")
        updated_items = [{"id": item_d_id, "title": "I1", "result": "hasil dari pic"}]
        response = update_task(pic_token, task_d_id, items=updated_items)
        passed = False
        if response.status_code == 200:
            # Verify result was updated by PIC
            verify_response = get_task(pic_token, task_d_id)
            if verify_response.status_code == 200:
                verified_task = verify_response.json()
                if verified_task['items'][0].get('result') == "hasil dari pic":
                    passed = True
                    details = f"Status: {response.status_code}, items[0].result = '{verified_task['items'][0].get('result')}' (PIC allowed to update)"
                else:
                    details = f"Result not updated correctly. items[0].result = '{verified_task['items'][0].get('result')}'"
            else:
                details = f"Could not verify. Status: {verify_response.status_code}"
        else:
            details = f"Status: {response.status_code}, Response: {response.text[:200]}"
        log_test("D", 3, "PIC updates result field -> saved (PIC allowed)", passed, details)
        print()
        
        # Test D4: PIC tries to change title AND result (title should remain, result should update)
        print("Test D4: PIC tries to change title AND result (title must remain I1, result should update)")
        # Get current state
        fetch_response = get_task(pic_token, task_d_id)
        if fetch_response.status_code != 200:
            print(f"  ❌ Cannot fetch task: {fetch_response.status_code}")
            log_test("D", 4, "PIC tries to change title AND result (cannot fetch task)", False, "Cannot fetch task")
        else:
            current_task = fetch_response.json()
            original_title_d = current_task['items'][0]['title']
            
            # PIC sends items with BOTH title changed and result changed
            updated_items = [{"id": item_d_id, "title": "TITLE HACK", "result": "hasil pic 2"}]
            response = update_task(pic_token, task_d_id, items=updated_items)
            passed = False
            if response.status_code == 200:
                # Verify title remains unchanged but result is updated
                verify_response = get_task(pic_token, task_d_id)
                if verify_response.status_code == 200:
                    verified_task = verify_response.json()
                    final_title = verified_task['items'][0]['title']
                    final_result = verified_task['items'][0].get('result')
                    
                    # Title must remain "I1", result should be "hasil pic 2"
                    if final_title == original_title_d and final_title != "TITLE HACK" and final_result == "hasil pic 2":
                        passed = True
                        details = f"Status: {response.status_code}, title unchanged: '{final_title}' (original: '{original_title_d}'), result updated: '{final_result}'"
                    else:
                        details = f"Title: '{final_title}' (expected: '{original_title_d}'), result: '{final_result}' (expected: 'hasil pic 2')"
                else:
                    details = f"Could not verify. Status: {verify_response.status_code}"
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:200]}"
            log_test("D", 4, "PIC tries to change title AND result -> title unchanged, result updated", passed, details)
        print()
    
    # ========================================================================
    # TEST GROUP E — 'result_docs' field (Lampiran Catatan) per item tugas
    # ========================================================================
    print("=" * 80)
    print("TEST GROUP E — 'result_docs' Field (Lampiran Catatan) per Item Tugas")
    print("=" * 80)
    print()
    
    # Create a new task for result_docs testing
    print("SETUP: Creating new task for result_docs testing...")
    timestamp_e = datetime.now().strftime("%Y%m%d%H%M%S")
    
    # Test E1: OWNER creates task with 1 item, PIC assigned
    print("Test E1: OWNER creates task with 1 item, PIC assigned")
    pic_obj_e = {
        "user_id": pic_user['id'],
        "name": pic_user['name'],
        "email": pic_user['email'],
        "phone": pic_user['phone'],
        "department": pic_user['department']
    }
    response = create_task(owner_token, f"Task Result Docs Test {timestamp_e}", 
                          items=[{"title": "I1"}],
                          pic=pic_obj_e)
    passed = False
    if response.status_code == 200:
        task_e = response.json()
        task_e_id = task_e['id']
        item_e_id = task_e['items'][0]['id']
        passed = True
        details = f"Status: {response.status_code}, Task ID: {task_e_id}, Item ID: {item_e_id}"
    else:
        details = f"Status: {response.status_code}, Response: {response.text[:200]}"
        task_e_id = None
        item_e_id = None
    log_test("E", 1, "OWNER creates task with 1 item, PIC assigned -> 200", passed, details)
    print()
    
    if not task_e_id:
        print("❌ Cannot continue result_docs tests without a valid task. Skipping E2-E6.")
    else:
        # Test E2: PIC adds result_doc, verify created_by == PIC id
        print("Test E2: PIC adds result_doc to items[0].result_docs")
        # Get current task state
        fetch_response = get_task(pic_token, task_e_id)
        if fetch_response.status_code != 200:
            print(f"  ❌ Cannot fetch task: {fetch_response.status_code}")
            log_test("E", 2, "PIC adds result_doc (cannot fetch task)", False, "Cannot fetch task")
        else:
            current_task = fetch_response.json()
            pic_result_doc = {
                "kind": "url",
                "url": "http://pic-doc",
                "label": "Hasil PIC",
                "responses": []
            }
            updated_items = [{
                "id": item_e_id,
                "title": "I1",
                "result_docs": [pic_result_doc]
            }]
            response = update_task(pic_token, task_e_id, items=updated_items)
            passed = False
            if response.status_code == 200:
                # Verify result_doc was added with correct created_by
                verify_response = get_task(pic_token, task_e_id)
                if verify_response.status_code == 200:
                    verified_task = verify_response.json()
                    result_docs = verified_task['items'][0].get('result_docs', [])
                    if len(result_docs) == 1:
                        doc = result_docs[0]
                        if doc.get('created_by') == pic_user['id']:
                            passed = True
                            details = f"Status: {response.status_code}, result_docs count: 1, created_by: {doc.get('created_by')} (PIC user id: {pic_user['id']})"
                        else:
                            details = f"result_doc added but created_by={doc.get('created_by')} != PIC user id {pic_user['id']}"
                    else:
                        details = f"result_docs count: {len(result_docs)} (expected 1)"
                else:
                    details = f"Could not verify. Status: {verify_response.status_code}"
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:200]}"
            log_test("E", 2, "PIC adds result_doc -> created_by == PIC user id", passed, details)
        print()
        
        # Test E3: OWNER adds another result_doc, verify both exist with correct created_by
        print("Test E3: OWNER adds another result_doc (2 result_docs total)")
        fetch_response = get_task(owner_token, task_e_id)
        if fetch_response.status_code != 200:
            print(f"  ❌ Cannot fetch task: {fetch_response.status_code}")
            log_test("E", 3, "OWNER adds result_doc (cannot fetch task)", False, "Cannot fetch task")
        else:
            current_task = fetch_response.json()
            existing_result_docs = current_task['items'][0].get('result_docs', [])
            owner_result_doc = {
                "kind": "url",
                "url": "http://owner-doc",
                "label": "Ref Owner",
                "responses": []
            }
            # Include existing PIC doc with its id and created_by
            updated_items = [{
                "id": item_e_id,
                "title": "I1",
                "result_docs": existing_result_docs + [owner_result_doc]
            }]
            response = update_task(owner_token, task_e_id, items=updated_items)
            passed = False
            if response.status_code == 200:
                # Verify both result_docs exist
                verify_response = get_task(owner_token, task_e_id)
                if verify_response.status_code == 200:
                    verified_task = verify_response.json()
                    result_docs = verified_task['items'][0].get('result_docs', [])
                    if len(result_docs) == 2:
                        # Find PIC and OWNER docs
                        pic_doc = next((d for d in result_docs if d.get('created_by') == pic_user['id']), None)
                        owner_doc = next((d for d in result_docs if d.get('created_by') == owner_user['id']), None)
                        if pic_doc and owner_doc:
                            passed = True
                            details = f"Status: {response.status_code}, result_docs count: 2, PIC doc created_by: {pic_doc.get('created_by')}, OWNER doc created_by: {owner_doc.get('created_by')}"
                        else:
                            details = f"result_docs count: 2, but created_by not set correctly. PIC doc: {pic_doc is not None}, OWNER doc: {owner_doc is not None}"
                    else:
                        details = f"result_docs count: {len(result_docs)} (expected 2)"
                else:
                    details = f"Could not verify. Status: {verify_response.status_code}"
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:200]}"
            log_test("E", 3, "OWNER adds result_doc -> 2 result_docs with correct created_by", passed, details)
        print()
        
        # Test E4: PIC tries to DELETE OWNER's result_doc -> should fail (owner doc remains)
        print("Test E4: PIC tries to DELETE OWNER's result_doc (should fail)")
        fetch_response = get_task(pic_token, task_e_id)
        if fetch_response.status_code != 200:
            print(f"  ❌ Cannot fetch task: {fetch_response.status_code}")
            log_test("E", 4, "PIC tries to delete OWNER's result_doc (cannot fetch task)", False, "Cannot fetch task")
        else:
            current_task = fetch_response.json()
            result_docs = current_task['items'][0].get('result_docs', [])
            # Find PIC's doc only (exclude OWNER's doc)
            pic_docs_only = [d for d in result_docs if d.get('created_by') == pic_user['id']]
            owner_doc_id = next((d.get('id') for d in result_docs if d.get('created_by') == owner_user['id']), None)
            
            # PIC sends only their own doc (trying to delete OWNER's doc)
            updated_items = [{
                "id": item_e_id,
                "title": "I1",
                "result_docs": pic_docs_only
            }]
            response = update_task(pic_token, task_e_id, items=updated_items)
            
            # Verify OWNER's doc still exists
            verify_response = get_task(pic_token, task_e_id)
            passed = False
            if verify_response.status_code == 200:
                verified_task = verify_response.json()
                result_docs_after = verified_task['items'][0].get('result_docs', [])
                owner_doc_still_exists = any(d.get('id') == owner_doc_id for d in result_docs_after)
                if owner_doc_still_exists and len(result_docs_after) >= 2:
                    passed = True
                    details = f"OWNER's result_doc still exists (id: {owner_doc_id}), result_docs count: {len(result_docs_after)} (PIC cannot delete others' docs)"
                else:
                    details = f"OWNER's result_doc deleted! result_docs count: {len(result_docs_after)}, owner_doc_exists: {owner_doc_still_exists}"
            else:
                details = f"Could not verify. Status: {verify_response.status_code}"
            log_test("E", 4, "PIC tries to delete OWNER's result_doc -> MUST remain", passed, details)
        print()
        
        # Test E5: PIC DELETES their OWN result_doc -> should succeed
        print("Test E5: PIC DELETES their OWN result_doc (should succeed)")
        fetch_response = get_task(pic_token, task_e_id)
        if fetch_response.status_code != 200:
            print(f"  ❌ Cannot fetch task: {fetch_response.status_code}")
            log_test("E", 5, "PIC deletes their OWN result_doc (cannot fetch task)", False, "Cannot fetch task")
        else:
            current_task = fetch_response.json()
            result_docs = current_task['items'][0].get('result_docs', [])
            # Find OWNER's doc only (exclude PIC's doc)
            owner_docs_only = [d for d in result_docs if d.get('created_by') == owner_user['id']]
            pic_doc_id = next((d.get('id') for d in result_docs if d.get('created_by') == pic_user['id']), None)
            
            # PIC sends only OWNER's doc (excluding their own doc = deleting their own)
            updated_items = [{
                "id": item_e_id,
                "title": "I1",
                "result_docs": owner_docs_only
            }]
            response = update_task(pic_token, task_e_id, items=updated_items)
            
            # Verify PIC's doc is removed, OWNER's doc remains
            verify_response = get_task(pic_token, task_e_id)
            passed = False
            if verify_response.status_code == 200:
                verified_task = verify_response.json()
                result_docs_after = verified_task['items'][0].get('result_docs', [])
                pic_doc_removed = not any(d.get('id') == pic_doc_id for d in result_docs_after)
                owner_doc_remains = any(d.get('created_by') == owner_user['id'] for d in result_docs_after)
                if pic_doc_removed and owner_doc_remains and len(result_docs_after) == 1:
                    passed = True
                    details = f"PIC's result_doc removed (id: {pic_doc_id}), OWNER's doc remains, result_docs count: {len(result_docs_after)}"
                else:
                    details = f"PIC doc removed: {pic_doc_removed}, OWNER doc remains: {owner_doc_remains}, result_docs count: {len(result_docs_after)}"
            else:
                details = f"Could not verify. Status: {verify_response.status_code}"
            log_test("E", 5, "PIC deletes their OWN result_doc -> removed, OWNER's remains", passed, details)
        print()
        
        # Test E6: Regression - PIC cannot change title or add documents (source)
        print("Test E6: Regression - PIC cannot change title or add documents (source)")
        fetch_response = get_task(pic_token, task_e_id)
        if fetch_response.status_code != 200:
            print(f"  ❌ Cannot fetch task: {fetch_response.status_code}")
            log_test("E", 6, "Regression test (cannot fetch task)", False, "Cannot fetch task")
        else:
            current_task = fetch_response.json()
            original_title_e = current_task['items'][0]['title']
            original_docs_count = len(current_task['items'][0].get('documents', []))
            
            # PIC tries to change title AND add source document
            updated_items = [{
                "id": item_e_id,
                "title": "HACK",
                "documents": [{"kind": "url", "url": "http://hack-doc", "label": "Hack Doc", "responses": []}]
            }]
            response = update_task(pic_token, task_e_id, items=updated_items)
            
            # Verify title unchanged and documents not added
            verify_response = get_task(pic_token, task_e_id)
            passed = False
            if verify_response.status_code == 200:
                verified_task = verify_response.json()
                final_title = verified_task['items'][0]['title']
                final_docs_count = len(verified_task['items'][0].get('documents', []))
                
                if final_title == original_title_e and final_title != "HACK" and final_docs_count == original_docs_count:
                    passed = True
                    details = f"Title unchanged: '{final_title}' (original: '{original_title_e}'), documents count unchanged: {final_docs_count}"
                else:
                    details = f"Title: '{final_title}' (expected: '{original_title_e}'), documents count: {final_docs_count} (expected: {original_docs_count})"
            else:
                details = f"Could not verify. Status: {verify_response.status_code}"
            log_test("E", 6, "Regression: PIC cannot change title or add source documents", passed, details)
        print()
    
    # ========================================================================
    # TEST GROUP F — Two-stage checklist: pic_done (PIC marks) & done (OWNER approves)
    # ========================================================================
    print("=" * 80)
    print("TEST GROUP F — Two-Stage Checklist (pic_done & done)")
    print("=" * 80)
    print()
    
    # Create a new task for two-stage checklist testing
    print("SETUP: Creating new task for two-stage checklist testing...")
    timestamp_f = datetime.now().strftime("%Y%m%d%H%M%S")
    
    # Test F1: OWNER creates task with 1 item, verify pic_done=false, done=false, progress=0
    print("Test F1: OWNER creates task with 1 item -> pic_done=false, done=false, progress=0")
    pic_obj_f = {
        "user_id": pic_user['id'],
        "name": pic_user['name'],
        "email": pic_user['email'],
        "phone": pic_user['phone'],
        "department": pic_user['department']
    }
    response = create_task(owner_token, f"Task Two-Stage Test {timestamp_f}", 
                          items=[{"title": "I1"}],
                          pic=pic_obj_f)
    passed = False
    if response.status_code == 200:
        task_f = response.json()
        task_f_id = task_f['id']
        item_f = task_f['items'][0]
        item_f_id = item_f['id']
        
        # Verify initial state
        if (item_f.get('pic_done') == False and 
            item_f.get('done') == False and 
            task_f.get('progress') == 0):
            passed = True
            details = f"Status: 200, Task ID: {task_f_id}, items[0].pic_done={item_f.get('pic_done')}, items[0].done={item_f.get('done')}, progress={task_f.get('progress')}"
        else:
            details = f"Initial state incorrect: pic_done={item_f.get('pic_done')}, done={item_f.get('done')}, progress={task_f.get('progress')}"
    else:
        details = f"Status: {response.status_code}, Response: {response.text[:200]}"
        task_f_id = None
        item_f_id = None
    log_test("F", 1, "OWNER creates task -> pic_done=false, done=false, progress=0", passed, details)
    print()
    
    if not task_f_id:
        print("❌ Cannot continue two-stage checklist tests without a valid task. Skipping F2-F8.")
    else:
        # Test F2: OWNER tries done=true while pic_done=false -> done must stay false
        print("Test F2: OWNER tries done=true while pic_done=false -> done must stay false")
        updated_items = [{"id": item_f_id, "title": "I1", "done": True}]
        response = update_task(owner_token, task_f_id, items=updated_items)
        
        # Fetch task to verify done stayed false
        verify_response = get_task(owner_token, task_f_id)
        passed = False
        if verify_response.status_code == 200:
            verified_task = verify_response.json()
            item = verified_task['items'][0]
            if item.get('done') == False and verified_task.get('progress') == 0:
                passed = True
                details = f"items[0].done={item.get('done')} (stayed false), progress={verified_task.get('progress')} (owner cannot approve before PIC marks done)"
            else:
                details = f"FAILED: items[0].done={item.get('done')} (should be false), progress={verified_task.get('progress')}"
        else:
            details = f"Could not verify. Status: {verify_response.status_code}"
        log_test("F", 2, "OWNER tries done=true while pic_done=false -> done stays false", passed, details)
        print()
        
        # Test F3: PIC sets pic_done=true -> verify pic_done=true, done=false, pic_done_at set, progress=0
        print("Test F3: PIC sets pic_done=true -> pic_done=true, done=false, pic_done_at set, progress=0")
        updated_items = [{"id": item_f_id, "title": "I1", "pic_done": True}]
        response = update_task(pic_token, task_f_id, items=updated_items)
        
        # Fetch task to verify
        verify_response = get_task(pic_token, task_f_id)
        passed = False
        if verify_response.status_code == 200:
            verified_task = verify_response.json()
            item = verified_task['items'][0]
            if (item.get('pic_done') == True and 
                item.get('done') == False and 
                item.get('pic_done_at') is not None and
                verified_task.get('progress') == 0):
                passed = True
                details = f"items[0].pic_done={item.get('pic_done')}, items[0].done={item.get('done')}, pic_done_at={item.get('pic_done_at')[:19] if item.get('pic_done_at') else None}, progress={verified_task.get('progress')}"
            else:
                details = f"FAILED: pic_done={item.get('pic_done')}, done={item.get('done')}, pic_done_at={item.get('pic_done_at')}, progress={verified_task.get('progress')}"
        else:
            details = f"Could not verify. Status: {verify_response.status_code}"
        log_test("F", 3, "PIC sets pic_done=true -> verified, progress still 0", passed, details)
        print()
        
        # Test F4: PIC tries done=true (attempt approval) -> done must stay false
        print("Test F4: PIC tries done=true (attempt approval) -> done must stay false")
        updated_items = [{"id": item_f_id, "title": "I1", "pic_done": True, "done": True}]
        response = update_task(pic_token, task_f_id, items=updated_items)
        
        # Fetch task to verify done stayed false
        verify_response = get_task(pic_token, task_f_id)
        passed = False
        if verify_response.status_code == 200:
            verified_task = verify_response.json()
            item = verified_task['items'][0]
            if item.get('done') == False:
                passed = True
                details = f"items[0].done={item.get('done')} (stayed false, PIC cannot approve)"
            else:
                details = f"FAILED: items[0].done={item.get('done')} (should be false)"
        else:
            details = f"Could not verify. Status: {verify_response.status_code}"
        log_test("F", 4, "PIC tries done=true -> done stays false (PIC cannot approve)", passed, details)
        print()
        
        # Test F5: OWNER sets done=true -> verify done=true, approved_by set, progress=100, status=Completed
        print("Test F5: OWNER sets done=true -> done=true, approved_by set, progress=100, status=Completed")
        updated_items = [{"id": item_f_id, "title": "I1", "done": True}]
        response = update_task(owner_token, task_f_id, items=updated_items)
        
        # Fetch task to verify
        verify_response = get_task(owner_token, task_f_id)
        passed = False
        if verify_response.status_code == 200:
            verified_task = verify_response.json()
            item = verified_task['items'][0]
            if (item.get('done') == True and 
                item.get('approved_by') == owner_user['name'] and
                verified_task.get('progress') == 100 and
                verified_task.get('status') == 'Completed'):
                passed = True
                details = f"items[0].done={item.get('done')}, approved_by='{item.get('approved_by')}', progress={verified_task.get('progress')}, status='{verified_task.get('status')}'"
            else:
                details = f"FAILED: done={item.get('done')}, approved_by='{item.get('approved_by')}', progress={verified_task.get('progress')}, status='{verified_task.get('status')}'"
        else:
            details = f"Could not verify. Status: {verify_response.status_code}"
        log_test("F", 5, "OWNER sets done=true -> approved, progress=100, status=Completed", passed, details)
        print()
        
        # Test F6: OWNER tries pic_done=false while approved -> pic_done must stay true
        print("Test F6: OWNER tries pic_done=false while approved -> pic_done must stay true")
        updated_items = [{"id": item_f_id, "title": "I1", "pic_done": False, "done": True}]
        response = update_task(owner_token, task_f_id, items=updated_items)
        
        # Fetch task to verify pic_done stayed true
        verify_response = get_task(owner_token, task_f_id)
        passed = False
        if verify_response.status_code == 200:
            verified_task = verify_response.json()
            item = verified_task['items'][0]
            if item.get('pic_done') == True:
                passed = True
                details = f"items[0].pic_done={item.get('pic_done')} (stayed true, owner cannot alter pic_done)"
            else:
                details = f"FAILED: items[0].pic_done={item.get('pic_done')} (should be true)"
        else:
            details = f"Could not verify. Status: {verify_response.status_code}"
        log_test("F", 6, "OWNER tries pic_done=false while approved -> pic_done stays true", passed, details)
        print()
        
        # Test F7: OWNER sets done=false (unapprove) -> verify done=false, progress=0
        print("Test F7: OWNER sets done=false (unapprove) -> done=false, progress=0")
        updated_items = [{"id": item_f_id, "title": "I1", "done": False}]
        response = update_task(owner_token, task_f_id, items=updated_items)
        
        # Fetch task to verify
        verify_response = get_task(owner_token, task_f_id)
        passed = False
        if verify_response.status_code == 200:
            verified_task = verify_response.json()
            item = verified_task['items'][0]
            if item.get('done') == False and verified_task.get('progress') == 0:
                passed = True
                details = f"items[0].done={item.get('done')}, progress={verified_task.get('progress')} (unapproved successfully)"
            else:
                details = f"FAILED: done={item.get('done')}, progress={verified_task.get('progress')}"
        else:
            details = f"Could not verify. Status: {verify_response.status_code}"
        log_test("F", 7, "OWNER sets done=false (unapprove) -> done=false, progress=0", passed, details)
        print()
        
        # Test F8: OWNER adds new item with done=true, pic_done=true -> new item must have both false
        print("Test F8: OWNER adds new item with done=true, pic_done=true -> new item must have both false")
        # Get current task to include existing item
        fetch_response = get_task(owner_token, task_f_id)
        if fetch_response.status_code != 200:
            print(f"  ❌ Cannot fetch task: {fetch_response.status_code}")
            log_test("F", 8, "OWNER adds new item (cannot fetch task)", False, "Cannot fetch task")
        else:
            current_task = fetch_response.json()
            existing_item = current_task['items'][0]
            
            # Add a new item with done=true and pic_done=true (should be rejected)
            new_item = {"title": "I2", "done": True, "pic_done": True}
            updated_items = [existing_item, new_item]
            response = update_task(owner_token, task_f_id, items=updated_items)
            
            # Fetch task to verify new item has done=false and pic_done=false
            verify_response = get_task(owner_token, task_f_id)
            passed = False
            if verify_response.status_code == 200:
                verified_task = verify_response.json()
                if len(verified_task['items']) == 2:
                    new_item_result = verified_task['items'][1]
                    if new_item_result.get('done') == False and new_item_result.get('pic_done') == False:
                        passed = True
                        details = f"New item I2: done={new_item_result.get('done')}, pic_done={new_item_result.get('pic_done')} (new items cannot be pre-approved/pre-marked)"
                    else:
                        details = f"FAILED: New item I2: done={new_item_result.get('done')}, pic_done={new_item_result.get('pic_done')} (should both be false)"
                else:
                    details = f"FAILED: Item count={len(verified_task['items'])} (expected 2)"
            else:
                details = f"Could not verify. Status: {verify_response.status_code}"
            log_test("F", 8, "OWNER adds new item with done=true, pic_done=true -> both false", passed, details)
        print()
    
    # ========================================================================
    # SUMMARY
    # ========================================================================
    print("=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print()
    
    total_tests = len(test_results)
    passed_tests = sum(1 for r in test_results if r['passed'])
    failed_tests = total_tests - passed_tests
    
    print(f"Total Tests: {total_tests}")
    print(f"Passed: {passed_tests}")
    print(f"Failed: {failed_tests}")
    print()
    
    if failed_tests > 0:
        print("FAILED TESTS:")
        for r in test_results:
            if not r['passed']:
                print(f"  {r['status']} - {r['group']} Test {r['test']}: {r['description']}")
                if r['details']:
                    print(f"    Details: {r['details']}")
        print()
    
    print("ALL TESTS:")
    for r in test_results:
        print(f"  {r['status']} - {r['group']} Test {r['test']}: {r['description']}")
    print()
    
    return passed_tests == total_tests

if __name__ == "__main__":
    try:
        success = run_tests()
        exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
