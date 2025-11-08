import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, UserProfile, UserRole, warmupSupabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

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

  const navigate = useNavigate();
  const sessionCacheRef = useRef<{ user: User; profile: UserProfile } | null>(null);

  // ✅ Helper to fetch profile safely
  const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        console.error('Profile fetch failed:', error);
        return null;
      }
      return data;
    } catch (err) {
      console.error('Profile fetch exception:', err);
      return null;
    }
  };

  // ✅ Initialize session (runs once)
  useEffect(() => {
    let active = true;
    let timeoutId: NodeJS.Timeout;

    async function initAuth() {
      const initStart = Date.now();
      console.log('[AUTH_INIT] Starting authentication initialization');

      try {
        // ✅ Path A: Warm up Supabase (non-blocking)
        warmupSupabase().catch(() => {
          // Best effort - continue even if warmup fails
        });

        // ✅ Path B: Session cache short-circuit
        if (sessionCacheRef.current) {
          const { user, profile } = sessionCacheRef.current;
          console.log(`[SESSION_CACHE_HIT] Restored session in ${Date.now() - initStart}ms`);
          setState({
            user,
            session: null, // Will be refreshed by listener
            profile,
            tenantId: profile.tenant_id,
            role: profile.role,
            fullName: profile.full_name,
            loading: false,
            error: null,
          });
          return;
        }

        // ✅ Path C: Adaptive timeout (8s for initial cold start)
        timeoutId = setTimeout(() => {
          if (active) {
            console.warn('[AUTH_TIMEOUT] Auth initialization exceeded 8s, forcing loading: false');
            setState((prev) => ({
              ...prev,
              loading: false,
              error: 'Authentication timeout. Please refresh and try again.',
            }));
          }
        }, 8000);

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const session = data?.session ?? null;
        const user = session?.user ?? null;

        const sessionDuration = Date.now() - initStart;
        console.log('[SESSION_CHECK]', user ? `User found: ${user.email} (${sessionDuration}ms)` : 'No active session');

        if (!active) return;

        if (!user) {
          // No active session → stay on login
          clearTimeout(timeoutId);
          console.log(`[AUTH_COMPLETE] No session, ready for login (${Date.now() - initStart}ms)`);
          setState((prev) => ({ ...prev, loading: false }));
          return;
        }

        // Found session → load profile
        console.log('[PROFILE_FETCH] Loading profile for user:', user.id);
        const profileStart = Date.now();
        const profile = await fetchProfile(user.id);
        const profileDuration = Date.now() - profileStart;

        if (profile) {
          console.log(`[PROFILE_OK] Loaded in ${profileDuration}ms`, {
            tenant: profile.tenant_id,
            role: profile.role,
            active: profile.is_active
          });
          // ✅ Cache for next load
          sessionCacheRef.current = { user, profile };
        } else {
          console.error('[PROFILE_ERROR] Profile not found for user:', user.id);
        }

        clearTimeout(timeoutId);
        setState({
          user,
          session,
          profile,
          tenantId: profile?.tenant_id ?? null,
          role: profile?.role ?? null,
          fullName: profile?.full_name ?? null,
          loading: false,
          error: profile
            ? profile.is_active
              ? null
              : 'Your profile is inactive. Contact admin.'
            : 'User profile not found.',
        });
        console.log(`[AUTH_COMPLETE] Session resolved (total: ${Date.now() - initStart}ms)`);
      } catch (err: any) {
        console.error('[AUTH_ERROR]', err);
        clearTimeout(timeoutId);
        if (active)
          setState((prev) => ({
            ...prev,
            loading: false,
            error: err.message || 'Failed to initialize authentication',
          }));
      }
    }

    initAuth();

    // ✅ Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!active) return;

      if (event === 'SIGNED_OUT' || !session) {
        // clear everything and go to login
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
        navigate('/login');
        return;
      }

      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setState({
          user: session.user,
          session,
          profile,
          tenantId: profile?.tenant_id ?? null,
          role: profile?.role ?? null,
          fullName: profile?.full_name ?? null,
          loading: false,
          error: profile
            ? profile.is_active
              ? null
              : 'Your profile is inactive. Contact admin.'
            : 'User profile not found.',
        });
      }
    });

    return () => {
      active = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [navigate]);

  // ✅ Manual profile refresh
  const refreshProfile = async () => {
    if (!state.user) return;
    setState((prev) => ({ ...prev, loading: true }));
    const profile = await fetchProfile(state.user.id);
    setState((prev) => ({
      ...prev,
      profile,
      tenantId: profile?.tenant_id ?? null,
      role: profile?.role ?? null,
      fullName: profile?.full_name ?? null,
      loading: false,
    }));
  };

  // ✅ Explicit Sign-In (no auto redirect)
  const signIn = async (email: string, password: string) => {
    const signinStart = Date.now();
    console.log('[SIGNIN_START]', email);
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const authStart = Date.now();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      const user = data.user;
      if (!user) throw new Error('Login failed.');

      const authDuration = Date.now() - authStart;
      console.log(`[SIGNIN_SUCCESS] User authenticated in ${authDuration}ms:`, user.id);

      const profileStart = Date.now();
      const profile = await fetchProfile(user.id);
      const profileDuration = Date.now() - profileStart;

      if (!profile) throw new Error('User profile not found.');
      if (!profile.is_active)
        throw new Error('Account inactive. Contact administrator.');
      if (!profile.tenant_id)
        throw new Error('No tenant linked to this user.');

      console.log(`[SIGNIN_PROFILE_OK] Profile loaded in ${profileDuration}ms, redirecting to /invoices`);

      // ✅ Update session cache for faster subsequent loads
      sessionCacheRef.current = { user, profile };

      setState({
        user,
        session: data.session,
        profile,
        tenantId: profile.tenant_id,
        role: profile.role,
        fullName: profile.full_name,
        loading: false,
        error: null,
      });

      const totalDuration = Date.now() - signinStart;
      console.log(`[SIGNIN_COMPLETE] Total login time: ${totalDuration}ms`);

      navigate('/invoices'); // redirect after manual login
    } catch (err: any) {
      console.error('[SIGNIN_ERROR]', err);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err.message || 'Login failed',
      }));
      throw err;
    }
  };

  // ✅ Safe Sign-Out
  const signOut = async () => {
    console.log('[LOGOUT_START] Signing out user');
    try {
      await supabase.auth.signOut();
      // ✅ Clear session cache
      sessionCacheRef.current = null;
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
      console.log('[LOGOUT_COMPLETE] State and cache cleared, redirecting to login');
      navigate('/login');
    } catch (err: any) {
      console.error('[LOGOUT_ERROR]', err);
      setState((prev) => ({ ...prev, error: err.message }));
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

// ✅ Guarded routes
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
    return null; // router will redirect
  }

  return <>{children}</>;
}
