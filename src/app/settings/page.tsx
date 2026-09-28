'use client';

import { useEffect, useState } from 'react';
import { Check, Download, Lock, ShieldCheck, Zap } from 'lucide-react';
import { useApp } from '@/lib/store';
import { PEOPLE } from '@/lib/seed';
import { githubUrl, useServer } from '@/lib/account';
import type { LaunchRules } from '@/lib/types';
import { RequireAuth, WorkspaceBar, roleLabel } from '@/components/shell';
import { Avatar, Button, Card, Chip, Toggle } from '@/components/ui';
import { cn, dateLabel, clock } from '@/lib/utils';

type Section = 'rules' | 'members' | 'connections' | 'audit' | 'usage';

export default function SettingsPage() {
  return (
    <RequireAuth>
      <Settings />
    </RequireAuth>
  );
}

function Settings() {
  const viewAs = useApp((s) => s.viewAs);
  const [section, setSection] = useState<Section>('rules');
  const items: [Section, string][] = [
    ['rules', 'Launch rules'],
    ['members', 'Members and roles'],
    ['connections', 'Connections'],
    ['audit', 'Audit trail'],
    ['usage', 'Credits and usage'],
  ];
  useEffect(() => {
    const h = window.location.hash.replace('#', '') as Section;
    if (items.some(([id]) => id === h)) setSection(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="min-h-screen">
      <WorkspaceBar />
      <main className="mx-auto grid max-w-[1160px] gap-6 px-5 py-8 md:grid-cols-[210px_minmax(0,1fr)]">
        <nav className="flex gap-1 overflow-x-auto md:flex-col" aria-label="Settings">
          {items.map(([id, label]) => (
            <button
              key={id}
              onClick={() => {
                setSection(id);
                history.replaceState(null, '', `#${id}`);
              }}
              className={cn(
                'whitespace-nowrap rounded-lg px-3 py-2 text-left text-[13.5px]',
                section === id ? 'bg-surface font-semibold text-ink shadow-card' : 'text-ink2 hover:bg-sunken',
              )}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="min-w-0">
          {section === 'rules' && <RulesEditor canEdit={viewAs === 'approver'} />}
          {section === 'members' && <Members />}
          {section === 'connections' && <Connections />}
          {section === 'audit' && <Audit />}
          {section === 'usage' && <Usage />}
        </div>
      </main>
    </div>
  );
}

function RulesEditor({ canEdit }: { canEdit: boolean }) {
  const rules = useApp((s) => s.workspace!.rules);
  const ws = useApp((s) => s.workspace!);
  const updateRules = useApp((s) => s.updateRules);
  const toast = useApp((s) => s.toast);
  const setViewAs = useApp((s) => s.setViewAs);
  const [draft, setDraft] = useState<LaunchRules>(rules);
  useEffect(() => setDraft(rules), [rules]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(rules);
  const set = (patch: Partial<LaunchRules>) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight">Launch rules</h1>
        <p className="mt-1 text-[14px] text-ink2">Set once. Checked automatically on every launch request and shown in every Launch Pack.</p>
      </div>
      {!canEdit && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface2 px-4 py-3 text-[13px] text-ink2">
          <Lock className="h-4 w-4" />
          <span className="flex-1">Only approvers can change launch rules. Builders see them so there are no surprises.</span>
          <Button size="sm" onClick={() => setViewAs('approver')}>
            See it as Farah
          </Button>
        </div>
      )}
      <Card pad={false}>
        <ul>
          <Row canEdit={canEdit} on={draft.highRiskAll} onToggle={(v) => set({ highRiskAll: v })}>
            <b>All high-risk examples</b> in the Answer Key must pass
          </Row>
          <Row canEdit={canEdit} on={draft.minMatchOn} onToggle={(v) => set({ minMatchOn: v })}>
            Overall match with the Answer Key is at least{' '}
            <input
              type="number"
              min={50}
              max={100}
              value={draft.minMatch}
              disabled={!canEdit || !draft.minMatchOn}
              onChange={(e) => set({ minMatch: Math.max(50, Math.min(100, Number(e.target.value) || 0)) })}
              className="mx-1 h-8 w-16 rounded-lg border border-line2 px-2 text-center font-mono text-[13px] disabled:bg-sunken"
              aria-label="Minimum match percent"
            />
            %
          </Row>
          <Row canEdit={canEdit} on={draft.expertReviewOn} onToggle={(v) => set({ expertReviewOn: v })}>
            An expert reviewed answers in the last{' '}
            <input
              type="number"
              min={1}
              max={90}
              value={draft.expertDays}
              disabled={!canEdit || !draft.expertReviewOn}
              onChange={(e) => set({ expertDays: Math.max(1, Math.min(90, Number(e.target.value) || 1)) })}
              className="mx-1 h-8 w-16 rounded-lg border border-line2 px-2 text-center font-mono text-[13px] disabled:bg-sunken"
              aria-label="Days since expert review"
            />
            days
          </Row>
          <Row canEdit={canEdit} on={draft.piiMaskOn} onToggle={(v) => set({ piiMaskOn: v })}>
            <b>Personal data</b> is masked before it reaches any model
          </Row>
          <Row on locked>
            Anything going <b>Live</b> needs an approver’s decision
          </Row>
          <li className="flex items-center gap-4 bg-accent-soft/50 px-5 py-4">
            <Zap className="h-5 w-5 shrink-0 text-accent" />
            <div className="flex-1 text-[14px] leading-relaxed">
              <b>Fast lane:</b> changes that pass every rule and don’t change what data the agents can reach go to Test without waiting for approval. You’re told afterwards.
            </div>
            <Toggle checked={draft.fastLane} onChange={(v) => set({ fastLane: v })} label="Fast lane" disabled={!canEdit} />
          </li>
        </ul>
        {canEdit && (
          <div className="flex items-center justify-end gap-2 rounded-b-xl border-t border-line bg-surface2 px-5 py-3">
            <Button variant="ghost" disabled={!dirty} onClick={() => setDraft(rules)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!dirty}
              onClick={() => {
                updateRules(draft);
                toast('Launch rules saved. They apply to the next launch request.', 'ok');
              }}
            >
              Save rules
            </Button>
          </div>
        )}
      </Card>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <div className="text-[14px] font-semibold">Approvers</div>
          <div className="mt-2.5 flex items-center gap-2.5 text-[13.5px]">
            <Avatar initials="FS" tone="warn" size={30} /> Farah Siddiqui <span className="text-ink2">· IT and security lead</span>
          </div>
        </Card>
        <Card>
          <div className="text-[14px] font-semibold">Applies to</div>
          <p className="mt-1.5 text-[13.5px] text-ink2">Every project in {ws.name}. A project can be stricter, never looser.</p>
        </Card>
      </div>
    </div>
  );
}

function Row({
  on,
  onToggle,
  children,
  locked,
  canEdit,
}: {
  on: boolean;
  onToggle?: (v: boolean) => void;
  children: React.ReactNode;
  locked?: boolean;
  canEdit?: boolean;
}) {
  return (
    <li className="flex items-center gap-4 border-b border-line px-5 py-4 last:border-0">
      <div className="flex-1 text-[14px] leading-relaxed">{children}</div>
      {locked ? (
        <Chip tone="dark" icon={<Lock className="h-3 w-3" />}>
          always on
        </Chip>
      ) : (
        <Toggle checked={on} onChange={(v) => onToggle?.(v)} label="Rule on or off" disabled={!canEdit} />
      )}
    </li>
  );
}

function Members() {
  const projects = useApp((s) => s.projects);
  const invites = projects.flatMap((p) => p.invites.map((i) => ({ ...i, project: p.name })));
  const sees: Record<string, string> = {
    builder: 'Everything, including the code',
    reviewer: 'Answers, the Answer Key and the app. No code.',
    approver: 'Launch Packs, rules, agents and the audit trail. No code needed.',
  };
  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight">Members and roles</h1>
        <p className="mt-1 text-[14px] text-ink2">Everyone sees what their role needs. Invite people from inside a project when there is something for them to do.</p>
      </div>
      <Card pad={false}>
        <table className="w-full text-left text-[13.5px]">
          <thead className="text-[12px] text-ink2">
            <tr className="border-b border-line">
              <th className="px-4 py-2.5 font-medium">Person</th>
              <th className="px-4 py-2.5 font-medium">Role</th>
              <th className="hidden px-4 py-2.5 font-medium md:table-cell">Sees</th>
            </tr>
          </thead>
          <tbody>
            {PEOPLE.map((p) => (
              <tr key={p.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar initials={p.initials} size={30} tone={p.role === 'builder' ? 'accent' : p.role === 'reviewer' ? 'ok' : 'warn'} />
                    <div>
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-[12px] text-ink2">{p.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Chip tone="outline">{roleLabel(p.role)}</Chip>
                </td>
                <td className="hidden px-4 py-3 text-ink2 md:table-cell">{sees[p.role]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {invites.length > 0 && (
        <Card>
          <div className="text-[14px] font-semibold">Invites sent</div>
          <ul className="mt-2 grid gap-1.5 text-[13px] text-ink2">
            {invites.map((i, n) => (
              <li key={n}>
                {i.email} · {roleLabel(i.role)} · {i.project} · {dateLabel(i.at)}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Connections() {
  const ws = useApp((s) => s.workspace!);
  const authMode = useApp((s) => s.authMode);
  const slack = useApp((s) => s.projects.some((p) => p.slackAlerts));
  const { features, user } = useServer();
  const gh = user?.github;
  const rows: { name: string; status: string; on: boolean; detail: string; real?: boolean; action?: React.ReactNode }[] = [
    {
      name: 'Sign-in and database',
      status: features.accounts ? (authMode === 'account' ? 'Your account' : 'Available') : 'Demo mode (this browser)',
      on: features.accounts && authMode === 'account',
      real: features.accounts,
      detail: features.accounts
        ? authMode === 'account'
          ? 'Real account. Your workspace and projects are saved in Postgres.'
          : 'Create an account (sign out, then Create account) to save your work in the database.'
        : 'Add a database in Vercel (Storage → Neon) to turn on real accounts.',
    },
    {
      name: 'GitHub',
      status: gh ? `Connected as @${gh.login}` : features.github ? 'Not connected' : `Demo: ${ws.github}`,
      on: !!gh || !features.github,
      real: features.github,
      detail: gh
        ? gh.canPush
          ? 'Real connection. Architect can read your repos, create repos and open pull requests.'
          : 'Real connection for reading repos. Connect again to allow pushing code.'
        : 'Imports, commits and pull requests. Your code stays in your repos.',
      action:
        features.github && (!gh || !gh.canPush) ? (
          <Button size="sm" variant="dark" href={githubUrl('connect', '/settings#connections')}>
            {gh ? 'Allow pushing code' : 'Connect GitHub'}
          </Button>
        ) : null,
    },
    {
      name: 'AI model',
      status: features.ai === 'anthropic' ? 'Claude (Anthropic)' : features.ai === 'openai' ? 'OpenAI' : 'Scripted answers',
      on: !!features.ai,
      real: !!features.ai,
      detail: features.ai ? 'Architect answers open questions and runs the agent playground with a real model.' : 'Add an API key in Vercel to turn on real AI answers.',
    },
    { name: 'Gmail', status: 'Connected (sample)', on: true, detail: 'Read the claims inbox, create drafts. Never sends.' },
    { name: 'Claims database', status: 'Connected, read only (sample)', on: true, detail: 'The insurer’s claims data, through a read-only user.' },
    { name: 'Slack', status: slack ? 'Connected (sample)' : 'Not connected', on: slack, detail: 'Alerts for high-risk claims. Added when a project asks for it.' },
  ];
  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight">Connections</h1>
        <p className="mt-1 text-[14px] text-ink2">Systems your apps can reach. Every agent’s access is listed in its Launch Pack.</p>
      </div>
      <Card pad={false}>
        <ul>
          {rows.map((r) => (
            <li key={r.name} className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4 last:border-0">
              <span className={cn('flex h-8 w-8 items-center justify-center rounded-full', r.on ? 'bg-ok-soft text-ok' : 'bg-sunken text-ink3')}>
                {r.on ? <Check className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[14px] font-semibold">
                  {r.name}
                  {r.real && <Chip tone="accent" className="!py-0 text-[10.5px]">live</Chip>}
                </div>
                <div className="text-[12.5px] text-ink2">{r.detail}</div>
              </div>
              {r.action}
              <Chip tone={r.on ? 'ok' : 'neutral'}>{r.status}</Chip>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Audit() {
  const audit = useApp((s) => s.audit);
  const [who, setWho] = useState('All');
  const people = ['All', 'Arjun', 'Meera', 'Farah', 'Architect'];
  const shown = who === 'All' ? audit : audit.filter((e) => e.actor === who || (who === 'Arjun' && e.actor === 'Launch rules'));
  const exportCsv = () => {
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const csv = ['time,who,action,target,detail', ...audit.map((e) => [new Date(e.at).toISOString(), e.actor, e.action, e.target, e.detail ?? ''].map((x) => esc(String(x))).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'architect-audit-trail.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <h1 className="text-[24px] font-semibold tracking-tight">Audit trail</h1>
          <p className="mt-1 text-[14px] text-ink2">Every build, change, review, request, decision and deploy, with who did it and when.</p>
        </div>
        <Button size="sm" icon={<Download className="h-3.5 w-3.5" />} onClick={exportCsv} disabled={!audit.length}>
          Export CSV
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {people.map((p) => (
          <button
            key={p}
            onClick={() => setWho(p)}
            className={cn('rounded-full border px-3 py-1 text-[12px] font-medium', who === p ? 'border-ink bg-ink text-white' : 'border-line2 bg-surface text-ink2')}
          >
            {p}
          </button>
        ))}
      </div>
      <Card pad={false}>
        {shown.length ? (
          <table className="w-full text-left text-[13px]">
            <thead className="text-[12px] text-ink2">
              <tr className="border-b border-line">
                <th className="px-4 py-2.5 font-medium">When</th>
                <th className="px-4 py-2.5 font-medium">Who</th>
                <th className="px-4 py-2.5 font-medium">What</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((e) => (
                <tr key={e.id} className="border-b border-line last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[12px] text-ink2">
                    {dateLabel(e.at)} {clock(e.at)}
                  </td>
                  <td className="px-4 py-2.5 font-medium">{e.actor}</td>
                  <td className="px-4 py-2.5">
                    {e.action} <span className="font-medium">{e.target}</span>
                    {e.detail && <span className="text-ink2"> · {e.detail}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-4 py-8 text-center text-[13px] text-ink2">Nothing recorded yet.</div>
        )}
      </Card>
    </div>
  );
}

function Usage() {
  const ws = useApp((s) => s.workspace!);
  const projects = useApp((s) => s.projects);
  const builds = projects.filter((p) => p.build.status === 'done').length;
  const runs = projects.reduce((n, p) => n + p.runs.length, 0);
  const runCredits = projects.reduce((n, p) => n + p.runs.reduce((m, r) => m + r.credits, 0), 0);
  const changes = projects.reduce((n, p) => n + p.changes.length, 0);
  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight">Credits and usage</h1>
        <p className="mt-1 text-[14px] text-ink2">Every build and test run shows its cost before it starts. No surprises at the end of the month.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <div className="text-[12px] text-ink2">Credits left</div>
          <div className="mt-0.5 text-[26px] font-semibold">{ws.credits.toLocaleString('en-US')}</div>
        </Card>
        <Card>
          <div className="text-[12px] text-ink2">Builds</div>
          <div className="mt-0.5 text-[26px] font-semibold">{builds}</div>
          <div className="text-[12px] text-ink2">{builds * 140} credits</div>
        </Card>
        <Card>
          <div className="text-[12px] text-ink2">Test runs and changes</div>
          <div className="mt-0.5 text-[26px] font-semibold">
            {runs} · {changes}
          </div>
          <div className="text-[12px] text-ink2">{runCredits + changes * 9} credits</div>
        </Card>
      </div>
    </div>
  );
}
