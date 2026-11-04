import type { Json } from '@/lib/database.types';
import { supabase, unwrap } from '@/lib/supabase';

import { base64UrlToBytes, pushSupport, type PushSupport } from './pushSupport';

// A web app cannot schedule notifications itself, so the server sends every push. On iPhone, web push
// works only once Spotter is opened from the Home Screen, on iOS 16.4 or later.

/** Opened from the Home Screen. iOS Safari reports it through its own navigator.standalone flag. */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia?.('(display-mode: standalone)').matches === true;
}

export function currentPushSupport(): PushSupport {
  if (typeof window === 'undefined') return 'unsupported';
  return pushSupport({
    standalone: isStandalone(),
    hasServiceWorker: 'serviceWorker' in navigator,
    hasPushManager: 'PushManager' in window,
    hasNotification: 'Notification' in window,
  });
}

export function registerServiceWorker(): Promise<ServiceWorkerRegistration> | null {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator
    ? navigator.serviceWorker.register('/sw.js')
    : null;
}

export function notificationsGranted(): boolean {
  return typeof Notification !== 'undefined' && Notification.permission === 'granted';
}

async function saveSubscription(subscription: PushSubscription): Promise<void> {
  // PushSubscription serializes to the JSON web-push libraries expect.
  const json: Json = JSON.parse(JSON.stringify(subscription));
  unwrap(await supabase.rpc('save_push_subscription', { p_subscription: json }));
}

/** Asks for permission (after the app explained why), subscribes this device and saves it on the server. */
export async function enablePush(): Promise<boolean> {
  const vapidKey = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey || currentPushSupport() !== 'available') return false;
  if ((await Notification.requestPermission()) !== 'granted') return false;

  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToBytes(vapidKey),
    }));
  await saveSubscription(subscription);
  return true;
}

/** Re-saves an existing subscription on each open, so a renewed endpoint keeps reaching the server. */
export async function refreshPushSubscription(): Promise<void> {
  if (currentPushSupport() !== 'available' || !notificationsGranted()) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) await saveSubscription(subscription);
}
