import { test } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set isolated test database
const TEST_DIR = path.resolve(__dirname, `../tmp-test-admin-${Date.now()}`);
fs.mkdirSync(TEST_DIR, { recursive: true });
const TEST_DB = path.join(TEST_DIR, 'db.json');
process.env.CHRONOS_DATA_FILE = TEST_DB;
process.env.NODE_ENV = 'development';
process.env.JWT_SECRET = 'chronos-test-secret-key-production-min-32-chars-2026';

const { app } = await import('../server/app.ts');
const { db } = await import('../server/db.ts');

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(process.env.JWT_SECRET);
}

async function createToken(userId: string, email: string, role: string, name: string): Promise<string> {
  return new SignJWT({ sub: userId, email, role, name })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer('chronos-os')
    .setAudience('chronos-clients')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(getSecretKey());
}

async function request(server: http.Server, method: string, urlPath: string, headers: Record<string, string> = {}, body?: any): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const addr = server.address() as any;
    const req = http.request(
      {
        host: '127.0.0.1',
        port: addr.port,
        path: urlPath,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      },
      (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          try {
            const parsed = raw ? JSON.parse(raw) : null;
            resolve({ status: res.statusCode || 500, body: parsed });
          } catch {
            resolve({ status: res.statusCode || 500, body: raw });
          }
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

test('Super Admin Security & Control Center Full Verification', async (t) => {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

  // Initialize DB
  await db.ready();

  // Create users: Regular User, Target User, and Super Admin
  const normalUserId = 'user-normal-1';
  const normalUser = db.createUser({
    id: normalUserId,
    name: 'Normal User',
    email: 'normal@test.com',
    passwordHash: bcrypt.hashSync('Pass123456789!', 10),
    role: 'Member',
    status: 'active',
    title: 'Developer',
    avatarColor: 'from-blue-600 to-indigo-600',
    initials: 'NU',
    joinedAt: new Date().toISOString().split('T')[0]
  });

  const targetUserId = 'user-target-1';
  const targetUser = db.createUser({
    id: targetUserId,
    name: 'Target User',
    email: 'target@test.com',
    passwordHash: bcrypt.hashSync('Pass123456789!', 10),
    role: 'Member',
    status: 'active',
    title: 'Analyst',
    avatarColor: 'from-emerald-600 to-teal-600',
    initials: 'TU',
    joinedAt: new Date().toISOString().split('T')[0]
  });

  const adminUserId = 'user-admin-1';
  const adminUser = db.createUser({
    id: adminUserId,
    name: 'Platform Owner',
    email: 'owner@test.com',
    passwordHash: bcrypt.hashSync('AdminPass123456789!', 10),
    role: 'superadmin',
    status: 'active',
    title: 'Platform Owner',
    avatarColor: 'from-violet-600 to-indigo-600',
    initials: 'PO',
    joinedAt: new Date().toISOString().split('T')[0]
  });

  const normalToken = await createToken(normalUser.id, normalUser.email, normalUser.role, normalUser.name);
  const adminToken = await createToken(adminUser.id, adminUser.email, adminUser.role, adminUser.name);

  await t.test('1. Unauthenticated request to /api/admin/overview is blocked (401)', async () => {
    const res = await request(server, 'GET', '/api/admin/overview');
    assert.strictEqual(res.status, 401);
  });

  await t.test('2. Regular user (role: Member) requesting /api/admin/overview is strictly rejected (403 Forbidden)', async () => {
    const res = await request(server, 'GET', '/api/admin/overview', {
      Authorization: `Bearer ${normalToken}`
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.error, /Super Admin privileges required/);
  });

  await t.test('3. Regular user attempting to access /api/admin/users is strictly rejected (403 Forbidden)', async () => {
    const res = await request(server, 'GET', '/api/admin/users', {
      Authorization: `Bearer ${normalToken}`
    });
    assert.strictEqual(res.status, 403);
  });

  await t.test('4. Super Admin can access /api/admin/me and receive permissions', async () => {
    const res = await request(server, 'GET', '/api/admin/me', {
      Authorization: `Bearer ${adminToken}`
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.isSuperAdmin, true);
    assert.strictEqual(res.body.user.email, 'owner@test.com');
  });

  await t.test('5. Super Admin can query /api/admin/overview with accurate real database stats', async () => {
    const res = await request(server, 'GET', '/api/admin/overview', {
      Authorization: `Bearer ${adminToken}`
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.users.total >= 3);
    assert.ok(res.body.data.projects.total >= 0);
  });

  await t.test('6. Super Admin can query /api/admin/analytics with timeframe filtering', async () => {
    const res = await request(server, 'GET', '/api/admin/analytics?timeframe=30d', {
      Authorization: `Bearer ${adminToken}`
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.timeframe, '30d');
    assert.ok(Array.isArray(res.body.data.registrationTrend));
  });

  await t.test('7. Super Admin can list and search users', async () => {
    const res = await request(server, 'GET', '/api/admin/users?q=target', {
      Authorization: `Bearer ${adminToken}`
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.length, 1);
    assert.strictEqual(res.body.data[0].email, 'target@test.com');
  });

  await t.test('8. Super Admin cannot suspend themselves (Safety Control)', async () => {
    const res = await request(server, 'PATCH', `/api/admin/users/${adminUser.id}/status`, {
      Authorization: `Bearer ${adminToken}`
    }, { status: 'suspended' });
    assert.strictEqual(res.status, 400);
    assert.match(res.body.error, /cannot suspend their own active account/i);
  });

  await t.test('9. Super Admin can suspend a target user', async () => {
    const res = await request(server, 'PATCH', `/api/admin/users/${targetUser.id}/status`, {
      Authorization: `Bearer ${adminToken}`
    }, { status: 'suspended', reason: 'Terms of service violation' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);

    const freshTarget = db.getUserById(targetUser.id);
    assert.strictEqual(freshTarget?.status, 'suspended');
  });

  await t.test('10. Suspended user is immediately blocked from logging in (403 Forbidden)', async () => {
    const res = await request(server, 'POST', '/api/auth/login', {}, {
      email: 'target@test.com',
      password: 'Pass123456789!'
    });
    assert.strictEqual(res.status, 403);
    assert.match(res.body.error, /suspended/i);
  });

  await t.test('11. Suspended user with existing JWT token is blocked by authenticateToken (403 Forbidden)', async () => {
    const targetToken = await createToken(targetUser.id, targetUser.email, targetUser.role, targetUser.name);
    const res = await request(server, 'GET', '/api/tasks', {
      Authorization: `Bearer ${targetToken}`
    });
    assert.strictEqual(res.status, 403);
    assert.match(res.body.error, /suspended/i);
  });

  await t.test('12. Super Admin can reactivate the suspended user', async () => {
    const res = await request(server, 'PATCH', `/api/admin/users/${targetUser.id}/status`, {
      Authorization: `Bearer ${adminToken}`
    }, { status: 'active', reason: 'Account reviewed and restored' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);

    const freshTarget = db.getUserById(targetUser.id);
    assert.strictEqual(freshTarget?.status, 'active');
  });

  await t.test('13. Super Admin can inspect audit logs recording all sensitive operations', async () => {
    const res = await request(server, 'GET', '/api/admin/audit-logs', {
      Authorization: `Bearer ${adminToken}`
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.data.length >= 2);
    const actions = res.body.data.map((l: any) => l.action);
    assert.ok(actions.includes('user.suspended'));
    assert.ok(actions.includes('user.reactivated'));
  });

  await t.test('14. Super Admin can query system diagnostics', async () => {
    const res = await request(server, 'GET', '/api/admin/system/health', {
      Authorization: `Bearer ${adminToken}`
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.status, 'operational');
    assert.ok(res.body.data.memory.heapUsedMb > 0);
  });

  server.close();
  // Cleanup tmp dir
  try {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  } catch {}
});
