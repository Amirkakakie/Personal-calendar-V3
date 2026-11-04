# Chronos — Target Architecture Specification

**System:** Chronos Personal & Team Operating System  
**Version:** 2.0-STABLE  
**Standard:** Enterprise Multi-Tenant & Domain-Driven Modular Design

---

## 1. System Architecture Overview

Chronos is structured around a decoupled, full-stack architecture combining a reactive React 19 single-page application with a secure Express TypeScript backend, backed by a hybrid Prisma PostgreSQL data engine and isolated client-side caching.

```
┌────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND LAYER                            │
│  React 19 + TypeScript + Vite + Tailwind CSS                           │
├────────────────────────────────────────────────────────────────────────┤
│  Top Bar: [Brand Wordmark] ── [Personal / Team] ── [Profile Dropdown]  │
│                                                                        │
│  Personal Operating Space:                 Team Collaboration Space:   │
│  - Task Board & Eisenhower Matrix          - Shared Trello Kanban      │
│  - Goals, Habits & Skill Progression       - Project Roadmaps          │
│  - Pomodoro, Energy & ROI Timer            - Email Invitation Flow     │
│  - Bilingual i18n (LTR / RTL Shamsi)       - Real-time Activity Feeds  │
│                                                                        │
│  State Management & Contexts:                                          │
│  - AuthContext (Current user profile & JWT bearer session)             │
│  - TaskContext (Personal tasks, goals, habits scoped to userId)        │
│  - TeamContext (Workspaces, projects, members, invitations)            │
│  - StorageService (Dynamic key partitioning: `chronos_{entity}_{id}`)  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST (JWT Bearer Token)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                              BACKEND LAYER                             │
│  Express 4.21 + tsx Node.js Server                                     │
├────────────────────────────────────────────────────────────────────────┤
│  Security & Request Pipeline:                                          │
│  1. Helmet (HTTP headers & Content Security Policy)                    │
│  2. CORS (Restricted origin controls)                                  │
│  3. Rate Limiter (IP + User Token bucket sliding window)               │
│  4. Auth Middleware (`jose` cryptographic HS256 token verification)   │
│     -> Injects verified `req.userId` & `req.userEmail` into context    │
│                                                                        │
│  Domain Controller Endpoints (Strict Tenant Partitioning):             │
│  - /api/auth     : Registration, login, session token generation       │
│  - /api/tasks    : Task CRUD (WHERE userId = req.userId)               │
│  - /api/projects : Projects (Personal OR Team Member WHERE member)     │
│  - /api/goals    : OKRs & Milestones (WHERE userId = req.userId)       │
│  - /api/calendar : Events & Strict Interval Conflict Detection         │
│  - /api/timelogs : Focus sessions & productivity metrics               │
│  - /api/skills   : Skill trees & achievements                          │
│  - /api/ai       : Productivity coaching & burnout prediction          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Database Client / Abstract Data Access
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                           PERSISTENCE LAYER                            │
├────────────────────────────────────────────────────────────────────────┤
│  Hybrid Storage Engine:                                                │
│  ┌──────────────────────────────────┐ ┌──────────────────────────────┐ │
│  │   Primary: Prisma ORM            │ │ Fallback: Partitioned JSON   │ │
│  │   - PostgreSQL Database          │ │ - Multi-tenant key isolated  │ │
│  │   - Migrations in schema.prisma  │ │ - Safe local disk persistence│ │
│  │   - Active when DATABASE_URL set │ │ - Active in dev / air-gap    │ │
│  └──────────────────────────────────┘ └──────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Authentication & Session Strategy

1. **Stateless JWT with `jose`**:
   - Algorithms: HS256 (symmetric HMAC SHA-256).
   - Secret Management: `JWT_SECRET` environment variable with secure high-entropy default.
   - Claims:
     - `sub`: Unique User ID (`usr-...`).
     - `email`: Authenticated user email.
     - `iat`: Timestamp of issuance.
     - `exp`: Explicit expiration (e.g., 7 days).
2. **Request Validation Contract**:
   - Client sends token in `Authorization: Bearer <token>` header.
   - Middleware executes `jose.jwtVerify(token, secretKey)`.
   - On expiration, signature mismatch, or missing claim: returns `401 Unauthorized` with JSON error payload `{ error: "Invalid or expired session token" }`.
   - No hardcoded fallback users. No demo token bypasses.

---

## 3. Data Isolation Model (Multi-Tenancy)

Chronos enforces a strict two-tiered isolation model:

1. **Personal Tier (Strict User Isolation)**:
   - Entities: `Task`, `GoalOKR`, `Habit`, `TimeLog`, `Skill`, `PersonalProject`.
   - Invariant: A user can NEVER query or mutate personal entities belonging to another user.
   - Enforcement: Every database query enforces `userId === req.userId`.
2. **Team Tier (Explicit Project Membership)**:
   - Entities: `TeamWorkspace`, `TeamProject`, `TeamTask`, `ProjectInvitation`.
   - Invariant: A user can only access a team project if they are either:
     a) The project owner (`ownerId === req.userId`).
     b) An accepted member in `project.members` array.
   - Email Invitations: Team owners invite colleagues by email. The invited colleague must explicitly accept the invitation to join the project board.

---

## 4. Calendar Engine & Interval Math

To guarantee that task scheduling and Google Calendar synchronization never miscalculate collisions:

- **Mathematical Invariant**: Two intervals $[A_{\text{start}}, A_{\text{end}})$ and $[B_{\text{start}}, B_{\text{end}})$ overlap if and only if:
  $$A_{\text{start}} < B_{\text{end}} \quad\text{and}\quad A_{\text{end}} > B_{\text{start}}$$
- **Optimal Free Slot Discovery**:
  - Sort all events chronologically.
  - Scan between `windowStart` and `windowEnd`.
  - Check candidate interval $[T, T + \text{duration})$ against all overlapping events. If no overlap exists, record as candidate focus slot.
