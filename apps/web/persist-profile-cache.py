#!/usr/bin/env python3
"""Add localStorage persistence for profile cache"""

auth_file = r"f:\Digital Agency\Refodile Health Centre\Dentist\Dr.Tebeila Dental Studio\apps\web\src\contexts\AuthContext.tsx"

with open(auth_file, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update initAuth to check localStorage first
old_cache_check = """        // ✅ Path B: Session cache short-circuit
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
        }"""

new_cache_check = """        // ✅ Path B: Check localStorage cache first (survives refresh)
        try {
          const cachedProfileStr = localStorage.getItem('user_profile_cache');
          if (cachedProfileStr) {
            const cachedProfile = JSON.parse(cachedProfileStr);
            console.info(`[CACHE_HIT] Restored from localStorage in ${Date.now() - initStart}ms`);
            sessionCacheRef.current = { user: null as any, profile: cachedProfile };
            setState({
              user: null, // Will be set by listener
              session: null,
              profile: cachedProfile,
              tenantId: cachedProfile.tenant_id,
              role: cachedProfile.role,
              fullName: cachedProfile.full_name,
              loading: false,
              error: null,
            });
            return;
          }
        } catch (err) {
          console.warn('[CACHE] Failed to restore from localStorage:', err);
        }"""

content = content.replace(old_cache_check, new_cache_check)

# 2. Save profile to localStorage after successful login
old_signin_complete = """        // Update cache for next time
        if (profile) {
          sessionCacheRef.current = { user: session.user, profile };
        }
      }"""

new_signin_complete = """        // Update cache for next time (both memory and localStorage)
        if (profile) {
          sessionCacheRef.current = { user: session.user, profile };
          try {
            localStorage.setItem('user_profile_cache', JSON.stringify(profile));
          } catch (err) {
            console.warn('[CACHE] Failed to save to localStorage:', err);
          }
        }
      }"""

content = content.replace(old_signin_complete, new_signin_complete)

# 3. Update signIn to save to localStorage
old_signin_cache = """      // Step 4: Update state and cache
      sessionCacheRef.current = { user, profile };"""

new_signin_cache = """      // Step 4: Update state and cache (memory + localStorage)
      sessionCacheRef.current = { user, profile };
      try {
        localStorage.setItem('user_profile_cache', JSON.stringify(profile));
        console.info('[CACHE] Profile saved to localStorage');
      } catch (err) {
        console.warn('[CACHE] Failed to save to localStorage:', err);
      }"""

content = content.replace(old_signin_cache, new_signin_cache)

# 4. Clear cache on signOut
old_signout = """      await supabase.auth.signOut({ scope: 'local' });
      console.info('[SIGNOUT_COMPLETE]');"""

new_signout = """      await supabase.auth.signOut({ scope: 'local' });
      localStorage.removeItem('user_profile_cache');
      console.info('[SIGNOUT_COMPLETE] Cache cleared');"""

content = content.replace(old_signout, new_signout)

with open(auth_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("OK Added localStorage persistence for profile cache")
print("  - Profile saved to localStorage on login")
print("  - Profile restored from localStorage on refresh")
print("  - Cache cleared on logout")
