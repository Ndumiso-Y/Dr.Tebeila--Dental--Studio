# 🚀 Deployment Guide - Dr. Tebeila Dental Studio v2.0-stable

**Project:** Dr. Tebeila Dental Studio - Professional Invoicing System
**Version:** v2.0-stable
**Status:** ✅ PRODUCTION READY
**Date:** 2025-11-10

---

## 📋 Pre-Deployment Checklist

- [x] All features tested and working
- [x] Build successful (1.5MB)
- [x] Git commit and tag created (v2.0-stable)
- [x] Documentation complete
- [x] Supabase schema v4.1 deployed
- [x] Environment variables configured

---

## 🔧 Deployment Steps

### Option 1: Automatic GitHub Pages Deployment (Recommended)

1. **Push to GitHub**
   ```bash
   cd "f:/Digital Agency/Refodile Health Centre/Dentist/Dr.Tebeila Dental Studio"
   git push origin feature/gate-s5-ui
   git push origin v2.0-stable
   ```

2. **Merge to Main Branch** (via GitHub PR or command line)
   ```bash
   git checkout main
   git merge feature/gate-s5-ui
   git push origin main
   ```

3. **Deploy to GitHub Pages**
   ```bash
   cd apps/web
   npm run build
   npm run deploy
   ```

   **Alternative deployment command:**
   ```bash
   git subtree push --prefix apps/web/dist origin gh-pages
   ```

4. **Verify Deployment**
   - Visit: `https://[your-github-username].github.io/[repository-name]`
   - Test login with Supabase credentials
   - Create a test invoice
   - Download PDF
   - Verify payment tracking

### Option 2: Manual Build & Deploy

1. **Build Production Bundle**
   ```bash
   cd apps/web
   npm run build
   # Output: apps/web/dist/
   ```

2. **Copy `dist/` folder to your web server**
   - FTP, SFTP, or hosting provider's file manager
   - Ensure all files and folders are copied

3. **Configure Web Server**
   - Ensure SPA routing works (all routes redirect to index.html)
   - Enable HTTPS (required for Supabase)

---

## 🌍 Environment Configuration

### Required Environment Variables

Create `.env.local` in `apps/web/`:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Get credentials from:**
1. Login to Supabase Dashboard
2. Select your project
3. Go to **Settings → API**
4. Copy **Project URL** and **anon public** key

---

## 🔒 Supabase Configuration

### 1. Database Schema

**Current Version:** v4.1

**Verify all tables exist:**
- `tenants`
- `user_profiles`
- `customers` (with patient fields: first_name, last_name, cell, id_number, home_address)
- `services`
- `vat_rates`
- `invoices` (with payment fields: amount_paid, payment_method, change_due)
- `invoice_items`
- `audit_log`

### 2. Row Level Security (RLS)

**Verify RLS is enabled on all tables:**
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

All tables should have `rowsecurity = true`.

### 3. Auth Configuration

**Allowed Redirect URLs:**
- `https://[your-github-username].github.io/[repository-name]`
- `http://localhost:5173` (for local development)

**Update in Supabase:**
1. Go to **Authentication → URL Configuration**
2. Add your production URL to **Redirect URLs**

---

## 📱 Post-Deployment Testing

### 1. Basic Functionality Test

- [ ] Navigate to deployed URL
- [ ] Login with test credentials
- [ ] Dashboard loads correctly
- [ ] Navigation menu works

### 2. Patient Management Test

- [ ] Click "Create Invoice"
- [ ] Click "+ New Patient" button
- [ ] Fill in patient details (First Name, Last Name, Cell, Email, ID, Address)
- [ ] Verify SA cell phone validation (0[6-8]X XXXXXXXX)
- [ ] Click "Create Patient"
- [ ] Patient appears in dropdown

### 3. Invoice Creation Test

- [ ] Select patient from dropdown
- [ ] Set invoice date
- [ ] Add line items (procedures)
- [ ] Verify totals calculate correctly
- [ ] Add payment information
- [ ] Enter amount paid
- [ ] Select payment method (Cash)
- [ ] Verify change due calculates automatically
- [ ] Click "Save Draft"
- [ ] Navigate to invoice detail

### 4. Invoice Display Test

- [ ] All patient information visible
- [ ] Line items display correctly
- [ ] Totals are accurate
- [ ] Payment information shows
- [ ] Change due highlighted (if Cash)

### 5. PDF Generation Test

- [ ] Click "Download PDF" button
- [ ] PDF downloads successfully
- [ ] Open PDF file
- [ ] Verify professional header: "Dr. Tebeila Dental Studio"
- [ ] Verify practice tagline visible
- [ ] Verify patient information complete
- [ ] Verify payment details included
- [ ] Verify professional footer with thank-you message

### 6. Mobile Responsiveness Test

- [ ] Open on mobile device (or Chrome DevTools mobile view)
- [ ] Test at 375px width (iPhone SE)
- [ ] All forms responsive
- [ ] No horizontal scrolling
- [ ] Buttons are tap-friendly
- [ ] Modal displays correctly

### 7. Performance Test

- [ ] Clear browser cache
- [ ] Reload page
- [ ] Measure load time (should be < 3 seconds)
- [ ] Navigate between pages
- [ ] Verify smooth transitions

---

## 🐛 Troubleshooting

### Issue: "Invalid Supabase credentials"

**Solution:**
1. Check `.env.local` file exists in `apps/web/`
2. Verify environment variables are correct
3. Ensure no extra spaces or quotes in values
4. Rebuild the project: `npm run build`

### Issue: "Page not found" on refresh

**Solution:**
1. GitHub Pages: Ensure SPA routing is configured
2. Create `404.html` that redirects to `index.html`
3. Or use hash-based routing instead of browser routing

### Issue: "RLS policy violation"

**Solution:**
1. Login to Supabase Dashboard
2. Go to **Database → Policies**
3. Verify policies exist for all tables
4. Check `tenant_id` is being passed correctly

### Issue: PDF not generating

**Solution:**
1. Check browser console for errors
2. Verify jsPDF is imported correctly
3. Ensure invoice data is complete
4. Test with a simple invoice first

### Issue: Payment change not calculating

**Solution:**
1. Verify payment method is set to "Cash"
2. Check amount paid > 0
3. Verify useEffect dependency array includes all required fields
4. Check browser console for errors

---

## 📞 Support & Maintenance

### For Technical Issues

**Contact:** Embark Digitals
**Owner:** Ndumiso Yedwa
**Email:** [your-email]
**Support Hours:** [your-hours]

### For Feature Requests

**Process:**
1. Document the feature request
2. Submit via email or project management system
3. PM will evaluate and prioritize
4. Development scheduled for next gate

### For Training

**User Manuals:**
- See "User Training Notes" section in `docs/GATE_S6_FINAL_RELEASE_REPORT.md`

**Training Sessions:**
- Available upon request
- On-site or remote via video call

---

## 📊 Monitoring & Analytics

### Recommended Monitoring

1. **Supabase Dashboard**
   - Monitor database usage
   - Track API requests
   - Review auth logs

2. **Google Analytics** (optional)
   - Add tracking code to `index.html`
   - Monitor page views and user flows

3. **Error Tracking** (optional)
   - Integrate Sentry or similar service
   - Track JavaScript errors in production

---

## 🔄 Backup & Recovery

### Database Backup

**Supabase Backups:**
- Automatic daily backups (for paid plans)
- Manual backup: Go to **Database → Backups**

**Manual Export:**
```bash
pg_dump -h your-project.supabase.co -U postgres -d postgres > backup.sql
```

### Code Backup

**Git Repository:**
- All code is version-controlled in Git
- Push regularly to GitHub
- Tags mark stable releases (v2.0-stable)

---

## 🎯 Next Steps After Deployment

1. **User Training**
   - Train reception staff on patient management
   - Demonstrate invoice creation workflow
   - Show PDF generation process

2. **Monitor Usage**
   - Check Supabase dashboard daily (first week)
   - Review any errors or issues
   - Gather user feedback

3. **Plan Enhancements**
   - Review "Future Enhancements" in GATE_S6_FINAL_RELEASE_REPORT.md
   - Prioritize based on user needs
   - Schedule Gate S7 development

---

## ✅ Deployment Complete!

Once all testing is complete and staff are trained, the system is ready for production use.

**Congratulations on successfully deploying Dr. Tebeila Dental Studio Invoicing System v2.0! 🎉**

---

*Prepared by: Embark Digitals | Powered by Claude Code*
*Version: v2.0-stable | Date: 2025-11-10*
