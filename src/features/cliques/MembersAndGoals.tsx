import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { activityLabel } from '@/features/activities/activities';
import { useActivities } from '@/features/activities/api';
import { useUserId } from '@/features/auth/AuthProvider';
import { useGoalProgress } from '@/features/goals/api';
import { goalTitle } from '@/features/goals/goalText';
import { useLeaderboard } from '@/features/leaderboard/api';
import { confirmThen } from '@/lib/confirm';
import { useLanguage } from '@/lib/useLanguage';
import { Button, ErrorMessage, SectionHeader, Text, colors, spacing } from '@/ui';

import { useRemoveCliqueMember, useTransferCliqueOwnership, type Clique } from './api';

/** The owner's tools for one member: hand over ownership, or remove them. */
function OwnerActions({ clique, member }: { clique: Clique; member: { user_id: string; full_name: string } }) {
  const { t } = useTranslation();
  const transfer = useTransferCliqueOwnership();
  const remove = useRemoveCliqueMember();
  const names = { name: member.full_name, clique: clique.name };
  const target = { cliqueId: clique.id, userId: member.user_id };
  return (
    <>
      <View style={styles.actions}>
        <Button
          label={t('clique.makeOwner')}
          variant="quiet"
          busy={transfer.isPending}
          onPress={() => confirmThen(t('clique.makeOwnerConfirm', names), () => transfer.mutate(target))}
        />
        <Button
          label={t('clique.removeMember')}
          variant="quiet"
          busy={remove.isPending}
          onPress={() => confirmThen(t('clique.removeMemberConfirm', names), () => remove.mutate(target))}
        />
      </View>
      <ErrorMessage error={transfer.error ?? remove.error} />
    </>
  );
}

/** Who is in the clique and the goals they share, with this period's progress. */
export function MembersAndGoals({ clique }: { clique: Clique }) {
  const { t } = useTranslation();
  const { language, locale } = useLanguage();
  const userId = useUserId();
  const { data: members = [] } = useLeaderboard(clique.id, 'week');
  const { data: goals = [] } = useGoalProgress(clique.id);
  const { data: activities = [] } = useActivities();
  const nameOf = (activityId: string) => {
    const activity = activities.find((candidate) => candidate.id === activityId);
    return activity ? activityLabel(activity, language) : '';
  };
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const iOwnIt = clique.owner_id === userId;

  return (
    <View>
      <SectionHeader title={t('clique.membersHeading')} />
      {members.map((member) => {
        const memberGoals = goals.filter((goal) => goal.user_id === member.user_id);
        return (
          <View key={member.user_id} style={styles.member}>
            <View style={styles.name}>
              <Text variant="strong" userContent>
                {member.full_name}
              </Text>
              {member.user_id === clique.owner_id ? <Text variant="small">{t('clique.owner')}</Text> : null}
            </View>
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
            {iOwnIt && member.user_id !== userId ? <OwnerActions clique={clique} member={member} /> : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  member: { gap: 2, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  name: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  goal: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  goalTitle: { flex: 1 },
  ink: { color: colors.ink },
  actions: { flexDirection: 'row', gap: spacing.lg },
});
