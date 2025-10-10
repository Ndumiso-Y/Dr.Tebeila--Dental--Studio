import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, UserProfile, UserRole } from '../lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  tenantId: string | null;
  role: UserRole | null;
  fullName: string | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    tenantId: null,
    role: null,
    fullName: null,
    loading: true,
    error: null,
  });

  // Safety: never spin forever (8s)
  useEffect(() => {
    const t = setTimeout(() => setState((prev) => ({ ...prev, loading: false })), 8000);
    return () => clearTimeout(t);
  }, []);

  // Fetch user profile after auth
  const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        if (mounted) {
          setState((prev) => ({ ...prev, error: error.message, loading: false }));
        }
        return;
      }
      if (mounted) {
        if (data.session?.user) {
          const profile = await fetchProfile(data.session.user.id);
          if (mounted) {
            if (!profile) {
              setState((prev) => ({
                ...prev,
                user: data.session.user,
                session: data.session,
                error: 'User profile not found.',
                loading: false,
              }));
            } else if (!profile.is_active) {
              setState((prev) => ({
                ...prev,
                user: data.session.user,
                session: data.session,
                profile,
                error: 'Your profile is inactive. Contact support.',
                loading: false,
              }));
            } else if (!profile.tenant_id) {
              setState((prev) => ({
                ...prev,
                user: data.session.user,
                session: data.session,
                profile,
                error: 'No tenant is linked to this user.',
                loading: false,
              }));
            } else {
              setState({
                user: data.session.user,
                session: data.session,
                profile,
                tenantId: profile.tenant_id,
                role: profile.role,
                fullName: profile.full_name,
                loading: false,
                error: null,
              });
            }
          }
        } else {
          setState((prev) => ({ ...prev, loading: false }));
        }
      }
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        if (!profile) {
          setState({
            user: session.user,
            session,
            profile: null,
            tenantId: null,
            role: null,
            fullName: null,
            loading: false,
            error: 'User profile not found.',
          });
        } else if (!profile.is_active) {
          setState({
            user: session.user,
            session,
            profile,
            tenantId: null,
            role: profile.role,
            fullName: profile.full_name,
            loading: false,
            error: 'Your profile is inactive. Contact support.',
          });
        } else if (!profile.tenant_id) {
          setState({
            user: session.user,
            session,
            profile,
            tenantId: null,
            role: profile.role,
            fullName: profile.full_name,
            loading: false,
            error: 'No tenant is linked to this user.',
          });
        } else {
          setState({
            user: session.user,
            session,
            profile,
            tenantId: profile.tenant_id,
            role: profile.role,
            fullName: profile.full_name,
            loading: false,
            error: null,
          });
        }
      } else {
        setState({
          user: null,
          session: null,
          profile: null,
          tenantId: null,
          role: null,
          fullName: null,
          loading: false,
          error: null,
        });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        const profile = await fetchProfile(data.user.id);

        if (!profile) {
          throw new Error('User profile not found. Please contact administrator.');
        }

        if (!profile.is_active) {
          await supabase.auth.signOut();
          throw new Error('Your account is inactive. Please contact administrator.');
        }

        if (!profile.tenant_id) {
          throw new Error('No tenant is linked to this user. Please contact administrator.');
        }

        setState({
          user: data.user,
          session: data.session,
          profile,
          tenantId: profile.tenant_id,
          role: profile.role,
          fullName: profile.full_name,
          loading: false,
          error: null,
        });
      }
    } catch (error: any) {
      setState((prev) => ({ ...prev, loading: false, error: error.message }));
      throw error;
    }
  };

  const signOut = async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setState({
        user: null,
        session: null,
        profile: null,
        tenantId: null,
        role: null,
        fullName: null,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      setState((prev) => ({ ...prev, loading: false, error: error.message }));
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Auth guard component
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login handled by router
    return null;
  }

  return <>{children}</>;
}
