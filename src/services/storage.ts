import type { 
  Task, 
  GoalOKR, 
  CalendarEvent, 
  ProductivityStats, 
  Project,
  SkillNode,
  RPGAchievementBadge,
  TimeLog
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

export const getBlankStats = (): ProductivityStats => ({
  completedCount: 0,
  totalTasks: 0,
  completionRate: 0,
  currentStreakDays: 0,
  bestStreakDays: 0,
  focusMinutesToday: 0,
  syncedToGoogleCount: 0,
  focusScore: 100,
  totalXp: 0,
  userLevel: 1,
  rpgTitle: 'Novice Pioneer',
  totalRoiGenerated: 0,
  billableHoursTotal: 0,
  weeklyVelocity: [0, 0, 0, 0, 0, 0, 0],
  weeklyActivity: [],
  categoryDistribution: {
    'Work/Career': 0,
    'Academic/Study': 0,
    'Personal Growth': 0,
    'Health & Habits': 0
  },
  categoryBreakdown: {},
  habitActivityDays: {}
});

// Absolute Purge of Mock Seed Data: Every collection initializes empty for a clean slate
export function getInitialSeedData() {
  return {
    tasks: [] as Task[],
    projects: [] as Project[],
    goals: [] as GoalOKR[],
    skills: [] as SkillNode[],
    badges: [] as RPGAchievementBadge[],
    calendarEvents: [] as CalendarEvent[],
    timeLogs: [] as TimeLog[],
    stats: getBlankStats()
  };
}

function getUserScopedKey(baseKey: string, userId?: string): string {
  if (!userId) return `${baseKey}_guest`;
  return `${baseKey}_${userId}`;
}

// Storage Operations strictly partitioned by userId
export const LocalStore = {
  getTasks(userId?: string): Task[] {
    const key = getUserScopedKey(KEYS.TASKS, userId);
    const cached = getStorageItem<Task[] | null>(key, null);
    if (cached && Array.isArray(cached)) return cached;
    return [];
  },
  setTasks(tasks: Task[], userId?: string): void {
    const key = getUserScopedKey(KEYS.TASKS, userId);
    setStorageItem(key, tasks);
  },

  getGoals(userId?: string): GoalOKR[] {
    const key = getUserScopedKey(KEYS.GOALS, userId);
    const cached = getStorageItem<GoalOKR[] | null>(key, null);
    if (cached && Array.isArray(cached)) return cached;
    return [];
  },
  setGoals(goals: GoalOKR[], userId?: string): void {
    const key = getUserScopedKey(KEYS.GOALS, userId);
    setStorageItem(key, goals);
  },

  getProjects(userId?: string): Project[] {
    const key = getUserScopedKey(KEYS.PROJECTS, userId);
    const cached = getStorageItem<Project[] | null>(key, null);
    if (cached && Array.isArray(cached)) return cached;
    return [];
  },
  setProjects(projects: Project[], userId?: string): void {
    const key = getUserScopedKey(KEYS.PROJECTS, userId);
    setStorageItem(key, projects);
  },

  getSkills(userId?: string): SkillNode[] {
    const key = getUserScopedKey(KEYS.SKILLS, userId);
    const cached = getStorageItem<SkillNode[] | null>(key, null);
    if (cached && Array.isArray(cached)) return cached;
    return [];
  },
  setSkills(skills: SkillNode[], userId?: string): void {
    const key = getUserScopedKey(KEYS.SKILLS, userId);
    setStorageItem(key, skills);
  },

  getBadges(userId?: string): RPGAchievementBadge[] {
    const key = getUserScopedKey(KEYS.BADGES, userId);
    const cached = getStorageItem<RPGAchievementBadge[] | null>(key, null);
    if (cached && Array.isArray(cached)) return cached;
    return [];
  },
  setBadges(badges: RPGAchievementBadge[], userId?: string): void {
    const key = getUserScopedKey(KEYS.BADGES, userId);
    setStorageItem(key, badges);
  },

  getEvents(userId?: string): CalendarEvent[] {
    const key = getUserScopedKey(KEYS.EVENTS, userId);
    const cached = getStorageItem<CalendarEvent[] | null>(key, null);
    if (cached && Array.isArray(cached)) return cached;
    return [];
  },
  setEvents(events: CalendarEvent[], userId?: string): void {
    const key = getUserScopedKey(KEYS.EVENTS, userId);
    setStorageItem(key, events);
  },

  getTimeLogs(userId?: string): TimeLog[] {
    const key = getUserScopedKey(KEYS.TIMELOGS, userId);
    const cached = getStorageItem<TimeLog[] | null>(key, null);
    if (cached && Array.isArray(cached)) return cached;
    return [];
  },
  setTimeLogs(logs: TimeLog[], userId?: string): void {
    const key = getUserScopedKey(KEYS.TIMELOGS, userId);
    setStorageItem(key, logs);
  },

  getStats(userId?: string): ProductivityStats {
    const key = getUserScopedKey(KEYS.STATS, userId);
    const cached = getStorageItem<ProductivityStats | null>(key, null);
    if (cached && cached.totalTasks != null) return cached;
    const blank = getBlankStats();
    setStorageItem(key, blank);
    return blank;
  },
  setStats(stats: ProductivityStats, userId?: string): void {
    const key = getUserScopedKey(KEYS.STATS, userId);
    setStorageItem(key, stats);
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
    const totalXp = currentStats?.totalXp ?? 0;
    const userLevel = Math.max(1, Math.floor(Math.sqrt(totalXp / 100)) + 1);

    let rpgTitle = 'Novice Pioneer';
    if (userLevel >= 10) rpgTitle = 'Grand Sovereign of Execution';
    else if (userLevel >= 7) rpgTitle = 'Principal Systems Architect';
    else if (userLevel >= 4) rpgTitle = 'Senior Focus Strategist';
    else if (userLevel >= 2) rpgTitle = 'Ascendant Operator';

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
      currentStreakDays: currentStats?.currentStreakDays ?? 0,
      bestStreakDays: currentStats?.bestStreakDays ?? 0,
      focusMinutesToday: currentStats?.focusMinutesToday ?? 0,
      syncedToGoogleCount,
      focusScore: total > 0 ? Math.min(100, Math.max(50, 70 + rate / 3)) : 100,
      totalXp,
      userLevel,
      rpgTitle,
      totalRoiGenerated: Math.round(totalRoi) || (currentStats?.totalRoiGenerated ?? 0),
      billableHoursTotal: Number(totalHours.toFixed(1)) || (currentStats?.billableHoursTotal ?? 0),
      weeklyVelocity: currentStats?.weeklyVelocity ?? [0, 0, 0, 0, 0, 0, completed.length],
      weeklyActivity: currentStats?.weeklyActivity || [],
      categoryDistribution: categoryDistribution as any,
      categoryBreakdown: categoryDistribution as any,
      habitActivityDays: updatedActivity
    };
  },

  // Export full system snapshot as JSON
  exportBackupJSON(userId?: string): string {
    const backup: Record<string, any> = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      tasks: this.getTasks(userId),
      goals: this.getGoals(userId),
      projects: this.getProjects(userId),
      skills: this.getSkills(userId),
      badges: this.getBadges(userId),
      timeLogs: this.getTimeLogs(userId),
      events: this.getEvents(userId),
      stats: this.getStats(userId)
    };
    return JSON.stringify(backup, null, 2);
  },

  // Import full system snapshot from JSON
  importBackupJSON(jsonStr: string, userId?: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      if (Array.isArray(data.tasks)) this.setTasks(data.tasks, userId);
      if (Array.isArray(data.goals)) this.setGoals(data.goals, userId);
      if (Array.isArray(data.projects)) this.setProjects(data.projects, userId);
      if (Array.isArray(data.skills)) this.setSkills(data.skills, userId);
      if (Array.isArray(data.badges)) this.setBadges(data.badges, userId);
      if (Array.isArray(data.timeLogs)) this.setTimeLogs(data.timeLogs, userId);
      if (Array.isArray(data.events)) this.setEvents(data.events, userId);
      if (data.stats && typeof data.stats === 'object') this.setStats(data.stats, userId);
      return true;
    } catch (err) {
      console.error('[Chronos Storage] Failed to import backup:', err);
      return false;
    }
  }
};
