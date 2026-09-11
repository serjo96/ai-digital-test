import { en } from './en.ts';
import { ru } from './ru.ts';
import type { Locale } from './locales.ts';

type DeepStringify<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStringify<T[K]>;
};

export type Messages = DeepStringify<typeof en>;

const catalogs: Record<Locale, Messages> = {
  en: en as Messages,
  ru: ru as Messages,
};

export function messagesFor(locale: Locale): Messages {
  return catalogs[locale];
}

function lookup(messages: Messages, key: string): string | undefined {
  const parts = key.split('.');
  let current: unknown = messages;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : undefined;
}

/** Resolve a dotted key and substitute `{name}` placeholders. */
export function t(
  messages: Messages,
  key: string,
  vars?: Record<string, string | number>,
): string {
  let value = lookup(messages, key) ?? key;
  if (vars) {
    for (const [name, raw] of Object.entries(vars)) {
      value = value.replaceAll(`{${name}}`, String(raw));
    }
  }
  return value;
}
