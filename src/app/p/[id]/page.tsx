'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useRouter } from '@/lib/nav';
import { Suspense, useEffect } from 'react';
import { useApp } from '@/lib/store';
import { useHydrated } from '@/lib/hooks';
import { screenFor } from '@/lib/routes';
import { RouteSkeleton } from '@/components/skeletons';
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
    <Suspense fallback={<RouteSkeleton />}>
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

  const tab = search.get('tab');
  const target = ready && signedIn && p ? (tab && LEGACY[tab] && viewAs === 'builder' ? `/p/${p.id}/${LEGACY[tab]}` : screenFor(p, viewAs)) : null;

  useEffect(() => {
    if (!ready) return;
    if (!signedIn) return router.replace('/signin');
    if (target) router.replace(target);
  }, [ready, signedIn, target, router]);

  if (ready && signedIn && !p) return <MissingProject />;
  // Show the shape of the screen we're about to open, so the move looks like one step.
  return <RouteSkeleton path={target} />;
}
