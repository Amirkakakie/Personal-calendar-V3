import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  ExternalLink, 
  AlertTriangle, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  CheckCircle,
  Tag
} from 'lucide-react';
import { api } from '../services/api.ts';
import type { CalendarEvent, Task } from '../types/index.ts';

interface CalendarTimelineProps {
  events: CalendarEvent[];
  tasks: Task[];
  onOpenTaskModal?: () => void;
  onRefreshEvents?: () => void;
  onOpenGoogleWebLink?: (taskId: string) => void;
  onSelectSlotSuggestion?: (slot: any) => void;
  onOpenNewTaskModalWithTime?: (date: any, time: any) => void;
}

export const CalendarTimeline: React.FC<CalendarTimelineProps> = ({
  events,
  tasks,
  onOpenTaskModal,
  onRefreshEvents,
  onOpenGoogleWebLink,
  onSelectSlotSuggestion,
  onOpenNewTaskModalWithTime
}) => {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [slotSuggestions, setSlotSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);

  // Filter events for the selected date
  const dayEvents = events.filter(e => {
    return e.startTime.startsWith(selectedDate);
  }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  // Check for any internal overlaps in dayEvents
  const overlappingEventIds = new Set<string>();
  for (let i = 0; i < dayEvents.length; i++) {
    for (let j = i + 1; j < dayEvents.length; j++) {
      const e1Start = new Date(dayEvents[i].startTime).getTime();
      const e1End = new Date(dayEvents[i].endTime).getTime();
      const e2Start = new Date(dayEvents[j].startTime).getTime();
      const e2End = new Date(dayEvents[j].endTime).getTime();

      if (e1Start < e2End && e2Start < e1End) {
        overlappingEventIds.add(dayEvents[i].id);
        overlappingEventIds.add(dayEvents[j].id);
      }
    }
  }

  const handleFindSlots = async () => {
    setIsSuggesting(true);
    try {
      const suggestions = await api.suggestSlots(45, selectedDate);
      setSlotSuggestions(suggestions);
    } catch (err) {
      console.error('Failed to get slot suggestions:', err);
    } finally {
      setIsSuggesting(false);
    }
  };

  const getEventBadgeClass = (category?: string) => {
    switch (category) {
      case 'Work/Career': return 'border-blue-500/40 bg-blue-500/10 text-blue-300';
      case 'Academic/Study': return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
      case 'Personal Growth': return 'border-purple-500/40 bg-purple-500/10 text-purple-300';
      case 'Health & Habits': return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
      default: return 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300';
    }
  };

  const changeDay = (daysOffset: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + daysOffset);
    setSelectedDate(current.toISOString().split('T')[0]);
    setSlotSuggestions([]);
  };

  const formatTimeRange = (startIso: string, endIso: string) => {
    const s = new Date(startIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const e = new Date(endIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${s} - ${e}`;
  };

  return (
    <div className="chronos-card p-3.5 sm:p-5 lg:p-6 space-y-5 min-w-0">
      {/* Date Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.07]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Google Calendar Sync &amp; Schedule
            </h2>
            <p className="text-xs text-slate-400">
              Synchronized events, task time-blocks, and conflict avoidance engine.
            </p>
          </div>
        </div>

        {/* Date Navigator */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeDay(-1)}
            className="min-h-10 min-w-10 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-white/5"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setSlotSuggestions([]);
            }}
            className="app-input bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-medium w-full sm:w-auto"
          />

          <button
            onClick={() => changeDay(1)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setSelectedDate(new Date().toISOString().split('T')[0]);
              setSlotSuggestions([]);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            Today
          </button>
        </div>
      </div>

      {/* Action Banner: Smart Slots & Quick Schedule */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-800/40 border border-white/[0.07]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-xs text-slate-200">
            Schedule Optimizer: Find conflict-free open windows for deep work
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleFindSlots}
            disabled={isSuggesting}
            className="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>{isSuggesting ? 'Analyzing Calendar...' : 'Find Open Slots (45m)'}</span>
          </button>

          <button
            onClick={onOpenTaskModal}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Schedule Task</span>
          </button>
        </div>
      </div>

      {/* Suggestions Tray if active */}
      {slotSuggestions.length > 0 && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 space-y-2">
          <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            Recommended Conflict-Free Slots for {selectedDate}:
          </span>
          <div className="flex flex-wrap gap-2">
            {slotSuggestions.map((slot, sIdx) => (
              <span
                key={sIdx}
                className="px-2.5 py-1 rounded-md bg-emerald-900/60 border border-emerald-700 text-emerald-200 text-xs font-mono font-medium"
              >
                {slot}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Timeline Schedule List */}
      <div className="space-y-3 chronos-scroll">
        {dayEvents.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl text-slate-500">
            <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <p className="text-sm font-semibold text-slate-400">No events or tasks scheduled for this day.</p>
            <p className="text-xs text-slate-500 mt-1">
              Add a new task with due date or import from Google Calendar.
            </p>
            <button
              onClick={onOpenTaskModal}
              className="mt-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700"
            >
              + Create Scheduled Block
            </button>
          </div>
        ) : (
          dayEvents.map(event => {
            const hasConflict = overlappingEventIds.has(event.id);

            return (
              <div
                key={event.id}
                className={`p-3.5 rounded-xl border transition-all ${getEventBadgeClass(event.category)} ${
                  hasConflict ? 'ring-2 ring-amber-500/60' : ''
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-slate-900/60 text-slate-300 mt-0.5">
                      <Clock className="w-4 h-4" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white">
                          {event.title}
                        </span>
                        {event.isGoogleEvent && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            Google Calendar
                          </span>
                        )}
                        {hasConflict && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Time Conflict
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-300 flex-wrap">
                        <span className="font-mono text-slate-200 font-semibold">
                          {formatTimeRange(event.startTime, event.endTime)}
                        </span>
                        {event.category && (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-900/50 text-slate-300">
                            {event.category}
                          </span>
                        )}
                        {event.location && (
                          <span className="text-slate-400">
                            📍 {event.location}
                          </span>
                        )}
                      </div>

                      {event.description && (
                        <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 1-Click Google Calendar web link */}
                  {event.taskId && (
                    <a
                      href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&details=${encodeURIComponent(event.description || '')}&dates=${event.startTime.replace(/[-:]/g, '').split('.')[0]}Z/${event.endTime.replace(/[-:]/g, '').split('.')[0]}Z`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="self-end sm:self-center flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded bg-slate-900/60 hover:bg-slate-900 border border-slate-700/50 transition-colors"
                    >
                      <span>Open in GCal</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
