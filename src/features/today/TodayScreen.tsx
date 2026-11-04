import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { CliqueSwitcher } from '@/features/cliques/CliqueSwitcher';
import { useSelectedClique } from '@/features/cliques/SelectedCliqueProvider';
import { formatLongDate } from '@/lib/dates';
import { useLanguage } from '@/lib/useLanguage';
import { Screen, Text, spacing } from '@/ui';

import { useCliqueToday, useMyToday } from './api';
import { FriendLine } from './FriendLine';
import { TodayBar } from './TodayBar';
import { todayBarState } from './todayBar';
import { WeekSummary } from './WeekSummary';

/** The home screen: who is training today first, then my week, with the Today bar pinned below. */
export function TodayScreen() {
  const { t } = useTranslation();
  const { locale } = useLanguage();
  const { clique } = useSelectedClique();
  const myToday = useMyToday();
  const friends = useCliqueToday(clique?.id);

  return (
    <Screen footer={myToday.data ? <TodayBar state={todayBarState(myToday.data)} /> : null}>
      <View style={styles.header}>
        <CliqueSwitcher />
        <Text variant="small">{formatLongDate(new Date(), locale)}</Text>
      </View>

      <Text variant="label" role="heading">
        {t('today.heading')}
      </Text>
      {friends.isLoading ? <ActivityIndicator /> : null}
      {friends.data?.map((friend) => (
        <FriendLine key={friend.user_id} friend={friend} />
      ))}
      {friends.data?.length === 0 ? <Text variant="small">{t('today.emptyClique')}</Text> : null}
      {!clique ? <Text variant="small">{t('today.noClique')}</Text> : null}

      {clique ? <WeekSummary cliqueId={clique.id} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
});
