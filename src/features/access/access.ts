import type { Tables } from '@/lib/database.types';

export type Access = 'member' | 'pending' | 'rejected' | 'inactive';

/**
 * Where a signed-in user stands. The server enforces it (see the admin migration); the app only picks
 * the screen. Deactivation wins, so a deactivated user never sees an old approval state.
 */
export function accessOf(profile: Pick<Tables<'profiles'>, 'approval' | 'active'>): Access {
  if (!profile.active) return 'inactive';
  if (profile.approval === 'approved') return 'member';
  return profile.approval;
}

/** A waiting user's screen checks for approval this often, and whenever the app comes to the front. */
export const APPROVAL_POLL_MS = 30_000;
