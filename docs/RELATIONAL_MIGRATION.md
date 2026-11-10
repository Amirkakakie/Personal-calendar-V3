# Chronos relational database migration runbook

The application now has a Prisma/PostgreSQL relational runtime. The legacy JSON file and legacy PostgreSQL `chronos_data` root are treated as migration sources only; they are not deleted by this process.

## Local development data (`data/db.json`)

1. Stop the local Chronos server so the JSON file is not being modified during export.
2. Keep the original `data/db.json` unchanged as a rollback copy.
3. Export the local snapshot to a path outside the repository:

```powershell
npm run db:export-legacy -- --source-file "D:\project\Personal-calendar-V3\data\db.json" --output "D:\secure-backups\chronos-local-export.json"
```

4. Verify the export checksum and manifest:

```powershell
npm run db:verify-legacy-export -- "D:\secure-backups\chronos-local-export.json"
```

5. Configure a PostgreSQL `DATABASE_URL` for the target database, then apply the committed migrations:

```powershell
npm run prisma:migrate:deploy
```

6. Run the import in dry-run mode first:

```powershell
npm run db:import-legacy-archive -- --file "D:\secure-backups\chronos-local-export.json"
```

7. Copy the SHA-256 digest printed by dry-run and apply the exact export:

```powershell
npm run db:import-legacy-archive -- --file "D:\secure-backups\chronos-local-export.json" --apply --expected-sha256 YOUR_EXACT_SHA256
```

8. Keep the original JSON and export until all user accounts, tasks, goals, projects, calendar events, time logs, skills, team projects, comments, invitations and account switching have been checked against the imported database.

Once the relational import is complete, start Chronos with the target `DATABASE_URL`. In development, the presence of a valid `DATABASE_URL` selects Prisma relational persistence; without it, Chronos continues using the local JSON file.

## Legacy PostgreSQL `chronos_data` source

1. Export the authoritative `chronos_data` root while the old application is still running:

```bash
npm run db:export-legacy -- --output /secure/chronos-postgres-export.json
```

2. Verify the export, apply Prisma migrations to the target database, and run the same dry-run and checksum-pinned import commands shown above.
3. If importing into the same PostgreSQL database, the legacy `chronos_data` table is retained as a rollback source. The importer refuses a non-empty relational target and never overwrites an existing archive with a different checksum.

## Production runtime requirements

- `DATABASE_URL`: stable PostgreSQL connection string.
- `JWT_SECRET`: stable randomly generated secret of at least 32 bytes.
- Apply `prisma migrate deploy` before starting the new runtime.
- Complete the verified legacy import before deploying the relational runtime when legacy data exists.
- Do not set `CHRONOS_ALLOW_EMPTY_DB_INIT=true` for a database containing legacy data. It is only an explicit bootstrap switch for a genuinely new, empty installation.
- Keep the export encrypted and outside Git. It contains personal data and password hashes.

## Safety and rollback

The importer is serializable and all-or-nothing. It archives the original snapshot, preserves stable IDs and supported relationships, stores source metadata for fields that do not yet have dedicated relational columns, reconciles counts, and verifies the archive checksum. A failed import rolls back its transaction.

The importer does not delete `data/db.json` or `chronos_data`. Do not remove either legacy source until the new runtime has been exercised against the imported records and a fresh backup/restore has been tested.
