import { useTranslation } from 'react-i18next';
import { Platform, Share, StyleSheet, View } from 'react-native';

import { useFriends } from '@/features/friends/api';
import { PersonRow } from '@/features/friends/PersonRow';
import { inviteUrl } from '@/features/onboarding/inviteCode';
import { Button, ErrorMessage, Screen, SectionHeader, Text, colors, fonts, radii, spacing } from '@/ui';

import { useCliqueMembers, useCreateInvite, useInviteToClique } from './api';
import { useSelectedClique } from './SelectedCliqueProvider';

function appOrigin(): string {
  return Platform.OS === 'web' ? window.location.origin : '';
}

/** New people get a one-time code and link; friends already on the app get a clique invite. */
export function InviteScreen() {
  const { t } = useTranslation();
  const { clique } = useSelectedClique();
  const createInvite = useCreateInvite();
  const inviteToClique = useInviteToClique();
  const { data: friends } = useFriends();
  const { data: members = [] } = useCliqueMembers(clique?.id ?? '');
  const code = createInvite.data;

  function share(code: string) {
    void Share.share({ message: t('invite.shareMessage', { url: inviteUrl(appOrigin(), code), code }) });
  }

  return (
    <Screen back contentStyle={{ gap: spacing.md }}>
      <Text variant="title" role="heading">
        {t('invite.title')}
      </Text>

      {code ? (
        <View style={styles.codeBox}>
          <Text variant="label">{t('invite.codeLabel')}</Text>
          <Text style={styles.code} selectable>
            {code}
          </Text>
          <Text variant="caption">{t('invite.codeRules')}</Text>
          <Button label={t('invite.share')} onPress={() => share(code)} />
        </View>
      ) : (
        <Button
          label={t('invite.newCode')}
          busy={createInvite.isPending}
          onPress={() => createInvite.mutate(clique?.id ?? null)}
        />
      )}
      <ErrorMessage error={createInvite.error ?? inviteToClique.error} />

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
  codeBox: { gap: spacing.sm, padding: spacing.lg, borderRadius: radii.md, backgroundColor: colors.surface },
  code: { fontFamily: fonts.bold, fontSize: 34, letterSpacing: 6, textAlign: 'center', color: colors.ink },
});
