import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ActivityPicker } from '@/features/activities/ActivityPicker';
import { weekdayName } from '@/features/plan/describeRepeat';
import { WeekdayPicker } from '@/features/plan/WeekdayPicker';
import { useLanguage } from '@/lib/useLanguage';
import { Button, ErrorMessage, Sheet, Text, TextField } from '@/ui';

import { useRemoveRoutine, useRoutine, useSaveRoutine, type Routine } from './api';
import {
  canSave,
  draftOf,
  nameDay,
  NEW_ROUTINE,
  selectedDays,
  timesPerWeekOptions,
  toggleDay,
  type RoutineDraft,
} from './routine';
import { TimesPerWeekPicker } from './TimesPerWeekPicker';

const DAY_NAME_MAX_LENGTH = 40;

function RoutineEditor({ routine }: { routine: Routine | undefined }) {
  const { t } = useTranslation();
  const { locale } = useLanguage();
  const [draft, setDraft] = useState<RoutineDraft>(routine ? draftOf(routine) : NEW_ROUTINE);
  const saveRoutine = useSaveRoutine();
  const removeRoutine = useRemoveRoutine();
  const close = () => router.back();

  function save() {
    if (canSave(draft)) saveRoutine.mutate({ routineId: routine?.id ?? null, draft }, { onSuccess: close });
  }

  return (
    <Sheet title={routine ? t('routineEditor.editTitle') : t('routineEditor.newTitle')}>
      <ActivityPicker value={draft.activityId} onChange={(activityId) => setDraft({ ...draft, activityId })} />

      <Text variant="label">{t('routineEditor.timesPerWeek')}</Text>
      <TimesPerWeekPicker
        options={timesPerWeekOptions(draft)}
        value={draft.timesPerWeek}
        onChange={(timesPerWeek) => setDraft({ ...draft, timesPerWeek })}
      />

      <Text variant="label">{t('routineEditor.days')}</Text>
      <Text variant="caption">{t('routineEditor.daysHint')}</Text>
      <WeekdayPicker selected={selectedDays(draft)} onToggle={(day) => setDraft(toggleDay(draft, day))} />

      {draft.days.length > 0 ? <Text variant="label">{t('routineEditor.dayNames')}</Text> : null}
      {draft.days.map((day) => (
        <TextField
          key={day.weekday}
          label={weekdayName(day.weekday, locale)}
          placeholder={t('routineEditor.dayNamePlaceholder')}
          value={day.name}
          onChangeText={(name) => setDraft(nameDay(draft, day.weekday, name))}
          maxLength={DAY_NAME_MAX_LENGTH}
        />
      ))}

      <ErrorMessage error={saveRoutine.error ?? removeRoutine.error} />
      <Button label={t('common.save')} disabled={!canSave(draft)} busy={saveRoutine.isPending} onPress={save} />
      {routine ? (
        <Button
          label={t('routineEditor.remove')}
          variant="quiet"
          busy={removeRoutine.isPending}
          onPress={() => removeRoutine.mutate(routine.id, { onSuccess: close })}
        />
      ) : null}
    </Sheet>
  );
}

/** Add a routine, or edit one from Me: workout type, times a week, optional days and a name for each day. */
export function RoutineEditorSheet() {
  const { routineId } = useLocalSearchParams<{ routineId?: string }>();
  const routine = useRoutine(routineId);
  // Wait for the routine before seeding the form, so an edit never starts from a blank draft.
  if (routineId && !routine) return null;
  return <RoutineEditor key={routine?.id ?? 'new'} routine={routine} />;
}
