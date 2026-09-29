'use client';

import { useRouter } from '@/lib/nav';
import { useEffect, useState } from 'react';
import { ArrowRight, Check, Clock } from 'lucide-react';
import { useApp } from '@/lib/store';
import { arrivedFlags, openTasks } from '@/lib/stage';
import type { Project } from '@/lib/types';
import { cn, timeAgo } from '@/lib/utils';
import { FocusScreen, ProjectRoute, ScreenTitle } from '@/components/frame';
import { ActionButton, Avatar, Button, Tag } from '@/components/ui';

export default function LearnPage() {
  return <ProjectRoute>{(p, now) => <Learn p={p} now={now} />}</ProjectRoute>;
}

const initials = (by: string) =>
  by
    .split(',')[0]
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .replace('.', '')
    .slice(0, 2)
    .toUpperCase();

/** Screen 21 · Flags from real use. One job: turn what people flagged into tests. */
function Learn({ p, now }: { p: Project; now: number }) {
  const router = useRouter();
  const sendFlagToReview = useApp((s) => s.sendFlagToReview);
  const arriveFlagsNow = useApp((s) => s.arriveFlagsNow);
  const setViewAs = useApp((s) => s.setViewAs);
  const flags = arrivedFlags(p, now);
  const open = flags.filter((f) => f.status === 'open');
  const upcoming = p.flags.filter((f) => f.at > now);
  const [picked, setPicked] = useState<string[]>([]);
  const [sent, setSent] = useState(0);

  useEffect(() => {
    setPicked((x) => Array.from(new Set([...x.filter((id) => open.some((f) => f.id === id)), ...open.map((f) => f.id)])));
    // Only when new flags arrive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open.length]);

  const n = picked.length;
  const running = p.deployments.test.status === 'running' || p.deployments.live.status === 'running';
  const waiting = openTasks(p).filter((t) => t.kind === 'flag').length;

  return (
    <FocusScreen p={p} now={now} section="learn" wide>
      {open.length ? (
        <>
          <ScreenTitle sub="Claims handlers flagged these while using the app. Meera checks each one, and her answer becomes a test.">
            {open.length === 1 ? '1 answer was flagged' : `${open.length} answers were flagged`}
          </ScreenTitle>
          <ul className="mt-8 flex flex-col gap-2" data-tour="flag-list">
            {open.map((f) => {
              const on = picked.includes(f.id);
              return (
                <li key={f.id}>
                  <label className={cn('press flex cursor-pointer items-start gap-3.5 rounded-xl border px-4 py-3.5 transition-colors', on ? 'border-accent-line bg-accent-soft/60' : 'border-line bg-surface hover:border-line2')}>
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={on}
                      onChange={() => setPicked((x) => (on ? x.filter((y) => y !== f.id) : [...x, f.id]))}
                      aria-label={`Use the ${f.claim.title} flag`}
                    />
                    <span className={cn('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-accent', on ? 'border-accent bg-accent text-on-accent' : 'border-line2')}>
                      <Check className={cn('h-3 w-3 transition-transform duration-150', on ? 'scale-100' : 'scale-0')} strokeWidth={3.2} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-[15px] font-medium">{f.claim.title}</span> <span className="font-mono text-[12.5px] text-ink3">{f.claim.id}</span>
                      <span className="mt-0.5 block text-[14px] leading-relaxed text-ink2">
                        {f.by.split(',')[0]}: {f.note}
                      </span>
                    </span>
                    <span className="flex flex-col items-end gap-1">
                      <Avatar initials={initials(f.by)} size={28} />
                      <span className="text-[12px] text-ink3">{timeAgo(f.at, now)}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ActionButton
              key={n}
              size="xl"
              label={n === 0 ? 'Pick at least one flag' : n === 1 ? 'Turn 1 flag into a test' : `Turn ${n} flags into tests`}
              busyLabel="Sending to Meera"
              doneLabel="Sent to Meera"
              disabled={n === 0}
              tour="flags-send"
              run={() => true}
              onDone={() => {
                picked.forEach((id) => sendFlagToReview(p.id, id));
                setSent(n);
                setPicked([]);
              }}
            />
            <span className="text-[14px] text-ink3">Meera confirms the right answer first.</span>
          </div>
        </>
      ) : (
        <>
          <ScreenTitle
            sub={
              sent || waiting
                ? 'Meera is checking them now. Each answer she confirms becomes a test, so the same mistake can’t come back.'
                : running
                  ? 'When someone using the app flags an answer they think is wrong, it shows up here.'
                  : 'Once people use the app, they can flag answers they think are wrong. Those come back here and become tests.'
            }
          >
            {sent || waiting ? 'Sent to Meera' : 'No flags yet'}
          </ScreenTitle>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {(sent > 0 || waiting > 0) && (
              <Button
                variant="primary"
                size="xl"
                tour="see-as-meera"
                onClick={() => {
                  setViewAs('reviewer');
                  router.push(`/p/${p.id}/review`);
                }}
              >
                See it as Meera
              </Button>
            )}
            {upcoming.length > 0 && !sent && (
              <>
                <span className="inline-flex items-center gap-2 text-[14.5px] text-ink2">
                  <Clock className="h-4 w-4" /> The pilot group is using it now.
                </span>
                <Button size="lg" onClick={() => arriveFlagsNow(p.id)} tour="flags-now">
                  Show their flags now
                </Button>
              </>
            )}
            {!running && (
              <Button size="xl" href={`/p/${p.id}/ship`} iconRight={<ArrowRight className="h-4 w-4" />}>
                Go to Ship
              </Button>
            )}
          </div>
          {flags.length > 0 && (
            <ul className="mt-10 flex flex-col gap-2">
              {flags.map((f) => (
                <li key={f.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-[14.5px]">
                  <span className="flex-1">
                    {f.claim.title} <span className="text-ink3">· {f.by.split(',')[0]}</span>
                  </span>
                  <Tag tone={f.status === 'reviewed' ? 'ok' : 'accent'}>{f.status === 'reviewed' ? 'Now a test' : 'With Meera'}</Tag>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </FocusScreen>
  );
}
