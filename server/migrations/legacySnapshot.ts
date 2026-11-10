import { createHash } from 'node:crypto';

export interface LegacySnapshotCounts {
  users: number;
  workspaces: number;
  personalPartitions: number;
  personalTasks: number;
  goals: number;
  personalProjects: number;
  calendarEvents: number;
  timeLogs: number;
  teamProjects: number;
  teamTasks: number;
  teamInvitations: number;
}

export interface LegacySnapshotExport {
  format: 'chronos-legacy-postgres-export';
  formatVersion: 1;
  exportedAt: string;
  source: {
    table: 'chronos_data' | 'local_json_file';
    key: 'root';
    version: number;
    applicationVersion: string;
  };
  counts: LegacySnapshotCounts;
  integrity: {
    algorithm: 'sha256';
    snapshotSha256: string;
  };
  snapshot: Record<string, any>;
}

export function snapshotSha256(snapshot: unknown): string {
  return createHash('sha256').update(JSON.stringify(snapshot), 'utf8').digest('hex');
}

function countArray(value: any): number {
  return Array.isArray(value) ? value.length : 0;
}

export function countLegacySnapshot(snapshot: Record<string, any>): LegacySnapshotCounts {
  const partitions = snapshot.partitions && typeof snapshot.partitions === 'object'
    ? Object.values(snapshot.partitions) as any[]
    : [];

  return {
    users: countArray(snapshot.users),
    workspaces: countArray(snapshot.workspaces),
    personalPartitions: partitions.length,
    personalTasks: partitions.reduce((sum, p) => sum + countArray(p?.tasks), 0),
    goals: partitions.reduce((sum, p) => sum + countArray(p?.goals), 0),
    personalProjects: partitions.reduce((sum, p) => sum + countArray(p?.projects), 0),
    calendarEvents: partitions.reduce((sum, p) => sum + countArray(p?.calendarEvents), 0),
    timeLogs: partitions.reduce((sum, p) => sum + countArray(p?.timeLogs), 0),
    teamProjects: countArray(snapshot.teamProjects),
    teamTasks: countArray(snapshot.teamTasks),
    teamInvitations: countArray(snapshot.teamInvitations)
  };
}

export function validateLegacyExport(value: any): asserts value is LegacySnapshotExport {
  if (!value || typeof value !== 'object' || value.format !== 'chronos-legacy-postgres-export' || value.formatVersion !== 1) {
    throw new Error('Unsupported Chronos legacy export format.');
  }
  if (!value.snapshot || typeof value.snapshot !== 'object' || Array.isArray(value.snapshot)) {
    throw new Error('Export does not contain a valid snapshot object.');
  }
  if ((value.source?.table !== 'chronos_data' && value.source?.table !== 'local_json_file') || value.source?.key !== 'root' || !Number.isFinite(Number(value.source?.version))) {
    throw new Error('Export source metadata is invalid.');
  }
  const expected = value.integrity?.snapshotSha256;
  const actual = snapshotSha256(value.snapshot);
  if (value.integrity?.algorithm !== 'sha256' || typeof expected !== 'string' || expected !== actual) {
    throw new Error('Snapshot SHA-256 verification failed. Do not import this file.');
  }
  const counts = countLegacySnapshot(value.snapshot);
  if (JSON.stringify(counts) !== JSON.stringify(value.counts)) {
    throw new Error('Snapshot record counts do not match the export manifest.');
  }
}


export interface LegacyArchiveRow {
  id: string;
  userId: null;
  sourceVersion: string;
  payload: Record<string, any>;
  checksum: string;
}

export function buildLegacyArchiveRow(exportFile: LegacySnapshotExport): LegacyArchiveRow {
  validateLegacyExport(exportFile);
  return {
    id: 'chronos-legacy-root-v1',
    userId: null,
    sourceVersion: `${exportFile.source.applicationVersion};postgres-row-version=${exportFile.source.version}`,
    payload: exportFile.snapshot,
    checksum: exportFile.integrity.snapshotSha256
  };
}

export function assertLegacyArchiveTargetEmpty(userCount: number, legacySnapshotCount: number): void {
  if (userCount !== 0 || legacySnapshotCount !== 0) {
    throw new Error(
      'Relational archive target is not empty. Refusing to mix a legacy snapshot into an initialized database.'
    );
  }
}
