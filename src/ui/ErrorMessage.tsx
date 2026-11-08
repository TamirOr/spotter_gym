import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { errorMessageKey } from '@/lib/errors';

import { Text } from './Text';
import { colors } from './theme';

/** Shows a server rule's message, or a generic one. Never the raw error. */
export function ErrorMessage({ error }: { error: unknown }) {
  const { t } = useTranslation();
  if (!error) return null;
  return (
    <Text variant="small" role="alert" style={styles.text}>
      {t(errorMessageKey(error))}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: { color: colors.error },
});
