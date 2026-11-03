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

  // Local development or container with write access
  try {
    if (!fs.existsSync(DEFAULT_DATA_DIR)) {
      fs.mkdirSync(DEFAULT_DATA_DIR, { recursive: true });
    }
    const testFile = path.join(DEFAULT_DATA_DIR, `.write_check_${Date.now()}`);
    fs.writeFileSync(testFile, '1');
    fs.unlinkSync(testFile);
    return { targetFile: DEFAULT_DB_FILE, isServerless: false };
  } catch (_e) {
    // Read-only filesystem detected, fallback to /tmp
    const tmpDir = process.env.TMPDIR || '/tmp';
    return { targetFile: path.join(tmpDir, 'chronos-db.json'), isServerless: true };
  }
}

export interface DatabaseSchema {
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
    activityHistory: Record<string, number>; // "YYYY-MM-DD" -> count
  };
  googleAuth: {
    isConnected: boolean;
    email: string;
  };
}

const INITIAL_SKILLS: SkillNode[] = [
  {
    id: 'skill-dist-sys',
    name: 'Distributed Systems & Architecture',
    category: 'Systems & Backend',
    level: 3,
    currentXp: 1650,
    requiredXp: 2500,
    masteryPct: 66,
    icon: 'Network',
    description: 'Raft consensus, CAP theorem, Byzantine fault tolerance, event-driven streaming.',
    unlocked: true,
    perks: ['+15% XP on Architecture reviews', 'Microservice blueprints unlocked']
  },
  {
    id: 'skill-ai-eng',
    name: 'AI Engineering & LLM Systems',
    category: 'AI & Machine Learning',
    level: 2,
    currentXp: 980,
    requiredXp: 1500,
    masteryPct: 65,
    icon: 'Cpu',
    description: 'Retrieval Augmented Generation (RAG), Gemini Function Calling, LangGraph agents.',
    unlocked: true,
    perks: ['+20% Prompt speed boost', 'Autonomous agent tooling']
  },
  {
    id: 'skill-sec',
    name: 'Application Security & Cryptography',
    category: 'Systems & Backend',
    level: 2,
    currentXp: 600,
    requiredXp: 1200,
    masteryPct: 50,
    icon: 'ShieldCheck',
    description: 'Zero-trust architectures, OAuth2 PKCE, JWT token rotation, cryptographic hashing.',
    unlocked: true,
    perks: ['Security audit checklist generator']
  },
  {
    id: 'skill-biohacking',
    name: 'Circadian Optimization & Biohacking',
    category: 'Health & Biology',
    level: 4,
    currentXp: 2800,
    requiredXp: 3500,
    masteryPct: 80,
    icon: 'HeartPulse',
    description: 'Zone 2 cardio base, cold exposure, sleep latency minimization, deep work pacing.',
    unlocked: true,
    perks: ['Peak cognitive morning window extended by 45m']
  },
  {
    id: 'skill-exec',
    name: 'Strategic Execution & OKR Dynamics',
    category: 'Strategic Management',
    level: 3,
    currentXp: 1950,
    requiredXp: 2400,
    masteryPct: 81,
    icon: 'Compass',
    description: 'High-leverage time management, Eisenhower triage, team velocity acceleration.',
    unlocked: true,
    perks: ['Burnout detection accuracy +30%']
  }
];

const INITIAL_BADGES: RPGAchievementBadge[] = [
  {
    id: 'badge-deep-work-titan',
    name: 'Deep Work Titan',
    description: 'Logged over 10 hours of uninterrupted High Focus cognitive work.',
    icon: 'Flame',
    category: 'Focus',
    xpBonus: 250,
    unlocked: true,
    unlockedAt: '2026-10-25T14:30:00Z'
  },
  {
    id: 'badge-calendar-master',
    name: 'Temporal Architect',
    description: 'Maintained 0 calendar schedule conflicts across 3 active calendars.',
    icon: 'CalendarCheck',
    category: 'Organization',
    xpBonus: 200,
    unlocked: true,
    unlockedAt: '2026-10-28T09:00:00Z'
  },
  {
    id: 'badge-okr-crusher',
    name: 'OKR Vanguard',
    description: 'Achieved 100% on a quarterly milestone key result.',
    icon: 'Award',
    category: 'Execution',
    xpBonus: 500,
    unlocked: true,
    unlockedAt: '2026-10-31T18:00:00Z'
  },
  {
    id: 'badge-zero-debt',
    name: 'Zero Backlog Zen',
    description: 'Clear all Q1 Urgent & Important tasks in a single sprint.',
    icon: 'Sparkles',
    category: 'Mastery',
    xpBonus: 350,
    unlocked: false
  }
];

const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    name: 'Enterprise Microservices & Distributed Core',
    description: 'Building event-driven architecture with Kafka, gRPC, and PostgreSQL persistence.',
    category: 'Work/Career',
    status: 'in_progress',
    targetHours: 60,
    loggedHours: 34.5,
    hourlyValuation: 120.0,
    color: 'blue',
    driveFolderUrl: 'https://drive.google.com/drive/u/0/folders',
    tasksCount: 4,
    completedTasksCount: 2,
    createdAt: '2026-10-15T08:00:00Z'
  },
  {
    id: 'proj-2',
    name: 'Advanced Distributed Systems Mastery',
    description: 'Deep dive into Raft consensus, Byzantine Fault Tolerance, and Paxos implementations.',
    category: 'Academic/Study',
    status: 'in_progress',
    targetHours: 40,
    loggedHours: 21.0,
    hourlyValuation: 85.0,
    color: 'emerald',
    driveFolderUrl: 'https://drive.google.com/drive/u/0/folders',
    tasksCount: 5,
    completedTasksCount: 3,
    createdAt: '2026-10-18T10:00:00Z'
  },
  {
    id: 'proj-3',
    name: 'Sub-3:30 Marathon & VO2 Max Protocol',
    description: 'Structured aerobic threshold training, zone 2 pacing, and biometric recovery tracking.',
    category: 'Health & Habits',
    status: 'in_progress',
    targetHours: 30,
    loggedHours: 18.0,
    hourlyValuation: 60.0,
    color: 'amber',
    tasksCount: 3,
    completedTasksCount: 2,
    createdAt: '2026-10-20T07:00:00Z'
  }
];

function getInitialSeedData(): DatabaseSchema {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const activityHistory: Record<string, number> = {};
  for (let i = 111; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
    const rand = Math.sin(i * 0.4) * 2 + Math.cos(i * 0.2) * 1.5 + 2.5;
    activityHistory[d] = Math.max(0, Math.floor(rand));
  }
  activityHistory[today] = 4;
  activityHistory[yesterday] = 5;

  const tasks: Task[] = [
    {
      id: 'task-1',
      title: 'Review System Architecture & Microservice Boundaries',
      description: 'Analyze data consistency, idempotency keys, and Google Calendar event synchronization.',
      category: 'Work/Career',
      priority: 'High',
      status: 'in_progress',
      eisenhower: 'q1_urgent_important',
      energyLevel: 'High Focus',
      dueDate: today,
      dueTime: '10:00',
      durationMinutes: 90,
      projectId: 'proj-1',
      linkedSkillId: 'skill-dist-sys',
      calendarOverlay: 'work',
      xpReward: 80,
      driveDocUrl: 'https://docs.google.com/document/create',
      subtasks: [
        { id: 'st-1', title: 'Audit gRPC protobuf schemas', completed: true, estimatedMinutes: 30 },
        { id: 'st-2', title: 'Stress test connection pool saturation', completed: false, estimatedMinutes: 30 },
        { id: 'st-3', title: 'Document failover topology', completed: false, estimatedMinutes: 30 }
      ],
      tags: ['Architecture', 'Review', 'Backend'],
      syncedToGoogle: true,
      googleCalendarEventId: 'gcal-evt-101',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pomodoroSessions: 2,
      pomodoroCount: 2
    },
    {
      id: 'task-2',
      title: 'Distributed Consensus: Raft Log Compaction Implementation',
      description: 'Implement snapshotting and log compaction algorithm based on section 7 of Ongaro & Ousterhout.',
      category: 'Academic/Study',
      priority: 'High',
      status: 'todo',
      eisenhower: 'q2_not_urgent_important',
      energyLevel: 'High Focus',
      dueDate: today,
      dueTime: '14:30',
      durationMinutes: 60,
      projectId: 'proj-2',
      linkedSkillId: 'skill-dist-sys',
      calendarOverlay: 'study',
      xpReward: 70,
      driveDocUrl: 'https://docs.google.com/document/create',
      subtasks: [
        { id: 'st-4', title: 'Implement InstallSnapshot RPC struct', completed: false, estimatedMinutes: 30 },
        { id: 'st-5', title: 'Handle stale term rejection edge cases', completed: false, estimatedMinutes: 30 }
      ],
      tags: ['Raft', 'Study', 'CS'],
      syncedToGoogle: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pomodoroSessions: 0,
      pomodoroCount: 0
    },
    {
      id: 'task-3',
      title: 'Zone 2 Aerobic Base Intervals (6km at 145 BPM)',
      description: 'Aerobic threshold run followed by 10m mobility stretching.',
      category: 'Health & Habits',
      priority: 'Medium',
      status: 'completed',
      eisenhower: 'q2_not_urgent_important',
      energyLevel: 'Creative',
      dueDate: today,
      dueTime: '07:30',
      durationMinutes: 45,
      projectId: 'proj-3',
      linkedSkillId: 'skill-biohacking',
      calendarOverlay: 'personal',
      xpReward: 40,
      subtasks: [
        { id: 'st-6', title: 'Hydration & pre-workout warm-up', completed: true, estimatedMinutes: 10 },
        { id: 'st-7', title: 'Maintain target heart rate band', completed: true, estimatedMinutes: 35 }
      ],
      tags: ['Cardio', 'Health', 'Zone2'],
      syncedToGoogle: true,
      completedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pomodoroSessions: 1,
      pomodoroCount: 1
    },
    {
      id: 'task-4',
      title: 'Weekly Executive Operating System Retrospective',
      description: 'Review weekly completion velocity, adjust OKR milestone projections, and schedule next week deep work.',
      category: 'Personal Growth',
      priority: 'Medium',
      status: 'todo',
      eisenhower: 'q2_not_urgent_important',
      energyLevel: 'Low Energy/Admin',
      dueDate: today,
      dueTime: '17:00',
      durationMinutes: 45,
      linkedSkillId: 'skill-exec',
      calendarOverlay: 'work',
      xpReward: 50,
      subtasks: [
        { id: 'st-8', title: 'Calculate time ROI and billable yield', completed: false, estimatedMinutes: 20 },
        { id: 'st-9', title: 'Block high focus morning slots in Google Calendar', completed: false, estimatedMinutes: 25 }
      ],
      tags: ['Planning', 'Productivity', 'WeeklyReview'],
      syncedToGoogle: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pomodoroSessions: 0,
      pomodoroCount: 0
    }
  ];

  const goals: GoalOKR[] = [
    {
      id: 'goal-1',
      title: 'Master Distributed Computing & Cloud Infrastructure',
      description: 'Acquire deep competency in consensus algorithms, fault-tolerant replication, and high-throughput systems.',
      category: 'Academic/Study',
      timeframe: 'quarterly',
      targetDate: '2026-12-31',
      progressPercent: 68,
      keyResults: [
        { id: 'kr-1', title: 'Implement Raft Consensus Key-Value Store from scratch', currentValue: 3, targetValue: 4, unit: 'milestones', completed: false },
        { id: 'kr-2', title: 'Complete MIT 6.824 Lab assignments', currentValue: 3, targetValue: 4, unit: 'labs', completed: false },
        { id: 'kr-3', title: 'Publish 2 technical breakdown essays on distributed consensus', currentValue: 2, targetValue: 2, unit: 'articles', completed: true }
      ],
      createdAt: '2026-10-01T00:00:00Z'
    },
    {
      id: 'goal-2',
      title: 'Scale Technical Leadership & High-Yield Career Output',
      description: 'Drive high-leverage architectural impact and mentor engineering teams.',
      category: 'Work/Career',
      timeframe: 'quarterly',
      targetDate: '2026-12-31',
      progressPercent: 60,
      keyResults: [
        { id: 'kr-4', title: 'Deliver 3 production architectural RFCs', currentValue: 2, targetValue: 3, unit: 'RFCs', completed: false },
        { id: 'kr-5', title: 'Maintain >$120/hr average cognitive ROI across project work', currentValue: 125, targetValue: 120, unit: '$/hr', completed: true }
      ],
      createdAt: '2026-10-01T00:00:00Z'
    }
  ];

  const calendarEvents: CalendarEvent[] = [
    {
      id: 'cal-1',
      title: 'Strategic Systems Design & Core Architecture Block',
      description: 'Deep cognitive sprint on microservices synchronization.',
      startTime: `${today}T10:00:00`,
      endTime: `${today}T11:30:00`,
      category: 'Work/Career',
      calendarOverlay: 'work',
      isGoogleEvent: true,
      googleEventId: 'gcal-evt-101',
      taskId: 'task-1'
    },
    {
      id: 'cal-2',
      title: 'Architecture Sync with Lead Staff Engineer',
      description: 'Review service interfaces and event schema evolutions.',
      startTime: `${today}T13:00:00`,
      endTime: `${today}T14:00:00`,
      category: 'Work/Career',
      calendarOverlay: 'work',
      isGoogleEvent: true,
      googleEventId: 'gcal-evt-102'
    },
    {
      id: 'cal-3',
      title: 'Academic Study: Distributed Consensus & Raft Lab',
      description: 'Snapshotting algorithms and term transition logic.',
      startTime: `${today}T14:30:00`,
      endTime: `${today}T15:30:00`,
      category: 'Academic/Study',
      calendarOverlay: 'study',
      isGoogleEvent: false,
      taskId: 'task-2'
    }
  ];

  const timeLogs: TimeLog[] = [
    {
      id: 'tl-1',
      taskId: 'task-1',
      taskTitle: 'Review System Architecture & Microservice Boundaries',
      projectId: 'proj-1',
      projectName: 'Enterprise Microservices & Distributed Core',
      durationSeconds: 5400,
      hourlyRate: 120.0,
      calculatedRoi: 180.0,
      efficiencyRate: 94,
      energyReported: 'High Focus',
      note: 'Deep focus architecture analysis with 0 interruptions.',
      startedAt: `${today}T10:00:00Z`,
      endedAt: `${today}T11:30:00Z`
    },
    {
      id: 'tl-2',
      taskId: 'task-3',
      taskTitle: 'Zone 2 Aerobic Base Intervals (6km at 145 BPM)',
      projectId: 'proj-3',
      projectName: 'Sub-3:30 Marathon & VO2 Max Protocol',
      durationSeconds: 2700,
      hourlyRate: 60.0,
      calculatedRoi: 45.0,
      efficiencyRate: 98,
      energyReported: 'Creative',
      note: 'Sustained heart rate in target zone.',
      startedAt: `${today}T07:30:00Z`,
      endedAt: `${today}T08:15:00Z`
    }
  ];

  return {
    tasks,
    goals,
    projects: INITIAL_PROJECTS,
    calendarEvents,
    timeLogs,
    skills: INITIAL_SKILLS,
    badges: INITIAL_BADGES,
    stats: {
      focusMinutes: 195,
      pomodoroSessions: 7,
      totalXp: 4250,
      userLevel: 4,
      rpgTitle: 'Principal Systems Architect',
      focusScore: 92,
      totalRoiDollars: 1480.0,
      activityHistory
    },
    googleAuth: {
      isConnected: true,
      email: 'amir.work.vr@gmail.com'
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
  }

  private sanitizeParsedData(parsed: any): DatabaseSchema {
    if (!parsed.projects) parsed.projects = INITIAL_PROJECTS;
    if (!parsed.timeLogs) parsed.timeLogs = [];
    if (!parsed.skills) parsed.skills = INITIAL_SKILLS;
    if (!parsed.badges) parsed.badges = INITIAL_BADGES;
    if (!parsed.stats) parsed.stats = {};
    if (parsed.stats.totalXp == null) parsed.stats.totalXp = 4250;
    if (parsed.stats.userLevel == null) parsed.stats.userLevel = 4;
    if (!parsed.stats.rpgTitle) parsed.stats.rpgTitle = 'Principal Systems Architect';
    if (parsed.stats.totalRoiDollars == null) parsed.stats.totalRoiDollars = 1480.0;
    if (parsed.stats.focusScore == null) parsed.stats.focusScore = 92;
    if (!parsed.stats.activityHistory) parsed.stats.activityHistory = {};
    return parsed;
  }

  private load(): DatabaseSchema {
    try {
      // 1. Check if active target file exists (e.g. /tmp/chronos-db.json in serverless)
      if (fs.existsSync(this.dbPath)) {
        const raw = fs.readFileSync(this.dbPath, 'utf-8');
        return this.sanitizeParsedData(JSON.parse(raw));
      }

      // 2. If target file doesn't exist yet, check if default repository seed exists
      if (fs.existsSync(DEFAULT_DB_FILE)) {
        const raw = fs.readFileSync(DEFAULT_DB_FILE, 'utf-8');
        const parsed = this.sanitizeParsedData(JSON.parse(raw));
        this.save(parsed);
        return parsed;
      }
    } catch (err) {
      console.warn('[Database] Could not read existing db.json, generating initial seed data:', err);
    }

    const seed = getInitialSeedData();
    this.save(seed);
    return seed;
  }

  /**
   * Atomic file persistence with resilient in-memory fallback
   */
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

  // --- TASKS ---
  public getTasks(): Task[] {
    return this.data.tasks;
  }

  public getTaskById(id: string): Task | undefined {
    return this.data.tasks.find(t => t.id === id);
  }

  public createTask(task: Task): Task {
    this.data.tasks.unshift(task);
    this.save(this.data);
    return task;
  }

  public updateTask(id: string, updates: Partial<Task>): Task | null {
    const idx = this.data.tasks.findIndex(t => t.id === id);
    if (idx === -1) return null;

    const current = this.data.tasks[idx];
    const isNowCompleted = updates.status === 'completed';
    const wasCompleted = current.status === 'completed';

    const updated: Task = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Idempotent XP awarding: only award when transitioning into completed
    if (isNowCompleted && !wasCompleted) {
      updated.completedAt = new Date().toISOString();
      const today = new Date().toISOString().split('T')[0];
      this.data.stats.activityHistory[today] = (this.data.stats.activityHistory[today] || 0) + 1;

      // Award XP
      const xpEarned = current.xpReward || 50;
      this.awardXp(xpEarned, current.linkedSkillId);
    } else if (!isNowCompleted && wasCompleted) {
      // Un-completing task removes completedAt timestamp
      updated.completedAt = undefined;
    }

    this.data.tasks[idx] = updated;
    this.save(this.data);
    return updated;
  }

  public deleteTask(id: string): boolean {
    const initialLen = this.data.tasks.length;
    this.data.tasks = this.data.tasks.filter(t => t.id !== id);
    // Remove linked calendar events
    this.data.calendarEvents = this.data.calendarEvents.filter(e => e.taskId !== id);
    // Unlink foreign keys in timeLogs to prevent dangling references
    this.data.timeLogs = this.data.timeLogs.map(tl => {
      if (tl.taskId === id) {
        return { ...tl, taskId: undefined };
      }
      return tl;
    });

    this.save(this.data);
    return this.data.tasks.length < initialLen;
  }

  // --- PROJECTS ---
  public getProjects(): Project[] {
    return this.data.projects.map(p => {
      const pTasks = this.data.tasks.filter(t => t.projectId === p.id);
      const completed = pTasks.filter(t => t.status === 'completed').length;
      return {
        ...p,
        tasksCount: pTasks.length,
        completedTasksCount: completed
      };
    });
  }

  public createProject(project: Project): Project {
    this.data.projects.unshift(project);
    this.save(this.data);
    return project;
  }

  public updateProject(id: string, updates: Partial<Project>): Project | null {
    const idx = this.data.projects.findIndex(p => p.id === id);
    if (idx === -1) return null;
    this.data.projects[idx] = { ...this.data.projects[idx], ...updates };
    this.save(this.data);
    return this.data.projects[idx];
  }

  public deleteProject(id: string): boolean {
    const init = this.data.projects.length;
    this.data.projects = this.data.projects.filter(p => p.id !== id);
    // Nullify task projectId references
    this.data.tasks = this.data.tasks.map(t => {
      if (t.projectId === id) {
        return { ...t, projectId: undefined };
      }
      return t;
    });
    // Nullify timeLogs projectId references
    this.data.timeLogs = this.data.timeLogs.map(tl => {
      if (tl.projectId === id) {
        return { ...tl, projectId: undefined };
      }
      return tl;
    });

    this.save(this.data);
    return this.data.projects.length < init;
  }

  // --- TIME TRACKING & ROI ---
  public getTimeLogs(): TimeLog[] {
    return this.data.timeLogs;
  }

  public addTimeLog(log: TimeLog): TimeLog {
    this.data.timeLogs.unshift(log);
    this.data.stats.focusMinutes += Math.round(log.durationSeconds / 60);
    this.data.stats.totalRoiDollars += log.calculatedRoi;

    if (log.projectId) {
      const proj = this.data.projects.find(p => p.id === log.projectId);
      if (proj) {
        proj.loggedHours = Number((proj.loggedHours + log.durationSeconds / 3600).toFixed(1));
      }
    }

    this.save(this.data);
    return log;
  }

  // --- SKILLS & RPG XP ---
  public getSkills(): SkillNode[] {
    return this.data.skills;
  }

  public getBadges(): RPGAchievementBadge[] {
    return this.data.badges;
  }

  public awardXp(amount: number, skillId?: string) {
    if (amount <= 0) return;
    this.data.stats.totalXp += amount;
    // Calculate User Level: Level = Math.floor(Math.sqrt(totalXp / 100)) + 1
    const newLevel = Math.floor(Math.sqrt(this.data.stats.totalXp / 100)) + 1;
    this.data.stats.userLevel = newLevel;

    // Titles progression
    if (newLevel >= 10) this.data.stats.rpgTitle = 'Grand Sovereign of Execution';
    else if (newLevel >= 7) this.data.stats.rpgTitle = 'Principal Systems Architect';
    else if (newLevel >= 4) this.data.stats.rpgTitle = 'Senior Focus Strategist';
    else this.data.stats.rpgTitle = 'Ascendant Operator';

    // Skill specific XP with while loop for multiple level-ups
    if (skillId) {
      const skill = this.data.skills.find(s => s.id === skillId);
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

  // --- GOALS / OKRS ---
  public getGoals(): GoalOKR[] {
    return this.data.goals;
  }

  public createGoal(goal: GoalOKR): GoalOKR {
    this.data.goals.unshift(goal);
    this.save(this.data);
    return goal;
  }

  public updateGoal(id: string, updates: Partial<GoalOKR>): GoalOKR | null {
    const idx = this.data.goals.findIndex(g => g.id === id);
    if (idx === -1) return null;
    this.data.goals[idx] = { ...this.data.goals[idx], ...updates };
    this.save(this.data);
    return this.data.goals[idx];
  }

  public deleteGoal(id: string): boolean {
    const init = this.data.goals.length;
    this.data.goals = this.data.goals.filter(g => g.id !== id);
    // Nullify task goalId references
    this.data.tasks = this.data.tasks.map(t => {
      if (t.goalId === id) {
        return { ...t, goalId: undefined };
      }
      return t;
    });
    this.save(this.data);
    return this.data.goals.length < init;
  }

  // --- CALENDAR EVENTS ---
  public getCalendarEvents(): CalendarEvent[] {
    return this.data.calendarEvents;
  }

  public addCalendarEvent(event: CalendarEvent): CalendarEvent {
    this.data.calendarEvents.push(event);
    this.save(this.data);
    return event;
  }

  public updateCalendarEvent(id: string, updates: Partial<CalendarEvent>): CalendarEvent | null {
    const idx = this.data.calendarEvents.findIndex(e => e.id === id || e.googleEventId === id);
    if (idx === -1) return null;
    this.data.calendarEvents[idx] = { ...this.data.calendarEvents[idx], ...updates };
    this.save(this.data);
    return this.data.calendarEvents[idx];
  }

  public removeCalendarEvent(id: string): boolean {
    const initLen = this.data.calendarEvents.length;
    this.data.calendarEvents = this.data.calendarEvents.filter(e => e.id !== id && e.googleEventId !== id && e.taskId !== id);
    this.save(this.data);
    return this.data.calendarEvents.length < initLen;
  }

  // --- STATS & ANALYTICS ---
  public getProductivityStats(): ProductivityStats {
    const tasks = this.data.tasks;
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
      const count = this.data.stats.activityHistory[checkDate] || 0;
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
      weeklyVelocity.push(this.data.stats.activityHistory[d] || 0);
    }

    const weeklyActivity: DailyActivity[] = [];
    for (let i = 111; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
      const count = this.data.stats.activityHistory[d] || 0;
      weeklyActivity.push({
        date: d,
        completedCount: count,
        totalTasks: Math.max(count, 1)
      });
    }

    const syncedToGoogleCount = tasks.filter(t => t.syncedToGoogle).length;
    const totalHours = this.data.timeLogs.reduce((acc, tl) => acc + tl.durationSeconds / 3600, 0);

    return {
      completedCount: completed.length,
      totalTasks: total,
      completionRate: rate,
      currentStreakDays: Math.max(streak, 1),
      bestStreakDays: Math.max(streak + 4, 14),
      focusMinutesToday: this.data.stats.focusMinutes,
      syncedToGoogleCount,
      focusScore: this.data.stats.focusScore,
      totalXp: this.data.stats.totalXp,
      userLevel: this.data.stats.userLevel,
      rpgTitle: this.data.stats.rpgTitle,
      totalRoiGenerated: Math.round(this.data.stats.totalRoiDollars),
      billableHoursTotal: Number(totalHours.toFixed(1)),
      weeklyVelocity,
      weeklyActivity,
      categoryDistribution: categoryDistribution as any,
      categoryBreakdown: categoryDistribution as any,
      habitActivityDays: this.data.stats.activityHistory
    };
  }

  public recordPomodoro(minutes: number) {
    this.data.stats.focusMinutes += minutes;
    this.data.stats.pomodoroSessions += 1;
    this.awardXp(minutes * 2);
    const today = new Date().toISOString().split('T')[0];
    this.data.stats.activityHistory[today] = (this.data.stats.activityHistory[today] || 0) + 1;
    this.save(this.data);
  }

  public getGoogleAuth() {
    return this.data.googleAuth;
  }

  public setGoogleAuth(auth: Partial<DatabaseSchema['googleAuth']>) {
    this.data.googleAuth = { ...this.data.googleAuth, ...auth };
    this.save(this.data);
  }
}

export const db = new Database();
