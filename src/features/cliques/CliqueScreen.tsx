import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useUserId } from '@/features/auth/AuthProvider';
import { Leaderboard } from '@/features/leaderboard/Leaderboard';
import { confirmThen } from '@/lib/confirm';
import { Button, ErrorMessage, Screen, Text, ToggleRow, spacing } from '@/ui';

import { useLeaveClique, useMemberships, useSetCliqueMuted } from './api';
import { CliqueInvites } from './CliqueInvites';
import { CliqueSwitcher } from './CliqueSwitcher';
import { MembersAndGoals } from './MembersAndGoals';
import { useSelectedClique } from './SelectedCliqueProvider';

/** Where I stand first, then who is in the group and their shared goals, then invites. */
export function CliqueScreen() {
  const { t } = useTranslation();
  const userId = useUserId();
  const { clique } = useSelectedClique();
  const { data: memberships = [] } = useMemberships();
  const leave = useLeaveClique();
  const setMuted = useSetCliqueMuted();
  const muted = memberships.find((row) => row.clique.id === clique?.id)?.muted ?? false;

  return (
    <Screen contentStyle={{ gap: spacing.lg }}>
      <CliqueSwitcher />
      <CliqueInvites />
      {clique ? (
        <>
          <Leaderboard cliqueId={clique.id} />
          <MembersAndGoals clique={clique} />
          <Button label={t('clique.invite')} variant="outline" onPress={() => router.push('/invite')} />
          {clique.owner_id === userId ? (
            <Button label={t('clique.edit')} variant="outline" onPress={() => router.push('/clique/edit')} />
          ) : null}
          <ToggleRow
            label={t('clique.notifications')}
            value={!muted}
            onChange={(on) => setMuted.mutate({ cliqueId: clique.id, muted: !on })}
          />
          <ErrorMessage error={setMuted.error ?? leave.error} />
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
