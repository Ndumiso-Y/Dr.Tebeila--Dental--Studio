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

        // ✅ Fast boot: Skip slow getSession() - login ready immediately
        console.info('[AUTH_BOOT] Fast boot - skipping session check');
        console.info(`[AUTH_COMPLETE] Login ready (${Date.now() - initStart}ms)`);
        setState((prev) => ({ ...prev, loading: false }));
        return;

        // NOTE: Removed slow getSession() call that was hanging for 8+ seconds
        // The auth state listener will restore session if user has valid token
