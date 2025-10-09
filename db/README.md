# Database Setup Guide - T2: Supabase Configuration

## Prerequisites

1. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
2. **Supabase CLI** (optional but recommended):
   ```bash
   npm install -g supabase
   ```

---

## Step 1: Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click **"New Project"**
3. Fill in project details:
   - **Name**: `Dr.Tebeila Dental Studio`
   - **Database Password**: (generate strong password)
   - **Region**: Choose closest to South Africa (e.g., `eu-west-1` or `ap-southeast-1`)
4. Click **"Create new project"**
5. Wait 2-3 minutes for project initialization

---

## Step 2: Get API Credentials

1. In your project dashboard, go to **Settings > API**
2. Copy the following values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Project API Keys**:
     - `anon` / `public` key (safe for frontend)
     - `service_role` key (backend only - NEVER expose)

3. Create `.env.local` file in project root:
   ```bash
   cp .env.example .env.local
   ```

4. Update `.env.local` with your credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

---

## Step 3: Run Database Migrations

### Option A: Using Supabase Dashboard (Recommended for First Setup)

1. Go to **SQL Editor** in Supabase Dashboard
2. Run migrations in this order:

#### 3.1: Run `schema.sql`
```sql
-- Copy and paste entire contents of db/schema.sql
-- Click "Run" button
-- Wait for success confirmation
```

**Expected Output:**
- ✅ Extensions created
- ✅ Enum types created
- ✅ 10 tables created
- ✅ Indexes created
- ✅ Triggers created
- ✅ Functions created

#### 3.2: Run `policies.sql`
```sql
-- Copy and paste entire contents of db/policies.sql
-- Click "Run" button
-- Wait for success confirmation
```

**Expected Output:**
- ✅ RLS enabled on all tables
- ✅ Helper functions created
- ✅ Policies created for all tables

#### 3.3: Run `seed.sql`
```sql
-- Copy and paste entire contents of db/seed.sql
-- Click "Run" button
-- Watch for RAISE NOTICE output in console
```

**Expected Output:**
```
============================================================
SEED DATA LOADED SUCCESSFULLY
============================================================
Tenant: Dr.Tebeila Dental Studio
Tenant ID: <uuid>
VAT Rates: 2 (15%, 0%)
Units: 3 (Service, Hour, Unit)
Services: 16 dental procedures
Sample Customers: 2
Invoice Counter: Initialized for year 2025
============================================================
```

#### 3.4: Verify Data Loaded
```sql
-- Run verification queries
SELECT * FROM tenants;
SELECT * FROM vat_rates;
SELECT * FROM units;
SELECT * FROM services ORDER BY code;
SELECT * FROM customers;
SELECT * FROM invoice_counters;
```

**Expected Counts:**
- Tenants: 1 (Dr.Tebeila Dental Studio)
- VAT Rates: 2 (15%, 0%)
- Units: 3 (Service, Hour, Unit)
- Services: 16 dental procedures
- Customers: 2 (sample data)
- Invoice Counters: 1 (year 2025)

---

### Option B: Using Supabase CLI (Alternative)

```bash
# Initialize Supabase locally
supabase init

# Link to your project
supabase link --project-ref your-project-id

# Run migrations
supabase db push

# Or run individual files
psql $DATABASE_URL -f db/schema.sql
psql $DATABASE_URL -f db/policies.sql
psql $DATABASE_URL -f db/seed.sql
```

---

## Step 4: Configure Authentication

### 4.1: Enable Email/Password Authentication

1. Go to **Authentication > Providers** in Supabase Dashboard
2. Ensure **Email** provider is enabled
3. Configure email templates (optional):
   - **Confirm signup**: Customize welcome email
   - **Magic Link**: Customize login email
   - **Reset Password**: Customize password reset email

### 4.2: Configure JWT Settings

1. Go to **Settings > API > JWT Settings**
2. Note the **JWT Secret** (used for signing tokens)
3. The JWT payload will automatically include:
   ```json
   {
     "aud": "authenticated",
     "exp": 1234567890,
     "sub": "user-uuid",
     "email": "user@example.com",
     "role": "authenticated"
   }
   ```

### 4.3: Add Custom JWT Claims (Tenant ID)

We need to add `tenant_id` to the JWT claims for RLS policies.

**Create Database Function for JWT Claims:**

```sql
-- Run this in SQL Editor
CREATE OR REPLACE FUNCTION auth.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  user_tenant_id uuid;
BEGIN
  -- Fetch tenant_id from user_profiles
  SELECT tenant_id INTO user_tenant_id
  FROM public.user_profiles
  WHERE id = (event->>'user_id')::uuid;

  -- Add tenant_id to claims
  claims := event->'claims';

  IF user_tenant_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{tenant_id}', to_jsonb(user_tenant_id));
  END IF;

  -- Update the event object
  event := jsonb_set(event, '{claims}', claims);

  RETURN event;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION auth.custom_access_token_hook TO supabase_auth_admin;
```

**Configure Hook in Supabase Dashboard:**

1. Go to **Database > Functions**
2. Find `custom_access_token_hook`
3. Go to **Authentication > Settings > Custom Claims**
4. Enable **Custom Access Token Hook**
5. Select `auth.custom_access_token_hook`

---

## Step 5: Create First User (Owner)

### 5.1: Sign Up First User

**Via Supabase Dashboard:**
1. Go to **Authentication > Users**
2. Click **"Add user"** → **"Create new user"**
3. Fill in:
   - **Email**: `doctor@drtebeila.co.za`
   - **Password**: (generate strong password)
   - **Auto Confirm User**: ✅ Check this
4. Click **"Create user"**
5. Copy the **User ID** (UUID)

### 5.2: Create User Profile

Run this in **SQL Editor**, replacing the UUIDs:

```sql
-- Get tenant_id first
SELECT id, name FROM tenants WHERE slug = 'dr-tebeila-dental-studio';

-- Insert user profile (replace UUIDs with actual values)
INSERT INTO user_profiles (id, tenant_id, full_name, role, email, phone, is_active)
VALUES (
    '<USER_ID_FROM_AUTH>',     -- From auth.users table
    '<TENANT_ID_FROM_TENANTS>', -- From tenants table
    'Dr. Tebeila',
    'owner',
    'doctor@drtebeila.co.za',
    '+27 12 345 6789',
    true
);
```

**Verify User Profile:**
```sql
SELECT
    up.id,
    up.full_name,
    up.role,
    up.email,
    t.name AS tenant_name,
    t.slug AS tenant_slug
FROM user_profiles up
JOIN tenants t ON up.tenant_id = t.id;
```

---

## Step 6: Test RLS Enforcement

### 6.1: Test Tenant Isolation

**Login as the owner user you created above:**

```javascript
// In your frontend app
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'doctor@drtebeila.co.za',
  password: 'your-password'
});

// Get JWT token
const token = data.session.access_token;

// Decode JWT to verify tenant_id claim
console.log(jwt_decode(token));
// Should include: { tenant_id: "uuid-of-tenant" }
```

**Test Queries:**

```sql
-- As authenticated user, try to query data
-- RLS should automatically filter by tenant_id

-- Should return only Dr.Tebeila tenant
SELECT * FROM tenants;

-- Should return only services for this tenant
SELECT * FROM services;

-- Should return only customers for this tenant
SELECT * FROM customers;
```

### 6.2: Test Cross-Tenant Isolation

**Create Second Tenant (for testing):**

```sql
-- Insert test tenant
INSERT INTO tenants (name, slug, business_name, primary_color, secondary_color)
VALUES ('Test Clinic', 'test-clinic', 'Test Clinic Ltd', '#FF0000', '#0000FF')
RETURNING id;

-- Try to query as Dr.Tebeila user
SELECT * FROM tenants;
-- Should ONLY return Dr.Tebeila, NOT Test Clinic
```

### 6.3: Test Role-Based Permissions

**Create Staff User:**

```sql
-- Create user in Authentication > Users
-- Then insert profile with 'staff' role

INSERT INTO user_profiles (id, tenant_id, full_name, role, email, is_active)
VALUES (
    '<STAFF_USER_ID>',
    '<TENANT_ID>',
    'Receptionist Jane',
    'staff',
    'receptionist@drtebeila.co.za',
    true
);

-- Login as staff user and test:
-- ✅ Can create Draft invoices
-- ✅ Can read all invoices
-- ❌ Cannot update Finalized invoices
-- ❌ Cannot delete tenants
-- ❌ Cannot manage VAT rates
```

---

## Step 7: Verify Setup

### Checklist

- [ ] Supabase project created
- [ ] API credentials copied to `.env.local`
- [ ] `schema.sql` applied successfully
- [ ] `policies.sql` applied successfully
- [ ] `seed.sql` applied successfully
- [ ] Tenant "Dr.Tebeila Dental Studio" exists
- [ ] 16 services loaded
- [ ] 2 VAT rates (15%, 0%) exist
- [ ] 3 units (Service, Hour, Unit) exist
- [ ] Email/password auth enabled
- [ ] Custom JWT hook configured (tenant_id in claims)
- [ ] First owner user created
- [ ] User profile linked to tenant
- [ ] RLS policies enforced (tested)
- [ ] Cross-tenant isolation verified

### Verification Queries

```sql
-- Count all entities
SELECT
    (SELECT COUNT(*) FROM tenants) AS tenants_count,
    (SELECT COUNT(*) FROM vat_rates) AS vat_rates_count,
    (SELECT COUNT(*) FROM units) AS units_count,
    (SELECT COUNT(*) FROM services) AS services_count,
    (SELECT COUNT(*) FROM customers) AS customers_count,
    (SELECT COUNT(*) FROM user_profiles) AS users_count,
    (SELECT COUNT(*) FROM invoice_counters) AS counters_count;

-- Expected result:
-- tenants_count: 1
-- vat_rates_count: 2
-- units_count: 3
-- services_count: 16
-- customers_count: 2
-- users_count: 1 (or more if you created additional users)
-- counters_count: 1

-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = true;

-- Should list all 10 tables with rowsecurity = true

-- Check policies exist
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Should list 30+ policies
```

---

## Step 8: Configure Storage (Optional - for Invoice Attachments)

1. Go to **Storage** in Supabase Dashboard
2. Create bucket: `invoice-attachments`
3. Configure bucket:
   - **Public**: ❌ (private bucket)
   - **File size limit**: 10 MB
   - **Allowed MIME types**: `application/pdf`, `image/*`

4. Add Storage Policies:

```sql
-- Allow authenticated users to upload to their tenant folder
CREATE POLICY "Users can upload to tenant folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'invoice-attachments' AND
    (storage.foldername(name))[1] = get_user_tenant_id()::text
);

-- Allow users to read from their tenant folder
CREATE POLICY "Users can read tenant files"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'invoice-attachments' AND
    (storage.foldername(name))[1] = get_user_tenant_id()::text
);

-- Allow admins to delete from their tenant folder
CREATE POLICY "Admins can delete tenant files"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'invoice-attachments' AND
    (storage.foldername(name))[1] = get_user_tenant_id()::text AND
    is_admin_or_owner()
);
```

---

## Troubleshooting

### Issue: RLS Denies All Access

**Problem**: Cannot query any data even as authenticated user

**Solution**:
1. Check JWT contains `tenant_id` claim:
   ```javascript
   const { data } = await supabase.auth.getSession();
   console.log(jwt_decode(data.session.access_token));
   ```
2. Ensure user_profile exists with correct tenant_id
3. Verify custom JWT hook is configured and executing

### Issue: Seed Script Fails

**Problem**: `db/seed.sql` returns errors

**Solution**:
1. Ensure `schema.sql` ran first
2. Check for conflicting data (run seed only once)
3. Clear data and re-run:
   ```sql
   TRUNCATE tenants CASCADE;
   -- Then re-run seed.sql
   ```

### Issue: Cannot Create Users

**Problem**: User creation fails in dashboard

**Solution**:
1. Check email provider is enabled (Authentication > Providers)
2. Verify email confirmation settings
3. For testing, enable "Auto Confirm User" option

---

## Next Steps

After completing T2 setup:

- ✅ **T3**: Frontend scaffolding (React + Vite + Tailwind)
- ✅ **T4**: Authentication system
- ✅ **T5**: Invoice CRUD operations
- ✅ **T6**: Invoice numbering & finalization logic

---

## Support

- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **RLS Guide**: [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- **JWT Claims**: [Custom Claims](https://supabase.com/docs/guides/auth/auth-hooks)

---

**Last Updated**: 2025-10-09
**Version**: T2 - Supabase Setup & Tenant Auth Context
