import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { countLegacySnapshot, snapshotSha256, type LegacySnapshotExport } from '../server/migrations/legacySnapshot.ts';
import { importLegacySnapshotToRelational } from '../server/migrations/relationalImporter.ts';
import { loadRelationalSnapshot, persistRelationalSnapshot } from '../server/migrations/relationalStore.ts';
import { decryptGoogleToken, decryptJsonPayload } from '../server/security/dataEncryption.ts';

if (process.env.CHRONOS_RELATIONAL_IMPORT_TEST !== '1') {
  throw new Error('Refusing to run relational import tests without CHRONOS_RELATIONAL_IMPORT_TEST=1 and a dedicated disposable database.');
}
if (!process.env.DATABASE_URL || !/chronos_import_test/i.test(new URL(process.env.DATABASE_URL).pathname)) {
  throw new Error('Relational importer tests require a dedicated database named chronos_import_test.');
}

process.env.CHRONOS_DATA_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const snapshot = {
  version: 'test-fixture-v1',
  users: [
    { id: 'user-a', name: 'Alice', email: 'alice@example.test', passwordHash: '$2a$10$fixture', role: 'Member', title: 'Owner', avatarColor: '#111111', initials: 'AL', joinedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'user-b', name: 'Bob', email: 'bob@example.test', passwordHash: '$2a$10$fixture', role: 'Member', title: 'Member', avatarColor: '#222222', initials: 'BO', joinedAt: '2026-01-02T00:00:00.000Z' }
  ],
  workspaces: [{ id: 'workspace-a', name: 'Alice Space', slug: 'alice-space', ownerId: 'user-a', isPersonal: true, createdAt: '2026-01-01T00:00:00.000Z', members: [{ userId: 'user-a', role: 'OWNER', joinedAt: '2026-01-01T00:00:00.000Z', legacyMemberFlag: true }] }],
  partitions: {
    'user-a': {
      tasks: [{ id: 'task-a', title: 'Private task', description: 'keep me', category: 'Work/Career', priority: 'High', status: 'todo', eisenhower: 'q1_urgent_important', energyLevel: 'High Focus', dueDate: '2026-12-01', dueTime: '09:00', durationMinutes: 30, subtasks: [{ id: 'sub-a', title: 'Step one', completed: false, legacySubtaskFlag: 'keep' }], goalId: 'goal-a', projectId: 'personal-project-a', tags: ['private'], syncedToGoogle: false, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }],
      goals: [{ id: 'goal-a', title: 'Goal', description: 'Goal details', category: 'Work/Career', timeframe: 'quarterly', targetDate: '2026-12-31', progressPercent: 25, keyResults: [{ id: 'kr-a', title: 'Key result', currentValue: 1, targetValue: 4, unit: 'items', completed: false, legacyKeyResultFlag: 'keep' }], createdAt: '2026-01-01T00:00:00.000Z' }],
      projects: [{ id: 'personal-project-a', name: 'Personal project', description: 'Project details', category: 'Work/Career', goalId: 'goal-a', status: 'in_progress', targetHours: 10, loggedHours: 2, hourlyValuation: 20, color: 'blue', createdAt: '2026-01-01T00:00:00.000Z' }],
      calendarEvents: [{ id: 'event-a', title: 'Event', startTime: '2026-02-01T10:00:00.000Z', endTime: '2026-02-01T11:00:00.000Z', category: 'Work/Career', isGoogleEvent: false, taskId: 'task-a' }],
      timeLogs: [{ id: 'log-a', taskId: 'task-a', projectId: 'personal-project-a', durationSeconds: 1800, hourlyRate: 20, calculatedRoi: 10, efficiencyRate: 90, energyReported: 'High', startedAt: '2026-02-01T10:00:00.000Z', endedAt: '2026-02-01T10:30:00.000Z' }],
      skills: [{ id: 'skill-a', name: 'Planning', category: 'Work', level: 2, currentXp: 20, requiredXp: 100, masteryPct: 20, icon: 'Target', description: 'Planning', unlocked: true, perks: [] }],
      badges: [{ id: 'badge-a', name: 'Starter', description: 'Started', icon: 'Star', category: 'Progress', xpBonus: 10, unlocked: true }],
      stats: { focusMinutes: 30, pomodoroSessions: 1, totalXp: 20, userLevel: 2, rpgTitle: 'Novice', focusScore: 90, totalRoiDollars: 10, activityHistory: { '2026-02-01': 1 }, legacyStatsFlag: 'keep' },
      googleAuth: { isConnected: false, email: '', accessToken: 'fixture-access-token', refreshToken: 'fixture-refresh-token', tokenExpiry: '2027-01-01T00:00:00.000Z', calendarId: 'fixture-calendar', legacyGoogleFlag: 'keep' }
    },
    'user-b': { tasks: [], goals: [], projects: [], calendarEvents: [], timeLogs: [], skills: [], badges: [], stats: {}, googleAuth: { isConnected: false, email: '' } }
  },
  teamProjects: [{ id: 'team-project-a', workspaceId: 'workspace-a', ownerId: 'user-a', ownerEmail: 'alice@example.test', name: 'Team project', key: 'TEAM', description: 'Team details', color: '#123456', icon: 'Shield', memberIds: ['user-a', 'user-b'], memberRoles: { 'user-a': 'OWNER', 'user-b': 'MEMBER' }, createdAt: '2026-01-01T00:00:00.000Z' }],
  teamTasks: [{ id: 'team-task-a', taskNumber: 1, projectId: 'team-project-a', columnId: 'todo', title: 'Team task', priority: 'high', assigneeId: 'user-b', subtasks: [{ id: 'team-sub-a', title: 'Team step', completed: false, legacyTeamSubtaskFlag: 'keep' }], tags: ['release'], comments: [{ id: 'comment-a', authorId: 'user-b', authorName: 'Bob', authorInitials: 'BO', authorColor: '#222222', text: 'Ready', createdAt: '2026-01-02T00:00:00.000Z' }], order: 0, createdAt: '2026-01-02T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z' }],
  teamInvitations: [{ id: 'invite-a', projectId: 'team-project-a', projectName: 'Team project', projectKey: 'TEAM', projectColor: '#123456', invitedEmail: 'new-person@example.test', invitedByUserId: 'user-a', invitedByName: 'Alice', invitedByEmail: 'alice@example.test', role: 'MEMBER', status: 'PENDING', createdAt: '2026-01-03T00:00:00.000Z' }]
};
const exported: LegacySnapshotExport = {
  format: 'chronos-legacy-postgres-export', formatVersion: 1, exportedAt: new Date(0).toISOString(),
  source: { table: 'chronos_data', key: 'root', version: 1, applicationVersion: 'test-fixture-v1' },
  counts: countLegacySnapshot(snapshot), integrity: { algorithm: 'sha256', snapshotSha256: snapshotSha256(snapshot) }, snapshot
};

const prisma = new PrismaClient();
try {
  const before = await prisma.user.count();
  assert.equal(before, 0, 'test database starts empty');
  const result = await importLegacySnapshotToRelational(prisma, exported);
  assert.equal(result.status, 'IMPORTED');
  assert.equal(await prisma.user.count(), 2);
  assert.equal(await prisma.task.count(), 1);
  assert.equal(await prisma.subTask.count(), 1);
  assert.equal(await prisma.goalOKR.count(), 1);
  assert.equal(await prisma.keyResult.count(), 1);
  assert.equal(await prisma.teamProject.count(), 1);
  assert.equal(await prisma.teamTask.count(), 1);
  assert.equal(await prisma.teamTaskComment.count(), 1);
  assert.equal(await prisma.projectInvitation.count(), 1);
  await prisma.project.create({ data: {
    id: 'foreign-project-b', userId: 'user-b', name: 'Bob private project',
    status: 'IN_PROGRESS', createdAt: new Date(), updatedAt: new Date()
  }});
  await assert.rejects(
    () => prisma.task.create({ data: {
      id: 'cross-tenant-task', userId: 'user-a', projectId: 'foreign-project-b',
      title: 'Must be rejected', createdAt: new Date(), updatedAt: new Date()
    } }),
    /foreign key|constraint|violates/i
  );
  assert.equal(await prisma.task.count(), 1, 'composite foreign keys reject cross-user project references');

  const invitation = await prisma.projectInvitation.findUnique({ where: { id: 'invite-a' } });
  assert.equal(invitation?.recipientId, null, 'pending invitations to unregistered email addresses are retained');
  const task = await prisma.task.findUnique({ where: { id: 'task-a' }, include: { subtasks: true } });
  assert.equal(task?.userId, 'user-a');
  assert.equal(task?.subtasks[0]?.id, 'sub-a');
  const membership = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId: 'team-project-a', userId: 'user-b' } } });
  assert.equal(membership?.role, 'MEMBER');
  const archive = await prisma.legacySnapshot.findUnique({ where: { id: 'chronos-legacy-root-v1' } });
  assert.equal(archive?.checksum, exported.integrity.snapshotSha256);
  assert.deepEqual(decryptJsonPayload(archive?.payload), snapshot);
  const storedGoogle = await prisma.googleConnection.findUnique({ where: { userId: 'user-a' } });
  assert.ok(storedGoogle?.accessToken?.startsWith('chronos-token:v1:'));
  assert.equal(decryptGoogleToken(storedGoogle?.accessToken), 'fixture-access-token');
  const loaded = await loadRelationalSnapshot(prisma);
  assert.equal(loaded.version, 1n);
  loaded.data.partitions['user-a'].tasks[0].title = 'Updated through relational runtime';
  const nextVersion = await persistRelationalSnapshot(prisma, loaded.data, loaded.version);
  assert.equal(nextVersion, 2n);
  const reloaded = await loadRelationalSnapshot(prisma);
  assert.equal(reloaded.data.partitions['user-a'].tasks[0].title, 'Updated through relational runtime');
  assert.equal((reloaded.data.partitions['user-a'].tasks[0].subtasks[0] as any).legacySubtaskFlag, 'keep');
  assert.equal((reloaded.data.partitions['user-a'].goals[0].keyResults[0] as any).legacyKeyResultFlag, 'keep');
  assert.equal((reloaded.data.partitions['user-a'].stats as any).legacyStatsFlag, 'keep');
  assert.equal((reloaded.data.partitions['user-a'].googleAuth as any).legacyGoogleFlag, 'keep');
  assert.equal((reloaded.data.partitions['user-a'].googleAuth as any).accessToken, 'fixture-access-token');
  assert.equal((reloaded.data.partitions['user-a'].googleAuth as any).refreshToken, 'fixture-refresh-token');
  assert.equal((reloaded.data.workspaces[0].members[0] as any).legacyMemberFlag, true);
  assert.equal((reloaded.data.teamTasks[0].subtasks[0] as any).legacyTeamSubtaskFlag, 'keep');
  await assert.rejects(
    () => persistRelationalSnapshot(prisma, loaded.data, loaded.version),
    /changed in another instance/
  );

  const repeated = await importLegacySnapshotToRelational(prisma, exported);
  assert.equal(repeated.status, 'ALREADY_IMPORTED');
  assert.equal(await prisma.user.count(), 2, 're-running the same import does not duplicate users');
  console.log('Relational importer integration tests passed.');
} finally {
  await prisma.$disconnect();
}
