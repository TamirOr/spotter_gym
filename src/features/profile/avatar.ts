import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { launchImageLibraryAsync } from 'expo-image-picker';

import { supabase } from '@/lib/supabase';

const AVATAR_SIZE = 512;

/** Lets the user pick a photo, resizes it on the device to 512 px and uploads it. Returns its URL. */
export async function pickAndUploadAvatar(userId: string): Promise<string | null> {
  const picked = await launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1] });
  if (picked.canceled) return null;

  const resized = await manipulateAsync(picked.assets[0].uri, [{ resize: { width: AVATAR_SIZE } }], {
    compress: 0.8,
    format: SaveFormat.JPEG,
  });
  const body = await (await fetch(resized.uri)).blob();

  // A new file name per upload, so cached copies of the old photo never linger.
  const path = `${userId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage.from('avatars').upload(path, body, { contentType: 'image/jpeg' });
  if (error) throw error;
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}
