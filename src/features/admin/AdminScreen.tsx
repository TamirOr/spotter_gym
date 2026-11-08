import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { formatDateTime } from '@/lib/dates';
import { useLanguage } from '@/lib/useLanguage';
import { Button, ErrorMessage, ListRow, Screen, SectionHeader, Text, TextField, colors, radii, spacing } from '@/ui';

import {
  useAddedUsers,
  useAddUser,
  useAdminHealth,
  useAdminUsers,
  useApproveUser,
  useCancelAddedUser,
  useRejectUser,
} from './api';
import { AdminUserRow } from './AdminUserRow';
import { groupUsers, isHealthy, type AdminUser } from './users';

/** Green when pushes go out on time, red with the backlog when they are stuck. */
function HealthStrip() {
  const { t } = useTranslation();
  const { data: health } = useAdminHealth();
  if (!health) return null;
  const ok = isHealthy(health);
  return (
    <View role="status" style={[styles.health, ok ? styles.healthOk : styles.healthBad]}>
      <Text variant="strong">{ok ? t('admin.healthOk') : t('admin.healthStuck')}</Text>
      {health.push_backlog > 0 ? (
        <Text variant="small">
          {t('admin.pushBacklog', { n: health.push_backlog, minutes: health.oldest_push_minutes })}
        </Text>
      ) : null}
    </View>
  );
}

/** A waiting sign-up: approve, or reject with an optional reason they will see. */
function PendingRow({ user }: { user: AdminUser }) {
  const { t } = useTranslation();
  const { locale } = useLanguage();
  const approve = useApproveUser();
  const reject = useRejectUser();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  return (
    <View>
      <AdminUserRow
        user={user}
        tags={[formatDateTime(user.created_at, locale)]}
        onPress={() => router.push(`/admin/user/${user.id}`)}
        actions={
          rejecting ? null : (
            <>
              <Button label={t('admin.approve')} busy={approve.isPending} onPress={() => approve.mutate(user.id)} />
              <Button label={t('admin.reject')} variant="quiet" onPress={() => setRejecting(true)} />
            </>
          )
        }
      />
      {rejecting ? (
        <View style={styles.reject}>
          <TextField label={t('admin.rejectReason')} value={reason} onChangeText={setReason} maxLength={200} />
          <View style={styles.buttons}>
            <Button
              label={t('admin.reject')}
              busy={reject.isPending}
              onPress={() => reject.mutate({ userId: user.id, reason })}
            />
            <Button label={t('common.cancel')} variant="quiet" onPress={() => setRejecting(false)} />
          </View>
        </View>
      ) : null}
      <ErrorMessage error={approve.error ?? reject.error} />
    </View>
  );
}

/** Adds someone ahead of time: they sign in with a code and land in the app approved. */
function AddUser() {
  const { t } = useTranslation();
  const add = useAddUser();
  const [email, setEmail] = useState('');

  return (
    <>
      <Text variant="small">{t('admin.addUserHint')}</Text>
      <TextField
        label={t('admin.email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        inputMode="email"
      />
      <Button
        label={t('admin.addUser')}
        disabled={!email.trim()}
        busy={add.isPending}
        onPress={() => add.mutate(email, { onSuccess: () => setEmail('') })}
      />
      <ErrorMessage error={add.error} />
    </>
  );
}

/** Sign-ups to approve, people to add, and the way to everyone else. */
export function AdminScreen() {
  const { t } = useTranslation();
  const { locale } = useLanguage();
  const users = useAdminUsers();
  const added = useAddedUsers();
  const approve = useApproveUser();
  const cancel = useCancelAddedUser();
  const groups = groupUsers(users.data ?? []);

  return (
    <Screen back contentStyle={{ gap: spacing.md }}>
      <Text variant="title" role="heading">
        {t('admin.title')}
      </Text>
      <HealthStrip />

      <SectionHeader title={t('admin.pending', { n: groups.pending.length })} />
      {users.data && groups.pending.length === 0 ? <Text variant="small">{t('admin.noPending')}</Text> : null}
      {groups.pending.map((user) => (
        <PendingRow key={user.id} user={user} />
      ))}

      <SectionHeader title={t('admin.newUser')} />
      <AddUser />

      {added.data?.length ? <SectionHeader title={t('admin.addedNotSignedIn')} /> : null}
      {added.data?.map((row) => (
        <View key={row.email} style={styles.added}>
          <View style={styles.addedText}>
            <Text variant="body">{row.email}</Text>
            <Text variant="caption">{formatDateTime(row.created_at, locale)}</Text>
          </View>
          <Button label={t('admin.cancelAdded')} variant="quiet" onPress={() => cancel.mutate(row.email)} />
        </View>
      ))}

      {groups.rejected.length ? <SectionHeader title={t('admin.rejected')} /> : null}
      {groups.rejected.map((user) => (
        <AdminUserRow
          key={user.id}
          user={user}
          tags={user.rejection_reason ? [user.rejection_reason] : []}
          onPress={() => router.push(`/admin/user/${user.id}`)}
          actions={<Button label={t('admin.approve')} variant="outline" onPress={() => approve.mutate(user.id)} />}
        />
      ))}

      <View>
        <ListRow
          label={t('admin.users')}
          meta={String(groups.members.length + groups.admins.length)}
          onPress={() => router.push('/admin/users')}
        />
      </View>
      <ErrorMessage error={users.error ?? cancel.error ?? approve.error} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  health: { borderRadius: radii.sm, padding: spacing.md, gap: spacing.xs },
  healthOk: { backgroundColor: colors.surface },
  healthBad: { borderWidth: 1, borderColor: colors.error },
  reject: { gap: spacing.sm, paddingVertical: spacing.sm },
  buttons: { flexDirection: 'row', gap: spacing.sm },
  added: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  addedText: { flex: 1 },
});
