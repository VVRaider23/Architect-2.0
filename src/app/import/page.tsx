'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from '@/lib/nav';
import { Check, GitBranch, Search } from 'lucide-react';
import { useApp } from '@/lib/store';
import { githubUrl, listMyRepos, useServer } from '@/lib/account';
import { FRAMEWORKS } from '@/lib/seed';
import type { FrameworkId } from '@/lib/types';
import { AppShell, RequireAuth } from '@/components/shell';
import { BackLink } from '@/components/frame';
import { ActionButton, Button, Spinner } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { RepoAnalysis } from '@/app/api/github/analyze/route';
import { ShellSkeleton } from '@/components/skeletons';

export default function ImportPage() {
  return (
    <RequireAuth fallback={<ShellSkeleton page="list" />}>
      <AppShell>
        <Import />
      </AppShell>
    </RequireAuth>
  );
}

function demo(repo: string, lang: string, fw: FrameworkId | null, agents: string[], tools: string[], tests: number, screens: string | null): RepoAnalysis {
  const label = fw ? FRAMEWORKS.find((f) => f.id === fw)!.label : null;
  return {
    repo,
    url: `https://github.com/${repo}`,
    description: null,
    defaultBranch: 'main',
    stars: null,
    pushedAt: null,
    languages: [lang],
    frameworks: fw ? [{ id: fw, label: label!, supported: fw, evidence: 'found in the dependencies' }] : [],
    primary: fw,
    agents,
    tools,
    screens: screens ? { found: true, label: screens } : { found: false, label: 'None found' },
    secrets: ['GMAIL_TOKEN', 'DATABASE_URL'],
    tests: { found: tests > 0, count: tests },
    fileCount: 20 + agents.length * 6,
    partial: false,
    notes: [],
  } as RepoAnalysis;
}

/** Repos on the demo GitHub account. Their reading is canned; a pasted public repo is read for real. */
const DEMO_REPOS: { name: string; meta: string; analysis: RepoAnalysis }[] = [
  {
    name: 'harborline/claims-bot',
    meta: 'Python with CrewAI, updated 2 days ago',
    analysis: demo('harborline/claims-bot', 'Python', 'crewai', ['agents/intake.py', 'agents/policy.py', 'agents/triage.py'], ['Google APIs (Gmail)', 'Postgres'], 0, null),
  },
  {
    name: 'harborline/kyc-checker',
    meta: 'Python with LangGraph, updated last week',
    analysis: demo('harborline/kyc-checker', 'Python', 'langgraph', ['graph/reader.py', 'graph/checker.py'], ['OCR'], 3, null),
  },
  {
    name: 'harborline/broker-mail',
    meta: 'TypeScript with the OpenAI Agents SDK, updated 3 weeks ago',
    analysis: demo('harborline/broker-mail', 'TypeScript', 'openai-agents', ['src/agents/broker.ts', 'src/agents/policy.ts'], ['Google APIs (Gmail)', 'OpenAI'], 4, 'Next.js'),
  },
  {
    name: 'arjun-m/agents-playground',
    meta: 'Python, updated 2 months ago',
    analysis: demo('arjun-m/agents-playground', 'Python', null, [], [], 0, null),
  },
];

const REPO = /^(?:https?:\/\/github\.com\/)?([\w.-]+\/[\w.-]+?)(?:\.git)?\/?$/i;

/** What the reading found, in one plain sentence. */
function foundLine(a: RepoAnalysis) {
  const fw = a.frameworks[0]?.label;
  const n = a.agents.length;
  const head = n ? `Found ${n} agent${n === 1 ? '' : 's'}${fw ? ` written in ${fw}` : ''}.` : fw ? `Found a ${fw} project.` : 'No agents found yet.';
  const tail = a.tests.found ? 'It has some tests, but none check the agents’ answers yet, so we’ll add an Answer Key.' : 'There are no tests yet, so we’ll start an Answer Key with your experts.';
  return { head, tail: n || fw ? tail : 'Architect will add agents from a plan you approve, then open a pull request.' };
}

/** Screen 5 · Import. One job: pick the repo to bring in. */
function Import() {
  const router = useRouter();
  const importProject = useApp((s) => s.importProject);
  const { features, user } = useServer();
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [a, setA] = useState<RepoAnalysis | null>(null);
  const [error, setError] = useState('');
  const [mine, setMine] = useState<{ name: string; meta: string }[] | null>(null);

  useEffect(() => {
    if (!user?.github) return;
    listMyRepos()
      .then((r) =>
        setMine(
          r.repos.map((x) => ({
            name: x.name,
            meta: [x.language, x.private ? 'private' : null, `updated ${new Date(x.pushedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`].filter(Boolean).join(', '),
          })),
        ),
      )
      .catch(() => setMine(null));
  }, [user?.github]);

  const repos = mine ?? DEMO_REPOS.map(({ name, meta }) => ({ name, meta }));
  const needle = q.trim().toLowerCase();
  const shown = useMemo(() => (needle ? repos.filter((r) => r.name.toLowerCase().includes(needle)) : repos), [repos, needle]);
  const pasted = q.trim().match(REPO)?.[1];
  const canRead = !!pasted && !repos.some((r) => r.name.toLowerCase() === pasted.toLowerCase());

  const pick = async (name: string) => {
    setPicked(name);
    setA(null);
    setError('');
    setReading(true);
    const canned = DEMO_REPOS.find((d) => d.name === name);
    if (canned) {
      setTimeout(() => {
        setA(canned.analysis);
        setReading(false);
      }, 650);
      return;
    }
    try {
      const res = await fetch(`/api/github/analyze?repo=${encodeURIComponent(name)}`);
      const data = await res.json();
      if (!res.ok) setError(data.error ?? 'Something went wrong reading that repo.');
      else setA(data as RepoAnalysis);
    } catch {
      setError('Couldn’t reach GitHub. Check your connection and try again.');
    } finally {
      setReading(false);
    }
  };

  const doImport = () => {
    if (!a) return false;
    const fw: FrameworkId = a.primary ?? 'langgraph';
    return importProject(
      {
        repo: a.repo,
        url: a.url,
        framework: a.frameworks[0]?.label ?? null,
        agents: a.agents,
        tools: a.tools,
        secrets: a.secrets,
        files: a.fileCount,
        screens: a.screens.found ? a.screens.label : 'generate from the plan',
        tests: a.tests.found,
      },
      fw,
    );
  };

  const short = picked?.split('/')[1];
  const found = a ? foundLine(a) : null;
  return (
    <div className="mx-auto w-full max-w-[600px] px-4 pb-24 pt-10 sm:px-6">
      <div className="animate-screen-in">
        <BackLink href="/home" />
        <h1 className="mt-6 text-[30px] font-semibold tracking-[-0.02em]">Import from GitHub</h1>
        {features.github && !user?.github && (
          <p className="mt-2 text-[14.5px] text-ink2">
            <a href={githubUrl('connect', '/import')} className="underline decoration-line2 underline-offset-4 hover:text-ink">
              Connect GitHub
            </a>{' '}
            to see your own repos, or paste any public repo below.
          </p>
        )}

        <label className="mt-6 flex h-12 items-center gap-2.5 rounded-xl border border-line2 bg-surface px-3.5 transition-[border-color,box-shadow] focus-within:border-accent focus-within:shadow-ring">
          <Search className="h-4 w-4 text-ink3" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search your repos, or paste owner/repo…"
            aria-label="Search your repos"
            autoComplete="off"
            spellCheck={false}
            autoFocus
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-ink placeholder:text-ink3 focus:outline-none"
          />
        </label>

        <ul role="listbox" aria-label="Your repos" className="mt-3 flex flex-col gap-1.5">
          {canRead && (
            <li>
              <button
                type="button"
                role="option"
                aria-selected={picked === pasted}
                onClick={() => pick(pasted!)}
                className="press flex w-full items-center gap-3 rounded-xl border border-dashed border-line2 px-4 py-3 text-left hover:border-ink3/60"
              >
                <GitBranch className="h-4 w-4 text-ink3" />
                <span className="flex-1 text-[14.5px]">
                  Read <span className="font-mono text-[13.5px]">{pasted}</span> from GitHub
                </span>
              </button>
            </li>
          )}
          {shown.map((r) => {
            const on = picked === r.name;
            return (
              <li key={r.name}>
                <button
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => pick(r.name)}
                  className={cn(
                    'press flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                    on ? 'border-accent-line bg-accent-soft' : 'border-line bg-surface hover:border-line2 hover:bg-surface2',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14.5px] font-medium">{r.name}</div>
                    <div className="truncate text-[13px] text-ink3">{r.meta}</div>
                  </div>
                  <span className={cn('grid h-5 w-5 place-items-center rounded-full border transition-all duration-200', on ? 'border-accent bg-accent text-on-accent' : 'border-line2')}>
                    {on && (reading ? <Spinner className="h-3 w-3 text-on-accent" /> : <Check className="h-3 w-3 animate-pop-in" strokeWidth={3} />)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {!shown.length && !canRead && <p className="mt-4 text-[14px] text-ink3">No repo matches that. Check the spelling, or paste owner/repo for a public repo.</p>}

        {error && <p className="mt-4 rounded-xl border border-bad-line bg-bad-soft px-4 py-3 text-[14px] text-ink animate-slide-up">{error}</p>}
        {found && (
          <div className="mt-4 rounded-xl border border-ok-line bg-ok-soft px-4 py-3 animate-slide-up" role="status">
            <div className="text-[14.5px] font-medium text-ink">{found.head}</div>
            <div className="mt-0.5 text-[13.5px] text-ink2">{found.tail}</div>
          </div>
        )}

        <div className="mt-6">
          {a ? (
            <ActionButton
              key={a.repo}
              size="xl"
              label={`Import ${short}`}
              busyLabel="Importing"
              doneLabel="Imported"
              tour="import-go"
              run={doImport}
              onDone={(id) => router.push(`/p/${id as string}/plan`)}
            />
          ) : (
            <Button size="xl" disabled>
              {reading ? 'Reading the repo…' : 'Pick a repo to import'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
