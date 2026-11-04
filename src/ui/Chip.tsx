import { Pressable, StyleSheet } from 'react-native';

import { Text } from './Text';
import { colors, fonts, TOUCH_TARGET } from './theme';

type Props = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
};

/** A pill choice: board switchers, quick targets, cheer words. */
export function Chip({ label, selected = false, onPress, accessibilityLabel }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={styles.target}
    >
      <Text style={[styles.pill, selected ? styles.selected : styles.unselected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  target: { minHeight: TOUCH_TARGET, justifyContent: 'center' },
  pill: {
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  selected: { backgroundColor: colors.ink, color: colors.background },
  unselected: { backgroundColor: colors.surface, color: colors.ink },
});
