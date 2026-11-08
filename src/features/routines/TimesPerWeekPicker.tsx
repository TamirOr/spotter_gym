import { StyleSheet, View } from 'react-native';

import { useLanguage } from '@/lib/useLanguage';
import { Chip, spacing } from '@/ui';

export function TimesPerWeekPicker({
  options,
  value,
  onChange,
}: {
  options: number[];
  value: number;
  onChange: (timesPerWeek: number) => void;
}) {
  const { locale } = useLanguage();
  const number = new Intl.NumberFormat(locale);
  return (
    <View style={styles.chips}>
      {options.map((option) => (
        <Chip key={option} label={number.format(option)} selected={value === option} onPress={() => onChange(option)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
