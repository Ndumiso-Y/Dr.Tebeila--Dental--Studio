-- ============================================================================
-- DEBUG & FIX USER PROFILE SETUP
-- Run this to see what's in your database and create missing user_profile
-- ============================================================================

-- Step 1: Check if tenant exists
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'STEP 1: Checking Tenants...';
    RAISE NOTICE '========================================';
END $$;

SELECT
    id,
    name,
    slug,
    business_name,
    is_active
FROM tenants
ORDER BY created_at DESC;

-- Step 2: Check auth users
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'STEP 2: Checking Auth Users...';
    RAISE NOTICE '========================================';
END $$;

SELECT
    id,
    email,
    created_at,
    email_confirmed_at,
    last_sign_in_at
FROM auth.users
ORDER BY created_at DESC;

-- Step 3: Check user_profiles
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'STEP 3: Checking User Profiles...';
    RAISE NOTICE '========================================';
END $$;

SELECT
    id,
    tenant_id,
    full_name,
    role,
    email,
    is_active
FROM user_profiles
ORDER BY created_at DESC;

-- Step 4: Find orphaned auth users (users without profiles)
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'STEP 4: Finding Users Without Profiles...';
    RAISE NOTICE '========================================';
END $$;

SELECT
    au.id as auth_user_id,
    au.email,
    au.created_at,
    CASE
        WHEN up.id IS NULL THEN '❌ NO PROFILE - NEEDS TO BE CREATED'
        ELSE '✅ Profile exists'
    END as status
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
ORDER BY au.created_at DESC;

-- ============================================================================
-- AUTO-FIX: Create missing user_profile for the first auth user
-- ============================================================================

DO $$
DECLARE
    v_auth_user_id UUID;
    v_auth_email TEXT;
    v_tenant_id UUID;
    v_profile_exists BOOLEAN;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'AUTO-FIX: Creating Missing User Profile';
    RAISE NOTICE '========================================';

    -- Get the first tenant
    SELECT id INTO v_tenant_id FROM tenants WHERE is_active = true LIMIT 1;

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION '❌ No active tenant found! Please run seed.sql first.';
    END IF;

    RAISE NOTICE '✅ Found tenant: %', v_tenant_id;

    -- Get the first auth user
    SELECT id, email INTO v_auth_user_id, v_auth_email
    FROM auth.users
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_auth_user_id IS NULL THEN
        RAISE EXCEPTION '❌ No auth user found! Please create a user in Supabase Auth first.';
    END IF;

    RAISE NOTICE '✅ Found auth user: % (%)', v_auth_email, v_auth_user_id;

    -- Check if profile already exists
    SELECT EXISTS(SELECT 1 FROM user_profiles WHERE id = v_auth_user_id) INTO v_profile_exists;

    IF v_profile_exists THEN
        RAISE NOTICE '✅ User profile already exists for this user.';
        RAISE NOTICE '   Email: %', v_auth_email;
    ELSE
        -- Create the missing profile
        INSERT INTO user_profiles (
            id,
            tenant_id,
            full_name,
            role,
            email,
            phone,
            is_active
        ) VALUES (
            v_auth_user_id,
            v_tenant_id,
            COALESCE(SPLIT_PART(v_auth_email, '@', 1), 'User'),  -- Use email username as name
            'owner',  -- First user is always owner
            v_auth_email,
            NULL,
            true
        );

        RAISE NOTICE '✅ SUCCESS! User profile created!';
        RAISE NOTICE '   User ID: %', v_auth_user_id;
        RAISE NOTICE '   Email: %', v_auth_email;
        RAISE NOTICE '   Tenant ID: %', v_tenant_id;
        RAISE NOTICE '   Role: owner';
        RAISE NOTICE '';
        RAISE NOTICE '🎉 You can now login with: %', v_auth_email;
    END IF;

    RAISE NOTICE '========================================';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ ERROR: %', SQLERRM;
        RAISE;
END $$;

-- ============================================================================
-- VERIFICATION: Show final state
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FINAL VERIFICATION';
    RAISE NOTICE '========================================';
END $$;

SELECT
    up.id as user_id,
    up.email,
    up.full_name,
    up.role,
    t.name as tenant_name,
    up.is_active,
    CASE
        WHEN up.is_active AND t.is_active THEN '✅ READY TO LOGIN'
        ELSE '❌ Account inactive'
    END as login_status
FROM user_profiles up
JOIN tenants t ON up.tenant_id = t.id
ORDER BY up.created_at DESC;

-- ============================================================================
-- INSTRUCTIONS
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'NEXT STEPS';
    RAISE NOTICE '========================================';
    RAISE NOTICE '1. Check the output above';
    RAISE NOTICE '2. If user profile was created, try logging in';
    RAISE NOTICE '3. If you see errors, read them carefully';
    RAISE NOTICE '4. Make sure you have run seed.sql first';
    RAISE NOTICE '5. Make sure you have created a user in Supabase Auth';
    RAISE NOTICE '========================================';
END $$;
