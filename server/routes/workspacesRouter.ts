import { Router, Request, Response } from 'express';
import { db, TeamProjectRecord, TeamTaskRecord, ProjectInvitationRecord, WorkspaceRole } from '../db.ts';

const router = Router();

const isRecord = (value: unknown): value is Record<string, any> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const PROJECT_UPDATE_FIELDS = new Set(['name', 'key', 'description', 'color', 'icon', 'targetDate', 'workspaceId']);
const TASK_UPDATE_FIELDS = new Set(['columnId', 'title', 'description', 'priority', 'assigneeId', 'dueDate', 'estimatedHours', 'subtasks', 'tags', 'order']);
const isDateOnly = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));


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
  if (!isRecord(body) || Object.keys(body).some(key => !['name', 'key', 'description', 'color', 'icon', 'workspaceId', 'targetDate'].includes(key))) {
    return res.status(400).json({ success: false, error: 'Invalid project payload.' });
  }

  if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 120) {
    return res.status(400).json({ success: false, error: 'Project name is required' });
  }

  // Always bind a team project to a workspace the authenticated user belongs to.
  // Legacy clients that omit workspaceId are safely assigned their personal workspace.
  const workspaceId = typeof body.workspaceId === 'string' && body.workspaceId.trim()
    ? body.workspaceId.trim()
    : db.getUserById(userId)?.personalWorkspaceId;
  if (!workspaceId || !db.isUserInWorkspace(workspaceId, userId)) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: You do not have permission to attach projects to the specified workspace.'
    });
  }

  const id = `proj-${Date.now()}`;
  if (body.key !== undefined && (typeof body.key !== 'string' || !/^[a-zA-Z0-9_-]{2,12}$/.test(body.key.trim()))) {
    return res.status(400).json({ success: false, error: 'Project key must contain 2-12 letters, numbers, underscores or hyphens.' });
  }
  if (body.description !== undefined && (typeof body.description !== 'string' || body.description.length > 5000)) {
    return res.status(400).json({ success: false, error: 'Project description is too long or invalid.' });
  }
  if (body.color !== undefined && (typeof body.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(body.color))) {
    return res.status(400).json({ success: false, error: 'Project color must be a six-digit hex color.' });
  }
  if (body.icon !== undefined && (typeof body.icon !== 'string' || body.icon.length > 40)) {
    return res.status(400).json({ success: false, error: 'Project icon is invalid.' });
  }
  if (body.targetDate !== undefined && body.targetDate !== '' && !isDateOnly(body.targetDate)) {
    return res.status(400).json({ success: false, error: 'Target date must use YYYY-MM-DD format.' });
  }
  const key = (body.key || body.name.trim().substring(0, 3)).trim().toUpperCase();

  const newProj: TeamProjectRecord = {
    id,
    workspaceId,
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

  if (!isRecord(req.body) || Object.keys(req.body).some(key => !PROJECT_UPDATE_FIELDS.has(key))) {
    return res.status(400).json({ success: false, error: 'Project update contains unsupported fields.' });
  }
  const updates = req.body;
  if (updates.name !== undefined && (typeof updates.name !== 'string' || !updates.name.trim() || updates.name.trim().length > 120)) {
    return res.status(400).json({ success: false, error: 'Project name must be 1-120 characters.' });
  }
  if (updates.key !== undefined && (typeof updates.key !== 'string' || !/^[a-zA-Z0-9_-]{2,12}$/.test(updates.key.trim()))) {
    return res.status(400).json({ success: false, error: 'Project key must contain 2-12 letters, numbers, underscores or hyphens.' });
  }
  if (updates.description !== undefined && (typeof updates.description !== 'string' || updates.description.length > 5000)) {
    return res.status(400).json({ success: false, error: 'Project description is too long or invalid.' });
  }
  if (updates.color !== undefined && (typeof updates.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(updates.color))) {
    return res.status(400).json({ success: false, error: 'Project color must be a six-digit hex color.' });
  }
  if (updates.icon !== undefined && (typeof updates.icon !== 'string' || updates.icon.length > 40)) {
    return res.status(400).json({ success: false, error: 'Project icon is invalid.' });
  }
  if (updates.targetDate !== undefined && updates.targetDate !== '' && !isDateOnly(updates.targetDate)) {
    return res.status(400).json({ success: false, error: 'Target date must use YYYY-MM-DD format.' });
  }
  if (updates.workspaceId !== undefined && (typeof updates.workspaceId !== 'string' || !db.isUserInWorkspace(updates.workspaceId, userId))) {
    return res.status(404).json({ success: false, error: 'Project not found or workspace access denied.' });
  }
  const updated = db.updateTeamProject(projectId, updates, userId);
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

// GET /api/team/projects/:id/members - Return authoritative project membership.
router.get('/team/projects/:id/members', (req: Request, res: Response) => {
  const members = db.getTeamProjectMembers(req.params.id, req.user!.id);
  if (!members) return res.status(404).json({ success: false, error: 'Project not found or access denied' });
  res.json({ success: true, count: members.length, data: members });
});

// PATCH /api/team/projects/:id/members/:memberId - Change a member's project role.
router.patch('/team/projects/:id/members/:memberId', (req: Request, res: Response) => {
  const role = String(req.body?.role || '').toUpperCase() as WorkspaceRole;
  if (!['ADMIN', 'MEMBER', 'VIEWER'].includes(role)) {
    return res.status(400).json({ success: false, error: 'A valid project role is required.' });
  }
  const updated = db.updateProjectMemberRole(req.params.id, req.params.memberId, role, req.user!.id);
  if (!updated) return res.status(403).json({ success: false, error: 'Role change is not permitted.' });
  const members = db.getTeamProjectMembers(req.params.id, req.user!.id);
  res.json({ success: true, data: members });
});

// DELETE /api/team/projects/:id/members/:memberId - Remove a member from a project.
router.delete('/team/projects/:id/members/:memberId', (req: Request, res: Response) => {
  const removed = db.removeProjectMember(req.params.id, req.params.memberId, req.user!.id);
  if (!removed) return res.status(403).json({ success: false, error: 'Member removal is not permitted.' });
  res.json({ success: true, message: 'Project member removed.' });
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

  if (!isRecord(body) || Object.keys(body).some(key => !['projectId', 'taskNumber', 'columnId', 'title', 'description', 'priority', 'assigneeId', 'dueDate', 'estimatedHours', 'subtasks', 'tags', 'order'].includes(key))) {
    return res.status(400).json({ success: false, error: 'Invalid task payload.' });
  }
  if (typeof body.projectId !== 'string' || !body.projectId.trim() || body.projectId.length > 128 ||
      typeof body.title !== 'string' || !body.title.trim() || body.title.trim().length > 200) {
    return res.status(400).json({ success: false, error: 'A valid projectId and task title (1-200 characters) are required.' });
  }
  if (body.description !== undefined && (typeof body.description !== 'string' || body.description.length > 5000)) {
    return res.status(400).json({ success: false, error: 'Task description must not exceed 5000 characters.' });
  }
  if (body.priority !== undefined && !['low', 'medium', 'high', 'urgent'].includes(body.priority)) {
    return res.status(400).json({ success: false, error: 'Task priority is invalid.' });
  }
  if (body.columnId !== undefined && (typeof body.columnId !== 'string' || !body.columnId.trim() || body.columnId.length > 64)) {
    return res.status(400).json({ success: false, error: 'Task column is invalid.' });
  }
  if (body.assigneeId !== undefined && (typeof body.assigneeId !== 'string' || body.assigneeId.length > 128)) {
    return res.status(400).json({ success: false, error: 'Task assignee is invalid.' });
  }
  if (body.dueDate !== undefined && body.dueDate !== '' && !isDateOnly(body.dueDate)) {
    return res.status(400).json({ success: false, error: 'Task due date must use YYYY-MM-DD format.' });
  }
  if (body.estimatedHours !== undefined && (!Number.isFinite(Number(body.estimatedHours)) || Number(body.estimatedHours) < 0 || Number(body.estimatedHours) > 10000)) {
    return res.status(400).json({ success: false, error: 'Estimated hours are outside the allowed range.' });
  }
  if (body.tags !== undefined && (!Array.isArray(body.tags) || body.tags.length > 20 || body.tags.some((tag: unknown) => typeof tag !== 'string' || tag.length > 40))) {
    return res.status(400).json({ success: false, error: 'Task tags must be an array of up to 20 short strings.' });
  }
  if (body.subtasks !== undefined && (!Array.isArray(body.subtasks) || body.subtasks.length > 50 || body.subtasks.some((item: any) => !isRecord(item) || typeof item.title !== 'string' || !item.title.trim() || item.title.length > 200))) {
    return res.status(400).json({ success: false, error: 'Task subtasks must contain up to 50 valid titled items.' });
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

  const currentTask = db.getTeamTaskById(taskId, userId);
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

  if (!isRecord(req.body) || Object.keys(req.body).some(key => !TASK_UPDATE_FIELDS.has(key))) {
    return res.status(400).json({ success: false, error: 'Task update contains unsupported fields.' });
  }
  const updates = req.body;
  if (updates.title !== undefined && (typeof updates.title !== 'string' || !updates.title.trim() || updates.title.trim().length > 200)) {
    return res.status(400).json({ success: false, error: 'Task title must be 1-200 characters.' });
  }
  if (updates.description !== undefined && (typeof updates.description !== 'string' || updates.description.length > 5000)) {
    return res.status(400).json({ success: false, error: 'Task description must not exceed 5000 characters.' });
  }
  if (updates.priority !== undefined && !['low', 'medium', 'high', 'urgent'].includes(updates.priority)) {
    return res.status(400).json({ success: false, error: 'Task priority is invalid.' });
  }
  if (updates.dueDate !== undefined && updates.dueDate !== '' && !isDateOnly(updates.dueDate)) {
    return res.status(400).json({ success: false, error: 'Task due date must use YYYY-MM-DD format.' });
  }
  if (updates.estimatedHours !== undefined && (!Number.isFinite(Number(updates.estimatedHours)) || Number(updates.estimatedHours) < 0 || Number(updates.estimatedHours) > 10000)) {
    return res.status(400).json({ success: false, error: 'Estimated hours are outside the allowed range.' });
  }
  if (updates.assigneeId !== undefined && updates.assigneeId !== null && (typeof updates.assigneeId !== 'string' || updates.assigneeId.length > 128)) {
    return res.status(400).json({ success: false, error: 'Task assignee is invalid.' });
  }
  if (updates.tags !== undefined && (!Array.isArray(updates.tags) || updates.tags.length > 20 || updates.tags.some((tag: unknown) => typeof tag !== 'string' || tag.length > 40))) {
    return res.status(400).json({ success: false, error: 'Task tags must be an array of up to 20 short strings.' });
  }
  if (updates.subtasks !== undefined && (!Array.isArray(updates.subtasks) || updates.subtasks.length > 50 || updates.subtasks.some((item: any) => !isRecord(item) || typeof item.title !== 'string' || !item.title.trim() || item.title.length > 200))) {
    return res.status(400).json({ success: false, error: 'Task subtasks must contain up to 50 valid titled items.' });
  }
  const updated = db.updateTeamTask(taskId, updates, userId);
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

  const currentTask = db.getTeamTaskById(taskId, userId);
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

  const currentTask = db.getTeamTaskById(taskId, userId);
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

  if (!projectId || !email || typeof email !== 'string' || email.trim().length > 254) {
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

  const requestedRole = (typeof role === 'string' ? role.toUpperCase() : '') as WorkspaceRole;
  if (!['ADMIN', 'MEMBER', 'VIEWER'].includes(requestedRole)) {
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

  if (typeof accept !== 'boolean') return res.status(400).json({ success: false, error: 'accept must be a boolean.' });
  const success = db.respondToInvitation(inviteId, userId, userEmail, accept);
  if (!success) {
    return res.status(404).json({ success: false, error: 'Invitation not found or not addressed to your email' });
  }

  res.json({
    success: true,
    message: accept ? 'Invitation accepted! You have joined the project.' : 'Invitation declined.'
  });
});

export default router;
