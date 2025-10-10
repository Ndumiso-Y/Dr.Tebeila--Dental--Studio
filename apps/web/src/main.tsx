// ---- Dev-only PWA cache purge ----
// Prevent stale service worker + caches from breaking hot reload in development
if (import.meta.env.DEV) {
  // Unregister *all* service workers
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then((regs) => regs.forEach((r) => r.unregister()))
      .catch(() => {});
  }
  // Clear caches so we always load fresh JS bundles in dev
  if ('caches' in window) {
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .catch(() => {});
  }
}
// ---- End dev-only PWA cache purge ----

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
