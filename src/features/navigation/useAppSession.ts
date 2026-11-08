import { useEffect } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { useLiveUpdates } from '@/features/live/useLiveUpdates';
import { useProfile } from '@/features/profile/api';
import { refreshPushSubscription, registerServiceWorker } from '@/features/push/webPush';
import { setLanguage } from '@/i18n';

export type AppStage = 'loading' | 'signIn' | 'onboarding' | 'app';

/** Where the signed-in journey stands, plus the side effects of being in the app. */
export function useAppSession(): AppStage {
  const { session, ready } = useAuth();
  const profile = useProfile(!!session);
  const signedIn = !!profile.data;
  const language = profile.data?.language;

  useEffect(() => {
    if (language) void setLanguage(language);
  }, [language]);

  useEffect(() => {
    if (!signedIn) return;
    void registerServiceWorker()?.then(refreshPushSubscription);
  }, [signedIn]);

  useLiveUpdates(signedIn);

  if (!ready || (session && profile.isLoading)) return 'loading';
  if (!session || !profile.data) return 'signIn';
  return profile.data?.onboarded_at ? 'app' : 'onboarding';
}
