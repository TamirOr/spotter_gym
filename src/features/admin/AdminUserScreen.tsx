import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useUserId } from '@/features/auth/AuthProvider';
import { confirmThen } from '@/lib/confirm';
import type { Enum } from '@/lib/database.types';
import { formatDateTime } from '@/lib/dates';
import { useLanguage } from '@/lib/useLanguage';
import { Avatar, Button, ErrorMessage, Screen, SectionHeader, Text, colors, spacing } from '@/ui';

import { useAdminUsers, useApproveUser, useDeleteUser, useSetUserActive, useUserSupport } from './api';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text variant="label">{label}</Text>
      <Text variant="body" userContent>
        {value}
      </Text>
    </View>
  );
}

/** One user: their account, support details (devices and latest pushes) and admin actions. */
export function AdminUserScreen() {
  const { t } = useTranslation();
  const { locale } = useLanguage();
  const me = useUserId();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const users = useAdminUsers();
  const support = useUserSupport(userId);
  const approve = useApproveUser();
  const setActive = useSetUserActive();
  const remove = useDeleteUser();
  const user = users.data?.find((row) => row.id === userId);
  const when = (at: string | null) => (at ? formatDateTime(at, locale) : t('admin.never'));

  if (!user) {
    return (
      <Screen back>
        <Text variant="small">{users.isLoading ? t('common.loading') : t('admin.userGone')}</Text>
      </Screen>
    );
  }

  const name = user.full_name || user.email;
  const state = [
    t(`admin.approval.${user.approval}`),
    user.active ? null : t('admin.inactive'),
    user.is_admin ? t('admin.adminTag') : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Screen back contentStyle={{ gap: spacing.md }}>
      <View style={styles.header}>
        <Avatar name={name} photoUrl={user.avatar_url} size={60} />
        <Text variant="title" role="heading" userContent style={styles.name}>
          {name}
        </Text>
      </View>

      <Field label={t('admin.email')} value={user.email} />
      <Field label={t('admin.state')} value={state} />
      {user.rejection_reason ? <Field label={t('admin.rejectReason')} value={user.rejection_reason} /> : null}
      <Field label={t('admin.signedUp')} value={when(user.created_at)} />
      <Field label={t('admin.approvedAt')} value={when(user.approved_at)} />
      <Field label={t('admin.lastSignIn')} value={when(user.last_sign_in_at)} />
      <Field label={t('admin.setUp')} value={user.onboarded_at ? t('common.yes') : t('common.no')} />

      <SectionHeader title={t('admin.support')} />
      {support.data ? (
        <>
          <Field
            label={t('admin.connections')}
            value={t('admin.connectionCounts', { friends: support.data.friends, cliques: support.data.cliques })}
          />
          <Text variant="label">{t('admin.devices')}</Text>
          {support.data.devices.length === 0 ? <Text variant="small">{t('admin.noDevices')}</Text> : null}
          {support.data.devices.map((device, index) => (
            <Text key={index} variant="small">
              {`${device.push_service ?? '?'} · ${when(device.updated_at)}`}
            </Text>
          ))}
          <Text variant="label">{t('admin.recentPushes')}</Text>
          {support.data.notifications.length === 0 ? <Text variant="small">{t('admin.noPushes')}</Text> : null}
          {support.data.notifications.map((push, index) => (
            <Text key={index} variant="small">
              {`${t(`settings.kinds.${push.kind as Enum<'notification_kind'>}`)} · ${when(push.created_at)} · ${
                push.sent_at ? t('admin.sent') : t('admin.notSent')
              }`}
            </Text>
          ))}
        </>
      ) : null}

      <SectionHeader title={t('admin.actions')} />
      {user.approval !== 'approved' ? (
        <Button label={t('admin.approve')} busy={approve.isPending} onPress={() => approve.mutate(user.id)} />
      ) : null}
      {user.id !== me ? (
        <Button
          label={user.active ? t('admin.deactivate') : t('admin.activate')}
          variant="outline"
          busy={setActive.isPending}
          onPress={() => setActive.mutate({ userId: user.id, active: !user.active })}
        />
      ) : null}
      {user.id !== me && !user.is_admin ? (
        <Button
          label={t('admin.deleteUser')}
          variant="quiet"
          busy={remove.isPending}
          onPress={() =>
            confirmThen(t('admin.deleteConfirm', { name }), () =>
              remove.mutate(user.id, { onSuccess: () => router.back() }),
            )
          }
        />
      ) : null}
      <ErrorMessage error={users.error ?? support.error ?? approve.error ?? setActive.error ?? remove.error} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  name: { flex: 1 },
  field: { gap: 2, paddingBottom: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.line },
});
