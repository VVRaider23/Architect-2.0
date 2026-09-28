'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ClipboardCheck, ExternalLink, Eye, FileCheck2, MessageSquare, UserPlus } from 'lucide-react';
import { useApp, BUILD_STEPS, STEP_MS } from '@/lib/store';
import { useNow } from '@/lib/hooks';
import { useUI } from '@/lib/ui';
import { latestRun } from '@/lib/engine';
import { arrivedFlags, launchPath, nextAction, openTasks, pathHint, pendingRequest, stageLabel } from '@/lib/stage';
import type { Project, Role, Tab } from '@/lib/types';
import { Logo, UserMenu, ViewAsSwitch } from '@/components/shell';
import { LaunchPathBar } from '@/components/domain';
import { Button, Chip } from '@/components/ui';
import { cn } from '@/lib/utils';
import { ChatPanel } from './chat';
import { PlanTab } from './plan-tab';
import { PreviewTab } from './preview-tab';
import { AgentsTab } from './agents-tab';
import { CodeTab } from './code-tab';
import { ProofTab } from './proof-tab';
import { LaunchTab } from './launch-tab';
import { LiveTab } from './live-tab';
import { InviteModal, ReplayDrawer, SignoffModal } from './overlays';

const TABS: Record<Role, Tab[]> = {
  builder: ['plan', 'preview', 'agents', 'code', 'proof', 'launch', 'live'],
  reviewer: ['preview', 'proof', 'live'],
  approver: ['plan', 'agents', 'proof', 'launch', 'live'],
};

const TAB_LABEL: Record<Tab, string> = {
  plan: 'Plan',
  preview: 'Preview',
  agents: 'Agents',
  code: 'Code',
  proof: 'Proof',
  launch: 'Launch',
  live: 'Live',
};

function defaultTab(p: Project, role: Role): Tab {
  if (role === 'reviewer') return 'preview';
  if (role === 'approver') return pendingRequest(p) ? 'launch' : 'proof';
  if (!p.planApproved) return 'plan';
  if (p.build.status !== 'done') return 'preview';
  return 'proof';
}

export function ProjectWorkspace({ p, initialTab }: { p: Project; initialTab?: Tab }) {
  const viewAs = useApp((s) => s.viewAs);
  const ws = useApp((s) => s.workspace);
  const completeBuild = useApp((s) => s.completeBuild);
  const tab = useUI((s) => s.tab);
  const setTab = useUI((s) => s.setTab);
  const bind = useUI((s) => s.bind);
  const setChatOpen = useUI((s) => s.setChatOpen);
  const now = useNow(1000);

  // Bind the screen state to this project once.
  const bound = useUI((s) => s.projectId === p.id);
  useEffect(() => {
    bind(p.id, initialTab && TABS[viewAs].includes(initialTab) ? initialTab : defaultTab(p, viewAs));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.id]);

  // Finish the build when its time is up.
  useEffect(() => {
    if (p.build.status === 'building' && p.build.startedAt && now - p.build.startedAt >= STEP_MS * BUILD_STEPS.length) completeBuild(p.id);
  }, [now, p.build.status, p.build.startedAt, p.id, completeBuild]);

  // Move to the right tab when the project reaches a new stage.
  const prev = useRef({ plan: !!p.plan, approved: p.planApproved, build: p.build.status });
  useEffect(() => {
    const was = prev.current;
    if (!was.plan && p.plan) setTab('plan');
    if (!was.approved && p.planApproved) setTab('preview');
    if (was.build === 'building' && p.build.status === 'done') {
      useUI.getState().setTestMode(true);
      setTab('preview');
    }
    prev.current = { plan: !!p.plan, approved: p.planApproved, build: p.build.status };
  }, [p.plan, p.planApproved, p.build.status, setTab]);

  // Tell the builder when a flag arrives from people using the app.
  const toast = useApp((s) => s.toast);
  const arrived = arrivedFlags(p, now);
  const seen = useRef(arrived.length);
  useEffect(() => {
    if (arrived.length > seen.current && viewAs === 'builder') {
      const f = [...arrived].sort((a, b) => b.at - a.at)[0];
      toast(`New flag from ${f.by.split(',')[0]}: ${f.claim.title}`);
    }
    seen.current = arrived.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrived.length]);

  // Keep the tab valid for the current role.
  useEffect(() => {
    if (bound && !TABS[viewAs].includes(tab)) setTab(defaultTab(p, viewAs));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewAs, bound]);

  const run = latestRun(p);
  const flags = arrivedFlags(p, now).filter((f) => f.status === 'open').length;
  const pending = pendingRequest(p);
  const tabs = TABS[viewAs];

  const badge = (t: Tab) => {
    if (t === 'proof' && run) return `${run.passed}/${run.total}`;
    if (t === 'live' && flags) return String(flags);
    if (t === 'launch' && pending) return '1';
    return null;
  };

  return (
    <div className="flex h-screen min-h-0 flex-col">
      <TopBar p={p} now={now} />
      <LaunchPathBar
        steps={launchPath(p, ws, now)}
        hint={viewAs === 'builder' ? pathHint(p, ws, now) : undefined}
      />
      <div className="flex min-h-0 flex-1">
        {viewAs === 'builder' && <ChatPanel p={p} />}
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-11 shrink-0 items-end gap-1 overflow-x-auto border-b border-line bg-surface px-3" role="tablist" aria-label="Project views">
            {viewAs === 'builder' && (
              <button className="mb-1.5 mr-1 flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-[12.5px] lg:hidden" onClick={() => setChatOpen(true)}>
                <MessageSquare className="h-3.5 w-3.5" /> Chat
              </button>
            )}
            {tabs.map((t) => {
              const b = badge(t);
              const on = tab === t;
              return (
                <button
                  key={t}
                  role="tab"
                  aria-selected={on}
                  onClick={() => setTab(t)}
                  className={cn(
                    'flex h-11 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-[13.5px]',
                    on ? 'border-accent font-semibold text-ink' : 'border-transparent text-ink2 hover:text-ink',
                  )}
                >
                  {TAB_LABEL[t]}
                  {b && (
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-[1px] font-mono text-[10.5px]',
                        t === 'proof' && run && run.passed < run.total ? 'bg-bad-soft text-bad' : t === 'live' ? 'bg-bad-soft text-bad' : t === 'launch' ? 'bg-warn-soft text-warn' : 'bg-ok-soft text-ok',
                      )}
                    >
                      {b}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className={cn('scroll-thin min-h-0 flex-1', tab === 'code' || tab === 'preview' ? 'overflow-hidden' : 'overflow-y-auto')} role="tabpanel">
            {bound && (
              <>
                {tab === 'plan' && <PlanTab p={p} />}
                {tab === 'preview' && <PreviewTab p={p} />}
                {tab === 'agents' && <AgentsTab p={p} />}
                {tab === 'code' && <CodeTab p={p} />}
                {tab === 'proof' && <ProofTab p={p} />}
                {tab === 'launch' && <LaunchTab p={p} />}
                {tab === 'live' && <LiveTab p={p} />}
              </>
            )}
          </div>
        </main>
      </div>
      <InviteModal p={p} />
      <SignoffModal p={p} />
      <ReplayDrawer p={p} />
    </div>
  );
}

function TopBar({ p, now }: { p: Project; now: number }) {
  const router = useRouter();
  const ws = useApp((s) => s.workspace);
  const viewAs = useApp((s) => s.viewAs);
  const setViewAs = useApp((s) => s.setViewAs);
  const setInviteOpen = useApp((s) => s.setInviteOpen);
  const draftPlan = useApp((s) => s.draftPlan);
  const approvePlan = useApp((s) => s.approvePlan);
  const skipBuild = useApp((s) => s.skipBuild);
  const sendChat = useApp((s) => s.sendChat);
  const deploy = useApp((s) => s.deploy);
  const toast = useApp((s) => s.toast);
  const setTab = useUI((s) => s.setTab);
  const openSignoff = useUI((s) => s.openSignoff);
  const setChatOpen = useUI((s) => s.setChatOpen);
  const action = nextAction(p, ws, now);
  const pending = pendingRequest(p);
  const tasks = openTasks(p).length;

  const actAs = (role: Role, href: string, who: string) => {
    setViewAs(role);
    toast(`Now viewing as ${who} (demo switch)`);
    router.push(href);
  };

  const main = () => {
    switch (action.kind) {
      case 'draft_plan':
        return draftPlan(p.id);
      case 'approve_plan':
        return approvePlan(p.id);
      case 'skip_build':
        return skipBuild(p.id);
      case 'invite':
        return setInviteOpen(p.id);
      case 'waiting_review':
        return actAs('reviewer', `/p/${p.id}/review`, 'Meera');
      case 'waiting_decision':
        return actAs('approver', `/p/${p.id}/requests/${action.requestId}`, 'Farah');
      case 'flags':
        return setTab('live');
      case 'fix':
        setChatOpen(true);
        return sendChat(
          p.id,
          p.version < 2 ? 'Fix the misses: theft claims need a police report number before approval.' : 'Fix the water damage misses: over $5,000 needs photos.',
        );
      case 'request':
        return openSignoff(action.env);
      case 'deploy':
        if (deploy(p.id, action.env)) setTab('launch');
        return;
      case 'open_live':
        window.open(`/apps/${p.id}?env=live`, '_blank');
        return;
    }
  };

  const secondary = action.kind === 'waiting_review' || action.kind === 'waiting_decision' || action.kind === 'open_live';

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-4">
      <Logo />
      <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-2 text-[13.5px] md:flex">
        <Link href="/home" className="truncate text-ink2 hover:text-ink">
          {ws?.name ?? 'Workspace'}
        </Link>
        <span className="text-ink3">/</span>
        <span className="truncate font-semibold">{p.name}</span>
        <Chip tone="outline" className="font-mono">
          v{p.version}
        </Chip>
        <Chip tone={p.deployments.live.status === 'running' ? 'ok' : pending ? 'warn' : 'accent'} className="hidden lg:inline-flex">
          {stageLabel(p, now)}
        </Chip>
      </nav>
      <div className="flex-1" />
      {viewAs === 'builder' && (
        <>
          <Button size="sm" variant="ghost" icon={<UserPlus className="h-3.5 w-3.5" />} onClick={() => setInviteOpen(p.id)} className="hidden sm:inline-flex">
            Invite
          </Button>
          <Button
            size="sm"
            variant={secondary ? 'secondary' : 'primary'}
            onClick={main}
            icon={action.kind === 'waiting_review' || action.kind === 'waiting_decision' ? <Eye className="h-3.5 w-3.5" /> : action.kind === 'open_live' ? <ExternalLink className="h-3.5 w-3.5" /> : undefined}
            title={action.kind === 'waiting_review' ? 'See it as Meera (demo switch)' : action.kind === 'waiting_decision' ? 'See it as Farah (demo switch)' : undefined}
          >
            {action.label}
          </Button>
        </>
      )}
      {viewAs === 'reviewer' && (
        <Button size="sm" variant={tasks ? 'primary' : 'secondary'} href={`/p/${p.id}/review`} icon={<ClipboardCheck className="h-3.5 w-3.5" />}>
          {tasks ? `Review queue · ${tasks}` : 'Review queue'}
        </Button>
      )}
      {viewAs === 'approver' && pending && (
        <Button size="sm" variant="primary" href={`/p/${p.id}/requests/${pending.id}`} icon={<FileCheck2 className="h-3.5 w-3.5" />}>
          Open Launch Pack
        </Button>
      )}
      <ViewAsSwitch
        onSwitch={(role) => {
          if (role === 'reviewer' && openTasks(p).length) router.push(`/p/${p.id}/review`);
          if (role === 'approver' && pending) router.push(`/p/${p.id}/requests/${pending.id}`);
        }}
      />
      <UserMenu />
    </header>
  );
}
