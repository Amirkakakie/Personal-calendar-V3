# Chronos relational database migration runbook

The application now has a Prisma/PostgreSQL relational runtime. The legacy JSON file and legacy PostgreSQL `chronos_data` root are treated as migration sources only; they are not deleted by this process.

## Start a local PostgreSQL database on Windows

The repository includes a Docker Compose service for a local PostgreSQL 16 instance. It binds only to `127.0.0.1` and stores database files in a named Docker volume.

1. Install and start Docker Desktop.
2. In PowerShell, from the repository root, set a strong local-only password and start PostgreSQL:

```powershell
$bytes = New-Object byte[] 24
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$env:CHRONOS_POSTGRES_PASSWORD = -join ($bytes | ForEach-Object { $_.ToString('x2') })
docker compose up -d postgres
```

3. Configure the connection string in the same PowerShell session. The generated password is hexadecimal, so it does not require URL encoding:

```powershell
$env:NODE_ENV = "development"
$env:DATABASE_URL = "postgresql://chronos:$env:CHRONOS_POSTGRES_PASSWORD@localhost:5432/chronos?schema=public"
$keyBytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($keyBytes)
$env:CHRONOS_DATA_ENCRYPTION_KEY = [Convert]::ToBase64String($keyBytes)
```

For a durable setup across terminal sessions, store these values in a local untracked `.env` file or a secrets manager. Never commit that file. Back up the encryption key separately; losing it prevents decryption of the archived legacy snapshot and stored OAuth tokens.

4. Check PostgreSQL health and apply the schema:

```powershell
docker compose ps
npm run prisma:migrate:deploy
```

5. Follow the local JSON migration steps below before starting the app with `DATABASE_URL`. Once imported, run `npm run dev` in the same environment. Without `DATABASE_URL`, local development continues to use `data/db.json`.

To stop PostgreSQL without deleting data, run `docker compose down`. Do **not** run `docker compose down -v` unless you intentionally want to permanently delete the local database volume.

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

5. Generate a stable 32-byte encryption key and store it as `CHRONOS_DATA_ENCRYPTION_KEY` in the target environment. Keep the same key in a secure secrets manager and in the disaster-recovery backup:

```powershell
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$env:CHRONOS_DATA_ENCRYPTION_KEY = [Convert]::ToBase64String($bytes)
```

Do not rotate or lose this key without a planned re-encryption procedure. It protects the archived snapshot stored in PostgreSQL and Google OAuth tokens. The exported JSON file itself is plaintext; keep it on an encrypted volume or encrypt it separately before moving or backing it up.

6. Configure a PostgreSQL `DATABASE_URL` for the target database, then apply the committed migrations:

```powershell
npm run prisma:migrate:deploy
```

7. Run the import in dry-run mode first:

```powershell
npm run db:import-legacy-archive -- --file "D:\secure-backups\chronos-local-export.json"
```

8. Copy the SHA-256 digest printed by dry-run and apply the exact export:

```powershell
npm run db:import-legacy-archive -- --file "D:\secure-backups\chronos-local-export.json" --apply --expected-sha256 YOUR_EXACT_SHA256
```

9. Keep the original JSON and export until all user accounts, tasks, goals, projects, calendar events, time logs, skills, team projects, comments, invitations and account switching have been checked against the imported database.

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
- `CHRONOS_DATA_ENCRYPTION_KEY`: stable 32-byte base64 or 64-character hex key for encrypted archives and Google tokens.
- Apply `prisma migrate deploy` before starting the new runtime.
- Complete the verified legacy import before deploying the relational runtime when legacy data exists.
- Do not set `CHRONOS_ALLOW_EMPTY_DB_INIT=true` for a database containing legacy data. It is only an explicit bootstrap switch for a genuinely new, empty installation.
- Keep the export encrypted and outside Git. It contains personal data and password hashes.

## Safety and rollback

The importer is serializable and all-or-nothing. It archives the original snapshot, preserves stable IDs and supported relationships, stores source metadata for fields that do not yet have dedicated relational columns, reconciles counts, and verifies the archive checksum. A failed import rolls back its transaction.

The importer does not delete `data/db.json` or `chronos_data`. Do not remove either legacy source until the new runtime has been exercised against the imported records and a fresh backup/restore has been tested.
