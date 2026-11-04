import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button, ErrorMessage, SectionHeader, Text, colors, spacing } from '@/ui';

import { useMyCliques, useRespondToInvite } from './api';

/** Invitees must accept before they join. */
export function CliqueInvites() {
  const { t } = useTranslation();
  const { invites } = useMyCliques();
  const respond = useRespondToInvite();
  if (invites.length === 0) return null;

  return (
    <View>
      <SectionHeader title={t('clique.invites')} />
      {invites.map((clique) => (
        <View key={clique.id} style={styles.row}>
          <Text variant="strong" userContent style={styles.name}>
            {clique.name}
          </Text>
          <Button label={t('clique.accept')} onPress={() => respond.mutate({ cliqueId: clique.id, accept: true })} />
          <Button
            label={t('clique.decline')}
            variant="quiet"
            onPress={() => respond.mutate({ cliqueId: clique.id, accept: false })}
          />
        </View>
      ))}
      <ErrorMessage error={respond.error} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  name: { flex: 1 },
});
