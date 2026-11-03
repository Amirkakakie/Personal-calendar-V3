import type { Task, CalendarEvent } from '../../src/types/index.ts';

export interface TimeSlotSuggestion {
  start: string; // YYYY-MM-DDTHH:mm
  end: string;
  durationMinutes: number;
  confidence: number;
  reason: string;
}

/**
 * Exponential Backoff Utility for External API calls (Google Calendar & Gemini)
 */
export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelayMs = 500,
  factor = 2
): Promise<T> {
  let attempt = 0;
  let delay = initialDelayMs;

  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      const status = error?.status || error?.statusCode || error?.response?.status;
      const isRateLimitedOrServerErr = status === 429 || status === 503 || status === 500;

      if (attempt >= maxRetries || !isRateLimitedOrServerErr) {
        throw error;
      }

      console.warn(`[Retry Mechanism] Attempt ${attempt} failed with ${status}. Backing off for ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= factor;
    }
  }

  throw new Error(`Exceeded max retries (${maxRetries})`);
}

export class GoogleCalendarService {
  /**
   * Formats a local date or string into an ISO representation without forcing UTC 'Z'
   * unless explicitly in UTC.
   */
  private formatIsoLocal(dateStr: string, timeStr?: string): { start: Date; end: Date } {
    let start: Date;
    if (timeStr) {
      start = new Date(`${dateStr}T${timeStr}:00`);
    } else {
      start = new Date(`${dateStr}T09:00:00`);
    }

    if (isNaN(start.getTime())) {
      start = new Date();
    }

    return {
      start,
      end: new Date(start.getTime() + 45 * 60000)
    };
  }

  /**
   * Generates a direct Google Calendar Web Link that opens Google Calendar prefilled with task details.
   * Format: https://calendar.google.com/calendar/render?action=TEMPLATE&text=...&dates=...&details=...
   */
  generateGoogleCalendarWebUrl(task: Task): string {
    const title = encodeURIComponent(`[${task.category}] ${task.title}`);
    const details = encodeURIComponent(
      `${task.description || ''}\n\nPriority: ${task.priority}\nQuadrant: ${task.eisenhower}\nSynced from Chronos AI Growth System`
    );

    const formatGCalDate = (d: Date) => {
      return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    let startIso: string;
    let endIso: string;

    const dateClean = (task.dueDate || new Date().toISOString().split('T')[0]).replace(/-/g, '');

    if (task.dueTime) {
      const startObj = new Date(`${task.dueDate}T${task.dueTime}:00`);
      const duration = task.durationMinutes || 45;
      const endObj = new Date(startObj.getTime() + duration * 60000);
      startIso = formatGCalDate(startObj);
      endIso = formatGCalDate(endObj);
    } else {
      // All day event format: YYYYMMDD/YYYYMMDD
      startIso = dateClean;
      const nextDay = new Date(new Date(task.dueDate || Date.now()).getTime() + 86400000)
        .toISOString()
        .split('T')[0]
        .replace(/-/g, '');
      endIso = nextDay;
    }

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${startIso}/${endIso}`;
  }

  /**
   * Generates standard RFC 5545 iCalendar (.ics) format string for exporting events
   */
  generateICalendar(tasks: Task[], events: CalendarEvent[]): string {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Chronos Personal Growth System//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Chronos Productivity & Goals'
    ];

    const formatIcsTime = (isoOrDate: string | Date) => {
      const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
      if (isNaN(d.getTime())) return new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    tasks.filter(t => t.dueDate).forEach(task => {
      const start = task.dueTime 
        ? `${task.dueDate}T${task.dueTime}:00` 
        : `${task.dueDate}T09:00:00`;
      const duration = task.durationMinutes || 45;
      const end = task.dueTime 
        ? new Date(new Date(`${task.dueDate}T${task.dueTime}:00`).getTime() + duration * 60000).toISOString()
        : `${task.dueDate}T10:00:00`;

      lines.push(
        'BEGIN:VEVENT',
        `UID:task-${task.id}@chronos.ai`,
        `DTSTAMP:${formatIcsTime(new Date())}`,
        `DTSTART:${formatIcsTime(start)}`,
        `DTEND:${formatIcsTime(end)}`,
        `SUMMARY:[${task.category}] ${task.title.replace(/\n/g, ' ')}`,
        `DESCRIPTION:${(task.description || '').replace(/\n/g, '\\n')}`,
        `STATUS:${task.status === 'completed' ? 'COMPLETED' : 'CONFIRMED'}`,
        'END:VEVENT'
      );
    });

    events.forEach(evt => {
      lines.push(
        'BEGIN:VEVENT',
        `UID:${evt.id}@chronos.ai`,
        `DTSTAMP:${formatIcsTime(new Date())}`,
        `DTSTART:${formatIcsTime(evt.startTime)}`,
        `DTEND:${formatIcsTime(evt.endTime)}`,
        `SUMMARY:${evt.title.replace(/\n/g, ' ')}`,
        `DESCRIPTION:${(evt.description || '').replace(/\n/g, '\\n')}`,
        'END:VEVENT'
      );
    });

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  /**
   * Conflict Detection: checks if a task's scheduled time overlaps with any existing calendar events
   */
  detectConflicts(task: Task, events: CalendarEvent[]): { hasConflict: boolean; conflictingEvents: CalendarEvent[] } {
    if (!task.dueDate || !task.dueTime) {
      return { hasConflict: false, conflictingEvents: [] };
    }

    const taskStart = new Date(`${task.dueDate}T${task.dueTime}:00`).getTime();
    const duration = task.durationMinutes || 45;
    const taskEnd = taskStart + duration * 60000;

    const conflicts = events.filter(evt => {
      if (evt.taskId === task.id || evt.id === task.googleCalendarEventId) return false;

      const evtStart = new Date(evt.startTime).getTime();
      const evtEnd = new Date(evt.endTime).getTime();

      return taskStart < evtEnd && taskEnd > evtStart;
    });

    return {
      hasConflict: conflicts.length > 0,
      conflictingEvents: conflicts
    };
  }

  /**
   * Smart Free-Slot Finder: Finds conflict-free time slots for an unscheduled task
   */
  findOptimalTimeSlots(
    durationMinutes: number, 
    targetDate: string, 
    events: CalendarEvent[],
    workHoursStart = 9, 
    workHoursEnd = 18
  ): TimeSlotSuggestion[] {
    const suggestions: TimeSlotSuggestion[] = [];

    const dayEvents = events
      .filter(e => e.startTime.startsWith(targetDate))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const candidateTimes = [
      { h: 9, m: 0, reason: 'Morning peak cognitive focus window' },
      { h: 10, m: 30, reason: 'Mid-morning uninterrupted flow block' },
      { h: 14, m: 0, reason: 'Early afternoon execution block' },
      { h: 15, m: 30, reason: 'Mid-afternoon work sprint' },
      { h: 16, m: 45, reason: 'End-of-day wrap-up slot' }
    ];

    for (const cand of candidateTimes) {
      const hh = String(cand.h).padStart(2, '0');
      const mm = String(cand.m).padStart(2, '0');
      const candStart = new Date(`${targetDate}T${hh}:${mm}:00`).getTime();
      const candEnd = candStart + durationMinutes * 60000;

      const workEndLimit = new Date(`${targetDate}T${workHoursEnd}:00:00`).getTime();
      if (candEnd > workEndLimit) continue;

      const hasOverlap = dayEvents.some(evt => {
        const eStart = new Date(evt.startTime).getTime();
        const eEnd = new Date(evt.endTime).getTime();
        return candStart < eEnd && candEnd > eStart;
      });

      if (!hasOverlap) {
        const endH = String(new Date(candEnd).getHours()).padStart(2, '0');
        const endM = String(new Date(candEnd).getMinutes()).padStart(2, '0');
        suggestions.push({
          start: `${targetDate}T${hh}:${mm}`,
          end: `${targetDate}T${endH}:${endM}`,
          durationMinutes,
          confidence: cand.h <= 11 ? 95 : 85,
          reason: cand.reason
        });
      }
    }

    return suggestions;
  }

  /**
   * Translates a Task into a Google Calendar API v3 Event resource with timezone fidelity
   */
  taskToGoogleEventResource(task: Task, timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC') {
    let startDateTime: string | undefined;
    let endDateTime: string | undefined;

    if (task.dueTime && task.dueDate) {
      const localStart = new Date(`${task.dueDate}T${task.dueTime}:00`);
      const duration = task.durationMinutes || 45;
      const localEnd = new Date(localStart.getTime() + duration * 60000);
      startDateTime = localStart.toISOString();
      endDateTime = localEnd.toISOString();
    }

    return {
      summary: `[${task.category}] ${task.title}`,
      description: `${task.description || ''}\n\nPriority: ${task.priority}\nQuadrant: ${task.eisenhower}\nGoal: ${task.goalId || 'General'}\nCreated via Chronos Personal Growth System`,
      start: startDateTime ? { dateTime: startDateTime, timeZone } : { date: task.dueDate },
      end: endDateTime ? { dateTime: endDateTime, timeZone } : { date: task.dueDate },
      colorId: task.category === 'Work/Career' ? '1' : task.category === 'Academic/Study' ? '2' : task.category === 'Health & Habits' ? '10' : '5',
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 15 },
          { method: 'popup', minutes: 60 }
        ]
      }
    };
  }
}

export const googleCalendarService = new GoogleCalendarService();
