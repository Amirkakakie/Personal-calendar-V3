import { Router, Request, Response } from 'express';
import { db } from '../db.ts';
import type { Task } from '../../src/types/index.ts';

const router = Router();

// GET all tasks (strictly scoped to authenticated user)
router.get('/', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { category, status, goalId, search } = req.query;
  let tasks = db.getTasks(userId);

  if (category && typeof category === 'string') {
    tasks = tasks.filter(t => t.category === category);
  }
  if (status && typeof status === 'string') {
    tasks = tasks.filter(t => t.status === status);
  }
  if (goalId && typeof goalId === 'string') {
    tasks = tasks.filter(t => t.goalId === goalId);
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    tasks = tasks.filter(t => 
      t.title.toLowerCase().includes(q) || 
      (t.description && t.description.toLowerCase().includes(q)) ||
      (Array.isArray(t.tags) && t.tags.some((tag: string) => tag.toLowerCase().includes(q)))
    );
  }

  res.json({ success: true, count: tasks.length, data: tasks });
});

// GET single task (verifies user ownership)
router.get('/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const task = db.getTaskById(req.params.id, userId);
  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found or access denied' });
  }
  res.json({ success: true, data: task });
});

// CREATE task (validates cross-resource ownership: project and goal)
router.post('/', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const body = req.body;
  if (!body.title || !body.category) {
    return res.status(400).json({ success: false, error: 'Title and category are required' });
  }

  // Cross-resource ownership check: projectId
  if (body.projectId) {
    const hasProjectAccess = db.verifyProjectAccess(body.projectId, userId);
    if (!hasProjectAccess) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You do not have permission to attach tasks to the specified project.'
      });
    }
  }

  // Cross-resource ownership check: goalId
  if (body.goalId) {
    const ownsGoal = db.verifyGoalOwnership(body.goalId, userId);
    if (!ownsGoal) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You do not own the referenced goal.'
      });
    }
  }

  const id = (body.id && typeof body.id === 'string' && body.id.trim()) 
    ? body.id.trim() 
    : `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const newTask: Task = {
    id,
    userId, // Server authoritative identity
    title: body.title.trim(),
    description: body.description?.trim() || '',
    category: body.category,
    priority: body.priority || 'Medium',
    status: body.status || 'todo',
    eisenhower: body.eisenhower || 'q2_not_urgent_important',
    dueDate: body.dueDate || new Date().toISOString().split('T')[0],
    dueTime: body.dueTime || undefined,
    durationMinutes: Number(body.durationMinutes) || 45,
    subtasks: Array.isArray(body.subtasks) ? body.subtasks : [],
    goalId: body.goalId || undefined,
    projectId: body.projectId || undefined,
    tags: Array.isArray(body.tags) ? body.tags : [],
    syncedToGoogle: Boolean(body.syncedToGoogle),
    recurrence: body.recurrence || 'none',
    pomodoroSessions: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // If syncedToGoogle requested, create corresponding Calendar Event in store
  if (newTask.syncedToGoogle && newTask.dueDate) {
    const eventId = `gcal-evt-${Date.now()}`;
    newTask.googleCalendarEventId = eventId;
    
    const startTime = newTask.dueTime 
      ? `${newTask.dueDate}T${newTask.dueTime}:00` 
      : `${newTask.dueDate}T09:00:00`;
    const endTime = newTask.dueTime 
      ? new Date(new Date(startTime).getTime() + newTask.durationMinutes * 60000).toISOString()
      : `${newTask.dueDate}T10:00:00`;

    db.addCalendarEvent({
      id: eventId,
      userId,
      title: `[${newTask.category}] ${newTask.title}`,
      description: newTask.description,
      startTime,
      endTime,
      category: newTask.category,
      isGoogleEvent: true,
      googleEventId: eventId,
      taskId: newTask.id
    }, userId);
  }

  const saved = db.createTask(newTask, userId);
  res.status(201).json({ success: true, data: saved });
});

// UPDATE task (ownership verified, cross-resource checks enforced)
router.put('/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const existing = db.getTaskById(req.params.id, userId);
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Task not found or access denied' });
  }

  // Cross-resource check on updated projectId
  if (req.body.projectId && req.body.projectId !== existing.projectId) {
    const hasProjectAccess = db.verifyProjectAccess(req.body.projectId, userId);
    if (!hasProjectAccess) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You do not have permission to attach tasks to the specified project.'
      });
    }
  }

  // Cross-resource check on updated goalId
  if (req.body.goalId && req.body.goalId !== existing.goalId) {
    const ownsGoal = db.verifyGoalOwnership(req.body.goalId, userId);
    if (!ownsGoal) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You do not own the referenced goal.'
      });
    }
  }

  const updated = db.updateTask(req.params.id, req.body, userId);
  if (!updated) {
    return res.status(404).json({ success: false, error: 'Task not found or access denied' });
  }

  if (updated.syncedToGoogle && updated.googleCalendarEventId) {
    const startTime = updated.dueTime 
      ? `${updated.dueDate}T${updated.dueTime}:00` 
      : `${updated.dueDate}T09:00:00`;
    const endTime = updated.dueTime 
      ? new Date(new Date(startTime).getTime() + updated.durationMinutes * 60000).toISOString()
      : `${updated.dueDate}T10:00:00`;

    db.removeCalendarEvent(updated.googleCalendarEventId, userId);
    db.addCalendarEvent({
      id: updated.googleCalendarEventId,
      userId,
      title: `[${updated.category}] ${updated.title}`,
      description: updated.description,
      startTime,
      endTime,
      category: updated.category,
      isGoogleEvent: true,
      googleEventId: updated.googleCalendarEventId,
      taskId: updated.id
    }, userId);
  }

  res.json({ success: true, data: updated });
});

// TOGGLE status (todo -> completed or vice versa)
router.patch('/:id/toggle', (req: Request, res: Response) => {
  const userId = req.user!.id;
  let task = db.getTaskById(req.params.id, userId);

  // If task was cached on client before initial sync, auto-recover from client body
  if (!task && req.body && req.body.title) {
    const recoveredTask: Task = {
      id: req.params.id,
      userId,
      title: String(req.body.title).trim(),
      description: req.body.description ? String(req.body.description).trim() : '',
      category: req.body.category || 'Work/Career',
      priority: req.body.priority || 'Medium',
      status: req.body.status || 'todo',
      eisenhower: req.body.eisenhower || 'q2_not_urgent_important',
      dueDate: req.body.dueDate || new Date().toISOString().split('T')[0],
      dueTime: req.body.dueTime,
      durationMinutes: Number(req.body.durationMinutes) || 45,
      subtasks: Array.isArray(req.body.subtasks) ? req.body.subtasks : [],
      goalId: req.body.goalId,
      projectId: req.body.projectId,
      tags: Array.isArray(req.body.tags) ? req.body.tags : [],
      syncedToGoogle: Boolean(req.body.syncedToGoogle),
      recurrence: req.body.recurrence || 'none',
      pomodoroSessions: req.body.pomodoroSessions || 0,
      createdAt: req.body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.createTask(recoveredTask, userId);
    task = recoveredTask;
  }

  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found or access denied' });
  }

  const nextStatus = task.status === 'completed' ? 'todo' : 'completed';
  const updated = db.updateTask(req.params.id, {
    status: nextStatus,
    completedAt: nextStatus === 'completed' ? new Date().toISOString() : undefined
  }, userId);

  res.json({ success: true, data: updated });
});

// TOGGLE subtask
router.patch('/:id/subtask/:subtaskId', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const task = db.getTaskById(req.params.id, userId);
  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found or access denied' });
  }

  const subtasks = task.subtasks.map((st: any) => {
    if (st.id === req.params.subtaskId) {
      return { ...st, completed: !st.completed };
    }
    return st;
  });

  const allCompleted = subtasks.length > 0 && subtasks.every((s: any) => s.completed);
  const updated = db.updateTask(req.params.id, {
    subtasks,
    status: allCompleted ? 'completed' : task.status
  }, userId);

  res.json({ success: true, data: updated });
});

// RECORD Pomodoro focus session for task
router.post('/:id/pomodoro', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const task = db.getTaskById(req.params.id, userId);
  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found or access denied' });
  }

  // Safe bounds: 1 to 180 minutes per session
  const parsedMin = Number(req.body.minutes);
  const minutes = (!isNaN(parsedMin) && parsedMin > 0)
    ? Math.min(180, Math.max(1, Math.floor(parsedMin)))
    : 25;

  db.recordPomodoro(minutes, userId);
  const updated = db.updateTask(req.params.id, {
    pomodoroSessions: (task.pomodoroSessions || 0) + 1
  }, userId);

  res.json({ success: true, data: updated, recordedMinutes: minutes });
});

// DELETE task (ownership verified)
router.delete('/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const existing = db.getTaskById(req.params.id, userId);
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Task not found or access denied' });
  }

  db.deleteTask(req.params.id, userId);
  res.json({ success: true, message: 'Task deleted successfully' });
});

export default router;
