import type { 
  Task, 
  GoalOKR, 
  CalendarEvent, 
  ProductivityStats, 
  AIProductivityBrief,
  Project,
  SkillNode,
  RPGAchievementBadge,
  TimeLog,
  DeadlineRiskAlert
} from '../types/index.ts';

/**
 * Dynamically resolves the API base URL:
 * 1. If VITE_API_URL is configured (e.g. for split frontend/backend hosting on Render/Railway), use that.
 * 2. Otherwise default to relative '/api', which works seamlessly on Vercel with serverless functions and local dev.
 */
function resolveApiBase(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return '/api';
}

export const API_BASE = resolveApiBase();

/**
 * Token management helpers
 */
const TOKEN_KEY = 'chronos_auth_token';

export function getAuthToken(): string | null {
  try {
    return typeof window !== 'undefined' ? (localStorage.getItem(TOKEN_KEY) || localStorage.getItem('auth_token')) : null;
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore localStorage availability issues
  }
}

/**
 * Centralized, production-resilient HTTP request handler.
 * Gracefully parses JSON, catches Vercel HTML error pages (e.g. 404, 502, 504),
 * and provides clear debugging logs.
 */
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE}${cleanEndpoint}`;

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

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers
    });
  } catch (networkError: any) {
    console.error(`[Chronos API Network Error] Failed to fetch ${url}:`, networkError);
    throw new Error(`Network failure connecting to ${url}. Verify backend availability and CORS settings.`);
  }

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!res.ok) {
    let errorMessage = `HTTP ${res.status}: ${res.statusText}`;

    if (isJson) {
      try {
        const errorJson = await res.json();
        errorMessage = errorJson.error || errorJson.message || errorMessage;
      } catch {
        // Fallback to status text
      }
    } else {
      try {
        const rawText = await res.text();
        if (res.status === 404) {
          errorMessage = `API route not found at ${url}. Check vercel.json rewrites or serverless function deployment.`;
        } else if (res.status === 401) {
          errorMessage = `Unauthorized (401). Check ENFORCE_AUTH settings or session credentials.`;
        } else if (rawText && rawText.length < 200) {
          errorMessage = rawText;
        }
      } catch {
        // Ignore text extraction error
      }
    }

    console.error(`[Chronos API Error] ${options.method || 'GET'} ${url} -> ${res.status}:`, errorMessage);
    throw new Error(errorMessage);
  }

  if (isJson) {
    return res.json() as Promise<T>;
  }

  return {} as Promise<T>;
}

export const api = {
  // --- TASKS ---
  async getTasks(params?: { category?: string; status?: string; search?: string }): Promise<Task[]> {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const json = await request<{ success: boolean; data: Task[] }>(`/tasks${queryString}`);
    return json.data || [];
  },

  async createTask(task: Partial<Task>): Promise<Task> {
    const json = await request<{ success: boolean; data: Task }>('/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
    return json.data;
  },

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const json = await request<{ success: boolean; data: Task }>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return json.data;
  },

  async toggleTask(id: string): Promise<Task> {
    const json = await request<{ success: boolean; data: Task }>(`/tasks/${id}/toggle`, {
      method: 'PATCH',
    });
    return json.data;
  },

  async toggleSubtask(taskId: string, subtaskId: string): Promise<Task> {
    const json = await request<{ success: boolean; data: Task }>(`/tasks/${taskId}/subtask/${subtaskId}`, {
      method: 'PATCH',
    });
    return json.data;
  },

  async recordPomodoro(taskId: string, minutes = 25): Promise<void> {
    await request<{ success: boolean }>(`/tasks/${taskId}/pomodoro`, {
      method: 'POST',
      body: JSON.stringify({ minutes }),
    });
  },

  async logPomodoro(taskId: string, minutes = 25): Promise<void> {
    return this.recordPomodoro(taskId, minutes);
  },

  async deleteTask(id: string): Promise<void> {
    await request<{ success: boolean }>(`/tasks/${id}`, {
      method: 'DELETE',
    });
  },

  // --- PROJECTS ---
  async getProjects(): Promise<Project[]> {
    const json = await request<{ success: boolean; data: Project[] }>('/projects');
    return json.data || [];
  },

  async createProject(project: Partial<Project>): Promise<Project> {
    const json = await request<{ success: boolean; data: Project }>('/projects', {
      method: 'POST',
      body: JSON.stringify(project),
    });
    return json.data;
  },

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const json = await request<{ success: boolean; data: Project }>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return json.data;
  },

  async deleteProject(id: string): Promise<void> {
    await request<{ success: boolean }>(`/projects/${id}`, {
      method: 'DELETE',
    });
  },

  async getProjectDocTemplate(id: string): Promise<{ projectId: string; title: string; docTemplateUrl: string }> {
    const json = await request<{ success: boolean; data: { projectId: string; title: string; docTemplateUrl: string } }>(`/projects/${id}/doc-template`);
    return json.data;
  },

  // --- SKILLS & BADGES ---
  async getSkills(): Promise<SkillNode[]> {
    const json = await request<{ success: boolean; data: SkillNode[] }>('/skills');
    return json.data || [];
  },

  async getBadges(): Promise<RPGAchievementBadge[]> {
    const json = await request<{ success: boolean; data: RPGAchievementBadge[] }>('/skills/badges');
    return json.data || [];
  },

  async trainSkill(skillId: string, xpAmount = 50) {
    return request<{ success: boolean; message?: string; skill: SkillNode; stats: any }>(`/skills/${skillId}/train`, {
      method: 'POST',
      body: JSON.stringify({ xpAmount }),
    });
  },

  // --- TIMELOGS & TIME ROI ---
  async getTimeLogs(): Promise<TimeLog[]> {
    const json = await request<{ success: boolean; data: TimeLog[] }>('/timelogs');
    return json.data || [];
  },

  async addTimeLog(log: Partial<TimeLog>): Promise<TimeLog> {
    const json = await request<{ success: boolean; data: TimeLog }>('/timelogs', {
      method: 'POST',
      body: JSON.stringify(log),
    });
    return json.data;
  },

  // --- GOALS & OKRS ---
  async getGoals(): Promise<GoalOKR[]> {
    const json = await request<{ success: boolean; data: GoalOKR[] }>('/goals');
    return json.data || [];
  },

  async createGoal(goal: Partial<GoalOKR>): Promise<GoalOKR> {
    const json = await request<{ success: boolean; data: GoalOKR }>('/goals', {
      method: 'POST',
      body: JSON.stringify(goal),
    });
    return json.data;
  },

  async updateGoal(id: string, updates: Partial<GoalOKR>): Promise<GoalOKR> {
    const json = await request<{ success: boolean; data: GoalOKR }>(`/goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return json.data;
  },

  async updateKeyResult(goalId: string, krId: string, currentValue: number): Promise<GoalOKR> {
    const json = await request<{ success: boolean; data: GoalOKR }>(`/goals/${goalId}/kr/${krId}`, {
      method: 'PATCH',
      body: JSON.stringify({ currentValue }),
    });
    return json.data;
  },

  async deleteGoal(id: string): Promise<void> {
    await request<{ success: boolean }>(`/goals/${id}`, {
      method: 'DELETE',
    });
  },

  // --- CALENDAR & SCHEDULING ---
  async getCalendarEvents(startDate?: string, endDate?: string): Promise<CalendarEvent[]> {
    const query = new URLSearchParams();
    if (startDate) query.set('startDate', startDate);
    if (endDate) query.set('endDate', endDate);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const json = await request<{ success: boolean; data: CalendarEvent[] }>(`/calendar/events${queryString}`);
    return json.data || [];
  },

  async createCalendarEvent(event: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const json = await request<{ success: boolean; data: CalendarEvent }>('/calendar/events', {
      method: 'POST',
      body: JSON.stringify(event),
    });
    return json.data;
  },

  async checkConflicts(task: Partial<Task>): Promise<{ hasConflict: boolean; conflictingEvents: CalendarEvent[] }> {
    return request<{ hasConflict: boolean; conflictingEvents: CalendarEvent[] }>('/calendar/check-conflicts', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  },

  async suggestSlots(durationMinutes = 45, targetDate?: string) {
    const json = await request<{ suggestions: any[] }>('/calendar/suggest-slots', {
      method: 'POST',
      body: JSON.stringify({ durationMinutes, targetDate }),
    });
    return json.suggestions || [];
  },

  async autoScheduleCalendar(targetDate?: string) {
    return request<{ success: boolean; scheduledCount: number; message: string }>('/calendar/auto-schedule', {
      method: 'POST',
      body: JSON.stringify({ targetDate }),
    });
  },

  async resolveCalendarConflicts() {
    return request<{ success: boolean; message: string }>('/calendar/resolve-conflicts', {
      method: 'POST',
    });
  },

  async getGoogleCalendarWebUrl(taskId: string): Promise<string> {
    const json = await request<{ success: boolean; url: string }>(`/calendar/web-link/${taskId}`);
    return json.url;
  },

  async getAuthStatus() {
    return request<{ isConnected: boolean; email: string }>('/calendar/auth-status');
  },

  async updateAuthStatus(isConnected: boolean, email?: string) {
    return request<{ success: boolean; isConnected: boolean }>('/calendar/auth-status', {
      method: 'POST',
      body: JSON.stringify({ isConnected, email }),
    });
  },

  // --- AI & PRODUCTIVITY INTELLIGENCE ---
  async decomposeGoal(goalTitle: string, context?: string, category?: string) {
    const json = await request<{ success: boolean; data: any }>('/ai/decompose', {
      method: 'POST',
      body: JSON.stringify({ goalTitle, context, category }),
    });
    return json.data;
  },

  async atomizeTask(taskId?: string, taskTitle?: string, category?: string) {
    return request<{ success: boolean; subtasks: any[] }>('/ai/atomize', {
      method: 'POST',
      body: JSON.stringify({ taskId, taskTitle, category }),
    });
  },

  async getBurnoutRisk(): Promise<{
    burnoutIndex: number;
    riskLevel: 'Critical' | 'Moderate' | 'Low';
    imminentTasksCount: number;
    totalImminentMinutes: number;
    highFocusMinutes: number;
    deadlineAlerts: DeadlineRiskAlert[];
    recommendation: string;
  }> {
    const json = await request<{
      success: boolean;
      data: {
        burnoutIndex: number;
        riskLevel: 'Critical' | 'Moderate' | 'Low';
        imminentTasksCount: number;
        totalImminentMinutes: number;
        highFocusMinutes: number;
        deadlineAlerts: DeadlineRiskAlert[];
        recommendation: string;
      };
    }>('/ai/burnout-risk');
    return json.data;
  },

  async getDailyBrief(energyLevel: 'High' | 'Medium' | 'Low' = 'High'): Promise<AIProductivityBrief> {
    const json = await request<{ success: boolean; data: AIProductivityBrief }>('/ai/daily-brief', {
      method: 'POST',
      body: JSON.stringify({ energyLevel }),
    });
    return json.data;
  },

  async askCoach(message: string): Promise<string> {
    const json = await request<{ success: boolean; advice: string }>('/ai/coach', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
    return json.advice;
  },

  async getStats(): Promise<ProductivityStats> {
    const json = await request<{ success: boolean; data: ProductivityStats }>('/stats');
    return json.data;
  }
};
