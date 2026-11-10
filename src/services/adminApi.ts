import { API_BASE, getAuthToken } from './api.ts';

async function adminRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE}/admin${cleanEndpoint}`;

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const token = getAuthToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!res.ok) {
    let errorMsg = `HTTP ${res.status}: ${res.statusText}`;
    if (isJson) {
      try {
        const data = await res.json();
        errorMsg = data.error || data.message || errorMsg;
      } catch {}
    }
    const error = new Error(errorMsg);
    (error as any).status = res.status;
    throw error;
  }

  if (isJson) {
    return res.json() as Promise<T>;
  }
  return {} as Promise<T>;
}

export interface AdminOverviewStats {
  users: {
    total: number;
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
    newThisYear: number;
    active: number;
    inactive: number;
    suspended: number;
    growthPercentage: number;
  };
  projects: {
    total: number;
    personal: number;
    team: number;
    createdToday: number;
    createdThisWeek: number;
    createdThisMonth: number;
    active: number;
    archived: number;
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    completionRate: number;
  };
  teams: {
    total: number;
    totalMemberships: number;
    averageMembersPerTeam: number;
    activeProjects: number;
  };
  activity: {
    recentRegistrations: Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      status: string;
      joinedAt: string;
    }>;
    recentProjects: any[];
    recentTeams: any[];
    recentAuditLogs: any[];
  };
}

export interface AdminAnalyticsData {
  timeframe: string;
  registrationTrend: Array<{ date: string; count: number; cumulative: number }>;
  projectCreationTrend: Array<{ date: string; personal: number; team: number; total: number }>;
  teamTrend: Array<{ date: string; count: number }>;
  taskStatusBreakdown: {
    total: number;
    completed: number;
    inProgress: number;
    todo: number;
    completionRate: number;
  };
  categoryDistribution: Record<string, number>;
  userDistribution: {
    active: number;
    inactive: number;
    suspended: number;
    total: number;
  };
}

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'suspended';
  title: string;
  avatarColor: string;
  avatarUrl?: string;
  initials: string;
  joinedAt: string;
  lastLoginAt?: string;
  personalProjectsCount: number;
  teamMembershipsCount: number;
  tasksCount: number;
}

export type AdminUserDetail = AdminUserItem;

export interface AdminProjectItem {
  id: string;
  name: string;
  description?: string;
  type: 'personal' | 'team';
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  status: string;
  isArchived?: boolean;
  tasksCount: number;
  taskCount?: number;
  completedTasksCount: number;
  memberCount: number;
  loggedHours: number;
  createdAt: string;
  color?: string;
}

export interface AdminProjectDetails {
  project: AdminProjectItem;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    createdAt?: string;
  }>;
  members?: Array<{
    userId: string;
    userName?: string;
    role: string;
  }>;
}

export interface AdminTeamItem {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  membersCount: number;
  memberCount?: number;
  projectsCount: number;
  projectCount?: number;
  createdAt: string;
  status: string;
}

export interface AdminTeamDetails {
  team: AdminTeamItem;
  members: Array<{
    id: string;
    userId: string;
    userName?: string;
    userEmail?: string;
    role: string;
  }>;
  projects: Array<{
    id: string;
    name: string;
    createdAt: string;
  }>;
}

export interface AdminTaskItem {
  id: string;
  title: string;
  description?: string;
  type: 'personal' | 'team';
  ownerId?: string;
  ownerName?: string;
  ownerEmail: string;
  projectName?: string;
  category: string;
  priority: string;
  status: string;
  dueDate?: string;
  createdAt: string;
}

export interface AdminAuditLogItem {
  id: string;
  timestamp: string;
  createdAt: string;
  adminId?: string;
  adminEmail: string;
  actorEmail?: string;
  action: string;
  targetType: string;
  targetId?: string;
  details: Record<string, any>;
  ip?: string;
  ipAddress?: string;
  userAgent?: string;
}

export type AdminAuditLog = AdminAuditLogItem;

export interface SystemHealthDiagnostics {
  status: string;
  timestamp: string;
  database: {
    engine: string;
    status: string;
    records: {
      users: number;
      personalProjects: number;
      teamProjects: number;
      tasks: number;
      teams: number;
      auditLogs: number;
    };
  };
  server: {
    uptimeSeconds: number;
    nodeVersion: string;
    platform: string;
    arch: string;
    timestamp: string;
  };
  memory: {
    rssMB: number;
    heapTotalMB: number;
    heapUsedMB: number;
    externalMB: number;
  };
}

export const adminApi = {
  async getMe() {
    const res = await adminRequest<{
      success: boolean;
      user: any;
      isSuperAdmin: boolean;
      permissions: string[];
    }>('/me');
    return {
      ...res.user,
      role: res.user?.role || (res.isSuperAdmin ? 'superadmin' : 'member'),
      isSuperAdmin: res.isSuperAdmin,
      permissions: res.permissions
    };
  },

  async getOverview() {
    const res = await adminRequest<{ success: boolean; data: AdminOverviewStats }>('/overview');
    return res.data;
  },

  async getAnalytics(timeframe = '30d') {
    const res = await adminRequest<{ success: boolean; data: AdminAnalyticsData }>(`/analytics?timeframe=${timeframe}`);
    return res.data;
  },

  async getUsers(params?: { q?: string; status?: string; role?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.q) query.set('q', params.q);
    if (params?.status) query.set('status', params.status);
    if (params?.role) query.set('role', params.role);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));

    return adminRequest<{
      success: boolean;
      data: AdminUserItem[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(`/users?${query.toString()}`);
  },

  async getUserDetails(userId: string) {
    const res = await adminRequest<{ success: boolean; data: any }>(`/users/${encodeURIComponent(userId)}`);
    return res.data;
  },

  async updateUserStatus(userId: string, status: 'active' | 'suspended', reason?: string) {
    return adminRequest<{ success: boolean; message: string; user: any }>(`/users/${encodeURIComponent(userId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason })
    });
  },

  async updateUserRole(userId: string, role: string) {
    return adminRequest<{ success: boolean; message: string; user: any }>(`/users/${encodeURIComponent(userId)}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role })
    });
  },

  async resetUserPassword(userId: string) {
    return adminRequest<{ success: boolean; message: string; tempPassword?: string }>(`/users/${encodeURIComponent(userId)}/reset-password`, {
      method: 'PATCH'
    });
  },

  async deleteUser(userId: string) {
    return adminRequest<{ success: boolean; message: string }>(`/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE'
    });
  },

  async getProjects(params?: { q?: string; search?: string; type?: string; status?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    const searchVal = params?.search || params?.q;
    if (searchVal) query.set('q', searchVal);
    if (params?.type) query.set('type', params.type);
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));

    const res = await adminRequest<{
      success: boolean;
      data: AdminProjectItem[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(`/projects?${query.toString()}`);

    return {
      ...res,
      projects: res.data.map(p => ({
        ...p,
        taskCount: p.taskCount ?? p.tasksCount ?? 0,
        isArchived: p.isArchived ?? (p.status === 'archived')
      }))
    };
  },

  async getProjectDetails(projectId: string): Promise<AdminProjectDetails> {
    const res = await adminRequest<{ success: boolean; data: any }>(`/projects/${encodeURIComponent(projectId)}`);
    return {
      ...res.data,
      project: {
        ...res.data.project,
        taskCount: res.data.project.taskCount ?? res.data.project.tasksCount ?? 0,
        isArchived: res.data.project.isArchived ?? (res.data.project.status === 'archived')
      }
    };
  },

  async archiveProject(projectId: string, archived: boolean) {
    return adminRequest<{ success: boolean; message: string }>(`/projects/${encodeURIComponent(projectId)}/archive`, {
      method: 'PATCH',
      body: JSON.stringify({ archived })
    });
  },

  async deleteProject(projectId: string) {
    return adminRequest<{ success: boolean; message: string }>(`/projects/${encodeURIComponent(projectId)}`, {
      method: 'DELETE'
    });
  },

  async getTeams(params?: { q?: string; search?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    const searchVal = params?.search || params?.q;
    if (searchVal) query.set('q', searchVal);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));

    const res = await adminRequest<{
      success: boolean;
      data: AdminTeamItem[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(`/teams?${query.toString()}`);

    return {
      ...res,
      teams: res.data.map(t => ({
        ...t,
        memberCount: t.memberCount ?? t.membersCount ?? 0,
        projectCount: t.projectCount ?? t.projectsCount ?? 0
      }))
    };
  },

  async getTeamDetails(teamId: string): Promise<AdminTeamDetails> {
    const res = await adminRequest<{ success: boolean; data: any }>(`/teams/${encodeURIComponent(teamId)}`);
    return {
      ...res.data,
      team: {
        ...res.data.team,
        memberCount: res.data.team.memberCount ?? res.data.team.membersCount ?? 0,
        projectCount: res.data.team.projectCount ?? res.data.team.projectsCount ?? 0
      }
    };
  },

  async deleteTeam(teamId: string) {
    return adminRequest<{ success: boolean; message: string }>(`/teams/${encodeURIComponent(teamId)}`, {
      method: 'DELETE'
    });
  },

  async getTasks(params?: { q?: string; search?: string; status?: string; priority?: string; type?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    const searchVal = params?.search || params?.q;
    if (searchVal) query.set('q', searchVal);
    if (params?.status) query.set('status', params.status);
    if (params?.priority) query.set('priority', params.priority);
    if (params?.type) query.set('type', params.type);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));

    const res = await adminRequest<{
      success: boolean;
      data: AdminTaskItem[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(`/tasks?${query.toString()}`);

    return {
      ...res,
      tasks: res.data
    };
  },

  async getAuditLogs(params?: {
    action?: string;
    adminEmail?: string;
    targetType?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.action) query.set('action', params.action);
    if (params?.adminEmail) query.set('adminEmail', params.adminEmail);
    if (params?.targetType) query.set('targetType', params.targetType);
    if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params?.dateTo) query.set('dateTo', params.dateTo);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));

    const res = await adminRequest<{
      success: boolean;
      data: AdminAuditLogItem[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(`/audit-logs?${query.toString()}`);

    return {
      ...res,
      logs: res.data.map(l => ({
        ...l,
        actorEmail: l.actorEmail ?? l.adminEmail,
        createdAt: l.createdAt ?? l.timestamp,
        ipAddress: l.ipAddress ?? l.ip
      }))
    };
  },

  async getSystemHealth(): Promise<SystemHealthDiagnostics> {
    const res = await adminRequest<{ success: boolean; data: SystemHealthDiagnostics }>('/system/health');
    return res.data;
  },

  async runMaintenance() {
    return adminRequest<{
      success: boolean;
      message: string;
      timestamp?: string;
      cleanedSnapshots?: number;
      checkedPartitions?: number;
      auditLogsCount?: number;
    }>('/system/maintenance', {
      method: 'POST'
    });
  }
};
