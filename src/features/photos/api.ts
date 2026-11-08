import { useMutation, useQuery } from '@tanstack/react-query';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { launchImageLibraryAsync } from 'expo-image-picker';

import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';
import { supabase, unwrap } from '@/lib/supabase';

import {
  GOING_PHOTO_QUALITY,
  GOING_PHOTO_WIDTH,
  GOING_PHOTOS_BUCKET,
  goingPhotoPath,
  isAlreadyUploaded,
  type GoingPhoto,
} from './photos';

/** Photos I can see: my own recent ones, and clique-mates' photos that are still open. */
export function useGoingPhotos() {
  return useQuery({
    queryKey: queryKeys.goingPhotos,
    queryFn: async (): Promise<GoingPhoto[]> => {
      const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      return unwrap(
        await supabase
          .from('going_photos')
          .select('checkin_id, user_id, photo_views(viewer_id)')
          .gte('created_at', since),
      );
    },
  });
}

/** Lets the user pick a photo, or take one where the browser offers it. Returns null if they cancel. */
export async function pickGoingPhoto(): Promise<string | null> {
  const picked = await launchImageLibraryAsync({ mediaTypes: ['images'] });
  return picked.canceled ? null : picked.assets[0].uri;
}

/** Resizes the photo on the device, uploads it for my open Going, then attaches it. Retries are safe. */
export function useAddGoingPhoto() {
  return useMutation({
    mutationFn: async ({ userId, checkinId, uri }: { userId: string; checkinId: string; uri: string }) => {
      const resized = await manipulateAsync(uri, [{ resize: { width: GOING_PHOTO_WIDTH } }], {
        compress: GOING_PHOTO_QUALITY,
        format: SaveFormat.JPEG,
      });
      const body = await (await fetch(resized.uri)).blob();
      const { error } = await supabase.storage
        .from(GOING_PHOTOS_BUCKET)
        .upload(goingPhotoPath(userId, checkinId), body, { contentType: 'image/jpeg' });
      if (error && !isAlreadyUploaded(error)) throw error;
      unwrap(await supabase.rpc('attach_going_photo', { p_checkin_id: checkinId }));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.goingPhotos }),
  });
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * The one look: the server records it and allows the download for a minute. The photo is kept in memory
 * only, never saved on the device, so it is gone once the screen showing it closes.
 */
export function useOpenGoingPhoto() {
  return useMutation({
    mutationFn: async (checkinId: string): Promise<string> => {
      const path = unwrap(await supabase.rpc('open_going_photo', { p_checkin_id: checkinId }));
      const { data, error } = await supabase.storage.from(GOING_PHOTOS_BUCKET).download(path);
      if (error) throw error;
      return readAsDataUrl(data);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.goingPhotos }),
  });
}
