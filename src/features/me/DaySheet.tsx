import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useChangeOccurrence } from '@/features/plan/api';
import { useLanguage } from '@/lib/useLanguage';
import { Button, ErrorMessage, Sheet } from '@/ui';

/** A planned day on the Me tab: skip it, move it to tomorrow, or log it. */
export function DaySheet() {
  const { t } = useTranslation();
  const { locale } = useLanguage();
  const { date, planItemId } = useLocalSearchParams<{ date: string; planItemId: string }>();
  const changeOccurrence = useChangeOccurrence();
  const title = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));

  function change(moveToNextDay: boolean) {
    changeOccurrence.mutate({ planItemId, day: date, moveToNextDay }, { onSuccess: () => router.back() });
  }

  return (
    <Sheet title={title}>
      <Button label={t('me.day.log')} onPress={() => router.replace('/log')} />
      <Button label={t('me.day.moveTomorrow')} variant="outline" onPress={() => change(true)} />
      <Button label={t('me.day.skip')} variant="outline" onPress={() => change(false)} />
      <ErrorMessage error={changeOccurrence.error} />
    </Sheet>
  );
}
