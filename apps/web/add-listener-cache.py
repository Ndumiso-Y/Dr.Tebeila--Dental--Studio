#!/usr/bin/env python3
"""Add session cache check to auth listener to prevent slow fetches"""

import re

auth_file = r"f:\Digital Agency\Refodile Health Centre\Dentist\Dr.Tebeila Dental Studio\apps\web\src\contexts\AuthContext.tsx"

with open(auth_file, 'r', encoding='utf-8') as f:
    content = f.read()

old_listener_code = """      if (session?.user) {
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
      }"""

new_listener_code = """      if (session?.user) {
        console.info('[AUTH_LISTENER] Processing auth state change:', event);

        // ✅ Try cached profile first (instant load on refresh)
        const cachedProfile = sessionCacheRef.current?.profile;
        if (cachedProfile && cachedProfile.id === session.user.id) {
          console.info('[AUTH_LISTENER] Using cached profile - skip fetch');
          setState({
            user: session.user,
            session,
            profile: cachedProfile,
            tenantId: cachedProfile.tenant_id,
            role: cachedProfile.role,
            fullName: cachedProfile.full_name,
            loading: false,
            error: null,
          });
          return;
        }

        // No cache - fetch from database
        console.info('[AUTH_LISTENER] No cache - fetching profile');
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

        // Update cache for next time
        if (profile) {
          sessionCacheRef.current = { user: session.user, profile };
        }
      }"""

content = content.replace(old_listener_code, new_listener_code)

with open(auth_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("OK Added cache check to auth listener")
print("  - Listener now checks cache before fetching profile")
print("  - Should prevent timeout errors on page refresh")
