import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { validateLegacyExport, type LegacySnapshotExport } from '../server/migrations/legacySnapshot.ts';
import { importLegacySnapshotToRelational } from '../server/migrations/relationalImporter.ts';

function arg(flag: string) { const i=process.argv.indexOf(flag); return i<0?undefined:process.argv[i+1]; }

async function main() {
  const file=arg('--file');
  if(!file || !path.isAbsolute(file)) throw new Error('Provide an absolute verified export path with --file.');
  const exported=JSON.parse(fs.readFileSync(file,'utf8')) as LegacySnapshotExport;
  validateLegacyExport(exported);

  if(!process.argv.includes('--apply')) {
    const dryRun=await importLegacySnapshotToRelational({} as PrismaClient,exported,{dryRun:true});
    console.log(JSON.stringify({
      ...dryRun,
      source: exported.source,
      counts: exported.counts,
      applyInstruction: 'npm run db:import-legacy-archive -- --file "'+file+'" --apply --expected-sha256 '+exported.integrity.snapshotSha256
    },null,2));
    return;
  }

  if(arg('--expected-sha256')!==exported.integrity.snapshotSha256) {
    throw new Error('The --expected-sha256 value must exactly match the verified export digest.');
  }
  if(!process.env.DATABASE_URL || !/^postgres(?:ql)?:\\/\\//i.test(process.env.DATABASE_URL)) {
    throw new Error('A valid target PostgreSQL DATABASE_URL is required. The URL is never printed.');
  }

  const prisma=new PrismaClient();
  try {
    const result=await importLegacySnapshotToRelational(prisma,exported);
    console.log(JSON.stringify(result,null,2));
    console.warn('The full legacy snapshot remains archived in LegacySnapshot with SHA-256 verification. Review the row-count reconciliation before enabling runtime cutover.');
  } finally {
    await prisma.$disconnect();
  }
}
main().catch(e=>{console.error('[Chronos relational import]',e instanceof Error?e.message:'Unknown error');process.exitCode=1;});
