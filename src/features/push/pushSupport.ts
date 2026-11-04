// Pure helpers for web push, kept apart from the code that talks to the browser and the server.

export type PushSupport = 'available' | 'needsInstall' | 'unsupported';

type PushEnvironment = {
  standalone: boolean;
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotification: boolean;
};

export function pushSupport(environment: PushEnvironment): PushSupport {
  if (!environment.hasServiceWorker || !environment.hasNotification) return 'unsupported';
  if (!environment.standalone) return 'needsInstall';
  return environment.hasPushManager ? 'available' : 'unsupported';
}

/** VAPID keys are URL-safe base64; the Push API wants raw bytes. */
export function base64UrlToBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const padded = base64Url
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(base64Url.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}
