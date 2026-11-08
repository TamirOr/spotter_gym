import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { activityLabel } from '@/features/activities/activities';
import { useActivity } from '@/features/activities/api';
import { useLanguage } from '@/lib/useLanguage';
import { Icon, colors, spacing } from '@/ui';

import type { Routine } from './api';
import { RoutineSummary } from './RoutineSummary';

/** A routine on Me. Tapping it opens the editor. */
export function RoutineRow({ routine }: { routine: Routine }) {
  const { language } = useLanguage();
  const activity = useActivity(routine.activity_id);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={activity ? activityLabel(activity, language) : ''}
      onPress={() => router.push({ pathname: '/routine/[routineId]', params: { routineId: routine.id } })}
      style={styles.row}
    >
      <RoutineSummary routine={routine} />
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
});
