# CHRONOS — Data Ownership & Relational Integrity

## 1. Overview

Chronos enforces strict data ownership boundaries. Users possess complete sovereignty over their personal data, while team resources are governed by collaborative workspace access control lists (ACL) and role-based permissions (RBAC).

---

## 2. Resource Classification Matrix

| Resource Type | Scope | Ownership Model | Access Control Enforcement |
| :--- | :--- | :--- | :--- |
| **Personal Task** | User | `userId === req.user.id` | Isolated to `partitions[userId].tasks`. Foreign access returns 404. |
| **Personal Project** | User | `userId === req.user.id` | Isolated to `partitions[userId].projects`. Foreign access returns 404. |
| **Goal / OKR** | User | `userId === req.user.id` | Isolated to `partitions[userId].goals`. Foreign access returns 404. |
| **Habit & Heatmap** | User | `userId === req.user.id` | Isolated to `partitions[userId].habits`. |
| **Calendar Event** | User | `userId === req.user.id` | Stored in user partition. Cross-resource `taskId` checked via `verifyTaskOwnership()`. |
| **Time Log** | User | `userId === req.user.id` | Stored in user partition. Validates `taskId` and `projectId` ownership. |
| **Skill Tree / XP** | User | `userId === req.user.id` | Stored in user partition. Cannot award XP to foreign users. |
| **AI Productivity History** | User | `userId === req.user.id` | Stored in user partition. |
| **Workspace** | Team | `members: [{ userId, role }]` | Verified against `workspace.members.some(m => m.userId === req.user.id)`. |
| **Team Project** | Workspace | `project.memberIds.includes(userId)` | Non-members receive `403 Forbidden`. Deletion restricted to Project Owner. |
| **Team Task (Kanban)** | Project | Inherits Team Project ACL | Non-members cannot read, create, update, or delete tasks. |
| **Project Invitation** | Team | Recipient Email | Bound to recipient email; only recipient can accept/decline. |

---

## 3. Cross-Resource Relationship Validation

A common vulnerability in multi-tenant SaaS applications is the **cross-user foreign key injection**, where an attacker attaches their own task to another user's project, or binds a calendar event to a private task owned by someone else.

In Chronos, the database layer (`server/db.ts`) exposes dedicated ownership verification helpers:

### 3.1. `verifyProjectAccess(projectId, userId)`
- Verifies whether `projectId` refers to a personal project owned by `userId` OR a team project where `userId` is in `memberIds`.
- If invalid or belonging to a foreign user, returns `false`.
- Calling routers immediately reject the request with `403 Forbidden` or `400 Bad Request`.

### 3.2. `verifyTaskOwnership(taskId, userId)`
- Inspects personal tasks partition for `userId`.
- If `taskId` does not exist in the caller's partition, returns `false`.
- Used by `calendarRouter.ts` and `timelogsRouter.ts` before creating calendar events or logging focus hours.

### 3.3. `verifyGoalOwnership(goalId, userId)`
- Checks `partitions[userId].goals`.
- Rejects task creation or updates attempting to bind to an unauthorized goal with `403 Forbidden`.

---

## 4. Role-Based Access Control (RBAC) in Workspaces

When collaborating in Team Workspaces, permissions are defined by explicit roles:

```
[OWNER]   -> Full rights: Rename workspace, delete workspace, manage all projects & members.
[ADMIN]   -> Management rights: Create/edit projects, invite members, assign roles.
[MEMBER]  -> Contributor rights: Create/edit team tasks, move Kanban cards, add comments.
[VIEWER]  -> Read-only rights: View team Kanban boards and roadmaps.
```

---

## 5. Account Deletion & Data Purge Policy

When a user account is deleted or reset:
1. `partitions[userId]` is wiped from memory and persistence.
2. The user's ID is removed from any `teamProject.memberIds` lists.
3. Pending invitations addressed to the user's email are revoked.
4. Active JWT tokens for the user fail verification because `db.getUserById(payload.sub)` returns null.
