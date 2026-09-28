'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  Bell,
  Bot,
  Lightbulb,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  GitBranch,
  HeartPulse,
  MessageSquareText,
  Paperclip,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { useNow } from '@/lib/hooks';
import { FRAMEWORKS, OTHER_PROJECTS, personByRole } from '@/lib/seed';
import { latestRun } from '@/lib/engine';
import { APPROVED, ENV_LABEL, approvedFor, arrivedFlags, openTasks, pendingRequest, rulesFor, stageLabel } from '@/lib/stage';
import type { FrameworkId, Project, Workspace } from '@/lib/types';
import { RequireAuth, WorkspaceBar } from '@/components/shell';
import { ConsultantModal, PlusMenu, PromptLibraryModal, StudioAgentsModal } from '@/components/home-extras';
import type { StudioAgent } from '@/lib/catalog';
import { Button, Card, Chip, Modal, SectionLabel, textareaCls } from '@/components/ui';
import { cn, greeting, plural, timeAgo } from '@/lib/utils';

export default function HomePage() {
  return (
    <RequireAuth>
      <Home />
    </RequireAuth>
  );
}

function Home() {
  const viewAs = useApp((s) => s.viewAs);
  return (
    <div className="min-h-screen">
      <WorkspaceBar />
      {viewAs === 'builder' ? <BuilderHome /> : viewAs === 'reviewer' ? <ReviewerHome /> : <ApproverHome />}
    </div>
  );
}

const TEMPLATES = [
  {
    icon: ClipboardCheck,
    title: 'Claims triage',
    body: 'Emails and PDFs in, risk flags and draft replies out',
    prompt: 'A claims triage assistant: reads claim emails and PDFs, checks the policy, flags risky claims for a human, and drafts replies for our claims team.',
  },
  {
    icon: FileSearch,
    title: 'KYC document check',
    body: 'Reads IDs and statements, lists what’s missing',
    prompt: 'A KYC assistant that reads ID documents and bank statements, checks them against our onboarding rules, and lists what is missing for the analyst.',
  },
  {
    icon: HeartPulse,
    title: 'Patient intake',
    body: 'Forms to structured records, with escalation rules',
    prompt: 'A patient intake assistant that turns intake forms into structured records, flags urgent symptoms for a nurse, and drafts the next-step message.',
  },
  {
    icon: MessageSquareText,
    title: 'Policy Q&A',
    body: 'Answers staff questions from policy documents',
    prompt: 'A policy Q&A assistant that answers call-centre staff questions from our policy documents and always quotes the clause it used.',
  },
];

function BuilderHome() {
  const router = useRouter();
  const createProject = useApp((s) => s.createProject);
  const quickStartDemo = useApp((s) => s.quickStartDemo);
  const setFramework = useApp((s) => s.setFramework);
  const projects = useApp((s) => s.projects);
  const ws = useApp((s) => s.workspace)!;
  const now = useNow(2000);
  const [prompt, setPrompt] = useState('');
  const [fw, setFw] = useState<FrameworkId | 'auto'>('auto');
  const [files, setFiles] = useState<string[]>([]);
  const [mode, setMode] = useState<'guided' | 'oneshot'>('guided');
  const [studio, setStudio] = useState<StudioAgent[]>([]);
  const [modal, setModal] = useState<null | 'studio' | 'library' | 'consultant'>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const me = personByRole('builder');

  const start = () => {
    const text = prompt.trim() || TEMPLATES[0].prompt;
    const full = files.length ? `${text}\n\nAttached: ${files.join(', ')}` : text;
    const id = createProject(full, { oneShot: mode === 'oneshot', studioAgents: studio.map(({ id, name, description }) => ({ id, name, description })) });
    if (fw !== 'auto') setFramework(id, fw);
    router.push(`/p/${id}`);
  };

  const demo = () => {
    const id = quickStartDemo();
    router.push(`/p/${id}?tab=proof`);
  };

  const spent = 1240 - ws.credits;

  return (
    <main className="mx-auto grid max-w-[1240px] gap-8 px-5 py-9 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <p className="text-[14px] text-ink2">
          {greeting()}, {me.short}
        </p>
        <h1 className="mt-1 text-[30px] font-semibold tracking-tight">What agent app do you need?</h1>

        <div className="mt-5 rounded-2xl border border-line2 bg-surface shadow-card focus-within:border-accent focus-within:shadow-ring">
          <label htmlFor="prompt" className="sr-only">
            Describe your app
          </label>
          <textarea
            id="prompt"
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) start();
            }}
            placeholder="Describe your app. For example: a claims triage assistant that reads claim emails and PDFs, checks the policy, flags risky claims for a human, and drafts replies for our claims team."
            className="block w-full resize-none rounded-t-2xl bg-transparent px-5 pt-4 text-[15px] leading-relaxed placeholder:text-ink3 focus:outline-none"
          />
          {(files.length > 0 || studio.length > 0) && (
            <div className="flex flex-wrap gap-1.5 px-5 pb-1">
              {studio.map((a) => (
                <Chip key={a.id} tone="accent" icon={<Bot className="h-3 w-3" />}>
                  {a.name}
                  <button aria-label={`Remove ${a.name}`} onClick={() => setStudio((xs) => xs.filter((x) => x.id !== a.id))} className="ml-0.5 opacity-70 hover:opacity-100">
                    <X className="h-3 w-3" />
                  </button>
                </Chip>
              ))}
              {files.map((f) => (
                <Chip key={f} tone="outline" icon={<Paperclip className="h-3 w-3" />}>
                  {f}
                  <button aria-label={`Remove ${f}`} onClick={() => setFiles((xs) => xs.filter((x) => x !== f))} className="ml-0.5 text-ink3 hover:text-ink">
                    <X className="h-3 w-3" />
                  </button>
                </Chip>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2.5">
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const names = Array.from(e.target.files ?? []).map((f) => f.name);
                setFiles((xs) => Array.from(new Set([...xs, ...names])));
                e.target.value = '';
              }}
            />
            <PlusMenu onAttach={() => fileRef.current?.click()} onStudio={() => setModal('studio')} onLibrary={() => setModal('library')} />
            <div className="flex h-8 rounded-lg border border-line bg-surface2 p-0.5 text-[12.5px]" role="radiogroup" aria-label="Build mode">
              {(
                [
                  ['guided', 'Guided', 'Questions and a plan first'],
                  ['oneshot', 'One Shot', 'Build straight away with sensible defaults'],
                ] as const
              ).map(([id, label, tip]) => (
                <button
                  key={id}
                  role="radio"
                  aria-checked={mode === id}
                  title={tip}
                  onClick={() => setMode(id)}
                  className={cn('rounded-md px-2.5 font-medium', mode === id ? 'bg-surface text-ink shadow-card' : 'text-ink2 hover:text-ink')}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface2 px-2 text-[12.5px] text-ink2">
              Framework:
              <select
                value={fw}
                onChange={(e) => setFw(e.target.value as FrameworkId | 'auto')}
                className="bg-transparent font-medium text-ink focus:outline-none"
                aria-label="Agent framework"
              >
                <option value="auto">decide for me</option>
                {FRAMEWORKS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex-1" />
            <Button size="sm" href="/import" icon={<GitBranch className="h-3.5 w-3.5" />}>
              Import from GitHub
            </Button>
            <Button size="sm" variant="primary" onClick={start} icon={<Sparkles className="h-3.5 w-3.5" />}>
              {mode === 'oneshot' ? 'Build it' : 'Plan it'}
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
          <button onClick={() => setModal('consultant')} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline">
            <Lightbulb className="h-3.5 w-3.5" /> Not sure what to build? Ask the AI Consultant
          </button>
          <button onClick={demo} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline">
            Short on time? Open a finished demo project <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <StudioAgentsModal key={modal === 'studio' ? 'open' : 'closed'} open={modal === 'studio'} onClose={() => setModal(null)} selected={studio} onSave={setStudio} />
        <PromptLibraryModal open={modal === 'library'} onClose={() => setModal(null)} onPick={setPrompt} />
        <ConsultantModal open={modal === 'consultant'} onClose={() => setModal(null)} onPick={setPrompt} />

        <div className="mt-9 flex items-center justify-between">
          <SectionLabel>Start from the prompt library</SectionLabel>
          <button onClick={() => setModal('library')} className="text-[12.5px] font-medium text-accent hover:underline">
            Browse all
          </button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {TEMPLATES.map((t) => (
            <button
              key={t.title}
              onClick={() => setPrompt(t.prompt)}
              className={cn(
                'group flex flex-col gap-2 rounded-xl border bg-surface p-4 text-left shadow-card transition-colors hover:border-accent-line',
                prompt === t.prompt ? 'border-accent shadow-ring' : 'border-line',
              )}
            >
              <t.icon className="h-5 w-5 text-accent" />
              <span className="text-[14px] font-semibold">{t.title}</span>
              <span className="text-[12.5px] leading-snug text-ink2">{t.body}</span>
            </button>
          ))}
        </div>

        <SectionLabel className="mt-9">Your projects</SectionLabel>
        <ProjectsTable projects={projects} ws={ws} now={now} />
      </div>

      <aside className="flex flex-col gap-4">
        <NeedsYou projects={projects} ws={ws} now={now} />
        <Card className="text-[13px] leading-relaxed text-ink2">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-ink3">Credits</div>
          <div className="mt-1 text-[22px] font-semibold text-ink">{ws.credits.toLocaleString('en-US')}</div>
          Used this month: {(860 + spent).toLocaleString('en-US')}. Every build and test run shows its cost before it starts.
        </Card>
      </aside>
    </main>
  );
}

function ProjectsTable({ projects, ws, now }: { projects: Project[]; ws: Workspace; now: number }) {
  const router = useRouter();
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-line bg-surface shadow-card">
      <table className="w-full text-left text-[13.5px]">
        <thead className="border-b border-line bg-surface2 text-[12px] text-ink2">
          <tr>
            <th className="px-4 py-2.5 font-medium">Project</th>
            <th className="px-4 py-2.5 font-medium">Stage</th>
            <th className="hidden px-4 py-2.5 font-medium md:table-cell">Next step</th>
            <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Updated</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id} onClick={() => router.push(`/p/${p.id}`)} className="cursor-pointer border-b border-line last:border-0 hover:bg-surface2">
              <td className="px-4 py-3">
                <Link href={`/p/${p.id}`} className="font-semibold hover:underline" onClick={(e) => e.stopPropagation()}>
                  {p.name}
                </Link>
                <div className="font-mono text-[11.5px] text-ink3">{p.repo}</div>
              </td>
              <td className="px-4 py-3">
                <Chip tone={p.deployments.live.status === 'running' ? 'ok' : pendingRequest(p) ? 'warn' : 'accent'}>{stageLabel(p, now)}</Chip>
              </td>
              <td className="hidden px-4 py-3 text-ink2 md:table-cell">{nextStepText(p, ws, now)}</td>
              <td className="hidden px-4 py-3 text-ink2 sm:table-cell">{timeAgo(lastActivity(p), now)}</td>
            </tr>
          ))}
          {OTHER_PROJECTS.map((o) => (
            <tr key={o.id} className="border-b border-line text-ink2 last:border-0" title="Sample project, here to show a lived-in workspace">
              <td className="px-4 py-3">
                <span className="font-semibold text-ink">{o.name}</span>{' '}
                <Chip tone="dashed" className="ml-1 !py-0 text-[10.5px]">
                  sample
                </Chip>
              </td>
              <td className="px-4 py-3">
                <Chip tone={o.stage === 'live' ? 'ok' : o.stage === 'awaiting' ? 'warn' : 'neutral'}>
                  {o.stageLabel} · {o.match}
                </Chip>
              </td>
              <td className="hidden px-4 py-3 md:table-cell">{o.next}</td>
              <td className="hidden px-4 py-3 sm:table-cell">{o.updated}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function lastActivity(p: Project) {
  const last = p.chat[p.chat.length - 1];
  return Math.max(p.createdAt, last?.at ?? 0);
}

function nextStepText(p: Project, ws: Workspace, now: number): string {
  if (!p.plan) return 'Answer 3 questions';
  if (!p.planApproved) return 'Approve the plan';
  if (p.build.status !== 'done') return 'Building…';
  const pending = pendingRequest(p);
  if (pending) return 'Farah is reviewing the Launch Pack';
  const flags = arrivedFlags(p, now).filter((f) => f.status === 'open').length;
  if (flags) return `${flags} flagged answer${flags > 1 ? 's' : ''} to review`;
  const tasks = openTasks(p).length;
  if (tasks) return `${tasks} answers waiting for Meera`;
  const run = latestRun(p);
  if (run && run.passed < run.total) return `${run.total - run.passed} failing examples to fix`;
  if (approvedFor(p, 'live') && p.deployments.live.version !== p.version) return 'Deploy to Live';
  if (approvedFor(p, 'test') && p.deployments.test.version !== p.version) return 'Deploy to Test';
  if (!rulesFor(p, ws, now).pass) return 'Get an expert review';
  if (p.deployments.live.status === 'running') return 'Watching live answers';
  return 'Request sign-off';
}

function NeedsYou({ projects, ws, now }: { projects: Project[]; ws: Workspace; now: number }) {
  const items: { key: string; icon: React.ReactNode; title: string; body: string; href: string; cta: string }[] = [];
  for (const p of projects) {
    const flags = arrivedFlags(p, now).filter((f) => f.status === 'open');
    if (flags.length)
      items.push({
        key: `${p.id}-flags`,
        icon: <Bell className="h-4 w-4 text-bad" />,
        title: `${flags.length} live answer${flags.length > 1 ? 's were' : ' was'} flagged`,
        body: `${p.name}. Claims handlers think the assistant got ${flags.length > 1 ? 'them' : 'it'} wrong.`,
        href: `/p/${p.id}?tab=live`,
        cta: 'Open Live view',
      });
    const decided = [...p.requests].reverse().find((r) => r.decision && r.decision.by === 'Farah');
    if (decided && APPROVED.includes(decided.status) && decided.version === p.version && p.deployments[decided.env].version !== p.version)
      items.push({
        key: `${p.id}-approved`,
        icon: <ShieldCheck className="h-4 w-4 text-ok" />,
        title: `Farah approved v${decided.version} for ${ENV_LABEL[decided.env]}`,
        body: decided.decision?.conditions.length ? `Conditions: ${decided.decision.conditions.join('; ')}.` : `${p.name} is ready to deploy.`,
        href: `/p/${p.id}?tab=launch`,
        cta: 'Deploy it',
      });
    if (decided && (decided.status === 'changes' || decided.status === 'rejected') && decided.version === p.version)
      items.push({
        key: `${p.id}-changes`,
        icon: <MessageSquareText className="h-4 w-4 text-warn" />,
        title: decided.status === 'changes' ? 'Farah asked for changes' : 'Farah rejected the launch',
        body: decided.decision?.comment ? `“${decided.decision.comment}”` : p.name,
        href: `/p/${p.id}?tab=launch`,
        cta: 'See the decision',
      });
    const run = latestRun(p);
    if (p.reviews.length && !openTasks(p).length && run && run.passed < run.total)
      items.push({
        key: `${p.id}-fails`,
        icon: <ClipboardCheck className="h-4 w-4 text-accent" />,
        title: `${run.total - run.passed} failing example${run.total - run.passed > 1 ? 's' : ''} to fix`,
        body: `${p.name}. Meera’s corrections are now tests.`,
        href: `/p/${p.id}?tab=proof`,
        cta: 'Open Proof',
      });
  }
  return (
    <Card pad={false}>
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="text-[14px] font-semibold">Needs you</span>
        {items.length > 0 && <Chip tone="accent">{items.length}</Chip>}
      </div>
      {items.length ? (
        <ul>
          {items.map((i) => (
            <li key={i.key} className="border-b border-line px-4 py-3 last:border-0">
              <div className="flex gap-2.5">
                <span className="mt-0.5">{i.icon}</span>
                <div className="min-w-0">
                  <div className="text-[13.5px] font-semibold">{i.title}</div>
                  <div className="text-[12.5px] text-ink2">{i.body}</div>
                  <Link href={i.href} className="mt-1 inline-flex items-center gap-1 text-[12.5px] font-medium text-accent hover:underline">
                    {i.cta} <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex items-center gap-2.5 px-4 py-5 text-[13px] text-ink2">
          <CheckCircle2 className="h-4 w-4 text-ok" /> You’re all caught up.
        </div>
      )}
    </Card>
  );
}

function ReviewerHome() {
  const projects = useApp((s) => s.projects);
  const now = useNow(3000);
  const me = personByRole('reviewer');
  const withTasks = projects.filter((p) => openTasks(p).length);
  const total = withTasks.reduce((n, p) => n + openTasks(p).length, 0);
  const myReviews = projects.flatMap((p) => p.reviews.filter((r) => r.by === 'Meera').map((r) => ({ r, p })));
  const tests = myReviews.filter((x) => x.r.createdItemId);
  const passingTests = tests.filter(({ r, p }) => {
    const run = latestRun(p);
    return run?.results.find((x) => x.itemId === r.createdItemId)?.pass;
  }).length;

  return (
    <main className="mx-auto max-w-[1000px] px-5 py-9">
      <p className="text-[14px] text-ink2">
        {greeting()}, {me.short}
      </p>
      <h1 className="mt-1 text-[30px] font-semibold tracking-tight">
        {total ? `${total} answer${total > 1 ? 's are' : ' is'} waiting for your review` : 'Nothing to review right now'}
      </h1>
      <p className="mt-1.5 text-[14.5px] text-ink2">You check the assistant’s answers. When one is wrong, your correction becomes a test the app must pass before it launches.</p>

      <div className="mt-6 grid gap-3">
        {withTasks.map((p) => {
          const t = openTasks(p);
          const flags = t.filter((x) => x.kind === 'flag').length;
          const first = t[0];
          return (
            <Card key={p.id} className="flex flex-wrap items-center gap-4">
              <div className="min-w-0 flex-1">
                <div className="text-[16px] font-semibold">{p.name}</div>
                <div className="mt-0.5 text-[13.5px] text-ink2">
                  {plural(t.length, 'answer')} to check · about {plural(Math.max(1, Math.round(t.length * 0.6)), 'minute')} · requested by {first.requestedBy} {timeAgo(first.createdAt, now)}
                </div>
                {flags > 0 && (
                  <Chip tone="bad" className="mt-2" icon={<Bell className="h-3 w-3" />}>
                    {flags} flagged by claims handlers in the live app
                  </Chip>
                )}
              </div>
              <Button href={`/apps/${p.id}?env=preview`} variant="ghost">
                Try the app
              </Button>
              <Button href={`/p/${p.id}/review`} variant="primary" icon={<ArrowRight className="h-4 w-4" />}>
                Start reviewing
              </Button>
            </Card>
          );
        })}
        {!withTasks.length && (
          <div className="rounded-xl border border-dashed border-line2 bg-surface2 px-6 py-8 text-center text-[14px] text-ink2">
            When Arjun invites you to a project, the answers to check land here.
            {projects.some((p) => p.build.status === 'done') ? null : (
              <div className="mt-1 text-[13px]">Tip: switch “View as” back to Arjun to build something first.</div>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <SectionLabel>Answer Keys you own</SectionLabel>
          <ul className="mt-3 grid gap-2.5">
            {projects
              .filter((p) => p.answerKey.length)
              .map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 text-[13.5px]">
                  <div>
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-[12.5px] text-ink2">
                      {p.answerKey.length} examples · {p.answerKey.filter((i) => i.highRisk).length} high-risk ·{' '}
                      {p.answerKey.filter((i) => i.author === 'Meera').length} written by you
                    </div>
                  </div>
                  <Link href={`/p/${p.id}?tab=proof`} className="text-[12.5px] font-medium text-accent hover:underline">
                    Open
                  </Link>
                </li>
              ))}
            {!projects.some((p) => p.answerKey.length) && <li className="text-[13px] text-ink2">None yet.</li>}
          </ul>
        </Card>
        <Card>
          <SectionLabel>Your impact</SectionLabel>
          <div className="mt-3 flex items-end gap-6">
            <div>
              <div className="text-[26px] font-semibold">{myReviews.length}</div>
              <div className="text-[12.5px] text-ink2">answers reviewed</div>
            </div>
            <div>
              <div className="text-[26px] font-semibold">{tests.length}</div>
              <div className="text-[12.5px] text-ink2">corrections became tests</div>
            </div>
            <div>
              <div className="text-[26px] font-semibold text-ok">{passingTests}</div>
              <div className="text-[12.5px] text-ink2">of them pass now</div>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}

function ApproverHome() {
  const projects = useApp((s) => s.projects);
  const ws = useApp((s) => s.workspace)!;
  const audit = useApp((s) => s.audit);
  const now = useNow(3000);
  const me = personByRole('approver');
  const pending = projects.flatMap((p) => p.requests.filter((r) => r.status === 'pending').map((r) => ({ p, r })));
  const approvedApps = projects.filter((p) => p.requests.some((r) => APPROVED.includes(r.status)));
  const decisions = audit.filter((e) => e.actor === 'Farah' && /approved|rejected|sent back/.test(e.action)).concat(audit.filter((e) => e.action === 'launched via fast lane'));
  const [ask, setAsk] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const askQuestion = useApp((s) => s.askQuestion);
  const ruleCount = [ws.rules.highRiskAll, ws.rules.minMatchOn, ws.rules.expertReviewOn, ws.rules.piiMaskOn].filter(Boolean).length;

  return (
    <main className="mx-auto max-w-[1100px] px-5 py-9">
      <p className="text-[14px] text-ink2">
        {greeting()}, {me.short}
      </p>
      <h1 className="mt-1 text-[30px] font-semibold tracking-tight">
        {pending.length ? `${pending.length} launch${pending.length > 1 ? 'es are' : ' is'} waiting for your decision` : 'No launches are waiting for you'}
      </h1>
      <p className="mt-1.5 text-[14.5px] text-ink2">You decide from evidence: test results, expert reviews, data access and cost. You never need to read code.</p>

      <div className="mt-6 grid gap-3">
        {pending.map(({ p, r }) => {
          const run = p.runs.find((x) => x.id === r.runId);
          const passCount = r.checks.filter((c) => c.pass).length;
          const lastReview = p.reviews.reduce((m, x) => Math.max(m, x.at), 0);
          return (
            <Card key={r.id} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[17px] font-semibold">
                    {p.name} → {ENV_LABEL[r.env]}
                  </span>
                  <Chip tone="warn">Waiting for you</Chip>
                </div>
                <div className="mt-0.5 text-[13.5px] text-ink2">
                  For {r.audience} · requested by {r.requestedBy} {timeAgo(r.at, now)} · v{r.version}
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <Chip tone={passCount === r.checks.length ? 'ok' : 'bad'}>
                    Launch rules {passCount}/{r.checks.length} {passCount === r.checks.length ? '✓' : ''}
                  </Chip>
                  {run && <Chip tone={run.passed === run.total ? 'ok' : 'warn'}>{`${run.passed}/${run.total} examples pass`}</Chip>}
                  {lastReview > 0 && <Chip tone="neutral">Reviewed by Meera {timeAgo(lastReview, now)}</Chip>}
                  <Chip tone="warn">Reads customer emails and claims data</Chip>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setAsk(p.id)}>
                  Ask Arjun a question
                </Button>
                <Button href={`/p/${p.id}/requests/${r.id}`} variant="primary" icon={<ArrowRight className="h-4 w-4" />}>
                  Open Launch Pack
                </Button>
              </div>
            </Card>
          );
        })}
        {!pending.length && (
          <div className="rounded-xl border border-dashed border-line2 bg-surface2 px-6 py-8 text-center text-[14px] text-ink2">
            When a builder requests sign-off, the Launch Pack lands here. Changes that pass every rule can go to Test without waiting for you, and you see them in the audit trail.
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card pad={false}>
          <div className="border-b border-line px-4 py-3 text-[14px] font-semibold">Apps you’ve approved</div>
          <table className="w-full text-left text-[13px]">
            <thead className="text-[12px] text-ink2">
              <tr className="border-b border-line">
                <th className="px-4 py-2 font-medium">App</th>
                <th className="px-4 py-2 font-medium">Where</th>
                <th className="px-4 py-2 font-medium">Matches experts</th>
                <th className="px-4 py-2 font-medium">Flags</th>
              </tr>
            </thead>
            <tbody>
              {approvedApps.map((p) => {
                const run = latestRun(p);
                const where = p.deployments.live.status === 'running' ? 'Live' : p.deployments.test.status === 'running' ? 'Test' : 'Approved';
                const fl = arrivedFlags(p, now).filter((f) => f.status !== 'reviewed').length;
                return (
                  <tr key={p.id} className="border-b border-line">
                    <td className="px-4 py-2.5 font-semibold">
                      <Link href={`/p/${p.id}?tab=launch`} className="hover:underline">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">{where}</td>
                    <td className="px-4 py-2.5">{run ? `${run.passed}/${run.total}` : '—'}</td>
                    <td className="px-4 py-2.5">{fl ? <Chip tone="bad">{fl} open</Chip> : '0'}</td>
                  </tr>
                );
              })}
              <tr className="border-b border-line text-ink2" title="Sample">
                <td className="px-4 py-2.5">Broker Email Assistant <span className="text-[11px] text-ink3">(sample)</span></td>
                <td className="px-4 py-2.5">Live</td>
                <td className="px-4 py-2.5">97%</td>
                <td className="px-4 py-2.5">2 open</td>
              </tr>
              <tr className="text-ink2" title="Sample">
                <td className="px-4 py-2.5">Policy Q&amp;A for call centre <span className="text-[11px] text-ink3">(sample)</span></td>
                <td className="px-4 py-2.5">Test</td>
                <td className="px-4 py-2.5">42/45</td>
                <td className="px-4 py-2.5">0</td>
              </tr>
            </tbody>
          </table>
        </Card>
        <div className="grid gap-4">
          <Card>
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-semibold">Your launch rules</span>
              <Button size="sm" href="/settings">
                Edit rules
              </Button>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-ink2">
              {ruleCount} rules are checked on every request, and your approval is needed for anything going Live.{' '}
              {ws.rules.fastLane ? 'Changes that pass every rule can go to Test without waiting for you.' : 'The fast lane is off: every launch waits for you.'}
            </p>
          </Card>
          <Card>
            <span className="text-[14px] font-semibold">Recent decisions</span>
            <ul className="mt-2 grid gap-2 text-[13px]">
              {decisions.slice(0, 5).map((e) => (
                <li key={e.id} className="text-ink2">
                  <span className="font-medium text-ink">{e.target}</span> · {e.action} {e.detail ? `(${e.detail})` : ''} · {timeAgo(e.at, now)}
                </li>
              ))}
              <li className="text-ink2">
                <span className="font-medium text-ink">Underwriting Helper</span> · sent back: “Mask applicant income before it reaches a model” · yesterday{' '}
                <span className="text-[11px] text-ink3">(sample)</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>

      <Modal
        open={!!ask}
        onClose={() => setAsk(null)}
        title="Ask Arjun a question"
        description="It goes to the project chat. The answer is added to the Launch Pack."
        footer={
          <>
            <Button variant="ghost" onClick={() => setAsk(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!question.trim()}
              icon={<Send className="h-4 w-4" />}
              onClick={() => {
                if (ask) askQuestion(ask, question, 'approver');
                setQuestion('');
                setAsk(null);
              }}
            >
              Send question
            </Button>
          </>
        }
      >
        <textarea
          className={textareaCls}
          rows={3}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Which models see the customer’s personal data?"
        />
      </Modal>
    </main>
  );
}
