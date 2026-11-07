import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  CheckSquare, 
  LayoutDashboard, 
  FolderGit2, 
  Calendar, 
  Grid, 
  Zap, 
  Clock, 
  Target, 
  Sparkles, 
  Users, 
  Plus, 
  Download, 
  ArrowRight, 
  X,
  Command
} from 'lucide-react';
import type { Task } from '../types/index.ts';
import type { NavigationTab } from './Sidebar.tsx';
import type { WorkspaceMode } from './Header.tsx';
import { useI18n } from '../i18n/I18nContext.tsx';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  workspaceMode: WorkspaceMode;
  onToggleWorkspaceMode: (mode: WorkspaceMode) => void;
  onOpenNewTask: () => void;
  onOpenNewGoal: () => void;
  onOpenPomodoro: () => void;
  onOpenAIDecompose: () => void;
  onExportIcal: () => void;
  onEditTask: (task: Task) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  tasks,
  currentTab,
  onSelectTab,
  workspaceMode,
  onToggleWorkspaceMode,
  onOpenNewTask,
  onOpenNewGoal,
  onOpenPomodoro,
  onOpenAIDecompose,
  onExportIcal,
  onEditTask
}) => {
  const { t, locale, direction } = useI18n();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global keydown handler for Cmd+K / Ctrl+K & Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Build list of navigable items and actions
  const quickActions = [
    {
      id: 'action-new-task',
      title: t('tasks.newTask'),
      category: 'Actions',
      icon: Plus,
      run: () => {
        onClose();
        onOpenNewTask();
      }
    },
    {
      id: 'action-new-goal',
      title: t('goals.newGoal'),
      category: 'Actions',
      icon: Target,
      run: () => {
        onClose();
        onOpenNewGoal();
      }
    },
    {
      id: 'action-pomodoro',
      title: locale === 'fa' ? 'شروع تایمر تمرکز پومودورو (۲۵ دقیقه)' : 'Start Pomodoro Focus Timer (25m)',
      category: 'Actions',
      icon: Clock,
      run: () => {
        onClose();
        onOpenPomodoro();
      }
    },
    {
      id: 'action-ai-decompose',
      title: t('accountMenu.aiDecompose'),
      category: 'Actions',
      icon: Sparkles,
      run: () => {
        onClose();
        onOpenAIDecompose();
      }
    },
    {
      id: 'action-export-ical',
      title: t('accountMenu.exportIcal'),
      category: 'Actions',
      icon: Download,
      run: () => {
        onClose();
        onExportIcal();
      }
    },
    {
      id: 'action-switch-workspace',
      title: workspaceMode === 'personal' ? 'Switch to Team Workspace' : 'Switch to Personal Workspace',
      category: 'Actions',
      icon: Users,
      run: () => {
        onClose();
        onToggleWorkspaceMode(workspaceMode === 'personal' ? 'team' : 'personal');
      }
    }
  ];

  const navigationItems: { id: string; title: string; category: string; icon: any; run: () => void }[] = [
    { id: 'nav-dashboard', title: t('nav.dashboard'), category: 'Navigation', icon: LayoutDashboard, run: () => { onToggleWorkspaceMode('personal'); onSelectTab('dashboard'); onClose(); } },
    { id: 'nav-tasks', title: t('nav.tasks'), category: 'Navigation', icon: CheckSquare, run: () => { onToggleWorkspaceMode('personal'); onSelectTab('tasks'); onClose(); } },
    { id: 'nav-projects', title: t('nav.projects'), category: 'Navigation', icon: FolderGit2, run: () => { onToggleWorkspaceMode('personal'); onSelectTab('projects'); onClose(); } },
    { id: 'nav-calendar', title: t('nav.calendar'), category: 'Navigation', icon: Calendar, run: () => { onToggleWorkspaceMode('personal'); onSelectTab('calendar'); onClose(); } },
    { id: 'nav-eisenhower', title: t('nav.eisenhower'), category: 'Navigation', icon: Grid, run: () => { onToggleWorkspaceMode('personal'); onSelectTab('eisenhower'); onClose(); } },
    { id: 'nav-skills', title: t('nav.skills'), category: 'Navigation', icon: Zap, run: () => { onToggleWorkspaceMode('personal'); onSelectTab('skills'); onClose(); } },
    { id: 'nav-stopwatch', title: t('nav.stopwatch'), category: 'Navigation', icon: Clock, run: () => { onToggleWorkspaceMode('personal'); onSelectTab('stopwatch'); onClose(); } },
    { id: 'nav-goals', title: t('nav.goals'), category: 'Navigation', icon: Target, run: () => { onToggleWorkspaceMode('personal'); onSelectTab('goals'); onClose(); } },
    { id: 'nav-coach', title: t('nav.coach'), category: 'Navigation', icon: Sparkles, run: () => { onToggleWorkspaceMode('personal'); onSelectTab('coach'); onClose(); } },
    { id: 'nav-team', title: 'Team Collaboration Board', category: 'Navigation', icon: Users, run: () => { onToggleWorkspaceMode('team'); onClose(); } }
  ];

  const matchingTasks = tasks
    .filter(t => !query.trim() || t.title.toLowerCase().includes(query.toLowerCase()) || (t.description && t.description.toLowerCase().includes(query.toLowerCase())))
    .slice(0, 5)
    .map(t => ({
      id: `task-${t.id}`,
      title: t.title,
      category: `Task: ${t.category}`,
      icon: CheckSquare,
      run: () => {
        onClose();
        onEditTask(t);
      }
    }));

  const cleanQuery = query.trim().toLowerCase();
  const filteredNav = navigationItems.filter(item => !cleanQuery || item.title.toLowerCase().includes(cleanQuery));
  const filteredActions = quickActions.filter(item => !cleanQuery || item.title.toLowerCase().includes(cleanQuery));

  const combinedItems = [
    ...matchingTasks,
    ...filteredActions,
    ...filteredNav
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, combinedItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + combinedItems.length) % Math.max(1, combinedItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (combinedItems[selectedIndex]) {
        combinedItems[selectedIndex].run();
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-neutral-800 bg-neutral-950/50">
          <Search className="w-4 h-4 text-neutral-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={locale === 'fa' ? 'جستجو در وظایف، ابزارها یا جابجایی بین بخش‌ها...' : 'Type a command, search tasks, or jump to view...'}
            className="flex-1 bg-transparent text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none"
          />
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
              ESC
            </span>
          </div>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {combinedItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-500">
              {locale === 'fa' ? 'هیچ موردی منطبق با جستجوی شما یافت نشد.' : 'No commands or tasks found matching your query.'}
            </div>
          ) : (
            combinedItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = selectedIndex === idx;

              return (
                <div
                  key={item.id}
                  onClick={() => item.run()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs transition-colors ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-medium'
                      : 'text-neutral-300 hover:bg-neutral-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-neutral-400'}`} />
                    <span className="truncate">{item.title}</span>
                  </div>
                  <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded shrink-0 ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-neutral-800 text-neutral-500'
                  }`}>
                    {item.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer instructions */}
        <div className="px-4 py-2 border-t border-neutral-800 bg-neutral-950/60 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
          </div>
          <span>Chronos Quick Navigator</span>
        </div>
      </div>
    </div>
  );
};
