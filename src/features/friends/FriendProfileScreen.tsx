import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { activityLabel } from '@/features/activities/activities';
import { useActivities } from '@/features/activities/api';
import { goalTitle } from '@/features/goals/goalText';
import { localToday } from '@/lib/dates';
import { queryKeys } from '@/lib/queryKeys';
import { supabase, unwrap } from '@/lib/supabase';
import { useLanguage } from '@/lib/useLanguage';
import { Avatar, Button, Screen, SectionHeader, Text, colors, spacing } from '@/ui';

import { useNoteTarget } from './api';

/** What a friend shares: their name, shared goals and recent workouts. Row rules decide what is visible. */
function useFriendProfile(userId: string) {
  return useQuery({
    queryKey: queryKeys.recentCheckins(userId),
    queryFn: async () => {
      const today = localToday();
      const [profile, goals, checkins] = await Promise.all([
        supabase.from('profiles').select('full_name, avatar_url').eq('id', userId).single(),
        supabase
          .from('goals')
          .select('id, activity_id, metric, target, period')
          .eq('user_id', userId)
          .lte('starts_on', today)
          .or(`ends_on.is.null,ends_on.gte.${today}`),
        supabase
          .from('checkins')
          .select('id, activity_id, local_day')
          .eq('user_id', userId)
          .eq('state', 'done')
          .order('ended_at', { ascending: false })
          .limit(10),
      ]);
      return { profile: unwrap(profile), goals: unwrap(goals), checkins: unwrap(checkins) };
    },
  });
}

export function FriendProfileScreen() {
  const { t } = useTranslation();
  const { language, locale } = useLanguage();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { data } = useFriendProfile(userId);
  const { data: noteTarget } = useNoteTarget(userId);
  const { data: activities = [] } = useActivities();
  const nameOf = (activityId: string) => {
    const activity = activities.find((candidate) => candidate.id === activityId);
    return activity ? activityLabel(activity, language) : '';
  };
  const dateFormat = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });

  if (!data) return <Screen back>{null}</Screen>;
  return (
    <Screen back>
      <View style={styles.header}>
        <Avatar name={data.profile.full_name} photoUrl={data.profile.avatar_url} size={60} />
        <Text variant="title" userContent>
          {data.profile.full_name}
        </Text>
      </View>
      {/* A note rides on a cheer while they train or just finished, otherwise on a nudge. */}
      {noteTarget ? (
        <Button
          label={t('friend.sendNote')}
          onPress={() =>
            router.push(noteTarget.kind === 'cheer' ? `/cheer/${noteTarget.checkinId}` : `/nudge/${userId}`)
          }
        />
      ) : null}

      <SectionHeader title={t('friend.goals')} />
      {data.goals.map((goal) => (
        <Text key={goal.id} variant="strong" userContent style={styles.line}>
          {goalTitle(t, goal, nameOf(goal.activity_id), locale)}
        </Text>
      ))}

      <SectionHeader title={t('friend.recent')} />
      {data.checkins.length === 0 ? <Text variant="small">{t('friend.noRecent')}</Text> : null}
      {data.checkins.map((checkin) => (
        <View key={checkin.id} style={[styles.line, styles.checkin]}>
          <Text variant="body">{nameOf(checkin.activity_id)}</Text>
          <Text variant="small">{dateFormat.format(new Date(`${checkin.local_day}T00:00:00Z`))}</Text>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: spacing.lg },
  line: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  checkin: { flexDirection: 'row', justifyContent: 'space-between' },
});
