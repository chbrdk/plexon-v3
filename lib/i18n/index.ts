import de from '../../locales/de.json';
import en from '../../locales/en.json';

export type Locale = 'de' | 'en';

export const DEFAULT_LOCALE: Locale = 'de';
export const SUPPORTED_LOCALES: Locale[] = ['de', 'en'];

const dictionaries: Record<Locale, Record<string, unknown>> = { de, en };

const getNestedValue = (source: Record<string, unknown> | undefined, path: string): unknown => {
  if (!source) return undefined;
  return path.split('.').reduce<unknown>(
    (acc, key) => (acc && typeof acc === 'object' && key in acc ? (acc as Record<string, unknown>)[key] : undefined),
    source
  );
};

const interpolate = (value: string, params?: Record<string, string | number>): string => {
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(params, key)) return String(params[key]);
    return match;
  });
};

export const normalizeLocale = (value?: string | null): Locale => {
  if (!value) return DEFAULT_LOCALE;
  const lower = value.toLowerCase();
  if (lower.startsWith('en')) return 'en';
  return 'de';
};

export const resolveLocale = (cookieLocale?: string | null, acceptLanguage?: string | null): Locale => {
  if (cookieLocale) return normalizeLocale(cookieLocale);
  if (acceptLanguage) {
    const primary = acceptLanguage.split(',')[0]?.trim();
    if (primary) return normalizeLocale(primary);
  }
  return DEFAULT_LOCALE;
};

export const createTranslator = (locale: Locale) => {
  const dictionary = (dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE]) as Record<string, unknown>;
  const fallback = dictionaries[DEFAULT_LOCALE] as Record<string, unknown>;
  return (key: string, params?: Record<string, string | number>): string => {
    const raw = getNestedValue(dictionary, key) ?? getNestedValue(fallback, key) ?? key;
    return interpolate(String(raw), params);
  };
};
