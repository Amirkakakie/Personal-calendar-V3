import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { 
  TeamProject, 
  TeamTask, 
  TeamMember, 
  KanbanColumnId, 
  TeamTaskPriority,
  TeamRole,
  ProjectInvitation
} from '../types/team.ts';
import { useAuth } from './AuthContext.tsx';
import { api } from '../services/api.ts';

const STORAGE_PROJECTS_KEY = 'chronos_secure_team_projects_v3';
const STORAGE_TASKS_KEY = 'chronos_secure_team_tasks_v3';
const STORAGE_INVITATIONS_KEY = 'chronos_project_invitations_v3';
const STORAGE_CURRENT_PROJ_KEY = 'chronos_team_curr_proj_v3';

interface TeamFilter {
  search: string;
  assigneeId?: string;
  priority?: TeamTaskPriority | 'all';
  tag?: string;
}

interface TeamContextType {
  projects: TeamProject[];
  currentProject: TeamProject | null;
  teamMembers: TeamMember[];
  projectTasks: TeamTask[];
  filter: TeamFilter;
  setFilter: React.Dispatch<React.SetStateAction<TeamFilter>>;
  clearFilter: () => void;
  setCurrentProjectId: (id: string) => void;
  createProject: (project: Omit<TeamProject, 'id' | 'workspaceId' | 'ownerId' | 'ownerEmail' | 'memberIds' | 'createdAt'>) => Promise<TeamProject | null>;
  updateProject: (project: Partial<TeamProject> & { id: string }) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  createTask: (task: Omit<TeamTask, 'id' | 'taskNumber' | 'createdAt' | 'updatedAt' | 'comments'>) => Promise<TeamTask | null>;
  updateTask: (task: Partial<TeamTask> & { id: string }) => Promise<void>;
  moveTask: (taskId: string, targetColumnId: KanbanColumnId, targetIndex?: number) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  addComment: (taskId: string, text: string) => Promise<void>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  addSubtask: (taskId: string, title: string) => Promise<void>;
  deleteSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  
  // Explicit Email Invitation System
  sendProjectInvite: (projectId: string, email: string, role?: TeamRole) => Promise<{ success: boolean; message: string }>;
  myPendingInvites: ProjectInvitation[];
  acceptInvite: (inviteId: string) => Promise<void>;
  declineInvite: (inviteId: string) => Promise<void>;
}

const TeamContext = createContext<TeamContextType | null>(null);

export const TeamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, getProjectMembers } = useAuth();
  const currentUserId = currentUser?.id;

  const [allProjects, setAllProjects] = useState<TeamProject[]>([]);
  const [allTasks, setAllTasks] = useState<TeamTask[]>([]);
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
  const [currentProjectId, setCurrentProjectIdState] = useState<string>('');

  const [filter, setFilter] = useState<TeamFilter>({
    search: '',
    assigneeId: undefined,
    priority: 'all',
    tag: undefined
  });

  // Account switching / logout safety: Flush state when user changes
  useEffect(() => {
    if (!currentUserId) {
      setAllProjects([]);
      setAllTasks([]);
      setInvitations([]);
      setCurrentProjectIdState('');
      return;
    }

    // Load initial user-scoped cached values if present
    try {
      const projKey = `${STORAGE_PROJECTS_KEY}_${currentUserId}`;
      const savedProjs = localStorage.getItem(projKey);
      if (savedProjs) setAllProjects(JSON.parse(savedProjs));

      const invKey = `${STORAGE_INVITATIONS_KEY}_${currentUserId}`;
      const savedInvs = localStorage.getItem(invKey);
      if (savedInvs) setInvitations(JSON.parse(savedInvs));

      const curKey = `${STORAGE_CURRENT_PROJ_KEY}_${currentUserId}`;
      const savedCur = localStorage.getItem(curKey);
      if (savedCur) setCurrentProjectIdState(savedCur);
    } catch {}

    // Reconcile with backend
    async function syncBackendTeamData() {
      try {
        const [projs, invites] = await Promise.all([
          api.getTeamProjects().catch(() => []),
          api.getTeamInvitations().catch(() => [])
        ]);

        if (Array.isArray(projs)) {
          setAllProjects(projs);
          localStorage.setItem(`${STORAGE_PROJECTS_KEY}_${currentUserId}`, JSON.stringify(projs));
        }
        if (Array.isArray(invites)) {
          setInvitations(invites);
          localStorage.setItem(`${STORAGE_INVITATIONS_KEY}_${currentUserId}`, JSON.stringify(invites));
        }
      } catch (e) {
        console.warn('[TeamContext] Background team sync error:', e);
      }
    }

    syncBackendTeamData();
  }, [currentUserId]);

  // Load project tasks whenever active project changes
  useEffect(() => {
    if (!currentUserId || !currentProjectId) return;

    api.getTeamTasks(currentProjectId)
      .then(tasks => {
        if (Array.isArray(tasks)) {
          setAllTasks(prev => {
            const otherTasks = prev.filter(t => t.projectId !== currentProjectId);
            return [...otherTasks, ...tasks];
          });
        }
      })
      .catch(() => {});
  }, [currentUserId, currentProjectId]);

  // STRICT ACCESS CONTROL: Only projects where currentUser is owner or accepted member
  const userProjects = useMemo(() => {
    if (!currentUser) return [];
    const uid = currentUser.id;
    return allProjects.filter(p => p.ownerId === uid || (Array.isArray(p.memberIds) && p.memberIds.includes(uid)));
  }, [allProjects, currentUser]);

  // Current project resolution
  const currentProject = useMemo(() => {
    if (userProjects.length === 0) return null;
    const found = userProjects.find(p => p.id === currentProjectId);
    return found || userProjects[0];
  }, [userProjects, currentProjectId]);

  const setCurrentProjectId = useCallback((id: string) => {
    setCurrentProjectIdState(id);
    if (currentUserId) {
      try {
        localStorage.setItem(`${STORAGE_CURRENT_PROJ_KEY}_${currentUserId}`, id);
      } catch {}
    }
  }, [currentUserId]);

  // Team members strictly for the current project
  const teamMembers = useMemo(() => {
    if (!currentProject) return [];
    return getProjectMembers(currentProject.memberIds);
  }, [currentProject, getProjectMembers]);

  // Filtered tasks for current project
  const projectTasks = useMemo(() => {
    if (!currentProject) return [];
    const memberMap = new Map(teamMembers.map(m => [m.id, m]));

    return allTasks
      .filter(t => t.projectId === currentProject.id)
      .map(t => ({
        ...t,
        assignee: t.assigneeId ? memberMap.get(t.assigneeId) : undefined
      }))
      .filter(t => {
        if (filter.search) {
          const q = filter.search.toLowerCase();
          const matchesTitle = t.title.toLowerCase().includes(q);
          const matchesDesc = t.description?.toLowerCase().includes(q);
          const matchesKey = `${currentProject.key}-${t.taskNumber}`.toLowerCase().includes(q);
          const matchesTag = t.tags.some(tag => tag.toLowerCase().includes(q));
          if (!matchesTitle && !matchesDesc && !matchesKey && !matchesTag) return false;
        }
        if (filter.assigneeId && t.assigneeId !== filter.assigneeId) {
          return false;
        }
        if (filter.priority && filter.priority !== 'all' && t.priority !== filter.priority) {
          return false;
        }
        if (filter.tag && !t.tags.includes(filter.tag)) {
          return false;
        }
        return true;
      });
  }, [allTasks, currentProject, teamMembers, filter]);

  // Pending invitations strictly for the current logged-in user's email
  const myPendingInvites = useMemo(() => {
    if (!currentUser?.email) return [];
    const myEmail = currentUser.email.toLowerCase();
    return invitations.filter(inv => inv.invitedEmail.toLowerCase() === myEmail && inv.status === 'PENDING');
  }, [invitations, currentUser]);

  // Project Actions with Backend API Calls
  const createProject = useCallback(
    async (data: Omit<TeamProject, 'id' | 'workspaceId' | 'ownerId' | 'ownerEmail' | 'memberIds' | 'createdAt'>): Promise<TeamProject> => {
      if (!currentUser) throw new Error('Must be authenticated to create a project');

      try {
        const created = await api.createTeamProject(data);
        if (created && created.id) {
          setAllProjects(prev => {
            const next = [created, ...prev.filter(p => p.id !== created.id)];
            if (currentUserId) {
              try {
                localStorage.setItem(`${STORAGE_PROJECTS_KEY}_${currentUserId}`, JSON.stringify(next));
              } catch {}
            }
            return next;
          });
          setCurrentProjectId(created.id);
          return created;
        }
        throw new Error('Failed to create team project: Empty response from server');
      } catch (err: any) {
        console.error('[TeamContext] Failed to create team project on backend:', err);
        throw err;
      }
    },
    [currentUser, currentUserId, setCurrentProjectId]
  );

  const updateProject = useCallback(async (data: Partial<TeamProject> & { id: string }) => {
    setAllProjects(prev => prev.map(p => (p.id === data.id ? { ...p, ...data } : p)));
    try {
      await api.updateTeamProject(data.id, data);
    } catch (err) {
      console.warn('[TeamContext] Backend update failed:', err);
    }
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    setAllProjects(prev => prev.filter(p => p.id !== id));
    setAllTasks(prev => prev.filter(t => t.projectId !== id));
    setInvitations(prev => prev.filter(inv => inv.projectId !== id));
    try {
      await api.deleteTeamProject(id);
    } catch (err) {
      console.warn('[TeamContext] Backend delete failed:', err);
    }
  }, []);

  // Secure Invitation Flow
  const sendProjectInvite = useCallback(
    async (projectId: string, email: string, role: TeamRole = 'Member'): Promise<{ success: boolean; message: string }> => {
      if (!currentUser) return { success: false, message: 'Authentication required.' };
      
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) return { success: false, message: 'Email address is required.' };

      if (cleanEmail === currentUser.email.toLowerCase()) {
        return { success: false, message: 'You cannot invite yourself.' };
      }

      try {
        const res = await api.sendTeamInvite(projectId, cleanEmail, role);
        if (res.success) {
          const freshInvites = await api.getTeamInvitations().catch(() => []);
          setInvitations(freshInvites);
        }
        return res;
      } catch (err: any) {
        return { success: false, message: err.message || 'Failed to send invitation.' };
      }
    },
    [currentUser]
  );

  const acceptInvite = useCallback(
    async (inviteId: string) => {
      if (!currentUser) return;
      try {
        await api.respondToTeamInvite(inviteId, true);
        const [freshProjs, freshInvites] = await Promise.all([
          api.getTeamProjects().catch(() => []),
          api.getTeamInvitations().catch(() => [])
        ]);
        setAllProjects(freshProjs);
        setInvitations(freshInvites);
      } catch (err) {
        console.error('[TeamContext] Accept invite error:', err);
      }
    },
    [currentUser]
  );

  const declineInvite = useCallback(
    async (inviteId: string) => {
      try {
        await api.respondToTeamInvite(inviteId, false);
        const freshInvites = await api.getTeamInvitations().catch(() => []);
        setInvitations(freshInvites);
      } catch (err) {
        console.error('[TeamContext] Decline invite error:', err);
      }
    },
    []
  );

  // Task Actions with Backend API Calls
  const createTask = useCallback(
    async (data: Omit<TeamTask, 'id' | 'taskNumber' | 'createdAt' | 'updatedAt' | 'comments'>): Promise<TeamTask | null> => {
      if (!currentUser || !currentProject) return null;

      try {
        const created = await api.createTeamTask({
          ...data,
          projectId: currentProject.id
        });

        if (created && created.id) {
          setAllTasks(prev => [created, ...prev]);
          return created;
        }
      } catch (err) {
        console.error('[TeamContext] Create task failed:', err);
      }
      return null;
    },
    [currentUser, currentProject]
  );

  const updateTask = useCallback(async (data: Partial<TeamTask> & { id: string }) => {
    setAllTasks(prev =>
      prev.map(t => (t.id === data.id ? { ...t, ...data, updatedAt: new Date().toISOString() } : t))
    );
    try {
      await api.updateTeamTask(data.id, data);
    } catch (err) {
      console.warn('[TeamContext] Update task failed:', err);
    }
  }, []);

  const moveTask = useCallback(async (taskId: string, targetColumnId: KanbanColumnId, targetIndex?: number) => {
    setAllTasks(prev => {
      const taskIndex = prev.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return prev;

      const updated = [...prev];
      const targetTask = { ...updated[taskIndex], columnId: targetColumnId, updatedAt: new Date().toISOString() };

      if (typeof targetIndex === 'number') {
        targetTask.order = targetIndex;
      }

      updated[taskIndex] = targetTask;
      return updated;
    });

    try {
      await api.updateTeamTask(taskId, { columnId: targetColumnId, order: targetIndex });
    } catch (err) {
      console.warn('[TeamContext] Move task failed:', err);
    }
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    setAllTasks(prev => prev.filter(t => t.id !== taskId));
    try {
      await api.deleteTeamTask(taskId);
    } catch (err) {
      console.warn('[TeamContext] Delete task failed:', err);
    }
  }, []);

  const addComment = useCallback(
    async (taskId: string, text: string) => {
      if (!text.trim() || !currentUser) return;

      const newComment = {
        id: `comment-${Date.now()}`,
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorInitials: currentUser.initials,
        authorColor: currentUser.avatarColor,
        text: text.trim(),
        createdAt: new Date().toISOString()
      };

      const task = allTasks.find(t => t.id === taskId);
      const updatedComments = [...(task?.comments || []), newComment];

      setAllTasks(prev =>
        prev.map(t => (t.id === taskId ? { ...t, comments: updatedComments } : t))
      );

      try {
        await api.updateTeamTask(taskId, { comments: updatedComments });
      } catch (err) {
        console.warn('[TeamContext] Add comment failed:', err);
      }
    },
    [currentUser, allTasks]
  );

  const toggleSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;

    const subtasks = task.subtasks.map(st =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );

    setAllTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, subtasks } : t))
    );

    try {
      await api.updateTeamTask(taskId, { subtasks });
    } catch (err) {
      console.warn('[TeamContext] Toggle subtask failed:', err);
    }
  }, [allTasks]);

  const addSubtask = useCallback(async (taskId: string, title: string) => {
    if (!title.trim()) return;
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;

    const newSubtask = {
      id: `st-${Date.now()}`,
      title: title.trim(),
      completed: false
    };

    const subtasks = [...task.subtasks, newSubtask];

    setAllTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, subtasks } : t))
    );

    try {
      await api.updateTeamTask(taskId, { subtasks });
    } catch (err) {
      console.warn('[TeamContext] Add subtask failed:', err);
    }
  }, [allTasks]);

  const deleteSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;

    const subtasks = task.subtasks.filter(st => st.id !== subtaskId);

    setAllTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, subtasks } : t))
    );

    try {
      await api.updateTeamTask(taskId, { subtasks });
    } catch (err) {
      console.warn('[TeamContext] Delete subtask failed:', err);
    }
  }, [allTasks]);

  const clearFilter = useCallback(() => {
    setFilter({
      search: '',
      assigneeId: undefined,
      priority: 'all',
      tag: undefined
    });
  }, []);

  return (
    <TeamContext.Provider
      value={{
        projects: userProjects,
        currentProject,
        teamMembers,
        projectTasks,
        filter,
        setFilter,
        clearFilter,
        setCurrentProjectId,
        createProject,
        updateProject,
        deleteProject,
        createTask,
        updateTask,
        moveTask,
        deleteTask,
        addComment,
        toggleSubtask,
        addSubtask,
        deleteSubtask,
        sendProjectInvite,
        myPendingInvites,
        acceptInvite,
        declineInvite
      }}
    >
      {children}
    </TeamContext.Provider>
  );
};

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
};
