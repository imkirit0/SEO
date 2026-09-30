export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SUPABASE_KEY = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!;

/** No Supabase project configured: run on in-memory sample data instead. */
export const DEMO = !SUPABASE_URL || !SUPABASE_KEY || SUPABASE_URL.includes('your-project');
