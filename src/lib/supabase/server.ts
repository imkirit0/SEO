import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createDemoClient } from '@/lib/demo/db';
import { DEMO, SUPABASE_KEY, SUPABASE_URL } from './env';

async function createSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component — the proxy refreshes the session instead.
        }
      },
    },
  });
}

export async function createClient() {
  if (DEMO) return createDemoClient() as unknown as Awaited<ReturnType<typeof createSupabaseClient>>;
  return createSupabaseClient();
}
