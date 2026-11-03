export * from './team.ts';

export type TaskCategory = 'Work/Career' | 'Academic/Study' | 'Personal Growth' | 'Health & Habits';


export type TaskPriority = 'High' | 'Medium' | 'Low';

export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'archived';

export type EisenhowerQuadrant = 
  | 'q1_urgent_important'      // Do First
  | 'q2_not_urgent_important'  // Schedule (Focus & Deep Work)
  | 'q3_urgent_not_important'  // Delegate / Batch
  | 'q4_neither';              // Eliminate / Review

export type BiologicalEnergy = 'High Focus' | 'Creative' | 'Low Energy/Admin';

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  estimatedMinutes?: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  eisenhower: EisenhowerQuadrant;
  energyLevel?: BiologicalEnergy;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  durationMinutes: number; // e.g. 30, 45, 60, 90
  subtasks: SubTask[];
  goalId?: string; // linked to an OKR / Goal
  projectId?: string; // linked to a high-level project
  tags: string[];
  googleCalendarEventId?: string;
  syncedToGoogle: boolean;
  calendarOverlay?: 'work' | 'study' | 'personal';
  recurrence?: 'none' | 'daily' | 'weekly' | 'weekdays' | 'monthly';
  xpReward?: number;
  linkedSkillId?: string;
  driveDocUrl?: string; // Google Docs template or notes link
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  pomodoroSessions?: number;
  pomodoroCount?: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  category: TaskCategory;
  goalId?: string;
  status: TaskStatus;
  targetHours: number;
  loggedHours: number;
  hourlyValuation: number; // e.g. $85/hr or cognitive value
  color: string;
  driveFolderUrl?: string;
  tasksCount?: number;
  completedTasksCount?: number;
  createdAt: string;
}

export interface KeyResult {
  id: string;
  title: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  completed: boolean;
}

export interface GoalOKR {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  timeframe: 'yearly' | 'quarterly' | 'monthly';
  targetDate: string;
  progressPercent: number; // 0 - 100
  keyResults: KeyResult[];
  linkedTasksCount?: number;
  completedTasksCount?: number;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string; // ISO string or YYYY-MM-DDTHH:mm
  endTime: string;   // ISO string or YYYY-MM-DDTHH:mm
  allDay?: boolean;
  category: TaskCategory | string;
  calendarOverlay?: 'work' | 'study' | 'personal';
  isGoogleEvent: boolean;
  googleEventId?: string;
  htmlLink?: string;
  taskId?: string;
  location?: string;
}

export interface TimeLog {
  id: string;
  taskId?: string;
  taskTitle?: string;
  projectId?: string;
  projectName?: string;
  durationSeconds: number;
  hourlyRate: number;
  calculatedRoi: number; // (durationSeconds / 3600) * hourlyRate
  efficiencyRate: number; // % e.g. 92%
  energyReported: string;
  note?: string;
  startedAt: string;
  endedAt: string;
}

export interface SkillNode {
  id: string;
  name: string;
  category: string; // e.g. "Systems & Backend", "AI & ML", "Biohacking & Habits", "Leadership & Exec"
  level: number; // e.g. Level 1 - 10
  currentXp: number;
  requiredXp: number;
  masteryPct: number;
  icon: string;
  description: string;
  unlocked: boolean;
  parentSkillId?: string;
  perks: string[];
}

export interface RPGAchievementBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  xpBonus: number;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface DailyActivity {
  date: string;
  completedCount: number;
  totalTasks: number;
}

export interface ProductivityStats {
  completedCount: number;
  totalTasks: number;
  completionRate: number;
  currentStreakDays: number;
  bestStreakDays: number;
  focusMinutesToday: number;
  syncedToGoogleCount: number;
  focusScore: number; // 0 - 100
  totalXp: number;
  userLevel: number;
  rpgTitle: string;
  totalRoiGenerated: number; // In dollars / value points
  billableHoursTotal: number;
  weeklyVelocity: number[]; // completions for past 7 days
  weeklyActivity: DailyActivity[];
  categoryDistribution: Record<TaskCategory, number>;
  categoryBreakdown: Record<string, number>;
  habitActivityDays: Record<string, number>; // "YYYY-MM-DD": count
}

export interface DeadlineRiskAlert {
  taskId: string;
  taskTitle: string;
  dueDate: string;
  category: TaskCategory;
  estimatedRemainingMinutes: number;
  riskSeverity: 'Critical' | 'Warning' | 'Healthy';
  reason: string;
  recommendedAction: string;
}

export interface AIProductivityBrief {
  summary: string;
  focusOfTheDay?: string;
  energyLevel: 'High' | 'Medium' | 'Low';
  burnoutRisk: 'Low' | 'Moderate' | 'High' | string;
  deadlineAlerts?: DeadlineRiskAlert[];
  recommendedSchedule?: {
    timeSlot: string;
    suggestedTaskTitle?: string;
    category?: TaskCategory;
    reason: string;
  }[];
  suggestedSchedule?: {
    timeSlot: string;
    recommendedTask: string;
    reason: string;
  }[];
  strategicAdvice?: string[];
  motivationalQuote?: string;
}

export interface GoogleSyncConfig {
  clientId?: string;
  apiKey?: string;
  calendarId: string;
  isConnected: boolean;
  lastSyncedAt?: string;
  email?: string;
}
