import { StyleSheet, Switch, View } from 'react-native';

import { Text } from './Text';
import { colors } from './theme';

type Props = { label: string; value: boolean; onChange: (value: boolean) => void };

export function ToggleRow({ label, value, onChange }: Props) {
  return (
    <View style={styles.row}>
      <Text variant="body" style={styles.label}>
        {label}
      </Text>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.ink, false: colors.track }}
        thumbColor={colors.background}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  label: { flex: 1 },
});
