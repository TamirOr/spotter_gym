import { useEffect } from 'react';

import { accessOf } from '@/features/access/access';
import { useAuth } from '@/features/auth/AuthProvider';
import { useLiveUpdates } from '@/features/live/useLiveUpdates';
import { useProfile } from '@/features/profile/api';
import { refreshPushSubscription, registerServiceWorker } from '@/features/push/webPush';
import { setLanguage } from '@/i18n';

export type AppStage = 'loading' | 'signIn' | 'waiting' | 'onboarding' | 'app';

export type AppSession = { stage: AppStage; isAdmin: boolean };

/** Where the signed-in journey stands, plus the side effects of being in the app. */
export function useAppSession(): AppSession {
  const { session, ready } = useAuth();
  const profile = useProfile(!!session);
  const signedIn = !!profile.data;
  const member = !!profile.data && accessOf(profile.data) === 'member';
  const language = profile.data?.language;

  useEffect(() => {
    if (language) void setLanguage(language);
  }, [language]);

  useEffect(() => {
    if (!signedIn) return;
    void registerServiceWorker()?.then(refreshPushSubscription);
  }, [signedIn]);

  useLiveUpdates(member);

  return { stage: stageOf(), isAdmin: member && !!profile.data?.is_admin };

  function stageOf(): AppStage {
    if (!ready || (session && profile.isLoading)) return 'loading';
    if (!session || !profile.data) return 'signIn';
    if (!member) return 'waiting';
    return profile.data.onboarded_at ? 'app' : 'onboarding';
  }
}
