import { Image, StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { colors, fonts } from './theme';

type Props = {
  name: string;
  photoUrl?: string | null;
  size?: number;
  /** Highlights someone training right now, or the viewer on a leaderboard. */
  highlighted?: boolean;
};

export function Avatar({ name, photoUrl, size = 44, highlighted = false }: Props) {
  const frame = { width: size, height: size, borderRadius: size / 2 };
  if (photoUrl) {
    return (
      <Image source={{ uri: photoUrl }} style={[frame, highlighted && styles.ring]} accessibilityIgnoresInvertColors />
    );
  }
  return (
    <View
      aria-hidden
      style={[styles.placeholder, frame, { backgroundColor: highlighted ? colors.accent : colors.line }]}
    >
      <Text style={[styles.initial, { fontSize: size * 0.36 }]}>{name.trim().charAt(0)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: fonts.semibold },
  ring: { borderWidth: 3, borderColor: colors.accent },
});
