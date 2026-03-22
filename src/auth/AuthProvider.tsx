import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';

import { supabase } from '@/src/lib/supabase';

type RegisterInput = {
  email: string;
  password: string;
  fullName: string;
};

type LoginInput = {
  email: string;
  password: string;
};

type AuthContextValue = {
  authReady: boolean;
  session: Session | null;
  user: User | null;
  fullName: string;
  signIn: (input: LoginInput) => Promise<void>;
  signUp: (input: RegisterInput) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchProfileName(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    return '';
  }

  return data?.full_name ?? '';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [fullName, setFullName] = useState('');

  const user = session?.user ?? null;

  const refreshProfile = async () => {
    if (!user?.id) {
      setFullName('');
      return;
    }

    const profileName = await fetchProfileName(user.id);
    const fallbackName =
      (user.user_metadata?.full_name as string | undefined) ||
      (user.user_metadata?.name as string | undefined) ||
      '';

    setFullName(profileName || fallbackName || '');
  };

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      const { data } = await supabase.auth.getSession();

      if (!mounted) return;

      setSession(data.session);

      if (data.session?.user?.id) {
        const profileName = await fetchProfileName(data.session.user.id);
        if (!mounted) return;

        const fallbackName =
          (data.session.user.user_metadata?.full_name as string | undefined) ||
          (data.session.user.user_metadata?.name as string | undefined) ||
          '';

        setFullName(profileName || fallbackName || '');
      }

      if (mounted) {
        setAuthReady(true);
      }
    };

    bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, nextSession) => {
      setSession(nextSession);

      if (!nextSession?.user) {
        setFullName('');
      } else {
        const fallbackName =
          (nextSession.user.user_metadata?.full_name as string | undefined) ||
          (nextSession.user.user_metadata?.name as string | undefined) ||
          '';

        fetchProfileName(nextSession.user.id)
          .then((profileName) => {
            setFullName(profileName || fallbackName || '');
          })
          .catch(() => {
            setFullName(fallbackName || '');
          });
      }

      setAuthReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async ({ email, password }: LoginInput) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      throw new Error(error.message);
    }
  };

  const signUp = async ({ email, password, fullName }: RegisterInput) => {
    const trimmedEmail = email.trim();
    const trimmedName = fullName.trim();

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          full_name: trimmedName,
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error(error.message);
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      authReady,
      session,
      user,
      fullName,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }),
    [authReady, session, user, fullName]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuth muss innerhalb von AuthProvider verwendet werden.');
  }

  return value;
}