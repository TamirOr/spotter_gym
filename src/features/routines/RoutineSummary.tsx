import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { activityLabel } from '@/features/activities/activities';
import { useActivity } from '@/features/activities/api';
import { weekdayName } from '@/features/plan/describeRepeat';
import { useLanguage } from '@/lib/useLanguage';
import { Text } from '@/ui';

import type { Routine } from './api';
import { draftOf } from './routine';

/** A routine's workout type, times a week and days. Used on Me, the clique and a friend's profile. */
export function RoutineSummary({ routine }: { routine: Routine }) {
  const { t } = useTranslation();
  const { language, locale } = useLanguage();
  const activity = useActivity(routine.activity_id);
  const { days } = draftOf(routine);

  return (
    <View style={styles.text}>
      <Text variant="strong" userContent>
        {activity ? activityLabel(activity, language) : ''}
      </Text>
      <Text variant="small">{t('routine.timesPerWeek', { count: routine.times_per_week })}</Text>
      {days.length === 0 ? <Text variant="small">{t('routine.noDays')}</Text> : null}
      {days.map(({ weekday, name }) => (
        <Text key={weekday} variant="small" userContent={!!name}>
          {name ? t('routine.namedDay', { day: weekdayName(weekday, locale), name }) : weekdayName(weekday, locale)}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  text: { flex: 1, gap: 2 },
});
