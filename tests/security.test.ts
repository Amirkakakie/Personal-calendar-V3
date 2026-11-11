import http from 'http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Each test process gets a disposable database file. Test fixtures must never
// be written into the developer's tracked data directory.
process.env.NODE_ENV = 'test';
process.env.CHRONOS_ENABLE_MOCK_GOOGLE_AUTH = 'true';
const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chronos-security-'));
const testDataFile = path.join(testDataDir, 'db.json');
process.env.CHRONOS_DATA_FILE = testDataFile;
const { default: app } = await import('../server/app.ts');
const { getJwtSecret } = await import('../server/middleware/auth.ts');

// ANSI terminal colors for clean test reporting
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    failedCount++;
    console.error(`  ${RED}✗ FAIL:${RESET} ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    passedCount++;
    console.log(`  ${GREEN}✓ PASS:${RESET} ${message}`);
  }
}

async function runSecurityTestSuite() {
  console.log(`\n${BOLD}${CYAN}======================================================${RESET}`);
  console.log(`${BOLD}${CYAN}  CHRONOS SPRINT 01 - AUTOMATED SECURITY TEST SUITE   ${RESET}`);
  console.log(`${BOLD}${CYAN}======================================================${RESET}\n`);

  // Production JWT configuration must fail closed rather than generating
  // per-process secrets that invalidate sessions across instances/restarts.
  const previousNodeEnv = process.env.NODE_ENV;
  const previousJwtSecret = process.env.JWT_SECRET;
  process.env.NODE_ENV = 'production';
  delete process.env.JWT_SECRET;
  assert(
    (() => { try { getJwtSecret(); return false; } catch { return true; } })(),
    'Production rejects a missing JWT_SECRET'
  );
  process.env.JWT_SECRET = 'short-secret';
  assert(
    (() => { try { getJwtSecret(); return false; } catch { return true; } })(),
    'Production rejects a JWT_SECRET shorter than 32 bytes'
  );
  process.env.JWT_SECRET = 'REPLACE_WITH_A_STABLE_RANDOM_SECRET_OF_AT_LEAST_32_BYTES';
  assert(
    (() => { try { getJwtSecret(); return false; } catch { return true; } })(),
    'Production rejects the documented placeholder JWT_SECRET'
  );
  process.env.JWT_SECRET = 'test-only-stable-random-secret-with-at-least-32-bytes';
  assert(
    getJwtSecret() === process.env.JWT_SECRET,
    'Production accepts and returns a configured strong stable JWT_SECRET'
  );
  process.env.NODE_ENV = previousNodeEnv;
  if (previousJwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previousJwtSecret;

  // Start ephemeral server
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as any).port;
  const BASE_URL = `http://127.0.0.1:${port}/api`;
  console.log(`[Test Server] Ephemeral test instance listening on port ${port}\n`);

  try {
    // Browser origins must be explicitly allowed; absent Origin remains valid for non-browser clients.
    const blockedOrigin = await fetch(`${BASE_URL}/health`, { headers: { Origin: 'https://attacker.invalid' } });
    assert(blockedOrigin.status === 403, 'Untrusted browser Origin is rejected');
    const allowedOrigin = await fetch(`${BASE_URL}/health`, { headers: { Origin: 'http://localhost:3000' } });
    assert(allowedOrigin.status === 200 && allowedOrigin.headers.get('access-control-allow-origin') === 'http://localhost:3000', 'Configured development Origin receives an exact CORS allowlist response');

    // ---------------------------------------------------------
    // Setup: Create User A & User B
    // ---------------------------------------------------------
    const ts = Date.now();
    const userAEmail = `alice_${ts}@test.local`;
    const userBEmail = `bob_${ts}@test.local`;
    const userCEmail = `charlie_${ts}@test.local`;
    const password = 'StrongPassword123!';

    // Register User A
    const resRegA = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userAEmail, password, name: 'Alice Architect' })
    });
    const dataRegA = await resRegA.json();
    assert(resRegA.status === 201 && dataRegA.success === true, 'User A registered successfully');
    const tokenA = dataRegA.token;
    const userA = dataRegA.user;

    // Register User B
    const resRegB = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userBEmail, password, name: 'Bob Engineer' })
    });
    const dataRegB = await resRegB.json();
    assert(resRegB.status === 201 && dataRegB.success === true, 'User B registered successfully');
    const tokenB = dataRegB.token;
    const userB = dataRegB.user;

    // ---------------------------------------------------------
    // SCENARIO 1: TASK ISOLATION
    // ---------------------------------------------------------
    console.log(`\n${BOLD}[SCENARIO 1] Task Isolation (User B cannot see User A's task)${RESET}`);
    // User A creates task
    const resCreateTaskA = await fetch(`${BASE_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        title: 'Alice Secret Strategic Plan',
        description: 'Confidential executive roadmap',
        priority: 'high',
        category: 'work'
      })
    });
    const dataCreateTaskA = await resCreateTaskA.json();
    assert(resCreateTaskA.status === 201 && !!dataCreateTaskA.data?.id, 'User A creates private task');
    const taskAId = dataCreateTaskA.data.id;

    // User B lists tasks
    const resListTasksB = await fetch(`${BASE_URL}/tasks`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    const dataListTasksB = await resListTasksB.json();
    assert(resListTasksB.status === 200, 'User B requests their own task list');
    const foundTaskInB = dataListTasksB.data.some((t: any) => t.id === taskAId);
    assert(!foundTaskInB, 'User A task is strictly invisible to User B');

    // ---------------------------------------------------------
    // SCENARIO 2: PROJECT ISOLATION
    // ---------------------------------------------------------
    console.log(`\n${BOLD}[SCENARIO 2] Project Isolation (User B cannot fetch User A's project)${RESET}`);
    // User A creates project
    const resCreateProjA = await fetch(`${BASE_URL}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        name: 'Alice Classified Initiative',
        color: '#f43f5e',
        targetDate: '2026-12-31'
      })
    });
    const dataCreateProjA = await resCreateProjA.json();
    assert(resCreateProjA.status === 201 && !!dataCreateProjA.data?.id, 'User A creates private project');
    const projectAId = dataCreateProjA.data.id;

    // User B attempts to fetch Alice's project by ID
    const resGetProjB = await fetch(`${BASE_URL}/projects/${projectAId}`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert(resGetProjB.status === 404, 'User B request for User A project is rejected with 404 Not Found');

    // ---------------------------------------------------------
    // SCENARIO 3: UNAUTHORIZED UPDATE
    // ---------------------------------------------------------
    console.log(`\n${BOLD}[SCENARIO 3] Unauthorized Update (User B cannot update User A's task)${RESET}`);
    // User B attempts to overwrite Alice's task
    const resUpdateTaskB = await fetch(`${BASE_URL}/tasks/${taskAId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`
      },
      body: JSON.stringify({
        title: 'Tampered By User B'
      })
    });
    assert(resUpdateTaskB.status === 404 || resUpdateTaskB.status === 403, 'User B update attempt rejected with 404/403');

    // User A checks the task to verify integrity
    const resCheckTaskA = await fetch(`${BASE_URL}/tasks/${taskAId}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const dataCheckTaskA = await resCheckTaskA.json();
    assert(
      dataCheckTaskA.data.title === 'Alice Secret Strategic Plan',
      'User A task title remains intact and unaltered'
    );

    // ---------------------------------------------------------
    // SCENARIO 4: UNAUTHORIZED DELETE
    // ---------------------------------------------------------
    console.log(`\n${BOLD}[SCENARIO 4] Unauthorized Delete (User B cannot delete User A's project)${RESET}`);
    // User B attempts to delete Alice's project
    const resDeleteProjB = await fetch(`${BASE_URL}/projects/${projectAId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert(resDeleteProjB.status === 404 || resDeleteProjB.status === 403, 'User B delete attempt rejected with 404/403');

    // User A verifies project still exists
    const resVerifyProjA = await fetch(`${BASE_URL}/projects/${projectAId}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(resVerifyProjA.status === 200, 'User A project remains intact and verified');

    // ---------------------------------------------------------
    // SCENARIO 5: CROSS-USER RELATIONSHIPS
    // ---------------------------------------------------------
    console.log(`\n${BOLD}[SCENARIO 5] Cross-User Relationships (Reject foreign foreign keys)${RESET}`);
    // User B tries to link a new task to Alice's project
    const resCrossTaskB = await fetch(`${BASE_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`
      },
      body: JSON.stringify({
        title: 'Bob Malicious Cross Task',
        projectId: projectAId
      })
    });
    assert(
      resCrossTaskB.status === 403 || resCrossTaskB.status === 400,
      'Server blocks User B from linking task to User A private project (403/400)'
    );

    // User B tries to create a calendar event referencing Alice's task
    const resCrossCalB = await fetch(`${BASE_URL}/calendar/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`
      },
      body: JSON.stringify({
        title: 'Suspicious Meeting',
        startTime: '2026-06-01T10:00:00Z',
        endTime: '2026-06-01T11:00:00Z',
        taskId: taskAId
      })
    });
    assert(
      resCrossCalB.status === 403,
      'Server blocks User B from linking calendar event to User A task (403)'
    );

    // ---------------------------------------------------------
    // SCENARIO 6: AUTHENTICATION BYPASS REJECTION
    // ---------------------------------------------------------
    console.log(`\n${BOLD}[SCENARIO 6] Authentication Bypass (Reject unauthenticated, fake & tampered tokens)${RESET}`);
    // 1. Missing header
    const resNoToken = await fetch(`${BASE_URL}/tasks`);
    assert(resNoToken.status === 401, 'Request with missing Authorization header rejected with 401');

    // 2. Malformed token
    const resGarbageToken = await fetch(`${BASE_URL}/tasks`, {
      headers: { Authorization: 'Bearer totally-invalid-random-token' }
    });
    assert(resGarbageToken.status === 401, 'Request with malformed token rejected with 401');

    // 3. Legacy demo-token bypass attempt
    const resDemoToken = await fetch(`${BASE_URL}/tasks`, {
      headers: { Authorization: 'Bearer demo-token' }
    });
    assert(resDemoToken.status === 401, 'Legacy demo-token bypass attempt rejected with 401');

    // 4. Tampered payload
    const forgedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20ifQ.invalidSignature';
    const resForgedToken = await fetch(`${BASE_URL}/tasks`, {
      headers: { Authorization: `Bearer ${forgedToken}` }
    });
    assert(resForgedToken.status === 401, 'Tampered token signature rejected with 401');

    // ---------------------------------------------------------
    // SCENARIO 7: ACCOUNT SWITCHING & BLANK SLATE
    // ---------------------------------------------------------
    console.log(`\n${BOLD}[SCENARIO 7] Account Switching (New user receives 100% blank slate)${RESET}`);
    const resRegC = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userCEmail, password, name: 'Charlie Clean' })
    });
    const dataRegC = await resRegC.json();
    const tokenC = dataRegC.token;
    const userC = dataRegC.user;

    // Check tasks
    const resTasksC = await fetch(`${BASE_URL}/tasks`, {
      headers: { Authorization: `Bearer ${tokenC}` }
    });
    const dataTasksC = await resTasksC.json();
    assert(dataTasksC.data.length === 0, 'New User C has 0 tasks (empty slate)');

    // Check projects
    const resProjectsC = await fetch(`${BASE_URL}/projects`, {
      headers: { Authorization: `Bearer ${tokenC}` }
    });
    const dataProjectsC = await resProjectsC.json();
    assert(dataProjectsC.data.length === 0, 'New User C has 0 personal projects (empty slate)');

    // Check goals
    const resGoalsC = await fetch(`${BASE_URL}/goals`, {
      headers: { Authorization: `Bearer ${tokenC}` }
    });
    const dataGoalsC = await resGoalsC.json();
    assert(dataGoalsC.data.length === 0, 'New User C has 0 goals (empty slate)');

    // Check calendar
    const resCalC = await fetch(`${BASE_URL}/calendar/events`, {
      headers: { Authorization: `Bearer ${tokenC}` }
    });
    const dataCalC = await resCalC.json();
    assert(dataCalC.data.length === 0, 'New User C has 0 calendar events (empty slate)');

    // ---------------------------------------------------------
    // SCENARIO 8: WORKSPACE ACCESS & INVITATIONS
    // ---------------------------------------------------------
    console.log(`\n${BOLD}[SCENARIO 8] Workspace Access & Invitation Flow${RESET}`);
    // User A creates a workspace and then a project inside that authorized workspace.
    const resWorkspaceA = await fetch(`${BASE_URL}/workspaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ name: 'Alice Team Workspace' })
    });
    const dataWorkspaceA = await resWorkspaceA.json();
    assert(resWorkspaceA.status === 201 && !!dataWorkspaceA.data?.id, 'User A creates an owned workspace');
    const workspaceAId = dataWorkspaceA.data.id;

    // User B must not be able to attach a project to User A's workspace.
    const resForeignWorkspaceProject = await fetch(`${BASE_URL}/team/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({ name: 'Foreign Workspace Attempt', workspaceId: workspaceAId })
    });
    assert(resForeignWorkspaceProject.status === 403, 'A user cannot create a team project in another user workspace');

    const resTeamProjA = await fetch(`${BASE_URL}/team/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        name: 'Project Orion',
        workspaceId: workspaceAId,
        description: 'Joint spacecraft design'
      })
    });
    const dataTeamProjA = await resTeamProjA.json();
    assert(resTeamProjA.status === 201 && !!dataTeamProjA.data?.id, 'User A creates team project');
    const teamProjId = dataTeamProjA.data.id;

    // Owner cannot move a project into another user's workspace.
    const foreignWorkspaceId = userB.personalWorkspaceId;
    const resMoveForeignWorkspace = await fetch(`${BASE_URL}/team/projects/${teamProjId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ workspaceId: foreignWorkspaceId })
    });
    assert(resMoveForeignWorkspace.status === 404, 'Project cannot be moved into a workspace the owner does not belong to');

    // User B (non-member) tries to list tasks in Project Orion
    const resTeamTasksBBefore = await fetch(`${BASE_URL}/team/tasks?projectId=${teamProjId}`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert(resTeamTasksBBefore.status === 403, 'Non-member User B cannot read team tasks (403 Forbidden)');

    // User B (non-member) tries to create task in Project Orion
    const resCreateTeamTaskBBefore = await fetch(`${BASE_URL}/team/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`
      },
      body: JSON.stringify({
        projectId: teamProjId,
        title: 'Unauthorized Infiltration Task'
      })
    });
    assert(resCreateTeamTaskBBefore.status === 403, 'Non-member User B cannot create team task (403 Forbidden)');

    // User A invites User B via email
    const resInvite = await fetch(`${BASE_URL}/team/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        projectId: teamProjId,
        email: userBEmail,
        role: 'MEMBER'
      })
    });
    const dataInvite = await resInvite.json();
    assert(resInvite.status === 201 && !!dataInvite.data?.id, 'User A sends invitation to User B');
    const inviteId = dataInvite.data.id;

    // User B checks pending invitations
    const resPendingInvitesB = await fetch(`${BASE_URL}/team/invitations`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    const dataPendingInvitesB = await resPendingInvitesB.json();
    const hasInvite = dataPendingInvitesB.data.some((inv: any) => inv.id === inviteId);
    assert(hasInvite, 'User B sees pending invitation in their inbox');

    // User B accepts the invitation
    const resAcceptInvite = await fetch(`${BASE_URL}/team/invitations/${inviteId}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`
      },
      body: JSON.stringify({ accept: true })
    });
    assert(resAcceptInvite.status === 200, 'User B accepts team project invitation');

    // User B can now read team tasks
    const resTeamTasksBAfter = await fetch(`${BASE_URL}/team/tasks?projectId=${teamProjId}`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert(resTeamTasksBAfter.status === 200, 'User B now has authorized access to team tasks');

    // User B creates a task in the team project
    const resCreateTeamTaskB = await fetch(`${BASE_URL}/team/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`
      },
      body: JSON.stringify({
        projectId: teamProjId,
        title: 'Thermal Shield Stress Test',
        priority: 'high',
        columnId: 'todo'
      })
    });
    assert(resCreateTeamTaskB.status === 201, 'User B successfully creates a shared team task');

    // ---------------------------------------------------------
    // SCENARIO 9: EMAIL & PASSWORD AUTHENTICATION LIFECYCLE
    // ---------------------------------------------------------
    console.log(`\n${BOLD}[SCENARIO 9] Simple Email & Password Auth Lifecycle${RESET}`);
    const simpleEmail = `simple_auth_${ts}@test.local`;
    const simplePassword = 'SafePassword987!';

    // 1. Create account using only email and password
    const resSimpleSignup = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: simpleEmail, password: simplePassword })
    });
    const dataSimpleSignup = await resSimpleSignup.json();
    assert(resSimpleSignup.status === 201 && dataSimpleSignup.success === true, 'Account created using only Email and Password');
    assert(typeof dataSimpleSignup.token === 'string' && dataSimpleSignup.token.length > 20, 'JWT token returned on registration');
    assert(dataSimpleSignup.user?.email === simpleEmail, 'User email persisted correctly');
    assert(!dataSimpleSignup.user?.password && !dataSimpleSignup.user?.passwordHash, 'Plaintext password and hash never leaked in response');

    // 2. Prevent duplicate account with same email
    const resDupSignup = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: simpleEmail, password: 'AnotherPassword!' })
    });
    assert(resDupSignup.status === 400, 'Duplicate account registration rejected with 400 Bad Request');

    // 3. Login with invalid password fails
    const resBadLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: simpleEmail, password: 'WrongPassword123' })
    });
    assert(resBadLogin.status === 401, 'Login with incorrect password rejected with 401 Unauthorized');

    // 4. Login with correct email and password succeeds
    const resGoodLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: simpleEmail, password: simplePassword })
    });
    const dataGoodLogin = await resGoodLogin.json();
    assert(resGoodLogin.status === 200 && dataGoodLogin.success === true, 'Login with email and password succeeds');
    const simpleToken = dataGoodLogin.token;

    // 5. Session verification (/api/auth/me) restores user data persistently
    const resMe = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${simpleToken}` }
    });
    const dataMe = await resMe.json();
    assert(resMe.status === 200 && dataMe.user?.email === simpleEmail, 'Session token resolves authenticated user from database');

    // ---------------------------------------------------------
    // SCENARIO 10: STRICT CORS HOSTNAME & MALICIOUS ORIGIN REJECTION
    // ---------------------------------------------------------
    console.log(`\n${BOLD}[SCENARIO 10] Strict CORS Hostname & Malicious Origin Defense${RESET}`);
    // 1. Attacker on spoofed localhost subdomain
    const resCorsFakeLocal = await fetch(`${BASE_URL}/health`, {
      headers: { Origin: 'https://localhost.attacker.com' }
    });
    const allowOriginFake = resCorsFakeLocal.headers.get('access-control-allow-origin');
    assert(
      allowOriginFake !== 'https://localhost.attacker.com',
      'CORS guard rejects spoofed localhost subdomain (https://localhost.attacker.com)'
    );

    // 2. Attacker on fake vercel domain prefix
    const resCorsFakeVercel = await fetch(`${BASE_URL}/health`, {
      headers: { Origin: 'https://evil-vercel.app' }
    });
    const allowOriginVercel = resCorsFakeVercel.headers.get('access-control-allow-origin');
    assert(
      allowOriginVercel !== 'https://evil-vercel.app',
      'CORS guard rejects illegitimate vercel domain prefix (https://evil-vercel.app)'
    );

    // 3. Legitimate localhost
    const resCorsGood = await fetch(`${BASE_URL}/health`, {
      headers: { Origin: 'http://localhost:3000' }
    });
    assert(
      resCorsGood.headers.get('access-control-allow-origin') === 'http://localhost:3000',
      'CORS guard allows genuine localhost origin'
    );

    // ---------------------------------------------------------
    // SCENARIO 11: PATH TRAVERSAL AUTHENTICATION BYPASS DEFENSE
    // ---------------------------------------------------------
    console.log(`\n${BOLD}[SCENARIO 11] Path Traversal Authentication Guard Bypass Defense${RESET}`);
    // Path traversal attempting to masquerade as /api/auth/login to bypass auth
    const resTraversal = await fetch(`${BASE_URL}/auth/login/../tasks`);
    assert(
      resTraversal.status === 401,
      'Path traversal attempt (/api/auth/login/../tasks) strictly blocked with 401 Unauthorized'
    );

    const resFakePublic = await fetch(`${BASE_URL}/auth/loginfake`);
    assert(
      resFakePublic.status === 401,
      'Prefix substring attempt (/api/auth/loginfake) strictly blocked with 401 Unauthorized'
    );

    // ---------------------------------------------------------
    // SCENARIO 12: ROLE-BASED ACCESS CONTROL (RBAC) ENFORCEMENT
    // ---------------------------------------------------------
    console.log(`\n${BOLD}[SCENARIO 12] Role-Based Access Control (RBAC) Enforcement${RESET}`);
    // User A invites User C as VIEWER to Project Orion
    const resInviteViewer = await fetch(`${BASE_URL}/team/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        projectId: teamProjId,
        email: userCEmail,
        role: 'VIEWER'
      })
    });
    const dataInviteViewer = await resInviteViewer.json();
    assert(resInviteViewer.status === 201, 'User A successfully invites User C as VIEWER');

    // User C accepts invite
    const resAcceptViewer = await fetch(`${BASE_URL}/team/invitations/${dataInviteViewer.data.id}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenC}`
      },
      body: JSON.stringify({ accept: true })
    });
    assert(resAcceptViewer.status === 200, 'User C accepts VIEWER invitation');

    // User C (VIEWER) tries to create task in Project Orion -> 403 Forbidden
    const resViewerCreateTask = await fetch(`${BASE_URL}/team/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenC}`
      },
      body: JSON.stringify({
        projectId: teamProjId,
        title: 'Viewer Unauthorized Task Creation'
      })
    });
    assert(
      resViewerCreateTask.status === 403,
      'VIEWER role is blocked from creating tasks in team project (403 Forbidden)'
    );

    // User B (MEMBER) attempts to invite another user as OWNER -> Privilege escalation blocked
    const resMemberEscalate = await fetch(`${BASE_URL}/team/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`
      },
      body: JSON.stringify({
        projectId: teamProjId,
        email: `hacker_${ts}@test.local`,
        role: 'OWNER'
      })
    });
    assert(
      resMemberEscalate.status === 403,
      'Non-owner/admin MEMBER is blocked from sending invitations or escalating privileges (403 Forbidden)'
    );

    // Project member directory and role lifecycle.
    const resProjectMembers = await fetch(`${BASE_URL}/team/projects/${teamProjId}/members`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const dataProjectMembers = await resProjectMembers.json();
    assert(resProjectMembers.status === 200, 'Project owner can load authoritative project member directory');
    assert(dataProjectMembers.data.some((member: any) => member.id === userB.id), 'Accepted member appears in project directory');
    assert(dataProjectMembers.data.some((member: any) => member.id === userC.id), 'Viewer appears in project directory');

    const resMemberForbiddenRoleChange = await fetch(`${BASE_URL}/team/projects/${teamProjId}/members/${userC.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({ role: 'MEMBER' })
    });
    assert(resMemberForbiddenRoleChange.status === 403, 'Regular members cannot change project member roles');

    const resOwnerRoleChange = await fetch(`${BASE_URL}/team/projects/${teamProjId}/members/${userB.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ role: 'VIEWER' })
    });
    assert(resOwnerRoleChange.status === 200, 'Project owner can reduce a member to viewer');
    const resViewerNowCannotCreate = await fetch(`${BASE_URL}/team/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({ projectId: teamProjId, title: 'Should be blocked after downgrade' })
    });
    assert(resViewerNowCannotCreate.status === 403, 'Role downgrade is enforced immediately by task API');

    const resRestoreMemberRole = await fetch(`${BASE_URL}/team/projects/${teamProjId}/members/${userB.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ role: 'MEMBER' })
    });
    assert(resRestoreMemberRole.status === 200, 'Project owner can restore member role');

    const resRemoveViewer = await fetch(`${BASE_URL}/team/projects/${teamProjId}/members/${userC.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(resRemoveViewer.status === 200, 'Project owner can remove a project member');
    const resRemovedMemberTasks = await fetch(`${BASE_URL}/team/tasks?projectId=${teamProjId}`, {
      headers: { Authorization: `Bearer ${tokenC}` }
    });
    assert(resRemovedMemberTasks.status === 403, 'Removed member loses project task access immediately');

    // ---------------------------------------------------------
    // SCENARIO 13: ACCOUNT ENUMERATION DEFENSE
    // ---------------------------------------------------------
    console.log(`\n${BOLD}[SCENARIO 13] Account Enumeration Defense in Invitation API${RESET}`);
    // Owner invites an unregistered email -> Invitation created cleanly without leaking account non-existence
    const ghostEmail = `nonexistent_ghost_${ts}@external-partner.com`;
    const resInviteGhost = await fetch(`${BASE_URL}/team/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        projectId: teamProjId,
        email: ghostEmail,
        role: 'MEMBER'
      })
    });
    const dataInviteGhost = await resInviteGhost.json();
    assert(
      resInviteGhost.status === 201 && dataInviteGhost.success === true,
      'Invitation dispatched without disclosing whether account previously existed'
    );
    assert(
      !dataInviteGhost.message?.includes('No account exists'),
      'API message never reveals account existence or non-existence'
    );

    // ---------------------------------------------------------
    // SCENARIO 14: SERVER-AUTHORITATIVE COMMENTING & SPOOFING DEFENSE
    // ---------------------------------------------------------
    console.log(`\n${BOLD}[SCENARIO 14] Server-Authoritative Commenting & Identity Spoofing Defense${RESET}`);
    // Fetch a team task created earlier by User B
    const resGetTeamTasks = await fetch(`${BASE_URL}/team/tasks?projectId=${teamProjId}`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    const dataTeamTasks = await resGetTeamTasks.json();
    const targetTeamTaskId = dataTeamTasks.data[0].id;

    // User B adds comment via dedicated server-authoritative route
    const resAddComment = await fetch(`${BASE_URL}/team/tasks/${targetTeamTaskId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`
      },
      body: JSON.stringify({ text: 'Peer review completed. Ready for thermal testing.' })
    });
    const dataAddComment = await resAddComment.json();
    assert(resAddComment.status === 201, 'Comment recorded via server-authoritative endpoint');
    const recordedComment = dataAddComment.data.comments.find((c: any) => c.text.includes('Peer review'));
    assert(
      recordedComment.authorId === userB.id,
      'Comment author ID is strictly stamped by server from authenticated JWT (cannot be spoofed)'
    );

    // User B attempts to overwrite comments array via PUT /api/team/tasks/:id
    const resSpoofComments = await fetch(`${BASE_URL}/team/tasks/${targetTeamTaskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`
      },
      body: JSON.stringify({
        comments: [{ authorName: 'Alice (CEO)', text: 'Forged CEO comment', authorId: userA.id }]
      })
    });
    const dataSpoofComments = await resSpoofComments.json();
    const hasForgedComment = dataSpoofComments.data?.comments?.some((c: any) => c.text === 'Forged CEO comment');
    assert(
      !hasForgedComment,
      'Mass assignment overwrite of comments array is stripped and blocked by backend'
    );

    // ---------------------------------------------------------
    // SCENARIO 15: STORED XSS MITIGATION IN PROJECT URLS
    // ---------------------------------------------------------
    console.log(`\n${BOLD}[SCENARIO 15] Stored XSS Mitigation in Project URLs${RESET}`);
    const resXssProj = await fetch(`${BASE_URL}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        name: 'XSS Injection Test Project',
        driveFolderUrl: 'javascript:alert(document.cookie)'
      })
    });
    const dataXssProj = await resXssProj.json();
    assert(resXssProj.status === 201, 'Project created');
    assert(
      !dataXssProj.data.driveFolderUrl.includes('javascript:'),
      'Server sanitizes malicious javascript: URI and replaces with safe default URL'
    );

    // ---------------------------------------------------------
    // SCENARIO 16: PROTOTYPE POLLUTION DEFENSE
    // ---------------------------------------------------------
    console.log(`\n${BOLD}[SCENARIO 16] Prototype Pollution Defense in Request Body Sanitizer${RESET}`);
    await fetch(`${BASE_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        title: 'Safe Task Name',
        category: 'Work/Career',
        __proto__: { injectedAdmin: true }
      })
    });
    assert(
      (Object.prototype as any).injectedAdmin === undefined,
      'Prototype pollution attempt stripped and Object.prototype remains clean'
    );

    // ---------------------------------------------------------
    // SCENARIO 17: PASSWORD SECURITY & PRESERVATION
    // ---------------------------------------------------------
    console.log(`\n${BOLD}[SCENARIO 17] Password Complexity & Special Character Preservation${RESET}`);
    // 1. Password under 8 characters rejected
    const resShortPass = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `weak_${ts}@test.local`, password: 'short' })
    });
    assert(resShortPass.status === 400, 'Password shorter than 8 characters is rejected with 400 Bad Request');

    // 2. Password with < and > special characters preserved without corruption
    const complexEmail = `special_chars_${ts}@test.local`;
    const complexPassword = 'Str0ng<P@ss>123!';
    const resSpecialPass = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: complexEmail, password: complexPassword })
    });
    assert(resSpecialPass.status === 201, 'User registered with password containing HTML brackets < and >');

    // Login with exact password succeeds (confirming sanitizeBody did not mangle the password)
    const resLoginSpecial = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: complexEmail, password: complexPassword })
    });
    assert(resLoginSpecial.status === 200, 'Login succeeds with exact special-character password');

    // ---------------------------------------------------------
    // SCENARIO 18: INPUT BOUNDS CHECKING & RESOURCE EXHAUSTION
    // ---------------------------------------------------------
    console.log(`\n${BOLD}[SCENARIO 18] Input Bounds Checking & Resource Exhaustion Defense${RESET}`);
    // 1. Pomodoro minutes clamped
    const resBoundPomodoro = await fetch(`${BASE_URL}/tasks/${taskAId}/pomodoro`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({ minutes: 99999999 })
    });
    const dataBoundPomodoro = await resBoundPomodoro.json();
    assert(
      dataBoundPomodoro.recordedMinutes <= 180,
      'Absurd Pomodoro duration is clamped to maximum allowable session length (180 min)'
    );

    // 2. Timelog duration bounded
    const resBoundTimelog = await fetch(`${BASE_URL}/timelogs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({ durationSeconds: 99999999 })
    });
    assert(
      resBoundTimelog.status === 400,
      'Absurd time log duration (> 86400s) rejected with 400 Bad Request'
    );

    // 3. AI Coach message length bounded
    const oversizedMessage = 'A'.repeat(2500);
    const resAiOversized = await fetch(`${BASE_URL}/ai/coach`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({ message: oversizedMessage })
    });
    assert(
      resAiOversized.status === 400,
      'Oversized AI coach message (> 1000 chars) rejected with 400 Bad Request'
    );

    // ---------------------------------------------------------
    // SCENARIO 19: AUTHENTICATION BRUTE-FORCE RATE LIMITING
    // ---------------------------------------------------------
    console.log(`\n${BOLD}[SCENARIO 19] Authentication Brute-Force Rate Limiting${RESET}`);
    let hitRateLimit = false;
    for (let i = 0; i < 20; i++) {
      const resRateLimit = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: simpleEmail, password: 'WrongPasswordEveryTime!' })
      });
      if (resRateLimit.status === 429) {
        hitRateLimit = true;
        break;
      }
    }
    assert(hitRateLimit, 'Brute-force authentication attempts throttled with HTTP 429 Too Many Requests');

    console.log(`\n${BOLD}${GREEN}======================================================${RESET}`);
    console.log(`${BOLD}${GREEN}  ALL 19 SECURITY SCENARIOS PASSED WITH ZERO FAILURES!${RESET}`);
    console.log(`${BOLD}${GREEN}  Total Assertions: ${passedCount} passed, ${failedCount} failed${RESET}`);
    console.log(`${BOLD}${GREEN}======================================================${RESET}\n`);
  } finally {
    server.close();
    fs.rmSync(testDataDir, { recursive: true, force: true });
  }
}

runSecurityTestSuite().catch((err) => {
  console.error(`\n${RED}FATAL TEST FAILURE:${RESET}`, err);
  process.exit(1);
});
