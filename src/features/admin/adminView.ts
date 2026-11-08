/** Which app an admin is looking at: the admin screens, or the regular app as any user sees it. */
export type View = 'admin' | 'user';

/**
 * Admins open in the admin screens until they switch, as in the logistics app. The view changes only what
 * the app shows: an admin's rights in the regular app are a regular user's. Everyone else sees the app.
 */
export function viewOf(isAdmin: boolean, stored: string | null): View {
  return isAdmin && stored !== 'user' ? 'admin' : 'user';
}
