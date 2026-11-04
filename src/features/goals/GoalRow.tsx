import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { activityLabel } from '@/features/activities/activities';
import { useActivity } from '@/features/activities/api';
import { useLanguage } from '@/lib/useLanguage';
import { ProgressBar, Text, colors, spacing } from '@/ui';

import { goalFraction, goalTitle, type GoalProgress } from './goalText';

export function GoalRow({ goal }: { goal: GoalProgress }) {
  const { t } = useTranslation();
  const { language, locale } = useLanguage();
  const activity = useActivity(goal.activity_id);
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });

  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text variant="strong" userContent>
          {goalTitle(t, goal, activity ? activityLabel(activity, language) : '', locale)}
        </Text>
        <Text variant="label">
          {t('me.progress', { progress: number.format(goal.progress), target: number.format(goal.target) })}
        </Text>
      </View>
      <ProgressBar value={goalFraction(goal)} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingTop: 10, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  text: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
});
