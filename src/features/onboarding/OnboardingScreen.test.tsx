import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initI18n, setLanguage } from '@/i18n';

import { OnboardingScreen } from './OnboardingScreen';

jest.mock('@/features/auth/AuthProvider', () => ({ useUserId: () => 'user-1' }));
jest.mock('@/features/profile/avatar', () => ({ pickAndUploadAvatar: jest.fn() }));
jest.mock('@/features/push/PushToggle', () => ({ PushToggle: () => null }));
// Opened from the Home Screen, with no browser install dialog, unless a test says otherwise.
const mockInstallGuide = jest.fn(() => 'none');
const mockCanPrompt = jest.fn(() => false);
const mockPromptInstall = jest.fn(async () => true);
jest.mock('@/features/install/browser', () => ({
  currentInstallGuide: () => mockInstallGuide(),
  useCanPromptInstall: () => mockCanPrompt(),
  promptInstall: () => mockPromptInstall(),
}));
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

  async function renderOnboarding() {
    await render(
      <SafeAreaProvider initialMetrics={PHONE}>
        <OnboardingScreen />
      </SafeAreaProvider>,
    );
  }

  it('goes from routines straight to notifications', async () => {
    await renderOnboarding();
    await fireEvent.press(screen.getByText('Continue'));
    await fireEvent.press(screen.getByText('skip routines'));
    expect(screen.getByText('Notifications')).toBeTruthy();
  });

  it('starts in Safari with how to add Spotter to the Home Screen', async () => {
    mockInstallGuide.mockReturnValueOnce('ios');
    await renderOnboarding();
    expect(screen.getByText('Put Spotter on your Home Screen')).toBeTruthy();
    expect(screen.getByText(/Add to Home Screen/)).toBeTruthy();
    await fireEvent.press(screen.getByText('Continue in the browser for now'));
    expect(screen.getByText('What’s your name?')).toBeTruthy();
  });

  it('walks Android through the browser menu when there is no install dialog', async () => {
    mockInstallGuide.mockReturnValueOnce('android');
    await renderOnboarding();
    expect(screen.getByText(/Install app/)).toBeTruthy();
    expect(screen.queryByText('Install Spotter')).toBeNull();
  });

  it('opens the browser install dialog on Android', async () => {
    mockInstallGuide.mockReturnValueOnce('android');
    mockCanPrompt.mockReturnValue(true);
    await renderOnboarding();
    await fireEvent.press(screen.getByText('Install Spotter'));
    expect(mockPromptInstall).toHaveBeenCalled();
    expect(await screen.findByText('Installed. Open Spotter from your Home Screen.')).toBeTruthy();
    mockCanPrompt.mockReturnValue(false);
  });

  it('skips the guide in the Home Screen app', async () => {
    await renderOnboarding();
    expect(screen.queryByText('Put Spotter on your Home Screen')).toBeNull();
    expect(screen.getByText('What’s your name?')).toBeTruthy();
  });
});
