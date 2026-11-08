import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useUserId } from '@/features/auth/AuthProvider';
import { useProfile, useUpdateProfile } from '@/features/profile/api';
import { pickAndUploadAvatar } from '@/features/profile/avatar';
import { PushToggle } from '@/features/push/PushToggle';
import { RoutineWizard } from '@/features/routines/RoutineWizard';
import { useLanguage } from '@/lib/useLanguage';
import { Avatar, Button, ErrorMessage, Screen, Text, TextField, spacing } from '@/ui';

type Step = 'profile' | 'routines' | 'notifications';

/**
 * Name and photo, optional workout routines, then notifications after explaining why.
 * Goals are added later on Me, so skipping routines leads straight on.
 */
export function OnboardingScreen() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const userId = useUserId();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const [step, setStep] = useState<Step>('profile');
  const [name, setName] = useState<string | null>(null);
  const fullName = name ?? profile?.full_name ?? '';

  function saveProfile() {
    updateProfile.mutate(
      {
        id: userId,
        changes: { full_name: fullName.trim(), language, time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      },
      { onSuccess: () => setStep('routines') },
    );
  }

  async function addPhoto() {
    const url = await pickAndUploadAvatar(userId);
    if (url) updateProfile.mutate({ id: userId, changes: { avatar_url: url } });
  }

  function finish() {
    updateProfile.mutate({ id: userId, changes: { onboarded_at: new Date().toISOString() } });
  }

  return (
    <Screen contentStyle={styles.content}>
      {step === 'profile' ? (
        <>
          <Text variant="title" role="heading">
            {t('onboarding.profileTitle')}
          </Text>
          <View style={styles.photo}>
            <Avatar name={fullName} photoUrl={profile?.avatar_url} size={72} highlighted />
            <Button
              label={profile?.avatar_url ? t('onboarding.changePhoto') : t('onboarding.addPhoto')}
              variant="outline"
              onPress={addPhoto}
            />
          </View>
          <TextField value={fullName} onChangeText={setName} maxLength={80} accessibilityLabel={t('settings.name')} />
          <Button
            label={t('common.continue')}
            disabled={!fullName.trim()}
            busy={updateProfile.isPending}
            onPress={saveProfile}
          />
        </>
      ) : null}

      {step === 'routines' ? <RoutineWizard onDone={() => setStep('notifications')} /> : null}

      {step === 'notifications' ? (
        <>
          <Text variant="title" role="heading">
            {t('onboarding.notificationsTitle')}
          </Text>
          <Text variant="body">{t('onboarding.notificationsWhy')}</Text>
          <PushToggle label={t('onboarding.enableNotifications')} onDone={finish} />
          <Button label={t('onboarding.finish')} variant="outline" busy={updateProfile.isPending} onPress={finish} />
        </>
      ) : null}
      <ErrorMessage error={updateProfile.error} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingTop: spacing.xl },
  photo: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
});
