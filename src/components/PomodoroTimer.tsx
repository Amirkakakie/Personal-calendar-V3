import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Play, 
  Pause, 
  RotateCcw, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Clock, 
  Flame
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api.ts';
import type { Task } from '../types/index.ts';
import { useI18n } from '../i18n/I18nContext.tsx';

interface PomodoroTimerProps {
  isOpen?: boolean;
  onClose?: () => void;
  tasks: Task[];
  onSessionComplete?: (taskId?: string, minutes?: number) => void;
}

type TimerMode = 'pomodoro' | 'short_break' | 'long_break';

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
  isOpen,
  onClose,
  tasks,
  onSessionComplete
}) => {
  const { t, locale, formatNumber } = useI18n();
  const isModal = isOpen !== undefined;
  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Time configurations in seconds
  const modeDurations = {
    pomodoro: 25 * 60,
    short_break: 5 * 60,
    long_break: 15 * 60
  };

  const [timeLeft, setTimeLeft] = useState(modeDurations.pomodoro);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<any>(null);

  // Web Audio synth chime
  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3); // A5

      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 1.2);
    } catch (err) {
      console.warn('Audio chime unsupported:', err);
    }
  };

  useEffect(() => {
    if (tasks.length > 0 && !selectedTaskId) {
      const firstActive = tasks.find(t => t.status !== 'completed');
      if (firstActive) setSelectedTaskId(firstActive.id);
    }
  }, [tasks, selectedTaskId]);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleCompleteSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode, selectedTaskId]);

  const handleCompleteSession = async () => {
    setIsRunning(false);
    playChime();
    confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });

    if (mode === 'pomodoro') {
      const minutesCompleted = 25;
      try {
        if (selectedTaskId) {
          await api.recordPomodoro(selectedTaskId, minutesCompleted);
        }
      } catch (err) {
        console.error('Failed to log pomodoro:', err);
      }

      if (onSessionComplete) {
        onSessionComplete(selectedTaskId, minutesCompleted);
      }
    }
  };

  const switchMode = (newMode: TimerMode) => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(modeDurations[newMode]);
  };

  const toggleStart = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(modeDurations[mode]);
  };

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const rawFormattedTime = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  const formattedTime = locale === 'fa' 
    ? rawFormattedTime.replace(/[0-9]/g, w => ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'][+w])
    : rawFormattedTime;

  const totalDuration = modeDurations[mode];
  const progressPercent = ((totalDuration - timeLeft) / totalDuration) * 100;

  if (isModal && !isOpen) return null;

  return (
    <div className={isModal ? 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn' : 'w-full'}>
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        {isModal && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 end-4 p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {locale === 'fa' ? 'تایمر تمرکز عمیق پومودورو' : 'Pomodoro Deep Focus'}
              </h3>
              <p className="text-[11px] text-neutral-400">
                {locale === 'fa' ? 'بلوک‌های ۲۵ دقیقه‌ای تمرکز بدون وقفه' : 'Scientifically proven 25m interval'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
            title={soundEnabled ? 'Mute' : 'Unmute'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-neutral-500" />}
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex p-1 bg-neutral-800 rounded-xl mb-6">
          <button
            onClick={() => switchMode('pomodoro')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              mode === 'pomodoro'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {locale === 'fa' ? '۲۵ دقیقه تمرکز' : '25m Focus'}
          </button>
          <button
            onClick={() => switchMode('short_break')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              mode === 'short_break'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {locale === 'fa' ? '۵ دقیقه استراحت' : '5m Break'}
          </button>
          <button
            onClick={() => switchMode('long_break')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              mode === 'long_break'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {locale === 'fa' ? '۱۵ دقیقه طولانی' : '15m Long'}
          </button>
        </div>

        {/* Circular Clock Display */}
        <div className="flex flex-col items-center justify-center my-6">
          <div className="relative w-48 h-48 flex items-center justify-center">
            {/* SVG Progress Circle */}
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="88"
                className="stroke-neutral-800 fill-transparent"
                strokeWidth="8"
              />
              <circle
                cx="96"
                cy="96"
                r="88"
                className={`fill-transparent transition-all duration-300 ${
                  mode === 'pomodoro'
                    ? 'stroke-rose-500'
                    : mode === 'short_break'
                    ? 'stroke-emerald-500'
                    : 'stroke-indigo-500'
                }`}
                strokeWidth="8"
                strokeDasharray={2 * Math.PI * 88}
                strokeDashoffset={2 * Math.PI * 88 * (1 - progressPercent / 100)}
                strokeLinecap="round"
              />
            </svg>

            <div className="absolute flex flex-col items-center">
              <span className="text-4xl font-extrabold text-white font-mono tabular-nums" dir="ltr">
                {formattedTime}
              </span>
              <span className="text-xs text-neutral-400 capitalize mt-1">
                {mode === 'pomodoro' ? (locale === 'fa' ? 'کار عمیق' : 'Deep Work') : (locale === 'fa' ? 'استراحت' : 'Break')}
              </span>
            </div>
          </div>
        </div>

        {/* Linked Task Selector */}
        {tasks.length > 0 && (
          <div className="mb-6">
            <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
              {locale === 'fa' ? 'وظیفه در حال اجرا:' : 'Focused Action Item:'}
            </label>
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
            >
              <option value="">{locale === 'fa' ? '-- تمرکز عمومی بدون وظیفه --' : '-- General Focus Session --'}</option>
              {tasks.filter(t => t.status !== 'completed').map(task => (
                <option key={task.id} value={task.id}>
                  [{task.category}] {task.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Timer Control Buttons */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={resetTimer}
            className="p-3 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-white transition-colors"
            title={t('stopwatch.resetTimer')}
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={toggleStart}
            className={`px-8 py-3 rounded-xl text-sm font-bold text-white shadow-lg transition-all hover:scale-105 flex items-center gap-2 ${
              isRunning
                ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4" />
                <span>{t('stopwatch.pauseTimer')}</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>{t('stopwatch.startTimer')}</span>
              </>
            )}
          </button>

          <button
            onClick={handleCompleteSession}
            className="p-3 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-white transition-colors"
            title="Complete early"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
