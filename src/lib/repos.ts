'use client';

import { useEffect, useState } from 'react';
import { listMyRepos, useServer } from './account';
import { FRAMEWORKS } from './seed';
import type { FrameworkId } from './types';
import type { RepoAnalysis } from '@/app/api/github/analyze/route';

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
export const DEMO_REPOS: { name: string; meta: string; analysis: RepoAnalysis }[] = [
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

/** A GitHub repo written as owner/name or as a github.com link. */
export const REPO = /^(?:(?:https?:\/\/)?(?:www\.)?github\.com\/)?([\w-]+\/[\w.-]+?)(?:\.git)?(?:[/?#].*)?$/i;

/** The repo in a pasted owner/name or github.com link, or null. */
export function repoFrom(text: string): string | null {
  return text.trim().match(REPO)?.[1] ?? null;
}

export type RepoChoice = { name: string; meta: string };

/** Your repos when GitHub is connected; otherwise the demo account's repos. */
export function useRepoChoices(): RepoChoice[] {
  const { user } = useServer();
  const [mine, setMine] = useState<RepoChoice[] | null>(null);
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
  return mine ?? DEMO_REPOS.map(({ name, meta }) => ({ name, meta }));
}
