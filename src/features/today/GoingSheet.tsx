import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ActivityPicker } from '@/features/activities/ActivityPicker';
import { ErrorMessage, Sheet } from '@/ui';

import { markGoingVariables, useMarkGoing } from './api';

/** Going with nothing planned: one more tap picks the activity, favourites first. */
export function GoingSheet() {
  const { t } = useTranslation();
  const markGoing = useMarkGoing();

  return (
    <Sheet title={t('todayBar.action.going')}>
      <ActivityPicker
        value={null}
        onChange={(activityId) => markGoing.mutate(markGoingVariables(activityId), { onSuccess: () => router.back() })}
      />
      <ErrorMessage error={markGoing.error} />
    </Sheet>
  );
}
