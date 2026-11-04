import type { TranslationKey } from '@/i18n';

// Server rules raise stable snake_case messages (see the rules migration). Only these are shown to users.
const KNOWN_ERRORS = {
  activity_exists: 'errors.activityExists',
  checkin_cancelled: 'errors.checkinCancelled',
  clique_full: 'errors.cliqueFull',
  invalid_invite: 'errors.invalidInvite',
  not_friends: 'errors.notFriends',
  not_joined: 'errors.notJoined',
  outside_logging_window: 'errors.outsideLoggingWindow',
} as const satisfies Record<string, TranslationKey>;

export function errorMessageKey(error: unknown): TranslationKey {
  const message = typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : '';
  return message in KNOWN_ERRORS ? KNOWN_ERRORS[message as keyof typeof KNOWN_ERRORS] : 'errors.generic';
}
