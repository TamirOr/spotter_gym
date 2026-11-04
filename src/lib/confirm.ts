import { t } from 'i18next';
import { Alert, Platform } from 'react-native';

/** Asks before a destructive action. On the web build Alert has no buttons, so the browser dialog asks. */
export function confirmThen(message: string, onConfirm: () => void): void {
  if (Platform.OS === 'web') {
    if (window.confirm(message)) onConfirm();
    return;
  }
  Alert.alert(message, undefined, [
    { text: t('common.cancel'), style: 'cancel' },
    { text: t('common.yes'), style: 'destructive', onPress: onConfirm },
  ]);
}
