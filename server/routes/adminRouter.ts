import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../db.ts';

const router = Router();

function getAuditContext(req: Request) {
  return {
    adminId: req.adminUser!.id,
    adminEmail: req.adminUser!.email,
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent']
  };
}

// ----------------------------------------------------------------------------
// 1. ADMIN IDENTITY & SESSION
// ----------------------------------------------------------------------------

// GET /api/admin/me - Verify superadmin authorization and identity
router.get('/me', (req: Request, res: Response) => {
  const admin = req.adminUser!;
  const { passwordHash: _, password: __, ...safeAdmin } = admin as any;

  res.json({
    success: true,
    user: safeAdmin,
    isSuperAdmin: true,
    permissions: [
      'manage:users',
      'manage:projects',
      'manage:teams',
      'manage:tasks',
      'view:analytics',
      'view:audit_logs',
      'view:system_health',
      'manage:system'
    ]
  });
});

// ----------------------------------------------------------------------------
// 2. PLATFORM OVERVIEW & ANALYTICS
// ----------------------------------------------------------------------------

// GET /api/admin/overview - Real database platform statistics
router.get('/overview', (_req: Request, res: Response) => {
  try {
    const stats = db.getAdminOverviewStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (err: any) {
    console.error('[Admin API Overview Error]:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to calculate platform overview statistics.' });
  }
});

// GET /api/admin/analytics - Time-series aggregations for charts
router.get('/analytics', (req: Request, res: Response) => {
  try {
    const timeframe = (req.query.timeframe as any) || '30d';
    const validTimeframes = ['7d', '30d', '90d', '1y', 'all'];
    const chosenTimeframe = validTimeframes.includes(timeframe) ? timeframe : '30d';

    const analytics = db.getAdminAnalytics(chosenTimeframe);
    res.json({
      success: true,
      data: analytics
    });
  } catch (err: any) {
    console.error('[Admin API Analytics Error]:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to aggregate analytics data.' });
  }
});

// ----------------------------------------------------------------------------
// 3. USER MANAGEMENT
// ----------------------------------------------------------------------------

// GET /api/admin/users - Paginated, searchable, filterable users table
router.get('/users', (req: Request, res: Response) => {
  try {
    const search = req.query.q ? String(req.query.q) : undefined;
    const status = req.query.status ? String(req.query.status) : undefined;
    const role = req.query.role ? String(req.query.role) : undefined;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 25;
    const page = req.query.page ? Math.max(1, parseInt(String(req.query.page), 10)) : 1;
    const offset = (page - 1) * limit;

    const result = db.getAllUsersAdmin({
      search,
      status,
      role,
      limit,
      offset
    });

    res.json({
      success: true,
      data: result.users,
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit)
      }
    });
  } catch (err: any) {
    console.error('[Admin API Users Error]:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to load user directory.' });
  }
});

// GET /api/admin/users/:id - User details inspection
router.get('/users/:id', (req: Request, res: Response) => {
  try {
    const details = db.getUserDetailsAdmin(req.params.id);
    if (!details) {
      return res.status(404).json({ success: false, error: 'User account not found.' });
    }
    res.json({ success: true, data: details });
  } catch (err: any) {
    console.error('[Admin API User Details Error]:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to load user details.' });
  }
});

// PATCH /api/admin/users/:id/status - Suspend or reactivate account
router.patch('/users/:id/status', (req: Request, res: Response) => {
  try {
    const targetUserId = req.params.id;
    const { status, reason } = req.body;

    if (status !== 'active' && status !== 'suspended') {
      return res.status(400).json({ success: false, error: 'Status must be either "active" or "suspended".' });
    }

    if (targetUserId === req.adminUser!.id && status === 'suspended') {
      return res.status(400).json({ success: false, error: 'Safety Violation: Administrators cannot suspend their own active account.' });
    }

    const targetUser = db.getUserById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User account not found.' });
    }

    const previousStatus = targetUser.status || 'active';
    const updated = db.updateUser(targetUserId, { status });

    db.addAuditLog({
      ...getAuditContext(req),
      action: status === 'suspended' ? 'user.suspended' : 'user.reactivated',
      targetType: 'user',
      targetId: targetUserId,
      details: {
        targetEmail: targetUser.email,
        targetName: targetUser.name,
        previousStatus,
        newStatus: status,
        reason: reason || 'Administrative status change'
      }
    });

    const { passwordHash: _, password: __, ...safeUser } = updated as any;
    res.json({
      success: true,
      message: `Account ${targetUser.email} has been successfully ${status === 'suspended' ? 'suspended' : 'reactivated'}.`,
      user: safeUser
    });
  } catch (err: any) {
    console.error('[Admin API User Status Error]:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to update user status.' });
  }
});

// PATCH /api/admin/users/:id/role - Change assigned user role
router.patch('/users/:id/role', (req: Request, res: Response) => {
  try {
    const targetUserId = req.params.id;
    const { role } = req.body;

    if (!role || typeof role !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid role string is required.' });
    }

    const validRoles = ['Member', 'superadmin', 'Admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, error: `Role must be one of: ${validRoles.join(', ')}` });
    }

    const targetUser = db.getUserById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User account not found.' });
    }

    // Safety: Prevent removing last superadmin
    if (targetUserId === req.adminUser!.id && role !== 'superadmin') {
      const allSuperAdmins = db.getAllUsersAdmin({ role: 'superadmin' });
      if (allSuperAdmins.total <= 1) {
        return res.status(400).json({ success: false, error: 'Safety Violation: Cannot demote the platform sole Super Admin account.' });
      }
    }

    const previousRole = targetUser.role;
    const updated = db.updateUser(targetUserId, { role });

    db.addAuditLog({
      ...getAuditContext(req),
      action: 'user.role_change',
      targetType: 'user',
      targetId: targetUserId,
      details: {
        targetEmail: targetUser.email,
        previousRole,
        newRole: role
      }
    });

    const { passwordHash: _, password: __, ...safeUser } = updated as any;
    res.json({
      success: true,
      message: `Role for ${targetUser.email} updated to ${role}.`,
      user: safeUser
    });
  } catch (err: any) {
    console.error('[Admin API User Role Error]:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to update user role.' });
  }
});

// POST /api/admin/users/:id/reset-password - Generate temporary password securely
router.patch('/users/:id/reset-password', async (req: Request, res: Response) => {
  try {
    const targetUserId = req.params.id;
    const targetUser = db.getUserById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User account not found.' });
    }

    // Generate secure 16-character temporary password
    const tempPassword = `Chr!${crypto.randomBytes(6).toString('hex')}_${Math.floor(100 + Math.random() * 900)}`;
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    db.updateUser(targetUserId, { passwordHash });

    db.addAuditLog({
      ...getAuditContext(req),
      action: 'user.password_reset',
      targetType: 'user',
      targetId: targetUserId,
      details: {
        targetEmail: targetUser.email,
        method: 'temporary_administrative_password'
      }
    });

    res.json({
      success: true,
      message: `Password reset successfully for ${targetUser.email}. Provide the temporary password securely to the user.`,
      tempPassword
    });
  } catch (err: any) {
    console.error('[Admin API Password Reset Error]:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to reset user password.' });
  }
});

// DELETE /api/admin/users/:id - Secure account deletion workflow
router.delete('/users/:id', (req: Request, res: Response) => {
  try {
    const targetUserId = req.params.id;

    if (targetUserId === req.adminUser!.id) {
      return res.status(400).json({ success: false, error: 'Safety Violation: Administrators cannot delete their own active account.' });
    }

    const targetUser = db.getUserById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User account not found.' });
    }

    const email = targetUser.email;
    const name = targetUser.name;
    const deleted = db.deleteUserAdmin(targetUserId);

    if (!deleted) {
      return res.status(500).json({ success: false, error: 'Failed to purge user records.' });
    }

    db.addAuditLog({
      ...getAuditContext(req),
      action: 'user.deleted',
      targetType: 'user',
      targetId: targetUserId,
      details: {
        purgedEmail: email,
        purgedName: name
      }
    });

    res.json({
      success: true,
      message: `Account ${email} and all associated personal data have been completely purged.`
    });
  } catch (err: any) {
    console.error('[Admin API Delete User Error]:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to delete user.' });
  }
});

// ----------------------------------------------------------------------------
// 4. PROJECT MANAGEMENT
// ----------------------------------------------------------------------------

// GET /api/admin/projects - All projects across all users & teams
router.get('/projects', (req: Request, res: Response) => {
  try {
    const search = req.query.q ? String(req.query.q) : undefined;
    const type = req.query.type as any;
    const status = req.query.status ? String(req.query.status) : undefined;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 25;
    const page = req.query.page ? Math.max(1, parseInt(String(req.query.page), 10)) : 1;
    const offset = (page - 1) * limit;

    const result = db.getAllProjectsAdmin({
      search,
      type,
      status,
      limit,
      offset
    });

    res.json({
      success: true,
      data: result.projects,
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit)
      }
    });
  } catch (err: any) {
    console.error('[Admin API Projects Error]:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to load projects.' });
  }
});

// GET /api/admin/projects/:id - Read-only project inspection
router.get('/projects/:id', (req: Request, res: Response) => {
  try {
    const details = db.getProjectDetailsAdmin(req.params.id);
    if (!details) {
      return res.status(404).json({ success: false, error: 'Project not found.' });
    }
    res.json({ success: true, data: details });
  } catch (err: any) {
    console.error('[Admin API Project Details Error]:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to inspect project.' });
  }
});

// PATCH /api/admin/projects/:id/archive - Archive or restore project
router.patch('/projects/:id/archive', (req: Request, res: Response) => {
  try {
    const projectId = req.params.id;
    const { archived } = req.body;
    const isArchived = Boolean(archived);

    const success = db.archiveProjectAdmin(projectId, isArchived);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Project not found or cannot be archived.' });
    }

    db.addAuditLog({
      ...getAuditContext(req),
      action: isArchived ? 'project.archived' : 'project.restored',
      targetType: 'project',
      targetId: projectId,
      details: { isArchived }
    });

    res.json({
      success: true,
      message: `Project ${projectId} ${isArchived ? 'archived' : 'restored'} successfully.`
    });
  } catch (err: any) {
    console.error('[Admin API Project Archive Error]:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to update project archive status.' });
  }
});

// DELETE /api/admin/projects/:id - Administrative project deletion
router.delete('/projects/:id', (req: Request, res: Response) => {
  try {
    const projectId = req.params.id;
    const deleted = db.deleteProjectAdmin(projectId);

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Project not found or could not be deleted.' });
    }

    db.addAuditLog({
      ...getAuditContext(req),
      action: 'project.deleted',
      targetType: 'project',
      targetId: projectId,
      details: { projectId }
    });

    res.json({
      success: true,
      message: `Project ${projectId} has been permanently deleted.`
    });
  } catch (err: any) {
    console.error('[Admin API Delete Project Error]:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to delete project.' });
  }
});

// ----------------------------------------------------------------------------
// 5. TEAM MANAGEMENT
// ----------------------------------------------------------------------------

// GET /api/admin/teams - Global team workspaces
router.get('/teams', (req: Request, res: Response) => {
  try {
    const search = req.query.q ? String(req.query.q) : undefined;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 25;
    const page = req.query.page ? Math.max(1, parseInt(String(req.query.page), 10)) : 1;
    const offset = (page - 1) * limit;

    const result = db.getAllTeamsAdmin({ search, limit, offset });

    res.json({
      success: true,
      data: result.teams,
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit)
      }
    });
  } catch (err: any) {
    console.error('[Admin API Teams Error]:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to load teams.' });
  }
});

// GET /api/admin/teams/:id - Team details inspection
router.get('/teams/:id', (req: Request, res: Response) => {
  try {
    const details = db.getTeamDetailsAdmin(req.params.id);
    if (!details) {
      return res.status(404).json({ success: false, error: 'Team workspace not found.' });
    }
    res.json({ success: true, data: details });
  } catch (err: any) {
    console.error('[Admin API Team Details Error]:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to inspect team.' });
  }
});

// DELETE /api/admin/teams/:id - Delete team workspace
router.delete('/teams/:id', (req: Request, res: Response) => {
  try {
    const teamId = req.params.id;
    const deleted = db.deleteTeamAdmin(teamId);

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Team workspace not found.' });
    }

    db.addAuditLog({
      ...getAuditContext(req),
      action: 'team.deleted',
      targetType: 'team',
      targetId: teamId,
      details: { teamId }
    });

    res.json({
      success: true,
      message: `Team workspace ${teamId} has been deleted.`
    });
  } catch (err: any) {
    console.error('[Admin API Delete Team Error]:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to delete team workspace.' });
  }
});

// ----------------------------------------------------------------------------
// 6. GLOBAL TASKS SEARCH & INSPECTION
// ----------------------------------------------------------------------------

// GET /api/admin/tasks - Global tasks
router.get('/tasks', (req: Request, res: Response) => {
  try {
    const search = req.query.q ? String(req.query.q) : undefined;
    const status = req.query.status ? String(req.query.status) : undefined;
    const priority = req.query.priority ? String(req.query.priority) : undefined;
    const type = req.query.type as any;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 25;
    const page = req.query.page ? Math.max(1, parseInt(String(req.query.page), 10)) : 1;
    const offset = (page - 1) * limit;

    const result = db.getAllTasksAdmin({
      search,
      status,
      priority,
      type,
      limit,
      offset
    });

    res.json({
      success: true,
      data: result.tasks,
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit)
      }
    });
  } catch (err: any) {
    console.error('[Admin API Tasks Error]:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to load tasks.' });
  }
});

// ----------------------------------------------------------------------------
// 7. AUDIT LOGS
// ----------------------------------------------------------------------------

// GET /api/admin/audit-logs - Filterable audit log stream
router.get('/audit-logs', (req: Request, res: Response) => {
  try {
    const action = req.query.action ? String(req.query.action) : undefined;
    const adminEmail = req.query.adminEmail ? String(req.query.adminEmail) : undefined;
    const targetType = req.query.targetType ? String(req.query.targetType) : undefined;
    const targetId = req.query.targetId ? String(req.query.targetId) : undefined;
    const dateFrom = req.query.dateFrom ? String(req.query.dateFrom) : undefined;
    const dateTo = req.query.dateTo ? String(req.query.dateTo) : undefined;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
    const page = req.query.page ? Math.max(1, parseInt(String(req.query.page), 10)) : 1;
    const offset = (page - 1) * limit;

    const result = db.getAuditLogs({
      action,
      adminEmail,
      targetType,
      targetId,
      dateFrom,
      dateTo,
      limit,
      offset
    });

    res.json({
      success: true,
      data: result.logs,
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit)
      }
    });
  } catch (err: any) {
    console.error('[Admin API Audit Logs Error]:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to load audit logs.' });
  }
});

// ----------------------------------------------------------------------------
// 8. SYSTEM HEALTH & DIAGNOSTICS
// ----------------------------------------------------------------------------

// GET /api/admin/system/health - Live server & persistence engine status
router.get('/system/health', (_req: Request, res: Response) => {
  try {
    const diagnostics = db.getSystemDiagnostics();
    res.json({
      success: true,
      data: diagnostics
    });
  } catch (err: any) {
    console.error('[Admin API Diagnostics Error]:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to collect system diagnostics.' });
  }
});

// POST /api/admin/system/maintenance - Database flush & integrity check
router.post('/system/maintenance', async (req: Request, res: Response) => {
  try {
    await db.flush();
    const overview = db.getAdminOverviewStats();

    db.addAuditLog({
      ...getAuditContext(req),
      action: 'system.maintenance_run',
      targetType: 'system',
      details: {
        timestamp: new Date().toISOString(),
        totalUsers: overview.users.total,
        totalProjects: overview.projects.total
      }
    });

    res.json({
      success: true,
      message: 'Database persistence verified and synchronized successfully.'
    });
  } catch (err: any) {
    console.error('[Admin Maintenance Error]:', err);
    res.status(500).json({ success: false, error: err.message || 'Maintenance run failed.' });
  }
});

export default router;
