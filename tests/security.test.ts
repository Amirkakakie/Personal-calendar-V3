import http from 'http';
import app from '../server/app.ts';

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

  // Start ephemeral server
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as any).port;
  const BASE_URL = `http://127.0.0.1:${port}/api`;
  console.log(`[Test Server] Ephemeral test instance listening on port ${port}\n`);

  try {
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
    // User A creates a team project
    const resTeamProjA = await fetch(`${BASE_URL}/team/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        name: 'Project Orion',
        workspaceId: 'ws-team',
        description: 'Joint spacecraft design'
      })
    });
    const dataTeamProjA = await resTeamProjA.json();
    assert(resTeamProjA.status === 201 && !!dataTeamProjA.data?.id, 'User A creates team project');
    const teamProjId = dataTeamProjA.data.id;

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

    console.log(`\n${BOLD}${GREEN}======================================================${RESET}`);
    console.log(`${BOLD}${GREEN}  ALL 9 SECURITY SCENARIOS PASSED WITH ZERO FAILURES! ${RESET}`);
    console.log(`${BOLD}${GREEN}  Total Assertions: ${passedCount} passed, ${failedCount} failed${RESET}`);
    console.log(`${BOLD}${GREEN}======================================================${RESET}\n`);
  } finally {
    server.close();
  }
}

runSecurityTestSuite().catch((err) => {
  console.error(`\n${RED}FATAL TEST FAILURE:${RESET}`, err);
  process.exit(1);
});
