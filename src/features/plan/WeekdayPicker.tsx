import { StyleSheet, View } from 'react-native';

import { useLanguage } from '@/lib/useLanguage';
import { Chip, spacing } from '@/ui';

import { weekdayInitial, weekdayName } from './describeRepeat';
import { WEEKDAYS, type Weekday } from './rrule';

/** One chip per day of the week, in week order. */
export function WeekdayPicker({ selected, onToggle }: { selected: Weekday[]; onToggle: (day: Weekday) => void }) {
  const { locale } = useLanguage();
  return (
    <View style={styles.chips}>
      {WEEKDAYS.map((day) => (
        <Chip
          key={day}
          label={weekdayInitial(day, locale)}
          accessibilityLabel={weekdayName(day, locale)}
          selected={selected.includes(day)}
          onPress={() => onToggle(day)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
