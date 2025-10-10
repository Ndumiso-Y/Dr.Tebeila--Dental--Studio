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
  refreshProfile: () => Promise<void>;
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

  // Safety: fast-resolve if no session (3s max for initial check)
  useEffect(() => {
    const t = setTimeout(() => {
      setState((prev) => {
        // Only force-resolve if still loading
        if (prev.loading) {
          console.warn('⚠️ Auth initialization timeout - forcing resolution');
          return { ...prev, loading: false, error: 'Authentication check timed out' };
        }
        return prev;
      });
    }, 3000);
    return () => clearTimeout(t);
  }, []);

  // Fetch user profile after auth with timeout
  const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      // Race against 5s timeout
      const result = await Promise.race([
        supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single(),
        new Promise<{ data: null; error: any }>((_, reject) =>
          setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
        ),
      ]);

      if (result.error) {
        console.error('Error fetching profile:', result.error);
        return null;
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  // Expose refreshProfile for manual refresh
  const refreshProfile = async () => {
    if (!state.session?.user) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    const profile = await fetchProfile(state.session.user.id);

    if (!profile) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'Failed to refresh profile',
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      profile,
      tenantId: profile.tenant_id || null,
      role: profile.role || null,
      fullName: profile.full_name || null,
      loading: false,
      error: profile.is_active ? null : 'Your profile is inactive. Contact support.',
    }));
  };

  // Initialize auth state - fast-resolve pattern
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        // Quick session check with timeout
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: null }; error: any }>(
          (_, reject) => setTimeout(() => reject(new Error('Session check timeout')), 2000)
        );

        const { data, error } = await Promise.race([sessionPromise, timeoutPromise]);

        if (!mounted) return;

        if (error) {
          console.error('Session check error:', error);
          setState((prev) => ({ ...prev, error: error.message, loading: false }));
          return;
        }

        // No session - fast resolve
        if (!data.session?.user) {
          setState((prev) => ({ ...prev, loading: false }));
          return;
        }

        // Has session - set user immediately, fetch profile async
        setState((prev) => ({
          ...prev,
          user: data.session.user,
          session: data.session,
          loading: false, // Resolve loading immediately
        }));

        // Fetch profile in background (non-blocking)
        const profile = await fetchProfile(data.session.user.id);

        if (!mounted) return;

        if (!profile) {
          setState((prev) => ({
            ...prev,
            error: 'User profile not found. Contact administrator.',
          }));
        } else if (!profile.is_active) {
          setState((prev) => ({
            ...prev,
            profile,
            error: 'Your profile is inactive. Contact support.',
          }));
        } else if (!profile.tenant_id) {
          setState((prev) => ({
            ...prev,
            profile,
            error: 'No tenant is linked to this user.',
          }));
        } else {
          setState((prev) => ({
            ...prev,
            profile,
            tenantId: profile.tenant_id,
            role: profile.role,
            fullName: profile.full_name,
            error: null,
          }));
        }
      } catch (error: any) {
        if (mounted) {
          console.error('Auth initialization error:', error);
          setState((prev) => ({
            ...prev,
            loading: false,
            error: error.message || 'Failed to initialize authentication',
          }));
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
    <AuthContext.Provider value={{ ...state, signIn, signOut, refreshProfile }}>
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
