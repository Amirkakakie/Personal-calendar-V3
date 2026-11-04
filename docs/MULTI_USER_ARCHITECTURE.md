# CHRONOS — Multi-User Architecture & Tenant Isolation

## 1. Executive Summary

Chronos is a dual-space Productivity and Team Operating System designed for high-performance individuals and collaborative teams. Prior to Sprint 01, the system suffered from a shared-state vulnerability where resources were not isolated by tenant identity.

Sprint 01 establishes a **Zero-Trust Multi-User Architecture**. Data isolation is strictly enforced at the database access layer and backend middleware. Client-supplied identity fields (`userId`, `ownerId`, `role`) are rejected; identity is derived exclusively from cryptographically signed server-side JSON Web Tokens (JWT).

---

## 2. Security Architecture Diagram

```
+-------------------------------------------------------------------------------+
|                                CLIENT TIER                                    |
|  - React SPA (Vite + Tailwind CSS)                                            |
|  - AuthContext (validates session against /api/auth/me on mount)              |
|  - StorageService (strictly scoped to `currentUserId`, zero fallback keys)    |
+-------------------------------------------------------------------------------+
                                      |
                                      | HTTPS + Authorization: Bearer <JWT>
                                      v
+-------------------------------------------------------------------------------+
|                            API GATEWAY & MIDDLEWARE                           |
|  - Express Server (server.ts / server/app.ts)                                 |
|  - authenticateToken Middleware (jose HS256 validation)                       |
|  - Verifies: Algorithm, Expiration, Issuer ('chronos-os'), Audience           |
|  - Validates user existence in DB -> populates req.user = { id, email, role }  |
+-------------------------------------------------------------------------------+
                                      |
                    +-----------------+-----------------+
                    |                                   |
                    v                                   v
+------------------------------------+ +------------------------------------+
|       PERSONAL DOMAIN ACCESS       | |        TEAM / WORKSPACE ACCESS     |
| - Tasks: req.user.id partition     | | - Membership validation in DB      |
| - Projects: req.user.id partition  | | - RBAC: OWNER, ADMIN, MEMBER       |
| - Goals / OKRs: req.user.id        | | - Team Projects & Kanban Tasks     |
| - Calendar / TimeLogs: req.user.id | | - Email-based Invitation System    |
+------------------------------------+ +------------------------------------+
                    |                                   |
                    +-----------------+-----------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
|                           DATA PERSISTENCE LAYER                              |
|  - Hybrid Multi-Tenant Partitioned Storage (data/db.json / PostgreSQL adapter)|
|  - Partitions: partitions[userId] -> { tasks, projects, goals, habits, ... }  |
|  - Workspace Registry: workspaces, members, teamProjects, invitations          |
|  - Strict Cross-Resource Validation: prevents foreign foreign-key injection    |
+-------------------------------------------------------------------------------+
```

---

## 3. Data Partitioning Model

### 3.1. Personal Workspace Partitioning
Personal productivity data is segregated into discrete user silos:
```typescript
interface UserPartition {
  tasks: TaskRecord[];
  projects: PersonalProjectRecord[];
  goals: GoalRecord[];
  habits: HabitRecord[];
  calendarEvents: CalendarEventRecord[];
  timeLogs: TimeLogRecord[];
  aiHistory: AIConversationRecord[];
}
```
Every retrieval or mutation operation resolves `partitions[req.user.id]`. If a user does not exist or tries to pass a different ID in query parameters or request payloads, the request accesses only the authenticated user's silo.

### 3.2. Team Workspaces & Shared Collaboration
Team collaboration takes place within explicitly instantiated workspaces:
- **Workspace Model**: A team entity (`ws-team` or custom `ws-*`) containing an array of members:
  `members: [{ userId, email, role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER', joinedAt }]`
- **Team Projects**: Owned by a workspace with explicit `memberIds: string[]`.
- **Team Tasks**: Linked to team projects with assigned members, subtasks, and Kanban swimlanes.
- **Invitations**: Identified by unique invite token, targeted to specific recipient email, requiring explicit user acceptance.

---

## 4. Threat Model & Mitigations

| Threat | Vulnerability Vector | Chronos Mitigation |
| :--- | :--- | :--- |
| **IDOR (Insecure Direct Object Reference)** | User B queries `GET /api/tasks/:id` or `GET /api/projects/:id` with User A's ID. | Database layer checks `partition[req.user.id].tasks.find(t => t.id === id)`. If not found in the caller's partition, the server returns `404 Not Found`. |
| **Privilege Escalation** | User submits `{ role: "ADMIN", userId: "target-user" }` in POST body. | The backend rejects client-submitted roles and IDs. All database writes enforce `userId = req.user.id`. |
| **Cross-Resource Injection** | User B creates a task or calendar event referencing User A's `projectId` or `taskId`. | `verifyProjectAccess()` and `verifyTaskOwnership()` validate that all foreign keys referenced by the new record belong to the calling user. Returns `403 Forbidden` on violation. |
| **Session Hijacking / Tampering** | Attacker crafts a token with fake user claims. | Signed using `jose` with `HS256` and cryptographically secure secret. Tampered payloads fail verification immediately (returns `401 Unauthorized`). |
| **Stale State Leakage** | User switches accounts on the same browser; previous cached tasks flash on screen. | `AuthContext` and `storage.ts` clear all in-memory and local storage upon logout. Storage keys are explicitly dynamic (`chronos_${key}_${userId}`). Guest fallbacks (`_guest`) are completely eradicated. |

---

## 5. Architectural Invariants

1. **Identity Invariant**: `req.user.id` is the single source of truth for all personal domain operations.
2. **Blank Slate Invariant**: A newly registered user has zero tasks, zero personal projects, zero goals, and zero calendar events.
3. **Collaboration Invariant**: No user can read or write to a team project or team task unless their `userId` is present in `project.memberIds`.
