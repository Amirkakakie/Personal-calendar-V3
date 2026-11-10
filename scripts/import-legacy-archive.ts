import fs from 'node:fs';
import path from 'node:path';
import { Prisma, PrismaClient } from '@prisma/client';
import { assertLegacyArchiveTargetEmpty, buildLegacyArchiveRow, validateLegacyExport, type LegacySnapshotExport } from '../server/migrations/legacySnapshot.ts';

function arg(flag: string) { const i=process.argv.indexOf(flag); return i<0?undefined:process.argv[i+1]; }

async function main() {
  const file=arg('--file');
  if(!file || !path.isAbsolute(file)) throw new Error('Provide an absolute verified export path with --file.');
  const exported=JSON.parse(fs.readFileSync(file,'utf8')) as LegacySnapshotExport;
  validateLegacyExport(exported);
  const archive=buildLegacyArchiveRow(exported);
  if(!process.argv.includes('--apply')) {
    console.log(JSON.stringify({mode:'DRY_RUN',target:'LegacySnapshot',id:archive.id,sha256:archive.checksum,counts:exported.counts,applyInstruction:'Add --apply --expected-sha256 '+archive.checksum},null,2));
    return;
  }
  if(arg('--expected-sha256')!==archive.checksum) throw new Error('The --expected-sha256 value must exactly match the verified export digest.');
  if(!process.env.DATABASE_URL || !/^postgres(?:ql)?:\/\//i.test(process.env.DATABASE_URL)) throw new Error('A valid target PostgreSQL DATABASE_URL is required.');
  const prisma=new PrismaClient();
  try {
    const result=await prisma.$transaction(async tx=>{
      const prior=await tx.legacySnapshot.findUnique({where:{id:archive.id}});
      if(prior) {
        if(prior.checksum===archive.checksum) return 'already-imported';
        throw new Error('Stable archive ID exists with a different checksum; refusing to overwrite.');
      }
      const [users,snapshots]=await Promise.all([tx.user.count(),tx.legacySnapshot.count()]);
      assertLegacyArchiveTargetEmpty(users,snapshots);
      await tx.legacySnapshot.create({data:{id:archive.id,userId:null,sourceVersion:archive.sourceVersion,payload:archive.payload as Prisma.InputJsonValue,checksum:archive.checksum}});
      const verify=await tx.legacySnapshot.findUnique({where:{id:archive.id}});
      if(!verify || verify.checksum!==archive.checksum) throw new Error('Read-after-write checksum verification failed; transaction rolled back.');
      return 'imported';
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
    console.log(JSON.stringify({status:result,id:archive.id,sha256:archive.checksum,counts:exported.counts},null,2));
    console.warn('This archives the intact legacy root only. It does not cut application reads/writes over to normalized Prisma models.');
  } finally { await prisma.$disconnect(); }
}
main().catch(e=>{console.error('[Chronos legacy archive import]',e instanceof Error?e.message:'Unknown error');process.exitCode=1;});
