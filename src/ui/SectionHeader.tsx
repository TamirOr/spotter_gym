import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { TOUCH_TARGET } from './theme';

type Props = { title: string; action?: ReactNode };

export function SectionHeader({ title, action }: Props) {
  return (
    <View style={styles.row}>
      <Text variant="label" role="heading">
        {title}
      </Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
});
