-- JWT Custom Claims Configuration - Tenant ID Injection
-- =========================================================
-- This script configures Supabase Auth to inject tenant_id into JWT tokens
-- Run this AFTER schema.sql, policies.sql, and seed.sql

-- ============================================================================
-- CUSTOM JWT CLAIMS HOOK
-- ============================================================================

-- This function is called by Supabase Auth when generating access tokens
-- It adds tenant_id from user_profiles to the JWT claims
CREATE OR REPLACE FUNCTION auth.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    claims jsonb;
    user_tenant_id uuid;
    user_role text;
BEGIN
    -- Extract existing claims
    claims := event->'claims';

    -- Fetch tenant_id and role from user_profiles
    SELECT tenant_id, role::text
    INTO user_tenant_id, user_role
    FROM public.user_profiles
    WHERE id = (event->>'user_id')::uuid;

    -- Add tenant_id to claims (if user has profile)
    IF user_tenant_id IS NOT NULL THEN
        claims := jsonb_set(claims, '{tenant_id}', to_jsonb(user_tenant_id));
    END IF;

    -- Add user_role to claims (for easy access in frontend)
    IF user_role IS NOT NULL THEN
        claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
    END IF;

    -- Update the event object with new claims
    event := jsonb_set(event, '{claims}', claims);

    RETURN event;
END;
$$;

-- Grant execute permission to Supabase Auth
GRANT EXECUTE ON FUNCTION auth.custom_access_token_hook TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION auth.custom_access_token_hook TO postgres;

COMMENT ON FUNCTION auth.custom_access_token_hook IS 'Injects tenant_id and user_role into JWT access tokens from user_profiles table';

-- ============================================================================
-- VERIFY JWT CLAIMS FUNCTION (for debugging)
-- ============================================================================

-- This function helps you verify what's in the JWT claims
CREATE OR REPLACE FUNCTION public.debug_jwt_claims()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    jwt_claims jsonb;
BEGIN
    -- Get current JWT claims
    jwt_claims := current_setting('request.jwt.claims', true)::jsonb;

    RETURN jsonb_build_object(
        'user_id', auth.uid(),
        'tenant_id', jwt_claims->>'tenant_id',
        'user_role', jwt_claims->>'user_role',
        'email', jwt_claims->>'email',
        'role', jwt_claims->>'role',
        'aud', jwt_claims->>'aud',
        'exp', jwt_claims->>'exp',
        'full_claims', jwt_claims
    );
END;
$$;

COMMENT ON FUNCTION public.debug_jwt_claims IS 'Returns current JWT claims for debugging (use in SQL Editor while authenticated)';

-- ============================================================================
-- CONFIGURATION INSTRUCTIONS
-- ============================================================================

/*

After running this script, configure the hook in Supabase Dashboard:

1. Go to: https://app.supabase.com/project/_/auth/hooks
   Or: Authentication > Auth Hooks

2. Enable "Custom Access Token Hook":
   ✅ Enable hook

3. Configure Hook:
   - Hook Name: custom_access_token_hook
   - Function: auth.custom_access_token_hook
   - Events: token.granted, token.refreshed

4. Save changes

5. Test the hook:
   - Login as a user
   - Check JWT token includes tenant_id
   - Use debug_jwt_claims() function

*/

-- ============================================================================
-- TEST QUERIES (Run after configuration)
-- ============================================================================

/*

-- Test 1: Check hook function exists
SELECT routine_name, routine_schema
FROM information_schema.routines
WHERE routine_name = 'custom_access_token_hook'
AND routine_schema = 'auth';

-- Expected: 1 row (auth.custom_access_token_hook)


-- Test 2: Verify user_profiles data
SELECT id, tenant_id, full_name, role, email
FROM user_profiles;

-- Expected: At least 1 user profile with tenant_id


-- Test 3: Debug JWT claims (must be logged in)
SELECT debug_jwt_claims();

-- Expected output:
{
  "user_id": "uuid",
  "tenant_id": "uuid",
  "user_role": "owner",
  "email": "user@example.com",
  "role": "authenticated",
  ...
}


-- Test 4: Verify RLS helper functions work
SELECT get_user_tenant_id();  -- Should return your tenant_id
SELECT get_user_role();        -- Should return 'owner', 'admin', or 'staff'
SELECT is_owner();             -- Should return true/false
SELECT is_admin_or_owner();    -- Should return true/false

*/

-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================

/*

Problem: JWT doesn't contain tenant_id
Solution:
1. Ensure user_profile exists for the user
2. Check tenant_id is not NULL in user_profiles
3. Verify hook is enabled in Supabase Dashboard
4. Try logging out and logging back in (to get new token)
5. Check hook function has correct permissions (GRANT EXECUTE)


Problem: RLS denies access to all tables
Solution:
1. Verify JWT contains tenant_id: SELECT debug_jwt_claims();
2. Check user_profiles.tenant_id matches tenant.id
3. Verify RLS policies are enabled: SELECT * FROM pg_policies WHERE schemaname = 'public';
4. Test helper functions: SELECT get_user_tenant_id();


Problem: Cannot create user_profile after signup
Solution:
1. Create user in Supabase Auth first
2. Then insert user_profile with correct tenant_id
3. Ensure tenant_id references existing tenant
4. For first user, manually set role = 'owner'


Problem: Hook not triggering
Solution:
1. Check Supabase Dashboard > Auth Hooks > Status
2. Verify function signature matches expected format
3. Check function has SECURITY DEFINER
4. Grant execute to supabase_auth_admin
5. Test with: SELECT auth.custom_access_token_hook('{"user_id": "uuid", "claims": {}}'::jsonb);

*/

-- ============================================================================
-- EXAMPLE: Manual JWT Testing (for development)
-- ============================================================================

/*

If you want to test without the hook, you can temporarily bypass RLS:

-- Option 1: Use service_role key (bypasses RLS)
-- Set Authorization header: Bearer <service_role_key>

-- Option 2: Temporarily disable RLS (DANGER - dev only!)
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
-- ... (disable for all tables)

-- Re-enable when done:
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
-- ... (re-enable for all tables)

-- Option 3: Set JWT claims manually (for testing in SQL Editor)
-- Note: This only works in direct SQL queries, not via API
SET request.jwt.claims = '{"tenant_id": "your-tenant-uuid", "user_role": "owner"}';

*/

-- ============================================================================
-- VERIFICATION OUTPUT
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'JWT CUSTOM CLAIMS HOOK CONFIGURED';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Function created: auth.custom_access_token_hook';
    RAISE NOTICE 'Debug function: public.debug_jwt_claims()';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Go to Supabase Dashboard > Auth Hooks';
    RAISE NOTICE '2. Enable "Custom Access Token Hook"';
    RAISE NOTICE '3. Select: auth.custom_access_token_hook';
    RAISE NOTICE '4. Save changes';
    RAISE NOTICE '5. Test: SELECT debug_jwt_claims();';
    RAISE NOTICE '';
    RAISE NOTICE 'JWT will now include:';
    RAISE NOTICE '  - tenant_id: UUID of user''s tenant';
    RAISE NOTICE '  - user_role: owner | admin | staff';
    RAISE NOTICE '';
    RAISE NOTICE 'See db/README.md for detailed instructions.';
    RAISE NOTICE '============================================================';
END $$;
