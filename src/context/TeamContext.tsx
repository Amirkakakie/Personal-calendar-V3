import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { 
  TeamWorkspace, 
  TeamProject, 
  TeamTask, 
  TeamMember, 
  KanbanColumnId, 
  TeamTaskPriority,
  TeamRole
} from '../types/team.ts';
import { useAuth } from './AuthContext.tsx';

// Pre-seeded initial members
export const INITIAL_TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'user-amir',
    name: 'Amir Rezaei',
    email: 'amir@acme.dev',
    role: 'Admin',
    title: 'Lead Software Architect',
    avatarColor: 'from-violet-600 to-indigo-600',
    initials: 'AR',
    isOnline: true
  },
  {
    id: 'user-sarah',
    name: 'Sarah Jenkins',
    email: 'sarah@acme.dev',
    role: 'Member',
    title: 'Senior Product Designer',
    avatarColor: 'from-emerald-600 to-teal-600',
    initials: 'SJ',
    isOnline: true
  },
  {
    id: 'user-alex',
    name: 'Alex Chen',
    email: 'alex@acme.dev',
    role: 'Owner',
    title: 'VP of Engineering',
    avatarColor: 'from-sky-600 to-blue-700',
    initials: 'AC',
    isOnline: false
  },
  {
    id: 'user-elena',
    name: 'Elena Rostova',
    email: 'elena@acme.dev',
    role: 'Member',
    title: 'QA & Site Reliability Engineer',
    avatarColor: 'from-amber-600 to-orange-600',
    initials: 'ER',
    isOnline: true
  }
];

export const INITIAL_PROJECTS: TeamProject[] = [
  {
    id: 'proj-fintech',
    workspaceId: 'ws-main',
    name: 'Fintech Core Platform',
    key: 'FIN',
    description: 'High-throughput transactional ledger, Shetab & international payment routing, and real-time reconciliation.',
    color: '#6366f1',
    icon: 'ShieldCheck',
    memberIds: ['user-amir', 'user-sarah', 'user-alex', 'user-elena'],
    targetDate: '2026-06-30',
    createdAt: '2026-01-10'
  },
  {
    id: 'proj-mobile',
    workspaceId: 'ws-main',
    name: 'Mobile App v3.0 (iOS & Android)',
    key: 'MOB',
    description: 'Next-generation bi-directional React Native application with offline biometric wallet and instant push events.',
    color: '#10b981',
    icon: 'Smartphone',
    memberIds: ['user-amir', 'user-sarah'],
    targetDate: '2026-05-15',
    createdAt: '2026-02-01'
  },
  {
    id: 'proj-design',
    workspaceId: 'ws-main',
    name: 'Design System & UI Tokens',
    key: 'DSK',
    description: 'Bilingual typography foundation (Vazirmatn + Inter), accessible contrast palettes, and cross-platform UI primitives.',
    color: '#8b5cf6',
    icon: 'Palette',
    memberIds: ['user-sarah', 'user-elena'],
    targetDate: '2026-04-20',
    createdAt: '2026-02-15'
  }
];

export const INITIAL_TASKS: TeamTask[] = [
  {
    id: 'task-101',
    taskNumber: 101,
    projectId: 'proj-fintech',
    columnId: 'in_progress',
    title: 'Refactor high-frequency ledger matching engine to memory-mapped buffer',
    description: 'Optimize order matching and double-entry transaction posting to handle 15,000 tx/sec with p99 latency < 4ms.',
    priority: 'urgent',
    assigneeId: 'user-amir',
    dueDate: '2026-04-12',
    estimatedHours: 16,
    subtasks: [
      { id: 'st-1', title: 'Implement lock-free circular ring buffer', completed: true },
      { id: 'st-2', title: 'Add snapshotting to RocksDB persistent volume', completed: true },
      { id: 'st-3', title: 'Benchmark concurrent throughput under 100k loads', completed: false }
    ],
    tags: ['Backend', 'Performance', 'High-Priority'],
    comments: [
      {
        id: 'c-1',
        authorId: 'user-alex',
        authorName: 'Alex Chen',
        authorInitials: 'AC',
        authorColor: 'from-sky-600 to-blue-700',
        text: 'Benchmark looks super promising! Ensure we have circuit breakers for memory spikes.',
        createdAt: '2026-04-01T14:30:00Z'
      }
    ],
    order: 0,
    createdAt: '2026-03-28',
    updatedAt: '2026-04-01'
  },
  {
    id: 'task-102',
    taskNumber: 102,
    projectId: 'proj-fintech',
    columnId: 'todo',
    title: 'Implement dual-key transaction authorization with Hardware Security Module',
    description: 'Integrate PKCS#11 HSM signatures for settlements exceeding $50,000 USD to comply with international banking mandates.',
    priority: 'high',
    assigneeId: 'user-amir',
    dueDate: '2026-04-18',
    estimatedHours: 24,
    subtasks: [
      { id: 'st-4', title: 'Configure Cloud KMS & YubiHSM connector', completed: false },
      { id: 'st-5', title: 'Draft mutual TLS handshake policies', completed: false }
    ],
    tags: ['Security', 'Cryptography'],
    comments: [],
    order: 0,
    createdAt: '2026-03-30',
    updatedAt: '2026-03-30'
  },
  {
    id: 'task-103',
    taskNumber: 103,
    projectId: 'proj-fintech',
    columnId: 'in_review',
    title: 'Cross-currency exchange rate WebSocket feed caching with Redis cluster',
    description: 'Ensure sub-second ticker broadcast across LTR and RTL clients with automatic fallback to polling if socket disconnects.',
    priority: 'medium',
    assigneeId: 'user-elena',
    dueDate: '2026-04-08',
    estimatedHours: 8,
    subtasks: [
      { id: 'st-6', title: 'Deploy redis Sentinel cluster in staging', completed: true },
      { id: 'st-7', title: 'End-to-end load testing on 5,000 WebSocket connections', completed: true }
    ],
    tags: ['WebSockets', 'DevOps'],
    comments: [
      {
        id: 'c-2',
        authorId: 'user-amir',
        authorName: 'Amir Rezaei',
        authorInitials: 'AR',
        authorColor: 'from-violet-600 to-indigo-600',
        text: 'Tested the failover script; ping is solid at 12ms. Ready for QA signoff.',
        createdAt: '2026-04-02T09:15:00Z'
      }
    ],
    order: 0,
    createdAt: '2026-03-25',
    updatedAt: '2026-04-02'
  },
  {
    id: 'task-104',
    taskNumber: 104,
    projectId: 'proj-fintech',
    columnId: 'completed',
    title: 'Multi-tenant database schema isolation & row-level security audit',
    description: 'Implemented Postgres RLS policies ensuring tenant isolation across workspaces with zero cross-tenant leakage.',
    priority: 'high',
    assigneeId: 'user-alex',
    dueDate: '2026-03-20',
    estimatedHours: 32,
    subtasks: [
      { id: 'st-8', title: 'Write Postgres tenant_id session check triggers', completed: true },
      { id: 'st-9', title: 'Execute automated pentest penetration scenarios', completed: true }
    ],
    tags: ['Database', 'Compliance'],
    comments: [],
    order: 0,
    createdAt: '2026-03-10',
    updatedAt: '2026-03-21'
  },
  {
    id: 'task-105',
    taskNumber: 105,
    projectId: 'proj-fintech',
    columnId: 'backlog',
    title: 'Real-time settlement webhook retry queue with exponential backoff',
    description: 'Build a durable dead-letter queue with Kafka and BullMQ for partner bank notifications.',
    priority: 'low',
    assigneeId: 'user-elena',
    dueDate: '2026-05-10',
    estimatedHours: 12,
    subtasks: [],
    tags: ['Architecture', 'Queues'],
    comments: [],
    order: 0,
    createdAt: '2026-04-01',
    updatedAt: '2026-04-01'
  },
  {
    id: 'task-106',
    taskNumber: 106,
    projectId: 'proj-fintech',
    columnId: 'backlog',
    title: 'Bilingual PDF financial statement exporter with Shamsi (Jalali) date support',
    description: 'Enable export of monthly balance sheets in both Persian and English with native font embedding and high-res vector charts.',
    priority: 'medium',
    assigneeId: 'user-sarah',
    dueDate: '2026-05-02',
    estimatedHours: 18,
    subtasks: [
      { id: 'st-10', title: 'Configure pdfmake with Vazirmatn OTF font', completed: false }
    ],
    tags: ['Export', 'i18n'],
    comments: [],
    order: 1,
    createdAt: '2026-04-01',
    updatedAt: '2026-04-01'
  },
  // Mobile App Project Tasks
  {
    id: 'task-201',
    taskNumber: 201,
    projectId: 'proj-mobile',
    columnId: 'in_progress',
    title: 'Biometric FaceID & Fingerprint quick-unlock authentication flow',
    description: 'Implement secure keychain storage for refresh tokens with hardware biometric verification prompts.',
    priority: 'urgent',
    assigneeId: 'user-amir',
    dueDate: '2026-04-15',
    estimatedHours: 20,
    subtasks: [
      { id: 'st-201', title: 'iOS LocalAuthentication framework wrapper', completed: true },
      { id: 'st-202', title: 'Android BiometricPrompt API with StrongBox key', completed: false }
    ],
    tags: ['Mobile', 'Security'],
    comments: [],
    order: 0,
    createdAt: '2026-03-29',
    updatedAt: '2026-04-01'
  },
  {
    id: 'task-202',
    taskNumber: 202,
    projectId: 'proj-mobile',
    columnId: 'todo',
    title: 'RTL layout mirror adjustments for Persian navigation stack',
    description: 'Audit bottom tabs, header back gestures, and sheet modals to ensure smooth right-to-left animations.',
    priority: 'high',
    assigneeId: 'user-sarah',
    dueDate: '2026-04-20',
    estimatedHours: 14,
    subtasks: [
      { id: 'st-203', title: 'Fix swipe-to-pop navigation gesture for RTL', completed: false }
    ],
    tags: ['Mobile', 'UI/UX', 'RTL'],
    comments: [],
    order: 0,
    createdAt: '2026-03-31',
    updatedAt: '2026-03-31'
  },
  // Design System Project Tasks
  {
    id: 'task-301',
    taskNumber: 301,
    projectId: 'proj-design',
    columnId: 'in_review',
    title: 'Vazirmatn typographic scale tokens & line-height calibration',
    description: 'Publish Figma styles and Tailwind preset for proportional Persian line-heights without diacritic clipping.',
    priority: 'high',
    assigneeId: 'user-sarah',
    dueDate: '2026-04-10',
    estimatedHours: 12,
    subtasks: [
      { id: 'st-301', title: 'Export tokens to JSON style-dictionary', completed: true },
      { id: 'st-302', title: 'Review with frontend core team', completed: true }
    ],
    tags: ['Design System', 'Typography'],
    comments: [],
    order: 0,
    createdAt: '2026-03-20',
    updatedAt: '2026-04-02'
  }
];

const STORAGE_PROJECTS_KEY = 'chronos_team_projects_v2';
const STORAGE_TASKS_KEY = 'chronos_team_tasks_v2';
const STORAGE_MEMBERS_KEY = 'chronos_team_members_v2';
const STORAGE_CURRENT_PROJ_KEY = 'chronos_team_curr_proj_v2';

interface TeamFilter {
  search: string;
  assigneeId?: string;
  priority?: TeamTaskPriority | 'all';
  tag?: string;
}

interface TeamContextType {
  workspace: TeamWorkspace;
  projects: TeamProject[];
  currentProject: TeamProject;
  teamMembers: TeamMember[];
  tasks: TeamTask[];
  projectTasks: TeamTask[];
  filter: TeamFilter;
  setFilter: React.Dispatch<React.SetStateAction<TeamFilter>>;
  clearFilter: () => void;
  setCurrentProjectId: (id: string) => void;
  createProject: (project: Omit<TeamProject, 'id' | 'workspaceId' | 'createdAt'>) => TeamProject;
  updateProject: (project: Partial<TeamProject> & { id: string }) => void;
  deleteProject: (id: string) => void;
  createTask: (task: Omit<TeamTask, 'id' | 'taskNumber' | 'createdAt' | 'updatedAt' | 'comments'>) => TeamTask;
  updateTask: (task: Partial<TeamTask> & { id: string }) => void;
  moveTask: (taskId: string, targetColumnId: KanbanColumnId, targetIndex?: number) => void;
  deleteTask: (taskId: string) => void;
  addComment: (taskId: string, text: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  addSubtask: (taskId: string, title: string) => void;
  deleteSubtask: (taskId: string, subtaskId: string) => void;
  inviteMember: (name: string, email: string, role: TeamRole, title: string) => TeamMember;
  getMemberById: (id?: string) => TeamMember | undefined;
}

const TeamContext = createContext<TeamContextType | null>(null);

function generateInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const TeamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();

  // Load team members
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_MEMBERS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return INITIAL_TEAM_MEMBERS;
  });

  // Load projects
  const [projects, setProjects] = useState<TeamProject[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_PROJECTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return INITIAL_PROJECTS;
  });

  // Current active project ID
  const [currentProjectId, setCurrentProjectIdState] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_CURRENT_PROJ_KEY);
      if (stored && projects.some(p => p.id === stored)) return stored;
    } catch {
      // fallback
    }
    return projects[0]?.id || 'proj-fintech';
  });

  // Load tasks
  const [tasks, setTasks] = useState<TeamTask[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_TASKS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return INITIAL_TASKS;
  });

  // Filters
  const [filter, setFilter] = useState<TeamFilter>({
    search: '',
    assigneeId: undefined,
    priority: 'all',
    tag: undefined
  });

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_MEMBERS_KEY, JSON.stringify(teamMembers));
    } catch {}
  }, [teamMembers]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(projects));
    } catch {}
  }, [projects]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TASKS_KEY, JSON.stringify(tasks));
    } catch {}
  }, [tasks]);

  const setCurrentProjectId = useCallback((id: string) => {
    setCurrentProjectIdState(id);
    try {
      localStorage.setItem(STORAGE_CURRENT_PROJ_KEY, id);
    } catch {}
  }, []);

  const currentProject = useMemo(() => {
    return projects.find(p => p.id === currentProjectId) || projects[0] || INITIAL_PROJECTS[0];
  }, [projects, currentProjectId]);

  const workspace: TeamWorkspace = useMemo(() => {
    return {
      id: 'ws-main',
      name: 'Acme Product & Engineering',
      slug: 'acme-eng',
      description: 'Collaborative product development workspace for engineering, design, and product management.',
      ownerId: 'user-alex',
      members: teamMembers,
      createdAt: '2024-01-01'
    };
  }, [teamMembers]);

  const getMemberById = useCallback(
    (id?: string): TeamMember | undefined => {
      if (!id) return undefined;
      return teamMembers.find(m => m.id === id);
    },
    [teamMembers]
  );

  // Filter tasks for current project
  const projectTasks = useMemo(() => {
    return tasks
      .filter(t => t.projectId === currentProject.id)
      .map(t => ({
        ...t,
        assignee: getMemberById(t.assigneeId)
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
  }, [tasks, currentProject, filter, getMemberById]);

  // Project Actions
  const createProject = useCallback(
    (data: Omit<TeamProject, 'id' | 'workspaceId' | 'createdAt'>): TeamProject => {
      const newProj: TeamProject = {
        ...data,
        id: `proj-${Date.now()}`,
        workspaceId: workspace.id,
        createdAt: new Date().toISOString().split('T')[0]
      };
      setProjects(prev => [...prev, newProj]);
      setCurrentProjectId(newProj.id);
      return newProj;
    },
    [workspace.id, setCurrentProjectId]
  );

  const updateProject = useCallback((data: Partial<TeamProject> & { id: string }) => {
    setProjects(prev => prev.map(p => (p.id === data.id ? { ...p, ...data } : p)));
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects(prev => {
      const next = prev.filter(p => p.id !== id);
      if (next.length > 0) {
        setCurrentProjectId(next[0].id);
      }
      return next;
    });
    // Remove tasks associated with project
    setTasks(prev => prev.filter(t => t.projectId !== id));
  }, [setCurrentProjectId]);

  // Task Actions
  const createTask = useCallback(
    (data: Omit<TeamTask, 'id' | 'taskNumber' | 'createdAt' | 'updatedAt' | 'comments'>): TeamTask => {
      const nextNumber = Math.max(0, ...tasks.map(t => t.taskNumber || 100)) + 1;
      const now = new Date().toISOString();

      const newTask: TeamTask = {
        ...data,
        id: `task-${Date.now()}`,
        taskNumber: nextNumber,
        comments: [],
        createdAt: now.split('T')[0],
        updatedAt: now
      };

      setTasks(prev => [newTask, ...prev]);
      return newTask;
    },
    [tasks]
  );

  const updateTask = useCallback((data: Partial<TeamTask> & { id: string }) => {
    const now = new Date().toISOString();
    setTasks(prev =>
      prev.map(t => (t.id === data.id ? { ...t, ...data, updatedAt: now } : t))
    );
  }, []);

  const moveTask = useCallback((taskId: string, targetColumnId: KanbanColumnId, targetIndex?: number) => {
    setTasks(prev => {
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
    setTasks(prev => prev.filter(t => t.id !== taskId));
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

      setTasks(prev =>
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
    setTasks(prev =>
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
    setTasks(prev =>
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
    setTasks(prev =>
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

  const inviteMember = useCallback(
    (name: string, email: string, role: TeamRole, title: string): TeamMember => {
      const avatarColors = [
        'from-violet-600 to-indigo-600',
        'from-emerald-600 to-teal-600',
        'from-sky-600 to-blue-700',
        'from-amber-600 to-orange-600',
        'from-rose-600 to-pink-600',
        'from-fuchsia-600 to-purple-600'
      ];
      const randomColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

      const newMember: TeamMember = {
        id: `user-${Date.now()}`,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        title: title.trim() || 'Team Member',
        avatarColor: randomColor,
        initials: generateInitials(name),
        isOnline: true
      };

      setTeamMembers(prev => [...prev, newMember]);
      // Also automatically add to current project
      setProjects(prev =>
        prev.map(p =>
          p.id === currentProjectId
            ? { ...p, memberIds: [...new Set([...p.memberIds, newMember.id])] }
            : p
        )
      );

      return newMember;
    },
    [currentProjectId]
  );

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
        workspace,
        projects,
        currentProject,
        teamMembers,
        tasks,
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
        inviteMember,
        getMemberById
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
