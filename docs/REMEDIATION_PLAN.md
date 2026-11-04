# Chronos — Engineering Remediation Plan

This document details the step-by-step technical remediation plan to resolve all security, multi-tenancy, database, and algorithmic deficiencies in the Chronos codebase.

---

## 1. Issue Matrix & Implementation Map

| ID | Issue Description | Severity | Target Files | Solution Strategy | Dependencies |
|:---|:---|:---|:---|:---|:---|
| **SEC-01** | Multi-tenant data leak via shared global state | **CRITICAL** | `server/db.ts`, `server/routes/*.ts` | Partition storage by `userId`, filter all queries | None |
| **SEC-02** | Unverified JWT parsing & demo bypass | **CRITICAL** | `server/middleware/auth.ts`, `server/routes/authRouter.ts` | Replace with `jose` HS256 verification, remove bypasses | `jose` package |
| **SEC-03** | Insecure rate limiter state | **HIGH** | `server/middleware/security.ts` | IP & user scoped sliding window with clean intervals | None |
| **DAT-01** | Mock data pollution on new user registration | **HIGH** | `src/services/storage.ts`, `src/context/TeamContext.tsx`, `server/db.ts` | Purge all seed arrays to `[]` | None |
| **DAT-02** | Ephemeral serverless storage instability | **MEDIUM** | `server/db.ts` | Hybrid Prisma adapter with PostgreSQL + robust fallback | `prisma` |
| **ALG-01** | Calendar conflict interval overlap arithmetic error | **HIGH** | `server/services/googleCalendarService.ts`, `src/services/calendarService.ts` | Implement `A_start < B_end && A_end > B_start` | None |
| **UI-01** | Client session cleanup & state reset on logout | **MEDIUM** | `src/context/AuthContext.tsx`, `src/context/TaskContext.tsx`, `src/context/TeamContext.tsx` | Complete cache flush on user sign-out | None |

---

## 2. Detailed Remediation Steps

### Step 1: Authentication Hardening (`server/middleware/auth.ts`, `server/routes/authRouter.ts`)
- Use `jose.SignJWT` to generate cryptographically signed tokens on signup and login with standard claims (`sub: user.id`, `email: user.email`, `iat`, `exp: '7d'`).
- In `server/middleware/auth.ts`, verify the `Authorization: Bearer <token>` header using `jose.jwtVerify(token, secretKey)`.
- Extract `payload.sub` as `req.userId` and `payload.email` as `req.userEmail`.
- Eliminate `ENFORCE_AUTH !== 'true'` bypass, eliminate hardcoded `usr-chronos-owner`, eliminate demo-token checks. Return `401 Unauthorized` on missing or invalid tokens.

### Step 2: Storage & Multi-Tenancy Partitioning (`server/db.ts`, `server/routes/*`)
- Purge all initial mock tasks, projects, goals, skills, time logs, and calendar events from `getInitialSeedData()`.
- Structure internal JSON fallback storage so that entities are keyed by `userId`:
  - `tasksByUser: Record<string, Task[]>`
  - `projectsByUser: Record<string, Project[]>`
  - `goalsByUser: Record<string, GoalOKR[]>`
  - `eventsByUser: Record<string, CalendarEvent[]>`
  - `timeLogsByUser: Record<string, TimeLog[]>`
- In `tasksRouter.ts`, filter all GET, POST, PUT, DELETE operations strictly by `req.userId`.
- In `projectsRouter.ts`, filter personal projects by `ownerId === req.userId`, and team projects by `members.some(m => m.id === req.userId || m.email === req.userEmail)`.
- In `goalsRouter.ts`, `calendarRouter.ts`, `timelogsRouter.ts`, `skillsRouter.ts`, filter strictly by `req.userId`.
- Provide Prisma connectivity if `process.env.DATABASE_URL` is defined.

### Step 3: Frontend Mock Data Purge (`src/services/storage.ts`, `src/context/TeamContext.tsx`)
- In `src/services/storage.ts`: Set `initialTasks = []`, `initialProjects = []`, `initialGoals = []`, `initialSkills = []`, `initialBadges = []`, `initialEvents = []`, `initialTimeLogs = []`.
- In `src/context/TeamContext.tsx`: Set `DEFAULT_INITIAL_PROJECTS = []`, `DEFAULT_INITIAL_TASKS = []`, `DEFAULT_INITIAL_INVITATIONS = []`.
- In `src/services/api.ts`: Ensure all Axios/fetch requests include `Authorization: Bearer ${token}`.

### Step 4: Calendar Interval Arithmetic Fix (`server/services/googleCalendarService.ts`, `src/services/calendarService.ts`)
- Replace flawed comparison with strict interval intersection:
  ```typescript
  const isOverlapping = (startA: Date, endA: Date, startB: Date, endB: Date) => {
    return startA.getTime() < endB.getTime() && endA.getTime() > startB.getTime();
  };
  ```
- Apply this logic to both `detectConflicts` and `findOptimalTimeSlots`.

### Step 5: Verification & Quality Assurance
- Run `compile_applet` and test clean compilation.
- Verify zero runtime TypeScript errors and complete user-isolation tests.
