# Chronos Platform Stabilization & Architectural Hardening Plan

Comprehensive architectural stabilization, multi-tenant isolation, cryptographic session security, and database refactoring for Chronos (Personal & Team Operating System).

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions have been confirmed and will govern the stabilization:
> - **Database Strategy**: Hybrid Prisma adapter with PostgreSQL connectivity (`DATABASE_URL`) and an isolated, user-partitioned local storage fallback when running without a live database.
> - **Authentication & Session Tokens**: High-security stateless JSON Web Tokens (JWT) using `jose` with HS256 algorithm verification, expiry checks, and strict credential isolation for email/password and OAuth tokens.
> - **Absolute Purge of Mock Data**: 100% blank slate on new signup. All initial mock arrays (`initialTasks`, `defaultProjects`, `sampleHabits`, etc.) are purged to `[]`.
> - **Calendar Conflict Calculation**: Math corrected to strict interval overlap `A_start < B_end && A_end > B_start`.
> - **Zero Feature Loss**: All existing personal modules (Eisenhower matrix, Skill tree, Habit heatmaps, Energy calendar, Pomodoro/ROI timer, Burnout predictor, AI Coach, and English/Persian RTL bilingual support) and Team Kanban modules are preserved and isolated per user.

---

### 1. Overview & Core Concept

- **What It Does**: Chronos is an integrated Personal & Team Operating System. It provides individuals with deep work scheduling, OKRs, skill progression, habit consistency tracking, and focus analytics, while enabling teams to collaborate through Kanban boards, project management, and member role assignments.
- **Target Audience & Context**: Knowledge workers, agile software teams, creators, and professionals needing both a distraction-free personal productivity hub and a shared team workspace.
- **Key Value**: Delivers military-grade privacy and multi-tenant separation. Each user is guaranteed an isolated blank slate upon registration, with fast switching between personal focus spaces and collaborative team boards.

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
- **Interactive Feedback**:
  - Immediate optimistic local updates with smooth transitions.
  - Granular error boundaries that isolate API failures without tearing down the application interface.
  - Toast notifications for workspace actions (invitations, task status changes, backup exports).

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dual-Layer Multi-Tenant Partitioning (Client & Server)**
  - *Chosen Approach*: Enforce `userId` isolation on every storage tier: in the database layer via Prisma (`WHERE userId = ...`), in the Express fallback engine via partitioned storage buckets, and in client localStorage keys (`chronos_tasks_${userId}`).
  - *Why*: Eliminates the critical vulnerability where editing a task in one browser profile leaked or modified data for all users. Guarantees cross-tenant privacy.
  - *Alternatives Considered*: Global shared key with client-side filter only — rejected because cold starts or un-scoped API endpoints leaked all tenants' data.

- **Decision 2: Cryptographic JWT Verification via `jose`**
  - *Chosen Approach*: Replace naive Base64 string splitting and bypass tokens (`demo-token`, hardcoded `usr-chronos-owner`) with standard `jose` `jwtVerify` and `SignJWT` implementing HS256 signatures, `sub` user claim enforcement, and automatic expiration verification.
  - *Why*: Prevents privilege escalation and forged authentication headers in production.
  - *Alternatives Considered*: Legacy `jsonwebtoken` package — rejected in favor of modern, standards-compliant `jose` which works seamlessly across Node.js and edge runtimes.

- **Decision 3: Interval Overlap Math for Calendar Scheduling**
  - *Chosen Approach*: Correct conflict detection logic to `eventA.start < eventB.end && eventA.end > eventB.start`.
  - *Why*: Prevents boundary collisions from flagging false conflicts while capturing all intersecting intervals.

---

### 4. Technical Architecture & Data Strategy (Technical Reference)

#### Architecture & Component Diagram

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
│  - Security Headers (Helmet) & CORS                                    │
│  - Rate Limiter (IP & User scoped)                                     │
│  - JWT Verification (`jose` HS256 token validator)                     │
│    -> Injects verified `req.userId` into Request context               │
├────────────────────────────────────────────────────────────────────────┤
│  API Routers (Strict User Partitioning):                               │
│  - /api/auth     -> Login, Signup, Session Validation                  │
│  - /api/tasks    -> CRUD scoped strictly by `userId` or `teamId`       │
│  - /api/projects -> Personal projects & Shared team boards             │
│  - /api/goals    -> OKRs scoped by `userId`                            │
│  - /api/calendar -> Events with strict interval overlap checking       │
│  - /api/timelogs -> Focus tracking & ROI logs                          │
├────────────────────────────────────────────────────────────────────────┤
│  Persistence Layer (Hybrid Adapter):                                   │
│  ┌─────────────────────────────────┐   ┌─────────────────────────────┐ │
│  │      Prisma ORM (PostgreSQL)    │   │  Local Partitioned Fallback │ │
│  │      Active when DATABASE_URL   │   │  Active when no live DB     │ │
│  │      is present in environment  │   │  Scoped by userId keys      │ │
│  └─────────────────────────────────┘   └─────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

#### Data Model & State Strategy

- **User**: `id`, `email`, `name`, `passwordHash`, `preferences` (locale, theme, calendar).
- **Task**: `id`, `userId`, `projectId`, `title`, `description`, `status`, `priority`, `energyLevel`, `estimatedMinutes`, `dueDate`, `order`.
- **Project**: `id`, `ownerId`, `name`, `type` (`personal` | `team`), `members` (list of invited user emails/IDs with roles), `columns`.
- **GoalOKR**: `id`, `userId`, `title`, `targetDate`, `progress`, `keyResults`.
- **CalendarEvent**: `id`, `userId`, `title`, `startTime`, `endTime`, `type`. Overlap condition: `startTime < other.endTime && endTime > other.startTime`.

#### Implementation Phasing & Milestones

1. **Phase 1: Architecture & Technical Audit Documentation**
   - Save full audit (`docs/TECHNICAL_AUDIT.md`), architecture spec (`docs/ARCHITECTURE.md`), and remediation plan (`docs/REMEDIATION_PLAN.md`).
2. **Phase 2: Authentication & Token Security**
   - Install `jose` package.
   - Refactor `server/middleware/auth.ts`: Replace demo token & unverified decoders with `jose` HS256 cryptographic verification.
   - Update `server/routes/authRouter.ts` to sign tokens via `jose`.
   - Update client `src/services/api.ts` to attach valid Bearer tokens and handle 401 re-authentication.
3. **Phase 3: Absolute Purge of Mock Data & User-Scoped Persistence**
   - Purge client seeds in `src/services/storage.ts` (`initialTasks = []`, `initialProjects = []`, etc.).
   - Purge team seeds in `src/context/TeamContext.tsx` (`DEFAULT_INITIAL_PROJECTS = []`, etc.).
   - Refactor `server/db.ts`: Purge mock seed data. Implement user-partitioned store (`db[userId] = { tasks: [], projects: [], ... }`).
   - Wire Prisma client when `DATABASE_URL` is configured, falling back smoothly to partitioned local store.
4. **Phase 4: Calendar Math & Conflict Resolution**
   - Update `server/services/googleCalendarService.ts` and `src/services/calendarService.ts` to implement strict interval overlap math.
5. **Phase 5: Full Build, Lint, and System Validation**
   - Run type checks and build compilation (`compile_applet`).
   - Validate blank state on new signup and isolation across distinct accounts.
