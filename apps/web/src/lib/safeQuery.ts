import { PostgrestFilterBuilder } from '@supabase/postgrest-js';

export interface SafeQueryOptions {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
}

/**
 * Wraps a Supabase query with timeout and retry logic
 * Prevents hung queries from blocking UI indefinitely
 */
export async function safeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options: SafeQueryOptions = {}
): Promise<{ data: T | null; error: any }> {
  const { timeoutMs = 8000, retries = 2, retryDelayMs = 1000 } = options;

  let lastError: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await Promise.race([
        queryFn(),
        new Promise<{ data: null; error: any }>((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
        ),
      ]);

      // If successful, return immediately
      if (!result.error) {
        return result;
      }

      lastError = result.error;

      // Don't retry on certain errors
      if (
        result.error.code === 'PGRST116' || // No rows returned
        result.error.code === '42501' ||    // Insufficient privilege (RLS)
        result.error.message?.includes('JWT')
      ) {
        return result;
      }

      // Retry on network/timeout errors
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        continue;
      }

      return result;
    } catch (error: any) {
      lastError = error;

      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        continue;
      }

      return {
        data: null,
        error: {
          message: error.message || 'Query failed',
          code: 'TIMEOUT',
        },
      };
    }
  }

  return {
    data: null,
    error: lastError || { message: 'Query failed after retries', code: 'UNKNOWN' },
  };
}

/**
 * Helper for common tenant-scoped queries
 */
export async function safeTenantQuery<T>(
  table: string,
  tenantId: string,
  select = '*',
  additionalFilters?: (query: any) => any,
  options?: SafeQueryOptions
) {
  const { supabase } = await import('./supabase');

  return safeQuery(async () => {
    let query = supabase
      .from(table)
      .select(select)
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (additionalFilters) {
      query = additionalFilters(query);
    }

    return await query;
  }, options);
}
