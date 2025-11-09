# Quick Deployment Fix - Manual Steps Required

## ✅ Step 1 Complete
- `.nojekyll` file created and pushed (commit b8a697d)
- This fixes the Jekyll build error you encountered

## 📝 Step 2: Edit vite.config.ts (Manual)

Due to file watcher interference, you need to manually add one line to `apps/web/vite.config.ts`:

**Open**: `apps/web/vite.config.ts`

**Find line 6**:
```typescript
export default defineConfig({
  plugins: [
```

**Change to**:
```typescript
export default defineConfig({
  base: '/Dr.Tebeila--Dental--Studio/',
  plugins: [
```

**Save the file**.

## 🚀 Step 3: Build and Deploy

```bash
cd apps/web
npm run build
cd ../..
git subtree push --prefix apps/web/dist origin gh-pages
```

## 🏷️ Step 4: Tag Release

```bash
git tag -a v1.0-stable -m "Stable release after Gate S3.11 auth fixes"
git push origin v1.0-stable
```

## ✅ Step 5: Configure GitHub Pages

1. Go to: https://github.com/Ndumiso-Y/Dr.Tebeila--Dental--Studio/settings/pages
2. Under **Source**, select **Deploy from a branch**
3. Select **gh-pages** branch and **/ (root)** folder
4. Click **Save**

## 🔍 Step 6: Verify Deployment

Visit: https://ndumiso-y.github.io/Dr.Tebeila--Dental--Studio/

---

**Note**: The Jekyll error is now fixed. Once you complete Steps 2-6, your React app will be live on GitHub Pages.
