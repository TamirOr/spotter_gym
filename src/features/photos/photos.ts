// One-time Going photos. The server decides who may upload, open and download (see the going photos
// migration); this file only reads the rows it already filtered.

export const GOING_PHOTOS_BUCKET = 'going-photos';

/** Resized on the device, so a photo stays far below the bucket's 1 MB limit. */
export const GOING_PHOTO_WIDTH = 1080;
export const GOING_PHOTO_QUALITY = 0.7;

/** Mirrors public.going_photo_path(): the upload must land exactly there. */
export function goingPhotoPath(userId: string, checkinId: string): string {
  return `${userId}/${checkinId}.jpg`;
}

/** A row of going_photos with the viewings I may see: my own, or all of them on my own photo. */
export type GoingPhoto = { checkin_id: string; user_id: string; photo_views: { viewer_id: string }[] };

export type PhotoState =
  | { kind: 'none' }
  /** A clique-mate's photo I have not opened yet. */
  | { kind: 'new' }
  | { kind: 'seen' }
  /** My own photo, and how many clique-mates opened it. */
  | { kind: 'mine'; views: number };

export function photoState(
  photos: readonly GoingPhoto[] | undefined,
  checkinId: string | null | undefined,
  me: string,
): PhotoState {
  const photo = checkinId ? photos?.find((row) => row.checkin_id === checkinId) : undefined;
  if (!photo) return { kind: 'none' };
  if (photo.user_id === me) return { kind: 'mine', views: photo.photo_views.length };
  return photo.photo_views.some((view) => view.viewer_id === me) ? { kind: 'seen' } : { kind: 'new' };
}

/** A retried upload whose first attempt already landed: carry on and attach it. */
export function isAlreadyUploaded(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { status, statusCode, message } = error as { status?: unknown; statusCode?: unknown; message?: unknown };
  return status === 409 || statusCode === '409' || (typeof message === 'string' && /already exists/i.test(message));
}
