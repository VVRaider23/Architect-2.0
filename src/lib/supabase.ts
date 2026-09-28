'use client';

import type { SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Real sign-in switches on only when both public Supabase settings exist. */
export const supabaseConfigured = Boolean(url && key);

let client: Promise<SupabaseClient> | null = null;

/** The Supabase browser client, loaded on first use so demo mode never downloads it. */
export function getSupabase(): Promise<SupabaseClient | null> {
  if (!supabaseConfigured) return Promise.resolve(null);
  if (!client) client = import('@supabase/ssr').then(({ createBrowserClient }) => createBrowserClient(url!, key!));
  return client;
}
