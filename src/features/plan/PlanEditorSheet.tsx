import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ActivityPicker } from '@/features/activities/ActivityPicker';
import { addDays, localToday, shortTime } from '@/lib/dates';
import { useLanguage } from '@/lib/useLanguage';
import { Button, Chip, ErrorMessage, SegmentedControl, Sheet, Text, spacing } from '@/ui';

import { useAddPlanItem, useEditPlanItem, usePlanItems, type PlanItem } from './api';
import { choiceOf, INTERVAL_CHOICES, needsDays, REPEAT_CHOICES, repeatOf, startsOnFor } from './planChoice';
import { parseRRule, toRRule, weekdayOfDate, type Weekday } from './rrule';
import { WeekdayPicker } from './WeekdayPicker';

const COMMON_TIMES = ['07:00', '12:00', '18:00', '19:30', '20:00'];
const REMINDER_LEADS = [15, 30, 60];

/** A plan item: activity, optional time, a repeat rule and an optional reminder. All choices, no typing. */
function PlanItemForm({ item }: { item?: PlanItem }) {
  const { t } = useTranslation();
  const { locale } = useLanguage();
  const today = localToday();
  const saved = item ? parseRRule(item.rrule) : null;
  const savedTime = item?.time ? shortTime(item.time) : null;
  const [activityId, setActivityId] = useState<string | null>(item?.activity_id ?? null);
  const [choice, setChoice] = useState(saved ? choiceOf(saved) : 'weekly');
  const [days, setDays] = useState<Weekday[]>(saved?.kind === 'weekly' ? saved.days : [weekdayOfDate(today)]);
  const [intervalWeeks, setIntervalWeeks] = useState(
    saved?.kind === 'weekly' && saved.intervalWeeks > 1 ? saved.intervalWeeks : INTERVAL_CHOICES[0],
  );
  const [date, setDate] = useState(item && !needsDays(choiceOf(saved!)) ? item.starts_on : today);
  const [time, setTime] = useState<string | null>(item ? savedTime : '18:00');
  const [reminder, setReminder] = useState<number | null>(item ? item.reminder_lead_min : 30);
  const addPlanItem = useAddPlanItem();
  const editPlanItem = useEditPlanItem();
  const mutation = item ? editPlanItem : addPlanItem;

  // A saved date or time that is not among the usual choices is still offered.
  const dates = [...new Set([...(item && !needsDays(choice) ? [item.starts_on] : []), ...nextWeek(today)])];
  const times = savedTime && !COMMON_TIMES.includes(savedTime) ? [savedTime, ...COMMON_TIMES] : COMMON_TIMES;
  const ready = !!activityId && (!needsDays(choice) || days.length > 0);

  function toggleDay(day: Weekday) {
    setDays((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day]));
  }

  function save() {
    if (!activityId) return;
    const rrule = toRRule(repeatOf(choice, days, intervalWeeks, date));
    const unchanged = item && rrule === item.rrule && (needsDays(choice) || date === item.starts_on);
    const values = {
      activity_id: activityId,
      rrule,
      starts_on: startsOnFor(choice, date, today, item && unchanged ? { startsOn: item.starts_on } : undefined),
      time,
      reminder_lead_min: time ? reminder : null,
    };
    const done = { onSuccess: () => router.back() };
    if (item) editPlanItem.mutate({ id: item.id, ...values }, done);
    else addPlanItem.mutate(values, done);
  }

  return (
    <Sheet title={t(item ? 'planEditor.editTitle' : 'planEditor.title')}>
      <ActivityPicker value={activityId} onChange={setActivityId} />

      <Text variant="label">{t('planEditor.repeat')}</Text>
      <SegmentedControl
        options={REPEAT_CHOICES.map((value) => ({ value, label: t(`plan.repeat.${value}`) }))}
        value={choice}
        onChange={setChoice}
      />

      {choice === 'everyNWeeks' ? (
        <View style={styles.chips}>
          {INTERVAL_CHOICES.map((weeks) => (
            <Chip
              key={weeks}
              label={t('planEditor.intervalWeeks', { count: weeks })}
              selected={intervalWeeks === weeks}
              onPress={() => setIntervalWeeks(weeks)}
            />
          ))}
        </View>
      ) : null}

      {needsDays(choice) ? (
        <>
          <Text variant="label">{t('planEditor.days')}</Text>
          <WeekdayPicker selected={days} onToggle={toggleDay} />
        </>
      ) : (
        <>
          <Text variant="label">{choice === 'monthly' ? t('planEditor.monthDay') : t('planEditor.date')}</Text>
          <View style={styles.chips}>
            {dates.map((day) => (
              <Chip
                key={day}
                label={new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', timeZone: 'UTC' }).format(
                  new Date(`${day}T00:00:00Z`),
                )}
                selected={date === day}
                onPress={() => setDate(day)}
              />
            ))}
          </View>
        </>
      )}

      <Text variant="label">{t('planEditor.time')}</Text>
      <View style={styles.chips}>
        <Chip label={t('planEditor.noTime')} selected={time === null} onPress={() => setTime(null)} />
        {times.map((option) => (
          <Chip key={option} label={option} selected={time === option} onPress={() => setTime(option)} />
        ))}
      </View>

      {time ? (
        <>
          <Text variant="label">{t('planEditor.reminder')}</Text>
          <View style={styles.chips}>
            <Chip label={t('planEditor.noReminder')} selected={reminder === null} onPress={() => setReminder(null)} />
            {REMINDER_LEADS.map((minutes) => (
              <Chip
                key={minutes}
                label={t('planEditor.minutesBefore', { count: minutes })}
                selected={reminder === minutes}
                onPress={() => setReminder(minutes)}
              />
            ))}
          </View>
        </>
      ) : null}

      <Text variant="caption">{t('plan.lockNote')}</Text>
      <ErrorMessage error={mutation.error} />
      <Button label={t('common.save')} disabled={!ready} busy={mutation.isPending} onPress={save} />
    </Sheet>
  );
}

function nextWeek(today: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(today, index));
}

/** New at /plan/new; editing at /plan/[planItemId]. */
export function PlanEditorSheet() {
  const { t } = useTranslation();
  const { planItemId } = useLocalSearchParams<{ planItemId?: string }>();
  const { data: items } = usePlanItems();
  if (!planItemId) return <PlanItemForm />;

  const item = items?.find((candidate) => candidate.id === planItemId);
  // The form starts from the saved item, so it waits for it.
  return item ? <PlanItemForm item={item} /> : <Sheet title={t('planEditor.editTitle')}>{null}</Sheet>;
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
