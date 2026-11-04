import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Icon } from './Icon';
import { Text } from './Text';
import { colors, radii, spacing, TOUCH_TARGET } from './theme';

type Props = { title: string; children: ReactNode; onClose?: () => void };

/** A bottom sheet over a dimmed screen. Used by routes presented as transparent modals. */
export function Sheet({ title, children, onClose = () => router.back() }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.scrim}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('common.close')} />
      <View accessibilityViewIsModal style={[styles.sheet, { paddingBottom: insets.bottom + 36 }]}>
        <View style={styles.header}>
          <Text variant="heading" role="heading" userContent>
            {title}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            onPress={onClose}
            style={styles.close}
          >
            <Icon name="close" size={22} />
          </Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          {children}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.scrim },
  sheet: {
    maxHeight: '90%',
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xl,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    backgroundColor: colors.background,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: TOUCH_TARGET },
  close: { width: TOUCH_TARGET, height: TOUCH_TARGET, alignItems: 'center', justifyContent: 'center', marginEnd: -10 },
  content: { gap: spacing.md, paddingTop: spacing.sm },
});
