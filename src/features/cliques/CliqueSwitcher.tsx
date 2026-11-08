import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Avatar, Icon, Text, colors, radii, spacing, TOUCH_TARGET } from '@/ui';

import { useMyCliques } from './api';
import { useSelectedClique } from './SelectedCliqueProvider';

/** The clique name at the top of Today and Clique; tapping it lists the other cliques. */
export function CliqueSwitcher() {
  const { t } = useTranslation();
  const { cliques } = useMyCliques();
  const { clique, select } = useSelectedClique();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('cliqueSwitcher.a11y')}
        onPress={() => setOpen(true)}
        style={styles.trigger}
      >
        {clique?.photo_url ? <Avatar name={clique.name} photoUrl={clique.photo_url} size={32} /> : null}
        <Text variant="title" userContent>
          {clique?.name ?? t('clique.none')}
        </Text>
        <Icon name="chevronDown" size={18} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setOpen(false)} accessibilityLabel={t('common.close')}>
          <View style={styles.menu} accessibilityViewIsModal>
            <Text variant="label">{t('cliqueSwitcher.title')}</Text>
            {cliques.map((option) => (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityState={{ selected: option.id === clique?.id }}
                onPress={() => {
                  select(option.id);
                  setOpen(false);
                }}
                style={styles.option}
              >
                <Text variant="strong" userContent>
                  {option.name}
                </Text>
                {option.id === clique?.id ? <Icon name="check" size={18} /> : null}
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setOpen(false);
                router.push('/clique/new');
              }}
              style={styles.option}
            >
              <Text variant="strong">{t('cliqueSwitcher.create')}</Text>
              <Icon name="plus" size={18} />
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: TOUCH_TARGET, alignSelf: 'flex-start' },
  scrim: { flex: 1, backgroundColor: colors.scrim, paddingTop: 110, paddingHorizontal: spacing.lg },
  menu: { gap: spacing.xs, padding: spacing.lg, borderRadius: radii.md, backgroundColor: colors.background },
  option: { minHeight: TOUCH_TARGET, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
