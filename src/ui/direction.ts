import { directionOf, type Language } from '@/i18n';

// Text people write sets its own direction from its content, so a Hebrew note reads correctly in the
// English app. React Native Web renders `dir` as the HTML attribute; React Native's types do not list it.
export const AUTO_DIRECTION: object = { dir: 'auto' };

// React Native Web resolves `start`/`end` styles (marginStart, paddingEnd, the Switch thumb) from the
// nearest `dir` prop, not from the document's direction, so the root view has to carry the app's direction.
export function appDirection(language: Language): object {
  return { dir: directionOf(language) };
}
