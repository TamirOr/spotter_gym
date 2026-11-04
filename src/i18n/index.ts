import { getLocales } from 'expo-localization';
import { changeLanguage, use as registerPlugin, type ParseKeys } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager, Platform } from 'react-native';

import { en } from './en';
import { he } from './he';
import type { Language } from './types';

export type { Language } from './types';
export type TranslationKey = ParseKeys;

export const LANGUAGES: readonly Language[] = ['he', 'en'];

const LOCALES: Record<Language, string> = { he: 'he-IL', en: 'en-IL' };

export function localeOf(language: Language): string {
  return LOCALES[language];
}

/** Hebrew first: any device not set to English starts in Hebrew. */
export function deviceLanguage(): Language {
  return getLocales()[0]?.languageCode === 'en' ? 'en' : 'he';
}

function applyDirection(language: Language): void {
  const rtl = language === 'he';
  if (Platform.OS === 'web') {
    // React Native Web lays rows out by the document direction, so flipping it flips every screen.
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  } else {
    I18nManager.allowRTL(rtl);
    I18nManager.forceRTL(rtl);
  }
}

export async function setLanguage(language: Language): Promise<void> {
  applyDirection(language);
  await changeLanguage(language);
}

export function initI18n(): void {
  const language = deviceLanguage();
  void registerPlugin(initReactI18next).init({
    resources: { he: { translation: he }, en: { translation: en } },
    lng: language,
    fallbackLng: 'he',
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  applyDirection(language);
}
