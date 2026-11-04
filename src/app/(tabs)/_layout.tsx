import { Tabs } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, colors, fonts, type IconName } from '@/ui';

function tabIcon(name: IconName) {
  return function TabIcon({ color }: { color: ColorValue }) {
    return <Icon name={name} color={color} />;
  };
}

/** Three tabs keep most of the app one tap from the home screen. */
export default function TabsLayout() {
  const { t } = useTranslation();
  const { bottom } = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
        tabBarStyle: { height: 58 + Math.max(bottom, 12), paddingTop: 6, borderTopColor: colors.line },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.today'), tabBarIcon: tabIcon('today') }} />
      <Tabs.Screen name="clique" options={{ title: t('tabs.clique'), tabBarIcon: tabIcon('clique') }} />
      <Tabs.Screen name="me" options={{ title: t('tabs.me'), tabBarIcon: tabIcon('me') }} />
    </Tabs>
  );
}
