import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { activityLabel } from '@/features/activities/activities';
import { useActivity } from '@/features/activities/api';
import { useDeleteWorkout } from '@/features/checkins/api';
import { useChangeOccurrence, useWeek, type WeekEntry } from '@/features/plan/api';
import { confirmThen } from '@/lib/confirm';
import { localToday, weekStart } from '@/lib/dates';
import { useLanguage } from '@/lib/useLanguage';
import { Button, Chip, ErrorMessage, Sheet, Text, colors, spacing } from '@/ui';

import { dayContent, moveTargets } from './daySheet';

function useActivityName(entry: WeekEntry): string {
  const { language } = useLanguage();
  const activity = useActivity(entry.activity_id);
  return activity ? activityLabel(activity, language) : '';
}

function dayLabel(date: string, locale: string, weekday: 'long' | 'short') {
  return new Intl.DateTimeFormat(locale, {
    weekday,
    day: 'numeric',
    ...(weekday === 'long' ? { month: 'long' } : {}),
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

/** A logged workout: fix it, or delete it. */
function LoggedWorkout({ entry }: { entry: WeekEntry }) {
  const { t } = useTranslation();
  const name = useActivityName(entry);
  const deleteWorkout = useDeleteWorkout();
  return (
    <View style={styles.block}>
      <Text variant="strong" userContent>
        {name}
      </Text>
      <Text variant="small">{t('me.day.logged')}</Text>
      <View style={styles.row}>
        <Button
          label={t('me.day.edit')}
          variant="outline"
          style={styles.flex}
          onPress={() => router.replace({ pathname: '/log', params: { editId: entry.checkin_id! } })}
        />
        <Button
          label={t('me.day.delete')}
          variant="quiet"
          busy={deleteWorkout.isPending}
          onPress={() => confirmThen(t('me.day.deleteConfirm'), () => deleteWorkout.mutate(entry.checkin_id!))}
        />
      </View>
      <ErrorMessage error={deleteWorkout.error} />
    </View>
  );
}

/** A planned workout: log it, move it to another day this week, or skip it. */
function PlannedWorkout({ entry, today }: { entry: WeekEntry; today: string }) {
  const { t } = useTranslation();
  const { locale } = useLanguage();
  const name = useActivityName(entry);
  const changeOccurrence = useChangeOccurrence();
  const [moving, setMoving] = useState(false);
  const targets = moveTargets(entry.day, today);

  function change(moveTo: string | null) {
    changeOccurrence.mutate(
      { planItemId: entry.plan_item_id!, plannedOn: entry.planned_on ?? entry.day, moveTo },
      { onSuccess: () => router.back() },
    );
  }

  return (
    <View style={styles.block}>
      <Text variant="strong" userContent>
        {name}
      </Text>
      <Text variant="small">{t('me.day.planned')}</Text>
      {entry.day <= today ? (
        <Button
          label={t('me.day.log')}
          onPress={() => router.replace({ pathname: '/log', params: { activityId: entry.activity_id } })}
        />
      ) : null}
      {targets.length > 0 ? (
        <Button label={t('me.day.moveTo')} variant="outline" onPress={() => setMoving((open) => !open)} />
      ) : null}
      {moving ? (
        <View style={styles.chips}>
          {targets.map((day) => (
            <Chip key={day} label={dayLabel(day, locale, 'short')} onPress={() => change(day)} />
          ))}
        </View>
      ) : null}
      <Button label={t('me.day.skip')} variant="outline" onPress={() => change(null)} />
      <ErrorMessage error={changeOccurrence.error} />
    </View>
  );
}

/** A day on the Me tab: its logged workouts and what is still planned. */
export function DaySheet() {
  const { locale } = useLanguage();
  const { date } = useLocalSearchParams<{ date: string }>();
  const today = localToday();
  const { data: entries = [] } = useWeek(weekStart(date));
  const { logged, planned } = dayContent(entries, date);

  return (
    <Sheet title={dayLabel(date, locale, 'long')}>
      {logged.map((entry) => (
        <LoggedWorkout key={entry.checkin_id} entry={entry} />
      ))}
      {planned.map((entry) => (
        <PlannedWorkout key={`${entry.plan_item_id}-${entry.planned_on}`} entry={entry} today={today} />
      ))}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
