'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { pendingRequest } from '@/lib/stage';
import type { Project } from '@/lib/types';
import { PaperScreen, ProjectRoute } from '@/components/frame';
import { Button } from '@/components/ui';

export default function RequestsIndex() {
  return <ProjectRoute>{(p) => <Requests p={p} />}</ProjectRoute>;
}

/** Farah's landing for a project: the request waiting for her, or a calm "nothing yet". */
function Requests({ p }: { p: Project }) {
  const router = useRouter();
  const r = pendingRequest(p) ?? [...p.requests].reverse()[0];
  useEffect(() => {
    if (r) router.replace(`/p/${p.id}/requests/${r.id}`);
  }, [r, p.id, router]);
  if (r) return null;
  return (
    <PaperScreen p={p} title="sign-off">
      <h1 className="text-[30px] font-semibold tracking-[-0.02em]">Nothing to decide yet</h1>
      <p className="mt-3 text-[16px] leading-relaxed text-ink2">
        When Arjun asks to launch {p.name}, you get one page here: what the tests show, what Meera checked, and what data it touches. You decide in one click.
      </p>
      <div className="mt-8">
        <Button href="/settings">See your launch rules</Button>
      </div>
    </PaperScreen>
  );
}
