'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useProject } from '@/lib/store';
import { useHydrated } from '@/lib/hooks';
import type { Env } from '@/lib/types';
import { ClaimsApp } from '@/components/claims-app';
import { LogoMark } from '@/components/shell';
import { MissingProject } from '@/components/missing';
import { Button } from '@/components/ui';

/** The app Architect built, as its users see it at preview-/test-/live- web addresses. */
export default function AppPage() {
  return (
    <Suspense>
      <DeployedApp />
    </Suspense>
  );
}

function DeployedApp() {
  const ready = useHydrated();
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const env = (['preview', 'test', 'live'].includes(search.get('env') ?? '') ? search.get('env') : 'preview') as Env;
  const p = useProject(id);
  if (!ready) return <div className="min-h-screen bg-[#F7F8FA]" />;
  if (!p) return <MissingProject what="app" />;
  const d = p.deployments[env];
  const version = env === 'preview' ? p.version : d.version;

  return (
    <div className="flex h-screen flex-col">
      <div className="flex h-9 shrink-0 items-center gap-2.5 bg-bg px-4 text-[12px] text-ink2">
        <LogoMark size={18} />
        <span className="hidden sm:inline">Built with Architect</span>
        <span className="truncate font-mono text-[11.5px] text-ink">https://{d.url}</span>
        <div className="flex-1" />
        <Link href={`/p/${p.id}?tab=${env === 'preview' ? 'preview' : env === 'live' ? 'live' : 'ship'}`} className="inline-flex items-center gap-1 whitespace-nowrap text-ink hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Architect
        </Link>
      </div>
      {version ? (
        <div className="min-h-0 flex-1">
          <ClaimsApp p={p} env={env} version={version} embedded />
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-[#F7F8FA] px-5 text-center">
          <h1 className="text-[20px] font-semibold">Nothing is deployed to {env === 'live' ? 'Live' : 'Test'} yet</h1>
          <p className="max-w-md text-[14px] text-ink2">Request sign-off in Architect. Once it is approved, deploy it from Ship and the app appears at this address.</p>
          <Button href={`/p/${p.id}?tab=ship`} variant="primary">
            Open Ship in Architect
          </Button>
        </div>
      )}
    </div>
  );
}
