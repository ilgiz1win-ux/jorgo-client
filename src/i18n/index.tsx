import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { en } from './en';
import { kk } from './kk';
import { ky, TKey } from './ky';
import { ru } from './ru';
import { uz } from './uz';

export type Lang = 'ky' | 'ru' | 'en' | 'uz' | 'kk';
export const LANGS: { id: Lang; short: string; name: string }[] = [
  { id: 'ky', short: 'КЫР', name: 'Кыргызча' },
  { id: 'ru', short: 'РУС', name: 'Русский' },
  { id: 'en', short: 'ENG', name: 'English' },
  { id: 'uz', short: 'UZB', name: "O'zbekcha" },
  { id: 'kk', short: 'ҚАЗ', name: 'Қазақша' },
];

const DICTS: Record<Lang, Record<TKey, string>> = { ky, ru, en, uz, kk };
const isLang = (v: unknown): v is Lang => v === 'ky' || v === 'ru' || v === 'en' || v === 'uz' || v === 'kk';
const STORAGE_KEY = 'jorgo.lang';

// Биринчи жолу: телефондун тили боюнча (орус, өзбек, казак, англис), болбосо кыргызча
function deviceLang(): Lang {
  try {
    const loc =
      (Platform.OS === 'web' && typeof navigator !== 'undefined' ? navigator.language : undefined) ||
      Intl.DateTimeFormat().resolvedOptions().locale ||
      '';
    const l = loc.toLowerCase();
    if (l.startsWith('ru')) return 'ru';
    if (l.startsWith('uz')) return 'uz';
    if (l.startsWith('kk')) return 'kk';
    if (l.startsWith('en')) return 'en';
    return 'ky';
  } catch {
    return 'ky';
  }
}

export type TFunc = (key: TKey, params?: Record<string, string | number>) => string;

export function translate(lang: Lang, key: TKey, params?: Record<string, string | number>) {
  let s = DICTS[lang][key] ?? ky[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

type LangContextValue = { lang: Lang; setLang: (l: Lang) => void; t: TFunc };

const LangContext = createContext<LangContextValue>({ lang: 'ky', setLang: () => {}, t: (k, p) => translate('ky', k, p) });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(deviceLang);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (isLang(v)) setLangState(v);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem(STORAGE_KEY, l).catch(() => {});
  }, []);

  const value = useMemo<LangContextValue>(() => ({ lang, setLang, t: (k, p) => translate(lang, k, p) }), [lang, setLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useT = () => useContext(LangContext);
export type { TKey };
