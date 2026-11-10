import assert from 'assert';
import http from 'http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// E2E data is isolated from the developer's local database and repository.
process.env.NODE_ENV = 'test';
const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chronos-e2e-'));
process.env.CHRONOS_DATA_FILE = path.join(testDataDir, 'db.json');
const [{ default: app }, { db }] = await Promise.all([
  import('../server/app.ts'),
  import('../server/db.ts')
]);

async function runAllTests() {
  console.log('\n======================================================');
  console.log(' Chronos E2E Full-Stack Audit: AI, Auth, DB & Isolation');
  console.log('======================================================\n');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => Promise<void>) {
    total++;
    try {
      await fn();
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ [FAIL] ${name}`);
      console.error(`     Error: ${err.message}`);
      throw err;
    }
  }

  try {
    // -----------------------------------------------------------------
    // 1. DATABASE & SERVERLESS PERSISTENCE HEALTH DIAGNOSTICS
    // -----------------------------------------------------------------
    await test('Database health diagnostic endpoint reports valid persistence engine', async () => {
      const res = await fetch(`${baseUrl}/api/health/db`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, 'healthy');
      assert.ok(data.persistenceEngine, 'Should report active persistence engine');
      assert.strictEqual(typeof data.usersCount, 'number');
    });

    // -----------------------------------------------------------------
    // 2. REGISTRATION & LOGIN LIFECYCLE (STRICT PASSWORD & EMAIL NORMALIZATION)
    // -----------------------------------------------------------------
    const uniqueNum = Date.now();
    const testEmail = `AUDIT.User.${uniqueNum}@CHRONOS.ai`;
    const strongPassword = 'StrongPassword123!';

    let userToken = '';
    let userId = '';

    await test('Registration enforces minimum 8-character password', async () => {
      const res = await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Short Pass',
          email: `short.${uniqueNum}@chronos.ai`,
          password: 'short'
        })
      });
      assert.strictEqual(res.status, 400);
      const body = await res.json();
      assert.ok(body.error?.includes('8 characters'));
    });

    await test('Registration succeeds with strong password and normalizes email', async () => {
      const res = await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Audit User',
          email: testEmail,
          password: strongPassword,
          title: 'Principal Architect'
        })
      });
      assert.strictEqual(res.status, 201);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.ok(body.token, 'Should return JWT token');
      assert.strictEqual(body.user.email, testEmail.toLowerCase());
      assert.strictEqual(body.user.name, 'Audit User');
      assert.strictEqual(body.user.passwordHash, undefined, 'Password hash must never leak in response');

      userToken = body.token;
      userId = body.user.id;
    });

    await test('Newly registered user receives a clean blank slate', async () => {
      const res = await fetch(`${baseUrl}/api/tasks`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.length, 0, 'New user should start with 0 tasks');
    });

    await test('Login is case-insensitive for email address', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `audit.user.${uniqueNum}@chronos.ai`, // Lowercase variation
          password: strongPassword
        })
      });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.user.id, userId);
    });

    await test('Session verification via /api/auth/me returns safe profile & workspaces', async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.user.id, userId);
      assert.ok(Array.isArray(body.workspaces), 'Should include user workspaces');
    });

    // -----------------------------------------------------------------
    // 3. GOOGLE OAUTH AUTHENTICATION (AUTO-PROVISIONING & LINKING)
    // -----------------------------------------------------------------
    await test('GET /api/auth/google/config returns configuration state', async () => {
      const res = await fetch(`${baseUrl}/api/auth/google/config`);
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(typeof body.configured, 'boolean');
      assert.strictEqual(typeof body.clientId, 'string');
    });

    await test('POST /api/auth/google rejects missing credential or code', async () => {
      const res = await fetch(`${baseUrl}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      assert.strictEqual(res.status, 400);
    });

    const googleNewEmail = `google.new.${uniqueNum}@gmail.com`;
    let googleUserToken = '';
    let googleUserId = '';

    await test('POST /api/auth/google automatically creates account for first-time Google sign-in', async () => {
      const res = await fetch(`${baseUrl}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: `test-mock-google-token:${googleNewEmail}`
        })
      });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.ok(body.token, 'Should issue signed Chronos JWT session');
      assert.strictEqual(body.user.email, googleNewEmail);
      assert.ok(body.user.googleId, 'Should store googleId');

      googleUserToken = body.token;
      googleUserId = body.user.id;
    });

    await test('POST /api/auth/google safely links to existing email account', async () => {
      // Sign in with the email created in registration test
      const res = await fetch(`${baseUrl}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: `test-mock-google-token:${testEmail.toLowerCase()}`
        })
      });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.user.id, userId, 'Should link to existing user ID');
      assert.ok(body.user.googleId, 'Should now have googleId linked');
    });

    // -----------------------------------------------------------------
    // 4. MULTI-TENANT ISOLATION
    // -----------------------------------------------------------------
    let createdTaskId = '';
    await test('User A creates a private task', async () => {
      const res = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Deep Work on Chronos Core',
          category: 'Work/Career',
          priority: 'High',
          durationMinutes: 90
        })
      });
      assert.strictEqual(res.status, 201);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      createdTaskId = body.data.id;
    });

    await test('User B (Google User) CANNOT see or access User A task', async () => {
      const res = await fetch(`${baseUrl}/api/tasks`, {
        headers: { Authorization: `Bearer ${googleUserToken}` }
      });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.data.length, 0, 'Google User should have 0 tasks');

      // Attempt to directly update User A's task
      const patchRes = await fetch(`${baseUrl}/api/tasks/${createdTaskId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${googleUserToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: 'Hijacked Task' })
      });
      assert.strictEqual(patchRes.status, 404, 'Direct access to other user task must return 404');
    });

    // -----------------------------------------------------------------
    // 5. GOOGLE GEMINI AI ENDPOINTS
    // -----------------------------------------------------------------
    await test('POST /api/ai/decompose decomposes objective into actionable tasks', async () => {
      const res = await fetch(`${baseUrl}/api/ai/decompose`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          goalTitle: 'Master Kubernetes Architecture & CRD Design',
          category: 'Academic/Study'
        })
      });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.ok(Array.isArray(body.data.tasks), 'Should return task breakdown');
      assert.ok(body.data.tasks.length >= 3, 'Should produce at least 3 actionable tasks');
    });

    await test('POST /api/ai/daily-brief produces tailored circadian schedule', async () => {
      const res = await fetch(`${baseUrl}/api/ai/daily-brief`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ energyLevel: 'High' })
      });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.ok(body.data.summary, 'Should include executive summary');
      assert.ok(Array.isArray(body.data.recommendedSchedule), 'Should include schedule');
    });

    await test('POST /api/ai/coach provides high-leverage strategic guidance', async () => {
      const res = await fetch(`${baseUrl}/api/ai/coach`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: 'How should I structure my deep work block?' })
      });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(typeof body.advice, 'string');
      assert.ok(body.advice.length > 20);
    });

    await test('POST /api/ai/coach/stream returns Server-Sent Events', async () => {
      const res = await fetch(`${baseUrl}/api/ai/coach/stream`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: 'Give me quick focus advice' })
      });
      assert.strictEqual(res.status, 200);
      assert.ok(res.headers.get('content-type')?.includes('text/event-stream'));
      const text = await res.text();
      assert.ok(text.includes('data:'), 'Should emit SSE data frames');
    });

    console.log(`\n======================================================`);
    console.log(` ALL ${passed}/${total} E2E & SECURITY AUDIT ASSERTIONS PASSED!`);
    console.log(`======================================================\n`);
  } finally {
    server.close();
    fs.rmSync(testDataDir, { recursive: true, force: true });
  }
}

runAllTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
