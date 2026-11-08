import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useUserId } from '@/features/auth/AuthProvider';
import { pickAndUploadAvatar } from '@/features/profile/avatar';
import { Avatar, Button, ErrorMessage, Sheet, TextField, spacing } from '@/ui';

import { useUpdateClique } from './api';
import { useSelectedClique } from './SelectedCliqueProvider';

/** The owner's clique settings: its name and photo. The server lets only the owner change them. */
export function EditCliqueSheet() {
  const { t } = useTranslation();
  const userId = useUserId();
  const { clique } = useSelectedClique();
  const [name, setName] = useState(clique?.name ?? '');
  const [photoUrl, setPhotoUrl] = useState(clique?.photo_url ?? null);
  const [uploadError, setUploadError] = useState<unknown>(null);
  const updateClique = useUpdateClique();

  async function changePhoto() {
    setUploadError(null);
    try {
      // Stored in the owner's own photo folder, resized on the device like a profile photo.
      const url = await pickAndUploadAvatar(userId);
      if (url) setPhotoUrl(url);
    } catch (error) {
      setUploadError(error);
    }
  }

  function save() {
    if (!clique) return;
    updateClique.mutate(
      { cliqueId: clique.id, changes: { name: name.trim(), photo_url: photoUrl } },
      { onSuccess: () => router.back() },
    );
  }

  if (!clique) return <Sheet title={t('editClique.title')}>{null}</Sheet>;

  return (
    <Sheet title={t('editClique.title')}>
      <View style={styles.photo}>
        <Avatar name={name} photoUrl={photoUrl} size={60} />
        <Button label={t('editClique.photo')} variant="outline" onPress={changePhoto} />
      </View>
      <TextField label={t('newClique.name')} value={name} onChangeText={setName} maxLength={40} />
      <ErrorMessage error={updateClique.error ?? uploadError} />
      <Button label={t('common.save')} disabled={!name.trim()} busy={updateClique.isPending} onPress={save} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  photo: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
});
