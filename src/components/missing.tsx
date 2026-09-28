'use client';

import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/store';
import { LogoMark } from './shell';
import { Button } from './ui';

/** Shown when a link points at a project this browser doesn't have (demo data lives in the browser). */
export function MissingProject({ what = 'project' }: { what?: string }) {
  const router = useRouter();
  const quickStartDemo = useApp((s) => s.quickStartDemo);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-5 text-center">
      <LogoMark size={30} />
      <h1 className="text-[22px] font-semibold tracking-tight">This {what} isn’t in this browser</h1>
      <p className="max-w-md text-[14px] leading-relaxed text-ink2">
        In demo mode everything is saved in the browser where it was made, so a link from another browser or device won’t find it. Start a fresh demo project here instead.
      </p>
      <div className="flex gap-2">
        <Button href="/home">Back to home</Button>
        <Button
          variant="primary"
          onClick={() => {
            const id = quickStartDemo();
            router.push(`/p/${id}?tab=proof`);
          }}
        >
          Open a demo project
        </Button>
      </div>
    </main>
  );
}
