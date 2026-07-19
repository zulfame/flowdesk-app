# FlowDesk — PRD

## Original Problem Statement
FlowDesk: a lightweight Internal Work Management System (NOT project management / ticketing / todo). "Simple for users, powerful behind the scenes." UI in Indonesian, code in English. Desktop-first, responsive, dark & light mode. Max 3-click rule.

## Architecture
- **Stack**: React 19 (CRA/craco) + FastAPI + MongoDB (motor). JWT Bearer auth. Emergent Object Storage for attachments.
- **Backend**: modular service-layer architecture under `/app/backend`:
  - `server.py` wires all routers under `/api`, seeds admin, creates indexes, inits storage.
  - `security.py` (JWT, bcrypt, get_current_user, require_admin), `db.py`, `storage.py`, `helpers.py` (activity logger), `notifications.py` (Telegram/SMTP/WhatsApp URL), `services.py` (cascade deletes — no orphan files/data).
  - `routers/`: auth, users (users+roles), tasks, meetings (+action items), reminders, notes, attachments, feeds (notifications+activity log), aggregate (dashboard+calendar+events+search), settings.
- **Frontend** `/app/frontend/src`: AuthContext + ThemeContext, Layout (collapsible sidebar, topbar, Cmd+K global search, notifications, theme toggle), pages for every module.

## User Personas
- Admin: manages users, roles, system configuration.
- Manager/Member: create & manage tasks, meetings, reminders, notes.

## Core Requirements (static)
- Task = one work request (title, description, requester, PIC, priority, deadline, checklist, attachments, comments, history, progress, status).
- Progress auto-calculated from checklist; status auto-derived (Draft/Pending/On Progress/Completed/Overdue/Cancelled/Archived).
- Meeting = digital notebook (agenda, rich-text notes, decisions, participants, action items, attachments). Action item → Task in one click with bidirectional link.
- Unified calendar (meetings + task deadlines + reminders + events). Reminders (today/tomorrow/custom/recurring). Notes (rich text). Notification center. Activity log (audit). Attachment manager (object storage, soft-delete, cascade). RBAC. System configuration. Global search.

## Implemented (2026-07-19)
- ✅ JWT auth (login/register/me/logout), admin seed, brute-force lockout, RBAC.
- ✅ Tasks: CRUD, auto progress + auto status, checklist, comments, history, attachments, delete cascade.
- ✅ Meetings: CRUD, rich-text notes/decisions, action items, one-click convert to Task (bidirectional link), generated tasks list, attachments.
- ✅ Calendar (aggregated), Reminders, Notes (rich text, pin, tags, color), Notifications, Activity Log, Users & Roles, Settings (General/Email/Telegram/Notification/Storage/Application) with test-notification, Global Search.
- ✅ Attachments via Emergent Object Storage (upload/list/download/soft-delete).
- ✅ Dark/light theme, Indonesian UI, elegant design (Cabinet Grotesk + Plus Jakarta Sans, indigo accent, soft shadows, rounded).
- ✅ Tested: backend 30/30 pytest; frontend E2E passing after fixing action-item convert bug.

## Backlog
- P1: Recurring reminder auto-scheduling/cron; browser push notifications (Notification API); rich-text table/image toolbar enhancements.
- P2: Restore/archive views for soft-deleted items; export reports; permission-level enforcement beyond admin gating.

## Notes
- Telegram/Email dispatch is best-effort and inactive until credentials are set in Settings (expected).
