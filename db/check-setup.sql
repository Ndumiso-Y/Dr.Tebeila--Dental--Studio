-- ============================================================================
-- CHECK COMPLETE SETUP
-- Run this to see what's in your database
-- ============================================================================

-- 1. Check Tenants
SELECT '=== TENANTS ===' as check_type;
SELECT id, name, slug, business_name, is_active
FROM public.tenants
ORDER BY created_at DESC;

-- 2. Check Auth Users
SELECT '=== AUTH USERS (Supabase Auth) ===' as check_type;
SELECT
    id,
    email,
    email_confirmed_at,
    created_at,
    last_sign_in_at,
    CASE
        WHEN email_confirmed_at IS NULL THEN '⚠️ Email not confirmed'
        ELSE '✅ Email confirmed'
    END as status
FROM auth.users
ORDER BY created_at DESC;

-- 3. Check User Profiles
SELECT '=== USER PROFILES ===' as check_type;
SELECT
    up.id,
    up.email,
    up.full_name,
    up.role,
    up.is_active,
    t.name as tenant_name
FROM public.user_profiles up
LEFT JOIN public.tenants t ON up.tenant_id = t.id
ORDER BY up.created_at DESC;

-- 4. Check for orphaned auth users (no profile)
SELECT '=== ORPHANED AUTH USERS (Users without profiles) ===' as check_type;
SELECT
    au.id,
    au.email,
    '❌ NO PROFILE - Run fix-user-profile.sql' as issue
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE up.id IS NULL;

-- 5. Check Services
SELECT '=== SERVICES (Dental Procedures) ===' as check_type;
SELECT COUNT(*) as total_services FROM public.services;
SELECT code, name, unit_price FROM public.services ORDER BY code LIMIT 5;

-- 6. Check VAT Rates
SELECT '=== VAT RATES ===' as check_type;
SELECT name, rate, is_default FROM public.vat_rates ORDER BY rate;

-- 7. Summary
SELECT '=== SETUP SUMMARY ===' as check_type;
SELECT
    (SELECT COUNT(*) FROM public.tenants) as tenants,
    (SELECT COUNT(*) FROM auth.users) as auth_users,
    (SELECT COUNT(*) FROM public.user_profiles) as user_profiles,
    (SELECT COUNT(*) FROM public.services) as services,
    (SELECT COUNT(*) FROM public.customers) as customers,
    (SELECT COUNT(*) FROM public.vat_rates) as vat_rates;
