'use client';

import { useState } from 'react';
import { GitPullRequest, Loader2 } from 'lucide-react';
import { useApp } from '@/lib/store';
import { githubUrl, pushToGitHub, useServer } from '@/lib/account';
import { generateFiles } from '@/lib/codegen';
import type { ChangeReceipt, Project } from '@/lib/types';
import { branchFor } from '@/lib/utils';
import { Button } from '@/components/ui';

function prBody(p: Project, ch: ChangeReceipt) {
  const files = ch.files.map((f) => `- \`${f.path}\` (+${f.add} −${f.del})`).join('\n');
  return [
    `## Change #${ch.n}: ${ch.title}`,
    '',
    `**Proof:** ${ch.before} → ${ch.after} examples match the Answer Key · fixed ${ch.fixed} · broke ${ch.broke}`,
    '',
    '**Files changed**',
    files,
    '',
    'Every example in the Answer Key (`tests/answer_key.json`) was rerun on this change. The proof workflow (`.github/workflows/proof.yml`) reruns them on this pull request.',
    '',
    `_Opened by Architect 2.0 for ${p.name}._`,
  ].join('\n');
}

/**
 * Real GitHub actions for a project when GitHub is connected: push the code to a new repo and open
 * real pull requests for change receipts. Falls back to the simulated versions in demo mode.
 */
export function useGitHub(p: Project) {
  const { features, user } = useServer();
  const recordPush = useApp((s) => s.recordPush);
  const recordPullRequest = useApp((s) => s.recordPullRequest);
  const openPullRequest = useApp((s) => s.openPullRequest);
  const toast = useApp((s) => s.toast);
  const [busy, setBusy] = useState<string | null>(null);
  const real = features.github;
  const canPush = !!user?.github?.canPush;
  const connectHref = githubUrl('connect', `/p/${p.id}/code`);
  const repoName = p.github?.repo.split('/')[1] ?? p.repo.split('/')[1] ?? 'architect-app';

  const fail = (e: unknown) => {
    const err = e as Error & { data?: { needConnect?: boolean } };
    if (err.data?.needConnect) {
      window.location.href = connectHref;
      return;
    }
    toast(err.message || 'GitHub push failed.', 'bad');
  };

  const pushVersion = async (version: number, message: string) => {
    const r = await pushToGitHub({
      repo: p.github?.repo ?? null,
      name: repoName,
      description: `${p.name} · built with Architect 2.0`,
      files: generateFiles(p, version),
      message,
    });
    recordPush(p.id, { repo: r.repo, url: r.repoUrl, commitUrl: r.commitUrl });
    return r;
  };

  const push = async () => {
    if (!canPush) {
      window.location.href = connectHref;
      return;
    }
    setBusy('push');
    try {
      const r = await pushVersion(p.version, `Architect: ${p.name} v${p.version}`);
      toast(`Code pushed to ${r.repo}.`, 'ok');
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  const openPR = async (changeId: string) => {
    const ch = p.changes.find((c) => c.id === changeId);
    if (!ch) return;
    if (!real) return openPullRequest(p.id, changeId);
    if (!canPush) {
      window.location.href = connectHref;
      return;
    }
    setBusy(changeId);
    try {
      let repo = p.github?.repo ?? null;
      if (!repo) repo = (await pushVersion(ch.versionFrom, `Architect: ${p.name} before change #${ch.n}`)).repo;
      const r = await pushToGitHub({
        repo,
        name: repoName,
        description: '',
        files: generateFiles(p, ch.versionTo),
        message: `${ch.title}\n\nProof: ${ch.before} → ${ch.after} (fixed ${ch.fixed}, broke ${ch.broke})`,
        branch: branchFor(ch.title),
        pr: { title: ch.title, body: prBody(p, ch) },
      });
      if (r.pr) recordPullRequest(p.id, changeId, r.pr);
      else toast('Pushed the branch, but GitHub did not open a pull request.', 'bad');
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  return { real, canPush, connected: !!user?.github, busy, push, openPR, connectHref };
}

/** "Commit and open PR" for a change receipt: a real pull request when GitHub is connected. */
export function PRButton({ p, ch, dark }: { p: Project; ch: ChangeReceipt; dark?: boolean }) {
  const gh = useGitHub(p);
  if (ch.committed) {
    const label = `PR #${ch.pr} open`;
    const cls = dark
      ? 'flex items-center gap-1 rounded-md bg-ok-soft px-2 py-0.5 text-ok'
      : 'inline-flex h-8 items-center gap-1.5 rounded-lg border border-ok-line bg-ok-soft px-3 text-[12.5px] font-medium text-ok';
    return ch.prUrl ? (
      <a href={ch.prUrl} target="_blank" rel="noreferrer" className={cls + ' hover:underline'}>
        <GitPullRequest className="h-3.5 w-3.5" /> {label} ↗
      </a>
    ) : (
      <span className={cls}>
        <GitPullRequest className="h-3.5 w-3.5" /> {label}
      </span>
    );
  }
  const busy = gh.busy === ch.id;
  const text = gh.real && !gh.canPush ? 'Connect GitHub to open PR' : 'Commit and open PR';
  return dark ? (
    <button
      onClick={() => gh.openPR(ch.id)}
      disabled={busy}
      className="flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 font-medium text-on-accent hover:brightness-110 disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GitPullRequest className="h-3.5 w-3.5" />} {text}
    </button>
  ) : (
    <Button size="sm" variant="primary" loading={busy} onClick={() => gh.openPR(ch.id)} icon={<GitPullRequest className="h-3.5 w-3.5" />}>
      {text}
    </Button>
  );
}
