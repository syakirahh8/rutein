import { supabase } from '@/lib/supabaseClient';
import type { AuthError, Session, User } from '@supabase/supabase-js';

export interface AuthResult {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

export async function signUp(email: string, password: string, fullName?: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: fullName ? { full_name: fullName } : undefined,
    },
  });
  return { user: data.user, session: data.session, error };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { user: data.user, session: data.session, error };
}

export async function signOut(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('getSession error:', error.message);
    return null;
  }
  return data.session;
}

export function onAuthStateChange(callback: (session: Session | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => data.subscription.unsubscribe();
}
