import fs from 'node:fs';
import path from 'node:path';
import { countLegacySnapshot, validateLegacyExport } from '../server/migrations/legacySnapshot.ts';

async function main() {
  const filePath = process.argv[2];
  if (!filePath || !path.isAbsolute(filePath)) {
    throw new Error('Provide an absolute path to a Chronos export JSON file.');
  }
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  validateLegacyExport(parsed);
  console.log('Chronos legacy export integrity: VALID');
  console.log(JSON.stringify({
    exportedAt: parsed.exportedAt,
    sourceVersion: parsed.source.version,
    applicationVersion: parsed.source.applicationVersion,
    sha256: parsed.integrity.snapshotSha256,
    counts: countLegacySnapshot(parsed.snapshot)
  }, null, 2));
}

main().catch((error) => {
  console.error('[Chronos export verification failed]', error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
});
