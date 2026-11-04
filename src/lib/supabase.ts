import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import type { Database } from './database.types';

function requireEnv(name: string, value: string | undefined): string {
  if (!value) throw new Error(`${name} is not set. Copy .env.example to .env.local.`);
  return value;
}

// Expo inlines EXPO_PUBLIC_* only when read as literal process.env.NAME expressions.
export const supabase = createClient<Database>(
  requireEnv('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL),
  requireEnv('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY', process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      // The Google sign-in redirect lands back on the web app with the session in the URL.
      detectSessionInUrl: Platform.OS === 'web',
    },
  },
);

type Result = { data: unknown; error: null } | { data: null; error: { message: string } };
type Success<R extends Result> = Extract<R, { error: null }>['data'];

/** Unwraps a Supabase response, throwing its error so React Query sees a failure. */
export function unwrap<R extends Result>(result: R): Success<R> {
  if (result.error !== null) throw result.error;
  return result.data as Success<R>;
}
