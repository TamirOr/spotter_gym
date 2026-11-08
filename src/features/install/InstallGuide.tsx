import type { TFunction } from 'i18next';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button, Icon, Text, colors, radii, spacing, type IconName } from '@/ui';

import { promptInstall, useCanPromptInstall } from './browser';
import type { InstallGuide as Guide } from './install';

type Step = { icon: IconName; text: string };

/**
 * Shows how to add Spotter to the Home Screen. Where the browser has its own install dialog (Chrome on
 * Android), one button opens it. Safari has none and does not say when Spotter was added, so on iPhone the
 * guide only explains, and both offer to carry on in the browser.
 */
export function InstallGuide({ guide, onContinue }: { guide: Exclude<Guide, 'none'>; onContinue: () => void }) {
  const { t } = useTranslation();
  const canPrompt = useCanPromptInstall() && guide !== 'ios';
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);

  async function install() {
    setBusy(true);
    const accepted = await promptInstall().finally(() => setBusy(false));
    setInstalled(accepted);
  }

  return (
    <>
      <Text variant="title" role="heading">
        {t('install.title')}
      </Text>
      <Text variant="body">{t('install.why')}</Text>
      {installed ? (
        <Text variant="strong">{t('install.installed')}</Text>
      ) : canPrompt ? (
        <Button label={t('install.installButton')} busy={busy} onPress={install} />
      ) : (
        <Steps steps={stepsFor(guide, t)} />
      )}
      <Button label={t('install.continueInBrowser')} variant="outline" onPress={onContinue} />
    </>
  );
}

function stepsFor(guide: Exclude<Guide, 'none'>, t: TFunction): Step[] {
  switch (guide) {
    case 'ios':
      return [
        { icon: 'share', text: t('install.share') },
        { icon: 'addSquare', text: t('install.add') },
        { icon: 'toggle', text: t('install.webApp') },
        // A Home Screen app on iPhone keeps its own storage, so it may ask to sign in again.
        { icon: 'check', text: t('install.openIos') },
      ];
    case 'android':
      return [
        { icon: 'menu', text: t('install.androidMenu') },
        { icon: 'addSquare', text: t('install.androidAdd') },
        { icon: 'plus', text: t('install.androidConfirm') },
        { icon: 'check', text: t('install.open') },
      ];
    case 'other':
      return [
        { icon: 'menu', text: t('install.otherBrowser') },
        { icon: 'check', text: t('install.open') },
      ];
  }
}

function Steps({ steps }: { steps: Step[] }) {
  return (
    <View style={styles.steps}>
      {steps.map((step, index) => (
        <View key={step.icon} style={styles.step}>
          <View style={styles.badge}>
            <Icon name={step.icon} size={22} />
          </View>
          <Text variant="body" style={styles.stepText}>
            {`${index + 1}. ${step.text}`}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  steps: { gap: spacing.md, marginVertical: spacing.sm },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badge: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { flex: 1 },
});
