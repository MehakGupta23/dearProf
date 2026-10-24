import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { getUserById, type User } from './api';

interface AuthContextValue {
  session: Session | null;
  profile: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionChecked, setSessionChecked] = useState(false);

  // Session: initial load + future changes (login, logout, token refresh)
useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session);
    setSessionChecked(true);
  });

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    setSession(session);
  });

  return () => subscription.unsubscribe();
}, []);

// Profile: fetch public.users row once we know who's logged in
useEffect(() => {
  if (!sessionChecked) return;
  if (!session?.user?.id) {
    setProfile(null);
    setLoading(false);
    return;
  }
  setLoading(true);
  getUserById(session.user.id)
    .then(setProfile)
    .catch(() => setProfile(null))
    .finally(() => setLoading(false));
}, [sessionChecked, session?.user?.id]);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}