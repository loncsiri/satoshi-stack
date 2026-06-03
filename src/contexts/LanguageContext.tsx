import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import en from '../i18n/en';
import th from '../i18n/th';

type Language = 'en' | 'th';

type Translations = typeof en;
type TranslationKey = keyof Translations;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = { en, th };

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('btc_tracker_lang');
    if (saved === 'en' || saved === 'th') return saved;
    // Default to 'en'
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('btc_tracker_lang', lang);
  };

  const t = useCallback((key: TranslationKey): string => {
    const dict = translations[language];
    return dict[key] || translations['en'][key] || key;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
