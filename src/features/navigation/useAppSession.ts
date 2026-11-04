import { useEffect } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { useLiveUpdates } from '@/features/live/useLiveUpdates';
import { useProfile } from '@/features/profile/api';
import { refreshPushSubscription, registerServiceWorker } from '@/features/push/webPush';
import { setLanguage } from '@/i18n';

export type AppStage = 'loading' | 'welcome' | 'onboarding' | 'app';

/** Where the signed-in journey stands, plus the side effects of being in the app. */
export function useAppSession(): AppStage {
  const { session, ready } = useAuth();
  const profile = useProfile(!!session);
  const joined = !!profile.data?.joined_at;
  const language = profile.data?.language;

  useEffect(() => {
    if (language) void setLanguage(language);
  }, [language]);

  useEffect(() => {
    if (!joined) return;
    void registerServiceWorker()?.then(refreshPushSubscription);
  }, [joined]);

  useLiveUpdates(joined);

  if (!ready || (session && profile.isLoading)) return 'loading';
  if (!session || !joined) return 'welcome';
  return profile.data?.onboarded_at ? 'app' : 'onboarding';
}
