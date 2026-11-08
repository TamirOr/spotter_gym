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

/**
 * Sign-in until there is a session, waiting until approved, onboarding until set up, then the app.
 * Admins see the admin screens or the regular app, one at a time, and switch between them.
 */
export function RootNavigator() {
  const { stage, view } = useAppSession();
  if (stage === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  const navigator = (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Protected guard={stage === 'signIn'}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
      <Stack.Protected guard={stage === 'waiting'}>
        <Stack.Screen name="waiting" />
      </Stack.Protected>
      <Stack.Protected guard={stage === 'onboarding'}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      {/* Listed before the regular app, so an admin lands on the admin home. */}
      <Stack.Protected guard={stage === 'app' && view === 'admin'}>
        <Stack.Screen name="admin/index" />
        <Stack.Screen name="admin/users" />
        <Stack.Screen name="admin/user/[userId]" />
      </Stack.Protected>
      <Stack.Protected guard={stage === 'app' && view === 'user'}>
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
        <Stack.Screen name="goals/[goalId]" options={sheet} />
        <Stack.Screen name="plan/new" options={sheet} />
        <Stack.Screen name="plan/[planItemId]" options={sheet} />
        <Stack.Screen name="routine/new" options={sheet} />
        <Stack.Screen name="routine/[routineId]" options={sheet} />
        <Stack.Screen name="day/[date]" options={sheet} />
        <Stack.Screen name="clique/new" options={sheet} />
        <Stack.Screen name="clique/edit" options={sheet} />
      </Stack.Protected>
    </Stack>
  );

  // Clique data needs a signed-in user, so the provider only wraps the app itself.
  return stage === 'app' ? <SelectedCliqueProvider>{navigator}</SelectedCliqueProvider> : navigator;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
