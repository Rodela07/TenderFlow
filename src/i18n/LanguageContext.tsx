import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Lang } from '../types';
import dict, { type DictKey } from './dict';

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: DictKey, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const STORAGE_KEY = 'tpb_lang';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'bn') return stored;
    } catch { /* ignore */ }
    return 'en';
  });

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === 'bn' ? 'bn' : 'en';
    document.title = lang === 'bn' ? 'টেন্ডার প্যাকেজ বিল্ডার' : 'Tender Package Builder';
  }, [lang]);

  const t = useCallback((key: DictKey, vars?: Record<string, string | number>): string => {
    const dictLang = dict[lang] as Record<string, string>;
    const dictEn = dict.en as Record<string, string>;
    let str: string = dictLang[key] ?? dictEn[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(`{${k}}`, String(v));
      }
    }
    return str;
  }, [lang]);

  return (
    <LanguageContext value={{ lang, setLang, t }}>
      {children}
    </LanguageContext>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used within LanguageProvider');
  return ctx;
}
