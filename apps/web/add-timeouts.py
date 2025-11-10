#!/usr/bin/env python3
"""Add timeout wrappers to all async Supabase calls"""

import re

auth_file = r"f:\Digital Agency\Refodile Health Centre\Dentist\Dr.Tebeila Dental Studio\apps\web\src\contexts\AuthContext.tsx"

with open(auth_file, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add timeout to signInWithPassword
old_signin = """      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });"""

new_signin = """      // Race against 10s timeout
      const authPromise = supabase.auth.signInWithPassword({
        email,
        password,
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Login timeout after 10s')), 10000)
      );
      const { data, error } = await Promise.race([authPromise, timeoutPromise]);"""

content = content.replace(old_signin, new_signin)

# 2. Add timeout helper function at the top of the component
helper_function = """
  // ✅ Timeout wrapper for any async operation
  const withTimeout = <T,>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> => {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMsg)), ms)
    );
    return Promise.race([promise, timeout]);
  };
"""

# Insert helper after the useRef declarations
insert_after = "  const manualSignInRef = useRef(false); // Flag to prevent auth listener race"
content = content.replace(insert_after, insert_after + helper_function)

# 3. Update fetchProfile to use timeout wrapper
old_fetchProfile = """  const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
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
  };"""

new_fetchProfile = """  const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      console.info('[PROFILE_FETCH] Fetching for user:', userId);
      const start = Date.now();

      const query = supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const { data, error } = await withTimeout(
        query,
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
  };"""

content = content.replace(old_fetchProfile, new_fetchProfile)

# Write back
with open(auth_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("OK AuthContext updated with timeouts")
print("  - Added timeout helper function")
print("  - Added 10s timeout to signInWithPassword")
print("  - Added 5s timeout to fetchProfile")
