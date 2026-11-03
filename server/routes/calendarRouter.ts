import { Router, Request, Response } from 'express';
import { db } from '../db.ts';
import { googleCalendarService } from '../services/googleCalendarService.ts';
import type { CalendarEvent, Task } from '../../src/types/index.ts';

const router = Router();

// GET all calendar events combined with scheduled tasks
router.get('/events', (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;
  const rawEvents = db.getCalendarEvents();
  const tasks = db.getTasks();

  // Convert any scheduled task that doesn't have an explicit event into a calendar view item
  const taskEvents: CalendarEvent[] = tasks
    .filter(t => t.dueDate && !rawEvents.some(e => e.taskId === t.id))
    .map(t => {
      const startTime = t.dueTime ? `${t.dueDate}T${t.dueTime}:00` : `${t.dueDate}T09:00:00`;
      const duration = t.durationMinutes || 45;
      const endTime = t.dueTime 
        ? new Date(new Date(startTime).getTime() + duration * 60000).toISOString()
        : `${t.dueDate}T10:00:00`;

      return {
        id: `task-cal-${t.id}`,
        title: `[Task] ${t.title}`,
        description: t.description,
        startTime,
        endTime,
        category: t.category,
        isGoogleEvent: t.syncedToGoogle,
        taskId: t.id
      };
    });

  let combined = [...rawEvents, ...taskEvents];

  if (startDate && typeof startDate === 'string') {
    combined = combined.filter(e => e.startTime >= startDate);
  }
  if (endDate && typeof endDate === 'string') {
    combined = combined.filter(e => e.startTime <= endDate);
  }

  // Sort chronologically
  combined.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  res.json({ success: true, count: combined.length, data: combined });
});

// CREATE manual calendar event
router.post('/events', (req: Request, res: Response) => {
  const body = req.body;
  if (!body.title || !body.startTime || !body.endTime) {
    return res.status(400).json({ success: false, error: 'Title, startTime, and endTime are required' });
  }

  const newEvent: CalendarEvent = {
    id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    title: body.title,
    description: body.description || '',
    startTime: body.startTime,
    endTime: body.endTime,
    category: body.category || 'Work/Career',
    isGoogleEvent: Boolean(body.isGoogleEvent),
    location: body.location
  };

  const saved = db.addCalendarEvent(newEvent);
  res.status(201).json({ success: true, data: saved });
});

// DELETE calendar event
router.delete('/events/:id', (req: Request, res: Response) => {
  const eventId = req.params.id;

  // If synthetic task event id e.g. task-cal-task-123
  if (eventId.startsWith('task-cal-')) {
    const taskId = eventId.replace('task-cal-', '');
    db.updateTask(taskId, { dueDate: undefined as any, dueTime: undefined });
    return res.json({ success: true, message: 'Scheduled task block cleared from calendar' });
  }

  const success = db.removeCalendarEvent(eventId);
  if (!success) {
    return res.status(404).json({ success: false, error: 'Event not found' });
  }
  res.json({ success: true, message: 'Event deleted' });
});

// CHECK CONFLICTS for a task
router.post('/check-conflicts', (req: Request, res: Response) => {
  const { taskId, dueDate, dueTime, durationMinutes } = req.body;
  let taskToCheck: Task;

  if (taskId) {
    const existing = db.getTaskById(taskId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    taskToCheck = {
      ...existing,
      dueDate: dueDate || existing.dueDate,
      dueTime: dueTime !== undefined ? dueTime : existing.dueTime,
      durationMinutes: durationMinutes ? Number(durationMinutes) : existing.durationMinutes
    };
  } else {
    taskToCheck = {
      id: 'temp',
      title: 'Scheduled Item',
      category: 'Work/Career',
      priority: 'Medium',
      status: 'todo',
      eisenhower: 'q2_not_urgent_important',
      dueDate: dueDate || new Date().toISOString().split('T')[0],
      dueTime: dueTime || '10:00',
      durationMinutes: Number(durationMinutes) || 45,
      subtasks: [],
      tags: [],
      syncedToGoogle: false,
      createdAt: '',
      updatedAt: ''
    };
  }

  const events = db.getCalendarEvents();
  const conflictResult = googleCalendarService.detectConflicts(taskToCheck, events);

  res.json({
    success: true,
    hasConflict: conflictResult.hasConflict,
    conflictingEvents: conflictResult.conflictingEvents
  });
});

// FIND OPTIMAL TIME SLOTS for a task
router.post('/suggest-slots', (req: Request, res: Response) => {
  const { durationMinutes = 45, targetDate } = req.body;
  const date = targetDate || new Date().toISOString().split('T')[0];
  const events = db.getCalendarEvents();

  const suggestions = googleCalendarService.findOptimalTimeSlots(
    Number(durationMinutes),
    date,
    events
  );

  res.json({ success: true, date, suggestions });
});

// GET direct Google Calendar 1-Click web creation URL for a task
router.get('/web-link/:taskId', (req: Request, res: Response) => {
  const task = db.getTaskById(req.params.taskId);
  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  const webUrl = googleCalendarService.generateGoogleCalendarWebUrl(task);
  res.json({ success: true, url: webUrl });
});

// EXPORT .ics iCalendar file
router.get('/export/ical', (_req: Request, res: Response) => {
  const tasks = db.getTasks();
  const events = db.getCalendarEvents();
  const icsData = googleCalendarService.generateICalendar(tasks, events);

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="chronos-schedule.ics"');
  res.send(icsData);
});

// Google OAuth / Credentials status
router.get('/auth-status', (_req: Request, res: Response) => {
  const auth = db.getGoogleAuth();
  res.json({
    success: true,
    isConnected: auth.isConnected,
    email: auth.email || (auth.isConnected ? 'user@gmail.com' : undefined),
    hasClientId: Boolean(process.env.GOOGLE_CLIENT_ID),
    hasClientSecret: Boolean(process.env.GOOGLE_CLIENT_SECRET),
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
  });
});

// Update Google OAuth simulation/connection
router.post('/auth-status', (req: Request, res: Response) => {
  const { isConnected, email } = req.body;
  db.setGoogleAuth({
    isConnected: Boolean(isConnected),
    email: email || (isConnected ? 'connected.user@gmail.com' : '')
  });
  res.json({ success: true, data: db.getGoogleAuth() });
});

// BIOLOGICAL ENERGY AUTO-SCHEDULING ENGINE
router.post('/auto-schedule', (req: Request, res: Response) => {
  const { targetDate = new Date().toISOString().split('T')[0] } = req.body;
  const tasks = db.getTasks().filter(t => t.status !== 'completed');
  const existingEvents = db.getCalendarEvents();

  const windowRanges = {
    'High Focus': [
      { start: '08:30', end: '10:00' },
      { start: '10:15', end: '11:45' },
      { start: '11:45', end: '12:30' }
    ],
    'Creative': [
      { start: '13:30', end: '15:00' },
      { start: '15:15', end: '16:30' }
    ],
    'Low Energy/Admin': [
      { start: '16:30', end: '17:30' },
      { start: '17:30', end: '18:30' }
    ]
  };

  const scheduledResults: { taskId: string; taskTitle: string; slot: string; energy: string }[] = [];
  const occupiedSlots = new Set<string>();

  existingEvents.forEach(e => {
    if (e.startTime.startsWith(targetDate)) {
      occupiedSlots.add(e.startTime.substring(11, 16));
    }
  });

  tasks.forEach(task => {
    if (task.dueTime && occupiedSlots.has(task.dueTime)) {
      return;
    }

    const energy = task.energyLevel || (task.priority === 'High' ? 'High Focus' : task.category === 'Personal Growth' ? 'Creative' : 'Low Energy/Admin');
    const availableWindows = windowRanges[energy] || windowRanges['High Focus'];

    for (const win of availableWindows) {
      if (!occupiedSlots.has(win.start)) {
        occupiedSlots.add(win.start);
        
        db.updateTask(task.id, {
          dueDate: targetDate,
          dueTime: win.start,
          syncedToGoogle: true
        });

        const newEvt: CalendarEvent = {
          id: `auto-cal-${task.id}-${Date.now()}`,
          title: `[${energy}] ${task.title}`,
          description: task.description || '',
          startTime: `${targetDate}T${win.start}:00`,
          endTime: `${targetDate}T${win.end}:00`,
          category: task.category,
          isGoogleEvent: true,
          taskId: task.id
        };
        db.addCalendarEvent(newEvt);

        scheduledResults.push({
          taskId: task.id,
          taskTitle: task.title,
          slot: `${win.start} - ${win.end}`,
          energy
        });
        break;
      }
    }
  });

  res.json({
    success: true,
    message: `Circadian schedule optimized: ${scheduledResults.length} tasks placed into biological peak energy windows.`,
    targetDate,
    scheduledCount: scheduledResults.length,
    scheduledTasks: scheduledResults
  });
});

// REAL-TIME CONFLICT RESOLUTION ENGINE WITH ATOMIC PERSISTENCE
router.post('/resolve-conflicts', (_req: Request, res: Response) => {
  const events = db.getCalendarEvents();
  const sorted = [...events].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  
  let resolvedCount = 0;
  const resolutions: { eventId: string; title: string; originalStart: string; newStart: string }[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    const currentEnd = new Date(current.endTime).getTime();
    const nextStart = new Date(next.startTime).getTime();

    // If next event starts before current event ends -> Overlap conflict
    if (nextStart < currentEnd) {
      const durationMs = new Date(next.endTime).getTime() - nextStart;
      const newStartTimeMs = currentEnd + (15 * 60 * 1000); // 15 min buffer
      const newEndTimeMs = newStartTimeMs + durationMs;

      const newStartIso = new Date(newStartTimeMs).toISOString().substring(0, 19);
      const newEndIso = new Date(newEndTimeMs).toISOString().substring(0, 19);

      resolutions.push({
        eventId: next.id,
        title: next.title,
        originalStart: next.startTime,
        newStart: newStartIso
      });

      // Persist the updated event in db
      db.updateCalendarEvent(next.id, {
        startTime: newStartIso,
        endTime: newEndIso
      });

      next.startTime = newStartIso;
      next.endTime = newEndIso;
      resolvedCount++;

      // If associated with a task, also update task dueTime
      if (next.taskId) {
        const timePart = newStartIso.substring(11, 16);
        db.updateTask(next.taskId, { dueTime: timePart });
      }
    }
  }

  res.json({
    success: true,
    message: resolvedCount > 0 
      ? `Successfully auto-resolved ${resolvedCount} temporal overlaps.`
      : 'All calendar slots are conflict-free.',
    resolvedCount,
    resolutions
  });
});

export default router;
