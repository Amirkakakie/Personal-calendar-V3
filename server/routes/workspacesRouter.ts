import { Router, Request, Response } from 'express';
import { db, TeamProjectRecord, TeamTaskRecord, ProjectInvitationRecord, WorkspaceRole } from '../db.ts';

const router = Router();

// GET /api/workspaces - List workspaces for authenticated user
router.get('/workspaces', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const workspaces = db.getWorkspacesForUser(userId);
  res.json({ success: true, count: workspaces.length, data: workspaces });
});

// POST /api/workspaces - Create a team workspace
router.post('/workspaces', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Workspace name is required' });
  }

  const workspace = db.createWorkspace(name.trim(), userId);
  res.status(201).json({ success: true, data: workspace });
});

// GET /api/team/projects - List team projects user is authorized to access
router.get('/team/projects', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const projects = db.getTeamProjectsForUser(userId);
  res.json({ success: true, count: projects.length, data: projects });
});

// POST /api/team/projects - Create team project
router.post('/team/projects', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const userEmail = req.user!.email;
  const body = req.body;

  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    return res.status(400).json({ success: false, error: 'Project name is required' });
  }

  const id = `proj-${Date.now()}`;
  const key = body.key?.trim().toUpperCase() || body.name.trim().substring(0, 3).toUpperCase();

  const newProj: TeamProjectRecord = {
    id,
    workspaceId: body.workspaceId || 'ws-team',
    ownerId: userId,
    ownerEmail: userEmail,
    name: body.name.trim(),
    key,
    description: body.description?.trim() || '',
    color: body.color || '#6366f1',
    icon: body.icon || 'ShieldCheck',
    memberIds: [userId], // Owner is initial member
    targetDate: body.targetDate,
    createdAt: new Date().toISOString().split('T')[0]
  };

  const created = db.createTeamProject(newProj);
  res.status(201).json({ success: true, data: created });
});

// PUT /api/team/projects/:id - Update team project
router.put('/team/projects/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const projectId = req.params.id;

  const updated = db.updateTeamProject(projectId, req.body, userId);
  if (!updated) {
    return res.status(404).json({ success: false, error: 'Team project not found or access denied' });
  }

  res.json({ success: true, data: updated });
});

// DELETE /api/team/projects/:id - Delete team project (Owner only)
router.delete('/team/projects/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const projectId = req.params.id;

  const success = db.deleteTeamProject(projectId, userId);
  if (!success) {
    return res.status(403).json({ success: false, error: 'Only project owner can delete this team project' });
  }

  res.json({ success: true, message: 'Team project deleted successfully' });
});

// GET /api/team/tasks - List tasks for a team project
router.get('/team/tasks', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { projectId } = req.query;

  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ success: false, error: 'projectId query parameter is required' });
  }

  const tasks = db.getTeamTasksForProject(projectId, userId);
  if (tasks === null) {
    return res.status(403).json({ success: false, error: 'Access denied to this project tasks' });
  }

  res.json({ success: true, count: tasks.length, data: tasks });
});

// POST /api/team/tasks - Create task in a team project
router.post('/team/tasks', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const body = req.body;

  if (!body.projectId || !body.title) {
    return res.status(400).json({ success: false, error: 'projectId and title are required' });
  }

  const id = `task-${Date.now()}`;
  const now = new Date().toISOString();

  const newTask: TeamTaskRecord = {
    id,
    taskNumber: Number(body.taskNumber) || Math.floor(Math.random() * 900) + 100,
    projectId: body.projectId,
    columnId: body.columnId || 'todo',
    title: body.title.trim(),
    description: body.description?.trim() || '',
    priority: body.priority || 'medium',
    assigneeId: body.assigneeId,
    dueDate: body.dueDate,
    estimatedHours: Number(body.estimatedHours) || 0,
    subtasks: Array.isArray(body.subtasks) ? body.subtasks : [],
    tags: Array.isArray(body.tags) ? body.tags : [],
    comments: [],
    order: Number(body.order) || 0,
    createdAt: now.split('T')[0],
    updatedAt: now
  };

  const created = db.createTeamTask(newTask, userId);
  if (!created) {
    return res.status(403).json({ success: false, error: 'Access denied: not an authorized member of this project' });
  }

  res.status(201).json({ success: true, data: created });
});

// PUT /api/team/tasks/:id - Update team task
router.put('/team/tasks/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const taskId = req.params.id;

  const updated = db.updateTeamTask(taskId, req.body, userId);
  if (!updated) {
    return res.status(404).json({ success: false, error: 'Task not found or unauthorized' });
  }

  res.json({ success: true, data: updated });
});

// DELETE /api/team/tasks/:id - Delete team task
router.delete('/team/tasks/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const taskId = req.params.id;

  const success = db.deleteTeamTask(taskId, userId);
  if (!success) {
    return res.status(404).json({ success: false, error: 'Task not found or unauthorized' });
  }

  res.json({ success: true, message: 'Team task deleted successfully' });
});

// GET /api/team/invitations - Get pending invitations for authenticated user's email
router.get('/team/invitations', (req: Request, res: Response) => {
  const userEmail = req.user!.email;
  const invites = db.getInvitationsForEmail(userEmail);
  res.json({ success: true, count: invites.length, data: invites });
});

// POST /api/team/invitations - Send invitation to colleague
router.post('/team/invitations', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const userEmail = req.user!.email;
  const userName = req.user!.name || userEmail.split('@')[0];
  const { projectId, email, role = 'Member' } = req.body;

  if (!projectId || !email) {
    return res.status(400).json({ success: false, error: 'projectId and email are required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  if (cleanEmail === userEmail.toLowerCase()) {
    return res.status(400).json({ success: false, error: 'You cannot invite yourself.' });
  }

  // Verify project exists and user has access
  const project = db.getTeamProjectById(projectId, userId);
  if (!project) {
    return res.status(403).json({ success: false, error: 'Project not found or you lack permission to invite members' });
  }

  // Target user check
  const targetUser = db.getUserByEmail(cleanEmail);
  if (!targetUser) {
    return res.status(400).json({
      success: false,
      error: `No account exists with email "${cleanEmail}". They must first sign up before receiving invitations.`
    });
  }

  if (project.memberIds.includes(targetUser.id)) {
    return res.status(400).json({ success: false, error: `${targetUser.name} is already a member of this project.` });
  }

  const newInvite: ProjectInvitationRecord = {
    id: `inv-${Date.now()}`,
    projectId: project.id,
    projectName: project.name,
    projectKey: project.key,
    projectColor: project.color,
    invitedEmail: cleanEmail,
    invitedByUserId: userId,
    invitedByName: userName,
    invitedByEmail: userEmail,
    role: (role.toUpperCase() as WorkspaceRole) || 'MEMBER',
    status: 'PENDING',
    createdAt: new Date().toISOString().split('T')[0]
  };

  const created = db.createProjectInvitation(newInvite);
  res.status(201).json({
    success: true,
    message: `Invitation successfully sent to ${targetUser.name} (${cleanEmail})`,
    data: created
  });
});

// POST /api/team/invitations/:id/respond - Accept or Decline invitation
router.post('/team/invitations/:id/respond', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const userEmail = req.user!.email;
  const inviteId = req.params.id;
  const { accept } = req.body;

  const success = db.respondToInvitation(inviteId, userId, userEmail, Boolean(accept));
  if (!success) {
    return res.status(404).json({ success: false, error: 'Invitation not found or not addressed to your email' });
  }

  res.json({
    success: true,
    message: accept ? 'Invitation accepted! You have joined the project.' : 'Invitation declined.'
  });
});

export default router;
