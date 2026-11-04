# Chronos Platform Stabilization & Architectural Hardening Plan

Comprehensive architectural stabilization, multi-tenant isolation, cryptographic session security, and database refactoring for Chronos (Personal & Team Operating System).

### Status: Sprint 01 Complete (100% Passed)

> [!IMPORTANT]
> **Sprint 01 Achievements:**
> - **Database Strategy**: Hybrid Prisma adapter with PostgreSQL connectivity (`DATABASE_URL`) and an isolated, user-partitioned local storage engine (`partitions[userId]`) with zero mock data.
> - **Authentication & Session Tokens**: High-security stateless JSON Web Tokens (JWT) using `jose` with HS256 algorithm verification, expiry checks, and strict credential isolation for email/password and OAuth tokens.
> - **Password Hashing**: `bcryptjs` (salt rounds 10, constant-time compare). No passwords stored in plaintext or leaked in responses.
> - **Absolute Purge of Mock Data**: 100% blank slate on new signup. All initial mock arrays (`initialTasks`, `defaultProjects`, `sampleHabits`, etc.) purged to `[]`.
> - **Calendar Conflict Calculation**: Math corrected to strict interval overlap `A_start < B_end && A_end > B_start`.
> - **Cross-Resource Integrity**: `verifyTaskOwnership()`, `verifyProjectAccess()`, and `verifyGoalOwnership()` prevent foreign entity injection.
> - **Automated Security Integration Tests**: 8 mandatory scenarios executed via `npm run test:security` with 29/29 assertions passing.
> - **Zero Feature Loss**: All existing personal modules (Eisenhower matrix, Skill tree, Habit heatmaps, Energy calendar, Pomodoro/ROI timer, Burnout predictor, AI Coach, and English/Persian RTL bilingual support) and Team Kanban modules preserved and isolated per user.

---

### 1. Overview & Core Concept

- **What It Does**: Chronos is an integrated Personal & Team Operating System. It provides individuals with deep work scheduling, OKRs, skill progression, habit consistency tracking, and focus analytics, while enabling teams to collaborate through Kanban boards, project management, and member role assignments.
- **Target Audience & Context**: Knowledge workers, agile software teams, creators, and professionals needing both a distraction-free personal productivity hub and a shared team workspace.
- **Key Value**: Delivers zero-trust multi-tenant privacy. Each user is guaranteed an isolated blank slate upon registration, with fast switching between personal focus spaces and collaborative team boards.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. *Zero-State Onboarding*: When a user signs up with email and password, their dashboard opens clean with zero mock tasks, zero phantom projects, and contextual blank-state prompts ("Create your first task" / "Start a project").
  2. *Workspace Navigation*: Clean top navigation bar with brand mark, unified Personal/Team switcher, and a consolidated profile avatar dropdown containing preferences, language toggle (English LTR / فارسی RTL with Shamsi calendar), backup/restore, and logout.
  3. *Calendar Conflict Resolution*: When scheduling deep work blocks or syncing tasks with calendar events, interval overlaps are accurately identified, warning users of true simultaneous bookings without false positives.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Refined, high-end SaaS productivity aesthetic inspired by Linear and Notion with dark/light mode balance.
  - *Color Palette & Tokens*: Deep neutral slate canvas (`bg-slate-950` dark / `bg-slate-50` light), subtle hairline borders (`border-slate-800` / `border-slate-200`), primary brand accent (`indigo-500` / `indigo-600`), semantic indicators for task states (emerald for completed, amber for in-progress, rose for overdue).
  - *Typography*: Clean neo-grotesque sans display pairing with high-legibility body prose and tabular numbers (`tabular-nums font-mono`) for timers, metrics, and dates. Full Persian typography using Vazirmatn in RTL mode.
  - *Component Styling*: Single-elevation flat panels, zero decorative clutter, no pill sandwich clusters, unboxed metadata with subtle `·` separators.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dual-Layer Multi-Tenant Partitioning (Client & Server)**
  - *Chosen Approach*: Enforce `userId` isolation on every storage tier: in the database layer via Prisma (`WHERE userId = ...`), in the Express fallback engine via partitioned storage buckets (`partitions[userId]`), and in client localStorage keys (`chronos_tasks_${userId}`).
  - *Outcome*: Verified across all automated tests. Zero cross-tenant data leakage.

- **Decision 2: Cryptographic JWT Verification via `jose`**
  - *Chosen Approach*: Standard `jose` `jwtVerify` and `SignJWT` implementing HS256 signatures, `sub` user claim enforcement, and automatic expiration verification.
  - *Outcome*: Unauthenticated, tampered, expired, and legacy `demo-token` bypasses rejected with 401.

- **Decision 3: Interval Overlap Math for Calendar Scheduling**
  - *Chosen Approach*: Conflict detection logic set to `eventA.start < eventB.end && eventA.end > eventB.start`.
  - *Outcome*: Prevents false positives while accurately flagging intersecting blocks.

---

### 4. Technical Architecture & Component Structure

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CHRONOS CLIENT (SPA)                          │
├────────────────────────────────────────────────────────────────────────┤
│  Top Bar: [Brand Wordmark] ── [Personal / Team] ── [Profile Dropdown]  │
│                                                                        │
│  ┌───────────────────────────┐      ┌────────────────────────────────┐ │
│  │   Personal Focus Space    │      │     Team Workspace (Trello)    │ │
│  │  - Eisenhower Matrix      │      │  - Shared Kanban Columns       │ │
│  │  - Habit Heatmaps         │      │  - Project Roadmaps            │ │
│  │  - OKRs & Skill Tree      │      │  - Member Email Invites        │ │
│  │  - Energy/ROI Timer       │      │  - Activity Feeds              │ │
│  └─────────────┬─────────────┘      └───────────────┬────────────────┘ │
│                │                                    │                  │
│                ▼                                    ▼                  │
│       TaskContext / TeamContext (User-Scoped State Stores)             │
│       - Local Cache: `chronos_{entity}_{userId}`                       │
│       - Auth Header: Bearer <jose JWT>                                 │
└────────────────────────────────┬───────────────────────────────────────┘
                                 │ HTTP API (Port 3000)
                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        EXPRESS APPLICATION SERVER                      │
├────────────────────────────────────────────────────────────────────────┤
│  Middleware Stack:                                                     │
│  - Security Headers & JSON Body Parser                                 │
│  - JWT Verification (`jose` HS256 token validator)                     │
│    -> Injects verified `req.user = { id, email, role }`                │
├────────────────────────────────────────────────────────────────────────┤
│  API Routers (Strict User Partitioning):                               │
│  - /api/auth       -> Signup, Login, Session Verification (/me)        │
│  - /api/tasks      -> Personal Tasks CRUD (partitions[userId])         │
│  - /api/projects   -> Personal Projects (partitions[userId])           │
│  - /api/goals      -> OKRs & Key Results (partitions[userId])          │
│  - /api/calendar   -> Events with strict interval overlap checking     │
│  - /api/workspaces -> Team Workspaces, Team Projects, Kanban Tasks     │
│  - /api/team       -> Project Invitations & Membership Access Control  │
│  - /api/skills     -> RPG progression & XP awarding                    │
│  - /api/timelogs   -> Focus logs with cross-resource verification      │
│  - /api/ai         -> AI Coach & Burnout Risk Analysis                 │
└────────────────────────────────┬───────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        DATA PERSISTENCE TIER                           │
├────────────────────────────────────────────────────────────────────────┤
│  - Local Multi-Tenant Partitioned Storage (`data/db.json`)             │
│  - Target Schema: PostgreSQL via Prisma (`prisma/schema.prisma`)       │
│  - Zero mock data; guaranteed empty initial state for every user       │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 5. Sprint 01 Deliverables

| Deliverable | Location | Description |
| :--- | :--- | :--- |
| **Multi-User Architecture** | `docs/MULTI_USER_ARCHITECTURE.md` | Tenant isolation, personal vs team domains, threat model. |
| **Authentication Spec** | `docs/AUTHENTICATION.md` | JWT specification, `bcryptjs` hashing, `/me` validation. |
| **Data Ownership Rules** | `docs/DATA_OWNERSHIP.md` | Ownership matrix, cross-resource relational integrity. |
| **Security Test Suite** | `tests/security.test.ts` & `docs/SECURITY_TESTS.md` | 8 mandatory scenarios, 29/29 assertions passed. |
| **Database Migration Plan**| `docs/DATABASE_MIGRATION.md` | Target Prisma schema, Cloud SQL cutover & rollback plan. |
