import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { signOut } from '@/features/auth/api';
import { useUserId } from '@/features/auth/AuthProvider';
import { useDeleteAccount, useProfile, useUpdateProfile, type ProfileChanges } from '@/features/profile/api';
import { pickAndUploadAvatar } from '@/features/profile/avatar';
import { PushToggle } from '@/features/push/PushToggle';
import { LANGUAGES, setLanguage, type Language } from '@/i18n';
import { confirmThen } from '@/lib/confirm';
import type { Enum } from '@/lib/database.types';
import { localToday, shortTime } from '@/lib/dates';
import { useLanguage } from '@/lib/useLanguage';
import {
  Avatar,
  Button,
  Chip,
  ErrorMessage,
  Screen,
  SectionHeader,
  SegmentedControl,
  Text,
  TextField,
  ToggleRow,
  spacing,
} from '@/ui';

import { pauseState, pauseUntil, type PauseLength } from './pause';

const NOTIFICATION_KINDS: Enum<'notification_kind'>[] = [
  'going',
  'done',
  'cheer',
  'nudge',
  'friend_invite',
  'clique_invite',
  'plan_reminder',
  'plan_missed',
];

const PAUSE_LENGTHS: PauseLength[] = ['week', 'month', 'openEnded'];
const PAUSE_LABELS = {
  week: 'settings.pauseWeek',
  month: 'settings.pauseMonth',
  openEnded: 'settings.pauseOpenEnded',
} as const;

/** Language, notifications, quiet hours, pause and account. */
export function SettingsScreen() {
  const { t } = useTranslation();
  const { locale } = useLanguage();
  const userId = useUserId();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const deleteAccount = useDeleteAccount();
  const [name, setName] = useState<string | null>(null);

  if (!profile) return <Screen back>{null}</Screen>;

  const update = (changes: ProfileChanges) => updateProfile.mutate({ id: userId, changes });
  const pause = pauseState(profile.paused_until, localToday());

  function toggleKind(kind: Enum<'notification_kind'>, on: boolean) {
    const muted = profile!.muted_notification_kinds.filter((muted) => muted !== kind);
    update({ muted_notification_kinds: on ? muted : [...muted, kind] });
  }

  async function changeLanguage(language: Language) {
    await setLanguage(language);
    update({ language });
  }

  async function changePhoto() {
    const url = await pickAndUploadAvatar(userId);
    if (url) update({ avatar_url: url });
  }

  return (
    <Screen back contentStyle={{ gap: spacing.md }}>
      <Text variant="title" role="heading">
        {t('settings.title')}
      </Text>

      <SectionHeader title={t('settings.profile')} />
      <View style={styles.profile}>
        <Avatar name={profile.full_name} photoUrl={profile.avatar_url} size={60} />
        <Button label={t('settings.photo')} variant="outline" onPress={changePhoto} />
      </View>
      <TextField
        label={t('settings.name')}
        value={name ?? profile.full_name}
        onChangeText={setName}
        onBlur={() => name?.trim() && update({ full_name: name.trim() })}
        maxLength={80}
      />

      <SectionHeader title={t('settings.language')} />
      <SegmentedControl
        options={LANGUAGES.map((value) => ({ value, label: t(`settings.languages.${value}`) }))}
        value={profile.language}
        onChange={changeLanguage}
      />

      <SectionHeader title={t('settings.notifications')} />
      <PushToggle />
      {NOTIFICATION_KINDS.map((kind) => (
        <ToggleRow
          key={kind}
          label={t(`settings.kinds.${kind}`)}
          value={!profile.muted_notification_kinds.includes(kind)}
          onChange={(on) => toggleKind(kind, on)}
        />
      ))}
      <ToggleRow
        label={t('settings.nudges')}
        value={profile.nudges_enabled}
        onChange={(on) => update({ nudges_enabled: on })}
      />

      <SectionHeader
        title={`${t('settings.quietHours')} · ${t('settings.quietHoursRange', {
          start: shortTime(profile.quiet_hours_start),
          end: shortTime(profile.quiet_hours_end),
        })}`}
      />
      <ToggleRow
        label={t('settings.goingThroughQuiet')}
        value={profile.going_ignores_quiet_hours}
        onChange={(on) => update({ going_ignores_quiet_hours: on })}
      />

      <SectionHeader title={t('settings.pause')} />
      <Text variant="small">{t('settings.pauseHint')}</Text>
      {pause.paused ? (
        <>
          <Text variant="strong">
            {pause.until
              ? t('settings.pausedUntil', {
                  date: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
                    new Date(`${pause.until}T00:00:00Z`),
                  ),
                })
              : t('settings.paused')}
          </Text>
          <Button label={t('settings.resume')} variant="outline" onPress={() => update({ paused_until: null })} />
        </>
      ) : (
        <View style={styles.chips}>
          {PAUSE_LENGTHS.map((length) => (
            <Chip
              key={length}
              label={t(PAUSE_LABELS[length])}
              onPress={() => update({ paused_until: pauseUntil(length, localToday()) })}
            />
          ))}
        </View>
      )}

      <SectionHeader title={t('settings.account')} />
      <Button label={t('settings.signOut')} variant="outline" onPress={() => void signOut()} />
      <Button
        label={t('settings.deleteAccount')}
        variant="quiet"
        busy={deleteAccount.isPending}
        onPress={() => confirmThen(t('settings.deleteConfirm'), () => deleteAccount.mutate())}
      />
      <ErrorMessage error={updateProfile.error ?? deleteAccount.error} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
