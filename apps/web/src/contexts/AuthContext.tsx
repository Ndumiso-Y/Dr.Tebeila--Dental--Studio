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
  const signingInRef = useRef(false); // Throttle duplicate sign-in calls

  // ✅ Step 1: Clear stale cache on boot (runs once)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data?.session) {
        console.info('[AUTH_BOOT] Clearing old cache');
        localStorage.removeItem('supabase.auth.token');
        sessionStorage.clear();
      }
    });
  }, []);

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
      console.info('[AUTH_INIT] Booting auth sequence');

      try {
        // ✅ Path A: Warm up Supabase (non-blocking)
        warmupSupabase().catch(() => {
          // Best effort - continue even if warmup fails
        });

        // ✅ Path B: Session cache short-circuit
        if (sessionCacheRef.current) {
          const { user, profile } = sessionCacheRef.current;
          console.info(`[SESSION_CACHE_HIT] Restored session in ${Date.now() - initStart}ms`);
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

        // ✅ Step 3: Back-off retry for session check
        let session = null;
        let user = null;

        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const { data, error } = await supabase.auth.getSession();
            if (error) throw error;

            session = data?.session ?? null;
            user = session?.user ?? null;

            if (session) break; // Success

            // Wait before retry (1s, 2s back-off)
            if (attempt < 2) {
              await new Promise(r => setTimeout(r, attempt * 1000));
            }
          } catch (err) {
            console.warn(`[SESSION_RETRY] Attempt ${attempt} failed`, err);
            if (attempt === 2) throw err;
          }
        }

        const sessionDuration = Date.now() - initStart;
        console.info('[AUTH_SESSION_OK]', user ? `User found: ${user.email} (${sessionDuration}ms)` : 'No active session');

        if (!active) return;

        if (!user) {
          // No active session → stay on login
          clearTimeout(timeoutId);
          console.log(`[AUTH_COMPLETE] No session, ready for login (${Date.now() - initStart}ms)`);
          setState((prev) => ({ ...prev, loading: false }));
          return;
        }

        // Found session → load profile
        console.info('[PROFILE_FETCH] Loading profile for user:', user.id);
        const profileStart = Date.now();
        const profile = await fetchProfile(user.id);
        const profileDuration = Date.now() - profileStart;

        if (profile) {
          console.info('[AUTH_PROFILE_OK]', profile.full_name, `(${profileDuration}ms)`, {
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
        console.info('[AUTH_COMPLETE]');
      } catch (err: any) {
        console.error('[AUTH_ERROR]', err.message || err);
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
    // ✅ Step 2: Throttle duplicate sign-in calls
    if (signingInRef.current) {
      console.warn('[AUTH_GUARD] Sign-in blocked – already in progress');
      return;
    }

    signingInRef.current = true;
    const signinStart = Date.now();
    console.info('[SIGNIN_START]', email);
    setState((prev) => ({ ...prev, loading: true, error: null }));

    // Create a timeout promise (8 seconds for sign-in)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Sign-in operation timeout')), 8000)
    );

    try {
      const authStart = Date.now();
      console.info('[SIGNIN_AUTH] Calling Supabase auth...');

      // Race auth call against timeout
      const result: any = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        timeoutPromise
      ]);

      const { data, error } = result;
      if (error) {
        console.error('[SIGNIN_AUTH_ERROR]', error.message);
        throw error;
      }

      const user = data.user;
      if (!user) throw new Error('Login failed - no user returned.');

      const authDuration = Date.now() - authStart;
      console.info(`[SIGNIN_SUCCESS] User authenticated in ${authDuration}ms:`, user.id);

      const profileStart = Date.now();
      console.info('[SIGNIN_PROFILE_FETCH] Fetching user profile...');
      const profile = await fetchProfile(user.id);
      const profileDuration = Date.now() - profileStart;

      if (!profile) {
        console.error('[SIGNIN_PROFILE_ERROR] Profile not found in database');
        throw new Error('User profile not found.');
      }
      if (!profile.is_active) {
        console.error('[SIGNIN_PROFILE_ERROR] Profile is inactive');
        throw new Error('Account inactive. Contact administrator.');
      }
      if (!profile.tenant_id) {
        console.error('[SIGNIN_PROFILE_ERROR] No tenant linked');
        throw new Error('No tenant linked to this user.');
      }

      console.info(`[SIGNIN_PROFILE_OK] Profile loaded in ${profileDuration}ms:`, profile.full_name);

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
      console.info(`[SIGNIN_COMPLETE] Total login time: ${totalDuration}ms`);

      signingInRef.current = false; // Reset throttle
      navigate('/invoices/new'); // redirect after manual login → new invoice
    } catch (err: any) {
      console.error('[SIGNIN_ERROR]', err.message || err);
      signingInRef.current = false; // Reset throttle on error
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
    console.info('[LOGOUT_START] Signing out user');
    try {
      // ✅ Step 4: Clear cache on logout with scope: local
      await supabase.auth.signOut({ scope: 'local' });
      localStorage.clear();
      sessionStorage.clear();

      // ✅ Clear session cache ref
      sessionCacheRef.current = null;
      signingInRef.current = false; // Reset throttle

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
      console.info('[LOGOUT_COMPLETE] State and cache cleared, redirecting to login');
      navigate('/login');
    } catch (err: any) {
      console.error('[LOGOUT_ERROR]', err.message || err);
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
