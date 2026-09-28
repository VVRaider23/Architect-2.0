'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/store';
import { useHydrated } from '@/lib/hooks';
import { LogoMark } from '@/components/shell';

/** A no-sign-in way in: opens a finished example project straight away. */
export default function DemoPage() {
  const ready = useHydrated();
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (!ready || started.current) return;
    started.current = true;
    const app = useApp.getState();
    if (!app.signedIn) app.signIn('the demo link', undefined, 'demo');
    if (!useApp.getState().workspace) useApp.getState().setupWorkspace({ name: 'Harborline Insurance', domainJoin: true, runsOn: 'lyzr' });
    const id = useApp.getState().quickStartDemo();
    router.replace(`/p/${id}?tab=preview`);
  }, [ready, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 text-[14px] text-ink2">
      <LogoMark size={28} />
      Opening the example project…
    </main>
  );
}
