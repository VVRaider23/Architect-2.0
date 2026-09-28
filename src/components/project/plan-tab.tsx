'use client';

import { AlertTriangle, Check, FileText } from 'lucide-react';
import { useApp } from '@/lib/store';
import { FRAMEWORKS, frameworkLabel } from '@/lib/seed';
import { creditsForRun } from '@/lib/engine';
import type { FrameworkId, Project } from '@/lib/types';
import { Button, Chip } from '@/components/ui';
import { cn } from '@/lib/utils';

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink3">{children}</div>
);

export function PlanTab({ p }: { p: Project }) {
  const approvePlan = useApp((s) => s.approvePlan);
  const setFramework = useApp((s) => s.setFramework);
  const applyChange = useApp((s) => s.applyChange);
  const credits = useApp((s) => s.workspace?.credits ?? 0);
  const viewAs = useApp((s) => s.viewAs);
  const sendChat = useApp((s) => s.sendChat);
  const plan = p.plan;
  const built = p.build.status === 'done';
  const building = p.build.status === 'building';

  if (!plan) {
    return (
      <div className="mx-auto max-w-[820px] px-6 py-8">
        <div className="rounded-2xl border border-dashed border-line2 bg-surface2 p-8">
          <div className="flex items-center gap-2.5">
            <FileText className="h-5 w-5 text-ink3" />
            <div>
              <div className="text-[16px] font-semibold">Your one-page plan will appear here</div>
              <div className="text-[13.5px] text-ink2">Written from your answers. You approve it before anything is built.</div>
            </div>
          </div>
          <div className="mt-6 grid gap-2.5">
            {['Who uses it', 'Screens', 'Agents and what each one does', 'Connections', 'Rules and guardrails', 'What a right answer looks like · starts the Answer Key', 'Framework', 'Estimated cost'].map((s) => (
              <div key={s} className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3">
                <span className="text-[13px] text-ink2">{s}</span>
                <span className="hatch h-2.5 flex-1 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const pickFramework = (fw: FrameworkId) => {
    if (viewAs !== 'builder' || fw === p.framework || building) return;
    if (!p.planApproved) setFramework(p.id, fw);
    else if (built && confirm(`Switch the agents to ${frameworkLabel(fw)}? Architect regenerates the agent code from agent.yaml and reruns every test.`))
      applyChange(p.id, 'framework', fw);
  };

  return (
    <div className="mx-auto max-w-[860px] px-6 py-8">
      <article className="rounded-2xl border border-line bg-surface shadow-card">
        <header className="flex flex-wrap items-start gap-3 border-b border-line px-7 py-5">
          <div className="flex-1">
            <h2 className="text-[20px] font-semibold tracking-tight">{plan.title}</h2>
            <p className="mt-0.5 text-[13px] text-ink2">Written from your answers. Nothing is built until you approve it.</p>
          </div>
          {p.planApproved ? <Chip tone="ok" icon={<Check className="h-3 w-3" />}>Approved</Chip> : <Chip tone="accent">Draft · waiting for you</Chip>}
        </header>
        <div className="grid gap-6 px-7 py-6">
          <section>
            <Label>Who uses it</Label>
            <p className="mt-1.5 text-[14.5px]">{plan.users}</p>
          </section>
          <section>
            <Label>Screens</Label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {plan.screens.map((s) => (
                <Chip key={s} tone="outline">
                  {s}
                </Chip>
              ))}
            </div>
          </section>
          <section>
            <Label>Agents</Label>
            <ul className="mt-2 grid gap-1.5 text-[14px]">
              {p.agents.map((a) => (
                <li key={a.id}>
                  <span className="font-semibold">{a.name}</span>
                  {a.kind === 'manager' && <span className="text-ink2"> (manager)</span>}
                  <span className="text-ink2">: {a.job.charAt(0).toLowerCase() + a.job.slice(1)}</span>
                </li>
              ))}
              {p.studioAgents?.map((a) => (
                <li key={a.id}>
                  <span className="font-semibold">{a.name}</span> <span className="text-ink2">(from Lyzr Studio): {a.description.charAt(0).toLowerCase() + a.description.slice(1)}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="grid gap-6 sm:grid-cols-2">
            <div>
              <Label>Connections</Label>
              <ul className="mt-2 grid gap-1 text-[14px]">
                {plan.connections.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
            <div>
              <Label>Rules and guardrails</Label>
              <ul className="mt-2 grid gap-1 text-[14px]">
                {plan.guardrails.map((g) => (
                  <li key={g} className="flex items-start gap-1.5">
                    <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-ok" /> {g}
                  </li>
                ))}
              </ul>
            </div>
          </section>
          <section>
            <Label>What a right answer looks like · starts the Answer Key</Label>
            <div className="mt-2 overflow-hidden rounded-xl border border-line">
              {plan.examples.map((e, i) => (
                <div key={i} className="grid gap-1 border-b border-line px-4 py-3 last:border-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] sm:gap-4">
                  <div className="text-[13.5px] font-medium">{e.claim}</div>
                  <div className="text-[13.5px] text-ink2">{e.answer}</div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[12.5px] text-ink2">
              These three become the first tests. Architect adds 12 variations, and your claims expert confirms or corrects them later.
            </p>
          </section>
          <section>
            <Label>Checks before you approve</Label>
            <ul className="mt-2 grid gap-2 text-[14px]">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 shrink-0 text-ok" />
                <span>
                  <b>Agent roles:</b> {p.agents.length} agents, each with one clear job
                  {p.studioAgents?.length ? `, plus ${p.studioAgents.length} from Lyzr Studio` : ''}.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 shrink-0 text-ok" />
                <span>
                  <b>Flow:</b> claim email in → facts → policy clause → risk score → draft reply → a handler decides and sends.
                </span>
              </li>
              <li className="flex items-start gap-2">
                {p.slackAlerts ? <Check className="mt-1 h-4 w-4 shrink-0 text-ok" /> : <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-warn" />}
                <span className="flex-1">
                  <b>Missing features:</b> {p.slackAlerts ? 'none found.' : 'nobody is told when a high-risk claim arrives.'}
                  {!p.slackAlerts && !p.planApproved && viewAs === 'builder' && (
                    <button onClick={() => sendChat(p.id, 'Add Slack alerts for high-risk claims')} className="ml-2 text-[13px] font-medium text-accent hover:underline">
                      Add Slack alerts
                    </button>
                  )}
                </span>
              </li>
            </ul>
          </section>
          <section>
            <Label>Framework</Label>
            <div className="mt-2 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {FRAMEWORKS.map((f) => {
                const on = f.id === p.framework;
                return (
                  <button
                    key={f.id}
                    onClick={() => pickFramework(f.id)}
                    disabled={viewAs !== 'builder' || building}
                    aria-pressed={on}
                    className={cn(
                      'flex flex-col gap-0.5 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:cursor-default',
                      on ? 'border-accent bg-accent-soft shadow-ring' : 'border-line bg-surface hover:border-line2',
                    )}
                  >
                    <span className="flex items-center gap-1 text-[13px] font-semibold">
                      {f.label} {on && <Check className="h-3.5 w-3.5 text-accent" />}
                    </span>
                    <span className="text-[11.5px] leading-snug text-ink2">{f.note}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[12.5px] text-ink2">
              {built
                ? 'The agents are described once in agent.yaml (framework-neutral), so switching regenerates the code and reruns every test. Your repo, your choice.'
                : 'Pick what your team already knows. You can switch later: the agents are described once in agent.yaml and the code is regenerated.'}
            </p>
          </section>
          <section>
            <Label>Estimated cost</Label>
            <div className="mt-2 grid gap-2 text-[13.5px] sm:grid-cols-3">
              <div className="rounded-lg bg-surface2 px-3 py-2">
                Build <b>≈ 140 credits</b>
              </div>
              <div className="rounded-lg bg-surface2 px-3 py-2">
                Each proof run <b>≈ {creditsForRun(15)} credits</b>
              </div>
              <div className="rounded-lg bg-surface2 px-3 py-2">
                Running <b>≈ 6 credits</b> per 100 claims
              </div>
            </div>
          </section>
        </div>
        {!p.planApproved && viewAs === 'builder' && (
          <footer className="flex flex-wrap items-center gap-3 rounded-b-2xl border-t border-line bg-surface2 px-7 py-4">
            <span className="flex-1 text-[13px] text-ink2">You have {credits.toLocaleString('en-US')} credits. The build uses about 140.</span>
            <Button variant="primary" onClick={() => approvePlan(p.id)}>
              Approve plan and build
            </Button>
          </footer>
        )}
      </article>
    </div>
  );
}
