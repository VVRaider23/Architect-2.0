'use client';

import { useMemo, useState } from 'react';
import { Check, ExternalLink, Loader2, Monitor, Palette, Play, Smartphone } from 'lucide-react';
import { useApp, STEP_MS, stepsFor } from '@/lib/store';
import { useNow } from '@/lib/hooks';
import { useUI } from '@/lib/ui';
import { buildStep } from '@/lib/stage';
import { generateFiles } from '@/lib/codegen';
import { SEED_CLAIMS } from '@/lib/seed';
import { creditsForRun, latestRun, money, triage } from '@/lib/engine';
import type { Project } from '@/lib/types';
import { ClaimsApp } from '@/components/claims-app';
import { MatchMark, RiskChip, verdictShort } from '@/components/domain';
import { Button, Empty, Toggle } from '@/components/ui';
import { cn } from '@/lib/utils';
import { APP_THEMES } from '@/lib/catalog';

export function PreviewTab({ p }: { p: Project }) {
  const testMode = useUI((s) => s.testMode);
  const setTestMode = useUI((s) => s.setTestMode);
  const openReplay = useUI((s) => s.openReplay);
  const runProof = useApp((s) => s.runProof);
  const setTheme = useApp((s) => s.setTheme);
  const viewAs = useApp((s) => s.viewAs);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');

  if (!p.planApproved) {
    return (
      <div className="p-8">
        <Empty
          title="Nothing to preview yet"
          body={viewAs === 'builder' ? 'Approve the plan and the app assembles here while it is built.' : 'The app appears here once Arjun approves the plan and builds it.'}
        />
      </div>
    );
  }
  if (p.build.status !== 'done') return <BuildView p={p} />;

  const run = latestRun(p)!;
  const items = new Map(p.answerKey.map((i) => [i.id, i]));
  const misses = run.total - run.passed;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-5 py-2.5" data-tour="test-bar">
        <div className="flex rounded-lg border border-line bg-surface2 p-0.5" role="group" aria-label="Device">
          {(
            [
              ['desktop', Monitor],
              ['mobile', Smartphone],
            ] as const
          ).map(([d, Icon]) => (
            <button
              key={d}
              onClick={() => setDevice(d)}
              aria-pressed={device === d}
              aria-label={d}
              className={cn('flex h-7 w-8 items-center justify-center rounded-md', device === d ? 'bg-surface shadow-card' : 'text-ink2')}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-[13px] font-medium">
          <Toggle checked={testMode} onChange={setTestMode} label="Test mode" />
          Test mode
        </label>
        {!testMode && viewAs === 'builder' && (
          <label className="flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface2 px-2 text-[12.5px] text-ink2">
            <Palette className="h-3.5 w-3.5" />
            Theme
            <select className="bg-transparent font-medium text-ink focus:outline-none" value={p.theme ?? 'harbor'} onChange={(e) => setTheme(p.id, e.target.value)} aria-label="App theme">
              {APP_THEMES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <span className="text-[13px] text-ink2">
          {testMode ? (
            <>
              <b className="text-ink">
                {run.passed} of {run.total}
              </b>{' '}
              answers match the Answer Key{misses ? <span className="text-bad"> · {misses} miss{misses > 1 ? 'es' : ''}</span> : ' · all match'}
            </>
          ) : (
            'The app as your users will see it, running the latest version.'
          )}
        </span>
        <div className="flex-1" />
        {viewAs === 'builder' && (
          <Button size="sm" icon={<Play className="h-3.5 w-3.5" />} onClick={() => runProof(p.id, 'Run from Preview')}>
            Run the tests again · ≈ {creditsForRun(p.answerKey.length)} credits
          </Button>
        )}
        <Button size="sm" variant="ghost" href={`/apps/${p.id}?env=preview`} target="_blank" icon={<ExternalLink className="h-3.5 w-3.5" />}>
          Open app
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-sunken p-5">
        <div className={cn('paper mx-auto overflow-hidden rounded-xl border border-line2 bg-surface text-ink shadow-pop', device === 'mobile' ? 'max-w-[400px]' : 'max-w-[1180px]')}>
          <div className="flex h-9 items-center gap-2 border-b border-line bg-surface2 px-3">
            <span className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-line2" />
              <span className="h-2.5 w-2.5 rounded-full bg-line2" />
              <span className="h-2.5 w-2.5 rounded-full bg-line2" />
            </span>
            <span className="mx-auto truncate rounded-md bg-surface px-3 py-0.5 font-mono text-[11.5px] text-ink2">{p.deployments.preview.url}</span>
          </div>
          {testMode ? (
            <div className="bg-[#F7F8FA]">
              <div className="flex items-center justify-between px-4 pb-2 pt-4">
                <div>
                  <div className="text-[15px] font-semibold text-[#1B2230]">Claims inbox · test claims</div>
                  <div className="text-[12px] text-[#5B6576]">Every example in the Answer Key, run through the agents. Click any row to replay it step by step.</div>
                </div>
              </div>
              <div className="px-4 pb-4">
                <div className="overflow-hidden rounded-lg border border-[#E3E7EE] bg-white">
                  <table className="w-full text-left text-[12.5px]">
                    <thead className="bg-[#F7F9FC] text-[11.5px] text-[#5B6576]">
                      <tr>
                        <th className="px-3.5 py-2 font-medium">Claim</th>
                        {device === 'desktop' && <th className="px-3.5 py-2 font-medium">Customer</th>}
                        <th className="px-3.5 py-2 font-medium">Amount</th>
                        <th className="px-3.5 py-2 font-medium">Agent’s verdict</th>
                        <th className="px-3.5 py-2 font-medium">Test</th>
                      </tr>
                    </thead>
                    <tbody>
                      {run.results.map((r) => {
                        const it = items.get(r.itemId);
                        if (!it) return null;
                        return (
                          <tr
                            key={r.itemId}
                            onClick={() => openReplay(r.itemId, run.id)}
                            className={cn('cursor-pointer border-t border-[#EEF1F5] hover:bg-[#F7F9FC]', !r.pass && 'bg-bad-soft/40')}
                          >
                            <td className="px-3.5 py-2.5">
                              <span className="font-mono text-[11px] text-[#7A8494]">{it.claim.id}</span> <span className="font-medium">{it.claim.title}</span>
                            </td>
                            {device === 'desktop' && <td className="px-3.5 py-2.5 text-[#3B4454]">{it.claim.customer}</td>}
                            <td className="px-3.5 py-2.5 font-mono">{money(it.claim.amount)}</td>
                            <td className="px-3.5 py-2.5">{device === 'desktop' ? verdictShort(r.verdict) : <RiskChip risk={r.verdict.risk} />}</td>
                            <td className="px-3.5 py-2.5">
                              <MatchMark pass={r.pass} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[640px]">
              <ClaimsApp p={p} env="preview" version={p.version} embedded device={device} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const STEP_FILES = ['agent.yaml', 'web/lib/claims.ts', 'web/app/page.tsx', '__framework__', 'claims_agents/risk_rules.py', 'claims_agents/privacy.py', 'tests/test_answer_key.py', '.github/workflows/proof.yml'];

export function BuildView({ p }: { p: Project }) {
  const now = useNow(250);
  const skipBuild = useApp((s) => s.skipBuild);
  const BUILD_STEPS = stepsFor(p);
  const step = buildStep(p, now);
  const files = useMemo(() => generateFiles(p, 1), [p]);
  const fwFile = Object.keys(files).find((f) => /claims_agents\/(graph|crew|team|agent|tools)\.py$/.test(f)) ?? 'claims_agents/graph.py';
  const current = Math.min(step, BUILD_STEPS.length - 1);
  const path = STEP_FILES[current] === '__framework__' ? fwFile : STEP_FILES[current];
  const text = files[path] ?? '';
  const lines = text.split('\n');
  const stepStart = (p.build.startedAt ?? now) + current * STEP_MS;
  const shown = Math.max(1, Math.min(lines.length, Math.floor(((now - stepStart) / (STEP_MS * 0.85)) * lines.length)));
  const fileCount = Math.round((Object.keys(files).length * Math.min(step + 1, BUILD_STEPS.length)) / BUILD_STEPS.length);
  const claims = SEED_CLAIMS.slice(0, 6).map((s) => s.claim);

  return (
    <div className="grid h-full min-h-0 gap-5 overflow-auto bg-sunken p-5 xl:grid-cols-[300px_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
          <div className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink3">Build steps</div>
          <ol className="mt-3 grid gap-2.5">
            {BUILD_STEPS.map((s, i) => (
              <li key={s} className="flex items-start gap-2.5 text-[13px]">
                <span
                  className={cn(
                    'mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border',
                    i < step ? 'border-ok bg-ok text-on-ok' : i === step ? 'border-accent text-accent' : 'border-line2 text-transparent',
                  )}
                >
                  {i < step ? <Check className="h-3 w-3" strokeWidth={3} /> : i === step ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                </span>
                <span className={cn(i < step ? 'text-ink' : i === step ? 'font-semibold text-accent-ink' : 'text-ink3')}>
                  {s === 'Commit to GitHub' ? `Commit to GitHub: ${p.repo}` : s === 'Open a pull request' ? `Open a pull request on ${p.repo}` : s}
                  {i === step && ' …'}
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-4 border-t border-line pt-3 text-[12.5px] text-ink2">
            Cost so far: <b className="text-ink">{Math.round((step / BUILD_STEPS.length) * 140)}</b> of ≈ 140 credits
          </div>
          <button onClick={() => skipBuild(p.id)} className="mt-2 text-[12.5px] font-medium text-accent hover:underline">
            Skip to the finished build →
          </button>
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-5">
        <div className="paper overflow-hidden rounded-xl border border-line2 bg-surface text-ink shadow-card">
          <div className="flex h-9 items-center justify-between border-b border-line bg-surface2 px-3 text-[12px]">
            <span className="font-semibold">Harborline Claims</span>
            <span className="text-ink2">preview · assembling as it’s built</span>
          </div>
          <div className="bg-[#F7F8FA] p-4">
            {step < 2 ? (
              <div className="grid gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="hatch h-9 rounded-md" />
                ))}
              </div>
            ) : (
              <table className="w-full overflow-hidden rounded-lg border border-[#E3E7EE] bg-white text-left text-[12.5px]">
                <thead className="bg-[#F7F9FC] text-[11.5px] text-[#5B6576]">
                  <tr>
                    <th className="px-3 py-2 font-medium">Claim</th>
                    <th className="px-3 py-2 font-medium">Customer</th>
                    <th className="px-3 py-2 font-medium">Amount</th>
                    <th className="px-3 py-2 font-medium">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.map((c) => (
                    <tr key={c.id} className="border-t border-[#EEF1F5] animate-fade-in">
                      <td className="px-3 py-2">
                        <span className="font-mono text-[11px] text-[#7A8494]">{c.id}</span> {c.title}
                      </td>
                      <td className="px-3 py-2">{c.customer}</td>
                      <td className="px-3 py-2 font-mono">{money(c.amount)}</td>
                      <td className="px-3 py-2">
                        {step >= 5 ? <RiskChip risk={triage(c, 1).verdict.risk} /> : <span className="text-[11.5px] text-ink3">appears when the Risk scorer is ready</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-code-line bg-code shadow-card">
          <div className="flex h-9 items-center gap-2 border-b border-code-line px-3 font-mono text-[11.5px] text-code-dim">
            <span className="text-code-ink">{path}</span>
            <span className="animate-pulse2">writing…</span>
            <span className="ml-auto">{fileCount} files so far</span>
          </div>
          <pre className="code-scroll max-h-[300px] overflow-auto px-4 py-3 font-mono text-[12px] leading-[1.6] text-code-ink">
            {lines.slice(0, shown).join('\n')}
            <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 bg-code-ink animate-caret" />
          </pre>
        </div>
        <p className="text-[12.5px] text-ink2">
          Every file lands in <span className="font-mono">{p.repo}</span> on GitHub, in the framework you picked.
        </p>
      </div>
    </div>
  );
}
