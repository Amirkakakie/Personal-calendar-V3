import { Router, Request, Response } from 'express';
import { db } from '../db.ts';
import type { Task } from '../../src/types/index.ts';

const router = Router();

// GET all tasks (filtered by user and optional query parameters)
router.get('/', (req: Request, res: Response) => {
  const userId = req.user?.id;
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

// GET single task
router.get('/:id', (req: Request, res: Response) => {
  const userId = req.user?.id;
  const task = db.getTaskById(req.params.id, userId);
  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }
  res.json({ success: true, data: task });
});

// CREATE task
router.post('/', (req: Request, res: Response) => {
  const userId = req.user?.id;
  const body = req.body;
  if (!body.title || !body.category) {
    return res.status(400).json({ success: false, error: 'Title and category are required' });
  }

  const id = `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const newTask: Task = {
    id,
    userId,
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

// UPDATE task
router.put('/:id', (req: Request, res: Response) => {
  const userId = req.user?.id;
  const updated = db.updateTask(req.params.id, req.body, userId);
  if (!updated) {
    return res.status(404).json({ success: false, error: 'Task not found' });
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
  const userId = req.user?.id;
  const task = db.getTaskById(req.params.id, userId);
  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
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
  const userId = req.user?.id;
  const task = db.getTaskById(req.params.id, userId);
  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
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
  const userId = req.user?.id;
  const task = db.getTaskById(req.params.id, userId);
  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  const minutes = Number(req.body.minutes) || 25;
  db.recordPomodoro(minutes, userId);
  const updated = db.updateTask(req.params.id, {
    pomodoroSessions: (task.pomodoroSessions || 0) + 1
  }, userId);

  res.json({ success: true, data: updated, recordedMinutes: minutes });
});

// DELETE task
router.delete('/:id', (req: Request, res: Response) => {
  const userId = req.user?.id;
  const success = db.deleteTask(req.params.id, userId);
  if (!success) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }
  res.json({ success: true, message: 'Task deleted successfully' });
});

export default router;
