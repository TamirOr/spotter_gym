import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ActivityPicker } from '@/features/activities/ActivityPicker';
import { parsePositiveNumber } from '@/features/checkins/parseNumber';
import { useLanguage } from '@/lib/useLanguage';
import { Button, Chip, ErrorMessage, SegmentedControl, Text, TextField, spacing } from '@/ui';

import { useCreateGoal, type NewGoal } from './api';
import { QUICK_TARGETS } from './goalText';

const METRICS = ['sessions', 'distance_km', 'steps'] as const;
const PERIODS = ['day', 'week', 'month'] as const;

/** Each goal has an activity, metric, target and period. Shared with cliques unless set to private. */
export function GoalForm({ onSaved, submitLabel }: { onSaved: () => void; submitLabel: string }) {
  const { t } = useTranslation();
  const { locale } = useLanguage();
  const [goal, setGoal] = useState<Omit<NewGoal, 'activity_id'> & { activity_id: string | null }>({
    activity_id: null,
    metric: 'sessions',
    target: 3,
    period: 'week',
    visibility: 'shared',
  });
  const [customTarget, setCustomTarget] = useState('');
  const createGoal = useCreateGoal();
  const update = (changes: Partial<typeof goal>) => setGoal((current) => ({ ...current, ...changes }));

  const target = parsePositiveNumber(customTarget) ?? goal.target;

  function save() {
    if (!goal.activity_id) return;
    createGoal.mutate({ ...goal, activity_id: goal.activity_id, target }, { onSuccess: onSaved });
  }

  return (
    <View style={styles.root}>
      <ActivityPicker value={goal.activity_id} onChange={(activity_id) => update({ activity_id })} />

      <Text variant="label">{t('goalEditor.metric')}</Text>
      <SegmentedControl
        options={METRICS.map((value) => ({ value, label: t(`goalEditor.metrics.${value}`) }))}
        value={goal.metric}
        onChange={(metric) => update({ metric, target: QUICK_TARGETS[metric][1] })}
      />

      <Text variant="label">{t('goalEditor.target')}</Text>
      <View style={styles.chips}>
        {QUICK_TARGETS[goal.metric].map((value) => (
          <Chip
            key={value}
            label={new Intl.NumberFormat(locale).format(value)}
            selected={customTarget === '' && goal.target === value}
            onPress={() => {
              setCustomTarget('');
              update({ target: value });
            }}
          />
        ))}
      </View>
      <TextField
        label={t('goalEditor.custom')}
        value={customTarget}
        onChangeText={setCustomTarget}
        inputMode="decimal"
      />

      <Text variant="label">{t('goalEditor.period')}</Text>
      <SegmentedControl
        options={PERIODS.map((value) => ({ value, label: t(`goalEditor.periods.${value}`) }))}
        value={goal.period}
        onChange={(period) => update({ period })}
      />

      <Text variant="label">{t('goalEditor.visibility')}</Text>
      <SegmentedControl
        options={(['shared', 'private'] as const).map((value) => ({
          value,
          label: t(`goalEditor.visibilities.${value}`),
        }))}
        value={goal.visibility}
        onChange={(visibility) => update({ visibility })}
      />

      <ErrorMessage error={createGoal.error} />
      <Button label={submitLabel} disabled={!goal.activity_id} busy={createGoal.isPending} onPress={save} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
