import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useLanguage } from '@/lib/useLanguage';
import { Chip, ErrorMessage, Text, TextField, spacing } from '@/ui';

import { activityLabel, hasExactMatch, pickerOptions, type Activity } from './activities';
import { matchActivity, useActivities, useActivityUsage, useCreateActivity } from './api';

type Props = {
  value: string | null;
  onChange: (activityId: string) => void;
  /** How many options to show before the user types. */
  limit?: number;
};

/**
 * Choose, don't type: favourites and presets are one tap away. A new name is added in place,
 * after checking for a near match ("Did you mean Boxing?").
 */
export function ActivityPicker({ value, onChange, limit = 8 }: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [query, setQuery] = useState('');
  const [suggestion, setSuggestion] = useState<Activity | null>(null);
  const { data: activities = [] } = useActivities();
  const { data: usage = new Map() } = useActivityUsage();
  const createActivity = useCreateActivity();

  const options = pickerOptions(activities, usage, query, language).slice(0, query ? undefined : limit);
  const canAdd = query.trim().length > 0 && !hasExactMatch(activities, query);

  function choose(activityId: string) {
    setQuery('');
    setSuggestion(null);
    onChange(activityId);
  }

  async function create() {
    const created = await createActivity.mutateAsync(query.trim());
    choose(created.id);
  }

  async function add() {
    const match = await matchActivity(query);
    const matched = match && activities.find((activity) => activity.id === match.activityId);
    if (matched && match.exact) choose(matched.id);
    else if (matched) setSuggestion(matched);
    else await create();
  }

  return (
    <View style={styles.root}>
      <TextField
        label={t('activityPicker.label')}
        placeholder={t('activityPicker.placeholder')}
        value={query}
        onChangeText={(text) => {
          setQuery(text);
          setSuggestion(null);
        }}
        autoCorrect={false}
      />
      <View style={styles.options}>
        {options.map((activity) => (
          <Chip
            key={activity.id}
            label={activityLabel(activity, language)}
            selected={activity.id === value}
            onPress={() => choose(activity.id)}
          />
        ))}
        {canAdd && !suggestion ? <Chip label={t('activityPicker.add', { name: query.trim() })} onPress={add} /> : null}
      </View>
      {suggestion ? (
        <View style={styles.suggestion}>
          <Text variant="small">{t('activityPicker.didYouMean', { name: activityLabel(suggestion, language) })}</Text>
          <View style={styles.options}>
            <Chip
              label={t('activityPicker.useSuggestion', { name: activityLabel(suggestion, language) })}
              onPress={() => choose(suggestion.id)}
            />
            <Chip label={t('activityPicker.createAnyway', { name: query.trim() })} onPress={create} />
          </View>
        </View>
      ) : null}
      <ErrorMessage error={createActivity.error} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  options: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.sm },
  suggestion: { gap: spacing.xs },
});
