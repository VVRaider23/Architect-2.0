'use client';

import Link from 'next/link';
import { useRouter } from '@/lib/nav';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Bot, GitBranch, Lightbulb, Paperclip, X } from 'lucide-react';
import { useApp } from '@/lib/store';
import { useServer } from '@/lib/account';
import { openTasks, pendingRequest } from '@/lib/stage';
import type { StudioAgent } from '@/lib/catalog';
import { AppShell, RequireAuth } from '@/components/shell';
import { Button, Card, Chip, Segmented } from '@/components/ui';
import { PromptBox } from '@/components/prompt-box';
import { ProjectRow } from '@/components/project-row';
import { ConsultantModal, PlusMenu, PromptLibraryModal, StudioAgentsModal } from '@/components/home-extras';
import { ShellSkeleton } from '@/components/skeletons';

export default function HomePage() {
  return (
    <RequireAuth fallback={<ShellSkeleton page="home" />}>
      <AppShell>
        <Home />
      </AppShell>
    </RequireAuth>
  );
}

function Home() {
  const viewAs = useApp((s) => s.viewAs);
  if (viewAs === 'reviewer') return <ExpertHome />;
  if (viewAs === 'approver') return <ApproverHome />;
  return <BuilderHome />;
}

const STARTERS = [
  { label: 'Claims triage', idea: 'A claims assistant that reads claim emails, checks the policy, and flags risky claims for a person to check' },
  { label: 'KYC checker', idea: 'A KYC checker that reads ID documents and lists what is missing for the analyst' },
  { label: 'Support copilot', idea: 'A support copilot that drafts replies from our help centre and past tickets' },
];

function firstName(email: string, account?: string | null) {
  if (account) return account.split(' ')[0];
  const local = email.split('@')[0]?.split(/[._-]/)[0] ?? '';
  return local ? local.charAt(0).toUpperCase() + local.slice(1) : 'there';
}

/** Screen 4 · Home. One job: say what to build. */
function BuilderHome() {
  const router = useRouter();
  const email = useApp((s) => s.userEmail);
  const projects = useApp((s) => s.projects);
  const createProject = useApp((s) => s.createProject);
  const accountName = useServer((s) => s.user?.name);
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<'guided' | 'oneshot'>('guided');
  const [studio, setStudio] = useState<StudioAgent[]>([]);
  const [files, setFiles] = useState<string[]>([]);
  const [modal, setModal] = useState<null | 'studio' | 'library' | 'consultant'>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const idea = localStorage.getItem('arch_idea');
      if (idea) {
        setPrompt(idea);
        localStorage.removeItem('arch_idea');
      }
    } catch {
      /* ignore */
    }
  }, []);

  const start = () => {
    setBusy(true);
    const text = files.length ? `${prompt.trim()} (Attached: ${files.join(', ')})` : prompt.trim();
    const id = createProject(text, { oneShot: mode === 'oneshot', studioAgents: studio.map(({ id: sid, name, description }) => ({ id: sid, name, description })) });
    router.push(mode === 'oneshot' ? `/p/${id}/build` : `/p/${id}/questions`);
  };

  return (
    <div className="mx-auto w-full max-w-[680px] px-4 pb-24 pt-[9vh] sm:px-6">
      <div className="animate-screen-in">
        <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.02em] sm:text-[34px]">What should we build, {firstName(email, accountName)}?</h1>
        <div className="mt-6" data-tour="home-prompt">
          <PromptBox
            value={prompt}
            onChange={setPrompt}
            onSubmit={start}
            busy={busy}
            rows={3}
            autoFocus
            placeholder="Describe the app in a sentence or two…"
            hint={mode === 'oneshot' ? 'Press Enter to build it' : 'Press Enter to plan it'}
            left={
              <>
                <PlusMenu onAttach={() => fileRef.current?.click()} onStudio={() => setModal('studio')} onLibrary={() => setModal('library')} />
                <Segmented
                  size="sm"
                  label="How to start"
                  value={mode}
                  onChange={setMode}
                  options={[
                    { id: 'guided', label: 'Guided' },
                    { id: 'oneshot', label: 'One Shot' },
                  ]}
                />
              </>
            }
          />
          <input
            ref={fileRef}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              const names = Array.from(e.target.files ?? []).map((f) => f.name);
              setFiles((f) => Array.from(new Set([...f, ...names])));
              e.target.value = '';
            }}
          />
        </div>

        {(files.length > 0 || studio.length > 0) && (
          <div className="mt-3 flex flex-wrap gap-1.5 animate-slide-up">
            {files.map((f) => (
              <Chip key={f} tone="outline" icon={<Paperclip className="h-3 w-3" />}>
                {f}
                <button type="button" aria-label={`Remove ${f}`} className="press ml-0.5 text-ink3 hover:text-ink" onClick={() => setFiles((x) => x.filter((y) => y !== f))}>
                  <X className="h-3 w-3" />
                </button>
              </Chip>
            ))}
            {studio.map((a) => (
              <Chip key={a.id} tone="accent" icon={<Bot className="h-3 w-3" />}>
                {a.name}
              </Chip>
            ))}
          </div>
        )}

        <p className="mt-3 text-[13px] text-ink3">
          {mode === 'guided' ? 'Guided: three quick questions and a one-page plan before anything is built.' : 'One Shot: Architect picks sensible answers and builds straight away.'}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[14px] text-ink3">Or start from</span>
          {STARTERS.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setPrompt(s.idea)}
              aria-pressed={prompt === s.idea}
              className="press h-8 rounded-full border border-line2 px-3 text-[13.5px] text-ink2 transition-colors hover:border-ink3/60 hover:text-ink aria-pressed:border-accent-line aria-pressed:bg-accent-soft aria-pressed:text-accent-ink"
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[14px]">
          <Link href="/import" className="press group inline-flex items-center gap-1.5 text-ink2 hover:text-ink" data-tour="home-import">
            <GitBranch className="h-4 w-4" /> Import from GitHub instead
          </Link>
          <button type="button" onClick={() => setModal('consultant')} className="press inline-flex items-center gap-1.5 text-ink2 hover:text-ink">
            <Lightbulb className="h-4 w-4" /> Not sure what to build?
          </button>
        </div>
      </div>

      {projects.length > 0 && (
        <section className="mt-14 animate-fade-in" aria-labelledby="recent">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="recent" className="text-[14px] font-medium text-ink2">
              Recent
            </h2>
            {projects.length > 3 && (
              <Link href="/projects" className="press text-[13.5px] text-ink3 hover:text-ink">
                All {projects.length} projects
              </Link>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {projects.slice(0, 3).map((p) => (
              <ProjectRow key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}

      <StudioAgentsModal key={modal === 'studio' ? 'open' : 'closed'} open={modal === 'studio'} onClose={() => setModal(null)} selected={studio} onSave={setStudio} />
      <PromptLibraryModal open={modal === 'library'} onClose={() => setModal(null)} onPick={setPrompt} />
      <ConsultantModal open={modal === 'consultant'} onClose={() => setModal(null)} onPick={setPrompt} />
    </div>
  );
}

/** Meera's home: only what is waiting for her. */
function ExpertHome() {
  const projects = useApp((s) => s.projects);
  const waiting = projects.map((p) => ({ p, n: openTasks(p).length })).filter((x) => x.n > 0);
  return (
    <div className="mx-auto w-full max-w-[560px] px-4 pb-24 pt-[10vh] sm:px-6">
      <div className="animate-screen-in">
        <h1 className="text-[30px] font-semibold tracking-[-0.02em]">Hi Meera</h1>
        {waiting.length ? (
          <div className="mt-6 flex flex-col gap-3">
            {waiting.map(({ p, n }) => (
              <Card key={p.id} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="text-[17px] font-semibold">
                    {n} answer{n === 1 ? ' is' : 's are'} waiting for you
                  </div>
                  <div className="mt-1 text-[14px] text-ink3">{p.name} · from Arjun</div>
                </div>
                <Button variant="primary" size="lg" href={`/p/${p.id}/review`} iconRight={<ArrowRight className="h-4 w-4" />}>
                  Start
                </Button>
              </Card>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-[16px] leading-relaxed text-ink2">Nothing to check right now. When Arjun sends answers for you to check, they show up here.</p>
        )}
      </div>
    </div>
  );
}

/** Farah's home: only the decisions waiting for her. */
function ApproverHome() {
  const projects = useApp((s) => s.projects);
  const waiting = projects.map((p) => ({ p, r: pendingRequest(p) })).filter((x) => x.r);
  return (
    <div className="mx-auto w-full max-w-[560px] px-4 pb-24 pt-[10vh] sm:px-6">
      <div className="animate-screen-in">
        <h1 className="text-[30px] font-semibold tracking-[-0.02em]">Hi Farah</h1>
        {waiting.length ? (
          <div className="mt-6 flex flex-col gap-3">
            {waiting.map(({ p, r }) => (
              <Card key={p.id} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="text-[17px] font-semibold">A launch is waiting for your decision</div>
                  <div className="mt-1 text-[14px] text-ink3">
                    {p.name} · v{r!.version} to {r!.env === 'live' ? 'Live' : 'Test'} · from Arjun
                  </div>
                </div>
                <Button variant="primary" size="lg" href={`/p/${p.id}/requests/${r!.id}`} iconRight={<ArrowRight className="h-4 w-4" />}>
                  Open
                </Button>
              </Card>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-[16px] leading-relaxed text-ink2">
            Nothing to decide right now. Launches that pass your{' '}
            <Link href="/settings" className="underline decoration-line2 underline-offset-4 hover:text-ink">
              launch rules
            </Link>{' '}
            show up here when Arjun asks.
          </p>
        )}
      </div>
    </div>
  );
}
