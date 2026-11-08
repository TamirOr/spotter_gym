import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ActivityPicker } from '@/features/activities/ActivityPicker';
import { NOTE_MAX_LENGTH } from '@shared/cheers.ts';
import { confirmThen } from '@/lib/confirm';
import { newId } from '@/lib/ids';
import { Button, Chip, ErrorMessage, Sheet, Text, TextField, spacing } from '@/ui';

import {
  useDeleteWorkout,
  useEditWorkout,
  useLastDuration,
  useLoggedWorkout,
  useMarkDone,
  type LoggedWorkout,
} from './api';
import { parsePositiveNumber } from './parseNumber';
import { numberText, prefillField } from './prefill';

const DAY_MS = 24 * 60 * 60 * 1000;

type Fields = { activityId: string | null; duration: string; distance: string; note: string };

function WorkoutFields({
  fields,
  onChange,
  children,
}: {
  fields: Fields;
  onChange: (changes: Partial<Fields>, touchedDuration?: boolean) => void;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <>
      <ActivityPicker value={fields.activityId} onChange={(activityId) => onChange({ activityId })} />
      {children}
      <View style={styles.row}>
        <View style={styles.flex}>
          <TextField
            label={t('log.duration')}
            value={fields.duration}
            onChangeText={(duration) => onChange({ duration }, true)}
            inputMode="numeric"
          />
        </View>
        <View style={styles.flex}>
          <TextField
            label={t('log.distance')}
            value={fields.distance}
            onChangeText={(distance) => onChange({ distance })}
            inputMode="decimal"
          />
        </View>
      </View>
      <TextField
        label={t('log.note')}
        value={fields.note}
        onChangeText={(note) => onChange({ note })}
        maxLength={NOTE_MAX_LENGTH}
      />
    </>
  );
}

/** Logs a workout: finishes my Going, or records one up to 48 hours late. Activity is the only must. */
function NewWorkout({ checkinId: goingId, activityId }: { checkinId?: string; activityId?: string }) {
  const { t } = useTranslation();
  const [checkinId] = useState(() => goingId || newId());
  const [fields, setFields] = useState<Fields>({ activityId: activityId || null, duration: '', distance: '', note: '' });
  const [durationTouched, setDurationTouched] = useState(false);
  const [yesterday, setYesterday] = useState(false);
  const lastDuration = useLastDuration(fields.activityId);
  const markDone = useMarkDone();
  // The duration last used for this activity, until the user types their own.
  const shown = { ...fields, duration: prefillField(fields.duration, durationTouched, lastDuration.data) };

  function change(changes: Partial<Fields>, touchedDuration = false) {
    if (touchedDuration) setDurationTouched(true);
    setFields((current) => ({ ...current, ...changes }));
  }

  function submit() {
    if (!fields.activityId) return;
    markDone.mutate(
      {
        checkinId,
        activityId: fields.activityId,
        endedAt: new Date(Date.now() - (yesterday ? DAY_MS : 0)),
        durationMin: parsePositiveNumber(shown.duration),
        distanceKm: parsePositiveNumber(fields.distance),
        note: fields.note,
      },
      { onSuccess: () => router.back() },
    );
  }

  return (
    <Sheet title={t('log.title')}>
      <WorkoutFields fields={shown} onChange={change}>
        {/* Finishing a Going happens now; only a separate log can be dated back. */}
        {goingId ? null : (
          <View style={styles.when}>
            <Text variant="label">{t('log.when')}</Text>
            <View style={styles.row}>
              <Chip label={t('log.now')} selected={!yesterday} onPress={() => setYesterday(false)} />
              <Chip label={t('log.yesterday')} selected={yesterday} onPress={() => setYesterday(true)} />
            </View>
          </View>
        )}
      </WorkoutFields>
      <ErrorMessage error={markDone.error} />
      <Button label={t('log.submit')} disabled={!fields.activityId} busy={markDone.isPending} onPress={submit} />
    </Sheet>
  );
}

/** Fixes a logged workout, or deletes it. Opened from a day on the Me tab. */
function EditWorkout({ workout }: { workout: LoggedWorkout }) {
  const { t } = useTranslation();
  const [fields, setFields] = useState<Fields>({
    activityId: workout.activity_id,
    duration: numberText(workout.duration_min),
    distance: numberText(workout.distance_km),
    note: workout.note ?? '',
  });
  const editWorkout = useEditWorkout();
  const deleteWorkout = useDeleteWorkout();

  function save() {
    if (!fields.activityId) return;
    editWorkout.mutate(
      {
        checkinId: workout.id,
        changes: {
          activity_id: fields.activityId,
          duration_min: parsePositiveNumber(fields.duration),
          distance_km: parsePositiveNumber(fields.distance),
          note: fields.note,
        },
      },
      { onSuccess: () => router.back() },
    );
  }

  function remove() {
    confirmThen(t('me.day.deleteConfirm'), () =>
      deleteWorkout.mutate(workout.id, { onSuccess: () => router.back() }),
    );
  }

  return (
    <Sheet title={t('log.editTitle')}>
      <WorkoutFields fields={fields} onChange={(changes) => setFields((current) => ({ ...current, ...changes }))} />
      <ErrorMessage error={editWorkout.error ?? deleteWorkout.error} />
      <Button label={t('common.save')} disabled={!fields.activityId} busy={editWorkout.isPending} onPress={save} />
      <Button label={t('me.day.delete')} variant="quiet" busy={deleteWorkout.isPending} onPress={remove} />
    </Sheet>
  );
}

export function LogSheet() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ checkinId?: string; activityId?: string; editId?: string }>();
  const workout = useLoggedWorkout(params.editId);

  if (!params.editId) return <NewWorkout checkinId={params.checkinId} activityId={params.activityId} />;
  // The form starts from the saved values, so it waits for them.
  return workout.data ? (
    <EditWorkout workout={workout.data} />
  ) : (
    <Sheet title={t('log.editTitle')}>
      <ErrorMessage error={workout.error} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  when: { gap: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
