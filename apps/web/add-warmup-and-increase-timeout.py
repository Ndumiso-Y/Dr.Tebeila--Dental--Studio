#!/usr/bin/env python3
"""Add warmup call before signIn and increase timeouts"""

import re

auth_file = r"f:\Digital Agency\Refodile Health Centre\Dentist\Dr.Tebeila Dental Studio\apps\web\src\contexts\AuthContext.tsx"

with open(auth_file, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add warmup before authentication
old_step1 = """    try {
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
      const { data, error } = await Promise.race([authPromise, timeoutPromise]);"""

new_step1 = """    try {
      // Step 0: Wake up Supabase database first (critical for cold starts)
      console.info('[SIGNIN_WARMUP] Waking database...');
      await warmupSupabase().catch(() => {
        // Ignore warmup errors - continue anyway
      });

      // Step 1: Authenticate with Supabase
      const authStart = Date.now();
      console.info('[SIGNIN_AUTH] Calling Supabase signInWithPassword...');

      // Race against 15s timeout (increased for cold starts)
      const authPromise = supabase.auth.signInWithPassword({
        email,
        password,
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Login timeout after 15s')), 15000)
      );
      const { data, error } = await Promise.race([authPromise, timeoutPromise]);"""

content = content.replace(old_step1, new_step1)

# 2. Increase fetchProfile timeout from 5s to 15s
content = content.replace(
    "5000,\n        'Profile fetch timeout after 5s'",
    "15000,\n        'Profile fetch timeout after 15s'"
)

with open(auth_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("OK Updated AuthContext")
print("  - Added warmup call before signIn")
print("  - Increased login timeout: 10s -> 15s")
print("  - Increased profile fetch timeout: 5s -> 15s")
