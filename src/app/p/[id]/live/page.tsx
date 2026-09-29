'use client';

import { useRef, useState } from 'react';
import { ArrowRight, ExternalLink, Terminal } from 'lucide-react';
import { useApp } from '@/lib/store';
import { useDevTools } from '@/lib/hooks';
import { latestRun } from '@/lib/engine';
import { approvedFor, pendingRequest } from '@/lib/stage';
import type { Project } from '@/lib/types';
import { dateLabel } from '@/lib/utils';
import { FocusScreen, ProjectRoute, ScreenTitle } from '@/components/frame';
import { Avatar, Button, HoldButton } from '@/components/ui';

export default function LivePage() {
  return <ProjectRoute>{(p, now) => <Live p={p} now={now} />}</ProjectRoute>;
}

/** Screen 19 · Go live. One job: make it available to everyone, on purpose. Press and hold, so it never happens by accident. */
function Live({ p, now }: { p: Project; now: number }) {
  const dev = useDevTools();
  const deploy = useApp((s) => s.deploy);
  const liveOk = approvedFor(p, 'live');
  const pending = pendingRequest(p);
  const run = latestRun(p);
  const live = p.deployments.live;
  const wasLive = useRef(live.status === 'running' && live.version === p.version);
  const [done, setDone] = useState(false);
  const isLive = live.status === 'running' && live.version === p.version;

  if (!liveOk && !isLive)
    return (
      <FocusScreen p={p} now={now} section="ship">
        <ScreenTitle sub="Going live puts the app in front of everyone at Harborline, so Farah approves it first. It usually follows a Test pilot.">Live needs Farah’s approval</ScreenTitle>
        <div className="mt-8">
          {pending ? (
            <Button size="xl" disabled>
              Waiting for Farah
            </Button>
          ) : (
            <Button variant="primary" size="xl" href={`/p/${p.id}/signoff?env=live`} iconRight={<ArrowRight className="h-4 w-4" />}>
              Ask Farah to approve Live
            </Button>
          )}
        </div>
      </FocusScreen>
    );

  const finished = done || (isLive && wasLive.current);
  return (
    <FocusScreen p={p} now={now} section="ship">
      <ScreenTitle>{finished ? 'Live for everyone' : 'Go live for everyone'}</ScreenTitle>
      {liveOk && (
        <div className="mt-4 flex items-center gap-2.5 text-[15px] text-ink2">
          <Avatar initials="FS" size={28} tone="warn" />
          <span>
            Farah approved Live on {dateLabel(liveOk.decision?.at ?? liveOk.at)}.{run ? ` ${run.passed} of ${run.total} answers match.` : ''}
          </span>
        </div>
      )}
      <div className="mt-10" data-tour="hold-live">
        {finished && wasLive.current ? (
          <div className="flex h-[60px] items-center justify-center rounded-[14px] bg-ok text-[16px] font-semibold text-on-ok">Live for everyone</div>
        ) : (
          <HoldButton
            label="Hold to go live"
            doneLabel="Live for everyone"
            ms={1200}
            tour="hold-button"
            onComplete={() => {
              deploy(p.id, 'live');
              setDone(true);
            }}
          />
        )}
      </div>
      <p className="mt-4 text-center text-[14px] text-ink3" aria-live="polite">
        {finished ? `${live.url || 'The app'} is live. You can roll back from Ship at any time.` : `Everyone at Harborline will be able to use v${p.version}. Let go early to cancel.`}
      </p>
      {finished && (
        <div className="mt-10 flex flex-wrap justify-center gap-3 animate-slide-up">
          <Button variant="primary" size="lg" href={`/apps/${p.id}?env=live`} target="_blank" icon={<ExternalLink className="h-4 w-4" />}>
            Open the live app
          </Button>
          {dev && (
            <Button size="lg" href={`/p/${p.id}/api`} icon={<Terminal className="h-4 w-4" />}>
              Use it from your code
            </Button>
          )}
        </div>
      )}
    </FocusScreen>
  );
}
