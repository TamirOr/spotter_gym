import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { activityLabel } from '@/features/activities/activities';
import { useActivity } from '@/features/activities/api';
import { useGoalProgress } from '@/features/goals/api';
import { GoalRow } from '@/features/goals/GoalRow';
import { useWeek } from '@/features/plan/api';
import { useProfile } from '@/features/profile/api';
import { formatWeekdayInitial, localToday, weekStart } from '@/lib/dates';
import { useLanguage } from '@/lib/useLanguage';
import { Avatar, Button, Icon, ListRow, Screen, SectionHeader, Text, colors, radii, spacing, TOUCH_TARGET } from '@/ui';

import { weekGrid, type DayCell } from './weekGrid';

function DayTile({ cell }: { cell: DayCell }) {
  const { language, locale } = useLanguage();
  const activity = useActivity(cell.activityId);
  const ink = cell.isToday ? colors.background : colors.muted;
  const canChange = cell.mark === 'planned' && cell.planItemId !== null;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={!canChange}
      onPress={() =>
        router.push({ pathname: '/day/[date]', params: { date: cell.date, planItemId: cell.planItemId! } })
      }
      style={[styles.day, cell.isToday && styles.today]}
    >
      <Text variant="caption" style={{ color: ink }}>
        {formatWeekdayInitial(cell.date, locale)}
      </Text>
      <View
        style={[
          styles.mark,
          (cell.mark === 'done' || cell.isToday) && styles.markFilled,
          cell.mark === 'planned' && !cell.isToday && styles.markPlanned,
        ]}
      >
        {cell.mark === 'done' ? <Icon name="check" size={14} strokeWidth={3} /> : null}
      </View>
      <Text variant="caption" numberOfLines={1} style={[styles.activity, { color: ink }]}>
        {activity ? activityLabel(activity, language) : ''}
      </Text>
    </Pressable>
  );
}

/** My progress, my goals and my plan. */
export function MeScreen() {
  const { t } = useTranslation();
  const today = localToday();
  const { data: profile } = useProfile();
  const { data: entries = [] } = useWeek(weekStart(today));
  const { data: goals = [] } = useGoalProgress(null);

  return (
    <Screen>
      <View style={styles.header}>
        <Avatar name={profile?.full_name ?? ''} photoUrl={profile?.avatar_url} size={60} highlighted />
        <Text variant="title" userContent>
          {profile?.full_name}
        </Text>
      </View>

      <SectionHeader
        title={t('me.week')}
        action={<Button variant="quiet" label={t('me.editPlan')} onPress={() => router.push('/plan')} />}
      />
      <View style={styles.week}>
        {weekGrid(today, entries).map((cell) => (
          <DayTile key={cell.date} cell={cell} />
        ))}
      </View>

      <SectionHeader
        title={t('me.goals')}
        action={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('me.addGoal')}
            onPress={() => router.push('/goals/new')}
            style={styles.iconButton}
          >
            <Icon name="plus" size={22} />
          </Pressable>
        }
      />
      {goals.length === 0 ? <Text variant="small">{t('me.noGoals')}</Text> : null}
      {goals.map((goal) => (
        <GoalRow key={goal.goal_id} goal={goal} />
      ))}

      <View style={styles.links}>
        <ListRow label={t('me.friends')} onPress={() => router.push('/friends')} />
        <ListRow label={t('me.settings')} onPress={() => router.push('/settings')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: spacing.lg },
  week: { flexDirection: 'row', gap: 6 },
  day: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  today: { backgroundColor: colors.ink },
  mark: { width: 26, height: 26, borderRadius: radii.round, alignItems: 'center', justifyContent: 'center' },
  markFilled: { backgroundColor: colors.accent },
  markPlanned: { borderWidth: 1.5, borderColor: colors.ink },
  activity: { minHeight: 16, fontSize: 11 },
  iconButton: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: -10,
  },
  links: { marginTop: spacing.xl },
});
