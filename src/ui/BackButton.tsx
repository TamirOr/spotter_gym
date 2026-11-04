import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { Icon } from './Icon';
import { TOUCH_TARGET } from './theme';

/** Back points to where the reader came from: right in Hebrew, left in English. */
export function BackButton() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.language === 'he';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
      onPress={() => router.back()}
      style={styles.button}
    >
      <Icon name="chevronForward" style={rtl ? styles.flipped : undefined} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: TOUCH_TARGET, height: TOUCH_TARGET, justifyContent: 'center', marginStart: -10 },
  flipped: { transform: [{ scaleX: -1 }] },
});
