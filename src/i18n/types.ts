export type Locale = 'en' | 'fa';
export type Direction = 'ltr' | 'rtl';
export type CalendarType = 'gregorian' | 'jalali';

export interface I18nContextType {
  locale: Locale;
  direction: Direction;
  calendarType: CalendarType;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  setCalendarType: (cal: CalendarType) => void;
  toggleCalendarType: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatNumber: (num: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (dateOrTime: Date | string) => string;
  formatDuration: (minutes: number) => string;
}
