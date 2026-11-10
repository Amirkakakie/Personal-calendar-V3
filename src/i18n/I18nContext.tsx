import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { Locale, Direction, CalendarType, I18nContextType } from './types.ts';
import enTranslations from './locales/en.json';
import faTranslations from './locales/fa.json';

const STORAGE_LOCALE_KEY = 'chronos_locale';
const STORAGE_CALENDAR_KEY = 'chronos_calendar';

const dictionaries: Record<Locale, any> = {
  en: enTranslations,
  fa: faTranslations
};

const I18nContext = createContext<I18nContextType | null>(null);

// Persian digit mapping helper
const enToFaDigits = (str: string | number): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(str).replace(/[0-9]/g, w => persianDigits[+w]);
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize locale from localStorage or browser language
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_LOCALE_KEY) as Locale;
      if (saved === 'en' || saved === 'fa') return saved;
      if (navigator.language.startsWith('fa')) return 'fa';
    }
    return 'en';
  });

  // Calendar type (Gregorian or Jalali/Shamsi)
  const [calendarType, setCalendarTypeState] = useState<CalendarType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_CALENDAR_KEY) as CalendarType;
      if (saved === 'gregorian' || saved === 'jalali') return saved;
    }
    return locale === 'fa' ? 'jalali' : 'gregorian';
  });

  const direction: Direction = locale === 'fa' ? 'rtl' : 'ltr';

  // Apply HTML attributes when locale or direction changes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = direction;
      document.documentElement.lang = locale;
      if (direction === 'rtl') {
        document.documentElement.classList.add('rtl');
        document.documentElement.classList.remove('ltr');
      } else {
        document.documentElement.classList.add('ltr');
        document.documentElement.classList.remove('rtl');
      }
    }
  }, [direction, locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_LOCALE_KEY, newLocale);
      // Automatically default calendar to Jalali if switching to Persian, or keep user preference
      const defaultCal: CalendarType = newLocale === 'fa' ? 'jalali' : 'gregorian';
      setCalendarTypeState(defaultCal);
      localStorage.setItem(STORAGE_CALENDAR_KEY, defaultCal);
    }
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === 'en' ? 'fa' : 'en');
  }, [locale, setLocale]);

  const setCalendarType = useCallback((newCal: CalendarType) => {
    setCalendarTypeState(newCal);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_CALENDAR_KEY, newCal);
    }
  }, []);

  const toggleCalendarType = useCallback(() => {
    setCalendarType(calendarType === 'gregorian' ? 'jalali' : 'gregorian');
  }, [calendarType, setCalendarType]);

  // Nested translation resolver with parameter interpolation
  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const keys = key.split('.');
      let result: any = dictionaries[locale];

      for (const k of keys) {
        if (result && typeof result === 'object' && k in result) {
          result = result[k];
        } else {
          result = undefined;
          break;
        }
      }

      // Fallback to English dictionary if missing in current locale
      if (result === undefined && locale !== 'en') {
        let fallbackResult: any = dictionaries.en;
        for (const k of keys) {
          if (fallbackResult && typeof fallbackResult === 'object' && k in fallbackResult) {
            fallbackResult = fallbackResult[k];
          } else {
            fallbackResult = undefined;
            break;
          }
        }
        result = fallbackResult;
      }

      if (typeof result !== 'string') {
        console.warn('[i18n] Missing translation:', key, 'locale:', locale);
        return locale === 'fa' ? 'ترجمه در دسترس نیست' : 'Translation unavailable';
      }

      // Replace {{param}} placeholders
      if (params) {
        return result.replace(/\{\{(\w+)\}\}/g, (_match, paramKey) => {
          if (paramKey in params) {
            const val = params[paramKey];
            if (locale === 'fa' && typeof val === 'number') {
              return enToFaDigits(val);
            }
            return String(val);
          }
          return _match;
        });
      }

      return result;
    },
    [locale]
  );

  // Number localization
  const formatNumber = useCallback(
    (num: number, options?: Intl.NumberFormatOptions): string => {
      try {
        const intlLocale = locale === 'fa' ? 'fa-IR' : 'en-US';
        return new Intl.NumberFormat(intlLocale, options).format(num);
      } catch {
        return locale === 'fa' ? enToFaDigits(num) : String(num);
      }
    },
    [locale]
  );

  // Date localization supporting Gregorian and Jalali/Shamsi
  const formatDate = useCallback(
    (dateInput: Date | string, options?: Intl.DateTimeFormatOptions): string => {
      if (!dateInput) return '';
      const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      if (isNaN(date.getTime())) return String(dateInput);

      const defaultOptions: Intl.DateTimeFormatOptions = options || {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      };

      try {
        if (calendarType === 'jalali' || (locale === 'fa' && calendarType !== 'gregorian')) {
          // Use Intl Persian calendar extension
          return new Intl.DateTimeFormat('fa-IR-u-ca-persian', defaultOptions).format(date);
        }
        return new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-US', defaultOptions).format(date);
      } catch {
        return date.toLocaleDateString();
      }
    },
    [calendarType, locale]
  );

  // Time localization
  const formatTime = useCallback(
    (dateOrTime: Date | string): string => {
      if (!dateOrTime) return '';
      if (typeof dateOrTime === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(dateOrTime)) {
        // Simple HH:MM string
        if (locale === 'fa') {
          return enToFaDigits(dateOrTime.substring(0, 5));
        }
        return dateOrTime.substring(0, 5);
      }

      const date = typeof dateOrTime === 'string' ? new Date(dateOrTime) : dateOrTime;
      if (isNaN(date.getTime())) return String(dateOrTime);

      try {
        return new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: locale !== 'fa'
        }).format(date);
      } catch {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    },
    [locale]
  );

  const formatDuration = useCallback(
    (minutes: number): string => {
      const hrs = Math.floor(minutes / 60);
      const mins = minutes % 60;

      if (locale === 'fa') {
        if (hrs > 0 && mins > 0) {
          return `${enToFaDigits(hrs)} ساعت و ${enToFaDigits(mins)} دقیقه`;
        }
        if (hrs > 0) {
          return `${enToFaDigits(hrs)} ساعت`;
        }
        return `${enToFaDigits(mins)} دقیقه`;
      }

      if (hrs > 0 && mins > 0) {
        return `${hrs}h ${mins}m`;
      }
      if (hrs > 0) {
        return `${hrs}h`;
      }
      return `${mins}m`;
    },
    [locale]
  );

  const value = useMemo(
    () => ({
      locale,
      direction,
      calendarType,
      setLocale,
      toggleLocale,
      setCalendarType,
      toggleCalendarType,
      t,
      formatNumber,
      formatDate,
      formatTime,
      formatDuration
    }),
    [
      locale,
      direction,
      calendarType,
      setLocale,
      toggleLocale,
      setCalendarType,
      toggleCalendarType,
      t,
      formatNumber,
      formatDate,
      formatTime,
      formatDuration
    ]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
