import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';

/**
 * DebugPanel - activated via ?debug=1 query parameter
 * Shows auth state for field testing during onboarding
 */
export function DebugPanel() {
  const { loading, error, user, tenantId, session, profile, role, fullName } = useAuth();

  // Only show if ?debug=1 is in URL
  const params = new URLSearchParams(window.location.search);
  if (params.get('debug') !== '1') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 max-w-md bg-gray-900 text-white p-4 rounded-lg shadow-2xl z-50 text-xs font-mono">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-sm">🐛 Debug Panel</h3>
        <button
          onClick={() => {
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('debug');
            window.location.href = newUrl.toString();
          }}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        <div>
          <span className="text-gray-400">Supabase:</span>{' '}
          <span className={isSupabaseConfigured() ? 'text-green-400' : 'text-red-400'}>
            {isSupabaseConfigured() ? '✓ Configured' : '✗ Not configured'}
          </span>
        </div>

        <div>
          <span className="text-gray-400">Loading:</span>{' '}
          <span className={loading ? 'text-yellow-400' : 'text-green-400'}>
            {loading ? 'true' : 'false'}
          </span>
        </div>

        <div>
          <span className="text-gray-400">Error:</span>{' '}
          <span className={error ? 'text-red-400' : 'text-green-400'}>
            {error || 'null'}
          </span>
        </div>

        <div>
          <span className="text-gray-400">User ID:</span>{' '}
          <span className="text-blue-400">{user?.id || 'null'}</span>
        </div>

        <div>
          <span className="text-gray-400">Email:</span>{' '}
          <span className="text-blue-400">{user?.email || 'null'}</span>
        </div>

        <div>
          <span className="text-gray-400">Session:</span>{' '}
          <span className={session ? 'text-green-400' : 'text-red-400'}>
            {session ? '✓ Active' : '✗ None'}
          </span>
        </div>

        <div>
          <span className="text-gray-400">Tenant ID:</span>{' '}
          <span className={tenantId ? 'text-green-400' : 'text-red-400'}>
            {tenantId || 'null'}
          </span>
        </div>

        <div>
          <span className="text-gray-400">Role:</span>{' '}
          <span className="text-purple-400">{role || 'null'}</span>
        </div>

        <div>
          <span className="text-gray-400">Full Name:</span>{' '}
          <span className="text-blue-400">{fullName || 'null'}</span>
        </div>

        <div>
          <span className="text-gray-400">Profile Active:</span>{' '}
          <span className={profile?.is_active ? 'text-green-400' : 'text-red-400'}>
            {profile ? (profile.is_active ? 'true' : 'false') : 'null'}
          </span>
        </div>

        <div className="pt-2 border-t border-gray-700">
          <span className="text-gray-400">URL:</span>{' '}
          <span className="text-blue-400 break-all">{window.location.pathname}</span>
        </div>

        <div>
          <span className="text-gray-400">Timestamp:</span>{' '}
          <span className="text-gray-500">{new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-gray-700 text-gray-400 text-xs">
        Add <code className="bg-gray-800 px-1 py-0.5 rounded">?debug=1</code> to URL to enable
      </div>
    </div>
  );
}
