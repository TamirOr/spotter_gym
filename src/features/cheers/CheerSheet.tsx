import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { cheerText, EMOJI_CHEERS, NOTE_MAX_LENGTH, WORD_CHEERS } from '@shared/cheers.ts';
import { OneTimePhoto } from '@/features/photos/OneTimePhoto';
import { useLanguage } from '@/lib/useLanguage';
import { Button, ErrorMessage, Sheet, Text, TextField, colors, fonts, radii, spacing, TOUCH_TARGET } from '@/ui';

import { useCheerTarget, useSendCheer, type CheerInput } from './api';

/**
 * Opened from a friend line or a Going push. A Going photo, if there is one, can be opened once here.
 * One tap sends an emoji or a word; a note takes one more.
 */
export function CheerSheet() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { checkinId } = useLocalSearchParams<{ checkinId: string }>();
  const target = useCheerTarget(checkinId);
  const sendCheer = useSendCheer();
  const [note, setNote] = useState('');

  function send(input: CheerInput) {
    sendCheer.mutate(input, { onSuccess: () => router.back() });
  }

  const name = target.data?.athlete.full_name ?? '';
  const open = target.data?.state === 'going' || target.data?.state === 'done';

  return (
    <Sheet title={t('cheer.title', { name })}>
      {target.data && !open ? <Text variant="small">{t('cheer.closed')}</Text> : null}
      {open ? <OneTimePhoto checkinId={checkinId} name={name} /> : null}
      <View style={styles.emojis}>
        {EMOJI_CHEERS.map((type) => (
          <Pressable
            key={type}
            accessibilityRole="button"
            accessibilityLabel={t('cheer.send', { label: t(`cheer.emoji.${type}`) })}
            disabled={!open}
            onPress={() => send({ checkinId, type })}
            style={styles.emoji}
          >
            <Text style={styles.emojiMark}>{cheerText(type, language)}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.words}>
        {WORD_CHEERS.map((type) => (
          <Pressable
            key={type}
            accessibilityRole="button"
            disabled={!open}
            onPress={() => send({ checkinId, type })}
            style={styles.word}
          >
            <Text style={styles.wordLabel}>{cheerText(type, language)}</Text>
          </Pressable>
        ))}
      </View>
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
          disabled={!open || note.trim() === ''}
          busy={sendCheer.isPending}
          onPress={() => send({ checkinId, type: 'note', body: note })}
        />
      </View>
      <ErrorMessage error={sendCheer.error ?? target.error} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  emojis: { flexDirection: 'row', gap: spacing.sm },
  emoji: {
    flex: 1,
    height: 60,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiMark: { fontSize: 28 },
  words: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  word: {
    minHeight: TOUCH_TARGET,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: 22,
    justifyContent: 'center',
  },
  wordLabel: { fontFamily: fonts.semibold, fontSize: 15 },
  note: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  noteField: { flex: 1 },
});
