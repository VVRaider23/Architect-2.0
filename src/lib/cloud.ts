'use client';

import type { AuditEvent, Project, Workspace } from './types';
import { getSupabase } from './supabase';

/** What we keep in Supabase for a signed-in user: one row per user in `app_state` (see supabase/schema.sql). */
export interface CloudState {
  workspace: Workspace | null;
  projects: Project[];
  audit: AuditEvent[];
}

export async function currentUserEmail(): Promise<string | null> {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data.user?.email ?? null;
}

export async function loadCloudState(): Promise<CloudState | null> {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await sb.from('app_state').select('state').eq('user_id', auth.user.id).maybeSingle();
  if (error) throw error;
  return (data?.state as CloudState | undefined) ?? null;
}

let cachedUserId: string | null = null;

export async function saveCloudState(state: CloudState): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  if (!cachedUserId) {
    const { data } = await sb.auth.getUser();
    cachedUserId = data.user?.id ?? null;
  }
  if (!cachedUserId) return;
  const { error } = await sb
    .from('app_state')
    .upsert({ user_id: cachedUserId, state, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function cloudSignOut() {
  cachedUserId = null;
  const sb = await getSupabase();
  await sb?.auth.signOut();
}
