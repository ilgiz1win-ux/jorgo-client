import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { ky, TKey } from './ky';
import { ru } from './ru';

export type Lang = 'ky' | 'ru';
export const LANGS: { id: Lang; short: string; name: string }[] = [
  { id: 'ky', short: 'КЫР', name: 'Кыргызча' },
  { id: 'ru', short: 'РУС', name: 'Русский' },
];

const DICTS: Record<Lang, Record<TKey, string>> = { ky, ru };
const STORAGE_KEY = 'jorgo.lang';

// Биринчи жолу: телефондун тили орусча болсо — орусча, болбосо кыргызча
function deviceLang(): Lang {
  try {
    const loc =
      (Platform.OS === 'web' && typeof navigator !== 'undefined' ? navigator.language : undefined) ||
      Intl.DateTimeFormat().resolvedOptions().locale ||
      '';
    return loc.toLowerCase().startsWith('ru') ? 'ru' : 'ky';
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
        if (v === 'ky' || v === 'ru') setLangState(v);
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
