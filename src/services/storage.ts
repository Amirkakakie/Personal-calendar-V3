import type { 
  Task, 
  GoalOKR, 
  CalendarEvent, 
  ProductivityStats, 
  Project,
  SkillNode,
  RPGAchievementBadge,
  TimeLog,
  DailyActivity
} from '../types/index.ts';

const KEYS = {
  TASKS: 'chronos_tasks_v2',
  GOALS: 'chronos_goals_v2',
  PROJECTS: 'chronos_projects_v2',
  SKILLS: 'chronos_skills_v2',
  BADGES: 'chronos_badges_v2',
  TIMELOGS: 'chronos_timelogs_v2',
  EVENTS: 'chronos_events_v2',
  STATS: 'chronos_stats_v2',
};

// Safe LocalStorage Wrapper with error suppression
function getStorageItem<T>(key: string, defaultValue: T): T {
  try {
    if (typeof window === 'undefined') return defaultValue;
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[Chronos Storage] Failed to read ${key} from localStorage:`, err);
    return defaultValue;
  }
}

function setStorageItem<T>(key: string, value: T): boolean {
  try {
    if (typeof window === 'undefined') return false;
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn(`[Chronos Storage] Failed to write ${key} to localStorage:`, err);
    return false;
  }
}

// Built-in Seed Data for offline resilience
export function getInitialSeedData() {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const activityHistory: Record<string, number> = {};
  for (let i = 60; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
    activityHistory[d] = Math.max(0, Math.floor(Math.sin(i * 0.4) * 2 + 2));
  }
  activityHistory[today] = 4;
  activityHistory[yesterday] = 5;

  const initialTasks: Task[] = [
    {
      id: 'task-seed-1',
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
      subtasks: [
        { id: 'st-1', title: 'Audit gRPC protobuf schemas', completed: true, estimatedMinutes: 30 },
        { id: 'st-2', title: 'Stress test connection pool saturation', completed: false, estimatedMinutes: 30 },
        { id: 'st-3', title: 'Document failover topology', completed: false, estimatedMinutes: 30 }
      ],
      tags: ['Architecture', 'Review', 'Backend'],
      syncedToGoogle: true,
      googleCalendarEventId: 'gcal-evt-101',
      pomodoroSessions: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'task-seed-2',
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
      subtasks: [
        { id: 'st-4', title: 'Implement InstallSnapshot RPC struct', completed: false, estimatedMinutes: 30 },
        { id: 'st-5', title: 'Handle stale term rejection edge cases', completed: false, estimatedMinutes: 30 }
      ],
      tags: ['Raft', 'Study', 'CS'],
      syncedToGoogle: false,
      pomodoroSessions: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'task-seed-3',
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
      pomodoroSessions: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'task-seed-4',
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
      pomodoroSessions: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const initialProjects: Project[] = [
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

  const initialGoals: GoalOKR[] = [
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

  const initialSkills: SkillNode[] = [
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

  const initialBadges: RPGAchievementBadge[] = [
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

  const initialEvents: CalendarEvent[] = [
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
      taskId: 'task-seed-1'
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
      taskId: 'task-seed-2'
    }
  ];

  const initialTimeLogs: TimeLog[] = [
    {
      id: 'tl-1',
      taskId: 'task-seed-1',
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
    }
  ];

  const initialStats: ProductivityStats = {
    completedCount: 1,
    totalTasks: 4,
    completionRate: 25,
    currentStreakDays: 3,
    bestStreakDays: 14,
    focusMinutesToday: 195,
    syncedToGoogleCount: 2,
    focusScore: 92,
    totalXp: 4250,
    userLevel: 4,
    rpgTitle: 'Principal Systems Architect',
    totalRoiGenerated: 1480.0,
    billableHoursTotal: 34.5,
    weeklyVelocity: [3, 4, 2, 5, 4, 3, 4],
    weeklyActivity: [],
    categoryDistribution: {
      'Work/Career': 1,
      'Academic/Study': 1,
      'Personal Growth': 1,
      'Health & Habits': 1
    } as any,
    categoryBreakdown: {
      'Work/Career': 1,
      'Academic/Study': 1,
      'Personal Growth': 1,
      'Health & Habits': 1
    } as any,
    habitActivityDays: activityHistory
  };

  return {
    tasks: initialTasks,
    projects: initialProjects,
    goals: initialGoals,
    skills: initialSkills,
    badges: initialBadges,
    calendarEvents: initialEvents,
    timeLogs: initialTimeLogs,
    stats: initialStats
  };
}

// Storage Operations
export const LocalStore = {
  getTasks(): Task[] {
    const cached = getStorageItem<Task[] | null>(KEYS.TASKS, null);
    if (cached && Array.isArray(cached) && cached.length > 0) return cached;
    const seed = getInitialSeedData().tasks;
    setStorageItem(KEYS.TASKS, seed);
    return seed;
  },
  setTasks(tasks: Task[]): void {
    setStorageItem(KEYS.TASKS, tasks);
  },

  getGoals(): GoalOKR[] {
    const cached = getStorageItem<GoalOKR[] | null>(KEYS.GOALS, null);
    if (cached && Array.isArray(cached) && cached.length > 0) return cached;
    const seed = getInitialSeedData().goals;
    setStorageItem(KEYS.GOALS, seed);
    return seed;
  },
  setGoals(goals: GoalOKR[]): void {
    setStorageItem(KEYS.GOALS, goals);
  },

  getProjects(): Project[] {
    const cached = getStorageItem<Project[] | null>(KEYS.PROJECTS, null);
    if (cached && Array.isArray(cached) && cached.length > 0) return cached;
    const seed = getInitialSeedData().projects;
    setStorageItem(KEYS.PROJECTS, seed);
    return seed;
  },
  setProjects(projects: Project[]): void {
    setStorageItem(KEYS.PROJECTS, projects);
  },

  getSkills(): SkillNode[] {
    const cached = getStorageItem<SkillNode[] | null>(KEYS.SKILLS, null);
    if (cached && Array.isArray(cached) && cached.length > 0) return cached;
    const seed = getInitialSeedData().skills;
    setStorageItem(KEYS.SKILLS, seed);
    return seed;
  },
  setSkills(skills: SkillNode[]): void {
    setStorageItem(KEYS.SKILLS, skills);
  },

  getBadges(): RPGAchievementBadge[] {
    const cached = getStorageItem<RPGAchievementBadge[] | null>(KEYS.BADGES, null);
    if (cached && Array.isArray(cached) && cached.length > 0) return cached;
    const seed = getInitialSeedData().badges;
    setStorageItem(KEYS.BADGES, seed);
    return seed;
  },
  setBadges(badges: RPGAchievementBadge[]): void {
    setStorageItem(KEYS.BADGES, badges);
  },

  getEvents(): CalendarEvent[] {
    const cached = getStorageItem<CalendarEvent[] | null>(KEYS.EVENTS, null);
    if (cached && Array.isArray(cached) && cached.length > 0) return cached;
    const seed = getInitialSeedData().calendarEvents;
    setStorageItem(KEYS.EVENTS, seed);
    return seed;
  },
  setEvents(events: CalendarEvent[]): void {
    setStorageItem(KEYS.EVENTS, events);
  },

  getTimeLogs(): TimeLog[] {
    const cached = getStorageItem<TimeLog[] | null>(KEYS.TIMELOGS, null);
    if (cached && Array.isArray(cached) && cached.length > 0) return cached;
    const seed = getInitialSeedData().timeLogs;
    setStorageItem(KEYS.TIMELOGS, seed);
    return seed;
  },
  setTimeLogs(logs: TimeLog[]): void {
    setStorageItem(KEYS.TIMELOGS, logs);
  },

  getStats(): ProductivityStats {
    const cached = getStorageItem<ProductivityStats | null>(KEYS.STATS, null);
    if (cached && cached.totalTasks != null) return cached;
    const seed = getInitialSeedData().stats;
    setStorageItem(KEYS.STATS, seed);
    return seed;
  },
  setStats(stats: ProductivityStats): void {
    setStorageItem(KEYS.STATS, stats);
  },

  /**
   * Recalculates stats optimistically from in-memory state
   */
  deriveStats(tasks: Task[], timeLogs: TimeLog[], currentStats: ProductivityStats | null): ProductivityStats {
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

    const totalHours = timeLogs.reduce((acc, l) => acc + (l.durationSeconds || 0) / 3600, 0);
    const totalRoi = timeLogs.reduce((acc, l) => acc + (l.calculatedRoi || 0), 0);
    const totalXp = currentStats?.totalXp || 4250;
    const userLevel = Math.floor(Math.sqrt(totalXp / 100)) + 1;

    let rpgTitle = 'Ascendant Operator';
    if (userLevel >= 10) rpgTitle = 'Grand Sovereign of Execution';
    else if (userLevel >= 7) rpgTitle = 'Principal Systems Architect';
    else if (userLevel >= 4) rpgTitle = 'Senior Focus Strategist';

    const syncedToGoogleCount = tasks.filter(t => t.syncedToGoogle).length;

    const baseActivity = currentStats?.habitActivityDays || {};
    const today = new Date().toISOString().split('T')[0];
    const updatedActivity = {
      ...baseActivity,
      [today]: completed.length
    };

    return {
      completedCount: completed.length,
      totalTasks: total,
      completionRate: rate,
      currentStreakDays: currentStats?.currentStreakDays || 3,
      bestStreakDays: currentStats?.bestStreakDays || 14,
      focusMinutesToday: currentStats?.focusMinutesToday || 195,
      syncedToGoogleCount,
      focusScore: Math.min(100, Math.max(50, 70 + rate / 3)),
      totalXp,
      userLevel,
      rpgTitle,
      totalRoiGenerated: Math.round(totalRoi) || currentStats?.totalRoiGenerated || 1480,
      billableHoursTotal: Number(totalHours.toFixed(1)) || currentStats?.billableHoursTotal || 34.5,
      weeklyVelocity: currentStats?.weeklyVelocity || [3, 4, 2, 5, 4, 3, completed.length],
      weeklyActivity: currentStats?.weeklyActivity || [],
      categoryDistribution: categoryDistribution as any,
      categoryBreakdown: categoryDistribution as any,
      habitActivityDays: updatedActivity
    };
  },

  // Export full system snapshot as JSON
  exportBackupJSON(): string {
    const backup: Record<string, any> = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      tasks: this.getTasks(),
      goals: this.getGoals(),
      projects: this.getProjects(),
      skills: this.getSkills(),
      badges: this.getBadges(),
      timeLogs: this.getTimeLogs(),
      events: this.getEvents(),
      stats: this.getStats()
    };
    return JSON.stringify(backup, null, 2);
  },

  // Import full system snapshot from JSON
  importBackupJSON(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      if (Array.isArray(data.tasks)) this.setTasks(data.tasks);
      if (Array.isArray(data.goals)) this.setGoals(data.goals);
      if (Array.isArray(data.projects)) this.setProjects(data.projects);
      if (Array.isArray(data.skills)) this.setSkills(data.skills);
      if (Array.isArray(data.badges)) this.setBadges(data.badges);
      if (Array.isArray(data.timeLogs)) this.setTimeLogs(data.timeLogs);
      if (Array.isArray(data.events)) this.setEvents(data.events);
      if (data.stats && typeof data.stats === 'object') this.setStats(data.stats);
      return true;
    } catch (err) {
      console.error('[Chronos Storage] Failed to import backup:', err);
      return false;
    }
  }
};

