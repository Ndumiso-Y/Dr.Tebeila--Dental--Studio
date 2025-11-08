-- ============================================================================
-- QUICK FIX: Create Missing User Profile
-- This links your Supabase Auth user to your tenant
-- ============================================================================

DO $$
DECLARE
    v_auth_user_id UUID;
    v_auth_email TEXT;
    v_tenant_id UUID;
    v_profile_exists BOOLEAN;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CREATING USER PROFILE';
    RAISE NOTICE '========================================';

    -- Get the tenant ID
    SELECT id INTO v_tenant_id
    FROM public.tenants
    WHERE slug = 'dr-tebeila-dental-studio'
    LIMIT 1;

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION '❌ Tenant not found! Make sure seed data was loaded.';
    END IF;

    RAISE NOTICE '✅ Found tenant ID: %', v_tenant_id;

    -- Get the first auth user (your user)
    SELECT id, email INTO v_auth_user_id, v_auth_email
    FROM auth.users
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_auth_user_id IS NULL THEN
        RAISE EXCEPTION '❌ No auth user found! Please create a user in Supabase Auth first.';
    END IF;

    RAISE NOTICE '✅ Found auth user: % (ID: %)', v_auth_email, v_auth_user_id;

    -- Check if profile already exists
    SELECT EXISTS(
        SELECT 1 FROM public.user_profiles WHERE id = v_auth_user_id
    ) INTO v_profile_exists;

    IF v_profile_exists THEN
        RAISE NOTICE '✅ User profile already exists!';
        RAISE NOTICE '';
        RAISE NOTICE '🎉 You should be able to login with: %', v_auth_email;
    ELSE
        -- Create the missing profile
        INSERT INTO public.user_profiles (
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
            'Dr. Tebeila',  -- You can change this name
            'owner',
            v_auth_email,
            NULL,
            true
        );

        RAISE NOTICE '✅ SUCCESS! User profile created!';
        RAISE NOTICE '';
        RAISE NOTICE '   User ID: %', v_auth_user_id;
        RAISE NOTICE '   Email: %', v_auth_email;
        RAISE NOTICE '   Tenant: Dr.Tebeila Dental Studio';
        RAISE NOTICE '   Role: owner';
        RAISE NOTICE '';
        RAISE NOTICE '🎉 You can now login with: %', v_auth_email;
    END IF;

    RAISE NOTICE '========================================';

END $$;

-- Verify everything is set up correctly
SELECT
    up.id as user_id,
    up.email,
    up.full_name,
    up.role,
    t.name as tenant_name,
    up.is_active,
    '✅ READY TO LOGIN' as status
FROM public.user_profiles up
JOIN public.tenants t ON up.tenant_id = t.id
ORDER BY up.created_at DESC;
