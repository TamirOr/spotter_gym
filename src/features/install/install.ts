// Pure helpers for adding Spotter to the Home Screen, kept apart from the code that reads the browser.

/**
 * Which guide to show: none once opened from the Home Screen (or outside the web), Safari's steps on iPhone
 * and iPad, Chrome's on Android, and a generic hint anywhere else.
 */
export type InstallGuide = 'none' | 'ios' | 'android' | 'other';

export type Device = { userAgent: string; maxTouchPoints: number };

type InstallEnvironment = Device & { web: boolean; standalone: boolean };

export function installGuide(environment: InstallEnvironment): InstallGuide {
  if (!environment.web || environment.standalone) return 'none';
  if (isAppleMobile(environment)) return 'ios';
  return /Android/.test(environment.userAgent) ? 'android' : 'other';
}

/** iPadOS Safari reports a Mac user agent, so a touch screen is what tells it apart from a real Mac. */
export function isAppleMobile({ userAgent, maxTouchPoints }: Device): boolean {
  if (/iPhone|iPad|iPod/.test(userAgent)) return true;
  return /Macintosh/.test(userAgent) && maxTouchPoints > 1;
}
