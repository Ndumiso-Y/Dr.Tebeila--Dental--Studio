#!/usr/bin/env python3
"""Fix AuthContext by removing slow getSession() call"""

auth_file = r"f:\Digital Agency\Refodile Health Centre\Dentist\Dr.Tebeila Dental Studio\apps\web\src\contexts\AuthContext.tsx"

with open(auth_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Keep lines 1-104, skip 105-187, then add new code, then continue from 188
new_lines = lines[:104]  # Lines 1-104 (index 0-103)

# Add new fast boot code
new_code = """        // ✅ Fast boot: Skip slow getSession() - login ready immediately
        console.info('[AUTH_BOOT] Fast boot - skipping session check');
        console.info(`[AUTH_COMPLETE] Login ready (${Date.now() - initStart}ms)`);
        setState((prev) => ({ ...prev, loading: false }));
        return;

        // NOTE: Removed slow getSession() call that was hanging for 8+ seconds
        // The auth state listener will restore session if user has valid token
"""

new_lines.append(new_code)
new_lines.extend(lines[187:])  # Continue from line 188 (index 187)

# Write back
with open(auth_file, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("✅ AuthContext.tsx updated - slow getSession() removed")
print(f"   Removed lines 105-187 ({187-104} lines)")
print(f"   Added fast boot code (8 lines)")
print(f"   Total lines: {len(lines)} → {len(new_lines)}")
