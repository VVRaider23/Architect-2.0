'use client';

import Link from 'next/link';
import { ArrowRight, Bell, CheckCircle2, ExternalLink, Lightbulb } from 'lucide-react';
import { useApp } from '@/lib/store';
import { useNow } from '@/lib/hooks';
import { KIND_LABEL, money } from '@/lib/engine';
import { arrivedFlags } from '@/lib/stage';
import type { Project } from '@/lib/types';
import { EnvPill, verdictShort } from '@/components/domain';
import { Button, Card, Chip, Empty, Stat } from '@/components/ui';
import { timeAgo } from '@/lib/utils';

export function LiveTab({ p }: { p: Project }) {
  const now = useNow(1000);
  const viewAs = useApp((s) => s.viewAs);
  const sendFlagToReview = useApp((s) => s.sendFlagToReview);
  const credits = useApp((s) => s.workspace?.credits ?? 0);
  const live = p.deployments.live;
  const test = p.deployments.test;
  const d = live.status === 'running' ? live : test.status === 'running' ? test : null;

  if (!d) {
    return (
      <div className="p-8">
        <Empty
          title="Nothing is running yet"
          body="Deploy to Test or Live and real usage shows up here: answers, flags from the people using the app, and cost. Flagged answers go to your expert and become tests."
        />
      </div>
    );
  }

  const minutes = Math.max(0, (now - (d.at ?? now)) / 60000);
  const base = d.env === 'live' ? 1180 : 240;
  const answers = Math.round(base + Math.min(400, minutes * 14));
  const flags = arrivedFlags(p, now).sort((a, b) => b.at - a.at);
  const open = flags.filter((f) => f.status === 'open');
  const water = open.filter((f) => f.claim.kind === 'water_damage');
  const waiting = p.flags.length > flags.length;
  const spent = 1240 - credits;

  return (
    <div className="grid gap-5 p-5">
      <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink2">
        <EnvPill env={d.env} version={d.version} />
        <span>
          Running for {d.audience ?? 'the pilot group'} since {timeAgo(d.at ?? now, now)}
        </span>
        <Link href={`/apps/${p.id}?env=${d.env}`} target="_blank" className="ml-auto inline-flex items-center gap-1 font-medium text-accent hover:underline">
          Open the {d.env === 'live' ? 'live' : 'pilot'} app <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Answers this week" value={answers.toLocaleString('en-US')} sub="across 5 agents" />
        <Stat label="Match with Meera’s spot checks" value="96%" sub="24 of 25 sampled answers" tone="ok" />
        <Stat label="Flagged by users" value={flags.length} sub={open.length ? `${open.length} not yet reviewed` : flags.length ? 'all handled' : 'none yet'} tone={open.length ? 'bad' : undefined} />
        <Stat label="Credits this month" value={(412 + Math.max(0, spent - 160)).toLocaleString('en-US')} sub="of a 600 budget" />
      </div>

      {water.length > 0 && viewAs === 'builder' && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-accent-line bg-accent-soft px-4 py-3">
          <Lightbulb className="h-5 w-5 shrink-0 text-accent" />
          <div className="min-w-0 flex-1 text-[13.5px] text-accent-ink">
            <b>Risk scorer:</b> {water.length} flag{water.length > 1 ? 's' : ''} on water damage just under $10,000. Worth a new rule? Send {water.length > 1 ? 'them' : 'it'} to Meera: her answer becomes a test.
          </div>
          <Button size="sm" variant="primary" onClick={() => water.forEach((f) => sendFlagToReview(p.id, f.id))}>
            Send {water.length > 1 ? `all ${water.length}` : 'it'} to Meera
          </Button>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card pad={false}>
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="text-[14px] font-semibold">Flagged answers</span>
            {waiting && (
              <span className="flex items-center gap-1.5 text-[12px] text-ink2">
                <span className="h-2 w-2 rounded-full bg-ok animate-pulse2" /> watching live answers
              </span>
            )}
          </div>
          {flags.length ? (
            <ul>
              {flags.map((f) => (
                <li key={f.id} className="flex flex-wrap items-start gap-3 border-b border-line px-4 py-3 last:border-0 animate-slide-up">
                  <Bell className="mt-0.5 h-4 w-4 shrink-0 text-bad" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-semibold">
                      <span className="font-mono text-[12px] text-ink3">{f.claim.id}</span> {f.claim.title}
                    </div>
                    <div className="text-[12.5px] text-ink2">
                      {KIND_LABEL[f.claim.kind]}, {money(f.claim.amount)}, marked <b>{verdictShort(f.verdict)}</b>
                    </div>
                    <div className="mt-1 text-[12.5px]">
                      “{f.note}” <span className="text-ink2">· {f.by} · {timeAgo(f.at, now)}</span>
                    </div>
                  </div>
                  {f.status === 'open' ? (
                    viewAs === 'builder' ? (
                      <Button size="sm" onClick={() => sendFlagToReview(p.id, f.id)} icon={<ArrowRight className="h-3.5 w-3.5" />}>
                        Send to Meera’s queue
                      </Button>
                    ) : (
                      <Chip tone="warn">Open</Chip>
                    )
                  ) : f.status === 'sent' ? (
                    <Chip tone="accent">In Meera’s queue</Chip>
                  ) : (
                    <Chip tone="ok" icon={<CheckCircle2 className="h-3 w-3" />}>
                      Reviewed · now a test
                    </Chip>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-8 text-center text-[13px] text-ink2">
              No flags yet. When someone using the app flags an answer, it lands here.
              <div className="mt-1">
                <Link href={`/apps/${p.id}?env=${d.env}`} target="_blank" className="font-medium text-accent hover:underline">
                  Open the app and try flagging one yourself
                </Link>
              </div>
            </div>
          )}
        </Card>

        <Card pad={false}>
          <div className="border-b border-line px-4 py-3 text-[14px] font-semibold">Agents · last 7 days</div>
          <table className="w-full text-left text-[13px]">
            <thead className="text-[12px] text-ink2">
              <tr className="border-b border-line">
                <th className="px-4 py-2 font-medium">Agent</th>
                <th className="px-4 py-2 font-medium">Answers</th>
                <th className="px-4 py-2 font-medium">Flagged</th>
                <th className="px-4 py-2 font-medium">Avg time</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Intake reader', answers, 0, '1.1s'],
                ['Policy checker', answers, 0, '1.8s'],
                ['Risk scorer', answers, flags.filter((f) => f.claim.kind === 'water_damage').length, '0.6s'],
                ['Reply drafter', Math.round(answers * 0.93), flags.filter((f) => f.claim.kind !== 'water_damage').length, '2.4s'],
              ].map(([name, n, fl, t]) => (
                <tr key={name as string} className="border-b border-line last:border-0">
                  <td className="px-4 py-2.5 font-medium">{name}</td>
                  <td className="px-4 py-2.5 font-mono">{(n as number).toLocaleString('en-US')}</td>
                  <td className="px-4 py-2.5">{fl ? <Chip tone="bad">{fl as number}</Chip> : <span className="text-ink3">0</span>}</td>
                  <td className="px-4 py-2.5 font-mono text-ink2">{t}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-line px-4 py-2.5 text-[11.5px] text-ink3">Traffic counts are simulated in this prototype. Flags, reviews and tests are real.</p>
        </Card>
      </div>
    </div>
  );
}
