import { Stack } from 'expo-router/stack';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { SelectedCliqueProvider } from '@/features/cliques/SelectedCliqueProvider';
import { colors } from '@/ui';

import { useAppSession } from './useAppSession';

// Sheets slide over the screen they were opened from.
const sheet = {
  presentation: 'transparentModal',
  animation: 'slide_from_bottom',
  contentStyle: { backgroundColor: 'transparent' },
} as const;

/** Welcome until an invite is redeemed, onboarding until set up, then the app. */
export function RootNavigator() {
  const stage = useAppSession();
  if (stage === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  const navigator = (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Protected guard={stage === 'welcome'}>
        <Stack.Screen name="welcome" />
      </Stack.Protected>
      <Stack.Protected guard={stage === 'onboarding'}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={stage === 'app'}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="plan/index" />
        <Stack.Screen name="friends" />
        <Stack.Screen name="friend/[userId]" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="invite" />
        <Stack.Screen name="going" options={sheet} />
        <Stack.Screen name="log" options={sheet} />
        <Stack.Screen name="cheers" options={sheet} />
        <Stack.Screen name="cheer/[checkinId]" options={sheet} />
        <Stack.Screen name="nudge/[userId]" options={sheet} />
        <Stack.Screen name="goals/new" options={sheet} />
        <Stack.Screen name="plan/new" options={sheet} />
        <Stack.Screen name="day/[date]" options={sheet} />
        <Stack.Screen name="clique/new" options={sheet} />
      </Stack.Protected>
    </Stack>
  );

  // Clique data needs a joined user, so the provider only wraps the app itself.
  return stage === 'app' ? <SelectedCliqueProvider>{navigator}</SelectedCliqueProvider> : navigator;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
