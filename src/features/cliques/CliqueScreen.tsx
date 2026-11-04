import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Leaderboard } from '@/features/leaderboard/Leaderboard';
import { confirmThen } from '@/lib/confirm';
import { Button, Screen, Text, spacing } from '@/ui';

import { useLeaveClique } from './api';
import { CliqueInvites } from './CliqueInvites';
import { CliqueSwitcher } from './CliqueSwitcher';
import { MembersAndGoals } from './MembersAndGoals';
import { useSelectedClique } from './SelectedCliqueProvider';

/** Where I stand first, then who is in the group and their shared goals, then invites. */
export function CliqueScreen() {
  const { t } = useTranslation();
  const { clique } = useSelectedClique();
  const leave = useLeaveClique();

  return (
    <Screen contentStyle={{ gap: spacing.lg }}>
      <CliqueSwitcher />
      <CliqueInvites />
      {clique ? (
        <>
          <Leaderboard cliqueId={clique.id} />
          <MembersAndGoals cliqueId={clique.id} />
          <Button label={t('clique.invite')} variant="outline" onPress={() => router.push('/invite')} />
          <Button
            label={t('clique.leave')}
            variant="quiet"
            onPress={() => confirmThen(t('clique.leaveConfirm', { name: clique.name }), () => leave.mutate(clique.id))}
          />
        </>
      ) : (
        <>
          <Text variant="small">{t('today.noClique')}</Text>
          <Button label={t('clique.create')} onPress={() => router.push('/clique/new')} />
        </>
      )}
    </Screen>
  );
}
