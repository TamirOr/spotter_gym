import { useTranslation } from 'react-i18next';
import { Image, StyleSheet, View } from 'react-native';

import { useUserId } from '@/features/auth/AuthProvider';
import { Button, ErrorMessage, Text, colors, radii, spacing } from '@/ui';

import { useGoingPhotos, useOpenGoingPhoto } from './api';
import { photoState } from './photos';

/**
 * A clique-mate's Going photo on the cheer sheet. Opening it spends the one look; it stays on screen
 * until the sheet closes, right above the cheers.
 */
export function OneTimePhoto({ checkinId, name }: { checkinId: string; name: string }) {
  const { t } = useTranslation();
  const me = useUserId();
  const photos = useGoingPhotos();
  const open = useOpenGoingPhoto();
  const state = photoState(photos.data, checkinId, me);

  if (open.data) {
    return (
      <View style={styles.block}>
        <Image
          source={{ uri: open.data }}
          accessibilityLabel={t('cheer.photoAlt', { name })}
          resizeMode="contain"
          style={styles.photo}
        />
        <Text variant="small">{t('cheer.photoOnce')}</Text>
      </View>
    );
  }

  if (state.kind === 'seen') return <Text variant="small">{t('cheer.photoSeen')}</Text>;
  if (state.kind !== 'new') return null;

  return (
    <View style={styles.block}>
      <Button
        label={t('cheer.photoOpen')}
        variant="outline"
        busy={open.isPending}
        onPress={() => open.mutate(checkinId)}
      />
      <Text variant="small">{t('cheer.photoOnce')}</Text>
      <ErrorMessage error={open.error} />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  photo: { width: '100%', aspectRatio: 3 / 4, borderRadius: radii.md, backgroundColor: colors.surface },
});
