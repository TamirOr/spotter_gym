import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useUserId } from '@/features/auth/AuthProvider';
import { useLeaderboard } from '@/features/leaderboard/api';
import { standingOf, weekSegments } from '@/features/leaderboard/leaderboard';
import { Text, colors, spacing } from '@/ui';

/** Below the friend list: my weekly progress and current rank in the selected clique. */
export function WeekSummary({ cliqueId }: { cliqueId: string }) {
  const { t } = useTranslation();
  const userId = useUserId();
  const { data: rows = [] } = useLeaderboard(cliqueId, 'week');
  const mine = standingOf(rows, userId);
  if (!mine) return null;

  return (
    <View style={styles.row}>
      <View style={styles.progress}>
        <Text variant="label" style={styles.ink}>
          {mine.planned > 0
            ? t('today.weekProgress', { completed: mine.completed, planned: mine.planned })
            : t('today.noPlanThisWeek')}
        </Text>
        <View style={styles.segments}>
          {weekSegments(mine.planned, mine.completed).map((filled, index) => (
            <View key={index} style={[styles.segment, filled && styles.filled]} />
          ))}
        </View>
      </View>
      <View style={styles.rank}>
        <Text variant="stat">{mine.rank ? t('today.rank', { rank: mine.rank }) : t('today.unranked')}</Text>
        <Text variant="caption">{t('today.inYourClique')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl, paddingTop: spacing.xl },
  progress: { flex: 1, gap: spacing.sm },
  ink: { color: colors.ink },
  segments: { flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.track },
  filled: { backgroundColor: colors.ink },
  rank: { alignItems: 'flex-end', gap: 4 },
});
