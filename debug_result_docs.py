#!/usr/bin/env python3
"""Debug script to check result_docs behavior"""

import requests
import json
from datetime import datetime

BASE_URL = "https://flowdesk-preview-5.preview.emergentagent.com/api"
ADMIN_EMAIL = "sa@bprbangunarta.co.id"
ADMIN_PASSWORD = "SA@4dm1n"

def login(email, password):
    response = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    return response.json().get("token")

def create_user(token, name, email, password):
    response = requests.post(f"{BASE_URL}/users", 
        headers={"Authorization": f"Bearer {token}"},
        json={"name": name, "email": email, "password": password, "role": "staff", "department": "Test", "phone": "081234567890"}
    )
    return response.json()

def create_task(token, title, items, pic=None):
    payload = {"title": title, "description": "Test", "priority": "Medium", "items": items}
    if pic:
        payload["pic"] = pic
    response = requests.post(f"{BASE_URL}/tasks", headers={"Authorization": f"Bearer {token}"}, json=payload)
    return response.json()

def update_task(token, task_id, **kwargs):
    response = requests.put(f"{BASE_URL}/tasks/{task_id}", headers={"Authorization": f"Bearer {token}"}, json=kwargs)
    return response.json()

def get_task(token, task_id):
    response = requests.get(f"{BASE_URL}/tasks/{task_id}", headers={"Authorization": f"Bearer {token}"})
    return response.json()

# Setup
print("Setting up...")
admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
timestamp = datetime.now().strftime("%Y%m%d%H%M%S")

owner_email = f"owner_debug_{timestamp}@test.com"
pic_email = f"pic_debug_{timestamp}@test.com"

owner_user = create_user(admin_token, "Debug Owner", owner_email, "password123")
pic_user = create_user(admin_token, "Debug PIC", pic_email, "password123")

owner_token = login(owner_email, "password123")
pic_token = login(pic_email, "password123")

print(f"OWNER ID: {owner_user['id']}")
print(f"PIC ID: {pic_user['id']}")
print()

# Create task
pic_obj = {
    "user_id": pic_user['id'],
    "name": pic_user['name'],
    "email": pic_user['email'],
    "phone": pic_user['phone'],
    "department": pic_user['department']
}
task = create_task(owner_token, f"Debug Task {timestamp}", items=[{"title": "I1"}], pic=pic_obj)
task_id = task['id']
item_id = task['items'][0]['id']
print(f"Task created: {task_id}")
print(f"Item ID: {item_id}")
print()

# PIC adds result_doc
print("Step 1: PIC adds result_doc")
pic_doc = {"kind": "url", "url": "http://pic-doc", "label": "PIC Doc", "responses": []}
updated_items = [{"id": item_id, "title": "I1", "result_docs": [pic_doc]}]
task = update_task(pic_token, task_id, items=updated_items)
print(f"Result docs after PIC add: {json.dumps(task['items'][0].get('result_docs', []), indent=2)}")
print()

# OWNER adds result_doc
print("Step 2: OWNER adds result_doc")
task = get_task(owner_token, task_id)
existing_result_docs = task['items'][0].get('result_docs', [])
print(f"Existing result_docs before OWNER add: {json.dumps(existing_result_docs, indent=2)}")

owner_doc = {"kind": "url", "url": "http://owner-doc", "label": "Owner Doc", "responses": []}
updated_items = [{"id": item_id, "title": "I1", "result_docs": existing_result_docs + [owner_doc]}]
task = update_task(owner_token, task_id, items=updated_items)
print(f"Result docs after OWNER add: {json.dumps(task['items'][0].get('result_docs', []), indent=2)}")
print()

# Check created_by values
result_docs = task['items'][0].get('result_docs', [])
for i, doc in enumerate(result_docs):
    print(f"Doc {i}: created_by={doc.get('created_by')}, label={doc.get('label')}")
print()

# PIC tries to delete OWNER's doc
print("Step 3: PIC tries to delete OWNER's doc")
task = get_task(pic_token, task_id)
result_docs = task['items'][0].get('result_docs', [])
pic_docs_only = [d for d in result_docs if d.get('created_by') == pic_user['id']]
print(f"PIC sending result_docs (only PIC's docs): {json.dumps(pic_docs_only, indent=2)}")

updated_items = [{"id": item_id, "title": "I1", "result_docs": pic_docs_only}]
task = update_task(pic_token, task_id, items=updated_items)
print(f"Result docs after PIC delete attempt: {json.dumps(task['items'][0].get('result_docs', []), indent=2)}")
print()

# Check if OWNER's doc still exists
result_docs = task['items'][0].get('result_docs', [])
owner_doc_exists = any(d.get('label') == 'Owner Doc' for d in result_docs)
print(f"OWNER's doc still exists: {owner_doc_exists}")
print(f"Total result_docs: {len(result_docs)}")
