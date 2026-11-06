import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import confetti from 'canvas-confetti';
import { api } from '../services/api.ts';
import { LocalStore } from '../services/storage.ts';
import { useAuth } from './AuthContext.tsx';
import type { 
  Task, 
  GoalOKR, 
  CalendarEvent, 
  ProductivityStats, 
  Project, 
  SkillNode, 
  RPGAchievementBadge, 
  TimeLog,
  EisenhowerQuadrant
} from '../types/index.ts';

export interface ToastNotification {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info';
}

interface TaskContextValue {
  // State
  tasks: Task[];
  goals: GoalOKR[];
  projects: Project[];
  skills: SkillNode[];
  badges: RPGAchievementBadge[];
  timeLogs: TimeLog[];
  calendarEvents: CalendarEvent[];
  stats: ProductivityStats | null;
  isLoading: boolean;
  isSyncing: boolean;
  toast: ToastNotification | null;

  // Actions
  saveTask: (taskData: Partial<Task>, idToEdit?: string) => Promise<Task>;
  toggleTask: (id: string) => Promise<void>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  
  saveGoal: (goalData: Partial<GoalOKR>, idToEdit?: string) => Promise<GoalOKR>;
  deleteGoal: (id: string) => Promise<void>;
  updateKeyResult: (goalId: string, krId: string, value: number) => Promise<void>;

  saveProject: (projectData: Partial<Project>, idToEdit?: string) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;

  recordPomodoro: (taskId: string, minutes?: number) => Promise<void>;
  addTimeLog: (log: Partial<TimeLog>) => Promise<TimeLog>;
  trainSkill: (skillId: string, xpAmount?: number) => Promise<void>;

  refreshAllData: () => Promise<void>;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;
}

const TaskContext = createContext<TaskContextValue | null>(null);

export const TaskProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const currentUserId = currentUser?.id;

  // Initialize state immediately from LocalStore scoped to current user
  const [tasks, setTasks] = useState<Task[]>(() => LocalStore.getTasks(currentUserId));
  const [goals, setGoals] = useState<GoalOKR[]>(() => LocalStore.getGoals(currentUserId));
  const [projects, setProjects] = useState<Project[]>(() => LocalStore.getProjects(currentUserId));
  const [skills, setSkills] = useState<SkillNode[]>(() => LocalStore.getSkills(currentUserId));
  const [badges, setBadges] = useState<RPGAchievementBadge[]>(() => LocalStore.getBadges(currentUserId));
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>(() => LocalStore.getTimeLogs(currentUserId));
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(() => LocalStore.getEvents(currentUserId));
  const [stats, setStats] = useState<ProductivityStats | null>(() => LocalStore.getStats(currentUserId));

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastNotification | null>(null);

  // When authenticated user changes (e.g. login, signup, logout), reload partitioned data instantly
  useEffect(() => {
    setTasks(LocalStore.getTasks(currentUserId));
    setGoals(LocalStore.getGoals(currentUserId));
    setProjects(LocalStore.getProjects(currentUserId));
    setSkills(LocalStore.getSkills(currentUserId));
    setBadges(LocalStore.getBadges(currentUserId));
    setTimeLogs(LocalStore.getTimeLogs(currentUserId));
    setCalendarEvents(LocalStore.getEvents(currentUserId));
    setStats(LocalStore.getStats(currentUserId));
  }, [currentUserId]);

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `toast-${Date.now()}`;
    setToast({ id, text, type });
    setTimeout(() => {
      setToast(curr => (curr?.id === id ? null : curr));
    }, 3500);
  }, []);

  const clearToast = useCallback(() => {
    setToast(null);
  }, []);

  // Sync state changes with derived stats
  const syncDerivedStats = useCallback((updatedTasks: Task[], updatedLogs: TimeLog[]) => {
    setStats(prev => {
      const derived = LocalStore.deriveStats(updatedTasks, updatedLogs, prev);
      LocalStore.setStats(derived, currentUserId);
      return derived;
    });
  }, [currentUserId]);

  // Background Data Reconciliation with API
  const refreshAllData = useCallback(async () => {
    if (!currentUserId) return;
    setIsSyncing(true);
    try {
      const [
        tasksRes,
        goalsRes,
        projectsRes,
        skillsRes,
        badgesRes,
        timeLogsRes,
        eventsRes,
        statsRes
      ] = await Promise.allSettled([
        api.getTasks(),
        api.getGoals(),
        api.getProjects(),
        api.getSkills(),
        api.getBadges(),
        api.getTimeLogs(),
        api.getCalendarEvents(),
        api.getStats()
      ]);

      if (tasksRes.status === 'fulfilled') {
        setTasks(tasksRes.value);
        LocalStore.setTasks(tasksRes.value, currentUserId);
      }
      if (goalsRes.status === 'fulfilled') {
        setGoals(goalsRes.value);
        LocalStore.setGoals(goalsRes.value, currentUserId);
      }
      if (projectsRes.status === 'fulfilled') {
        setProjects(projectsRes.value);
        LocalStore.setProjects(projectsRes.value, currentUserId);
      }
      if (skillsRes.status === 'fulfilled') {
        setSkills(skillsRes.value);
        LocalStore.setSkills(skillsRes.value, currentUserId);
      }
      if (badgesRes.status === 'fulfilled') {
        setBadges(badgesRes.value);
        LocalStore.setBadges(badgesRes.value, currentUserId);
      }
      if (timeLogsRes.status === 'fulfilled') {
        setTimeLogs(timeLogsRes.value);
        LocalStore.setTimeLogs(timeLogsRes.value, currentUserId);
      }
      if (eventsRes.status === 'fulfilled') {
        setCalendarEvents(eventsRes.value);
        LocalStore.setEvents(eventsRes.value, currentUserId);
      }
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value);
        LocalStore.setStats(statsRes.value, currentUserId);
      }
    } catch (err) {
      console.warn('[Chronos Context] Background refresh encountered network error, continuing with local cache:', err);
    } finally {
      setIsSyncing(false);
      setIsLoading(false);
    }
  }, [currentUserId]);

  // Initial mount: load data from API in background if authenticated
  useEffect(() => {
    if (currentUserId) {
      refreshAllData();
    }
  }, [currentUserId, refreshAllData]);

  // ==========================================
  // TASK MUTATIONS (OPTIMISTIC + DUAL WRITE)
  // ==========================================
  const saveTask = useCallback(async (taskData: Partial<Task>, idToEdit?: string): Promise<Task> => {
    const isEdit = Boolean(idToEdit);
    const taskId = idToEdit || `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    let finalTask: Task;

    if (isEdit) {
      const existing = tasks.find(t => t.id === taskId);
      finalTask = {
        ...(existing || {}),
        ...taskData,
        id: taskId,
        updatedAt: nowIso
      } as Task;

      const updated = tasks.map(t => (t.id === taskId ? finalTask : t));
      setTasks(updated);
      LocalStore.setTasks(updated, currentUserId);
      syncDerivedStats(updated, timeLogs);
      showToast('Task updated successfully', 'success');
    } else {
      finalTask = {
        id: taskId,
        title: taskData.title?.trim() || 'Untitled Task',
        description: taskData.description?.trim() || '',
        category: taskData.category || 'Work/Career',
        priority: taskData.priority || 'Medium',
        status: taskData.status || 'todo',
        eisenhower: taskData.eisenhower || 'q2_not_urgent_important',
        energyLevel: taskData.energyLevel || 'High Focus',
        dueDate: taskData.dueDate || nowIso.split('T')[0],
        dueTime: taskData.dueTime || '10:00',
        durationMinutes: Number(taskData.durationMinutes) || 45,
        subtasks: taskData.subtasks || [],
        goalId: taskData.goalId || undefined,
        projectId: taskData.projectId || undefined,
        linkedSkillId: taskData.linkedSkillId || undefined,
        calendarOverlay: taskData.calendarOverlay || 'work',
        xpReward: taskData.xpReward || 50,
        tags: taskData.tags || [],
        syncedToGoogle: Boolean(taskData.syncedToGoogle),
        pomodoroSessions: 0,
        pomodoroCount: 0,
        createdAt: nowIso,
        updatedAt: nowIso
      };

      const updated = [finalTask, ...tasks];
      setTasks(updated);
      LocalStore.setTasks(updated, currentUserId);
      syncDerivedStats(updated, timeLogs);
      showToast('Task created successfully', 'success');
    }

    // Background Async API Sync
    try {
      if (isEdit) {
        await api.updateTask(taskId, taskData);
      } else {
        await api.createTask(finalTask);
      }
    } catch (err: any) {
      console.warn('[Chronos API] Asynchronous task sync failed, cached locally:', err.message);
    }

    return finalTask;
  }, [tasks, timeLogs, syncDerivedStats, showToast, currentUserId]);

  const toggleTask = useCallback(async (id: string): Promise<void> => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const nextStatus = task.status === 'completed' ? 'todo' : 'completed';
    const isNowCompleted = nextStatus === 'completed';
    const nowIso = new Date().toISOString();

    const updatedTask: Task = {
      ...task,
      status: nextStatus,
      completedAt: isNowCompleted ? nowIso : undefined,
      updatedAt: nowIso
    };

    if (isNowCompleted) {
      confetti({ particleCount: 55, spread: 65, origin: { y: 0.7 } });
      // Award XP
      const xpBonus = task.xpReward || 50;
      setStats(prev => {
        if (!prev) return null;
        const newXp = prev.totalXp + xpBonus;
        const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;
        return {
          ...prev,
          totalXp: newXp,
          userLevel: newLevel
        };
      });
    }

    const updatedTasks = tasks.map(t => (t.id === id ? updatedTask : t));
    setTasks(updatedTasks);
    LocalStore.setTasks(updatedTasks, currentUserId);
    syncDerivedStats(updatedTasks, timeLogs);

    // Background API Sync
    try {
      await api.toggleTask(id);
    } catch (err: any) {
      console.warn('[Chronos API] Toggle task async sync failed, saved locally:', err.message);
    }
  }, [tasks, timeLogs, syncDerivedStats, currentUserId]);

  const toggleSubtask = useCallback(async (taskId: string, subtaskId: string): Promise<void> => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updatedSubtasks = (task.subtasks || []).map(st => {
      if (st.id === subtaskId) {
        return { ...st, completed: !st.completed };
      }
      return st;
    });

    const allCompleted = updatedSubtasks.length > 0 && updatedSubtasks.every(st => st.completed);
    const updatedTask: Task = {
      ...task,
      subtasks: updatedSubtasks,
      status: allCompleted ? 'completed' : task.status,
      updatedAt: new Date().toISOString()
    };

    const updatedTasks = tasks.map(t => (t.id === taskId ? updatedTask : t));
    setTasks(updatedTasks);
    LocalStore.setTasks(updatedTasks, currentUserId);
    syncDerivedStats(updatedTasks, timeLogs);

    // Background API Sync
    try {
      await api.toggleSubtask(taskId, subtaskId);
    } catch (err: any) {
      console.warn('[Chronos API] Toggle subtask async sync failed, saved locally:', err.message);
    }
  }, [tasks, timeLogs, syncDerivedStats, currentUserId]);

  const deleteTask = useCallback(async (id: string): Promise<void> => {
    const updatedTasks = tasks.filter(t => t.id !== id);
    const updatedEvents = calendarEvents.filter(e => e.taskId !== id);

    setTasks(updatedTasks);
    setCalendarEvents(updatedEvents);
    LocalStore.setTasks(updatedTasks, currentUserId);
    LocalStore.setEvents(updatedEvents, currentUserId);
    syncDerivedStats(updatedTasks, timeLogs);
    showToast('Task removed', 'info');

    // Background API Sync
    try {
      await api.deleteTask(id);
    } catch (err: any) {
      console.warn('[Chronos API] Delete task async sync failed, removed locally:', err.message);
    }
  }, [tasks, calendarEvents, timeLogs, syncDerivedStats, showToast, currentUserId]);

  // ==========================================
  // GOAL MUTATIONS
  // ==========================================
  const saveGoal = useCallback(async (goalData: Partial<GoalOKR>, idToEdit?: string): Promise<GoalOKR> => {
    const isEdit = Boolean(idToEdit);
    const goalId = idToEdit || `goal-${Date.now()}`;
    let finalGoal: GoalOKR;

    if (isEdit) {
      const existing = goals.find(g => g.id === goalId);
      finalGoal = {
        ...(existing || {}),
        ...goalData,
        id: goalId
      } as GoalOKR;
      const updated = goals.map(g => (g.id === goalId ? finalGoal : g));
      setGoals(updated);
      LocalStore.setGoals(updated, currentUserId);
      showToast('Goal updated', 'success');
    } else {
      finalGoal = {
        id: goalId,
        title: goalData.title || 'New Goal',
        description: goalData.description || '',
        category: goalData.category || 'Academic/Study',
        timeframe: goalData.timeframe || 'quarterly',
        targetDate: goalData.targetDate || new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
        progressPercent: 0,
        keyResults: goalData.keyResults || [],
        createdAt: new Date().toISOString()
      };
      const updated = [finalGoal, ...goals];
      setGoals(updated);
      LocalStore.setGoals(updated, currentUserId);
      showToast('Strategic Goal created', 'success');
    }

    try {
      if (isEdit) {
        await api.updateGoal(goalId, goalData);
      } else {
        await api.createGoal(finalGoal);
      }
    } catch (err: any) {
      console.warn('[Chronos API] Goal async sync failed, saved locally:', err.message);
    }

    return finalGoal;
  }, [goals, showToast, currentUserId]);

  const deleteGoal = useCallback(async (id: string): Promise<void> => {
    const updated = goals.filter(g => g.id !== id);
    setGoals(updated);
    LocalStore.setGoals(updated, currentUserId);
    showToast('Goal removed', 'info');

    try {
      await api.deleteGoal(id);
    } catch (err: any) {
      console.warn('[Chronos API] Delete goal async sync failed, removed locally:', err.message);
    }
  }, [goals, showToast, currentUserId]);

  const updateKeyResult = useCallback(async (goalId: string, krId: string, value: number): Promise<void> => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const updatedKeyResults = (goal.keyResults || []).map(kr => {
      if (kr.id === krId) {
        const completed = value >= kr.targetValue;
        return { ...kr, currentValue: value, completed };
      }
      return kr;
    });

    const totalKrs = updatedKeyResults.length;
    const completedKrs = updatedKeyResults.filter(k => k.completed).length;
    const progressPercent = totalKrs > 0 ? Math.round((completedKrs / totalKrs) * 100) : 0;

    const updatedGoal: GoalOKR = {
      ...goal,
      keyResults: updatedKeyResults,
      progressPercent
    };

    const updatedGoals = goals.map(g => (g.id === goalId ? updatedGoal : g));
    setGoals(updatedGoals);
    LocalStore.setGoals(updatedGoals, currentUserId);

    try {
      await api.updateKeyResult(goalId, krId, value);
    } catch (err: any) {
      console.warn('[Chronos API] Key result async sync failed, saved locally:', err.message);
    }
  }, [goals, currentUserId]);

  // ==========================================
  // PROJECT MUTATIONS
  // ==========================================
  const saveProject = useCallback(async (projectData: Partial<Project>, idToEdit?: string): Promise<Project> => {
    const isEdit = Boolean(idToEdit);
    const projId = idToEdit || `proj-${Date.now()}`;
    let finalProject: Project;

    if (isEdit) {
      const existing = projects.find(p => p.id === projId);
      finalProject = { ...(existing || {}), ...projectData, id: projId } as Project;
      const updated = projects.map(p => (p.id === projId ? finalProject : p));
      setProjects(updated);
      LocalStore.setProjects(updated, currentUserId);
      showToast('Project updated successfully', 'success');

      try {
        const res = await api.updateProject(projId, projectData);
        if (res && res.id) {
          finalProject = res;
          setProjects(prev => prev.map(p => (p.id === projId ? res : p)));
          LocalStore.setProjects(projects.map(p => (p.id === projId ? res : p)), currentUserId);
        }
      } catch (err: any) {
        console.warn('[Chronos API] Project update async sync failed, saved locally:', err.message);
      }
    } else {
      finalProject = {
        id: projId,
        name: projectData.name || 'New Project',
        description: projectData.description || '',
        category: projectData.category || 'Work/Career',
        status: projectData.status || 'in_progress',
        targetHours: Number(projectData.targetHours) || 20,
        loggedHours: 0,
        hourlyValuation: Number(projectData.hourlyValuation) || 100,
        color: projectData.color || 'blue',
        driveFolderUrl: projectData.driveFolderUrl || 'https://drive.google.com/drive/u/0/my-drive',
        tasksCount: 0,
        completedTasksCount: 0,
        createdAt: new Date().toISOString()
      };

      try {
        const created = await api.createProject(finalProject);
        if (created && created.id) {
          finalProject = created;
        }
      } catch (err: any) {
        console.warn('[Chronos API] Project create async sync failed, saved locally:', err.message);
      }

      const updated = [finalProject, ...projects.filter(p => p.id !== finalProject.id)];
      setProjects(updated);
      LocalStore.setProjects(updated, currentUserId);
      showToast('Project created successfully', 'success');
    }

    return finalProject;
  }, [projects, currentUserId, showToast]);

  const deleteProject = useCallback(async (id: string): Promise<void> => {
    const updated = projects.filter(p => p.id !== id);
    setProjects(updated);
    LocalStore.setProjects(updated, currentUserId);
    showToast('Project removed', 'info');

    try {
      await api.deleteProject(id);
    } catch (err: any) {
      console.warn('[Chronos API] Delete project async sync failed, removed locally:', err.message);
    }
  }, [projects, currentUserId, showToast]);

  // ==========================================
  // TIMELOG & POMODORO MUTATIONS
  // ==========================================
  const recordPomodoro = useCallback(async (taskId: string, minutes = 25): Promise<void> => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updatedTask: Task = {
      ...task,
      pomodoroSessions: (task.pomodoroSessions || 0) + 1,
      pomodoroCount: (task.pomodoroCount || 0) + 1
    };

    const updatedTasks = tasks.map(t => (t.id === taskId ? updatedTask : t));
    setTasks(updatedTasks);
    LocalStore.setTasks(updatedTasks, currentUserId);

    setStats(prev => {
      if (!prev) return null;
      const updated = {
        ...prev,
        focusMinutesToday: prev.focusMinutesToday + minutes,
        totalXp: prev.totalXp + minutes * 2
      };
      LocalStore.setStats(updated, currentUserId);
      return updated;
    });

    showToast(`Logged ${minutes}m Focus Session! (+${minutes * 2} XP)`, 'success');

    try {
      await api.recordPomodoro(taskId, minutes);
    } catch (err: any) {
      console.warn('[Chronos API] Record pomodoro async sync failed:', err.message);
    }
  }, [tasks, showToast, currentUserId]);

  const addTimeLog = useCallback(async (logData: Partial<TimeLog>): Promise<TimeLog> => {
    const id = `tl-${Date.now()}`;
    const newLog: TimeLog = {
      id,
      durationSeconds: logData.durationSeconds || 1800,
      hourlyRate: logData.hourlyRate || 85.0,
      calculatedRoi: logData.calculatedRoi || ((logData.durationSeconds || 1800) / 3600) * (logData.hourlyRate || 85.0),
      efficiencyRate: logData.efficiencyRate || 95,
      energyReported: logData.energyReported || 'High Focus',
      note: logData.note || '',
      taskId: logData.taskId,
      taskTitle: logData.taskTitle,
      projectId: logData.projectId,
      projectName: logData.projectName,
      startedAt: logData.startedAt || new Date(Date.now() - (logData.durationSeconds || 1800) * 1000).toISOString(),
      endedAt: logData.endedAt || new Date().toISOString()
    };

    const updated = [newLog, ...timeLogs];
    setTimeLogs(updated);
    LocalStore.setTimeLogs(updated, currentUserId);
    syncDerivedStats(tasks, updated);
    showToast('Time session recorded with ROI yield', 'success');

    try {
      await api.addTimeLog(newLog);
    } catch (err: any) {
      console.warn('[Chronos API] Add time log async sync failed:', err.message);
    }

    return newLog;
  }, [timeLogs, tasks, syncDerivedStats, showToast, currentUserId]);

  const trainSkill = useCallback(async (skillId: string, xpAmount = 50): Promise<void> => {
    const updatedSkills = skills.map(s => {
      if (s.id === skillId) {
        let currentXp = s.currentXp + xpAmount;
        let level = s.level;
        let requiredXp = s.requiredXp;

        while (currentXp >= requiredXp) {
          level += 1;
          requiredXp = Math.round(requiredXp * 1.5);
        }

        const masteryPct = Math.min(100, Math.round((currentXp / requiredXp) * 100));
        return { ...s, currentXp, level, requiredXp, masteryPct };
      }
      return s;
    });

    setSkills(updatedSkills);
    LocalStore.setSkills(updatedSkills, currentUserId);

    setStats(prev => {
      if (!prev) return null;
      const totalXp = prev.totalXp + xpAmount;
      const userLevel = Math.floor(Math.sqrt(totalXp / 100)) + 1;
      const updated = { ...prev, totalXp, userLevel };
      LocalStore.setStats(updated, currentUserId);
      return updated;
    });

    showToast(`+${xpAmount} XP added to Skill!`, 'success');

    try {
      await api.trainSkill(skillId, xpAmount);
    } catch (err: any) {
      console.warn('[Chronos API] Train skill async sync failed:', err.message);
    }
  }, [skills, showToast, currentUserId]);

  const contextValue: TaskContextValue = {
    tasks,
    goals,
    projects,
    skills,
    badges,
    timeLogs,
    calendarEvents,
    stats,
    isLoading,
    isSyncing,
    toast,
    saveTask,
    toggleTask,
    toggleSubtask,
    deleteTask,
    saveGoal,
    deleteGoal,
    updateKeyResult,
    saveProject,
    deleteProject,
    recordPomodoro,
    addTimeLog,
    trainSkill,
    refreshAllData,
    showToast,
    clearToast
  };

  return (
    <TaskContext.Provider value={contextValue}>
      {children}
    </TaskContext.Provider>
  );
};

export function useTasks(): TaskContextValue {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
}
