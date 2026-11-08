import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initI18n, setLanguage } from '@/i18n';

import { OnboardingScreen } from './OnboardingScreen';

jest.mock('@/features/auth/AuthProvider', () => ({ useUserId: () => 'user-1' }));
jest.mock('@/features/profile/avatar', () => ({ pickAndUploadAvatar: jest.fn() }));
jest.mock('@/features/push/PushToggle', () => ({ PushToggle: () => null }));
jest.mock('@/features/profile/api', () => ({
  useProfile: () => ({ data: { full_name: 'Noa', avatar_url: null } }),
  // Saving the profile succeeds at once, so the screen moves on.
  useUpdateProfile: () => ({
    mutate: (_: unknown, options?: { onSuccess?: () => void }) => options?.onSuccess?.(),
    isPending: false,
    error: null,
  }),
}));
// The wizard has its own data; here it only needs a way to finish.
jest.mock('@/features/routines/RoutineWizard', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    RoutineWizard: ({ onDone }: { onDone: () => void }) => (
      <Pressable onPress={onDone}>
        <Text>skip routines</Text>
      </Pressable>
    ),
  };
});

const PHONE = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

describe('OnboardingScreen', () => {
  beforeAll(async () => {
    initI18n();
    await setLanguage('en');
  });

  it('goes from routines straight to notifications', async () => {
    await render(
      <SafeAreaProvider initialMetrics={PHONE}>
        <OnboardingScreen />
      </SafeAreaProvider>,
    );
    await fireEvent.press(screen.getByText('Continue'));
    await fireEvent.press(screen.getByText('skip routines'));
    expect(screen.getByText('Notifications')).toBeTruthy();
  });
});
