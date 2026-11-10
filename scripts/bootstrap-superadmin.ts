import 'dotenv/config';
import { db } from '../server/db.ts';

async function main() {
  const args = process.argv.slice(2);
  let email = process.env.CHRONOS_SUPERADMIN_EMAIL || 'amir.work.vr@gmail.com';
  let password = process.env.CHRONOS_SUPERADMIN_PASSWORD;
  let name = process.env.CHRONOS_SUPERADMIN_NAME || 'Platform Super Admin';

  for (const arg of args) {
    if (arg.startsWith('--email=')) email = arg.split('=')[1];
    else if (arg.startsWith('--password=')) password = arg.split('=')[1];
    else if (arg.startsWith('--name=')) name = arg.split('=')[1];
    else if (!email || email === 'amir.work.vr@gmail.com') email = arg;
    else if (!password) password = arg;
  }

  console.log('========================================================');
  console.log('  CHRONOS SUPER ADMIN PROVISIONING & AUDIT TOOL');
  console.log('========================================================');

  await db.ready();

  if (!email) {
    console.error('Error: Administrator email is required. Specify via --email=you@domain.com or CHRONOS_SUPERADMIN_EMAIL');
    process.exit(1);
  }

  const existing = db.getUserByEmail(email);

  if (existing) {
    console.log(`Found existing user account for ${email} (ID: ${existing.id}).`);
    console.log(`Current Role: ${existing.role} | Status: ${existing.status || 'active'}`);

    const res = db.bootstrapSuperAdmin(email, password, name);
    console.log(`✓ ${res.message}`);
    console.log(`✓ Role is now: superadmin`);
    console.log(`✓ Account Status is: active`);
  } else {
    if (!password) {
      console.error(`User ${email} does not exist. A password is required to create a new Super Admin account.`);
      console.error('Usage: npx tsx scripts/bootstrap-superadmin.ts <email> <password> [name]');
      process.exit(1);
    }
    const res = db.bootstrapSuperAdmin(email, password, name);
    if (res.success) {
      console.log(`✓ ${res.message}`);
      console.log(`✓ Super Admin account created with email: ${email}`);
    } else {
      console.error(`✗ Failed: ${res.message}`);
      process.exit(1);
    }
  }

  console.log('--------------------------------------------------------');
  console.log('Active Super Administrators on platform:');
  const admins = db.getAllUsersAdmin({ role: 'superadmin' });
  for (const adm of admins.users) {
    console.log(` - ${adm.name} <${adm.email}> [${adm.id}] Status: ${adm.status}`);
  }
  console.log('========================================================');
  process.exit(0);
}

main().catch(err => {
  console.error('Bootstrap failure:', err);
  process.exit(1);
});
