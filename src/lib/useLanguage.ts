import { useTranslation } from 'react-i18next';

import { localeOf, type Language } from '@/i18n';

/** The app language and its Intl locale. */
export function useLanguage(): { language: Language; locale: string } {
  const { i18n } = useTranslation();
  const language = (i18n.language === 'en' ? 'en' : 'he') satisfies Language;
  return { language, locale: localeOf(language) };
}
