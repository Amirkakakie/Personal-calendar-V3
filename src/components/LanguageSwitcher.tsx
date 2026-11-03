import React, { useState, useRef, useEffect } from 'react';
import { Languages, Check, Calendar, ChevronDown } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext.tsx';
import type { Locale, CalendarType } from '../i18n/types.ts';

export const LanguageSwitcher: React.FC = () => {
  const { locale, setLocale, calendarType, setCalendarType, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageSelect = (newLocale: Locale) => {
    setLocale(newLocale);
    setIsOpen(false);
  };

  const handleCalendarToggle = (e: React.MouseEvent, type: CalendarType) => {
    e.stopPropagation();
    setCalendarType(type);
  };

  return (
    <div className="relative inline-block text-start" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-800 text-neutral-200 text-xs font-medium border border-neutral-700/60 transition-all hover:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        title={t('header.language')}
        aria-expanded={isOpen}
      >
        <Languages className="w-3.5 h-3.5 text-indigo-400" />
        <span className="font-semibold">
          {locale === 'fa' ? 'فارسی' : 'EN'}
        </span>
        <span className="text-[10px] text-neutral-400 font-mono px-1 py-0.2 rounded bg-neutral-700/60">
          {calendarType === 'jalali' ? 'شمسی' : 'Greg'}
        </span>
        <ChevronDown className={`w-3 h-3 text-neutral-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute end-0 mt-2 w-56 rounded-xl bg-neutral-900 border border-neutral-800 shadow-xl shadow-black/50 py-1.5 z-50 animate-fadeIn">
          {/* Language Header */}
          <div className="px-3 py-1.5 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider border-b border-neutral-800 flex items-center justify-between">
            <span>{t('header.language')}</span>
            <span className="text-[10px] text-indigo-400 font-mono">i18n</span>
          </div>

          {/* English Option */}
          <button
            type="button"
            onClick={() => handleLanguageSelect('en')}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors ${
              locale === 'en'
                ? 'bg-indigo-600/15 text-indigo-300 font-semibold'
                : 'text-neutral-300 hover:bg-neutral-800/70'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-base leading-none">🇬🇧</span>
              <span>English (US)</span>
            </div>
            {locale === 'en' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
          </button>

          {/* Persian Option */}
          <button
            type="button"
            onClick={() => handleLanguageSelect('fa')}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors ${
              locale === 'fa'
                ? 'bg-indigo-600/15 text-indigo-300 font-semibold'
                : 'text-neutral-300 hover:bg-neutral-800/70'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-base leading-none">🇮🇷</span>
              <span className="font-medium">فارسی (Persian - RTL)</span>
            </div>
            {locale === 'fa' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
          </button>

          {/* Calendar System Switcher */}
          <div className="mt-1 pt-1 border-t border-neutral-800">
            <div className="px-3 py-1 text-[11px] font-semibold text-neutral-400 flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-neutral-500" />
              <span>{t('header.calendar')}</span>
            </div>

            <div className="p-1.5 grid grid-cols-2 gap-1 bg-neutral-950/60 mx-2 rounded-lg border border-neutral-800/60">
              <button
                type="button"
                onClick={(e) => handleCalendarToggle(e, 'gregorian')}
                className={`px-2 py-1 text-[11px] rounded font-medium text-center transition-all ${
                  calendarType === 'gregorian'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                }`}
              >
                {t('calendarToggle.gregorian')}
              </button>
              <button
                type="button"
                onClick={(e) => handleCalendarToggle(e, 'jalali')}
                className={`px-2 py-1 text-[11px] rounded font-medium text-center transition-all ${
                  calendarType === 'jalali'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                }`}
              >
                {t('calendarToggle.jalali')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
