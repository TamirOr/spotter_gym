import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { cheerText } from '@shared/cheers.ts';
import { useUserId } from '@/features/auth/AuthProvider';
import { useLanguage } from '@/lib/useLanguage';
import { Avatar, Sheet, Text, colors, spacing } from '@/ui';

import { useCheersToday, type ReceivedCheer } from './api';

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

/** "See cheers" from the Today bar. */
export function CheersTodaySheet() {
  const { t } = useTranslation();
  const { data: cheers = [] } = useCheersToday(useUserId());
  return (
    <Sheet title={t('cheers.title')}>
      {cheers.length === 0 ? <Text variant="small">{t('cheers.empty')}</Text> : null}
      {cheers.map((cheer) => (
        <CheerRow key={cheer.id} cheer={cheer} />
      ))}
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
});
