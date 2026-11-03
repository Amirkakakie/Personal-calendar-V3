import React, { useState, useRef, useEffect } from 'react';
import { 
  User, 
  Users, 
  Settings, 
  Globe, 
  Calendar as CalendarIcon, 
  Flame, 
  Clock, 
  Sparkles, 
  Download, 
  Upload, 
  HardDrive, 
  HelpCircle, 
  LogOut, 
  LogIn, 
  Check, 
  ChevronRight,
  Shield,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useI18n } from '../i18n/I18nContext.tsx';
import { LocalStore } from '../services/storage.ts';
import type { ProductivityStats } from '../types/index.ts';

interface UserAccountMenuProps {
  stats: ProductivityStats | null;
  googleUser: any;
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
  onOpenGoogleGuide: () => void;
  onOpenPomodoro: () => void;
  onOpenAIDecompose: () => void;
  onExportIcal: () => void;
  onOpenAuthModal?: () => void;
  onDataRestored?: () => void;
}

export const UserAccountMenu: React.FC<UserAccountMenuProps> = ({
  stats,
  googleUser,
  onGoogleSignIn,
  onGoogleSignOut,
  onOpenGoogleGuide,
  onOpenPomodoro,
  onOpenAIDecompose,
  onExportIcal,
  onOpenAuthModal,
  onDataRestored
}) => {
  const { currentUser, isAuthenticated, logout, demoUsers, switchDemoUser } = useAuth();
  const { locale, setLocale, calendarType, setCalendarType, t, direction, formatNumber } = useI18n();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'main' | 'personas' | 'backup'>('main');
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveTab('main');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExportJSON = () => {
    try {
      const json = LocalStore.exportBackupJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `chronos-backup-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export backup:', err);
    }
  };

  const handleImportJSONClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = LocalStore.importBackupJSON(content);
        if (ok) {
          if (onDataRestored) onDataRestored();
          setIsOpen(false);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Hidden file input for JSON import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />

      {/* Profile Trigger Button */}
      {currentUser ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 p-1 rounded-xl hover:bg-neutral-800 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 group"
          title={`${currentUser.name} (${currentUser.role})`}
        >
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${currentUser.avatarColor} flex items-center justify-center text-white text-xs font-bold shadow-md shadow-indigo-500/10 group-hover:scale-105 transition-transform shrink-0`}>
            {currentUser.initials}
          </div>
        </button>
      ) : (
        <button
          type="button"
          onClick={onOpenAuthModal}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>{t('auth.signIn')}</span>
        </button>
      )}

      {/* Main Dropdown Menu */}
      {isOpen && currentUser && (
        <div 
          className={`absolute ${direction === 'rtl' ? 'left-0' : 'right-0'} mt-2 w-80 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* Header Profile Identity */}
          <div className="p-4 bg-gradient-to-b from-neutral-800/60 to-neutral-900 border-b border-neutral-800">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${currentUser.avatarColor} flex items-center justify-center text-white text-sm font-bold shadow-md shrink-0`}>
                {currentUser.initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-sm font-bold text-white truncate">{currentUser.name}</h4>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-indigo-400 border border-neutral-700 font-medium shrink-0">
                    {currentUser.role}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 truncate">{currentUser.email}</p>
                <p className="text-[11px] text-neutral-500 truncate mt-0.5">{currentUser.title}</p>
              </div>
            </div>

            {/* Quick Persona Switcher Bar */}
            <div className="mt-3 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-[11px]">
              <span className="text-neutral-400 font-medium flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-neutral-500" />
                <span>{t('accountMenu.switchPersona')}:</span>
              </span>
              <div className="flex items-center gap-1">
                {demoUsers.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => switchDemoUser(u.id)}
                    title={`${u.name} (${u.role})`}
                    className={`w-6 h-6 rounded-lg bg-gradient-to-tr ${u.avatarColor} flex items-center justify-center text-[10px] font-bold text-white transition-transform ${
                      u.id === currentUser.id ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100 hover:scale-105'
                    }`}
                  >
                    {u.initials}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-2 space-y-1 max-h-[70vh] overflow-y-auto text-xs">
            {/* Section 1: Display & Preferences */}
            <div className="px-2 py-1 text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
              {t('accountMenu.preferences')}
            </div>

            {/* Language Switcher */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-neutral-950/40 border border-neutral-800/60">
              <div className="flex items-center gap-2 text-neutral-300">
                <Globe className="w-4 h-4 text-indigo-400" />
                <span>{t('accountMenu.language')}</span>
              </div>
              <div className="flex items-center bg-neutral-900 border border-neutral-700/80 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setLocale('en')}
                  className={`px-2 py-0.5 text-[11px] font-semibold rounded ${locale === 'en' ? 'bg-indigo-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white'}`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLocale('fa')}
                  className={`px-2 py-0.5 text-[11px] font-semibold rounded ${locale === 'fa' ? 'bg-indigo-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white'}`}
                >
                  فا
                </button>
              </div>
            </div>

            {/* Calendar System Switcher */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-neutral-950/40 border border-neutral-800/60">
              <div className="flex items-center gap-2 text-neutral-300">
                <CalendarIcon className="w-4 h-4 text-emerald-400" />
                <span>{t('accountMenu.calendarType')}</span>
              </div>
              <div className="flex items-center bg-neutral-900 border border-neutral-700/80 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setCalendarType('gregorian')}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded ${calendarType === 'gregorian' ? 'bg-emerald-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white'}`}
                >
                  Gregorian
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarType('jalali')}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded ${calendarType === 'jalali' ? 'bg-emerald-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white'}`}
                >
                  شمسی
                </button>
              </div>
            </div>

            {/* Section 2: Productivity Tools */}
            <div className="pt-2 px-2 py-1 text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
              {t('accountMenu.quickTools')}
            </div>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenPomodoro();
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-start rounded-xl hover:bg-neutral-800/80 text-neutral-300 hover:text-white transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-rose-400" />
                <span>{t('accountMenu.focusTimer')}</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                25m
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenAIDecompose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-start rounded-xl hover:bg-neutral-800/80 text-neutral-300 hover:text-white transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <span>{t('accountMenu.aiDecompose')}</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">
                Gemini
              </span>
            </button>

            {/* Section 3: Cloud & Data Management */}
            <div className="pt-2 px-2 py-1 text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
              {t('accountMenu.integrations')}
            </div>

            {/* Google Calendar Connection Status */}
            <div className="px-3 py-2 rounded-xl bg-neutral-950/40 border border-neutral-800/60 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-neutral-300">
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                  <span>{t('accountMenu.googleCalendar')}</span>
                </div>
                {googleUser ? (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{t('header.connected')}</span>
                  </span>
                ) : (
                  <span className="text-[11px] text-neutral-500">Off</span>
                )}
              </div>

              {googleUser ? (
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-neutral-400 truncate max-w-[170px]">{googleUser.email}</span>
                  <button
                    type="button"
                    onClick={() => {
                      onGoogleSignOut();
                    }}
                    className="text-rose-400 hover:text-rose-300 font-medium"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onGoogleSignIn();
                    }}
                    className="flex-1 py-1 px-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-medium transition-colors text-center"
                  >
                    Connect
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenGoogleGuide();
                    }}
                    className="py-1 px-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-[11px] transition-colors"
                  >
                    Setup Guide
                  </button>
                </div>
              )}
            </div>

            {/* iCal Export */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onExportIcal();
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-start rounded-xl hover:bg-neutral-800/80 text-neutral-300 hover:text-white transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Download className="w-4 h-4 text-neutral-400" />
                <span>{t('accountMenu.exportIcal')}</span>
              </div>
            </button>

            {/* JSON Export / Backup */}
            <button
              type="button"
              onClick={handleExportJSON}
              className="w-full flex items-center justify-between px-3 py-2 text-start rounded-xl hover:bg-neutral-800/80 text-neutral-300 hover:text-white transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <HardDrive className="w-4 h-4 text-neutral-400" />
                <span>{t('accountMenu.exportBackup')}</span>
              </div>
              <span className="text-[10px] text-neutral-500 font-mono">.json</span>
            </button>

            {/* JSON Import / Restore */}
            <button
              type="button"
              onClick={handleImportJSONClick}
              className="w-full flex items-center justify-between px-3 py-2 text-start rounded-xl hover:bg-neutral-800/80 text-neutral-300 hover:text-white transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Upload className="w-4 h-4 text-neutral-400" />
                <span>{t('accountMenu.importBackup')}</span>
              </div>
            </button>
          </div>

          {/* Footer: Logout & Account Switch */}
          <div className="p-2 border-t border-neutral-800 bg-neutral-950/60 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                if (onOpenAuthModal) onOpenAuthModal();
              }}
              className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white rounded-lg transition-colors"
            >
              {t('accountMenu.switchAccount')}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t('auth.logout')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
