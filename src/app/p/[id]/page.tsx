'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { useApp } from '@/lib/store';
import { useHydrated } from '@/lib/hooks';
import { screenFor } from '@/lib/routes';
import { Loading } from '@/components/shell';
import { MissingProject } from '@/components/missing';

/** Old links used ?tab=…; each tab now has its own screen. */
const LEGACY: Record<string, string> = {
  plan: 'plan',
  preview: 'app',
  agents: 'agents',
  code: 'code',
  proof: 'prove',
  signoff: 'signoff',
  launch: 'signoff',
  ship: 'ship',
  live: 'learn',
};

export default function ProjectIndex() {
  return (
    <Suspense fallback={<Loading />}>
      <Redirect />
    </Suspense>
  );
}

function Redirect() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const ready = useHydrated();
  const router = useRouter();
  const signedIn = useApp((s) => s.signedIn);
  const viewAs = useApp((s) => s.viewAs);
  const p = useApp((s) => s.projects.find((x) => x.id === id));

  useEffect(() => {
    if (!ready) return;
    if (!signedIn) return router.replace('/signin');
    if (!p) return;
    const tab = search.get('tab');
    router.replace(tab && LEGACY[tab] && viewAs === 'builder' ? `/p/${p.id}/${LEGACY[tab]}` : screenFor(p, viewAs));
  }, [ready, signedIn, p, viewAs, search, router]);

  if (ready && signedIn && !p) return <MissingProject />;
  return <Loading />;
}
