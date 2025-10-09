#!/bin/bash

# Database Migration Script - Dr.Tebeila Dental Studio
# =====================================================
# Applies schema, policies, and seed data to Supabase PostgreSQL
# Usage: ./db/migrate.sh

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load environment variables
if [ -f "$SCRIPT_DIR/../.env.local" ]; then
    export $(grep -v '^#' "$SCRIPT_DIR/../.env.local" | xargs)
    echo -e "${GREEN}✓${NC} Loaded .env.local"
else
    echo -e "${RED}✗${NC} .env.local not found. Please create it from .env.example"
    exit 1
fi

# Check required environment variables
if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}✗${NC} Missing required environment variables:"
    echo "   - VITE_SUPABASE_URL"
    echo "   - SUPABASE_SERVICE_ROLE_KEY"
    exit 1
fi

# Extract project ref from URL
PROJECT_REF=$(echo "$VITE_SUPABASE_URL" | sed -n 's/.*\/\/\([^.]*\).*/\1/p')

echo ""
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}  Dr.Tebeila Dental Studio - Database Migration${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""
echo -e "Project:  ${YELLOW}$PROJECT_REF${NC}"
echo -e "URL:      ${YELLOW}$VITE_SUPABASE_URL${NC}"
echo ""

# Function to run SQL file
run_sql() {
    local file=$1
    local description=$2

    echo ""
    echo -e "${YELLOW}▶${NC} Running: $description"
    echo -e "   File: ${BLUE}$file${NC}"

    # Use Supabase REST API to execute SQL
    response=$(curl -s -w "\n%{http_code}" -X POST \
        "${VITE_SUPABASE_URL}/rest/v1/rpc/exec_sql" \
        -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Content-Type: application/json" \
        -d @- <<EOF
{
  "query": $(cat "$file" | jq -Rs .)
}
EOF
    )

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)

    if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ]; then
        echo -e "   ${GREEN}✓ Success${NC}"
        return 0
    else
        echo -e "   ${RED}✗ Failed (HTTP $http_code)${NC}"
        echo -e "   ${RED}$body${NC}"
        return 1
    fi
}

# Alternative: Use psql if available
run_sql_psql() {
    local file=$1
    local description=$2

    echo ""
    echo -e "${YELLOW}▶${NC} Running: $description"
    echo -e "   File: ${BLUE}$file${NC}"

    # Construct connection string
    DB_URL="postgresql://postgres:$DB_PASSWORD@db.$PROJECT_REF.supabase.co:5432/postgres"

    if command -v psql &> /dev/null; then
        if psql "$DB_URL" -f "$file" > /dev/null 2>&1; then
            echo -e "   ${GREEN}✓ Success${NC}"
            return 0
        else
            echo -e "   ${RED}✗ Failed${NC}"
            return 1
        fi
    else
        echo -e "   ${YELLOW}⚠ psql not found, skipping${NC}"
        return 1
    fi
}

# Check if Supabase CLI is installed
if command -v supabase &> /dev/null; then
    echo -e "${GREEN}✓${NC} Supabase CLI detected"
    USE_CLI=true
else
    echo -e "${YELLOW}⚠${NC} Supabase CLI not found. Install with: npm install -g supabase"
    USE_CLI=false
fi

echo ""
echo -e "${YELLOW}This script will apply the following migrations:${NC}"
echo -e "  1. ${BLUE}db/schema.sql${NC}   - Database schema (tables, functions, triggers)"
echo -e "  2. ${BLUE}db/policies.sql${NC} - Row Level Security policies"
echo -e "  3. ${BLUE}db/seed.sql${NC}     - Seed data (tenant, services, VAT rates)"
echo ""
echo -e "${RED}WARNING: This will modify your database!${NC}"
echo -e "${YELLOW}Make sure you have a backup if running on production.${NC}"
echo ""

read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Aborted.${NC}"
    exit 0
fi

# Run migrations
echo ""
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}  Starting Migration${NC}"
echo -e "${BLUE}============================================================${NC}"

if [ "$USE_CLI" = true ]; then
    # Use Supabase CLI
    echo ""
    echo -e "${YELLOW}▶${NC} Linking to Supabase project..."
    supabase link --project-ref "$PROJECT_REF" || true

    echo ""
    echo -e "${YELLOW}▶${NC} Applying schema..."
    supabase db push --file "$SCRIPT_DIR/schema.sql"

    echo ""
    echo -e "${YELLOW}▶${NC} Applying policies..."
    supabase db push --file "$SCRIPT_DIR/policies.sql"

    echo ""
    echo -e "${YELLOW}▶${NC} Applying seed data..."
    supabase db push --file "$SCRIPT_DIR/seed.sql"

else
    # Manual SQL execution (requires user to run in Supabase Dashboard)
    echo ""
    echo -e "${YELLOW}⚠ Manual Migration Required${NC}"
    echo ""
    echo "Please run the following SQL files in your Supabase SQL Editor:"
    echo ""
    echo "1. Open: https://app.supabase.com/project/$PROJECT_REF/sql"
    echo ""
    echo "2. Run these files in order:"
    echo -e "   ${BLUE}→ db/schema.sql${NC}"
    echo -e "   ${BLUE}→ db/policies.sql${NC}"
    echo -e "   ${BLUE}→ db/seed.sql${NC}"
    echo ""
    echo "3. Watch for success messages in the console"
    echo ""
    read -p "Press Enter when done..."
fi

# Verify migration
echo ""
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}  Verifying Migration${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

echo -e "${YELLOW}To verify the migration, run these queries in your SQL Editor:${NC}"
echo ""
echo -e "${BLUE}-- Check tables exist${NC}"
echo "SELECT COUNT(*) AS table_count FROM information_schema.tables WHERE table_schema = 'public';"
echo ""
echo -e "${BLUE}-- Check RLS enabled${NC}"
echo "SELECT COUNT(*) AS rls_enabled_count FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;"
echo ""
echo -e "${BLUE}-- Check seed data${NC}"
echo "SELECT * FROM tenants;"
echo "SELECT COUNT(*) FROM services;"
echo "SELECT COUNT(*) FROM vat_rates;"
echo ""

echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}  Migration Complete!${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo -e "${GREEN}✓${NC} Database schema applied"
echo -e "${GREEN}✓${NC} RLS policies configured"
echo -e "${GREEN}✓${NC} Seed data loaded"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Create your first user in Supabase Auth"
echo "2. Insert user profile with owner role"
echo "3. Configure JWT custom claims (see db/README.md)"
echo "4. Test RLS enforcement"
echo ""
echo "See ${BLUE}db/README.md${NC} for detailed instructions."
echo ""
