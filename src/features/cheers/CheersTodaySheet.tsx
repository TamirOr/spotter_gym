import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { cheerText } from '@shared/cheers.ts';
import { useUserId } from '@/features/auth/AuthProvider';
import { useLanguage } from '@/lib/useLanguage';
import { Avatar, SectionHeader, Sheet, Text, colors, spacing } from '@/ui';

import { useCheersToday, useSeenToday, type ReceivedCheer } from './api';
import { distinctViewers } from './seen';

function CheerRow({ cheer }: { cheer: ReceivedCheer }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const name = cheer.sender?.full_name ?? t('cheers.formerMember');
  return (
    <View style={styles.row}>
      <Avatar name={name} photoUrl={cheer.sender?.avatar_url} size={40} />
      <View style={styles.text}>
        <Text variant="strong" userContent>
          {name}
        </Text>
        <Text variant="body" userContent={cheer.type === 'note'}>
          {cheer.type === 'note' ? cheer.body : cheerText(cheer.type, language)}
        </Text>
      </View>
    </View>
  );
}

/** "See cheers" from the Today bar: the cheers on today's workouts, then who has seen them. */
export function CheersTodaySheet() {
  const { t } = useTranslation();
  const userId = useUserId();
  const { data: cheers = [] } = useCheersToday(userId);
  const { data: views = [] } = useSeenToday(userId);
  const viewers = distinctViewers(views);
  return (
    <Sheet title={t('cheers.title')}>
      {cheers.length === 0 ? <Text variant="small">{t('cheers.empty')}</Text> : null}
      {cheers.map((cheer) => (
        <CheerRow key={cheer.id} cheer={cheer} />
      ))}
      <SectionHeader title={t('cheers.seenHeading')} />
      {viewers.length === 0 ? <Text variant="small">{t('cheers.noViews')}</Text> : null}
      <View style={styles.viewers}>
        {viewers.map((viewer) => (
          <View key={viewer.id} style={styles.viewer}>
            <Avatar name={viewer.full_name} photoUrl={viewer.avatar_url} size={32} />
            <Text variant="small" userContent>
              {viewer.full_name}
            </Text>
          </View>
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  text: { flex: 1 },
  viewers: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  viewer: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
