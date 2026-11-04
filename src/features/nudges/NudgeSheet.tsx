import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { NOTE_MAX_LENGTH, NUDGE_EMOJI } from '@shared/cheers.ts';
import { usePerson } from '@/features/friends/api';
import { Button, ErrorMessage, Sheet, Text, TextField, colors, spacing } from '@/ui';

import { useSendNudge } from './api';

export function NudgeSheet() {
  const { t } = useTranslation();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const name = usePerson(userId).data?.full_name ?? '';
  const sendNudge = useSendNudge();
  const [note, setNote] = useState('');

  function send(body: string | null) {
    sendNudge.mutate({ recipientId: userId, body }, { onSuccess: () => router.back() });
  }

  return (
    <Sheet title={t('nudge.title', { name })}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('nudge.sendEmoji')}
        onPress={() => send(null)}
        style={styles.emoji}
      >
        <Text style={styles.emojiMark}>{NUDGE_EMOJI}</Text>
      </Pressable>
      <View style={styles.note}>
        <View style={styles.noteField}>
          <TextField
            label={t('cheer.noteLabel')}
            placeholder={t('cheer.notePlaceholder')}
            value={note}
            onChangeText={setNote}
            maxLength={NOTE_MAX_LENGTH}
          />
        </View>
        <Button
          label={t('common.send')}
          disabled={note.trim() === ''}
          busy={sendNudge.isPending}
          onPress={() => send(note.trim())}
        />
      </View>
      <ErrorMessage error={sendNudge.error} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  emoji: {
    height: 88,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiMark: { fontSize: 44 },
  note: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  noteField: { flex: 1 },
});
