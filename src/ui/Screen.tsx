import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from './BackButton';
import { colors, spacing } from './theme';

type Props = {
  children: ReactNode;
  /** Pinned below the scrolling content, such as the Today bar. */
  footer?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  /** Screens opened on top of a tab get a back button. */
  back?: boolean;
};

export function Screen({ children, footer, contentStyle, back = false }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.lg }]}>
      <ScrollView contentContainerStyle={[styles.content, contentStyle]} keyboardShouldPersistTaps="handled">
        {back ? <BackButton /> : null}
        {children}
      </ScrollView>
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, gap: spacing.sm },
});
