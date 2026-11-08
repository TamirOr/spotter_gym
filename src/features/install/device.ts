import { Platform } from 'react-native';

import type { Device } from './install';

/** Opened from the Home Screen. iOS Safari reports it through its own navigator.standalone flag. */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia?.('(display-mode: standalone)').matches === true;
}

/** Running in a browser, rather than in a native build or on the server during the web export. */
export function isWeb(): boolean {
  return Platform.OS === 'web' && typeof navigator !== 'undefined';
}

/** What this browser is, for the install guide and for web push. */
export function currentDevice(): Device {
  if (!isWeb()) return { userAgent: '', maxTouchPoints: 0 };
  return { userAgent: navigator.userAgent, maxTouchPoints: navigator.maxTouchPoints };
}
