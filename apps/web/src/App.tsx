import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, AuthGuard } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DebugPanel } from './components/DebugPanel';
import Login from './pages/Login';
import InvoicesList from './pages/InvoicesList';
import InvoiceNew from './pages/InvoiceNew';
import InvoiceDetail from './pages/InvoiceDetail';
import CustomersList from './pages/CustomersList';
import Settings from './pages/Settings';

/* ===========================================================
   Internal routing logic with proper redirects
   =========================================================== */
function AppRoutes() {
  const { user } = useAuth();

  // ✅ Routes (loading handled by AuthGuard on protected routes)
  return (
    <Routes>
      {/* --- Public --- */}
      <Route
        path="/login"
        element={
          user
            ? <Navigate to="/invoices/new" replace />   // already logged in → new invoice
            : <Login />                                  // show login page
        }
      />

      {/* --- Protected routes --- */}
      <Route
        path="/invoices"
        element={
          <AuthGuard>
            <InvoicesList />
          </AuthGuard>
        }
      />
      <Route
        path="/invoices/new"
        element={
          <AuthGuard>
            <InvoiceNew />
          </AuthGuard>
        }
      />
      <Route
        path="/invoices/:id"
        element={
          <AuthGuard>
            <InvoiceDetail />
          </AuthGuard>
        }
      />
      <Route
        path="/customers"
        element={
          <AuthGuard>
            <CustomersList />
          </AuthGuard>
        }
      />
      <Route
        path="/settings"
        element={
          <AuthGuard>
            <Settings />
          </AuthGuard>
        }
      />

      {/* --- Default redirect --- */}
      <Route
        path="/"
        element={
          user
            ? <Navigate to="/invoices/new" replace />
            : <Navigate to="/login" replace />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/* ===========================================================
   Top-level wrapper
   =========================================================== */
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <DebugPanel />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
