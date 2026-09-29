'use client';

import { Plus } from 'lucide-react';
import { useApp } from '@/lib/store';
import { AppShell, RequireAuth } from '@/components/shell';
import { Button, Empty } from '@/components/ui';
import { ProjectRow } from '@/components/project-row';
import { ShellSkeleton } from '@/components/skeletons';

export default function ProjectsPage() {
  return (
    <RequireAuth fallback={<ShellSkeleton page="list" />}>
      <AppShell>
        <Projects />
      </AppShell>
    </RequireAuth>
  );
}

/** Every project in one list, newest first. */
function Projects() {
  const projects = useApp((s) => s.projects);
  return (
    <div className="mx-auto w-full max-w-[720px] px-4 pb-24 pt-10 sm:px-6">
      <div className="flex items-center justify-between gap-4 animate-screen-in">
        <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Projects</h1>
        <Button variant="primary" href="/home" icon={<Plus className="h-4 w-4" />}>
          New app
        </Button>
      </div>
      <div className="mt-6 flex flex-col gap-2 animate-fade-in">
        {projects.length ? (
          projects.map((p) => <ProjectRow key={p.id} p={p} />)
        ) : (
          <Empty title="No projects yet" body="Describe an app on Home, or import a repo from GitHub." action={<Button href="/home">Start an app</Button>} />
        )}
      </div>
    </div>
  );
}
