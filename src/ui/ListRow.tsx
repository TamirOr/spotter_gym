import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from './Icon';
import { Text } from './Text';
import { colors, spacing } from './theme';

type Props = { label: string; meta?: string; onPress: () => void; trailing?: ReactNode };

/** A full-width navigation row with a chevron, as on the Me tab. */
export function ListRow({ label, meta, onPress, trailing }: Props) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>
      <Text variant="body">{label}</Text>
      <View style={styles.end}>
        {meta ? <Text variant="small">{meta}</Text> : null}
        {trailing ?? <Icon name="chevronForward" size={16} color={colors.muted} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  end: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
});
