import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ActivityPicker } from '@/features/activities/ActivityPicker';
import { NOTE_MAX_LENGTH } from '@shared/cheers.ts';
import { newId } from '@/lib/ids';
import { Button, Chip, ErrorMessage, Sheet, Text, TextField, spacing } from '@/ui';

import { useMarkDone } from './api';
import { parsePositiveNumber } from './parseNumber';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Logs a workout: finishes my Going, or records one up to 48 hours late. Activity is the only must. */
export function LogSheet() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ checkinId?: string; activityId?: string }>();
  const [checkinId] = useState(() => params.checkinId || newId());
  const [activityId, setActivityId] = useState<string | null>(params.activityId || null);
  const [yesterday, setYesterday] = useState(false);
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [note, setNote] = useState('');
  const markDone = useMarkDone();

  function submit() {
    if (!activityId) return;
    markDone.mutate(
      {
        checkinId,
        activityId,
        endedAt: new Date(Date.now() - (yesterday ? DAY_MS : 0)),
        durationMin: parsePositiveNumber(duration),
        distanceKm: parsePositiveNumber(distance),
        note,
      },
      { onSuccess: () => router.back() },
    );
  }

  return (
    <Sheet title={t('log.title')}>
      <ActivityPicker value={activityId} onChange={setActivityId} />
      {/* Finishing a Going happens now; only a separate log can be dated back. */}
      {params.checkinId ? null : (
        <View style={styles.when}>
          <Text variant="label">{t('log.when')}</Text>
          <View style={styles.row}>
            <Chip label={t('log.now')} selected={!yesterday} onPress={() => setYesterday(false)} />
            <Chip label={t('log.yesterday')} selected={yesterday} onPress={() => setYesterday(true)} />
          </View>
        </View>
      )}
      <View style={styles.row}>
        <View style={styles.flex}>
          <TextField label={t('log.duration')} value={duration} onChangeText={setDuration} inputMode="numeric" />
        </View>
        <View style={styles.flex}>
          <TextField label={t('log.distance')} value={distance} onChangeText={setDistance} inputMode="decimal" />
        </View>
      </View>
      <TextField label={t('log.note')} value={note} onChangeText={setNote} maxLength={NOTE_MAX_LENGTH} />
      <ErrorMessage error={markDone.error} />
      <Button label={t('log.submit')} disabled={!activityId} busy={markDone.isPending} onPress={submit} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  when: { gap: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
