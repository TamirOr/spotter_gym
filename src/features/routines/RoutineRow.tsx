import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { activityLabel } from '@/features/activities/activities';
import { useActivity } from '@/features/activities/api';
import { weekdayName } from '@/features/plan/describeRepeat';
import { useLanguage } from '@/lib/useLanguage';
import { Icon, Text, colors, spacing } from '@/ui';

import type { Routine } from './api';
import { draftOf } from './routine';

/** A routine on Me. Tapping it opens the editor. */
export function RoutineRow({ routine }: { routine: Routine }) {
  const { t } = useTranslation();
  const { language, locale } = useLanguage();
  const activity = useActivity(routine.activity_id);
  const { days } = draftOf(routine);
  const activityName = activity ? activityLabel(activity, language) : '';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={activityName}
      onPress={() => router.push({ pathname: '/routine/[routineId]', params: { routineId: routine.id } })}
      style={styles.row}
    >
      <View style={styles.text}>
        <Text variant="strong" userContent>
          {activityName}
        </Text>
        <Text variant="small">{t('routine.timesPerWeek', { count: routine.times_per_week })}</Text>
        {days.length === 0 ? <Text variant="small">{t('routine.noDays')}</Text> : null}
        {days.map(({ weekday, name }) => (
          <Text key={weekday} variant="small" userContent={!!name}>
            {name ? t('routine.namedDay', { day: weekdayName(weekday, locale), name }) : weekdayName(weekday, locale)}
          </Text>
        ))}
      </View>
      <Icon name="chevronForward" size={16} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  text: { flex: 1, gap: 2 },
});
