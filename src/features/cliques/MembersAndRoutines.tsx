import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useLeaderboard } from '@/features/leaderboard/api';
import { useCliqueRoutines } from '@/features/routines/api';
import { RoutineSummary } from '@/features/routines/RoutineSummary';
import { SectionHeader, Text, colors, spacing } from '@/ui';

/** Who is in the clique and the workout routines each of them keeps. */
export function MembersAndRoutines({ cliqueId }: { cliqueId: string }) {
  const { t } = useTranslation();
  const { data: members = [] } = useLeaderboard(cliqueId, 'week');
  const { data: routines = [] } = useCliqueRoutines(cliqueId);

  return (
    <View>
      <SectionHeader title={t('clique.membersHeading')} />
      {members.map((member) => {
        const memberRoutines = routines.filter((routine) => routine.user_id === member.user_id);
        return (
          <View key={member.user_id} style={styles.member}>
            <Text variant="strong" userContent>
              {member.full_name}
            </Text>
            {memberRoutines.length === 0 ? <Text variant="small">{t('clique.noRoutines')}</Text> : null}
            {memberRoutines.map((routine) => (
              <View key={routine.id} style={styles.routine}>
                <RoutineSummary routine={routine} />
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  member: { gap: spacing.sm, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  routine: { paddingStart: spacing.md },
});
