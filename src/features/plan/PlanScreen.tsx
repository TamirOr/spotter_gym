import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { activityLabel } from '@/features/activities/activities';
import { useActivity } from '@/features/activities/api';
import { shortTime } from '@/lib/dates';
import { useLanguage } from '@/lib/useLanguage';
import { Button, ErrorMessage, Screen, Text, colors, spacing } from '@/ui';

import { usePlanItems, useRemovePlanItem, type PlanItem } from './api';
import { describeRepeat } from './describeRepeat';
import { parseRRule } from './rrule';

function PlanItemRow({ item }: { item: PlanItem }) {
  const { t } = useTranslation();
  const { language, locale } = useLanguage();
  const activity = useActivity(item.activity_id);
  const removePlanItem = useRemovePlanItem();
  const rule = describeRepeat(t, parseRRule(item.rrule), item.starts_on, locale);

  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text variant="strong" userContent>
          {activity ? activityLabel(activity, language) : ''}
        </Text>
        <Text variant="small">{item.time ? t('plan.atTime', { rule, time: shortTime(item.time) }) : rule}</Text>
        <ErrorMessage error={removePlanItem.error} />
      </View>
      <Button
        label={t('plan.remove')}
        variant="quiet"
        busy={removePlanItem.isPending}
        onPress={() => removePlanItem.mutate(item.id)}
      />
    </View>
  );
}

/** See and edit the week's plan. Opened from Me. */
export function PlanScreen() {
  const { t } = useTranslation();
  const { data: items = [] } = usePlanItems();
  return (
    <Screen back>
      <Text variant="title" role="heading">
        {t('plan.title')}
      </Text>
      {items.length === 0 ? <Text variant="small">{t('plan.empty')}</Text> : null}
      {items.map((item) => (
        <PlanItemRow key={item.id} item={item} />
      ))}
      <Text variant="caption">{t('plan.lockNote')}</Text>
      <Button label={t('plan.add')} onPress={() => router.push('/plan/new')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  text: { flex: 1, gap: 2 },
});
