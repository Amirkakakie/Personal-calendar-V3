import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { countLegacySnapshot, snapshotSha256, type LegacySnapshotExport } from '../server/migrations/legacySnapshot.ts';

const { Pool } = pg;

function requiredOutputPath(): string {
  const index = process.argv.indexOf('--output');
  const output = index >= 0 ? process.argv[index + 1] : undefined;
  if (!output || !path.isAbsolute(output)) {
    throw new Error('Provide an absolute secure output path: npm run db:export-legacy -- --output /secure/path/chronos-export.json');
  }
  const relative = path.relative(process.cwd(), output);
  if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
    throw new Error('Refusing to write a sensitive database export inside the repository. Choose a path outside the project directory.');
  }
  return output;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
    throw new Error('A valid PostgreSQL DATABASE_URL is required. The URL is never printed.');
  }

  const outputPath = requiredOutputPath();
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 1,
    connectionTimeoutMillis: 10000,
    ssl: /localhost|127\.0\.0\.1/i.test(databaseUrl) ? false : { rejectUnauthorized: false }
  });

  try {
    const result = await pool.query(
      "SELECT data, version FROM chronos_data WHERE key = 'root' LIMIT 1"
    );
    if (!result.rows.length) {
      throw new Error("The authoritative chronos_data root row does not exist. No export was written.");
    }

    const raw = result.rows[0].data;
    const snapshot = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
      throw new Error('The database root row is not a valid JSON object.');
    }

    const exportFile: LegacySnapshotExport = {
      format: 'chronos-legacy-postgres-export',
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      source: {
        table: 'chronos_data',
        key: 'root',
        version: Number(result.rows[0].version),
        applicationVersion: String(snapshot.version || 'unknown')
      },
      counts: countLegacySnapshot(snapshot),
      integrity: {
        algorithm: 'sha256',
        snapshotSha256: snapshotSha256(snapshot)
      },
      snapshot
    };

    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    const fileContents = JSON.stringify(exportFile, null, 2) + '\n';
    // wx prevents accidental overwrite; mode 0600 restricts access on POSIX.
    fs.writeFileSync(outputPath, fileContents, { encoding: 'utf8', flag: 'wx', mode: 0o600 });

    console.log('Chronos legacy PostgreSQL snapshot exported successfully.');
    console.log(JSON.stringify({
      outputPath,
      bytes: Buffer.byteLength(fileContents),
      sourceVersion: exportFile.source.version,
      applicationVersion: exportFile.source.applicationVersion,
      counts: exportFile.counts,
      sha256: exportFile.integrity.snapshotSha256
    }, null, 2));
    console.warn('This file contains sensitive user data and password hashes. Keep it encrypted, outside Git, and delete temporary copies securely after the migration is verified.');
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('[Chronos export failed]', error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
});
