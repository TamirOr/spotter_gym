import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useUserId } from '@/features/auth/AuthProvider';
import { useLanguage } from '@/lib/useLanguage';
import { Avatar, ProgressBar, SegmentedControl, Text, colors, spacing } from '@/ui';

import { useLeaderboard } from './api';
import { formatPercent, winners, type LeaderboardRow, type Period } from './leaderboard';

function BoardRow({ row, isMe }: { row: LeaderboardRow; isMe: boolean }) {
  const { locale } = useLanguage();
  return (
    <View style={[styles.row, isMe && styles.me]}>
      <Text variant="strong" style={styles.rank}>
        {row.rank ?? '–'}
      </Text>
      <Avatar name={row.full_name} photoUrl={row.avatar_url} size={40} highlighted={isMe} />
      <View style={styles.middle}>
        <Text variant="strong" userContent>
          {row.full_name}
        </Text>
        <ProgressBar value={row.score} height={4} />
      </View>
      <Text variant="strong" style={styles.value}>
        {formatPercent(row.score, locale)}
      </Text>
    </View>
  );
}

/** The consistency board: % of each member's own plan, weekly or monthly. Last week's winners stay visible. */
export function Leaderboard({ cliqueId }: { cliqueId: string }) {
  const { t } = useTranslation();
  const userId = useUserId();
  const [period, setPeriod] = useState<Period>('week');
  const { data: rows = [] } = useLeaderboard(cliqueId, period);
  const { data: lastWeek = [] } = useLeaderboard(cliqueId, 'week', 1);
  const lastWinners = winners(lastWeek);

  return (
    <View>
      <View style={styles.header}>
        <Text variant="label" role="heading">
          {t('clique.captions.consistency')}
        </Text>
        <SegmentedControl
          options={(['week', 'month'] as const).map((value) => ({ value, label: t(`clique.period.${value}`) }))}
          value={period}
          onChange={setPeriod}
        />
      </View>
      <View role="list">
        {rows.map((row) => (
          <BoardRow key={row.user_id} row={row} isMe={row.user_id === userId} />
        ))}
      </View>
      {lastWinners.length > 0 ? (
        <Text variant="small" style={styles.winner}>
          {t('clique.lastWeekWinner', { name: lastWinners.map((row) => row.full_name).join(', ') })}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: 44,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 60,
    paddingHorizontal: 10,
    marginHorizontal: -10,
    borderRadius: 16,
  },
  me: { backgroundColor: colors.surface },
  rank: { width: 22 },
  middle: { flex: 1, gap: 7 },
  value: { fontVariant: ['tabular-nums'] },
  winner: { marginTop: spacing.md },
});
