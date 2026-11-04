import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar, Text, colors, spacing } from '@/ui';

type Props = { name: string; photoUrl: string | null; actions?: ReactNode };

export function PersonRow({ name, photoUrl, actions }: Props) {
  return (
    <View style={styles.row}>
      <Avatar name={name} photoUrl={photoUrl} size={40} />
      <Text variant="strong" userContent style={styles.name}>
        {name}
      </Text>
      <View style={styles.actions}>{actions}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  name: { flex: 1 },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
