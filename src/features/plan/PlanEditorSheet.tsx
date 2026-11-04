import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ActivityPicker } from '@/features/activities/ActivityPicker';
import { addDays, localToday } from '@/lib/dates';
import { useLanguage } from '@/lib/useLanguage';
import { Button, Chip, ErrorMessage, SegmentedControl, Sheet, Text, spacing } from '@/ui';

import { useAddPlanItem } from './api';
import { weekdayInitial, weekdayName } from './describeRepeat';
import { toRRule, WEEKDAYS, weekdayOfDate, type Repeat, type Weekday } from './rrule';

type RepeatChoice = 'once' | 'weekly' | 'biweekly' | 'monthly';

const COMMON_TIMES = ['07:00', '12:00', '18:00', '19:30', '20:00'];
const REMINDER_LEADS = [15, 30, 60];

function repeatOf(choice: RepeatChoice, days: Weekday[], date: string): Repeat {
  switch (choice) {
    case 'once':
      return { kind: 'once' };
    case 'weekly':
    case 'biweekly':
      return { kind: 'weekly', days, intervalWeeks: choice === 'biweekly' ? 2 : 1 };
    case 'monthly':
      return { kind: 'monthly', day: Number(date.slice(8, 10)) };
  }
}

/** A plan item: activity, optional time, a repeat rule and an optional reminder. All choices, no typing. */
export function PlanEditorSheet() {
  const { t } = useTranslation();
  const { locale } = useLanguage();
  const today = localToday();
  const nextDays = Array.from({ length: 7 }, (_, index) => addDays(today, index));
  const [activityId, setActivityId] = useState<string | null>(null);
  const [choice, setChoice] = useState<RepeatChoice>('weekly');
  const [days, setDays] = useState<Weekday[]>([weekdayOfDate(today)]);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState<string | null>('18:00');
  const [reminder, setReminder] = useState<number | null>(30);
  const addPlanItem = useAddPlanItem();

  const needsDays = choice === 'weekly' || choice === 'biweekly';
  const ready = !!activityId && (!needsDays || days.length > 0);

  function toggleDay(day: Weekday) {
    setDays((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day]));
  }

  function save() {
    if (!activityId) return;
    addPlanItem.mutate(
      {
        activity_id: activityId,
        rrule: toRRule(repeatOf(choice, days, date)),
        starts_on: needsDays ? today : date,
        time,
        reminder_lead_min: time ? reminder : null,
      },
      { onSuccess: () => router.back() },
    );
  }

  return (
    <Sheet title={t('planEditor.title')}>
      <ActivityPicker value={activityId} onChange={setActivityId} />

      <Text variant="label">{t('planEditor.repeat')}</Text>
      <SegmentedControl
        options={(['once', 'weekly', 'biweekly', 'monthly'] as const).map((value) => ({
          value,
          label: t(`plan.repeat.${value}`),
        }))}
        value={choice}
        onChange={setChoice}
      />

      {needsDays ? (
        <>
          <Text variant="label">{t('planEditor.days')}</Text>
          <View style={styles.chips}>
            {WEEKDAYS.map((day) => (
              <Chip
                key={day}
                label={weekdayInitial(day, locale)}
                accessibilityLabel={weekdayName(day, locale)}
                selected={days.includes(day)}
                onPress={() => toggleDay(day)}
              />
            ))}
          </View>
        </>
      ) : (
        <>
          <Text variant="label">{choice === 'monthly' ? t('planEditor.monthDay') : t('planEditor.date')}</Text>
          <View style={styles.chips}>
            {nextDays.map((day) => (
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
        {COMMON_TIMES.map((option) => (
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
      <ErrorMessage error={addPlanItem.error} />
      <Button label={t('common.save')} disabled={!ready} busy={addPlanItem.isPending} onPress={save} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
