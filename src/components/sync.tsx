'use client';

import { useEffect } from 'react';
import { useApp, type AppState } from '@/lib/store';
import { loadRemoteState, saveRemoteState, useServer, type SavedState } from '@/lib/account';

const KEY = 'architect2-demo-v1';
const pick = (s: AppState): SavedState => ({ workspace: s.workspace, projects: s.projects, audit: s.audit });

/**
 * Keeps state in step across browser tabs, learns which real features the server has, and, for
 * real accounts, loads the saved copy once and saves every change to the database.
 */
export function SyncState() {
  const authMode = useApp((s) => s.authMode);
  const signedIn = useApp((s) => s.signedIn);

  useEffect(() => {
    void useServer.getState().refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) void useApp.persist.rehydrate();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (authMode !== 'account' || !signedIn) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let last = '';
    let unsub = () => {};
    const { setSave } = useServer.getState();

    const save = (payload: string) => {
      setSave('saving');
      clearTimeout(timer);
      timer = setTimeout(() => {
        saveRemoteState(JSON.parse(payload))
          .then(() => setSave('saved'))
          .catch(() => setSave('error'));
      }, 1200);
    };
    const flush = () => {
      if (document.visibilityState !== 'hidden' || !last) return;
      navigator.sendBeacon?.('/api/state', new Blob([JSON.stringify({ state: JSON.parse(last) })], { type: 'application/json' }));
    };

    (async () => {
      const { user } = await useServer.getState().refresh();
      if (cancelled) return;
      if (!user) {
        useApp.getState().resetDemo();
        useApp.getState().toast('Your session ended. Please sign in again.');
        return;
      }
      const remote = await loadRemoteState().catch(() => null);
      if (cancelled) return;
      const hasRemote = !!remote && (!!remote.workspace || (remote.projects?.length ?? 0) > 0);
      if (hasRemote) useApp.setState({ workspace: remote!.workspace, projects: remote!.projects ?? [], audit: remote!.audit ?? [] });
      last = JSON.stringify(pick(useApp.getState()));
      if (!hasRemote && (useApp.getState().workspace || useApp.getState().projects.length)) save(last);
      unsub = useApp.subscribe((s) => {
        if (!s.signedIn || s.authMode !== 'account') return;
        const payload = JSON.stringify(pick(s));
        if (payload === last) return;
        last = payload;
        save(payload);
      });
      document.addEventListener('visibilitychange', flush);
    })();

    return () => {
      cancelled = true;
      unsub();
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', flush);
    };
  }, [authMode, signedIn]);

  return null;
}
