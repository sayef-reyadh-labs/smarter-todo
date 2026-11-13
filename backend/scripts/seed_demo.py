# Fills a running Smarter Todo API with demo data through its public endpoints.
# Usage: python scripts/seed_demo.py [base_url]   (default http://localhost:8000)
import json
import random
import sys
import urllib.error
import urllib.request
from datetime import date, timedelta

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000").rstrip("/")
PASSWORD = "12345678"
NAMES = ["Ava Chen", "Liam Patel", "Noah Khan", "Mia Rossi", "Ethan Roy", "Zoe Ahmed", "Lucas Kim", "Sara Lopez", "Omar Haddad", "Nina Das"]
CATEGORIES = ["Study", "Work", "Home", "Fitness"]
TASKS = [
    "Read chapter {n}", "Finish assignment {n}", "Email the professor", "Prepare slides", "Buy groceries", "Clean the desk",
    "Go for a run", "Pay the bills", "Plan the weekend", "Review notes", "Book a dentist visit", "Call mom",
    "Fix the bug in project", "Submit the report", "Backup the laptop", "Practice presentation",
]
GROUP_TASKS = ["Draft the outline", "Collect the data", "Design the poster", "Write the intro", "Review the code", "Book the meeting room", "Record the demo", "Proofread"]
GROUPS = ["Database Project", "Study Circle", "Hackathon Team", "Thesis Group", "Weekend Football", "Book Club"]

random.seed(7)


def call(method, path, token=None, body=None):
    req = urllib.request.Request(BASE + path, method=method, data=json.dumps(body).encode() if body is not None else None)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            text = resp.read().decode()
            return resp.status, (json.loads(text) if text else None)
    except urllib.error.HTTPError as err:
        text = err.read().decode()
        return err.code, (json.loads(text) if text.startswith("{") else text)


def ok(status, what):
    if status >= 400:
        raise SystemExit(f"{what} failed with {status}")


users = []
for i, name in enumerate(NAMES, start=1):
    email = f"demo{i:02d}@example.com"
    status, _ = call("POST", "/api/v1/auth/signup", body={"email": email, "name": name, "password": PASSWORD})
    if status not in (201, 409):
        raise SystemExit(f"signup {email} failed with {status}")
    status, tokens = call("POST", "/api/v1/auth/login", body={"email": email, "password": PASSWORD})
    ok(status, f"login {email}")
    token = tokens["access_token"]
    _, me = call("GET", "/api/v1/users/me", token)
    users.append({"email": email, "name": name, "token": token, "id": me["id"]})

for user in users:
    categories = []
    for name in random.sample(CATEGORIES, 3):
        status, cat = call("POST", "/api/v1/categories", user["token"], {"name": name})
        if status == 201:
            categories.append(cat["id"])
    for n in range(random.randint(10, 14)):
        due = None if random.random() < 0.3 else (date.today() + timedelta(days=random.randint(0, 20))).isoformat()
        body = {
            "title": random.choice(TASKS).format(n=random.randint(1, 12)),
            "description": random.choice(["", "", "Needs a quiet hour.", "Do it before the weekend.", "Ask a friend for help if stuck."]),
            "due_date": due,
            "category_id": random.choice(categories + [None]) if categories else None,
        }
        status, task = call("POST", "/api/v1/tasks", user["token"], body)
        ok(status, "create task")
        if random.random() < 0.35:
            call("PATCH", f"/api/v1/tasks/{task['id']}", user["token"], {"is_completed": True})

# Each group has an owner and 3-5 other members; some members get fewer permissions.
for index, group_name in enumerate(GROUPS):
    owner = users[index % len(users)]
    status, group = call("POST", "/api/v1/groups", owner["token"], {"name": group_name})
    ok(status, "create group")
    members = random.sample([u for u in users if u is not owner], random.randint(3, 5))
    for member in members:
        status, _ = call("POST", f"/api/v1/groups/{group['id']}/members", owner["token"], {"email": member["email"]})
        ok(status, "add member")
    limited = members[0]
    call("PATCH", f"/api/v1/groups/{group['id']}/members/{limited['id']}/permissions", owner["token"], {"permissions": ["group:tasks:update"]})
    people = [owner, *members[1:]]
    for title in random.sample(GROUP_TASKS, random.randint(4, 6)):
        creator = random.choice(people)
        assignee = random.choice([None, *[u["id"] for u in [owner, *members]]])
        due = (date.today() + timedelta(days=random.randint(1, 25))).isoformat()
        status, task = call("POST", f"/api/v1/groups/{group['id']}/tasks", creator["token"], {"title": title, "due_date": due, "assignee_id": assignee})
        ok(status, "create group task")
        if random.random() < 0.3:
            call("PATCH", f"/api/v1/groups/{group['id']}/tasks/{task['id']}", owner["token"], {"is_completed": True})

print(f"Seeded {len(users)} users (demo01..demo{len(users):02d}@example.com, password {PASSWORD}), tasks, categories and {len(GROUPS)} groups at {BASE}")
