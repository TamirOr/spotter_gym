import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useUserId } from '@/features/auth/AuthProvider';
import { Button, ErrorMessage, Screen, SectionHeader, SegmentedControl, Text, spacing } from '@/ui';

import { useAdminUsers, useSetUserActive } from './api';
import { AdminUserRow } from './AdminUserRow';
import { ACTIVE_FILTERS, filterByActive, groupUsers, type ActiveFilter, type AdminUser } from './users';

/** Everyone approved, members then admins. Opens on active users: inactive ones are kept for history. */
export function AdminUsersScreen() {
  const { t } = useTranslation();
  const me = useUserId();
  const users = useAdminUsers();
  const setActive = useSetUserActive();
  const [filter, setFilter] = useState<ActiveFilter>('active');
  const groups = groupUsers(users.data ?? []);

  function row(user: AdminUser) {
    const tags = [
      user.id === me ? t('admin.me') : null,
      user.active ? null : t('admin.inactive'),
      user.onboarded_at ? null : t('admin.notSetUp'),
    ].filter((tag): tag is string => !!tag);
    return (
      <AdminUserRow
        key={user.id}
        user={user}
        tags={tags}
        onPress={() => router.push(`/admin/user/${user.id}`)}
        actions={
          // The server refuses it too: an admin could lock themselves out.
          user.id === me ? null : (
            <Button
              label={user.active ? t('admin.deactivate') : t('admin.activate')}
              variant="quiet"
              onPress={() => setActive.mutate({ userId: user.id, active: !user.active })}
            />
          )
        }
      />
    );
  }

  const sections = [
    { title: t('admin.members'), users: filterByActive(groups.members, filter) },
    { title: t('admin.admins'), users: filterByActive(groups.admins, filter) },
  ];

  return (
    <Screen back contentStyle={{ gap: spacing.md }}>
      <Text variant="title" role="heading">
        {t('admin.users')}
      </Text>
      <SegmentedControl
        options={ACTIVE_FILTERS.map((value) => ({ value, label: t(`admin.filters.${value}`) }))}
        value={filter}
        onChange={setFilter}
      />
      {sections.map((section) => (
        <View key={section.title}>
          <SectionHeader title={`${section.title} (${section.users.length})`} />
          {users.data && section.users.length === 0 ? <Text variant="small">{t('admin.noUsersMatch')}</Text> : null}
          {section.users.map(row)}
        </View>
      ))}
      <ErrorMessage error={users.error ?? setActive.error} />
    </Screen>
  );
}
