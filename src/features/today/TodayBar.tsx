import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { activityLabel } from '@/features/activities/activities';
import { useActivity } from '@/features/activities/api';
import { useUserId } from '@/features/auth/AuthProvider';
import { pickGoingPhoto, useAddGoingPhoto, useGoingPhotos } from '@/features/photos/api';
import { photoState } from '@/features/photos/photos';
import { minutesBetween, shortTime } from '@/lib/dates';
import { useLanguage } from '@/lib/useLanguage';
import { useNow } from '@/lib/useNow';
import { Button, ErrorMessage, Text, colors, fonts, radii, spacing } from '@/ui';

import { markGoingVariables, useCancelGoing, useMarkGoing } from './api';
import { mainAction, type TodayBarState } from './todayBar';

function activityIdOf(state: TodayBarState): string | null {
  return 'activityId' in state ? state.activityId : null;
}

function useBarText(state: TodayBarState): { eyebrow: string; title: string } {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const now = useNow();
  const activity = useActivity(activityIdOf(state));
  const name = activity ? activityLabel(activity, language) : '';

  switch (state.kind) {
    case 'planned':
      return {
        eyebrow: t('todayBar.planned.eyebrow'),
        title: state.time
          ? t('todayBar.planned.title', { activity: name, time: shortTime(state.time) })
          : t('todayBar.planned.titleNoTime', { activity: name }),
      };
    case 'friendsTraining':
      return {
        eyebrow: t('todayBar.friendsTraining.eyebrow'),
        title: t('todayBar.friendsTraining.title', { count: state.count }),
      };
    case 'quiet':
      return { eyebrow: t('todayBar.quiet.eyebrow'), title: t('todayBar.quiet.title') };
    case 'going':
      return {
        eyebrow: t('todayBar.going.eyebrow'),
        title: t('todayBar.going.title', { activity: name, minutes: minutesBetween(state.startedAt, now) }),
      };
    case 'goingExpired':
      return { eyebrow: t('todayBar.expired.eyebrow'), title: t('todayBar.expired.title', { activity: name }) };
    case 'done':
      return {
        eyebrow: t('todayBar.done.eyebrow'),
        title:
          state.cheerCount > 0 ? t('todayBar.done.cheers', { count: state.cheerCount }) : t('todayBar.done.noCheers'),
      };
  }
}

/** While on the way: add one photo for the clique, then see how many opened it. */
function GoingPhotoLine({ checkinId, addPhoto }: { checkinId: string; addPhoto: ReturnType<typeof useAddGoingPhoto> }) {
  const { t } = useTranslation();
  const me = useUserId();
  const photos = useGoingPhotos();
  const state = photoState(photos.data, checkinId, me);

  if (state.kind === 'mine') {
    return (
      <Text style={styles.photoNote}>
        {state.views > 0 ? t('todayBar.going.photoViews', { count: state.views }) : t('todayBar.going.photoShared')}
      </Text>
    );
  }
  if (!photos.data) return null;

  async function onAdd() {
    const uri = await pickGoingPhoto();
    if (uri) addPhoto.mutate({ userId: me, checkinId, uri });
  }

  return (
    <Pressable
      accessibilityRole="button"
      disabled={addPhoto.isPending}
      onPress={() => void onAdd()}
      style={styles.secondary}
    >
      <Text style={styles.secondaryLabel}>
        {addPhoto.isPending ? t('common.loading') : t('todayBar.going.addPhoto')}
      </Text>
    </Pressable>
  );
}

/** Pinned above the tab bar, within thumb reach. Holds the one main action for the user's own workout. */
export function TodayBar({ state }: { state: TodayBarState }) {
  const { t } = useTranslation();
  const markGoing = useMarkGoing();
  const cancelGoing = useCancelGoing();
  const addPhoto = useAddGoingPhoto();
  const { eyebrow, title } = useBarText(state);
  const action = mainAction(state);

  function onAction() {
    if (action === 'seeCheers') {
      router.push('/cheers');
    } else if (action === 'done' && 'checkinId' in state) {
      router.push({ pathname: '/log', params: { checkinId: state.checkinId, activityId: activityIdOf(state) ?? '' } });
    } else if (state.kind === 'planned') {
      // A planned workout already names the activity, so Going is one tap.
      markGoing.mutate(markGoingVariables(state.activityId));
    } else {
      router.push('/going');
    }
  }

  return (
    <View style={styles.wrapper}>
      <ErrorMessage error={markGoing.error ?? cancelGoing.error ?? addPhoto.error} />
      <View role="region" aria-label={t('todayBar.a11y')} style={styles.bar}>
        <View style={styles.text}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title}>{title}</Text>
          {state.kind === 'going' ? <GoingPhotoLine checkinId={state.checkinId} addPhoto={addPhoto} /> : null}
          {state.kind === 'goingExpired' ? (
            <Pressable accessibilityRole="button" onPress={() => cancelGoing.mutate()} style={styles.secondary}>
              <Text style={styles.secondaryLabel}>{t('todayBar.expired.didNotHappen')}</Text>
            </Pressable>
          ) : null}
        </View>
        <Button
          label={t(`todayBar.action.${action}`)}
          variant={action === 'seeCheers' ? 'inverse' : 'primary'}
          busy={markGoing.isPending}
          onPress={onAction}
          style={styles.action}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginHorizontal: spacing.md, marginBottom: spacing.sm, gap: spacing.xs },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 14,
    paddingStart: 18,
    paddingEnd: 14,
    borderRadius: radii.lg,
    backgroundColor: colors.ink,
  },
  text: { flex: 1, minWidth: 0 },
  eyebrow: { fontFamily: fonts.regular, fontSize: 13, color: colors.inverseMuted },
  title: { marginTop: 2, fontFamily: fonts.semibold, fontSize: 17, lineHeight: 21, color: colors.background },
  secondary: { minHeight: 32, justifyContent: 'center', alignSelf: 'flex-start' },
  secondaryLabel: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.background,
    textDecorationLine: 'underline',
  },
  photoNote: { marginTop: 4, fontFamily: fonts.regular, fontSize: 13, color: colors.inverseMuted },
  action: { minWidth: 92 },
});
