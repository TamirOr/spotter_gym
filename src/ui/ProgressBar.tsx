import { StyleSheet, View } from 'react-native';

import { colors } from './theme';

type Props = { value: number; height?: number };

/** `value` is a fraction from 0 to 1. */
export function ProgressBar({ value, height = 6 }: Props) {
  const width = `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` as const;
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <View style={[styles.fill, { width, borderRadius: height / 2 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { overflow: 'hidden', backgroundColor: colors.track },
  fill: { height: '100%', backgroundColor: colors.ink },
});
