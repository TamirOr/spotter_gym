import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { AUTO_DIRECTION } from './direction';
import { Text } from './Text';
import { colors, fonts, radii } from './theme';

type Props = TextInputProps & { label?: string };

/** Input for text people write, so it sets its own direction from its content. */
export function TextField({ label, style, ...props }: Props) {
  return (
    <View style={styles.wrapper}>
      {label ? <Text variant="label">{label}</Text> : null}
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        {...AUTO_DIRECTION}
        style={[styles.input, style]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  input: {
    minHeight: 52,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.fieldBorder,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.ink,
  },
});
