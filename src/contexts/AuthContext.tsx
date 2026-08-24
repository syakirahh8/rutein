import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSession, onAuthStateChange, signIn, signOut, signUp } from '@/services/authService';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: typeof signIn;
  signUp: typeof signUp;
  signOut: typeof signOut;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getSession().then((s) => {
      if (mounted) {
        setSession(s);
        setLoading(false);
      }
    });
    const unsubscribe = onAuthStateChange((s) => setSession(s));
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const value: AuthContextValue = {
    user: session?.user ?? null,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
