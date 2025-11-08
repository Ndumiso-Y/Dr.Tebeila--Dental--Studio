import { useState, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { isSupabaseConfigured } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const isConfigured = isSupabaseConfigured();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.info('[LOGIN_FORM] Starting login for:', email);
      await signIn(email, password);
      console.info('[LOGIN_FORM] Login successful - AuthContext will navigate');
    } catch (err: any) {
      console.error('[LOGIN_FORM_ERROR]', err.message || err);

      let errorMessage = err.message || 'Failed to sign in. Please check your credentials.';

      // User-friendly error messages
      if (errorMessage.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (errorMessage.includes('User profile not found')) {
        errorMessage = 'User profile not found. Please run db/fix-user-profile.sql in Supabase SQL Editor.';
      } else if (errorMessage.includes('Network')) {
        errorMessage = 'Network error. Please check your internet connection.';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-white shadow-xl mb-4 overflow-hidden">
            <img
              src="/logo.png"
              alt="Dr.Tebeila Dental Studio"
              className="w-full h-full object-contain p-3"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Dr.Tebeila Dental Studio
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Invoicing & Practice Management
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Sign In
          </h2>

          {!isConfigured && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm font-medium text-yellow-900 mb-2">⚠️ Supabase Not Configured</p>
              <p className="text-xs text-yellow-800">
                Create <code className="bg-yellow-100 px-1 rounded">.env.local</code> with your Supabase credentials.
                See <code className="bg-yellow-100 px-1 rounded">apps/web/.env.example</code> for template.
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="label">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full btn btn-primary text-base py-3"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </form>

          {/* Help Text */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Secure login powered by Supabase
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            © 2025 Dr.Tebeila Dental Studio. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
