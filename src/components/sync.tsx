'use client';

import { useEffect } from 'react';
import { useApp } from '@/lib/store';
import { supabaseConfigured } from '@/lib/supabase';
import { saveCloudState } from '@/lib/cloud';

const KEY = 'architect2-demo-v1';

/**
 * Keeps state in step across tabs (open Meera's view in a second tab and both stay current),
 * and, when real sign-in is on, saves each change to the user's row in Supabase.
 */
export function SyncState() {
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) void useApp.persist.rehydrate();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const authMode = useApp((s) => s.authMode);
  const signedIn = useApp((s) => s.signedIn);

  useEffect(() => {
    if (!supabaseConfigured || authMode !== 'supabase' || !signedIn) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let last = '';
    const unsub = useApp.subscribe((s) => {
      const payload = JSON.stringify({ workspace: s.workspace, projects: s.projects, audit: s.audit });
      if (payload === last) return;
      last = payload;
      clearTimeout(timer);
      timer = setTimeout(() => {
        saveCloudState(JSON.parse(payload)).catch((err) => console.warn('Could not save to Supabase', err));
      }, 1200);
    });
    return () => {
      unsub();
      clearTimeout(timer);
    };
  }, [authMode, signedIn]);

  return null;
}
