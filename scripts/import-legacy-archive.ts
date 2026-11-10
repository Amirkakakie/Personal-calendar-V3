import fs from 'node:fs';
import path from 'node:path';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  assertLegacyArchiveTargetEmpty,
  buildLegacyArchiveRow,
  validateLegacyExport,
  type LegacySnapshotExport
} from '../server/migrations/legacySnapshot.ts';

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const filePath = argValue('--file');
  if (!filePath || !path.isAbsolute(filePath)) {
    throw new Error('Provide an absolute verified export path using --file.');
  }

  const exportFile = JSON.parse(fs.readFileSync(filePath, 'utf8')) as LegacySnapshotExport;
  validateLegacyExport(exportFile);
  const archive = buildLegacyArchiveRow(exportFile);
  const apply = process.argv.includes('--apply');

  if (!apply) {
    console.log('DRY RUN: legacy snapshot is valid and ready for archival import.');
    console.log(JSON.stringify({
      target: 'LegacySnapshot',
      archiveId: archive.id,
      sourceVersion: archive.sourceVersion,
      sha256: archive.checksum,
      counts: exportFile.counts,
      actionRequired: 'Re-run with --apply --expected-sha256 <digest> after deploying the Prisma baseline migration.'
    }, null, 2));
    return;
  }

  const expectedHash = argValue('--expected-sha256');
  if (!expectedHash || expectedHash !== archive.checksum) {
    throw new Error('For --apply, --expected-sha256 must exactly match the verified export digest.');
  }
  if (!process.env.DATABASE_URL || !/^postgres(?:ql)?:\/\//i.test(process.env.DATABASE_URL)) {
    throw new Error('A valid target PostgreSQL DATABASE_URL is required. The URL is never printed.');
  }

  const prisma = new PrismaClient();
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.legacySnapshot.findUnique({ where: { id: archive.id } });
      if (existing) {
        if (existing.checksum === archive.checksum) {
          return { status: 'already-imported' as const };
        }
        throw new Error('A legacy archive with the stable ID already exists but has a different checksum. No data was changed.');
      }

      const [userCount, snapshotCount] = await Promise.all([
        tx.user.count(),
        tx.legacySnapshot.count()
      ]);
      assertLegacyArchiveTargetEmpty(userCount, snapshotCount);

      await tx.legacySnapshot.create({
        data: {
          id: archive.id,
          userId: null,
          sourceVersion: archive.sourceVersion,
          payload: archive.payload as Prisma.InputJsonValue,
          checksum: archive.checksum
        }
      });

      const verified = await tx.legacySnapshot.findUnique({ where: { id: archive.id } });
      if (!verified || verified.checksum !== archive.checksum) {
        throw new Error('Post-write archive checksum verification failed; transaction rolled back.');
      }
      return { status: 'imported' as const };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    console.log('Chronos legacy snapshot archival result:');
    console.log(JSON.stringify({
      status: result.status,
      archiveId: archive.id,
      sha256: archive.checksum,
      counts: exportFile.counts
    }, null, 2));
    console.warn('This step archives the complete legacy snapshot. It does not switch application reads/writes to Prisma or normalize each domain record yet.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[Chronos legacy archive import failed]', error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
});
