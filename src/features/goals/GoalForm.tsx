import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { activityLabel } from '@/features/activities/activities';
import { ActivityPicker } from '@/features/activities/ActivityPicker';
import { useActivity } from '@/features/activities/api';
import { parsePositiveNumber } from '@/features/checkins/parseNumber';
import { confirmThen } from '@/lib/confirm';
import { localToday } from '@/lib/dates';
import { useLanguage } from '@/lib/useLanguage';
import { Button, Chip, ErrorMessage, SegmentedControl, Text, TextField, spacing } from '@/ui';

import { useCreateGoal, useDeleteGoal, useUpdateGoal, type GoalForEdit, type NewGoal } from './api';
import { END_CHOICES, endDateFor } from './goalEnds';
import { goalTitle, QUICK_TARGETS } from './goalText';

// Steps goals wait for Phase 2: steps come only from the optional health sync, so a steps goal made
// now could never move. Sessions and distance count from logged workouts.
const METRICS = ['sessions', 'distance_km'] as const;
const PERIODS = ['day', 'week', 'month'] as const;

type Draft = Omit<NewGoal, 'activity_id'> & { activity_id: string | null };

const NEW_GOAL: Draft = {
  activity_id: null,
  metric: 'sessions',
  target: 3,
  period: 'week',
  visibility: 'shared',
  ends_on: null,
};

function formatDay(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  );
}

/**
 * Each goal has an activity, metric, target and period, plus an optional end date. Shared with cliques
 * unless set to private. Editing keeps the activity and metric; a new target or period starts next period.
 */
export function GoalForm({
  goal,
  onSaved,
  submitLabel,
}: {
  /** The goal being edited; a new goal without it. */
  goal?: GoalForEdit;
  onSaved: () => void;
  submitLabel: string;
}) {
  const { t } = useTranslation();
  const { language, locale } = useLanguage();
  const today = localToday();
  const [draft, setDraft] = useState<Draft>(goal ?? NEW_GOAL);
  const quickTargets = QUICK_TARGETS[draft.metric];
  const [customTarget, setCustomTarget] = useState(
    goal && !quickTargets.includes(goal.target) ? String(goal.target) : '',
  );
  const activity = useActivity(draft.activity_id);
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const saving = goal ? updateGoal : createGoal;
  const update = (changes: Partial<Draft>) => setDraft((current) => ({ ...current, ...changes }));

  const target = parsePositiveNumber(customTarget) ?? draft.target;
  const endChoices = END_CHOICES.map((choice) => ({ choice, date: endDateFor(choice, today) }));
  // An end date set earlier stays on offer until another one is chosen.
  const keptEnd = goal?.ends_on && !endChoices.some(({ date }) => date === goal.ends_on) ? goal.ends_on : null;

  function save() {
    if (!draft.activity_id) return;
    const values = { ...draft, activity_id: draft.activity_id, target };
    if (goal) updateGoal.mutate({ ...values, id: goal.id }, { onSuccess: onSaved });
    else createGoal.mutate(values, { onSuccess: onSaved });
  }

  function remove() {
    if (!goal) return;
    const goalId = goal.id;
    confirmThen(t('goalEditor.deleteConfirm'), () => deleteGoal.mutate(goalId, { onSuccess: onSaved }));
  }

  return (
    <View style={styles.root}>
      {goal ? (
        <Text variant="strong" userContent>
          {goalTitle(t, { ...draft, target }, activity ? activityLabel(activity, language) : '', locale)}
        </Text>
      ) : (
        <>
          <ActivityPicker value={draft.activity_id} onChange={(activity_id) => update({ activity_id })} />
          <Text variant="label">{t('goalEditor.metric')}</Text>
          <SegmentedControl
            options={METRICS.map((value) => ({ value, label: t(`goalEditor.metrics.${value}`) }))}
            value={draft.metric as (typeof METRICS)[number]}
            onChange={(metric) => update({ metric, target: QUICK_TARGETS[metric][1] })}
          />
        </>
      )}

      <Text variant="label">{t('goalEditor.target')}</Text>
      <View style={styles.chips}>
        {quickTargets.map((value) => (
          <Chip
            key={value}
            label={new Intl.NumberFormat(locale).format(value)}
            selected={customTarget === '' && draft.target === value}
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
        value={draft.period}
        onChange={(period) => update({ period })}
      />

      <Text variant="label">{t('goalEditor.visibility')}</Text>
      <SegmentedControl
        options={(['shared', 'private'] as const).map((value) => ({
          value,
          label: t(`goalEditor.visibilities.${value}`),
        }))}
        value={draft.visibility}
        onChange={(visibility) => update({ visibility })}
      />

      <Text variant="label">{t('goalEditor.ends')}</Text>
      <View style={styles.chips}>
        {keptEnd ? (
          <Chip
            label={t('goalEditor.endsOn', { date: formatDay(keptEnd, locale) })}
            selected={draft.ends_on === keptEnd}
            onPress={() => update({ ends_on: keptEnd })}
          />
        ) : null}
        {endChoices.map(({ choice, date }) => (
          <Chip
            key={choice}
            label={choice === 'never' ? t('goalEditor.endsNever') : t(`goalEditor.endsIn.${choice}`)}
            selected={draft.ends_on === date}
            onPress={() => update({ ends_on: date })}
          />
        ))}
      </View>

      {goal ? <Text variant="caption">{t('goalEditor.nextPeriodNote')}</Text> : null}
      <ErrorMessage error={saving.error ?? deleteGoal.error} />
      <Button label={submitLabel} disabled={!draft.activity_id} busy={saving.isPending} onPress={save} />
      {goal ? (
        <Button label={t('goalEditor.delete')} variant="quiet" busy={deleteGoal.isPending} onPress={remove} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
