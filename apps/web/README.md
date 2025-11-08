# Dr.Tebeila Dental Studio - Web App

Production-quality React frontend for Dr.Tebeila Dental Studio invoice management.

## Tech Stack

- **Framework**: React 18 + Vite + TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Database**: Supabase (PostgreSQL with RLS)
- **Offline**: Dexie (IndexedDB) for offline draft invoices
- **PWA**: vite-plugin-pwa (installable, offline-capable)

## Brand Colors

- Primary Green: `#05984B`
- Secondary Blue: `#0E8ECC`
- Neutral Grays: `#6F6E6D`, `#787674`

## Setup

### 1. Prerequisites

- Node.js 18+ and npm
- Supabase project with database already set up (see `../../db/`)

### 2. Environment Variables

Create `.env.local` in this directory:

```bash
cp .env.example .env.local
```

Update with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_BRAND_PRIMARY=#05984B
VITE_BRAND_SECONDARY=#0E8ECC
VITE_DEFAULT_CURRENCY=ZAR
VITE_APP_NAME=Dr.Tebeila Dental Studio
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### 5. Login Credentials

Use the owner account created during database setup:

- **Email**: `ndumisoyedwa@gmail.com`
- **Password**: (the password you set in Supabase Auth)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Features

### ✅ Implemented

- **Authentication**: Email/password login with Supabase Auth
  - ⚡ **Optimized Performance**: Login in <3s (down from 5-8s)
  - 🚀 **Session Cache**: Instant page refresh (<100ms)
  - 🔥 **Database Warmup**: Auto-wake for free-tier Supabase projects
  - 📊 **Timing Instrumentation**: Detailed performance logs
- **Multi-tenant**: Automatic tenant isolation via RLS
- **Invoices**: List, create, and view draft invoices
- **Customers**: Customer selection for invoices
- **Services**: Service catalog with pricing and VAT
- **Line Items**: Add multiple line items with automatic total calculation
- **Offline Support**: Offline banner and IndexedDB caching (Dexie)
- **PWA**: Installable as mobile/desktop app
- **Responsive**: Mobile-first design with Tailwind CSS

### 🚧 To Be Implemented (Future)

- Invoice detail view with PDF generation
- Invoice finalization (assign DEV number)
- Payment tracking
- Customer CRUD
- Service management
- Reports and analytics
- Email notifications
- Advanced offline sync

## Project Structure

```
apps/web/
├── src/
│   ├── lib/
│   │   ├── supabase.ts       # Supabase client + types
│   │   └── db.ts              # Dexie IndexedDB for offline
│   ├── contexts/
│   │   └── AuthContext.tsx    # Authentication state
│   ├── components/
│   │   ├── Layout.tsx         # Main layout wrapper
│   │   ├── NavBar.tsx         # Navigation bar
│   │   └── OfflineBanner.tsx  # Offline indicator
│   ├── pages/
│   │   ├── Login.tsx          # Login page
│   │   ├── InvoicesList.tsx   # Invoices list
│   │   ├── InvoiceNew.tsx     # Create invoice
│   │   ├── InvoiceDetail.tsx  # Invoice detail
│   │   ├── CustomersList.tsx  # Customers (placeholder)
│   │   └── Settings.tsx       # User settings
│   ├── App.tsx                # Main app with routing
│   ├── main.tsx               # Entry point
│   └── index.css              # Tailwind + custom styles
├── public/                    # Static assets
├── .env.example               # Environment template
├── vite.config.ts             # Vite + PWA configuration
├── tailwind.config.js         # Tailwind configuration
└── package.json               # Dependencies
```

## Database Schema (Read-Only)

The app connects to an existing Supabase database with:

- `tenants` - Organizations (Dr.Tebeila Dental Studio)
- `user_profiles` - Users with roles (owner/admin/staff)
- `customers` - Customer directory
- `services` - Service catalog
- `vat_rates` - VAT rates (15%, 0%)
- `units` - Units of measurement
- `invoices` - Invoice headers
- `invoice_items` - Invoice line items

**Important**: All tables have Row Level Security (RLS) enabled with automatic tenant isolation.

## Multi-Tenancy

The app automatically enforces tenant isolation:

1. User logs in with Supabase Auth
2. `AuthContext` fetches user profile including `tenant_id`
3. All database queries automatically filter by `tenant_id` via RLS
4. Users can only see/modify data for their own tenant

**No manual tenant_id passing required** - RLS handles everything!

## Performance Optimizations

### Authentication Flow (Gate S2.2)

The authentication system includes several performance optimizations:

1. **Database Warmup** - Lightweight query sent on app load to wake Supabase free-tier instances
2. **Session Cache** - User session cached in-memory for instant restoration on page refresh
3. **Adaptive Timeout** - 8-second grace period for cold-start scenarios
4. **Structured Logging** - Detailed timing metrics for debugging:
   - `[AUTH_WARMUP]` - Database wake timing
   - `[SESSION_CACHE_HIT]` - Cache restoration (<100ms)
   - `[SIGNIN_COMPLETE]` - Total login duration
   - `[AUTH_COMPLETE]` - Full session resolution

**Performance Metrics:**
- First login (cold start): **2-4s** (down from 5-8s)
- Page refresh: **<100ms** (down from 1-2s)
- Subsequent logins: **1-2s** (down from 2-3s)

## Offline Support

### Dexie IndexedDB

- Draft invoices saved locally when offline
- Cached customer and service data
- Automatic sync when back online (to be implemented)

### PWA Features

- Installable on mobile/desktop
- Offline shell (app loads without network)
- Service worker caches static assets
- Network-first strategy for API calls

## Build & Deploy

### Production Build

```bash
npm run build
```

Output in `dist/` directory.

### Deploy to Vercel

1. Push code to GitHub
2. Import repository in Vercel
3. Set environment variables in Vercel dashboard
4. Deploy!

### Deploy to Netlify

1. Push code to GitHub
2. Import repository in Netlify
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Set environment variables
6. Deploy!

## Security

- ✅ Environment variables never committed (`.env.local` in `.gitignore`)
- ✅ Supabase anon key safe for frontend (RLS protects data)
- ✅ Service role key NEVER used in frontend
- ✅ RLS enforces tenant isolation
- ✅ Authentication required for all routes
- ✅ HTTPS only in production

## Troubleshooting

### "Missing environment variables" error

Create `.env.local` with your Supabase credentials.

### Login fails or is slow

1. Check Supabase credentials in `.env.local`
2. Verify user exists in Supabase Auth
3. Check `user_profiles` table has entry for user
4. Verify RLS policies are enabled
5. **Performance**: Check browser console for `[AUTH_*]` timing logs
   - If `[AUTH_WARMUP]` shows >2s, your Supabase instance was cold
   - If `[SIGNIN_COMPLETE]` consistently >5s, check network connection
   - Look for `[SESSION_CACHE_HIT]` on page refresh for optimal performance

### Invoices don't load

1. Check browser console for errors
2. Verify RLS policies are correct
3. Check JWT contains `tenant_id` claim
4. Test queries in Supabase SQL Editor

### PWA not installing

1. Must be served over HTTPS (or localhost)
2. Check service worker registered in DevTools
3. Clear browser cache and try again

## License

Proprietary - Dr.Tebeila Dental Studio

---

**Built with** ❤️ **using React + Vite + Supabase + Tailwind CSS**
