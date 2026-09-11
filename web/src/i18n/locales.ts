export type Locale = 'en' | 'ru';

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALES: Locale[] = ['en', 'ru'];
export const LOCALE_STORAGE_KEY = 'shelf-ready-locale';

export function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'ru';
}

export function readStoredLocale(): Locale {
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(raw)) return raw;
  } catch {
    /* private mode / blocked storage */
  }
  return DEFAULT_LOCALE;
}

export function writeStoredLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* private mode / blocked storage */
  }
}
