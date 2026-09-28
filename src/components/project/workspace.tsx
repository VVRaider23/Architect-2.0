'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ClipboardCheck, ExternalLink, Eye, FileCheck2, MessageSquare, UserPlus } from 'lucide-react';
import { useApp, BUILD_STEPS, STEP_MS } from '@/lib/store';
import { useNow } from '@/lib/hooks';
import { useUI } from '@/lib/ui';
import { latestRun } from '@/lib/engine';
import { BUILD_TABS, STEP_OF, TABS_FOR, arrivedFlags, launchPath, nextAction, openTasks, pathHint, pendingRequest, type StepKey } from '@/lib/stage';
import type { Project, Role, Tab } from '@/lib/types';
import { Logo, SaveBadge, UserMenu, ViewAsSwitch } from '@/components/shell';
import { Button, Chip } from '@/components/ui';
import { cn } from '@/lib/utils';
import { ChatPanel } from './chat';
import { PlanTab } from './plan-tab';
import { PreviewTab } from './preview-tab';
import { AgentsTab } from './agents-tab';
import { CodeTab } from './code-tab';
import { ProofTab } from './proof-tab';
import { ShipTab, SignoffTab } from './launch-tab';
import { LiveTab } from './live-tab';
import { InviteModal, ReplayDrawer, SignoffModal } from './overlays';
import { BuildSubnav, JourneyBar } from './journey';

function defaultTab(p: Project, role: Role): Tab {
  if (role === 'reviewer') return 'preview';
  if (role === 'approver') return pendingRequest(p) ? 'signoff' : 'proof';
  if (!p.planApproved) return 'plan';
  if (p.build.status !== 'done') return 'preview';
  return 'proof';
}

/** The screen a step opens: the step's own screen, or for Build the most useful Build screen. */
function tabForStep(step: StepKey, p: Project, role: Role, current: Tab): Tab {
  const allowed = TABS_FOR[role];
  if (step !== 'build') return (Object.keys(STEP_OF) as Tab[]).find((t) => STEP_OF[t] === step)!;
  if (STEP_OF[current] === 'build') return current;
  const preferred: Tab = p.build.status === 'done' || p.planApproved ? 'preview' : 'plan';
  return allowed.includes(preferred) ? preferred : BUILD_TABS.find((t) => allowed.includes(t)) ?? 'proof';
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
    bind(p.id, initialTab && TABS_FOR[viewAs].includes(initialTab) ? initialTab : defaultTab(p, viewAs));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.id]);

  // A link to a specific screen (?tab=…) wins, even when this project is already open.
  useEffect(() => {
    if (bound && initialTab && TABS_FOR[viewAs].includes(initialTab)) setTab(initialTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTab, bound]);

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
    if (bound && !TABS_FOR[viewAs].includes(tab)) setTab(defaultTab(p, viewAs));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewAs, bound]);

  const run = latestRun(p);
  const allowed = TABS_FOR[viewAs];
  const steps = launchPath(p, ws, now);
  const stepState = (k: StepKey) => steps.find((s) => s.key === k)?.state;

  return (
    <div className="flex h-screen min-h-0 flex-col">
      <TopBar p={p} now={now} />
      <JourneyBar
        steps={steps}
        tab={tab}
        allowed={allowed}
        failing={!!run && run.passed < run.total}
        hint={viewAs === 'builder' ? pathHint(p, ws, now) : undefined}
        onGo={(step) => setTab(tabForStep(step, p, viewAs, tab))}
      />
      <div className="flex min-h-0 flex-1">
        {viewAs === 'builder' && <ChatPanel p={p} />}
        <main className="flex min-w-0 flex-1 flex-col">
          {viewAs === 'builder' && (
            <div className="flex h-10 shrink-0 items-center border-b border-line bg-surface px-3 lg:hidden">
              <button className="flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-[12.5px]" onClick={() => setChatOpen(true)}>
                <MessageSquare className="h-3.5 w-3.5" /> Chat with Architect
              </button>
            </div>
          )}
          {STEP_OF[tab] === 'build' && <BuildSubnav tab={tab} allowed={allowed} onTab={setTab} />}
          <div className={cn('scroll-thin min-h-0 flex-1', tab === 'code' || tab === 'preview' ? 'overflow-hidden' : 'overflow-y-auto')} role="tabpanel">
            {bound && (
              <>
                {tab === 'plan' && <PlanTab p={p} />}
                {tab === 'preview' && <PreviewTab p={p} />}
                {tab === 'agents' && <AgentsTab p={p} />}
                {tab === 'code' && <CodeTab p={p} />}
                {tab === 'proof' && <ProofTab p={p} state={stepState('prove')} />}
                {tab === 'signoff' && <SignoffTab p={p} state={stepState('signoff')} />}
                {tab === 'ship' && <ShipTab p={p} state={stepState('ship')} />}
                {tab === 'live' && <LiveTab p={p} state={stepState('learn')} />}
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
        if (deploy(p.id, action.env)) setTab('ship');
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
        <Chip tone="outline" className="font-mono" title={`Version ${p.version}. Every change makes a new version.`}>
          v{p.version}
        </Chip>
      </nav>
      <div className="flex-1" />
      <SaveBadge />
      {viewAs === 'builder' && (
        <>
          <Button size="sm" variant="ghost" icon={<UserPlus className="h-3.5 w-3.5" />} onClick={() => setInviteOpen(p.id)} className="hidden sm:inline-flex">
            Invite
          </Button>
          <span data-tour="next-action" className="rounded-lg">
            <Button
              size="sm"
              variant={secondary ? 'secondary' : 'primary'}
              onClick={main}
              icon={action.kind === 'waiting_review' || action.kind === 'waiting_decision' ? <Eye className="h-3.5 w-3.5" /> : action.kind === 'open_live' ? <ExternalLink className="h-3.5 w-3.5" /> : undefined}
              title={action.kind === 'waiting_review' ? 'See it as Meera (demo switch)' : action.kind === 'waiting_decision' ? 'See it as Farah (demo switch)' : undefined}
            >
              {action.label}
            </Button>
          </span>
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
