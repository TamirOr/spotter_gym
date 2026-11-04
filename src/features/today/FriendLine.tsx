import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { activityLabel } from '@/features/activities/activities';
import { useActivity } from '@/features/activities/api';
import { shortTime } from '@/lib/dates';
import { useLanguage } from '@/lib/useLanguage';
import { Avatar, Icon, Text, colors, fonts, TOUCH_TARGET } from '@/ui';

import type { FriendLine as FriendLineData } from './api';

function useStatusText(friend: FriendLineData): string {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const activity = useActivity(friend.activity_id);
  const activityName = activity ? activityLabel(activity, language) : null;

  switch (friend.status) {
    case 'training':
      return activityName
        ? t('today.status.training', { activity: activityName })
        : t('today.status.trainingNoActivity');
    case 'done':
      return t('today.status.done');
    case 'planned':
      return friend.planned_time
        ? t('today.status.planned', { time: shortTime(friend.planned_time) })
        : t('today.status.plannedNoTime');
    case 'none':
      return t('today.status.none');
  }
}

/** One line per friend: photo, name, short status, and one quick action. Everything else is on their profile. */
export function FriendLine({ friend }: { friend: FriendLineData }) {
  const { t } = useTranslation();
  const training = friend.status === 'training';
  const status = useStatusText(friend);

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push(`/friend/${friend.user_id}`)}
        style={styles.person}
      >
        <Avatar name={friend.full_name} photoUrl={friend.avatar_url} highlighted={training} />
        <View style={styles.text}>
          <Text variant="strong" userContent>
            {friend.full_name}
          </Text>
          <View style={styles.status}>
            {friend.status === 'done' ? <Icon name="check" size={14} color={colors.muted} strokeWidth={2.5} /> : null}
            <Text variant="small" style={training && styles.statusActive}>
              {status}
            </Text>
          </View>
        </View>
      </Pressable>

      {training && friend.checkin_id ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(friend.cheered ? 'today.cheerSentA11y' : 'today.cheerA11y', { name: friend.full_name })}
          disabled={friend.cheered}
          onPress={() => router.push(`/cheer/${friend.checkin_id}`)}
          style={styles.action}
        >
          <Text style={[styles.pill, friend.cheered ? styles.pillSent : styles.pillOutline]}>
            {t(friend.cheered ? 'today.sent' : 'today.cheer')}
          </Text>
        </Pressable>
      ) : null}

      {friend.can_nudge || friend.nudged ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(friend.nudged ? 'today.nudgeSentA11y' : 'today.nudgeA11y', { name: friend.full_name })}
          disabled={friend.nudged}
          onPress={() => router.push(`/nudge/${friend.user_id}`)}
          style={styles.action}
        >
          <Text style={[styles.pill, styles.pillSent]}>{friend.nudged ? t('today.sent') : '🤏'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  person: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: TOUCH_TARGET },
  text: { flex: 1, minWidth: 0 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  statusActive: { color: colors.ink },
  action: { minHeight: TOUCH_TARGET, justifyContent: 'center' },
  pill: {
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 17,
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  pillOutline: { borderWidth: 1, borderColor: colors.ink },
  pillSent: { backgroundColor: colors.surface },
});
