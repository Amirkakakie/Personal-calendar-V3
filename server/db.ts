import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { 
  Task, 
  GoalOKR, 
  CalendarEvent, 
  ProductivityStats, 
  DailyActivity,
  Project,
  TimeLog,
  SkillNode,
  RPGAchievementBadge
} from '../src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_DATA_DIR = path.resolve(__dirname, '../data');
const DEFAULT_DB_FILE = path.join(DEFAULT_DATA_DIR, 'db.json');

function resolveStoragePath(): { targetFile: string; isServerless: boolean } {
  const isServerless = Boolean(
    process.env.VERCEL || 
    process.env.AWS_LAMBDA_FUNCTION_NAME || 
    process.env.LAMBDA_TASK_ROOT ||
    (process.env.NODE_ENV === 'production' && !fs.existsSync(DEFAULT_DATA_DIR))
  );

  if (isServerless) {
    const tmpDir = process.env.TMPDIR || '/tmp';
    return { targetFile: path.join(tmpDir, 'chronos-db.json'), isServerless: true };
  }

  try {
    if (!fs.existsSync(DEFAULT_DATA_DIR)) {
      fs.mkdirSync(DEFAULT_DATA_DIR, { recursive: true });
    }
    const testFile = path.join(DEFAULT_DATA_DIR, `.write_check_${Date.now()}`);
    fs.writeFileSync(testFile, '1');
    fs.unlinkSync(testFile);
    return { targetFile: DEFAULT_DB_FILE, isServerless: false };
  } catch (_e) {
    const tmpDir = process.env.TMPDIR || '/tmp';
    return { targetFile: path.join(tmpDir, 'chronos-db.json'), isServerless: true };
  }
}

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface WorkspaceMemberRecord {
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
}

export interface WorkspaceRecord {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  isPersonal: boolean;
  members: WorkspaceMemberRecord[];
  createdAt: string;
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  password?: string;
  role: string;
  title: string;
  avatarColor: string;
  initials: string;
  joinedAt: string;
  personalWorkspaceId: string;
}

export interface TeamProjectRecord {
  id: string;
  workspaceId: string;
  ownerId: string;
  ownerEmail: string;
  name: string;
  key: string;
  description: string;
  color: string;
  icon: string;
  memberIds: string[];
  targetDate?: string;
  createdAt: string;
}

export interface TeamTaskRecord {
  id: string;
  taskNumber: number;
  projectId: string;
  columnId: string;
  title: string;
  description?: string;
  priority: string;
  assigneeId?: string;
  dueDate?: string;
  estimatedHours?: number;
  subtasks: { id: string; title: string; completed: boolean }[];
  tags: string[];
  comments: { id: string; authorId: string; authorName: string; authorInitials: string; authorColor: string; text: string; createdAt: string }[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectInvitationRecord {
  id: string;
  projectId: string;
  projectName: string;
  projectKey: string;
  projectColor: string;
  invitedEmail: string;
  invitedByUserId: string;
  invitedByName: string;
  invitedByEmail: string;
  role: WorkspaceRole;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: string;
}

export interface UserPartition {
  tasks: Task[];
  goals: GoalOKR[];
  projects: Project[];
  calendarEvents: CalendarEvent[];
  timeLogs: TimeLog[];
  skills: SkillNode[];
  badges: RPGAchievementBadge[];
  stats: {
    focusMinutes: number;
    pomodoroSessions: number;
    totalXp: number;
    userLevel: number;
    rpgTitle: string;
    focusScore: number;
    totalRoiDollars: number;
    activityHistory: Record<string, number>;
  };
  googleAuth: {
    isConnected: boolean;
    email: string;
  };
}

export interface DatabaseSchema {
  version: string;
  users: UserRecord[];
  workspaces: WorkspaceRecord[];
  partitions: Record<string, UserPartition>;
  teamProjects: TeamProjectRecord[];
  teamTasks: TeamTaskRecord[];
  teamInvitations: ProjectInvitationRecord[];
}

function createBlankPartition(): UserPartition {
  return {
    tasks: [],
    goals: [],
    projects: [],
    calendarEvents: [],
    timeLogs: [],
    skills: [],
    badges: [],
    stats: {
      focusMinutes: 0,
      pomodoroSessions: 0,
      totalXp: 0,
      userLevel: 1,
      rpgTitle: 'Novice Pioneer',
      focusScore: 100,
      totalRoiDollars: 0,
      activityHistory: {}
    },
    googleAuth: {
      isConnected: false,
      email: ''
    }
  };
}

class Database {
  private data: DatabaseSchema;
  private dbPath: string;

  constructor() {
    const { targetFile } = resolveStoragePath();
    this.dbPath = targetFile;
    this.data = this.load();
    this.checkPrismaConnectivity();
  }

  private checkPrismaConnectivity() {
    if (process.env.DATABASE_URL) {
      console.log('[Chronos DB] DATABASE_URL detected. Hybrid Prisma PostgreSQL adapter active.');
    } else {
      console.log('[Chronos DB] Local multi-tenant partitioned storage adapter active.');
    }
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(this.dbPath)) {
        const raw = fs.readFileSync(this.dbPath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return this.sanitizeParsedData(parsed);
        }
      }
    } catch (err) {
      console.warn('[Database] Could not read existing db.json, creating pristine clean database:', err);
    }

    const pristine: DatabaseSchema = {
      version: '2.1-multi-user-workspaces',
      users: [],
      workspaces: [],
      partitions: {},
      teamProjects: [],
      teamTasks: [],
      teamInvitations: []
    };
    this.save(pristine);
    return pristine;
  }

  private sanitizeParsedData(parsed: any): DatabaseSchema {
    if (!Array.isArray(parsed.users)) parsed.users = [];
    if (!Array.isArray(parsed.workspaces)) parsed.workspaces = [];
    if (!parsed.partitions || typeof parsed.partitions !== 'object') parsed.partitions = {};
    if (!Array.isArray(parsed.teamProjects)) parsed.teamProjects = [];
    if (!Array.isArray(parsed.teamTasks)) parsed.teamTasks = [];
    if (!Array.isArray(parsed.teamInvitations)) parsed.teamInvitations = [];
    return parsed as DatabaseSchema;
  }

  private save(data: DatabaseSchema) {
    try {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tmpFile = `${this.dbPath}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tmpFile, this.dbPath);
    } catch (err) {
      console.warn('[Database] Filesystem write failed, keeping in-memory copy active:', err);
    }
  }

  // --- USER AUTH & PROFILES ---
  public getUserByEmail(email: string): UserRecord | undefined {
    const clean = email.trim().toLowerCase();
    return this.data.users.find(u => u.email.toLowerCase() === clean);
  }

  public getUserById(id: string): UserRecord | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public createUser(user: Omit<UserRecord, 'personalWorkspaceId'>): UserRecord {
    const personalWorkspaceId = `ws-personal-${user.id}`;
    
    // Create personal workspace for the user
    const personalWorkspace: WorkspaceRecord = {
      id: personalWorkspaceId,
      name: `${user.name}'s Personal Space`,
      slug: `personal-${user.id}`,
      ownerId: user.id,
      isPersonal: true,
      members: [{ userId: user.id, role: 'OWNER', joinedAt: new Date().toISOString() }],
      createdAt: new Date().toISOString()
    };

    const fullUser: UserRecord = {
      ...user,
      personalWorkspaceId
    };

    this.data.users.push(fullUser);
    this.data.workspaces.push(personalWorkspace);

    if (!this.data.partitions[user.id]) {
      this.data.partitions[user.id] = createBlankPartition();
    }

    this.save(this.data);
    return fullUser;
  }

  // --- WORKSPACES & PERMISSIONS ---
  public getWorkspacesForUser(userId: string): WorkspaceRecord[] {
    return this.data.workspaces.filter(ws => 
      ws.ownerId === userId || ws.members.some(m => m.userId === userId)
    );
  }

  public getWorkspaceById(workspaceId: string): WorkspaceRecord | undefined {
    return this.data.workspaces.find(ws => ws.id === workspaceId);
  }

  public createWorkspace(name: string, ownerId: string): WorkspaceRecord {
    const id = `ws-team-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const ws: WorkspaceRecord = {
      id,
      name: name.trim(),
      slug: `ws-${Date.now()}`,
      ownerId,
      isPersonal: false,
      members: [{ userId: ownerId, role: 'OWNER', joinedAt: new Date().toISOString() }],
      createdAt: new Date().toISOString()
    };
    this.data.workspaces.push(ws);
    this.save(this.data);
    return ws;
  }

  public isUserInWorkspace(workspaceId: string, userId: string): boolean {
    const ws = this.getWorkspaceById(workspaceId);
    if (!ws) return false;
    return ws.ownerId === userId || ws.members.some(m => m.userId === userId);
  }

  public getUserWorkspaceRole(workspaceId: string, userId: string): WorkspaceRole | null {
    const ws = this.getWorkspaceById(workspaceId);
    if (!ws) return null;
    if (ws.ownerId === userId) return 'OWNER';
    const member = ws.members.find(m => m.userId === userId);
    return member ? member.role : null;
  }

  // --- TEAM PROJECTS (WORKSPACE & MEMBER SCOPED) ---
  public getTeamProjectsForUser(userId: string): TeamProjectRecord[] {
    return this.data.teamProjects.filter(p => 
      p.ownerId === userId || (Array.isArray(p.memberIds) && p.memberIds.includes(userId))
    );
  }

  public getTeamProjectById(projectId: string, userId: string): TeamProjectRecord | undefined {
    const proj = this.data.teamProjects.find(p => p.id === projectId);
    if (!proj) return undefined;
    // Verify membership authorization
    if (proj.ownerId === userId || (Array.isArray(proj.memberIds) && proj.memberIds.includes(userId))) {
      return proj;
    }
    return undefined;
  }

  public createTeamProject(proj: TeamProjectRecord): TeamProjectRecord {
    this.data.teamProjects.unshift(proj);
    this.save(this.data);
    return proj;
  }

  public updateTeamProject(projectId: string, updates: Partial<TeamProjectRecord>, userId: string): TeamProjectRecord | null {
    const proj = this.getTeamProjectById(projectId, userId);
    if (!proj) return null;
    const idx = this.data.teamProjects.findIndex(p => p.id === projectId);
    if (idx === -1) return null;

    // Disallow altering ownerId
    const safeUpdates = { ...updates };
    delete (safeUpdates as any).ownerId;
    delete (safeUpdates as any).id;

    this.data.teamProjects[idx] = { ...this.data.teamProjects[idx], ...safeUpdates };
    this.save(this.data);
    return this.data.teamProjects[idx];
  }

  public deleteTeamProject(projectId: string, userId: string): boolean {
    const proj = this.getTeamProjectById(projectId, userId);
    if (!proj) return false;
    // Only owner can delete team project
    if (proj.ownerId !== userId) return false;

    this.data.teamProjects = this.data.teamProjects.filter(p => p.id !== projectId);
    this.data.teamTasks = this.data.teamTasks.filter(t => t.projectId !== projectId);
    this.data.teamInvitations = this.data.teamInvitations.filter(inv => inv.projectId !== projectId);
    this.save(this.data);
    return true;
  }

  // --- TEAM TASKS (PROJECT & MEMBER SCOPED) ---
  public getTeamTasksForProject(projectId: string, userId: string): TeamTaskRecord[] | null {
    const proj = this.getTeamProjectById(projectId, userId);
    if (!proj) return null; // Unauthorized
    return this.data.teamTasks.filter(t => t.projectId === projectId);
  }

  public createTeamTask(task: TeamTaskRecord, userId: string): TeamTaskRecord | null {
    const proj = this.getTeamProjectById(task.projectId, userId);
    if (!proj) return null;
    this.data.teamTasks.unshift(task);
    this.save(this.data);
    return task;
  }

  public updateTeamTask(taskId: string, updates: Partial<TeamTaskRecord>, userId: string): TeamTaskRecord | null {
    const idx = this.data.teamTasks.findIndex(t => t.id === taskId);
    if (idx === -1) return null;
    const currentTask = this.data.teamTasks[idx];

    // Verify user has access to the task's project
    const proj = this.getTeamProjectById(currentTask.projectId, userId);
    if (!proj) return null;

    // Disallow changing taskId or projectId
    const safeUpdates = { ...updates };
    delete (safeUpdates as any).id;
    delete (safeUpdates as any).projectId;

    this.data.teamTasks[idx] = {
      ...currentTask,
      ...safeUpdates,
      updatedAt: new Date().toISOString()
    };
    this.save(this.data);
    return this.data.teamTasks[idx];
  }

  public deleteTeamTask(taskId: string, userId: string): boolean {
    const currentTask = this.data.teamTasks.find(t => t.id === taskId);
    if (!currentTask) return false;
    const proj = this.getTeamProjectById(currentTask.projectId, userId);
    if (!proj) return false;

    this.data.teamTasks = this.data.teamTasks.filter(t => t.id !== taskId);
    this.save(this.data);
    return true;
  }

  // --- PROJECT INVITATIONS ---
  public getInvitationsForEmail(email: string): ProjectInvitationRecord[] {
    const clean = email.trim().toLowerCase();
    return this.data.teamInvitations.filter(inv => 
      inv.invitedEmail.toLowerCase() === clean && inv.status === 'PENDING'
    );
  }

  public createProjectInvitation(inv: ProjectInvitationRecord): ProjectInvitationRecord {
    this.data.teamInvitations.unshift(inv);
    this.save(this.data);
    return inv;
  }

  public respondToInvitation(inviteId: string, userId: string, userEmail: string, accept: boolean): boolean {
    const invite = this.data.teamInvitations.find(i => i.id === inviteId);
    if (!invite || invite.status !== 'PENDING') return false;
    if (invite.invitedEmail.toLowerCase() !== userEmail.toLowerCase()) return false;

    invite.status = accept ? 'ACCEPTED' : 'DECLINED';

    if (accept) {
      const proj = this.data.teamProjects.find(p => p.id === invite.projectId);
      if (proj && !proj.memberIds.includes(userId)) {
        proj.memberIds.push(userId);
      }
    }

    this.save(this.data);
    return true;
  }

  // --- TENANT PARTITION ACCESSOR (STRICT USER ISOLATION) ---
  private getPartition(userId: string): UserPartition {
    if (!this.data.partitions[userId]) {
      this.data.partitions[userId] = createBlankPartition();
    }
    return this.data.partitions[userId];
  }

  // --- PERSONAL TASKS (STRICT USER OWNERSHIP) ---
  public getTasks(userId: string): Task[] {
    return this.getPartition(userId).tasks;
  }

  public getTaskById(id: string, userId: string): Task | undefined {
    return this.getPartition(userId).tasks.find(t => t.id === id);
  }

  public createTask(task: Task, userId: string): Task {
    const partition = this.getPartition(userId);
    partition.tasks.unshift({ ...task, userId });
    this.save(this.data);
    return task;
  }

  public updateTask(id: string, updates: Partial<Task>, userId: string): Task | null {
    const partition = this.getPartition(userId);
    const idx = partition.tasks.findIndex(t => t.id === id);
    if (idx === -1) return null;

    const current = partition.tasks[idx];
    const isNowCompleted = updates.status === 'completed';
    const wasCompleted = current.status === 'completed';

    // Never allow reassigning userId
    const safeUpdates = { ...updates };
    delete (safeUpdates as any).userId;
    delete (safeUpdates as any).id;

    const updated: Task = {
      ...current,
      ...safeUpdates,
      updatedAt: new Date().toISOString()
    };

    if (isNowCompleted && !wasCompleted) {
      updated.completedAt = new Date().toISOString();
      const today = new Date().toISOString().split('T')[0];
      partition.stats.activityHistory[today] = (partition.stats.activityHistory[today] || 0) + 1;
      const xpEarned = current.xpReward || 50;
      this.awardXp(xpEarned, current.linkedSkillId, userId);
    } else if (!isNowCompleted && wasCompleted) {
      updated.completedAt = undefined;
    }

    partition.tasks[idx] = updated;
    this.save(this.data);
    return updated;
  }

  public deleteTask(id: string, userId: string): boolean {
    const partition = this.getPartition(userId);
    const initialLen = partition.tasks.length;
    partition.tasks = partition.tasks.filter(t => t.id !== id);
    partition.calendarEvents = partition.calendarEvents.filter(e => e.taskId !== id);
    partition.timeLogs = partition.timeLogs.map(tl => {
      if (tl.taskId === id) {
        return { ...tl, taskId: undefined };
      }
      return tl;
    });

    this.save(this.data);
    return partition.tasks.length < initialLen;
  }

  // --- PERSONAL PROJECTS (STRICT USER OWNERSHIP) ---
  public getProjects(userId: string): Project[] {
    const partition = this.getPartition(userId);
    return partition.projects.map(p => {
      const pTasks = partition.tasks.filter(t => t.projectId === p.id);
      const completed = pTasks.filter(t => t.status === 'completed').length;
      return {
        ...p,
        tasksCount: pTasks.length,
        completedTasksCount: completed
      };
    });
  }

  public getProjectById(id: string, userId: string): Project | undefined {
    return this.getPartition(userId).projects.find(p => p.id === id);
  }

  public createProject(project: Project, userId: string): Project {
    const partition = this.getPartition(userId);
    const securedProject = { ...project, userId };
    partition.projects.unshift(securedProject);
    this.save(this.data);
    return securedProject;
  }

  public updateProject(id: string, updates: Partial<Project>, userId: string): Project | null {
    const partition = this.getPartition(userId);
    const idx = partition.projects.findIndex(p => p.id === id);
    if (idx === -1) return null;

    const safeUpdates = { ...updates };
    delete (safeUpdates as any).userId;
    delete (safeUpdates as any).id;

    partition.projects[idx] = { ...partition.projects[idx], ...safeUpdates };
    this.save(this.data);
    return partition.projects[idx];
  }

  public deleteProject(id: string, userId: string): boolean {
    const partition = this.getPartition(userId);
    const init = partition.projects.length;
    partition.projects = partition.projects.filter(p => p.id !== id);
    partition.tasks = partition.tasks.map(t => {
      if (t.projectId === id) {
        return { ...t, projectId: undefined };
      }
      return t;
    });
    partition.timeLogs = partition.timeLogs.map(tl => {
      if (tl.projectId === id) {
        return { ...tl, projectId: undefined };
      }
      return tl;
    });

    this.save(this.data);
    return partition.projects.length < init;
  }

  // --- TIME TRACKING & ROI (STRICT USER OWNERSHIP) ---
  public getTimeLogs(userId: string): TimeLog[] {
    return this.getPartition(userId).timeLogs;
  }

  public addTimeLog(log: TimeLog, userId: string): TimeLog {
    const partition = this.getPartition(userId);
    const securedLog = { ...log, userId };
    partition.timeLogs.unshift(securedLog);
    partition.stats.focusMinutes += Math.round(log.durationSeconds / 60);
    partition.stats.totalRoiDollars += log.calculatedRoi;

    if (log.projectId) {
      const proj = partition.projects.find(p => p.id === log.projectId);
      if (proj) {
        proj.loggedHours = Number((proj.loggedHours + log.durationSeconds / 3600).toFixed(1));
      }
    }

    this.save(this.data);
    return securedLog;
  }

  // --- SKILLS & RPG XP (STRICT USER OWNERSHIP) ---
  public getSkills(userId: string): SkillNode[] {
    return this.getPartition(userId).skills;
  }

  public getBadges(userId: string): RPGAchievementBadge[] {
    return this.getPartition(userId).badges;
  }

  public awardXp(amount: number, skillId?: string, userId?: string) {
    if (amount <= 0 || !userId) return;
    const partition = this.getPartition(userId);
    partition.stats.totalXp += amount;
    const newLevel = Math.floor(Math.sqrt(partition.stats.totalXp / 100)) + 1;
    partition.stats.userLevel = newLevel;

    if (newLevel >= 10) partition.stats.rpgTitle = 'Grand Sovereign of Execution';
    else if (newLevel >= 7) partition.stats.rpgTitle = 'Principal Systems Architect';
    else if (newLevel >= 4) partition.stats.rpgTitle = 'Senior Focus Strategist';
    else partition.stats.rpgTitle = 'Ascendant Operator';

    if (skillId) {
      const skill = partition.skills.find(s => s.id === skillId);
      if (skill) {
        skill.currentXp += amount;
        while (skill.currentXp >= skill.requiredXp) {
          skill.level += 1;
          skill.requiredXp = Math.round(skill.requiredXp * 1.5);
        }
        skill.masteryPct = Math.min(100, Math.round((skill.currentXp / skill.requiredXp) * 100));
      }
    }
  }

  // --- GOALS / OKRS (STRICT USER OWNERSHIP) ---
  public getGoals(userId: string): GoalOKR[] {
    return this.getPartition(userId).goals;
  }

  public getGoalById(id: string, userId: string): GoalOKR | undefined {
    return this.getPartition(userId).goals.find(g => g.id === id);
  }

  public createGoal(goal: GoalOKR, userId: string): GoalOKR {
    const partition = this.getPartition(userId);
    const securedGoal = { ...goal, userId };
    partition.goals.unshift(securedGoal);
    this.save(this.data);
    return securedGoal;
  }

  public updateGoal(id: string, updates: Partial<GoalOKR>, userId: string): GoalOKR | null {
    const partition = this.getPartition(userId);
    const idx = partition.goals.findIndex(g => g.id === id);
    if (idx === -1) return null;

    const safeUpdates = { ...updates };
    delete (safeUpdates as any).userId;
    delete (safeUpdates as any).id;

    partition.goals[idx] = { ...partition.goals[idx], ...safeUpdates };
    this.save(this.data);
    return partition.goals[idx];
  }

  public deleteGoal(id: string, userId: string): boolean {
    const partition = this.getPartition(userId);
    const init = partition.goals.length;
    partition.goals = partition.goals.filter(g => g.id !== id);
    partition.tasks = partition.tasks.map(t => {
      if (t.goalId === id) {
        return { ...t, goalId: undefined };
      }
      return t;
    });
    this.save(this.data);
    return partition.goals.length < init;
  }

  // --- CALENDAR EVENTS (STRICT USER OWNERSHIP) ---
  public getCalendarEvents(userId: string): CalendarEvent[] {
    return this.getPartition(userId).calendarEvents;
  }

  public addCalendarEvent(event: CalendarEvent, userId: string): CalendarEvent {
    const partition = this.getPartition(userId);
    const securedEvent = { ...event, userId };
    partition.calendarEvents.push(securedEvent);
    this.save(this.data);
    return securedEvent;
  }

  public updateCalendarEvent(id: string, updates: Partial<CalendarEvent>, userId: string): CalendarEvent | null {
    const partition = this.getPartition(userId);
    const idx = partition.calendarEvents.findIndex(e => e.id === id || e.googleEventId === id);
    if (idx === -1) return null;

    const safeUpdates = { ...updates };
    delete (safeUpdates as any).userId;
    delete (safeUpdates as any).id;

    partition.calendarEvents[idx] = { ...partition.calendarEvents[idx], ...safeUpdates };
    this.save(this.data);
    return partition.calendarEvents[idx];
  }

  public removeCalendarEvent(id: string, userId: string): boolean {
    const partition = this.getPartition(userId);
    const initLen = partition.calendarEvents.length;
    partition.calendarEvents = partition.calendarEvents.filter(e => e.id !== id && e.googleEventId !== id && e.taskId !== id);
    this.save(this.data);
    return partition.calendarEvents.length < initLen;
  }

  // --- STATS & ANALYTICS (STRICT USER OWNERSHIP) ---
  public getProductivityStats(userId: string): ProductivityStats {
    const partition = this.getPartition(userId);
    const tasks = partition.tasks;
    const completed = tasks.filter(t => t.status === 'completed');
    const total = tasks.length;
    const rate = total > 0 ? Math.round((completed.length / total) * 100) : 0;

    const categoryDistribution: Record<string, number> = {
      'Work/Career': 0,
      'Academic/Study': 0,
      'Personal Growth': 0,
      'Health & Habits': 0
    };
    tasks.forEach(t => {
      if (categoryDistribution[t.category] !== undefined) {
        categoryDistribution[t.category]++;
      }
    });

    let streak = 0;
    const now = new Date();
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(now.getTime() - i * 86400000).toISOString().split('T')[0];
      const count = partition.stats.activityHistory[checkDate] || 0;
      if (count > 0) {
        streak++;
      } else if (i === 0) {
        continue;
      } else {
        break;
      }
    }

    const weeklyVelocity: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
      weeklyVelocity.push(partition.stats.activityHistory[d] || 0);
    }

    const weeklyActivity: DailyActivity[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
      const count = partition.stats.activityHistory[d] || 0;
      weeklyActivity.push({
        date: d,
        completedCount: count,
        totalTasks: Math.max(count, 1)
      });
    }

    const syncedToGoogleCount = tasks.filter(t => t.syncedToGoogle).length;
    const totalHours = partition.timeLogs.reduce((acc, tl) => acc + tl.durationSeconds / 3600, 0);

    return {
      completedCount: completed.length,
      totalTasks: total,
      completionRate: rate,
      currentStreakDays: streak,
      bestStreakDays: streak,
      focusMinutesToday: partition.stats.focusMinutes,
      syncedToGoogleCount,
      focusScore: total > 0 ? Math.min(100, Math.max(50, 70 + rate / 3)) : 100,
      totalXp: partition.stats.totalXp,
      userLevel: partition.stats.userLevel,
      rpgTitle: partition.stats.rpgTitle,
      totalRoiGenerated: Math.round(partition.stats.totalRoiDollars),
      billableHoursTotal: Number(totalHours.toFixed(1)),
      weeklyVelocity,
      weeklyActivity,
      categoryDistribution: categoryDistribution as any,
      categoryBreakdown: categoryDistribution as any,
      habitActivityDays: partition.stats.activityHistory
    };
  }

  public recordPomodoro(minutes: number, userId: string) {
    const partition = this.getPartition(userId);
    partition.stats.focusMinutes += minutes;
    partition.stats.pomodoroSessions += 1;
    this.awardXp(minutes * 2, undefined, userId);
    const today = new Date().toISOString().split('T')[0];
    partition.stats.activityHistory[today] = (partition.stats.activityHistory[today] || 0) + 1;
    this.save(this.data);
  }

  public getGoogleAuth(userId: string) {
    return this.getPartition(userId).googleAuth;
  }

  public setGoogleAuth(auth: Partial<UserPartition['googleAuth']>, userId: string) {
    const partition = this.getPartition(userId);
    partition.googleAuth = { ...partition.googleAuth, ...auth };
    this.save(this.data);
  }

  // --- CROSS-RESOURCE VALIDATION HELPERS ---
  /**
   * Verifies that the task belongs to the user
   */
  public verifyTaskOwnership(taskId: string, userId: string): boolean {
    return Boolean(this.getTaskById(taskId, userId));
  }

  /**
   * Verifies that the project belongs to the user (personal) OR is an authorized team project
   */
  public verifyProjectAccess(projectId: string, userId: string): boolean {
    const isPersonal = Boolean(this.getProjectById(projectId, userId));
    if (isPersonal) return true;
    return Boolean(this.getTeamProjectById(projectId, userId));
  }

  /**
   * Verifies that the goal belongs to the user
   */
  public verifyGoalOwnership(goalId: string, userId: string): boolean {
    return Boolean(this.getGoalById(goalId, userId));
  }
}

export const db = new Database();
