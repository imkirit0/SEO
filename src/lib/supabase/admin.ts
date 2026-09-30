import { createClient } from '@supabase/supabase-js';
import { DEMO, SUPABASE_URL } from './env';

/** Service-role client for privileged auth operations. Server-only; null when not configured. */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || DEMO) return null;
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
