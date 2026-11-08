import type { TranslationKey } from '@/i18n';

// Server rules raise stable snake_case messages (see the rules migration). Only these are shown to users.
const KNOWN_ERRORS = {
  activity_exists: 'errors.activityExists',
  admins_only: 'errors.adminsOnly',
  cannot_deactivate_self: 'errors.cannotDeactivateSelf',
  cannot_delete_admin: 'errors.cannotDeleteAdmin',
  cannot_delete_self: 'errors.cannotDeleteSelf',
  checkin_cancelled: 'errors.checkinCancelled',
  clique_full: 'errors.cliqueFull',
  email_taken: 'errors.emailTaken',
  invalid_email: 'errors.invalidEmail',
  not_approved: 'errors.notApproved',
  not_friends: 'errors.notFriends',
  outside_logging_window: 'errors.outsideLoggingWindow',
  routine_days_exceed_times: 'errors.routineDaysExceedTimes',
} as const satisfies Record<string, TranslationKey>;

export function errorMessageKey(error: unknown): TranslationKey {
  const message = typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : '';
  return message in KNOWN_ERRORS ? KNOWN_ERRORS[message as keyof typeof KNOWN_ERRORS] : 'errors.generic';
}
