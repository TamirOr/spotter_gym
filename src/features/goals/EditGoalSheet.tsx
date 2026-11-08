import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ErrorMessage, Sheet } from '@/ui';

import { useGoalForEdit } from './api';
import { GoalForm } from './GoalForm';

/** Opened from a goal on the Me tab. */
export function EditGoalSheet() {
  const { t } = useTranslation();
  const { goalId } = useLocalSearchParams<{ goalId: string }>();
  const goal = useGoalForEdit(goalId);
  return (
    <Sheet title={t('goalEditor.editTitle')}>
      {/* The form starts from the saved goal, so it waits for it. */}
      {goal.data ? <GoalForm goal={goal.data} submitLabel={t('common.save')} onSaved={() => router.back()} /> : null}
      <ErrorMessage error={goal.error} />
    </Sheet>
  );
}
