import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Grid, 
  Calendar, 
  FolderGit2, 
  Zap, 
  Clock, 
  Target, 
  Sparkles, 
  Plus, 
  X,
  MoreHorizontal
} from 'lucide-react';
import type { NavigationTab } from './Sidebar.tsx';
import { useI18n } from '../i18n/I18nContext.tsx';

interface MobileBottomNavProps {
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  onOpenNewTask: () => void;
  workspaceMode?: 'personal' | 'team';
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onTabChange,
  onOpenNewTask,
  workspaceMode = 'personal'
}) => {
  const { t, locale } = useI18n();
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);

  // If in team mode, the main tab is the team board, but users can still jump to personal tabs
  const primaryTabs: { id: NavigationTab; labelKey: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
    { id: 'tasks', labelKey: 'nav.tasks', icon: CheckSquare },
    { id: 'eisenhower', labelKey: 'nav.eisenhower', icon: Grid },
    { id: 'calendar', labelKey: 'nav.calendar', icon: Calendar },
  ];

  const secondaryTabs: { id: NavigationTab; labelKey: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
    { id: 'projects', labelKey: 'nav.projects', icon: FolderGit2, desc: locale === 'fa' ? 'پروژه‌ها و مخازن' : 'Projects & Milestones' },
    { id: 'skills', labelKey: 'nav.skills', icon: Zap, desc: locale === 'fa' ? 'درخت مهارت‌های بازی‌وار' : 'RPG Skill Mastery' },
    { id: 'stopwatch', labelKey: 'nav.stopwatch', icon: Clock, desc: locale === 'fa' ? 'کرنومتر و ردیابی ارزش زمان' : 'Time ROI & Billable Tracking' },
    { id: 'goals', labelKey: 'nav.goals', icon: Target, desc: locale === 'fa' ? 'اهداف و نتایج کلیدی OKR' : 'Strategic Goals & OKRs' },
    { id: 'coach', labelKey: 'nav.coach', icon: Sparkles, desc: locale === 'fa' ? 'مربی هوش مصنوعی جمینای' : 'Gemini AI Productivity Coach' },
  ];

  const isMoreActive = secondaryTabs.some(tab => tab.id === currentTab);

  return (
    <>
      {/* Bottom Sheet Drawer for Secondary Tabs */}
      {isMoreSheetOpen && (
        <div 
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-sm lg:hidden animate-fadeIn"
          onClick={() => setIsMoreSheetOpen(false)}
        >
          <div 
            className="bg-neutral-900 border-t border-neutral-800 rounded-t-3xl p-5 pb-8 max-h-[80vh] overflow-y-auto custom-scrollbar shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Handle */}
            <div className="w-12 h-1.5 bg-neutral-700/80 rounded-full mx-auto mb-4" />

            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/5">
              <div>
                <h3 className="text-sm font-bold text-white">
                  {locale === 'fa' ? 'ماژول‌ها و ابزارهای سیستم' : 'Productivity Modules'}
                </h3>
                <p className="text-xs text-neutral-400">
                  {locale === 'fa' ? 'دسترسی سریع به تمام بخش‌های کرونوس' : 'Quick access to all Chronos features'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMoreSheetOpen(false)}
                className="p-2 rounded-xl text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Action: New Task */}
            <button
              type="button"
              onClick={() => {
                setIsMoreSheetOpen(false);
                onOpenNewTask();
              }}
              className="w-full mb-4 flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{locale === 'fa' ? 'ایجاد وظیفه جدید' : 'Create New Task'}</span>
            </button>

            {/* Grid of Secondary Modules */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {secondaryTabs.map(item => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onTabChange(item.id);
                      setIsMoreSheetOpen(false);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-2xl text-start transition-all border ${
                      isActive 
                        ? 'bg-indigo-600/15 border-indigo-500/40 text-white shadow-sm'
                        : 'bg-neutral-950/60 border-neutral-800/80 text-neutral-300 hover:bg-neutral-800/50 hover:text-white'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-indigo-600 text-white' : 'bg-white/5 text-neutral-400'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-xs font-bold leading-tight truncate">
                        {t(item.labelKey)}
                      </span>
                      <span className="block text-[10px] text-neutral-400 truncate mt-0.5">
                        {item.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Fixed Ergonomic Bottom Tab Bar */}
      <nav 
        className="fixed bottom-0 inset-x-0 z-40 bg-neutral-950/95 backdrop-blur-xl border-t border-white/10 lg:hidden px-2 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] transition-all shadow-[0_-8px_24px_rgba(0,0,0,0.5)]"
        aria-label="Mobile Navigation"
      >
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {primaryTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-col items-center justify-center min-w-[56px] min-h-[54px] py-1.5 px-2 rounded-xl transition-all relative ${
                  isActive ? 'text-indigo-400 font-bold' : 'text-neutral-500 hover:text-neutral-300 font-medium'
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 w-6 h-0.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                )}
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-indigo-400' : ''}`} />
                <span className="text-xs mt-1 tracking-normal leading-tight truncate max-w-[64px]">
                  {t(tab.labelKey)}
                </span>
              </button>
            );
          })}

          {/* More Sheet Trigger */}
          <button
            type="button"
            onClick={() => setIsMoreSheetOpen(true)}
            className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition-all relative ${
              isMoreActive ? 'text-indigo-400 font-bold' : 'text-neutral-500 hover:text-neutral-300 font-medium'
            }`}
          >
            {isMoreActive && (
              <span className="absolute top-0 w-6 h-0.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
            )}
            <MoreHorizontal className={`w-5 h-5 transition-transform ${isMoreActive ? 'scale-110 text-indigo-400' : ''}`} />
            <span className="text-[10px] mt-1 tracking-tight leading-none truncate max-w-[64px]">
              {locale === 'fa' ? 'بیشتر' : 'More'}
            </span>
          </button>
        </div>
      </nav>
    </>
  );
};
