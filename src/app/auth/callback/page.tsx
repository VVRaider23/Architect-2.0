'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/lib/store';
import { useServer } from '@/lib/account';
import { enterAccount } from '@/lib/enter';
import { LogoMark } from '@/components/shell';
import { Button } from '@/components/ui';

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <AuthCallback />
    </Suspense>
  );
}

/** Where people land after approving GitHub. The server has already set the session cookie. */
function AuthCallback() {
  const router = useRouter();
  const search = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { user } = await useServer.getState().refresh();
      if (cancelled) return;
      if (!user) {
        setError('Sign-in did not complete. Please try again.');
        return;
      }
      const next = search.get('next') ?? '/home';
      const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/home';
      const app = useApp.getState();
      if (search.get('connected') && app.signedIn) {
        // Linked GitHub to an account that was already signed in here: go back to where they were.
        if (app.authMode !== 'account') app.signIn('GitHub', user.email ?? undefined, 'account');
        app.toast(`GitHub connected as @${user.github?.login ?? 'you'}.`, 'ok');
        router.replace(safeNext);
        return;
      }
      await enterAccount(user, 'GitHub', router, safeNext);
      if (search.get('connected')) useApp.getState().toast(`GitHub connected as @${user.github?.login ?? 'you'}.`, 'ok');
    })();
    return () => {
      cancelled = true;
    };
  }, [router, search]);

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
