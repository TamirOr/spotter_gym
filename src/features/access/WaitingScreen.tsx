import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { signOut } from '@/features/auth/api';
import { useUserId } from '@/features/auth/AuthProvider';
import { useDeleteAccount, useProfile, useUpdateProfile } from '@/features/profile/api';
import { PushToggle } from '@/features/push/PushToggle';
import { confirmThen } from '@/lib/confirm';
import { Button, ErrorMessage, Screen, Text, TextField, spacing } from '@/ui';

import { accessOf } from './access';

/** Signed in but not let in: waiting for an admin, rejected, or deactivated. */
export function WaitingScreen() {
  const { t } = useTranslation();
  const userId = useUserId();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const deleteAccount = useDeleteAccount();
  const [name, setName] = useState<string | null>(null);

  if (!profile) return <Screen>{null}</Screen>;
  const access = accessOf(profile);

  return (
    <Screen contentStyle={{ gap: spacing.md }}>
      {access === 'pending' ? (
        <>
          <Text variant="title" role="heading">
            {t('waiting.pendingTitle')}
          </Text>
          <Text variant="body">{t('waiting.pendingHint')}</Text>
          <TextField
            label={t('waiting.nameLabel')}
            value={name ?? profile.full_name}
            onChangeText={setName}
            onBlur={() => name?.trim() && updateProfile.mutate({ id: userId, changes: { full_name: name.trim() } })}
            maxLength={80}
          />
          <PushToggle label={t('waiting.enablePush')} />
        </>
      ) : null}

      {access === 'rejected' ? (
        <>
          <Text variant="title" role="heading">
            {t('waiting.rejectedTitle')}
          </Text>
          {profile.rejection_reason ? (
            <Text variant="body" userContent>
              {profile.rejection_reason}
            </Text>
          ) : null}
        </>
      ) : null}

      {access === 'inactive' ? (
        <>
          <Text variant="title" role="heading">
            {t('waiting.inactiveTitle')}
          </Text>
          <Text variant="body">{t('waiting.inactiveHint')}</Text>
        </>
      ) : null}

      <Button label={t('settings.signOut')} variant="outline" onPress={() => void signOut()} />
      {access !== 'inactive' ? (
        <Button
          label={t('settings.deleteAccount')}
          variant="quiet"
          busy={deleteAccount.isPending}
          onPress={() => confirmThen(t('settings.deleteConfirm'), () => deleteAccount.mutate())}
        />
      ) : null}
      <ErrorMessage error={updateProfile.error ?? deleteAccount.error} />
    </Screen>
  );
}
