import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, Text } from '@/ui';

import { currentPushSupport, enablePush, notificationsGranted } from './webPush';

/** Turns on notifications for this device, or explains why they are not available here. */
export function PushToggle({ label, onDone }: { label?: string; onDone?: (enabled: boolean) => void }) {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(notificationsGranted);
  const [busy, setBusy] = useState(false);

  const support = currentPushSupport();
  if (support === 'needsInstall') return <Text variant="small">{t('onboarding.notificationsUnavailable')}</Text>;
  if (support === 'unsupported') return <Text variant="small">{t('onboarding.notificationsUnsupported')}</Text>;
  if (enabled) return <Text variant="small">{t('settings.pushOn')}</Text>;

  async function enable() {
    setBusy(true);
    const granted = await enablePush().finally(() => setBusy(false));
    setEnabled(granted);
    onDone?.(granted);
  }

  return <Button label={label ?? t('settings.enablePush')} busy={busy} onPress={enable} />;
}
