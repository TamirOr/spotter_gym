// Quick cheers are stored as a type, so each reader sees them in their own language.
// Shared by the app and the push-dispatch Edge Function. Keep this module free of imports.

export type Language = 'he' | 'en';

export type QuickCheer = 'muscle' | 'fire' | 'clap' | 'trophy' | 'yalla' | 'well_done' | 'champ';
export type ReactionType = QuickCheer | 'note';

export const EMOJI_CHEERS = ['muscle', 'fire', 'clap', 'trophy'] as const satisfies readonly QuickCheer[];
export const WORD_CHEERS = ['yalla', 'well_done', 'champ'] as const satisfies readonly QuickCheer[];

const CHEER_TEXT: Record<QuickCheer, Record<Language, string>> = {
  muscle: { he: '💪', en: '💪' },
  fire: { he: '🔥', en: '🔥' },
  clap: { he: '👏', en: '👏' },
  trophy: { he: '🏆', en: '🏆' },
  yalla: { he: 'יאללה!', en: 'Let’s go!' },
  well_done: { he: 'כל הכבוד!', en: 'Well done!' },
  champ: { he: 'אלוף!', en: 'Champ!' },
};

export const NUDGE_EMOJI = '🤏';
export const NOTE_MAX_LENGTH = 140;

export function cheerText(type: QuickCheer, language: Language): string {
  return CHEER_TEXT[type][language];
}
