export type TeamRole = 'Owner' | 'Admin' | 'Member' | 'Viewer' | 'superadmin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  status?: 'active' | 'suspended';
  title: string;
  avatarColor: string;
  initials: string;
  joinedAt: string;
  lastLoginAt?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  title: string;
  avatarColor: string;
  initials: string;
  isOnline?: boolean;
}

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';

export interface ProjectInvitation {
  id: string;
  projectId: string;
  projectName: string;
  projectKey: string;
  projectColor: string;
  invitedEmail: string;
  invitedByUserId: string;
  invitedByName: string;
  invitedByEmail: string;
  role: TeamRole;
  status: InvitationStatus;
  createdAt: string;
}

export interface TeamWorkspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  ownerId: string;
  members: TeamMember[];
  createdAt: string;
}

export type KanbanColumnId = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'completed';

export interface KanbanColumnDef {
  id: KanbanColumnId;
  titleKey: string;
  fallbackTitle: string;
  color: string;
  badgeBg: string;
  borderColor: string;
}

export type TeamTaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TeamTaskSubtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface TeamTaskComment {
  id: string;
  authorId: string;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  text: string;
  createdAt: string;
}

export interface TeamTask {
  id: string;
  taskNumber: number;
  projectId: string;
  columnId: KanbanColumnId;
  title: string;
  description?: string;
  priority: TeamTaskPriority;
  assigneeId?: string;
  assignee?: TeamMember;
  dueDate?: string; // YYYY-MM-DD
  estimatedHours?: number;
  subtasks: TeamTaskSubtask[];
  tags: string[];
  comments: TeamTaskComment[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamProject {
  id: string;
  workspaceId: string;
  ownerId: string;
  ownerEmail: string;
  name: string;
  key: string; // e.g. "FIN", "APP", "SYS"
  description: string;
  color: string;
  icon: string;
  memberIds: string[];
  targetDate?: string;
  createdAt: string;
}
