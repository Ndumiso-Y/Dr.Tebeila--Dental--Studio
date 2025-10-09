# Dr.Tebeila Dental Studio - Quick Start Guide

Complete SaaS invoicing system for dental practices.

## 🚀 Quick Start

### 1. Database Setup (Supabase)

```bash
# See detailed instructions in db/README.md

# 1. Create Supabase project at https://supabase.com
# 2. Run migrations in SQL Editor:
#    - db/schema.sql
#    - db/policies.sql
#    - db/seed.sql
#    - db/jwt-config.sql
# 3. Configure JWT custom claims hook
# 4. Create first owner user
```

**Result**: Database with 16 dental services, 2 VAT rates, multi-tenant structure, RLS enabled.

### 2. Frontend Setup (React App)

```bash
# Navigate to web app
cd apps/web

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local

# Edit .env.local with your Supabase credentials:
# VITE_SUPABASE_URL=https://your-project-id.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key

# Start development server
npm run dev
```

**Open**: http://localhost:5173

### 3. Login

- **Email**: `ndumisoyedwa@gmail.com`
- **Password**: (your Supabase Auth password)

---

## 📂 Project Structure

```
Dr.Tebeila-Dental-Studio/
├── db/                      # Database migrations & setup
│   ├── schema.sql           # Multi-tenant tables
│   ├── policies.sql         # Row Level Security
│   ├── seed.sql             # Initial data (16 services)
│   ├── jwt-config.sql       # JWT tenant claims
│   ├── test-rls.sql         # RLS verification tests
│   └── README.md            # Setup instructions
│
├── apps/web/                # React frontend (Vite + TypeScript)
│   ├── src/
│   │   ├── lib/             # Supabase + Dexie clients
│   │   ├── contexts/        # Auth context
│   │   ├── components/      # UI components
│   │   ├── pages/           # App pages
│   │   └── App.tsx          # Router setup
│   ├── .env.example         # Environment template
│   └── README.md            # Frontend docs
│
└── docs/
    ├── MASTER_SPEC.md       # System specification
    └── TICKETS_M1.md        # Milestone 1 tickets
```

---

## ✨ Features

### Backend (Supabase)

- ✅ Multi-tenant PostgreSQL database
- ✅ Row Level Security (RLS) for tenant isolation
- ✅ JWT custom claims (tenant_id injection)
- ✅ Auth with email/password
- ✅ 16 pre-seeded dental services
- ✅ VAT rates (15%, 0%)
- ✅ Invoice numbering: `DEV-2025-0001` format
- ✅ Audit logging

### Frontend (React)

- ✅ Modern UI with Tailwind CSS
- ✅ Multi-page app with React Router
- ✅ Login / Sign out
- ✅ Invoice list view
- ✅ Create invoices with line items
- ✅ Customer & service selection
- ✅ Auto-calculate totals & VAT
- ✅ Offline support (Dexie IndexedDB)
- ✅ PWA (installable app)
- ✅ Mobile responsive

---

## 🎨 Brand Colors

- **Primary Green**: `#05984B`
- **Secondary Blue**: `#0E8ECC`
- **Neutral Grays**: `#6F6E6D`, `#787674`

---

## 📊 Database Tables

**Core Entities**:
- `tenants` - Organizations (Dr.Tebeila Dental Studio)
- `user_profiles` - Users (owner/admin/staff)
- `customers` - Customer directory
- `services` - Service catalog (16 dental procedures)
- `vat_rates` - VAT rates (15%, 0%)
- `invoices` - Invoice headers (Draft/ProformaOffline/Finalized/Paid/Void)
- `invoice_items` - Normalized line items
- `invoice_counters` - Auto-incrementing DEV numbers
- `audit_log` - Audit trail

**All tables enforce tenant isolation via RLS!**

---

## 🔐 Security

- **RLS**: Tenant isolation enforced at database level
- **JWT**: Custom claims include `tenant_id` and `user_role`
- **Auth**: Supabase Auth with session management
- **Roles**: owner (full access) > admin (data mgmt) > staff (limited)

---

## 🛠️ Development

### Database Changes

```bash
# Edit db/schema.sql, db/policies.sql, or db/seed.sql
# Then run in Supabase SQL Editor

# Verify RLS
cd db
# Run test-rls.sql to verify tenant isolation
```

### Frontend Changes

```bash
cd apps/web

# Run dev server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 📱 PWA Installation

1. **Desktop**: Visit https://your-app.vercel.app in Chrome
2. **Mobile**: Open in mobile browser, tap "Add to Home Screen"
3. **Offline**: App works offline, shows connectivity banner

---

## 🚧 Roadmap

### Implemented ✅
- Multi-tenant database with RLS
- Authentication & authorization
- Invoice CRUD (Draft status)
- Customer management
- Service catalog
- Line items with VAT calculation
- Offline support (Dexie)
- PWA configuration

### Next Steps 🔜
- Invoice finalization (assign DEV number)
- PDF generation (Puppeteer)
- Payment tracking
- Proforma invoices
- Customer CRUD UI
- Reports & analytics
- Email notifications
- Advanced offline sync

---

## 🐛 Troubleshooting

### Can't login

1. Check `.env.local` has correct Supabase credentials
2. Verify user exists in Supabase Auth
3. Check `user_profiles` table has entry for user
4. Verify RLS policies enabled: Run `db/test-rls.sql`

### Invoices don't load

1. Open browser DevTools > Console
2. Check for CORS or authentication errors
3. Verify JWT contains `tenant_id`: Run `SELECT debug_jwt_claims();` in Supabase
4. Test RLS: Run queries in `db/test-rls.sql`

### Build errors

```bash
cd apps/web
rm -rf node_modules package-lock.json
npm install
npm run dev
```

---

## 📚 Documentation

- **Database**: [db/README.md](db/README.md) - Full setup guide
- **Frontend**: [apps/web/README.md](apps/web/README.md) - React app docs
- **Spec**: [docs/MASTER_SPEC.md](docs/MASTER_SPEC.md) - System architecture
- **Tickets**: [docs/TICKETS_M1.md](docs/TICKETS_M1.md) - Milestone 1 tasks

---

## 🤝 Support

For issues or questions:
1. Check troubleshooting section above
2. Review [db/README.md](db/README.md) and [apps/web/README.md](apps/web/README.md)
3. Check browser console for errors
4. Verify Supabase RLS policies

---

## 📄 License

Proprietary - Dr.Tebeila Dental Studio

---

**Built with** ❤️ **by Claude Code**

Stack: React + Vite + TypeScript + Tailwind + Supabase + Dexie + PWA
