import React from 'react';
import { useI18n } from '../i18n/I18nContext.tsx';
import { 
  LayoutDashboard, 
  CheckSquare, 
  FolderGit2, 
  Calendar, 
  Grid, 
  Zap, 
  Clock, 
  Target, 
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Settings
} from 'lucide-react';

export type NavigationTab = 
  | 'dashboard' 
  | 'tasks' 
  | 'projects'
  | 'eisenhower' 
  | 'calendar' 
  | 'skills' 
  | 'stopwatch' 
  | 'goals' 
  | 'coach';

interface SidebarProps {
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  collapsed,
  onToggleCollapse
}) => {
  const { t, direction } = useI18n();

  const navItems: { id: NavigationTab; labelKey: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
    { id: 'tasks', labelKey: 'nav.tasks', icon: CheckSquare },
    { id: 'projects', labelKey: 'nav.projects', icon: FolderGit2 },
    { id: 'calendar', labelKey: 'nav.calendar', icon: Calendar },
    { id: 'eisenhower', labelKey: 'nav.eisenhower', icon: Grid },
    { id: 'skills', labelKey: 'nav.skills', icon: Zap },
    { id: 'stopwatch', labelKey: 'nav.stopwatch', icon: Clock },
    { id: 'goals', labelKey: 'nav.goals', icon: Target },
    { id: 'coach', labelKey: 'nav.coach', icon: Sparkles },
  ];

  return (
    <aside 
      className={`fixed top-14 ${direction === 'rtl' ? 'right-0' : 'left-0'} bottom-0 z-30 flex flex-col border-e border-white/5 bg-neutral-950 transition-all duration-300 ease-in-out ${
        collapsed ? 'w-16' : 'w-64'
      } hidden lg:flex`}
    >
      <div className="flex-1 py-4 px-2 space-y-1 custom-scrollbar overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          const label = t(item.labelKey);
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              title={label}
              aria-label={label}
              className={`w-full flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'} py-2.5 rounded-xl text-[13px] font-medium transition-all group relative ${
                isActive 
                  ? 'bg-white/[0.04] text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] border border-white/5' 
                  : 'text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.02] border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-indigo-400' : 'text-neutral-500 group-hover:text-neutral-400'}`} />
              {!collapsed && (
                <span className="truncate opacity-100 transition-opacity duration-300 text-start flex-1">
                  {label}
                </span>
              )}
              {isActive && (
                <div className={`absolute ${direction === 'rtl' ? 'right-0 rounded-l-full' : 'left-0 rounded-r-full'} top-2 bottom-2 w-1 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]`} />
              )}
            </button>
          );
        })}
      </div>

      <div className="p-3 border-t border-white/5 bg-neutral-950/50 backdrop-blur-sm">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center p-2 rounded-lg text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.05] transition-all group"
        >
          {collapsed ? (
            direction === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
          ) : (
            <div className="flex items-center gap-2 w-full px-1">
              {direction === 'rtl' ? <ChevronRight className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> : <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />}
              <span className="text-[11px] font-semibold uppercase tracking-wider opacity-70">{t('common.collapse')}</span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};
