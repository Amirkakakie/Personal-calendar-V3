# Chronos database architecture: reliability hardening and relational migration plan

## Status

This branch implements **Phase 0: persistence safety hardening**. It does not claim that the application has completed its migration to normalized relational tables.

The current application data-access API is synchronous and is used by every route. Replacing it with Prisma or asynchronous repositories safely requires coordinated changes to all route handlers, authorization checks, transactions, and tests. A partial replacement would create split-brain persistence and risk user data.

## Current production behavior after this branch

- Production and serverless deployments require a valid `DATABASE_URL`.
- There is no production fallback to `data/db.json`, `/tmp`, or an in-memory state.
- The application loads the existing PostgreSQL `chronos_data` root row. It creates an empty row only when no row exists; it never seeds production from the repository's local JSON fixture.
- PostgreSQL writes are serialized per process and use a monotonically increasing version compare-and-swap. A stale serverless instance cannot silently overwrite a newer snapshot.
- Each API request refreshes its snapshot before auth/business logic.
- API responses are held until queued writes are acknowledged by PostgreSQL.
- A failed write returns a persistence error instead of claiming success. The next request reloads the authoritative database state; a failed request is not replayed.
- `/api/health/db` reports HTTP 503 when required persistent storage is unavailable.
- Local JSON persistence remains available only for non-production development.

## Important limitation

The current compatibility store is still one JSONB row (`chronos_data.key = 'root'`). Version checks prevent silent lost updates, but this is not the desired long-term relational architecture. It remains less queryable and less efficient than normalized tables, and concurrent writes from separate serverless instances may receive a conflict response that the client must retry.

The Prisma schema in `prisma/schema.prisma` is currently not the runtime persistence layer. Do not describe Prisma as active until routes/repositories actually use it.

## Target relational architecture

Use PostgreSQL as the only production source of truth and Prisma Client (or a deliberately chosen typed SQL repository) for all persistence. The intended domains are:

### Identity and tenancy
- `User`: unique normalized email, password hash, profile fields, timestamps.
- `AuthSession`: hashed refresh/session token, expiry, revocation, user FK.
- `Workspace`: owner FK, personal/team type, timestamps.
- `WorkspaceMember`: workspace/user FKs, role, unique (workspaceId, userId).

### Personal productivity
- `Domain`: user FK, unique (userId, type).
- `Goal` and `KeyResult`: user/goal FKs; progress derived or transactionally maintained.
- `Project`: user FK; optional domain/goal relations.
- `Task`: user FK; optional project/goal/domain relations; status, priority, due date/time, timestamps.
- `Subtask`: task FK.
- `TaskTag` and `TaskTagAssignment`: normalized tags and unique task/tag assignment.
- `CalendarEvent`: user FK; optional task FK; start/end timestamps and external calendar IDs.
- `TimeLog`: user FK; optional task/project FKs.
- `Skill`, `UserSkill`, `UserBadge`: explicit catalog and user progress relations.

### Team collaboration
- `TeamProject`: workspace and owner FKs; unique project key within workspace.
- `ProjectMember`: project/user FKs, role, unique (projectId, userId).
- `TeamTask`: project FK, optional assignee FK, stable task number unique within project, ordering/status fields.
- `TeamTaskSubtask`, `TeamTaskComment`, `TeamTaskTag`: relational child records rather than JSON arrays.
- `ProjectInvitation`: project and inviter FKs, normalized invite email, status, expiry, unique active invitation policy.

## Required database constraints and indexes

- Unique normalized user email.
- Unique workspace membership (workspaceId, userId).
- Unique project key per workspace.
- Unique task number per project.
- Unique project membership (projectId, userId).
- Foreign keys for every tenant-owned record.
- Composite indexes beginning with tenant scope, e.g. (userId, status, dueDate), (workspaceId, createdAt), (projectId, status, position).
- Validate that linked task/project/goal/assignee records belong to the same tenant/workspace. Simple independent foreign keys do not by themselves guarantee tenant consistency; use composite unique keys/FKs or transactional service-level checks.
- Use database transactions for registration + personal workspace creation, invitation acceptance + membership creation, task completion + XP update, and destructive cascading operations.
- Store timestamps as timestamptz. Keep date-only concepts as PostgreSQL DATE, not arbitrary text. Define and document timezone semantics.

## Migration sequence (do not skip)

1. **Inventory and backup**
   - Take a verified PostgreSQL backup.
   - Export the current root JSON row to a protected, access-controlled migration artifact.
   - Inventory users, workspaces, personal partitions, tasks, goals, projects, calendar events, time logs, skills, badges, team projects/tasks/invitations.
   - Never import repository `data/db.json` automatically; it contains test fixtures and is not a production backup.

2. **Finalize schema**
   - Align Prisma models with actual API/domain types.
   - Add missing session, project-member, team-comment, team-subtask, and normalized tag models.
   - Add composite tenant constraints and indexes.
   - Generate and review SQL migrations. Do not use `prisma db push` as a production migration strategy.

3. **Build an idempotent importer**
   - Read an explicit exported snapshot.
   - Normalize and validate records.
   - Preserve existing IDs and timestamps where valid.
   - Hash/normalize emails consistently.
   - Resolve relationships in dependency order.
   - Import in a transaction or resumable batches with a migration ledger.
   - Report counts, rejected rows, orphaned references, duplicate keys, and checksum comparisons.
   - Never overwrite a non-empty relational database without an explicit operator-controlled reset/restore procedure.

4. **Introduce repositories**
   - Create async repositories for identity, workspaces, personal tasks/projects/goals, calendar/time logs, and team collaboration.
   - Replace direct `db.data` access with repository methods.
   - Keep authorization in services and enforce tenant scoping in every repository query.
   - Convert route handlers to async and await every DB operation.
   - Use transactions for multi-record business operations.

5. **Cut over safely**
   - Test importer against a copy of production data.
   - Compare row counts and per-tenant checksums.
   - Run cross-tenant authorization tests.
   - Deploy schema before application code where backward-compatible.
   - Use a controlled maintenance/cutover window or a documented dual-write/CDC strategy; do not improvise dual writes.
   - Retain a verified rollback backup.
   - Remove the legacy JSONB root store only after the relational runtime has been stable and verified.

## Operational requirements

- Configure `DATABASE_URL` in Vercel Production, Preview, and Development environments as appropriate. Use a pooled URL for serverless request traffic and a direct URL for migration commands if the provider requires it.
- Set a strong stable `JWT_SECRET`; never commit real secrets.
- Backups and restore drills are required before public launch.
- Monitor connection pool saturation, query latency, database errors, and migration state.
- Add integration tests using an isolated disposable PostgreSQL database, not a shared developer database.
- CI must run schema validation, migration checks, TypeScript checks, and integration tests.

## Verification checklist for this branch

- [ ] Install dependencies from lockfile.
- [ ] Run TypeScript/lint.
- [ ] Run security and E2E suites against isolated test storage.
- [ ] Verify missing DATABASE_URL blocks production API writes and auth.
- [ ] Verify PostgreSQL unavailable returns 503.
- [ ] Verify successful task creation is present after a fresh request/instance.
- [ ] Verify two concurrent requests cannot silently overwrite each other.
- [ ] Verify stale-version conflict returns an error and next request refreshes state.
- [ ] Verify local development still works without DATABASE_URL.
- [ ] Verify production never reads or writes repository `data/db.json`.

**Do not merge this branch as the completed relational migration.** It is the safety foundation that prevents further production data loss while the normalized schema and async repository cutover are implemented and tested.


## Phase 2 schema additions (not yet runtime cutover)

The Prisma schema has been extended with normalized collaboration primitives:
- `ProjectMember` with a unique project/user membership.
- `TeamTaskSubtask` and `TeamTaskComment` as first-class child records.
- `TeamTaskTag` and `TeamTaskTagAssignment` with unique task/tag pairs.
- `AuthSession` with unique hashed token, expiry, and revocation fields.
- Explicit workspace owner and team-task assignee relations.
- Unique team task number per project and an ordered project/column index.

The legacy JSON fields on `TeamTask` are deliberately retained temporarily for a staged migration. They must not be treated as the final write path.

### Phase 2 status
- [x] Add Prisma Client and Prisma CLI dependencies/scripts.
- [x] Expand relational schema for collaboration/session entities.
- [ ] Validate schema with `prisma validate` after dependency installation.
- [ ] Generate Prisma Client and check generated TypeScript types.
- [ ] Create a complete reviewed SQL migration from the current empty relational database baseline.
- [ ] Implement the idempotent importer from an explicitly supplied PostgreSQL JSONB export.
- [ ] Convert auth and domain services to asynchronous Prisma repositories.
- [ ] Add real PostgreSQL integration and cross-tenant tests.

No Prisma migration has been applied, and no route has been switched to Prisma in this phase. The runtime continues using the compatibility snapshot until the full migration/importer and repository cutover are ready.


## Phase 2 follow-up: legacy data preservation

The relational schema now also includes:
- Legacy-compatible user profile fields (`title`, `avatarColor`, `initials`, `joinedAt`).
- `UserStats` for XP, level, focus, pomodoro, ROI and activity history.
- `GoogleConnection` for Google identity/calendar connection state and token fields.
- `LegacySnapshot` for checksummed, user-linked JSON payload archival during migration.
- Workspace slug and explicit personal/team type, preserving personal workspace semantics.
- Project-scoped unique team tags and invitation display metadata.

These are preservation primitives, not evidence that an importer or runtime cutover is complete. Google access/refresh tokens must be encrypted with an application-managed key before storing production credentials in `GoogleConnection`; do not migrate plaintext token values into this table.

## Dependency lockfile warning

Prisma dependencies and scripts have been added to `package.json`, but the repository lockfiles have not yet been regenerated in a package-manager environment. Run the repository's canonical package manager install (npm install, if using package-lock.json) and commit the resulting lockfile before relying on `npm ci` or CI deployment. Do not assume this branch is currently reproducible from a frozen lockfile.

## Runtime migration remains gated

The current API routes and auth middleware still call the legacy synchronous `db` facade. Do not route authentication or business operations through Prisma until:
1. The relational SQL migration is complete and deployed to a disposable database.
2. Prisma Client generation and schema validation pass.
3. The importer can restore a complete legacy snapshot and verify checksums.
4. Both old and new authorization paths have integration tests.
5. The cutover can be rolled back without losing writes.


## Production bootstrap safety gate

Production startup now refuses to create a new empty `chronos_data` root row implicitly when the row is absent. This prevents a newly pointed/empty database from appearing healthy while legacy user data remains elsewhere. The only bypass is the explicit one-time environment flag `CHRONOS_ALLOW_EMPTY_DB_INIT=true`, which must be used only for a genuinely new installation after confirming there is no existing user data to restore.

Before deploying this branch to an existing production environment:
1. Confirm the exact production `DATABASE_URL` target without exposing credentials.
2. Take a provider-native PostgreSQL backup and separately export the current `chronos_data` root row.
3. Verify backup size, row presence, user count and a SHA-256 checksum in a secure local environment.
4. Deploy with `CHRONOS_ALLOW_EMPTY_DB_INIT` unset.
5. Confirm the app loads the existing root row and expected user count before enabling writes.

The assistant cannot access the user's production database or Vercel environment secrets, so no live backup, data-count verification, or production restore has been performed here.
