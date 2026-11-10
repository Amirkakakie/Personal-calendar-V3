import fs from 'fs';
import { AsyncLocalStorage } from 'node:async_hooks';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { loadRelationalSnapshot, persistRelationalSnapshot } from './migrations/relationalStore.ts';
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
  // Explicit isolated storage path is used by tests and local tooling.
  if (process.env.CHRONOS_DATA_FILE) {
    return {
      targetFile: path.resolve(process.env.CHRONOS_DATA_FILE),
      isServerless: false
    };
  }

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
  avatarUrl?: string;
  googleId?: string;
  initials: string;
  joinedAt: string;
  personalWorkspaceId: string;
  status?: 'active' | 'suspended';
  lastLoginAt?: string;
}

export interface AuditLogRecord {
  id: string;
  timestamp: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetType: 'user' | 'project' | 'team' | 'task' | 'system' | 'auth';
  targetId?: string;
  details: Record<string, any>;
  ip?: string;
  userAgent?: string;
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
  memberRoles?: Record<string, WorkspaceRole>;
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
  auditLogs?: AuditLogRecord[];
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

function isValidPostgresUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith('postgres://') && !trimmed.startsWith('postgresql://')) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname;
    if (!host || host === 'base' || host.includes('Your') || host.includes('db-host')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

class Database {
  private sharedData!: DatabaseSchema;
  private readonly requestStorage = new AsyncLocalStorage<{ data: DatabaseSchema; version: bigint }>();
  private get data(): DatabaseSchema { return this.requestStorage.getStore()?.data ?? this.sharedData; }
  private set data(value: DatabaseSchema) { const context=this.requestStorage.getStore(); if(context) context.data=value; else this.sharedData=value; }
  private dbPath: string;
  private isServerless: boolean = false;
  private prisma: PrismaClient | null = null;
  private prismaConnected = false;
  private prismaInitPromise: Promise<void> | null = null;
  private prismaVersion = 0n;
  private writeQueue: Promise<void> = Promise.resolve();
  private readonly requiresPostgres: boolean;
  private readonly relationalEnabled: boolean;
  private configurationError: string | null = null;

  constructor() {
    const { targetFile, isServerless } = resolveStoragePath();
    this.dbPath = targetFile;
    this.isServerless = isServerless;
    this.requiresPostgres = process.env.NODE_ENV === 'production' || isServerless;
    this.relationalEnabled = this.requiresPostgres || isValidPostgresUrl(process.env.DATABASE_URL);
    this.data = this.relationalEnabled ? this.createEmptyState() : this.load();
    this.initPostgres();
    this.bootstrapSuperAdminFromEnv();
  }

  private createEmptyState(): DatabaseSchema {
    return {
      version: '3.0-prisma-relational',
      users: [],
      workspaces: [],
      partitions: {},
      teamProjects: [],
      teamTasks: [],
      teamInvitations: [],
      auditLogs: []
    };
  }

  public async ready(): Promise<void> {
    if (this.prismaInitPromise) await this.prismaInitPromise;
    if (!this.relationalEnabled) return;
    if (!this.prisma || !this.prismaConnected) {
      throw new Error(this.configurationError || 'Prisma PostgreSQL persistence is unavailable.');
    }
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      this.prismaConnected = true;
    } catch {
      this.prismaConnected = false;
      throw new Error('PostgreSQL is unavailable; requests requiring persistence are blocked.');
    }
  }

  public async refresh(): Promise<void> {
    await this.ready();
    if (!this.relationalEnabled || !this.prisma) return;
    try {
      await this.flush();
    } catch (error) {
      console.error('[Chronos DB] Recovering after a rejected relational write:', error);
      this.writeQueue = Promise.resolve();
    }
    const loaded = await loadRelationalSnapshot(this.prisma);
    this.data = this.sanitizeParsedData(loaded.data);
    const context=this.requestStorage.getStore();
    if(context) context.version=loaded.version;
    else this.prismaVersion=loaded.version;
  }

  /**
   * Give each API request its own immutable starting snapshot and revision.
   * Concurrent writers therefore cannot mutate one shared in-memory object or
   * accidentally persist a stale full snapshot over a newer commit.
   */
  public async runWithRequest(callback: () => void): Promise<void> {
    await this.ready();
    if (!this.relationalEnabled || !this.prisma) {
      callback();
      return;
    }
    try {
      await this.flush();
    } catch (error) {
      console.error('[Chronos DB] Resetting failed request write queue before refresh:', error);
      this.writeQueue = Promise.resolve();
    }
    const loaded=await loadRelationalSnapshot(this.prisma);
    const context={data:this.sanitizeParsedData(loaded.data),version:loaded.version};
    this.requestStorage.run(context,callback);
  }

  public async flush(): Promise<void> {
    await this.writeQueue;
    if (this.relationalEnabled && (!this.prisma || !this.prismaConnected)) {
      throw new Error('Persistent relational database connection is not available.');
    }
  }

  private initPostgres(): void {
    const dbUrl = process.env.DATABASE_URL;
    if (!this.relationalEnabled) {
      if (this.requiresPostgres) {
        this.configurationError = !dbUrl
          ? 'DATABASE_URL is required in production and serverless deployments.'
          : 'DATABASE_URL must be a valid PostgreSQL connection string.';
        console.error(`[Chronos DB] ${this.configurationError}`);
      } else {
        console.log('[Chronos DB] Local development JSON persistence active at:', this.dbPath);
      }
      return;
    }

    try {
      console.log('[Chronos DB] Connecting to Prisma PostgreSQL relational store...');
      this.prisma = new PrismaClient();
      this.prismaInitPromise = this.setupRelationalStore().catch((error: any) => {
        this.prismaConnected = false;
        this.configurationError = error?.message || 'Prisma relational initialization failed.';
        console.error('[Chronos DB] Relational initialization failed:', this.configurationError);
      });
    } catch (error: any) {
      this.configurationError = error?.message || 'Failed to initialize Prisma PostgreSQL client.';
      this.prismaConnected = false;
    }
  }

  private async setupRelationalStore(): Promise<void> {
    if (!this.prisma) throw new Error('Prisma client was not initialized.');
    await this.prisma.$connect();

    const existingRevision = await this.prisma.databaseRevision.findUnique({ where: { id: 'root' } });
    if (!existingRevision) {
      const tableCheck = await this.prisma.$queryRaw<Array<{ table_name: string | null }>>`
        SELECT to_regclass('public.chronos_data')::text AS table_name
      `;
      if (tableCheck[0]?.table_name) {
        const legacyRoot = await this.prisma.$queryRawUnsafe<Array<{ version: number }>>(
          "SELECT version FROM chronos_data WHERE key = 'root' LIMIT 1"
        );
        if (legacyRoot.length) {
          throw new Error('Legacy JSONB root data still exists. Export it, run the verified relational importer, and only then enable Prisma runtime.');
        }
      }

      const existingUsers = await this.prisma.user.count();
      const existingArchives = await this.prisma.legacySnapshot.count();
      if (existingUsers || existingArchives) {
        throw new Error('Relational tables contain data but DatabaseRevision is missing. Refusing to initialize an inconsistent database.');
      }
      if (process.env.CHRONOS_ALLOW_EMPTY_DB_INIT !== 'true') {
        throw new Error('Relational database is not initialized. Import a verified legacy snapshot, or explicitly set CHRONOS_ALLOW_EMPTY_DB_INIT=true for a new installation.');
      }
      await this.prisma.databaseRevision.create({ data: { id: 'root', version: 1n } });
    }

    const loaded = await loadRelationalSnapshot(this.prisma);
    this.data = this.sanitizeParsedData(loaded.data);
    this.prismaVersion = loaded.version;
    this.prismaConnected = true;
    console.log('[Chronos DB] Prisma relational persistence is ready.');
  }

  private async syncToPrisma(data: DatabaseSchema, context?: { data: DatabaseSchema; version: bigint }): Promise<void> {
    if (!this.prisma || !this.prismaConnected) {
      throw new Error('Prisma PostgreSQL is not connected; refusing to acknowledge a write.');
    }
    const expectedVersion=context?.version ?? this.prismaVersion;
    const nextVersion=await persistRelationalSnapshot(this.prisma,data,expectedVersion);
    this.prismaVersion=nextVersion;
    if(context) context.version=nextVersion;
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
      teamInvitations: [],
      auditLogs: []
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
    if (!Array.isArray(parsed.auditLogs)) parsed.auditLogs = [];
    return parsed as DatabaseSchema;
  }

  private save(data: DatabaseSchema) {
    if (this.relationalEnabled) {
      // Capture an immutable snapshot at mutation time and serialize writes.
      const snapshot = JSON.parse(JSON.stringify(data)) as DatabaseSchema;
      const context=this.requestStorage.getStore();
      this.writeQueue = this.writeQueue.then(() => this.syncToPrisma(snapshot,context));
      return;
    }

    try {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const tmpFile = `${this.dbPath}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tmpFile, this.dbPath);
    } catch (err) {
      console.error('[Database] Local development persistence failed:', err);
      throw err;
    }
  }

  public getHealthInfo() {
    const dbUrl = process.env.DATABASE_URL;
    const isValidUrl = isValidPostgresUrl(dbUrl);
    const relationalReady = Boolean(this.prisma && this.prismaConnected);
    const localDevelopment = !this.relationalEnabled;
    return {
      status: relationalReady || localDevelopment ? 'healthy' : 'unavailable',
      persistenceEngine: relationalReady
        ? 'postgresql_prisma_relational'
        : localDevelopment ? 'local_json_development' : 'unavailable',
      isServerless: this.isServerless,
      databaseUrlConfigured: Boolean(dbUrl),
      databaseUrlValid: isValidUrl,
      pgConnected: this.prismaConnected,
      usersCount: this.data.users.length,
      storagePath: this.relationalEnabled ? undefined : this.dbPath,
      serverlessWarning: this.relationalEnabled && !relationalReady
        ? (this.configurationError || 'Prisma PostgreSQL relational persistence is unavailable.')
        : undefined
    };
  }

  public updateUser(userId: string, updates: Partial<UserRecord>): UserRecord | null {
    const idx = this.data.users.findIndex(u => u.id === userId);
    if (idx === -1) return null;
    const safeUpdates = { ...updates };
    delete (safeUpdates as any).id;
    this.data.users[idx] = { ...this.data.users[idx], ...safeUpdates };
    this.save(this.data);
    return this.data.users[idx];
  }

  public linkGoogleAccount(userId: string, googleId: string, avatarUrl?: string): UserRecord | null {
    const user = this.getUserById(userId);
    if (!user) return null;
    user.googleId = googleId;
    if (avatarUrl && !user.avatarUrl) {
      user.avatarUrl = avatarUrl;
    }
    this.save(this.data);
    return user;
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

  public getProjectRole(projectId: string, userId: string): WorkspaceRole | null {
    const proj = this.data.teamProjects.find(p => p.id === projectId);
    if (!proj) return null;
    if (proj.ownerId === userId) return 'OWNER';
    if (proj.memberRoles && proj.memberRoles[userId]) return proj.memberRoles[userId];
    if (Array.isArray(proj.memberIds) && proj.memberIds.includes(userId)) return 'MEMBER';
    return null;
  }

  public getTeamProjectMembers(projectId: string, requesterId: string) {
    const project = this.getTeamProjectById(projectId, requesterId);
    if (!project) return null;
    return project.memberIds.map(userId => {
      const user = this.getUserById(userId);
      if (!user) return null;
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        title: user.title || '',
        initials: user.initials || user.name.slice(0, 2).toUpperCase(),
        avatarColor: user.avatarColor || 'from-indigo-600 to-violet-600',
        role: this.getProjectRole(projectId, userId) || 'MEMBER',
        isOnline: false
      };
    }).filter(Boolean);
  }

  public updateProjectMemberRole(projectId: string, targetUserId: string, role: WorkspaceRole, actorId: string): boolean {
    const project = this.getTeamProjectById(projectId, actorId);
    if (!project || !project.memberIds.includes(targetUserId)) return false;
    const actorRole = this.getProjectRole(projectId, actorId);
    const targetRole = this.getProjectRole(projectId, targetUserId);
    if (targetUserId === project.ownerId || targetRole === 'OWNER') return false;
    if (actorRole !== 'OWNER' && actorRole !== 'ADMIN') return false;
    if (actorRole === 'ADMIN' && (targetRole === 'ADMIN' || role === 'ADMIN' || role === 'OWNER')) return false;
    if (role === 'OWNER') return false;
    if (!project.memberRoles) project.memberRoles = { [project.ownerId]: 'OWNER' };
    project.memberRoles[targetUserId] = role;
    this.save(this.data);
    return true;
  }

  public removeProjectMember(projectId: string, targetUserId: string, actorId: string): boolean {
    const project = this.getTeamProjectById(projectId, actorId);
    if (!project || !project.memberIds.includes(targetUserId)) return false;
    const actorRole = this.getProjectRole(projectId, actorId);
    const targetRole = this.getProjectRole(projectId, targetUserId);
    if (targetUserId === project.ownerId || targetRole === 'OWNER') return false;
    if (actorRole !== 'OWNER' && actorRole !== 'ADMIN') return false;
    if (actorRole === 'ADMIN' && targetRole === 'ADMIN') return false;
    project.memberIds = project.memberIds.filter(id => id !== targetUserId);
    if (project.memberRoles) delete project.memberRoles[targetUserId];
    const now = new Date().toISOString();
    this.data.teamTasks = this.data.teamTasks.map(task =>
      task.projectId === projectId && task.assigneeId === targetUserId
        ? { ...task, assigneeId: undefined, updatedAt: now }
        : task
    );
    this.save(this.data);
    return true;
  }

  public createTeamProject(proj: TeamProjectRecord): TeamProjectRecord {
    if (!proj.memberRoles) {
      proj.memberRoles = { [proj.ownerId]: 'OWNER' };
    } else {
      proj.memberRoles[proj.ownerId] = 'OWNER';
    }
    this.data.teamProjects.unshift(proj);
    this.save(this.data);
    return proj;
  }

  public updateTeamProject(projectId: string, updates: Partial<TeamProjectRecord>, userId: string): TeamProjectRecord | null {
    const proj = this.getTeamProjectById(projectId, userId);
    if (!proj) return null;
    if (updates.workspaceId !== undefined && (typeof updates.workspaceId !== 'string' || !this.isUserInWorkspace(updates.workspaceId, userId))) return null;
    
    // Only OWNER and ADMIN can update team project settings
    const role = this.getProjectRole(projectId, userId);
    if (role !== 'OWNER' && role !== 'ADMIN') {
      return null;
    }

    const idx = this.data.teamProjects.findIndex(p => p.id === projectId);
    if (idx === -1) return null;

    // Disallow altering ownerId, id, memberIds, or memberRoles directly via standard update
    const safeUpdates = { ...updates };
    delete (safeUpdates as any).ownerId;
    delete (safeUpdates as any).id;
    delete (safeUpdates as any).memberIds;
    delete (safeUpdates as any).memberRoles;

    this.data.teamProjects[idx] = { ...this.data.teamProjects[idx], ...safeUpdates };
    this.save(this.data);
    return this.data.teamProjects[idx];
  }

  public deleteTeamProject(projectId: string, userId: string): boolean {
    const proj = this.data.teamProjects.find(p => p.id === projectId);
    if (!proj) return false;
    // Only owner can delete team project
    if (proj.ownerId !== userId) return false;

    this.data.teamProjects = this.data.teamProjects.filter(p => p.id !== projectId);
    this.data.teamTasks = this.data.teamTasks.filter(t => t.projectId !== projectId);
    this.data.teamInvitations = this.data.teamInvitations.filter(inv => inv.projectId !== projectId);
    this.save(this.data);
    return true;
  }

  // --- TEAM TASKS (PROJECT & MEMBER SCOPED WITH RBAC) ---
  public getTeamTaskById(taskId: string, userId: string): TeamTaskRecord | undefined {
    const task = this.data.teamTasks.find(item => item.id === taskId);
    if (!task || !this.getTeamProjectById(task.projectId, userId)) return undefined;
    return task;
  }

  public getTeamTasksForProject(projectId: string, userId: string): TeamTaskRecord[] | null {
    const proj = this.getTeamProjectById(projectId, userId);
    if (!proj) return null; // Unauthorized
    return this.data.teamTasks.filter(t => t.projectId === projectId);
  }

  public createTeamTask(task: TeamTaskRecord, userId: string): TeamTaskRecord | null {
    const proj = this.getTeamProjectById(task.projectId, userId);
    if (!proj) return null;
    
    // VIEWER role cannot create tasks
    const role = this.getProjectRole(task.projectId, userId);
    if (role === 'VIEWER') return null;
    if (task.assigneeId && !proj.memberIds.includes(task.assigneeId)) return null;

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

    // VIEWER role cannot update tasks
    const role = this.getProjectRole(currentTask.projectId, userId);
    if (role === 'VIEWER') return null;

    if (updates.assigneeId && !proj.memberIds.includes(updates.assigneeId)) return null;

    // Disallow changing taskId, projectId, or overwriting comments directly via updateTeamTask
    const safeUpdates = { ...updates };
    delete (safeUpdates as any).id;
    delete (safeUpdates as any).projectId;
    delete (safeUpdates as any).comments;

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

    // VIEWER role cannot delete tasks
    const role = this.getProjectRole(currentTask.projectId, userId);
    if (role === 'VIEWER') return false;

    this.data.teamTasks = this.data.teamTasks.filter(t => t.id !== taskId);
    this.save(this.data);
    return true;
  }

  public addTeamTaskComment(
    taskId: string, 
    comment: { authorId: string; authorName: string; authorInitials: string; authorColor: string; text: string }, 
    userId: string
  ): TeamTaskRecord | null {
    const idx = this.data.teamTasks.findIndex(t => t.id === taskId);
    if (idx === -1) return null;
    const currentTask = this.data.teamTasks[idx];

    const proj = this.getTeamProjectById(currentTask.projectId, userId);
    if (!proj) return null;

    // VIEWER role cannot add comments
    const role = this.getProjectRole(currentTask.projectId, userId);
    if (role === 'VIEWER') return null;

    const newComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      authorId: userId,
      authorName: comment.authorName,
      authorInitials: comment.authorInitials,
      authorColor: comment.authorColor,
      text: comment.text.trim(),
      createdAt: new Date().toISOString()
    };

    if (!Array.isArray(currentTask.comments)) {
      currentTask.comments = [];
    }
    currentTask.comments.push(newComment);
    currentTask.updatedAt = new Date().toISOString();
    this.save(this.data);
    return currentTask;
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
      if (proj) {
        if (!Array.isArray(proj.memberIds)) proj.memberIds = [];
        if (!proj.memberIds.includes(userId)) {
          proj.memberIds.push(userId);
        }
        if (!proj.memberRoles) {
          proj.memberRoles = { [proj.ownerId]: 'OWNER' };
        }
        proj.memberRoles[userId] = invite.role || 'MEMBER';
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
    partition.projects = partition.projects.map(p => p.goalId === id ? { ...p, goalId: undefined } : p);
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

  // ============================================================================
  // SUPER ADMIN CONTROL CENTER SERVICES & PLATFORM AGGREGATIONS
  // ============================================================================

  /**
   * Automatic environment-based Super Admin bootstrap
   */
  public bootstrapSuperAdminFromEnv(): void {
    try {
      const adminEmail = (process.env.CHRONOS_SUPERADMIN_EMAIL || 'amir.work.vr@gmail.com').trim().toLowerCase();
      if (!adminEmail) return;

      const existing = this.getUserByEmail(adminEmail);
      if (existing) {
        let changed = false;
        if (existing.role !== 'superadmin') {
          existing.role = 'superadmin';
          changed = true;
        }
        if (existing.status !== 'active') {
          existing.status = 'active';
          changed = true;
        }
        if (changed) {
          this.save(this.data);
          this.addAuditLog({
            adminId: existing.id,
            adminEmail: existing.email,
            action: 'superadmin.bootstrap_promoted',
            targetType: 'user',
            targetId: existing.id,
            details: { email: adminEmail, reason: 'Platform owner bootstrap promotion' }
          });
          console.log(`[Chronos SuperAdmin] Platform owner ${adminEmail} verified with role: superadmin`);
        }
      } else if (process.env.CHRONOS_SUPERADMIN_PASSWORD) {
        const passwordHash = bcrypt.hashSync(process.env.CHRONOS_SUPERADMIN_PASSWORD, 10);
        const id = `usr-admin-${Date.now()}`;
        const newAdmin: UserRecord = {
          id,
          name: process.env.CHRONOS_SUPERADMIN_NAME || 'Platform Super Admin',
          email: adminEmail,
          passwordHash,
          role: 'superadmin',
          status: 'active',
          title: 'Platform Super Admin',
          avatarColor: 'from-violet-600 to-indigo-600',
          initials: 'SA',
          joinedAt: new Date().toISOString().split('T')[0],
          personalWorkspaceId: `ws-personal-${id}`
        };
        this.createUser(newAdmin);
        this.addAuditLog({
          adminId: id,
          adminEmail,
          action: 'superadmin.bootstrap_created',
          targetType: 'user',
          targetId: id,
          details: { email: adminEmail, reason: 'Initial superadmin account created via environment bootstrap' }
        });
        console.log(`[Chronos SuperAdmin] Provisioned initial superadmin ${adminEmail}`);
      }
    } catch (err) {
      console.error('[Chronos SuperAdmin] Bootstrap check error:', err);
    }
  }

  /**
   * Explicit Super Admin provisioning (CLI / API)
   */
  public bootstrapSuperAdmin(email: string, password?: string, name?: string): { success: boolean; user?: Omit<UserRecord, 'passwordHash' | 'password'>; message: string } {
    const cleanEmail = email.trim().toLowerCase();
    const existing = this.getUserByEmail(cleanEmail);

    if (existing) {
      existing.role = 'superadmin';
      existing.status = 'active';
      if (password) {
        existing.passwordHash = bcrypt.hashSync(password, 10);
        delete existing.password;
      }
      this.save(this.data);
      this.addAuditLog({
        adminId: existing.id,
        adminEmail: existing.email,
        action: 'superadmin.explicit_promote',
        targetType: 'user',
        targetId: existing.id,
        details: { email: cleanEmail }
      });
      const { passwordHash: _, password: __, ...safe } = existing as any;
      return { success: true, user: safe, message: `Account ${cleanEmail} promoted to Super Admin successfully.` };
    }

    if (!password) {
      return { success: false, message: 'Password is required to create a new Super Admin account.' };
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const id = `usr-admin-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const displayName = name || cleanEmail.split('@')[0];
    const newAdmin: UserRecord = {
      id,
      name: displayName,
      email: cleanEmail,
      passwordHash,
      role: 'superadmin',
      status: 'active',
      title: 'Platform Super Admin',
      avatarColor: 'from-violet-600 to-indigo-600',
      initials: displayName.slice(0, 2).toUpperCase(),
      joinedAt: new Date().toISOString().split('T')[0],
      personalWorkspaceId: `ws-personal-${id}`
    };

    const created = this.createUser(newAdmin);
    this.addAuditLog({
      adminId: id,
      adminEmail: cleanEmail,
      action: 'superadmin.explicit_create',
      targetType: 'user',
      targetId: id,
      details: { email: cleanEmail }
    });

    const { passwordHash: _, password: __, ...safe } = created as any;
    return { success: true, user: safe, message: `Super Admin account ${cleanEmail} created successfully.` };
  }

  // --- AUDIT LOGGING ---
  public addAuditLog(entry: Omit<AuditLogRecord, 'id' | 'timestamp'>): AuditLogRecord {
    if (!Array.isArray(this.data.auditLogs)) {
      this.data.auditLogs = [];
    }
    const log: AuditLogRecord = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...entry
    };
    this.data.auditLogs.unshift(log);
    // Bounded FIFO buffer of 5000 records
    if (this.data.auditLogs.length > 5000) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 5000);
    }
    this.save(this.data);
    return log;
  }

  public getAuditLogs(options?: {
    action?: string;
    adminEmail?: string;
    targetType?: string;
    targetId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): { logs: AuditLogRecord[]; total: number } {
    let logs = this.data.auditLogs || [];

    if (options?.action) {
      const q = options.action.toLowerCase();
      logs = logs.filter(l => l.action.toLowerCase().includes(q));
    }
    if (options?.adminEmail) {
      const q = options.adminEmail.toLowerCase();
      logs = logs.filter(l => l.adminEmail.toLowerCase().includes(q));
    }
    if (options?.targetType) {
      logs = logs.filter(l => l.targetType === options.targetType);
    }
    if (options?.targetId) {
      logs = logs.filter(l => l.targetId === options.targetId);
    }
    if (options?.dateFrom) {
      const fromTime = new Date(options.dateFrom).getTime();
      logs = logs.filter(l => new Date(l.timestamp).getTime() >= fromTime);
    }
    if (options?.dateTo) {
      const toTime = new Date(options.dateTo).getTime();
      logs = logs.filter(l => new Date(l.timestamp).getTime() <= toTime);
    }

    const total = logs.length;
    const limit = Math.min(Math.max(options?.limit || 50, 1), 200);
    const offset = Math.max(options?.offset || 0, 0);
    const paged = logs.slice(offset, offset + limit);

    return { logs: paged, total };
  }

  // --- USER MANAGEMENT (SUPER ADMIN) ---
  public getAllUsersAdmin(options?: {
    search?: string;
    status?: string;
    role?: string;
    limit?: number;
    offset?: number;
  }): {
    users: Array<Omit<UserRecord, 'password' | 'passwordHash'> & {
      personalProjectsCount: number;
      teamMembershipsCount: number;
      tasksCount: number;
      status: 'active' | 'suspended';
    }>;
    total: number;
  } {
    let users = [...this.data.users];

    if (options?.search) {
      const q = options.search.trim().toLowerCase();
      users = users.filter(u => 
        u.email.toLowerCase().includes(q) || 
        u.name.toLowerCase().includes(q) || 
        u.id.toLowerCase().includes(q)
      );
    }

    if (options?.status && options.status !== 'all') {
      const reqStatus = options.status.toLowerCase();
      users = users.filter(u => (u.status || 'active').toLowerCase() === reqStatus);
    }

    if (options?.role && options.role !== 'all') {
      const reqRole = options.role.toLowerCase();
      users = users.filter(u => u.role.toLowerCase() === reqRole);
    }

    const total = users.length;
    const limit = Math.min(Math.max(options?.limit || 25, 1), 200);
    const offset = Math.max(options?.offset || 0, 0);
    const paged = users.slice(offset, offset + limit);

    const mapped = paged.map(u => {
      const partition = this.data.partitions[u.id];
      const personalProjectsCount = partition?.projects?.length || 0;
      const tasksCount = (partition?.tasks?.length || 0) + this.data.teamTasks.filter(t => t.assigneeId === u.id).length;
      const teamMembershipsCount = this.data.workspaces.filter(ws => 
        !ws.isPersonal && (ws.ownerId === u.id || ws.members?.some(m => m.userId === u.id))
      ).length;

      const { password: _, passwordHash: __, ...safe } = u as any;
      return {
        ...safe,
        status: (u.status || 'active') as 'active' | 'suspended',
        personalProjectsCount,
        teamMembershipsCount,
        tasksCount
      };
    });

    return { users: mapped, total };
  }

  public getUserDetailsAdmin(userId: string) {
    const user = this.getUserById(userId);
    if (!user) return null;

    const partition = this.data.partitions[userId] || createBlankPartition();
    const personalProjects = partition.projects || [];
    const personalTasks = partition.tasks || [];
    const completedPersonalTasks = personalTasks.filter(t => t.status === 'completed').length;

    // Team projects where user is owner or member
    const teamProjects = this.data.teamProjects.filter(p => 
      p.ownerId === userId || (Array.isArray(p.memberIds) && p.memberIds.includes(userId))
    );

    // Team workspaces
    const workspaces = this.data.workspaces.filter(ws => 
      !ws.isPersonal && (ws.ownerId === userId || ws.members?.some(m => m.userId === userId))
    ).map(ws => ({
      id: ws.id,
      name: ws.name,
      role: ws.ownerId === userId ? 'OWNER' : (ws.members?.find(m => m.userId === userId)?.role || 'MEMBER'),
      createdAt: ws.createdAt
    }));

    const { password: _, passwordHash: __, ...safeUser } = user as any;

    return {
      user: {
        ...safeUser,
        status: user.status || 'active'
      },
      stats: partition.stats,
      personalProjectsCount: personalProjects.length,
      personalProjects: personalProjects.map(p => ({
        id: p.id,
        name: p.name,
        status: p.status,
        loggedHours: p.loggedHours,
        createdAt: p.createdAt
      })),
      teamProjectsCount: teamProjects.length,
      teamProjects: teamProjects.map(p => ({
        id: p.id,
        name: p.name,
        key: p.key,
        color: p.color,
        createdAt: p.createdAt,
        isOwner: p.ownerId === userId
      })),
      workspaces,
      taskSummary: {
        total: personalTasks.length,
        completed: completedPersonalTasks,
        pending: personalTasks.length - completedPersonalTasks
      }
    };
  }

  public deleteUserAdmin(userId: string): boolean {
    const user = this.getUserById(userId);
    if (!user) return false;

    // 1. Remove user
    this.data.users = this.data.users.filter(u => u.id !== userId);

    // 2. Remove partition
    delete this.data.partitions[userId];

    // 3. Remove personal workspace
    this.data.workspaces = this.data.workspaces.filter(ws => !(ws.isPersonal && ws.ownerId === userId));

    // 4. Remove from workspace memberships
    for (const ws of this.data.workspaces) {
      if (Array.isArray(ws.members)) {
        ws.members = ws.members.filter(m => m.userId !== userId);
      }
    }

    // 5. Remove from team projects
    for (const proj of this.data.teamProjects) {
      if (Array.isArray(proj.memberIds)) {
        proj.memberIds = proj.memberIds.filter(id => id !== userId);
      }
      if (proj.memberRoles && proj.memberRoles[userId]) {
        delete proj.memberRoles[userId];
      }
    }

    // 6. Unassign tasks
    for (const t of this.data.teamTasks) {
      if (t.assigneeId === userId) {
        delete t.assigneeId;
      }
    }

    // 7. Remove invitations
    this.data.teamInvitations = this.data.teamInvitations.filter(inv => 
      inv.invitedEmail.toLowerCase() !== user.email.toLowerCase() && inv.invitedByUserId !== userId
    );

    this.save(this.data);
    return true;
  }

  // --- PROJECT MANAGEMENT (SUPER ADMIN) ---
  public getAllProjectsAdmin(options?: {
    search?: string;
    type?: 'all' | 'personal' | 'team';
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    interface AdminProjectItem {
      id: string;
      name: string;
      description?: string;
      type: 'personal' | 'team';
      ownerId: string;
      ownerName: string;
      ownerEmail: string;
      status: string;
      tasksCount: number;
      completedTasksCount: number;
      memberCount: number;
      loggedHours: number;
      createdAt: string;
      color?: string;
    }

    const combined: AdminProjectItem[] = [];

    // Personal projects
    for (const user of this.data.users) {
      const partition = this.data.partitions[user.id];
      if (partition && Array.isArray(partition.projects)) {
        for (const p of partition.projects) {
          const pTasks = (partition.tasks || []).filter(t => t.projectId === p.id);
          const completedCount = pTasks.filter(t => t.status === 'completed').length;
          combined.push({
            id: p.id,
            name: p.name,
            description: p.description,
            type: 'personal',
            ownerId: user.id,
            ownerName: user.name,
            ownerEmail: user.email,
            status: p.status || 'in_progress',
            tasksCount: pTasks.length,
            completedTasksCount: completedCount,
            memberCount: 1,
            loggedHours: p.loggedHours || 0,
            createdAt: p.createdAt || user.joinedAt,
            color: p.color
          });
        }
      }
    }

    // Team projects
    for (const tp of this.data.teamProjects) {
      const owner = this.getUserById(tp.ownerId);
      const tpTasks = this.data.teamTasks.filter(t => t.projectId === tp.id);
      const completedCount = tpTasks.filter(t => t.columnId === 'done' || t.columnId === 'completed').length;
      combined.push({
        id: tp.id,
        name: tp.name,
        description: tp.description,
        type: 'team',
        ownerId: tp.ownerId,
        ownerName: owner?.name || tp.ownerEmail.split('@')[0],
        ownerEmail: owner?.email || tp.ownerEmail,
        status: 'active',
        tasksCount: tpTasks.length,
        completedTasksCount: completedCount,
        memberCount: Array.isArray(tp.memberIds) ? tp.memberIds.length : 1,
        loggedHours: tpTasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0),
        createdAt: tp.createdAt,
        color: tp.color
      });
    }

    let filtered = combined;

    if (options?.type && options.type !== 'all') {
      filtered = filtered.filter(p => p.type === options.type);
    }

    if (options?.search) {
      const q = options.search.trim().toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.ownerEmail.toLowerCase().includes(q) ||
        p.ownerName.toLowerCase().includes(q)
      );
    }

    if (options?.status && options.status !== 'all') {
      const st = options.status.toLowerCase();
      filtered = filtered.filter(p => p.status.toLowerCase() === st);
    }

    // Sort descending by createdAt
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = filtered.length;
    const limit = Math.min(Math.max(options?.limit || 25, 1), 200);
    const offset = Math.max(options?.offset || 0, 0);
    const paged = filtered.slice(offset, offset + limit);

    return { projects: paged, total };
  }

  public getProjectDetailsAdmin(projectId: string) {
    // 1. Check if team project
    const teamProj = this.data.teamProjects.find(p => p.id === projectId);
    if (teamProj) {
      const owner = this.getUserById(teamProj.ownerId);
      const tasks = this.data.teamTasks.filter(t => t.projectId === projectId);
      const members = (teamProj.memberIds || []).map(mid => {
        const u = this.getUserById(mid);
        return {
          id: mid,
          name: u?.name || 'Unknown',
          email: u?.email || '',
          role: teamProj.memberRoles?.[mid] || (mid === teamProj.ownerId ? 'OWNER' : 'MEMBER')
        };
      });

      return {
        id: teamProj.id,
        name: teamProj.name,
        key: teamProj.key,
        description: teamProj.description,
        type: 'team',
        color: teamProj.color,
        ownerId: teamProj.ownerId,
        ownerName: owner?.name || teamProj.ownerEmail,
        ownerEmail: owner?.email || teamProj.ownerEmail,
        status: 'active',
        createdAt: teamProj.createdAt,
        members,
        tasks: tasks.map(t => ({
          id: t.id,
          taskNumber: t.taskNumber,
          title: t.title,
          columnId: t.columnId,
          priority: t.priority,
          assignee: t.assigneeId ? this.getUserById(t.assigneeId)?.name : 'Unassigned',
          estimatedHours: t.estimatedHours,
          createdAt: t.createdAt
        }))
      };
    }

    // 2. Check if personal project in any partition
    for (const [userId, partition] of Object.entries(this.data.partitions)) {
      const proj = (partition.projects || []).find(p => p.id === projectId);
      if (proj) {
        const owner = this.getUserById(userId);
        const tasks = (partition.tasks || []).filter(t => t.projectId === projectId);
        return {
          id: proj.id,
          name: proj.name,
          description: proj.description,
          type: 'personal',
          color: proj.color,
          ownerId: userId,
          ownerName: owner?.name || owner?.email || 'User',
          ownerEmail: owner?.email || '',
          status: proj.status || 'in_progress',
          createdAt: proj.createdAt,
          targetHours: proj.targetHours,
          loggedHours: proj.loggedHours,
          members: [{ id: userId, name: owner?.name || '', email: owner?.email || '', role: 'OWNER' }],
          tasks: tasks.map(t => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            category: t.category,
            dueDate: t.dueDate,
            durationMinutes: t.durationMinutes,
            createdAt: t.createdAt
          }))
        };
      }
    }

    return null;
  }

  public deleteProjectAdmin(projectId: string): boolean {
    // 1. Team project deletion
    const teamProjIdx = this.data.teamProjects.findIndex(p => p.id === projectId);
    if (teamProjIdx !== -1) {
      this.data.teamProjects.splice(teamProjIdx, 1);
      this.data.teamTasks = this.data.teamTasks.filter(t => t.projectId !== projectId);
      this.data.teamInvitations = this.data.teamInvitations.filter(i => i.projectId !== projectId);
      this.save(this.data);
      return true;
    }

    // 2. Personal project deletion
    for (const [userId, partition] of Object.entries(this.data.partitions)) {
      const idx = (partition.projects || []).findIndex(p => p.id === projectId);
      if (idx !== -1) {
        partition.projects.splice(idx, 1);
        partition.tasks = partition.tasks.map(t => t.projectId === projectId ? { ...t, projectId: undefined } : t);
        partition.timeLogs = partition.timeLogs.map(l => l.projectId === projectId ? { ...l, projectId: undefined } : l);
        this.save(this.data);
        return true;
      }
    }

    return false;
  }

  public archiveProjectAdmin(projectId: string, archived: boolean): boolean {
    const newStatus = archived ? 'archived' : 'in_progress';

    // Personal project
    for (const [_, partition] of Object.entries(this.data.partitions)) {
      const proj = (partition.projects || []).find(p => p.id === projectId);
      if (proj) {
        proj.status = newStatus as any;
        this.save(this.data);
        return true;
      }
    }

    return false;
  }

  // --- TEAM MANAGEMENT (SUPER ADMIN) ---
  public getAllTeamsAdmin(options?: {
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    let teams = this.data.workspaces.filter(ws => !ws.isPersonal).map(ws => {
      const owner = this.getUserById(ws.ownerId);
      const projects = this.data.teamProjects.filter(p => p.workspaceId === ws.id);
      return {
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        ownerId: ws.ownerId,
        ownerName: owner?.name || 'Unknown',
        ownerEmail: owner?.email || '',
        membersCount: Array.isArray(ws.members) ? ws.members.length : 1,
        projectsCount: projects.length,
        createdAt: ws.createdAt,
        status: 'active'
      };
    });

    if (options?.search) {
      const q = options.search.trim().toLowerCase();
      teams = teams.filter(t => 
        t.name.toLowerCase().includes(q) || 
        t.slug.toLowerCase().includes(q) || 
        t.id.toLowerCase().includes(q) || 
        t.ownerEmail.toLowerCase().includes(q)
      );
    }

    teams.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = teams.length;
    const limit = Math.min(Math.max(options?.limit || 25, 1), 200);
    const offset = Math.max(options?.offset || 0, 0);
    const paged = teams.slice(offset, offset + limit);

    return { teams: paged, total };
  }

  public getTeamDetailsAdmin(teamId: string) {
    const ws = this.data.workspaces.find(w => w.id === teamId && !w.isPersonal);
    if (!ws) return null;

    const owner = this.getUserById(ws.ownerId);
    const projects = this.data.teamProjects.filter(p => p.workspaceId === teamId);
    const members = (ws.members || []).map(m => {
      const u = this.getUserById(m.userId);
      return {
        userId: m.userId,
        name: u?.name || 'Unknown',
        email: u?.email || '',
        avatarColor: u?.avatarColor || 'from-indigo-600 to-violet-600',
        role: m.role,
        joinedAt: m.joinedAt
      };
    });

    return {
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      ownerId: ws.ownerId,
      ownerName: owner?.name || '',
      ownerEmail: owner?.email || '',
      createdAt: ws.createdAt,
      members,
      projects: projects.map(p => ({
        id: p.id,
        name: p.name,
        key: p.key,
        color: p.color,
        tasksCount: this.data.teamTasks.filter(t => t.projectId === p.id).length,
        createdAt: p.createdAt
      }))
    };
  }

  public deleteTeamAdmin(teamId: string): boolean {
    const idx = this.data.workspaces.findIndex(w => w.id === teamId && !w.isPersonal);
    if (idx === -1) return false;

    this.data.workspaces.splice(idx, 1);
    // Delete team projects inside this workspace
    const projectIds = this.data.teamProjects.filter(p => p.workspaceId === teamId).map(p => p.id);
    this.data.teamProjects = this.data.teamProjects.filter(p => p.workspaceId !== teamId);
    this.data.teamTasks = this.data.teamTasks.filter(t => !projectIds.includes(t.projectId));
    this.data.teamInvitations = this.data.teamInvitations.filter(i => !projectIds.includes(i.projectId));

    this.save(this.data);
    return true;
  }

  // --- GLOBAL TASKS (SUPER ADMIN) ---
  public getAllTasksAdmin(options?: {
    search?: string;
    status?: string;
    priority?: string;
    type?: 'all' | 'personal' | 'team';
    limit?: number;
    offset?: number;
  }) {
    interface AdminTaskItem {
      id: string;
      title: string;
      type: 'personal' | 'team';
      ownerEmail: string;
      projectName?: string;
      category: string;
      priority: string;
      status: string;
      dueDate?: string;
      createdAt: string;
    }

    const tasks: AdminTaskItem[] = [];

    // Personal tasks
    for (const u of this.data.users) {
      const partition = this.data.partitions[u.id];
      if (partition && Array.isArray(partition.tasks)) {
        for (const t of partition.tasks) {
          const project = t.projectId ? partition.projects?.find(p => p.id === t.projectId) : undefined;
          tasks.push({
            id: t.id,
            title: t.title,
            type: 'personal',
            ownerEmail: u.email,
            projectName: project?.name,
            category: t.category,
            priority: t.priority,
            status: t.status,
            dueDate: t.dueDate,
            createdAt: t.createdAt
          });
        }
      }
    }

    // Team tasks
    for (const tt of this.data.teamTasks) {
      const proj = this.data.teamProjects.find(p => p.id === tt.projectId);
      tasks.push({
        id: tt.id,
        title: tt.title,
        type: 'team',
        ownerEmail: proj?.ownerEmail || 'Team',
        projectName: proj?.name,
        category: 'Work/Career',
        priority: tt.priority,
        status: tt.columnId,
        dueDate: tt.dueDate,
        createdAt: tt.createdAt
      });
    }

    let filtered = tasks;

    if (options?.type && options.type !== 'all') {
      filtered = filtered.filter(t => t.type === options.type);
    }

    if (options?.status && options.status !== 'all') {
      const st = options.status.toLowerCase();
      filtered = filtered.filter(t => t.status.toLowerCase() === st);
    }

    if (options?.priority && options.priority !== 'all') {
      const pr = options.priority.toLowerCase();
      filtered = filtered.filter(t => t.priority.toLowerCase() === pr);
    }

    if (options?.search) {
      const q = options.search.trim().toLowerCase();
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(q) || 
        t.ownerEmail.toLowerCase().includes(q) ||
        (t.projectName && t.projectName.toLowerCase().includes(q))
      );
    }

    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = filtered.length;
    const limit = Math.min(Math.max(options?.limit || 25, 1), 200);
    const offset = Math.max(options?.offset || 0, 0);
    const paged = filtered.slice(offset, offset + limit);

    return { tasks: paged, total };
  }

  // --- STATISTICAL OVERVIEW & AGGREGATIONS ---
  public getAdminOverviewStats() {
    const now = new Date();
    const nowMs = now.getTime();
    const oneDayAgo = nowMs - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = nowMs - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = nowMs - 30 * 24 * 60 * 60 * 1000;
    const sixtyDaysAgo = nowMs - 60 * 24 * 60 * 60 * 1000;
    const oneYearAgo = nowMs - 365 * 24 * 60 * 60 * 1000;

    const users = this.data.users;
    const totalUsers = users.length;

    let newToday = 0;
    let newThisWeek = 0;
    let newThisMonth = 0;
    let newThisYear = 0;
    let previousMonthCount = 0;
    let activeUsers = 0;
    let suspendedUsers = 0;

    for (const u of users) {
      const joinedMs = new Date(u.joinedAt).getTime();
      if (joinedMs >= oneDayAgo) newToday++;
      if (joinedMs >= sevenDaysAgo) newThisWeek++;
      if (joinedMs >= thirtyDaysAgo) newThisMonth++;
      if (joinedMs < thirtyDaysAgo && joinedMs >= sixtyDaysAgo) previousMonthCount++;
      if (joinedMs >= oneYearAgo) newThisYear++;

      if (u.status === 'suspended') {
        suspendedUsers++;
      } else {
        // Consider active if user joined within last 30d, or has lastLoginAt within 30d, or has recent activity in activityHistory
        const partition = this.data.partitions[u.id];
        const lastLoginMs = u.lastLoginAt ? new Date(u.lastLoginAt).getTime() : 0;
        const hasRecentActivity = partition && Object.keys(partition.stats?.activityHistory || {}).some(d => {
          const dMs = new Date(d).getTime();
          return nowMs - dMs <= 30 * 86400000;
        });

        if (lastLoginMs >= thirtyDaysAgo || joinedMs >= thirtyDaysAgo || hasRecentActivity) {
          activeUsers++;
        }
      }
    }

    const inactiveUsers = Math.max(0, totalUsers - activeUsers - suspendedUsers);
    const growthRatePct = previousMonthCount > 0 
      ? Math.round(((newThisMonth - previousMonthCount) / previousMonthCount) * 100)
      : (newThisMonth > 0 ? 100 : 0);

    // Projects stats
    let personalProjectsCount = 0;
    let personalProjectsActive = 0;
    let personalProjectsArchived = 0;
    let projectsCreatedToday = 0;
    let projectsCreatedThisWeek = 0;
    let projectsCreatedThisMonth = 0;

    for (const [_, partition] of Object.entries(this.data.partitions)) {
      for (const p of partition.projects || []) {
        personalProjectsCount++;
        if (p.status === 'archived') personalProjectsArchived++;
        else personalProjectsActive++;

        const pCreatedMs = new Date(p.createdAt).getTime();
        if (pCreatedMs >= oneDayAgo) projectsCreatedToday++;
        if (pCreatedMs >= sevenDaysAgo) projectsCreatedThisWeek++;
        if (pCreatedMs >= thirtyDaysAgo) projectsCreatedThisMonth++;
      }
    }

    const teamProjects = this.data.teamProjects;
    const teamProjectsCount = teamProjects.length;

    for (const tp of teamProjects) {
      const tpCreatedMs = new Date(tp.createdAt).getTime();
      if (tpCreatedMs >= oneDayAgo) projectsCreatedToday++;
      if (tpCreatedMs >= sevenDaysAgo) projectsCreatedThisWeek++;
      if (tpCreatedMs >= thirtyDaysAgo) projectsCreatedThisMonth++;
    }

    const totalProjects = personalProjectsCount + teamProjectsCount;
    const activeProjects = personalProjectsActive + teamProjectsCount;
    const archivedProjects = personalProjectsArchived;

    // Tasks stats
    let totalTasks = 0;
    let completedTasks = 0;

    for (const [_, partition] of Object.entries(this.data.partitions)) {
      for (const t of partition.tasks || []) {
        totalTasks++;
        if (t.status === 'completed') completedTasks++;
      }
    }

    for (const tt of this.data.teamTasks) {
      totalTasks++;
      if (tt.columnId === 'done' || tt.columnId === 'completed') completedTasks++;
    }

    const pendingTasks = totalTasks - completedTasks;
    const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Teams stats
    const teamWorkspaces = this.data.workspaces.filter(w => !w.isPersonal);
    const totalTeams = teamWorkspaces.length;
    let totalTeamMemberships = 0;
    for (const tw of teamWorkspaces) {
      totalTeamMemberships += Array.isArray(tw.members) ? tw.members.length : 1;
    }
    const averageMembersPerTeam = totalTeams > 0 ? Number((totalTeamMemberships / totalTeams).toFixed(1)) : 0;

    // Recent activity feeds
    const recentRegistrations = [...users]
      .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime())
      .slice(0, 6)
      .map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status || 'active',
        joinedAt: u.joinedAt
      }));

    const recentProjects = this.getAllProjectsAdmin({ limit: 6 }).projects;
    const recentTeams = this.getAllTeamsAdmin({ limit: 6 }).teams;
    const recentAuditLogs = (this.data.auditLogs || []).slice(0, 6);

    return {
      users: {
        total: totalUsers,
        newToday,
        newThisWeek,
        newThisMonth,
        newThisYear,
        active: activeUsers,
        inactive: inactiveUsers,
        suspended: suspendedUsers,
        growthPercentage: growthRatePct
      },
      projects: {
        total: totalProjects,
        personal: personalProjectsCount,
        team: teamProjectsCount,
        createdToday: projectsCreatedToday,
        createdThisWeek: projectsCreatedThisWeek,
        createdThisMonth: projectsCreatedThisMonth,
        active: activeProjects,
        archived: archivedProjects,
        totalTasks,
        completedTasks,
        pendingTasks,
        completionRate: taskCompletionRate
      },
      teams: {
        total: totalTeams,
        totalMemberships: totalTeamMemberships,
        averageMembersPerTeam,
        activeProjects: teamProjectsCount
      },
      activity: {
        recentRegistrations,
        recentProjects,
        recentTeams,
        recentAuditLogs
      }
    };
  }

  // --- ADVANCED ANALYTICS (CHARTS & HISTORICAL TRENDS) ---
  public getAdminAnalytics(timeframe: '7d' | '30d' | '90d' | '1y' | 'all' = '30d') {
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : timeframe === '1y' ? 365 : 730;
    const now = new Date();

    // 1. Daily registration buckets
    const registrationTrend: Array<{ date: string; count: number; cumulative: number }> = [];
    let runningCumulative = 0;

    // Build timeline buckets
    const dateMap = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000).toISOString().split('T')[0];
      dateMap.set(d, 0);
    }

    for (const u of this.data.users) {
      const joinedDate = u.joinedAt.split('T')[0];
      if (dateMap.has(joinedDate)) {
        dateMap.set(joinedDate, (dateMap.get(joinedDate) || 0) + 1);
      }
    }

    // Calculate cumulative
    for (const [date, count] of dateMap.entries()) {
      runningCumulative += count;
      registrationTrend.push({ date, count, cumulative: runningCumulative });
    }

    // 2. Project creation trend (Personal vs Team)
    const projectCreationTrend: Array<{ date: string; personal: number; team: number; total: number }> = [];
    const pDateMap = new Map<string, { personal: number; team: number }>();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000).toISOString().split('T')[0];
      pDateMap.set(d, { personal: 0, team: 0 });
    }

    // Personal
    for (const [_, partition] of Object.entries(this.data.partitions)) {
      for (const p of partition.projects || []) {
        const d = (p.createdAt || '').split('T')[0];
        if (pDateMap.has(d)) {
          pDateMap.get(d)!.personal += 1;
        }
      }
    }

    // Team
    for (const tp of this.data.teamProjects) {
      const d = (tp.createdAt || '').split('T')[0];
      if (pDateMap.has(d)) {
        pDateMap.get(d)!.team += 1;
      }
    }

    for (const [date, counts] of pDateMap.entries()) {
      projectCreationTrend.push({
        date,
        personal: counts.personal,
        team: counts.team,
        total: counts.personal + counts.team
      });
    }

    // 3. Task status breakdown
    let completedCount = 0;
    let inProgressCount = 0;
    let todoCount = 0;
    const categoryDistribution: Record<string, number> = {
      'Work/Career': 0,
      'Academic/Study': 0,
      'Personal Growth': 0,
      'Health & Habits': 0
    };

    for (const [_, partition] of Object.entries(this.data.partitions)) {
      for (const t of partition.tasks || []) {
        if (t.status === 'completed') completedCount++;
        else if (t.status === 'in_progress') inProgressCount++;
        else todoCount++;

        if (categoryDistribution[t.category] !== undefined) {
          categoryDistribution[t.category]++;
        } else {
          categoryDistribution['Work/Career']++;
        }
      }
    }

    for (const tt of this.data.teamTasks) {
      if (tt.columnId === 'done' || tt.columnId === 'completed') completedCount++;
      else if (tt.columnId === 'in_progress' || tt.columnId === 'review') inProgressCount++;
      else todoCount++;
      categoryDistribution['Work/Career']++;
    }

    const totalTasks = completedCount + inProgressCount + todoCount;

    // 4. Team creation velocity
    const teamTrend: Array<{ date: string; count: number }> = [];
    const teamDateMap = new Map<string, number>();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000).toISOString().split('T')[0];
      teamDateMap.set(d, 0);
    }

    for (const ws of this.data.workspaces) {
      if (!ws.isPersonal) {
        const d = (ws.createdAt || '').split('T')[0];
        if (teamDateMap.has(d)) {
          teamDateMap.set(d, (teamDateMap.get(d) || 0) + 1);
        }
      }
    }

    for (const [date, count] of teamDateMap.entries()) {
      teamTrend.push({ date, count });
    }

    // Active vs Inactive
    const overview = this.getAdminOverviewStats();

    return {
      timeframe,
      registrationTrend,
      projectCreationTrend,
      teamTrend,
      taskStatusBreakdown: {
        total: totalTasks,
        completed: completedCount,
        inProgress: inProgressCount,
        todo: todoCount,
        completionRate: totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0
      },
      categoryDistribution,
      userDistribution: {
        active: overview.users.active,
        inactive: overview.users.inactive,
        suspended: overview.users.suspended,
        total: overview.users.total
      }
    };
  }

  // --- SYSTEM HEALTH & DIAGNOSTICS ---
  public getSystemDiagnostics() {
    const memory = process.memoryUsage();
    const overview = this.getAdminOverviewStats();

    return {
      status: 'operational',
      environment: process.env.NODE_ENV || 'development',
      serverless: this.isServerless,
      persistence: this.getHealthInfo(),
      uptimeSeconds: Math.floor(process.uptime()),
      systemTime: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        rssMb: Math.round(memory.rss / (1024 * 1024)),
        heapTotalMb: Math.round(memory.heapTotal / (1024 * 1024)),
        heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
        externalMb: Math.round(memory.external / (1024 * 1024))
      },
      records: {
        users: overview.users.total,
        workspaces: this.data.workspaces.length,
        projects: overview.projects.total,
        tasks: overview.projects.totalTasks,
        auditLogs: (this.data.auditLogs || []).length,
        teamTasks: this.data.teamTasks.length
      }
    };
  }
}

export const db = new Database();
