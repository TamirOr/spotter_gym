import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    // Returns to the installed home-screen app, which picks the session up from the URL.
    options: { redirectTo: Platform.OS === 'web' ? window.location.origin : undefined },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
