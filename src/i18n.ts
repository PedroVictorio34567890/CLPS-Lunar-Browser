import { useSyncExternalStore } from 'react';
import { english } from './translations.ts';
import { formatCoordinates as originalCoordinates } from './lib/coordinates.ts';
import type { Coordinates } from './models';

export type Language = 'es' | 'en';
const storageKey = 'lunar-mission-language';
function initialLanguage(): Language {
  try { return localStorage.getItem(storageKey) === 'en' ? 'en' : 'es'; }
  catch { return 'es'; }
}
let currentLanguage = initialLanguage();
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const language = () => currentLanguage;
export const locale = () => currentLanguage === 'en' ? 'en-US' : 'es-ES';
export const useLanguage = () => useSyncExternalStore(subscribe, language, () => 'es' as Language);
export function setLanguage(next: Language) {
  currentLanguage = next;
  if (typeof document !== 'undefined') document.documentElement.lang = next;
  try { localStorage.setItem(storageKey, next); } catch { /* Language still works when storage is disabled. */ }
  listeners.forEach(listener => listener());
}
if (typeof document !== 'undefined') document.documentElement.lang = currentLanguage;

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Worker reports remain language-neutral data; translate their messages at display time.
const patterns = Object.entries(english).filter(([source]) => /\{\d+\}/.test(source)).map(([source, target]) => ({
  regex: new RegExp('^' + source.split(/\{\d+\}/).map(escapeRegex).join('(.+?)') + '$'), target,
}));
export function t(source: string, values: (string | number | undefined)[] = []): string {
  let message = source;
  if (currentLanguage === 'en') {
    message = english[source] ?? source;
    if (message === source && !values.length) {
      for (const { regex, target } of patterns) {
        const match = source.match(regex);
        if (match) return target.replace(/\{(\d+)\}/g, (_, index: string) => match[Number(index) + 1]);
      }
    }
  }
  return message.replace(/\{(\d+)\}/g, (placeholder, index: string) => values[Number(index)] === undefined ? placeholder : String(values[Number(index)]));
}
export function formatCoordinates(coordinates: Coordinates) {
  const result = originalCoordinates(coordinates);
  return currentLanguage === 'en' ? result.replace(/ O$/, ' W') : result;
}
