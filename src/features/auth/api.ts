import { supabase } from '@/lib/supabase';

// Sign-in and sign-up are the same: a 6-digit code sent by email. A code rather than a magic link,
// because a link opens in Safari and would not sign in the app installed on the Home Screen.

export async function sendCode(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
  if (error) throw error;
}

export async function verifyCode(email: string, code: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
