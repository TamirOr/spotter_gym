import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { activityLabel } from '@/features/activities/activities';
import { useActivities } from '@/features/activities/api';
import { useGoalProgress } from '@/features/goals/api';
import { goalTitle } from '@/features/goals/goalText';
import { useLeaderboard } from '@/features/leaderboard/api';
import { useLanguage } from '@/lib/useLanguage';
import { SectionHeader, Text, colors, spacing } from '@/ui';

/** Who is in the clique and the goals they share, with this period's progress. */
export function MembersAndGoals({ cliqueId }: { cliqueId: string }) {
  const { t } = useTranslation();
  const { language, locale } = useLanguage();
  const { data: members = [] } = useLeaderboard(cliqueId, 'week');
  const { data: goals = [] } = useGoalProgress(cliqueId);
  const { data: activities = [] } = useActivities();
  const nameOf = (activityId: string) => {
    const activity = activities.find((candidate) => candidate.id === activityId);
    return activity ? activityLabel(activity, language) : '';
  };
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });

  return (
    <View>
      <SectionHeader title={t('clique.membersHeading')} />
      {members.map((member) => {
        const memberGoals = goals.filter((goal) => goal.user_id === member.user_id);
        return (
          <View key={member.user_id} style={styles.member}>
            <Text variant="strong" userContent>
              {member.full_name}
            </Text>
            {memberGoals.length === 0 ? <Text variant="small">{t('clique.noSharedGoals')}</Text> : null}
            {memberGoals.map((goal) => (
              <View key={goal.goal_id} style={styles.goal}>
                <Text variant="small" userContent style={styles.goalTitle}>
                  {goalTitle(t, goal, nameOf(goal.activity_id), locale)}
                </Text>
                <Text variant="label" style={styles.ink}>
                  {t('me.progress', { progress: number.format(goal.progress), target: number.format(goal.target) })}
                </Text>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  member: { gap: 2, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  goal: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  goalTitle: { flex: 1 },
  ink: { color: colors.ink },
});
