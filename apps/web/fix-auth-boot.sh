#!/bin/bash
# Replace slow session check with fast boot

cd "f:/Digital Agency/Refodile Health Centre/Dentist/Dr.Tebeila Dental Studio/apps/web/src/contexts"

# Use sed to delete lines 105-187 (the entire slow session check and profile load)
# and replace with simple fast boot logic

sed -i '105,187d' AuthContext.tsx

# Insert new fast boot code at line 105
sed -i '104a\
        // ✅ Fast boot: Skip slow getSession() - login ready immediately\
        console.info('"'"'[AUTH_BOOT] Fast boot - skipping session check'"'"');\
        console.info(`[AUTH_COMPLETE] Login ready (${Date.now() - initStart}ms)`);\
        setState((prev) => ({ ...prev, loading: false }));\
        return;\
\
        // NOTE: Removed slow getSession() call that was hanging for 8+ seconds\
        // The auth state listener will restore session if user has valid token' AuthContext.tsx

echo "AuthContext.tsx updated successfully"
