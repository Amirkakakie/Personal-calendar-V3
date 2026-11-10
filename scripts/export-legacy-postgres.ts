import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { countLegacySnapshot, snapshotSha256, type LegacySnapshotExport } from '../server/migrations/legacySnapshot.ts';

const { Pool } = pg;

function requiredOutputPath(): string {
  const index = process.argv.indexOf('--output');
  const output = index >= 0 ? process.argv[index + 1] : undefined;
  if (!output || !path.isAbsolute(output)) {
    throw new Error('Provide an absolute secure output path with --output /secure/path/chronos-export.json');
  }
  const relative = path.relative(process.cwd(), output);
  if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
    throw new Error('Refusing to write a sensitive database export inside the repository. Choose a path outside the project directory.');
  }
  return output;
}

function readLocalSnapshot(sourceFile: string): Record<string, any> {
  if (!path.isAbsolute(sourceFile)) throw new Error('--source-file must be an absolute path.');
  const parsed = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Local database file is not a valid Chronos JSON object.');
  }
  return parsed;
}

async function main() {
  const outputPath = requiredOutputPath();
  const sourceIndex = process.argv.indexOf('--source-file');
  const sourceFile = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
  let snapshot: Record<string, any>;
  let source: LegacySnapshotExport['source'];

  if (sourceFile) {
    snapshot = readLocalSnapshot(sourceFile);
    source = {
      table: 'local_json_file',
      key: 'root',
      version: 1,
      applicationVersion: String(snapshot.version || 'unknown')
    };
  } else {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl || !/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
      throw new Error('Set DATABASE_URL for PostgreSQL export or provide --source-file with an absolute local db.json path.');
    }
    const pool = new Pool({
      connectionString: databaseUrl,
      max: 1,
      connectionTimeoutMillis: 10000,
      ssl: /localhost|127\.0\.0\.1/i.test(databaseUrl) ? false : { rejectUnauthorized: false }
    });
    try {
      const result = await pool.query("SELECT data, version FROM chronos_data WHERE key = 'root' LIMIT 1");
      if (!result.rows.length) throw new Error("The authoritative chronos_data root row does not exist. No export was written.");
      const raw = result.rows[0].data;
      snapshot = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
        throw new Error('The database root row is not a valid JSON object.');
      }
      source = {
        table: 'chronos_data',
        key: 'root',
        version: Number(result.rows[0].version),
        applicationVersion: String(snapshot.version || 'unknown')
      };
    } finally {
      await pool.end();
    }
  }

  const exportFile: LegacySnapshotExport = {
    format: 'chronos-legacy-postgres-export',
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    source,
    counts: countLegacySnapshot(snapshot),
    integrity: { algorithm: 'sha256', snapshotSha256: snapshotSha256(snapshot) },
    snapshot
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
  const fileContents = JSON.stringify(exportFile, null, 2) + '\n';
  fs.writeFileSync(outputPath, fileContents, { encoding: 'utf8', flag: 'wx', mode: 0o600 });

  console.log('Chronos legacy snapshot exported successfully.');
  console.log(JSON.stringify({
    source: source.table,
    outputPath,
    bytes: Buffer.byteLength(fileContents),
    applicationVersion: exportFile.source.applicationVersion,
    counts: exportFile.counts,
    sha256: exportFile.integrity.snapshotSha256
  }, null, 2));
  console.warn('This JSON export contains personal data and password hashes and is not itself encrypted. It is created with restrictive file permissions; store it on an encrypted volume or encrypt it separately, keep it outside Git, and delete temporary copies securely after verification.');
}

main().catch((error) => {
  console.error('[Chronos export failed]', error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
});
