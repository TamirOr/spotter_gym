import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Sheet } from '@/ui';

import { GoalForm } from './GoalForm';

export function NewGoalSheet() {
  const { t } = useTranslation();
  return (
    <Sheet title={t('goalEditor.title')}>
      <GoalForm submitLabel={t('common.save')} onSaved={() => router.back()} />
    </Sheet>
  );
}
