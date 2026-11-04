import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Text } from './Text';
import { colors, fonts, radii, TOUCH_TARGET } from './theme';

type Variant = 'primary' | 'outline' | 'quiet' | 'inverse';

type Props = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: Variant;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, variant = 'primary', busy = false, disabled, style, ...props }: Props) {
  const inactive = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy }}
      disabled={inactive}
      style={({ pressed }) => [styles.base, styles[variant], (pressed || inactive) && styles.dimmed, style]}
      {...props}
    >
      {busy ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.label}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    minWidth: TOUCH_TARGET,
    paddingHorizontal: 18,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.accent },
  inverse: { backgroundColor: colors.background },
  outline: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.ink },
  quiet: { backgroundColor: 'transparent', minHeight: TOUCH_TARGET, paddingHorizontal: 0 },
  dimmed: { opacity: 0.6 },
  label: { fontFamily: fonts.semibold, fontSize: 16 },
});
