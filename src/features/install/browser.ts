import { useSyncExternalStore } from 'react';

import { currentDevice, isStandalone, isWeb } from './device';
import { installGuide, type InstallGuide } from './install';

/** The guide this browser needs, read once when onboarding opens. */
export function currentInstallGuide(): InstallGuide {
  const web = isWeb();
  return installGuide({ web, standalone: web && isStandalone(), ...currentDevice() });
}

// Chrome on Android (and other Chromium browsers) offers its own install dialog through the
// beforeinstallprompt event. Safari has no such event, so iPhone always gets the written steps.
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let pending: InstallPromptEvent | null = null;
let listening = false;
const subscribers = new Set<() => void>();

function setPending(event: InstallPromptEvent | null) {
  pending = event;
  subscribers.forEach((notify) => notify());
}

/** Called once at startup, because the browser may fire the event before onboarding is on screen. */
export function listenForInstallPrompt(): void {
  if (listening || !isWeb() || typeof window === 'undefined') return;
  listening = true;
  window.addEventListener('beforeinstallprompt', (event) => {
    // Hold the browser's own banner back, so the dialog opens from the guide's button instead.
    event.preventDefault();
    setPending(event as InstallPromptEvent);
  });
  window.addEventListener('appinstalled', () => setPending(null));
}

/** True while the browser can open its install dialog. */
export function useCanPromptInstall(): boolean {
  return useSyncExternalStore(
    (notify) => {
      subscribers.add(notify);
      return () => subscribers.delete(notify);
    },
    () => pending !== null,
    () => false,
  );
}

/** Opens the browser's install dialog. Each event opens it once, so it is dropped either way. */
export async function promptInstall(): Promise<boolean> {
  const event = pending;
  if (!event) return false;
  setPending(null);
  await event.prompt();
  return (await event.userChoice).outcome === 'accepted';
}
