import assert from 'node:assert/strict';
import {
  assertLegacyArchiveTargetEmpty,
  buildLegacyArchiveRow,
  countLegacySnapshot,
  snapshotSha256,
  validateLegacyExport
} from '../server/migrations/legacySnapshot.ts';

const snapshot = {
  version: 'legacy-test',
  users: [{ id: 'u1' }],
  workspaces: [{ id: 'w1' }],
  partitions: {
    u1: {
      tasks: [{ id: 't1' }],
      goals: [{ id: 'g1' }],
      projects: [{ id: 'p1' }],
      calendarEvents: [{ id: 'e1' }],
      timeLogs: [{ id: 'l1' }]
    }
  },
  teamProjects: [{ id: 'tp1' }],
  teamTasks: [{ id: 'tt1' }],
  teamInvitations: []
};

const counts = countLegacySnapshot(snapshot);
assert.equal(counts.users, 1);
assert.equal(counts.personalTasks, 1);
assert.equal(counts.teamProjects, 1);

const validExport = {
  format: 'chronos-legacy-postgres-export',
  formatVersion: 1,
  exportedAt: new Date(0).toISOString(),
  source: { table: 'chronos_data', key: 'root', version: 7, applicationVersion: 'legacy-test' },
  counts,
  integrity: { algorithm: 'sha256', snapshotSha256: snapshotSha256(snapshot) },
  snapshot
};
assert.doesNotThrow(() => validateLegacyExport(validExport));

const tampered = structuredClone(validExport);
tampered.snapshot.users[0].id = 'tampered';
assert.throws(() => validateLegacyExport(tampered), /SHA-256/);

const wrongCounts = structuredClone(validExport);
wrongCounts.counts.users = 99;
assert.throws(() => validateLegacyExport(wrongCounts), /counts/);

console.log('Legacy snapshot export tests: 5 assertions passed.');

const archiveRow = buildLegacyArchiveRow(validExport);
assert.equal(archiveRow.id, 'chronos-legacy-root-v1');
assert.equal(archiveRow.checksum, validExport.integrity.snapshotSha256);
assert.equal(archiveRow.payload.users.length, 1);
assert.doesNotThrow(() => assertLegacyArchiveTargetEmpty(0, 0));
assert.throws(() => assertLegacyArchiveTargetEmpty(1, 0), /not empty/);
assert.throws(() => assertLegacyArchiveTargetEmpty(0, 1), /not empty/);

console.log('Legacy archive preparation tests: 6 additional assertions passed.');
