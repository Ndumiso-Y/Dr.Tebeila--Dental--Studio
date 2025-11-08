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
  const manualSignInRef = useRef(false); // Flag to prevent auth listener race
  // ✅ Timeout wrapper for any async operation
  const withTimeout = <T,>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> => {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMsg)), ms)
    );
    return Promise.race([promise, timeout]);
  };


  // ✅ Step 1: Clear stale cache on boot (runs once)
  // DISABLED: getSession() is too slow on Supabase free tier
  // useEffect(() => {
  //   supabase.auth.getSession().then(({ data }) => {
  //     if (!data?.session) {
  //       console.info('[AUTH_BOOT] Clearing old cache');
  //       localStorage.removeItem('supabase.auth.token');
  //       sessionStorage.clear();
  //     }
  //   });
  // }, []);

  // ✅ Helper to fetch profile safely
  const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      console.info('[PROFILE_FETCH] Fetching for user:', userId);
      const start = Date.now();

      const queryPromise = supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const { data, error } = await withTimeout(
        queryPromise as Promise<any>,
        5000,
        'Profile fetch timeout after 5s'
      );

      const duration = Date.now() - start;

      if (error || !data) {
        console.error(`[PROFILE_FETCH_ERROR] Failed in ${duration}ms:`, error);
        return null;
      }

      console.info(`[PROFILE_FETCH_OK] Got profile in ${duration}ms`);
      return data;
    } catch (err) {
      console.error('[PROFILE_FETCH_EXCEPTION]', err);
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

        // ✅ Path C: FAST BOOT - Skip slow getSession(), allow immediate login
        console.info('[AUTH_BOOT] Fast boot - skipping slow session check');
        console.info(`[AUTH_COMPLETE] Login ready in ${Date.now() - initStart}ms`);
        setState((prev) => ({ ...prev, loading: false }));
        return;

        // NOTE: Removed slow getSession() call that was timing out after 8+ seconds
        // The auth state listener will automatically restore session if user has valid token
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

      // ✅ Skip listener if manual sign-in is handling auth
      if (manualSignInRef.current) {
        console.info('[AUTH_LISTENER] Skipping - manual sign-in in progress');
        return;
      }

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
        console.info('[AUTH_LISTENER] Processing auth state change:', event);
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

  // ✅ Explicit Sign-In (simplified, no race conditions)
  const signIn = async (email: string, password: string) => {
    // ✅ Throttle duplicate sign-in calls
    if (signingInRef.current) {
      console.warn('[AUTH_GUARD] Sign-in blocked – already in progress');
      return;
    }

    signingInRef.current = true;
    manualSignInRef.current = true; // Prevent auth listener race
    const signinStart = Date.now();
    console.info('[SIGNIN_START]', email);
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Step 1: Authenticate with Supabase
      const authStart = Date.now();
      console.info('[SIGNIN_AUTH] Calling Supabase signInWithPassword...');

      // Race against 10s timeout
      const authPromise = supabase.auth.signInWithPassword({
        email,
        password,
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Login timeout after 10s')), 10000)
      );
      const { data, error } = await Promise.race([authPromise, timeoutPromise]);

      if (error) {
        console.error('[SIGNIN_AUTH_ERROR]', error.message);
        throw error;
      }

      const user = data.user;
      if (!user) {
        console.error('[SIGNIN_AUTH_ERROR] No user returned from Supabase');
        throw new Error('Login failed - no user returned.');
      }

      const authDuration = Date.now() - authStart;
      console.info(`[SIGNIN_SUCCESS] User authenticated in ${authDuration}ms:`, user.id);

      // Step 2: Fetch user profile
      const profileStart = Date.now();
      console.info('[SIGNIN_PROFILE_FETCH] Fetching user profile from database...');

      const profile = await fetchProfile(user.id);
      const profileDuration = Date.now() - profileStart;

      if (!profile) {
        console.error('[SIGNIN_PROFILE_ERROR] Profile not found in user_profiles table');
        throw new Error('User profile not found. Please contact administrator.');
      }

      console.info(`[SIGNIN_PROFILE_LOADED] Got profile in ${profileDuration}ms:`, {
        name: profile.full_name,
        tenant: profile.tenant_id,
        role: profile.role,
        active: profile.is_active
      });

      // Step 3: Validate profile
      if (!profile.is_active) {
        console.error('[SIGNIN_PROFILE_ERROR] Profile is inactive');
        throw new Error('Account inactive. Contact administrator.');
      }
      if (!profile.tenant_id) {
        console.error('[SIGNIN_PROFILE_ERROR] No tenant_id in profile');
        throw new Error('No tenant linked to this user.');
      }

      console.info('[SIGNIN_PROFILE_OK] Profile validated successfully');

      // Step 4: Update state and cache
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
      console.info(`[SIGNIN_COMPLETE] Total login time: ${totalDuration}ms - Redirecting to /invoices/new`);

      signingInRef.current = false;
      manualSignInRef.current = false; // Re-enable auth listener
      navigate('/invoices/new');

    } catch (err: any) {
      const errorMsg = err.message || String(err);
      console.error('[SIGNIN_ERROR]', errorMsg);

      signingInRef.current = false;
      manualSignInRef.current = false; // Re-enable auth listener
      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMsg,
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
