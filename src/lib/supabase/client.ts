import { createBrowserClient } from '@supabase/ssr';
import { DEMO, SUPABASE_KEY, SUPABASE_URL } from './env';

/** Demo mode: auth always succeeds and realtime is a no-op. */
function createDemoBrowserClient() {
  const ok = async () => ({ data: { user: { id: 'demo-alex' }, session: {} }, error: null });
  const channel = { on: () => channel, subscribe: () => channel };
  return {
    auth: { signInWithPassword: ok, signUp: ok, signInWithOtp: ok, updateUser: ok },
    channel: () => channel,
    removeChannel: async () => 'ok',
  } as unknown as ReturnType<typeof createBrowserClient>;
}

export function createClient() {
  if (DEMO) return createDemoBrowserClient();
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
}
