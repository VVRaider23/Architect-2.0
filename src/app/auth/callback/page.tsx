'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/store';
import { getSupabase } from '@/lib/supabase';
import { loadCloudState } from '@/lib/cloud';
import { LogoMark } from '@/components/shell';
import { Button } from '@/components/ui';

/** Where Supabase sends people back after GitHub, Google or an email link. */
export default function AuthCallback() {
  const router = useRouter();
  const signIn = useApp((s) => s.signIn);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sb = await getSupabase();
      if (!sb) {
        router.replace('/');
        return;
      }
      const url = new URL(window.location.href);
      const desc = url.searchParams.get('error_description');
      if (desc) {
        setError(desc);
        return;
      }
      let session = (await sb.auth.getSession()).data.session;
      const code = url.searchParams.get('code');
      if (!session && code) {
        const { data, error: err } = await sb.auth.exchangeCodeForSession(code);
        if (err) {
          setError(err.message);
          return;
        }
        session = data.session;
      }
      if (!session) {
        setError('This sign-in link has expired or was already used. Please sign in again.');
        return;
      }
      try {
        const remote = await loadCloudState();
        if (remote) useApp.setState({ workspace: remote.workspace, projects: remote.projects ?? [], audit: remote.audit ?? [] });
      } catch (err) {
        console.warn('Could not load saved state from Supabase', err);
      }
      if (cancelled) return;
      const provider = session.user.app_metadata?.provider;
      signIn(provider === 'github' ? 'GitHub' : provider === 'google' ? 'Google' : 'email', session.user.email ?? undefined, 'supabase');
      router.replace(useApp.getState().workspace ? '/home' : '/setup');
    })();
    return () => {
      cancelled = true;
    };
  }, [router, signIn]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-5 text-center">
      <LogoMark size={30} />
      {error ? (
        <>
          <p className="max-w-sm text-[14px] text-bad">{error}</p>
          <Button href="/" variant="primary">
            Back to sign in
          </Button>
        </>
      ) : (
        <p className="text-[14px] text-ink2">Signing you in…</p>
      )}
    </main>
  );
}
