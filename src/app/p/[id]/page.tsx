'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useProject } from '@/lib/store';
import type { Tab } from '@/lib/types';
import { RequireAuth } from '@/components/shell';
import { MissingProject } from '@/components/missing';
import { ProjectWorkspace } from '@/components/project/workspace';

export default function ProjectPage() {
  return (
    <RequireAuth>
      <Suspense>
        <Project />
      </Suspense>
    </RequireAuth>
  );
}

function Project() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const p = useProject(id);
  if (!p) return <MissingProject />;
  return <ProjectWorkspace p={p} initialTab={(search.get('tab') as Tab | null) ?? undefined} />;
}
