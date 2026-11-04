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

const STORAGE_PROJECTS_KEY = 'chronos_secure_team_projects_v3';
const STORAGE_TASKS_KEY = 'chronos_secure_team_tasks_v3';
const STORAGE_INVITATIONS_KEY = 'chronos_project_invitations_v3';
const STORAGE_CURRENT_PROJ_KEY = 'chronos_team_curr_proj_v3';

// Blank slate initial arrays for strict user data isolation
const DEFAULT_INITIAL_PROJECTS: TeamProject[] = [];
const DEFAULT_INITIAL_TASKS: TeamTask[] = [];
const DEFAULT_INITIAL_INVITATIONS: ProjectInvitation[] = [];

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
  createProject: (project: Omit<TeamProject, 'id' | 'workspaceId' | 'ownerId' | 'ownerEmail' | 'memberIds' | 'createdAt'>) => TeamProject;
  updateProject: (project: Partial<TeamProject> & { id: string }) => void;
  deleteProject: (id: string) => void;
  createTask: (task: Omit<TeamTask, 'id' | 'taskNumber' | 'createdAt' | 'updatedAt' | 'comments'>) => TeamTask | null;
  updateTask: (task: Partial<TeamTask> & { id: string }) => void;
  moveTask: (taskId: string, targetColumnId: KanbanColumnId, targetIndex?: number) => void;
  deleteTask: (taskId: string) => void;
  addComment: (taskId: string, text: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  addSubtask: (taskId: string, title: string) => void;
  deleteSubtask: (taskId: string, subtaskId: string) => void;
  
  // Explicit Email Invitation System
  sendProjectInvite: (projectId: string, email: string, role?: TeamRole) => { success: boolean; message: string };
  myPendingInvites: ProjectInvitation[];
  acceptInvite: (inviteId: string) => void;
  declineInvite: (inviteId: string) => void;
}

const TeamContext = createContext<TeamContextType | null>(null);

export const TeamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, findUserByEmail, getProjectMembers } = useAuth();

  // All stored projects (filtered by membership for currentUser)
  const [allProjects, setAllProjects] = useState<TeamProject[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_PROJECTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(DEFAULT_INITIAL_PROJECTS));
    return DEFAULT_INITIAL_PROJECTS;
  });

  // All stored tasks across projects
  const [allTasks, setAllTasks] = useState<TeamTask[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_TASKS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    localStorage.setItem(STORAGE_TASKS_KEY, JSON.stringify(DEFAULT_INITIAL_TASKS));
    return DEFAULT_INITIAL_TASKS;
  });

  // All invitations
  const [invitations, setInvitations] = useState<ProjectInvitation[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_INVITATIONS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    localStorage.setItem(STORAGE_INVITATIONS_KEY, JSON.stringify(DEFAULT_INITIAL_INVITATIONS));
    return DEFAULT_INITIAL_INVITATIONS;
  });

  // Selected Project ID
  const [currentProjectId, setCurrentProjectIdState] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_CURRENT_PROJ_KEY);
      if (stored) return stored;
    } catch {}
    return '';
  });

  // Filter state
  const [filter, setFilter] = useState<TeamFilter>({
    search: '',
    assigneeId: undefined,
    priority: 'all',
    tag: undefined
  });

  // Dual-write to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(allProjects));
    } catch {}
  }, [allProjects]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TASKS_KEY, JSON.stringify(allTasks));
    } catch {}
  }, [allTasks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_INVITATIONS_KEY, JSON.stringify(invitations));
    } catch {}
  }, [invitations]);

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
    try {
      localStorage.setItem(STORAGE_CURRENT_PROJ_KEY, id);
    } catch {}
  }, []);

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

  // Project Actions
  const createProject = useCallback(
    (data: Omit<TeamProject, 'id' | 'workspaceId' | 'ownerId' | 'ownerEmail' | 'memberIds' | 'createdAt'>): TeamProject => {
      if (!currentUser) throw new Error('Must be authenticated to create a project');

      const newProj: TeamProject = {
        ...data,
        id: `proj-${Date.now()}`,
        workspaceId: 'ws-team',
        ownerId: currentUser.id,
        ownerEmail: currentUser.email,
        memberIds: [currentUser.id], // Owner is initial member
        createdAt: new Date().toISOString().split('T')[0]
      };

      setAllProjects(prev => [...prev, newProj]);
      setCurrentProjectId(newProj.id);
      return newProj;
    },
    [currentUser, setCurrentProjectId]
  );

  const updateProject = useCallback((data: Partial<TeamProject> & { id: string }) => {
    setAllProjects(prev => prev.map(p => (p.id === data.id ? { ...p, ...data } : p)));
  }, []);

  const deleteProject = useCallback((id: string) => {
    setAllProjects(prev => prev.filter(p => p.id !== id));
    setAllTasks(prev => prev.filter(t => t.projectId !== id));
    setInvitations(prev => prev.filter(inv => inv.projectId !== id));
  }, []);

  // Secure Invitation Flow
  const sendProjectInvite = useCallback(
    (projectId: string, email: string, role: TeamRole = 'Member'): { success: boolean; message: string } => {
      if (!currentUser) return { success: false, message: 'Authentication required.' };
      
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) return { success: false, message: 'Email address is required.' };

      if (cleanEmail === currentUser.email.toLowerCase()) {
        return { success: false, message: 'You cannot invite yourself.' };
      }

      // Verify project exists and currentUser is a member/owner
      const project = allProjects.find(p => p.id === projectId);
      if (!project) return { success: false, message: 'Project not found.' };

      if (project.ownerId !== currentUser.id && !project.memberIds.includes(currentUser.id)) {
        return { success: false, message: 'You do not have permission to invite members to this project.' };
      }

      // Check if user with this email exists in registered users
      const targetUser = findUserByEmail(cleanEmail);
      if (!targetUser) {
        return {
          success: false,
          message: `No user found with email "${cleanEmail}". They must first create an account on Chronos before receiving project invites.`
        };
      }

      // Check if user is already a member
      if (project.memberIds.includes(targetUser.id)) {
        return { success: false, message: `${targetUser.name} is already a member of this project.` };
      }

      // Check if already invited and pending
      const alreadyPending = invitations.some(
        inv => inv.projectId === projectId && inv.invitedEmail.toLowerCase() === cleanEmail && inv.status === 'PENDING'
      );
      if (alreadyPending) {
        return { success: false, message: `An invitation is already pending for ${cleanEmail}.` };
      }

      const newInvite: ProjectInvitation = {
        id: `inv-${Date.now()}`,
        projectId: project.id,
        projectName: project.name,
        projectKey: project.key,
        projectColor: project.color,
        invitedEmail: cleanEmail,
        invitedByUserId: currentUser.id,
        invitedByName: currentUser.name,
        invitedByEmail: currentUser.email,
        role,
        status: 'PENDING',
        createdAt: new Date().toISOString().split('T')[0]
      };

      setInvitations(prev => [newInvite, ...prev]);
      return { success: true, message: `Invitation successfully sent to ${targetUser.name} (${cleanEmail}).` };
    },
    [currentUser, allProjects, findUserByEmail, invitations]
  );

  const acceptInvite = useCallback(
    (inviteId: string) => {
      if (!currentUser) return;

      const invite = invitations.find(i => i.id === inviteId);
      if (!invite || invite.status !== 'PENDING') return;

      // Update invite status to ACCEPTED
      setInvitations(prev => prev.map(i => (i.id === inviteId ? { ...i, status: 'ACCEPTED' } : i)));

      // Add currentUser to project's memberIds
      setAllProjects(prev =>
        prev.map(p =>
          p.id === invite.projectId
            ? { ...p, memberIds: [...new Set([...p.memberIds, currentUser.id])] }
            : p
        )
      );

      setCurrentProjectId(invite.projectId);
    },
    [currentUser, invitations, setCurrentProjectId]
  );

  const declineInvite = useCallback((inviteId: string) => {
    setInvitations(prev => prev.map(i => (i.id === inviteId ? { ...i, status: 'DECLINED' } : i)));
  }, []);

  // Task Actions
  const createTask = useCallback(
    (data: Omit<TeamTask, 'id' | 'taskNumber' | 'createdAt' | 'updatedAt' | 'comments'>): TeamTask | null => {
      if (!currentUser || !currentProject) return null;

      // Verify user is member of project
      if (currentProject.ownerId !== currentUser.id && !currentProject.memberIds.includes(currentUser.id)) {
        return null;
      }

      const nextNumber = Math.max(0, ...allTasks.filter(t => t.projectId === currentProject.id).map(t => t.taskNumber || 100)) + 1;
      const now = new Date().toISOString();

      const newTask: TeamTask = {
        ...data,
        projectId: currentProject.id,
        id: `task-${Date.now()}`,
        taskNumber: nextNumber,
        comments: [],
        createdAt: now.split('T')[0],
        updatedAt: now
      };

      setAllTasks(prev => [newTask, ...prev]);
      return newTask;
    },
    [currentUser, currentProject, allTasks]
  );

  const updateTask = useCallback((data: Partial<TeamTask> & { id: string }) => {
    const now = new Date().toISOString();
    setAllTasks(prev =>
      prev.map(t => (t.id === data.id ? { ...t, ...data, updatedAt: now } : t))
    );
  }, []);

  const moveTask = useCallback((taskId: string, targetColumnId: KanbanColumnId, targetIndex?: number) => {
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
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setAllTasks(prev => prev.filter(t => t.id !== taskId));
  }, []);

  const addComment = useCallback(
    (taskId: string, text: string) => {
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

      setAllTasks(prev =>
        prev.map(t =>
          t.id === taskId
            ? { ...t, comments: [...(t.comments || []), newComment], updatedAt: new Date().toISOString() }
            : t
        )
      );
    },
    [currentUser]
  );

  const toggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    setAllTasks(prev =>
      prev.map(t => {
        if (t.id !== taskId) return t;
        const subtasks = t.subtasks.map(st =>
          st.id === subtaskId ? { ...st, completed: !st.completed } : st
        );
        return { ...t, subtasks, updatedAt: new Date().toISOString() };
      })
    );
  }, []);

  const addSubtask = useCallback((taskId: string, title: string) => {
    if (!title.trim()) return;
    setAllTasks(prev =>
      prev.map(t => {
        if (t.id !== taskId) return t;
        const newSubtask = {
          id: `st-${Date.now()}`,
          title: title.trim(),
          completed: false
        };
        return { ...t, subtasks: [...t.subtasks, newSubtask], updatedAt: new Date().toISOString() };
      })
    );
  }, []);

  const deleteSubtask = useCallback((taskId: string, subtaskId: string) => {
    setAllTasks(prev =>
      prev.map(t => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          subtasks: t.subtasks.filter(st => st.id !== subtaskId),
          updatedAt: new Date().toISOString()
        };
      })
    );
  }, []);

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
