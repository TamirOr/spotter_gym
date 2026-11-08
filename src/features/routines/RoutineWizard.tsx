import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ActivityPicker } from '@/features/activities/ActivityPicker';
import { WeekdayPicker } from '@/features/plan/WeekdayPicker';
import { Button, ErrorMessage, Text, spacing } from '@/ui';

import { useSaveRoutine } from './api';
import { canSave, MAX_TIMES_PER_WEEK, NEW_ROUTINE, selectedDays, toggleDay, type RoutineDraft } from './routine';
import { TimesPerWeekPicker } from './TimesPerWeekPicker';

type Question = 'ask' | 'type' | 'times' | 'days';

const ALL_TIMES = Array.from({ length: MAX_TIMES_PER_WEEK }, (_, index) => index + 1);

/**
 * First-run routines, one question at a time: type, times a week, then optional days.
 * After each routine it asks again, until the user skips or is done.
 */
export function RoutineWizard({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const [question, setQuestion] = useState<Question>('ask');
  const [draft, setDraft] = useState<RoutineDraft>(NEW_ROUTINE);
  const [added, setAdded] = useState(0);
  const saveRoutine = useSaveRoutine();

  function save() {
    if (!canSave(draft)) return;
    saveRoutine.mutate(
      { routineId: null, draft },
      {
        onSuccess: () => {
          setAdded((count) => count + 1);
          setDraft(NEW_ROUTINE);
          setQuestion('type');
        },
      },
    );
  }

  if (question === 'ask') {
    return (
      <>
        <Text variant="title" role="heading">
          {t('onboarding.routineAsk')}
        </Text>
        <Text variant="small">{t('onboarding.routineAskHint')}</Text>
        <Button label={t('onboarding.routineYes')} onPress={() => setQuestion('type')} />
        <Button label={t('onboarding.routineNo')} variant="outline" onPress={onDone} />
      </>
    );
  }

  const stop = (
    <Button
      label={added > 0 ? t('onboarding.routineDone') : t('onboarding.routineSkip')}
      variant="quiet"
      onPress={onDone}
    />
  );

  return (
    <>
      {added > 0 ? <Text variant="small">{t('onboarding.routineAdded', { count: added })}</Text> : null}

      {question === 'type' ? (
        <>
          <Text variant="title" role="heading">
            {added > 0 ? t('onboarding.routineAnotherType') : t('onboarding.routineType')}
          </Text>
          <ActivityPicker value={draft.activityId} onChange={(activityId) => setDraft({ ...draft, activityId })} />
          <Button label={t('common.continue')} disabled={!draft.activityId} onPress={() => setQuestion('times')} />
        </>
      ) : null}

      {question === 'times' ? (
        <>
          <Text variant="title" role="heading">
            {t('onboarding.routineTimes')}
          </Text>
          <TimesPerWeekPicker
            options={ALL_TIMES}
            value={draft.timesPerWeek}
            onChange={(timesPerWeek) => setDraft({ ...draft, timesPerWeek })}
          />
          <Button label={t('common.continue')} onPress={() => setQuestion('days')} />
        </>
      ) : null}

      {question === 'days' ? (
        <>
          <Text variant="title" role="heading">
            {t('onboarding.routineDays')}
          </Text>
          <Text variant="small">{t('routineEditor.daysHint')}</Text>
          <View style={styles.days}>
            <WeekdayPicker selected={selectedDays(draft)} onToggle={(day) => setDraft(toggleDay(draft, day))} />
          </View>
          <ErrorMessage error={saveRoutine.error} />
          <Button label={t('common.save')} disabled={!canSave(draft)} busy={saveRoutine.isPending} onPress={save} />
        </>
      ) : null}

      {stop}
    </>
  );
}

const styles = StyleSheet.create({
  days: { paddingVertical: spacing.sm },
});
