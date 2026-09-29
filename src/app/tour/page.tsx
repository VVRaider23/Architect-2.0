'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from '@/lib/nav';
import { useApp, DEMO_PROMPT } from '@/lib/store';
import { useHydrated } from '@/lib/hooks';
import { LogoMark } from '@/components/shell';
import { useTour } from '@/components/tour';

/** The 3-minute guided tour: no sign-in needed. Starts a fresh example project and walks through the whole loop. */
export default function TourPage() {
  const ready = useHydrated();
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (!ready || started.current) return;
    started.current = true;
    const app = useApp.getState();
    if (!app.signedIn) app.signIn('the guided tour', undefined, 'demo');
    if (!useApp.getState().workspace) useApp.getState().setupWorkspace({ name: 'Harborline Insurance', domainJoin: true, runsOn: 'lyzr' });
    useApp.getState().setViewAs('builder');
    const id = useApp.getState().createProject(DEMO_PROMPT);
    useTour.getState().start(id);
    router.replace(`/p/${id}/questions`);
  }, [ready, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 text-[14px] text-ink2">
      <LogoMark size={28} />
      Setting up the guided tour…
    </main>
  );
}
