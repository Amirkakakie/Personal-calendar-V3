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

  // Multi-tenant check: if workspaceId is provided, verify user is an authorized member
  if (body.workspaceId && body.workspaceId !== 'ws-team') {
    const hasWorkspaceAccess = db.isUserInWorkspace(body.workspaceId, userId);
    if (!hasWorkspaceAccess) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You do not have permission to attach projects to the specified workspace.'
      });
    }
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
    memberIds: [userId],
    memberRoles: { [userId]: 'OWNER' },
    targetDate: body.targetDate,
    createdAt: new Date().toISOString().split('T')[0]
  };

  const created = db.createTeamProject(newProj);
  res.status(201).json({ success: true, data: created });
});

// PUT /api/team/projects/:id - Update team project (OWNER or ADMIN only)
router.put('/team/projects/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const projectId = req.params.id;

  const project = db.getTeamProjectById(projectId, userId);
  if (!project) {
    return res.status(404).json({ success: false, error: 'Team project not found or access denied' });
  }

  const userRole = db.getProjectRole(projectId, userId);
  if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Only project owners and administrators can modify project settings.'
    });
  }

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

  const project = db.getTeamProjectById(projectId, userId);
  if (!project) {
    return res.status(404).json({ success: false, error: 'Team project not found or access denied' });
  }

  if (project.ownerId !== userId) {
    return res.status(403).json({ success: false, error: 'Forbidden: Only the project owner can delete this project.' });
  }

  const success = db.deleteTeamProject(projectId, userId);
  if (!success) {
    return res.status(403).json({ success: false, error: 'Failed to delete team project.' });
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

// POST /api/team/tasks - Create task in a team project (Non-viewers only)
router.post('/team/tasks', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const body = req.body;

  if (!body.projectId || !body.title) {
    return res.status(400).json({ success: false, error: 'projectId and title are required' });
  }

  const role = db.getProjectRole(body.projectId, userId);
  if (!role) {
    return res.status(403).json({ success: false, error: 'Access denied: not an authorized member of this project' });
  }
  if (role === 'VIEWER') {
    return res.status(403).json({ success: false, error: 'Forbidden: Viewers have read-only access and cannot create tasks.' });
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
    return res.status(403).json({ success: false, error: 'Failed to create team task.' });
  }

  res.status(201).json({ success: true, data: created });
});

// PUT /api/team/tasks/:id - Update team task (Non-viewers only)
router.put('/team/tasks/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const taskId = req.params.id;

  const currentTask = (db as any).data.teamTasks.find((t: any) => t.id === taskId);
  if (!currentTask) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  const role = db.getProjectRole(currentTask.projectId, userId);
  if (!role) {
    return res.status(404).json({ success: false, error: 'Task not found or unauthorized' });
  }
  if (role === 'VIEWER') {
    return res.status(403).json({ success: false, error: 'Forbidden: Viewers have read-only access and cannot modify tasks.' });
  }

  const updated = db.updateTeamTask(taskId, req.body, userId);
  if (!updated) {
    return res.status(404).json({ success: false, error: 'Task not found or unauthorized' });
  }

  res.json({ success: true, data: updated });
});

// POST /api/team/tasks/:id/comments - Server-Authoritative Task Commenting
router.post('/team/tasks/:id/comments', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const userEmail = req.user!.email;
  const userName = req.user!.name || userEmail.split('@')[0];
  const taskId = req.params.id;
  const { text } = req.body;

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ success: false, error: 'Comment text is required.' });
  }

  const currentTask = (db as any).data.teamTasks.find((t: any) => t.id === taskId);
  if (!currentTask) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  const role = db.getProjectRole(currentTask.projectId, userId);
  if (!role) {
    return res.status(403).json({ success: false, error: 'Access denied: not an authorized member of this project' });
  }
  if (role === 'VIEWER') {
    return res.status(403).json({ success: false, error: 'Forbidden: Viewers have read-only access and cannot comment.' });
  }

  const userInitials = userName.slice(0, 2).toUpperCase();
  const updated = db.addTeamTaskComment(
    taskId,
    {
      authorId: userId,
      authorName: userName,
      authorInitials: userInitials,
      authorColor: 'from-indigo-600 to-violet-600',
      text: text.trim()
    },
    userId
  );

  if (!updated) {
    return res.status(403).json({ success: false, error: 'Failed to record comment.' });
  }

  res.status(201).json({ success: true, data: updated });
});

// DELETE /api/team/tasks/:id - Delete team task (Non-viewers only)
router.delete('/team/tasks/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const taskId = req.params.id;

  const currentTask = (db as any).data.teamTasks.find((t: any) => t.id === taskId);
  if (!currentTask) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  const role = db.getProjectRole(currentTask.projectId, userId);
  if (!role) {
    return res.status(404).json({ success: false, error: 'Task not found or unauthorized' });
  }
  if (role === 'VIEWER') {
    return res.status(403).json({ success: false, error: 'Forbidden: Viewers have read-only access and cannot delete tasks.' });
  }

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

// POST /api/team/invitations - Send invitation (OWNER and ADMIN only, no account enumeration)
router.post('/team/invitations', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const userEmail = req.user!.email;
  const userName = req.user!.name || userEmail.split('@')[0];
  const { projectId, email, role = 'MEMBER' } = req.body;

  if (!projectId || !email || typeof email !== 'string') {
    return res.status(400).json({ success: false, error: 'projectId and valid email are required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const cleanEmail = email.trim().toLowerCase();
  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({ success: false, error: 'Invalid email address format' });
  }

  if (cleanEmail === userEmail.toLowerCase()) {
    return res.status(400).json({ success: false, error: 'You cannot invite yourself.' });
  }

  // Verify project exists and caller has authority
  const project = db.getTeamProjectById(projectId, userId);
  if (!project) {
    return res.status(403).json({ success: false, error: 'Project not found or you lack permission to invite members' });
  }

  const callerRole = db.getProjectRole(projectId, userId);
  if (callerRole !== 'OWNER' && callerRole !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Only project owners and administrators can invite new members.'
    });
  }

  const requestedRole = (role.toUpperCase() as WorkspaceRole);
  if (!['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'].includes(requestedRole)) {
    return res.status(400).json({ success: false, error: 'Invalid role specified.' });
  }

  // Privilege Escalation Defense: Admins cannot grant OWNER privileges
  if (callerRole === 'ADMIN' && requestedRole === 'OWNER') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Project administrators cannot grant Owner privileges.'
    });
  }

  // Check if target user already belongs to the project
  const targetUser = db.getUserByEmail(cleanEmail);
  if (targetUser && project.memberIds.includes(targetUser.id)) {
    return res.status(400).json({ success: false, error: `${targetUser.name} is already a member of this project.` });
  }

  const newInvite: ProjectInvitationRecord = {
    id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    projectId: project.id,
    projectName: project.name,
    projectKey: project.key,
    projectColor: project.color,
    invitedEmail: cleanEmail,
    invitedByUserId: userId,
    invitedByName: userName,
    invitedByEmail: userEmail,
    role: requestedRole,
    status: 'PENDING',
    createdAt: new Date().toISOString().split('T')[0]
  };

  const created = db.createProjectInvitation(newInvite);
  // Generic success message prevents account enumeration
  res.status(201).json({
    success: true,
    message: `Invitation successfully dispatched to ${cleanEmail}`,
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
