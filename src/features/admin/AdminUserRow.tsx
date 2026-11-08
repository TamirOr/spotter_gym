import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar, Text, colors, spacing } from '@/ui';

import type { AdminUser } from './users';

type Props = { user: AdminUser; tags?: string[]; onPress?: () => void; actions?: ReactNode };

/** A user in the admin lists: photo, name (or email before they typed one), tags and actions. */
export function AdminUserRow({ user, tags = [], onPress, actions }: Props) {
  return (
    <View style={styles.row}>
      <Pressable accessibilityRole={onPress ? 'button' : undefined} onPress={onPress} style={styles.person}>
        <Avatar name={user.full_name || user.email} photoUrl={user.avatar_url} size={40} />
        <View style={styles.text}>
          <Text variant="strong" userContent numberOfLines={1}>
            {user.full_name || user.email}
          </Text>
          <Text variant="caption" numberOfLines={1}>
            {[user.full_name ? user.email : null, ...tags].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </Pressable>
      <View style={styles.actions}>{actions}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  person: { flex: 1, minWidth: 180, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
