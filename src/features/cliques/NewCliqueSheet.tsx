import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, ErrorMessage, Sheet, TextField } from '@/ui';

import { useCreateClique } from './api';
import { useSelectedClique } from './SelectedCliqueProvider';

export function NewCliqueSheet() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const createClique = useCreateClique();
  const { select } = useSelectedClique();

  function create() {
    createClique.mutate(name, {
      onSuccess: (clique) => {
        select(clique.id);
        router.replace('/invite');
      },
    });
  }

  return (
    <Sheet title={t('newClique.title')}>
      <TextField label={t('newClique.name')} value={name} onChangeText={setName} maxLength={40} autoFocus />
      <ErrorMessage error={createClique.error} />
      <Button label={t('newClique.create')} disabled={!name.trim()} busy={createClique.isPending} onPress={create} />
    </Sheet>
  );
}
