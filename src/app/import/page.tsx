'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowRight, Check, FolderGit2, Info, KeyRound, Loader2, Search, Star } from 'lucide-react';
import { useApp } from '@/lib/store';
import { FRAMEWORKS } from '@/lib/seed';
import type { FrameworkId } from '@/lib/types';
import { RequireAuth, WorkspaceBar } from '@/components/shell';
import { Button, Card, Chip, Toggle, inputCls } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { RepoAnalysis } from '@/app/api/github/analyze/route';

export default function ImportPage() {
  return (
    <RequireAuth>
      <Import />
    </RequireAuth>
  );
}

const EXAMPLES = ['langchain-ai/react-agent', 'crewAIInc/crewAI-examples', 'google/adk-samples'];

/** Repos on the demo GitHub account. Their analysis is canned; pasted public repos are read for real. */
const DEMO_REPOS: { name: string; meta: string; analysis: RepoAnalysis }[] = [
  {
    name: 'harborline/claims-agent',
    meta: 'Python · LangGraph · updated 2 days ago',
    analysis: {
      repo: 'harborline/claims-agent',
      url: 'https://github.com/harborline/claims-agent',
      description: 'Claims intake agents (internal)',
      defaultBranch: 'main',
      stars: null,
      pushedAt: null,
      languages: ['Python'],
      frameworks: [{ id: 'langgraph', label: 'LangGraph', supported: 'langgraph', evidence: 'found in requirements.txt' }],
      primary: 'langgraph',
      agents: ['agents/intake.py', 'agents/policy_lookup.py', 'agents/triage.py'],
      tools: ['Google APIs (Gmail, Drive)', 'Postgres'],
      screens: { found: false, label: 'None found' },
      secrets: ['GMAIL_TOKEN', 'DATABASE_URL'],
      tests: { found: false, count: 0 },
      fileCount: 23,
      partial: false,
      notes: [],
    },
  },
  {
    name: 'harborline/broker-bot',
    meta: 'TypeScript · OpenAI Agents SDK · last week',
    analysis: {
      repo: 'harborline/broker-bot',
      url: 'https://github.com/harborline/broker-bot',
      description: 'Answers broker emails',
      defaultBranch: 'main',
      stars: null,
      pushedAt: null,
      languages: ['TypeScript'],
      frameworks: [{ id: 'openai-agents', label: 'OpenAI Agents SDK', supported: 'openai-agents', evidence: 'found in package.json' }],
      primary: 'openai-agents',
      agents: ['src/agents/broker.ts', 'src/agents/policy.ts'],
      tools: ['Google APIs (Gmail, Drive)', 'OpenAI'],
      screens: { found: true, label: 'Next.js' },
      secrets: ['OPENAI_API_KEY', 'GMAIL_TOKEN'],
      tests: { found: true, count: 4 },
      fileCount: 41,
      partial: false,
      notes: [],
    },
  },
];

function Import() {
  const router = useRouter();
  const github = useApp((s) => s.workspace?.github);
  const importProject = useApp((s) => s.importProject);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [a, setA] = useState<RepoAnalysis | null>(null);
  const [fw, setFw] = useState<FrameworkId>('langgraph');
  const [genScreens, setGenScreens] = useState(true);
  const [draftKey, setDraftKey] = useState(true);

  const show = (x: RepoAnalysis) => {
    setA(x);
    setFw(x.primary ?? 'langgraph');
    setGenScreens(!x.screens.found);
    setDraftKey(true);
  };

  const analyze = async (repo: string) => {
    const r = repo.trim();
    if (!r) return;
    setInput(r);
    setError('');
    setBusy(true);
    setA(null);
    const demo = DEMO_REPOS.find((d) => d.name === r);
    if (demo) {
      setTimeout(() => {
        show(demo.analysis);
        setBusy(false);
      }, 700);
      return;
    }
    try {
      const res = await fetch(`/api/github/analyze?repo=${encodeURIComponent(r)}`);
      const data = await res.json();
      if (!res.ok) setError(data.error ?? 'Something went wrong reading that repo.');
      else show(data as RepoAnalysis);
    } catch {
      setError('Couldn’t reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const go = () => {
    if (!a) return;
    const id = importProject(
      {
        repo: a.repo,
        url: a.url,
        framework: a.frameworks.find((f) => f.supported === fw)?.label ?? FRAMEWORKS.find((f) => f.id === fw)?.label ?? null,
        agents: a.agents,
        tools: a.tools,
        secrets: a.secrets,
        files: a.fileCount,
        screens: a.screens.found ? a.screens.label : genScreens ? 'generate from the plan' : null,
        tests: a.tests.found,
      },
      fw,
    );
    router.push(`/p/${id}?tab=plan`);
  };

  return (
    <div className="min-h-screen">
      <WorkspaceBar />
      <main className="mx-auto max-w-[1160px] px-5 py-8">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1">
            <div className="text-[13px] text-ink2">
              <Link href="/home" className="hover:text-ink">
                Home
              </Link>{' '}
              / New project
            </div>
            <h1 className="mt-1 text-[28px] font-semibold tracking-tight">Import a project</h1>
            <p className="mt-1 max-w-2xl text-[14.5px] text-ink2">
              Bring an app or agents you already have. Your code stays in your repo; Architect works on a branch and opens pull requests.
            </p>
          </div>
          <Chip tone="ok" icon={<Check className="h-3 w-3" />}>
            GitHub: {github ?? 'connected'}
          </Chip>
        </div>

        <div className="mt-7 grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            <Card>
              <label htmlFor="repo" className="text-[13.5px] font-semibold">
                Any public GitHub repo
              </label>
              <form
                className="mt-2 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void analyze(input);
                }}
              >
                <input id="repo" className={inputCls} value={input} onChange={(e) => setInput(e.target.value)} placeholder="owner/name or a github.com link" />
                <Button type="submit" variant="primary" loading={busy} icon={<Search className="h-4 w-4" />} aria-label="Read the repo">
                  Read
                </Button>
              </form>
              <div className="mt-3 text-[12px] text-ink2">Try one:</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {EXAMPLES.map((e) => (
                  <button key={e} onClick={() => analyze(e)} className="rounded-full border border-line2 px-2.5 py-1 font-mono text-[11.5px] text-ink2 hover:border-ink3 hover:text-ink">
                    {e}
                  </button>
                ))}
              </div>
            </Card>
            <Card pad={false}>
              <div className="border-b border-line px-4 py-3">
                <div className="text-[13.5px] font-semibold">Your repositories</div>
                <div className="text-[12px] text-ink2">From the connected GitHub account (demo data)</div>
              </div>
              <ul>
                {DEMO_REPOS.map((d) => (
                  <li key={d.name}>
                    <button
                      onClick={() => analyze(d.name)}
                      className={cn('flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left last:border-0 hover:bg-surface2', a?.repo === d.name && 'bg-accent-soft')}
                    >
                      <FolderGit2 className="h-4 w-4 shrink-0 text-ink2" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-mono text-[12.5px] font-medium">{d.name}</span>
                        <span className="block text-[12px] text-ink2">{d.meta}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <div className="min-w-0">
            {busy ? (
              <Card className="flex min-h-[340px] flex-col items-center justify-center gap-3 text-[14px] text-ink2">
                <Loader2 className="h-6 w-6 animate-spin text-accent" />
                Reading {input}…
              </Card>
            ) : error ? (
              <Card className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-center">
                <AlertTriangle className="h-6 w-6 text-bad" />
                <div className="max-w-md text-[14px] text-ink">{error}</div>
              </Card>
            ) : a ? (
              <Card pad={false}>
                <div className="flex flex-wrap items-start gap-3 border-b border-line px-6 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] text-ink2">What we found in</div>
                    <a href={a.url} target="_blank" rel="noreferrer" className="font-mono text-[16px] font-semibold hover:underline">
                      {a.repo}
                    </a>
                    {a.description && <div className="mt-0.5 text-[13px] text-ink2">{a.description}</div>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {a.languages.map((l) => (
                      <Chip key={l} tone="outline">
                        {l}
                      </Chip>
                    ))}
                    {a.stars !== null && (
                      <Chip tone="neutral" icon={<Star className="h-3 w-3" />}>
                        {a.stars.toLocaleString('en-US')}
                      </Chip>
                    )}
                    {a.fileCount !== null && <Chip tone="neutral">{a.fileCount} files</Chip>}
                  </div>
                </div>
                <dl className="grid divide-y divide-line">
                  <Row label="Framework">
                    {a.frameworks.length ? (
                      <div className="grid gap-2">
                        <div className="flex flex-wrap gap-1.5">
                          {a.frameworks.map((f) => (
                            <Chip key={f.id} tone={f.supported ? 'ok' : 'neutral'} title={f.evidence}>
                              {f.label} · {f.evidence}
                            </Chip>
                          ))}
                        </div>
                        <label className="flex flex-wrap items-center gap-2 text-[13px] text-ink2">
                          Architect will work in
                          <select className="h-8 rounded-lg border border-line2 bg-surface px-2 text-[13px] text-ink" value={fw} onChange={(e) => setFw(e.target.value as FrameworkId)}>
                            {FRAMEWORKS.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.label}
                                {f.id === a.primary ? ' (keep yours)' : ''}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    ) : (
                      <span className="text-ink2">None found. Architect can add one, or wrap your existing code as agents.</span>
                    )}
                  </Row>
                  <Row label="Agents">
                    {a.agents.length ? (
                      <div>
                        {a.agents.length} found:
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {a.agents.map((x) => (
                            <span key={x} className="rounded border border-line bg-surface2 px-1.5 py-0.5 font-mono text-[11.5px]">
                              {x}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <span className="text-ink2">{a.partial ? 'Couldn’t list files this time (see the note below).' : 'No agent files by name. Architect maps them from agent.yaml once you describe them.'}</span>
                    )}
                  </Row>
                  <Row label="Tools and data">{a.tools.length ? a.tools.join(' · ') : <span className="text-ink2">None found in the dependencies</span>}</Row>
                  <Row label="Screens">
                    {a.screens.found ? (
                      <span>{a.screens.label} found. Architect keeps them.</span>
                    ) : (
                      <label className="flex items-center gap-3">
                        <span className="flex-1 text-ink2">None found. Generate screens from the plan?</span>
                        <Toggle checked={genScreens} onChange={setGenScreens} label="Generate screens" />
                      </label>
                    )}
                  </Row>
                  <Row label="Secret keys it needs">
                    {a.secrets.length ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {a.secrets.map((k) => (
                          <span key={k} className="inline-flex items-center gap-1 rounded border border-line bg-surface2 px-1.5 py-0.5 font-mono text-[11.5px]">
                            <KeyRound className="h-3 w-3 text-ink3" /> {k}
                          </span>
                        ))}
                        <span className="text-[12px] text-ink2">· you add the values later, stored encrypted</span>
                      </div>
                    ) : (
                      <span className="text-ink2">No .env example found</span>
                    )}
                  </Row>
                  <Row label="Tests">
                    <label className="flex items-center gap-3">
                      <span className="flex-1 text-ink2">
                        {a.tests.found ? `${a.tests.count || 'Some'} test files, none check the agents’ answers.` : 'None found.'} Draft a starter Answer Key from the README and sample data, for your expert to confirm?
                      </span>
                      <Toggle checked={draftKey} onChange={setDraftKey} label="Draft a starter Answer Key" />
                    </label>
                  </Row>
                </dl>
                {a.notes.length > 0 && (
                  <div className="mx-6 mb-2 mt-1 flex gap-2 rounded-lg bg-surface2 px-3 py-2 text-[12.5px] text-ink2">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{a.notes.join(' ')}</span>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-3 rounded-b-xl border-t border-line bg-surface2 px-6 py-4">
                  <span className="flex-1 text-[13px] text-ink2">Next: a one-page plan that starts from what’s already there, so you only approve what changes.</span>
                  <Button variant="ghost" onClick={() => setA(null)}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={go} icon={<ArrowRight className="h-4 w-4" />}>
                    Import and plan
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="flex min-h-[340px] flex-col items-center justify-center gap-2 px-8 text-center">
                <FolderGit2 className="h-8 w-8 text-ink3" />
                <div className="text-[16px] font-semibold">Pick a repo to read</div>
                <p className="max-w-md text-[13.5px] text-ink2">
                  Architect reads the dependencies, file layout and README to find the agent framework, the agents, the tools and data they use, and what’s missing before launch.
                </p>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 px-6 py-3.5 text-[13.5px] sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-4">
      <dt className="font-semibold">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
