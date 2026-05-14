import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { SupabaseConfig } from './types';

export function createAdminClient(config: SupabaseConfig): SupabaseClient {
  return createClient(config.url, config.serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
