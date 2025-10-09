import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, AuthGuard } from './contexts/AuthContext';
import Login from './pages/Login';
import InvoicesList from './pages/InvoicesList';
import InvoiceNew from './pages/InvoiceNew';
import InvoiceDetail from './pages/InvoiceDetail';
import CustomersList from './pages/CustomersList';
import Settings from './pages/Settings';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/invoices" replace /> : <Login />}
      />
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
      <Route
        path="/"
        element={
          user ? <Navigate to="/invoices" replace /> : <Navigate to="/login" replace />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
