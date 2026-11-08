import { useTranslation } from 'react-i18next';
import { Platform, Share, StyleSheet, View } from 'react-native';

import { useFriends } from '@/features/friends/api';
import { PersonRow } from '@/features/friends/PersonRow';
import { Button, ErrorMessage, Screen, SectionHeader, Text, colors, radii, spacing } from '@/ui';

import { useCliqueMembers, useInviteToClique } from './api';
import { useSelectedClique } from './SelectedCliqueProvider';

function appOrigin(): string {
  return Platform.OS === 'web' ? window.location.origin : '';
}

/** New people get the app's link and sign up with their email; friends already on the app get a clique invite. */
export function InviteScreen() {
  const { t } = useTranslation();
  const { clique } = useSelectedClique();
  const inviteToClique = useInviteToClique();
  const { data: friends } = useFriends();
  const { data: members = [] } = useCliqueMembers(clique?.id ?? '');

  function share() {
    void Share.share({ message: t('invite.shareMessage', { url: appOrigin() }) });
  }

  return (
    <Screen back contentStyle={{ gap: spacing.md }}>
      <Text variant="title" role="heading">
        {t('invite.title')}
      </Text>

      <View style={styles.shareBox}>
        <Text variant="body">{t('invite.shareHint')}</Text>
        <Button label={t('invite.share')} onPress={share} />
      </View>
      <ErrorMessage error={inviteToClique.error} />

      {clique && friends?.friends.length ? <SectionHeader title={t('invite.friendsHeading')} /> : null}
      {clique
        ? friends?.friends.map((id) => {
            const person = friends.people.get(id);
            const status = members.find((member) => member.user_id === id)?.status;
            return (
              <PersonRow
                key={id}
                name={person?.full_name ?? ''}
                photoUrl={person?.avatar_url ?? null}
                actions={
                  status === 'active' ? (
                    <Text variant="small">{t('invite.member')}</Text>
                  ) : status === 'invited' ? (
                    <Text variant="small">{t('invite.invited')}</Text>
                  ) : (
                    <Button
                      label={t('invite.inviteFriend')}
                      variant="outline"
                      onPress={() => inviteToClique.mutate({ cliqueId: clique.id, userId: id })}
                    />
                  )
                }
              />
            );
          })
        : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  shareBox: { gap: spacing.sm, padding: spacing.lg, borderRadius: radii.md, backgroundColor: colors.surface },
});
