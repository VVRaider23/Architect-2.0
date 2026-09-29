import type { Env, LaunchRequest, LiveFlag, Project, RequestStatus, Role, RuleCheck, Tab, Workspace } from './types';
import { checkRules, latestRun } from './engine';
import { BUILD_STEPS, STEP_MS } from './store';

export const APPROVED: RequestStatus[] = ['approved', 'approved_conditions', 'fast_lane'];

/* ---------- The journey: five steps, and the screens inside each ---------- */

export type StepKey = 'build' | 'prove' | 'signoff' | 'ship' | 'learn';
export const STEP_KEYS: StepKey[] = ['build', 'prove', 'signoff', 'ship', 'learn'];

/** Which step each screen belongs to. */
export const STEP_OF: Record<Tab, StepKey> = {
  plan: 'build',
  agents: 'build',
  preview: 'build',
  code: 'build',
  proof: 'prove',
  signoff: 'signoff',
  ship: 'ship',
  live: 'learn',
};

/** The screens inside Build, in Architect's order: Plan → Agents → App → Code. */
export const BUILD_TABS: Tab[] = ['plan', 'agents', 'preview', 'code'];

export const TAB_LABEL: Record<Tab, string> = {
  plan: 'Plan',
  agents: 'Agents',
  preview: 'App',
  code: 'Code',
  proof: 'Prove',
  signoff: 'Sign off',
  ship: 'Ship',
  live: 'Learn',
};

/** One line under the Build screens, in plain words. */
export const BUILD_TAB_HINT: Partial<Record<Tab, string>> = {
  plan: 'The one-page plan (PRD). Nothing is built until you approve it.',
  agents: 'The AI workers inside your app, and what each one is allowed to do.',
  preview: 'Your app, running. Test mode runs every example through it.',
  code: 'The real code, in the framework you chose. Download it or push it to GitHub.',
};

/** Which screens each person sees. Everyone sees the whole journey; Build is trimmed to what they need. */
export const TABS_FOR: Record<Role, Tab[]> = {
  builder: ['plan', 'agents', 'preview', 'code', 'proof', 'signoff', 'ship', 'live'],
  reviewer: ['preview', 'proof', 'signoff', 'ship', 'live'],
  approver: ['plan', 'agents', 'proof', 'signoff', 'ship', 'live'],
};

/** Old links used ?tab=launch. Send them to the step that matters now. */
export function resolveTab(raw: string | null | undefined, p: Project): Tab | undefined {
  if (!raw) return undefined;
  if (raw === 'launch') return pendingRequest(p) || !p.requests.length ? 'signoff' : 'ship';
  return (Object.keys(STEP_OF) as Tab[]).includes(raw as Tab) ? (raw as Tab) : undefined;
}

/** Who a pilot or launch is for, and the conditions Farah usually sets. */
export const AUDIENCES = ['Claims team (12 people)', 'All claims handlers (40 people)', 'Everyone at Harborline'];
export const CONDITIONS = {
  test: ['Only the claims team (12 people)', 'Review again in 30 days', 'Pause if the match drops below 95%'],
  live: ['Weekly expert spot checks', 'Review again in 30 days', 'Pause if the match drops below 95%'],
};

export const STATUS_LABEL: Record<RequestStatus, string> = {
  pending: 'Waiting for decision',
  approved: 'Approved',
  approved_conditions: 'Approved with conditions',
  changes: 'Changes requested',
  rejected: 'Rejected',
  fast_lane: 'Fast lane',
};

export const ENV_LABEL: Record<Env, string> = { preview: 'Preview', test: 'Test', live: 'Live' };

export function buildStep(p: Project, now: number) {
  if (p.build.status === 'done') return BUILD_STEPS.length;
  if (p.build.status !== 'building' || !p.build.startedAt) return 0;
  return Math.min(BUILD_STEPS.length, Math.floor((now - p.build.startedAt) / STEP_MS));
}

export function approvedFor(p: Project, env: 'test' | 'live', version = p.version): LaunchRequest | undefined {
  return [...p.requests].reverse().find((r) => r.env === env && r.version === version && APPROVED.includes(r.status));
}

export function pendingRequest(p: Project): LaunchRequest | undefined {
  return [...p.requests].reverse().find((r) => r.status === 'pending');
}

export function arrivedFlags(p: Project, now: number): LiveFlag[] {
  return p.flags.filter((f) => f.at <= now);
}

export function openTasks(p: Project) {
  return p.tasks.filter((t) => !t.done);
}

export function rulesFor(p: Project, ws: Workspace | null, now: number): { checks: RuleCheck[]; pass: boolean } {
  const checks = ws ? checkRules(p, ws.rules, now) : [];
  return { checks, pass: checks.length > 0 && checks.every((c) => c.pass) };
}

const SHORT_RULE: Record<string, string> = {
  high_risk: 'high-risk examples',
  min_match: 'overall match',
  expert: 'an expert review',
  pii: 'data masking',
};

export type StepState = 'done' | 'current' | 'todo';
export interface PathStep {
  key: 'build' | 'prove' | 'signoff' | 'ship' | 'learn';
  label: string;
  state: StepState;
  sub?: string;
}

export function launchPath(p: Project, ws: Workspace | null, now: number): PathStep[] {
  const run = latestRun(p);
  const built = p.build.status === 'done';
  const { pass: rulesPass } = rulesFor(p, ws, now);
  const pending = pendingRequest(p);
  const testOk = approvedFor(p, 'test');
  const liveOk = approvedFor(p, 'live');
  const live = p.deployments.live;
  const test = p.deployments.test;
  const flags = arrivedFlags(p, now).filter((f) => f.status !== 'reviewed').length;

  const steps: PathStep[] = [];
  steps.push({
    key: 'build',
    label: 'Build',
    state: built ? 'done' : 'current',
    sub: built
      ? undefined
      : !p.plan
        ? 'planning'
        : !p.planApproved
          ? 'plan ready'
          : `${buildStep(p, now)} of ${BUILD_STEPS.length}`,
  });
  steps.push({
    key: 'prove',
    label: 'Prove',
    state: !built ? 'todo' : rulesPass ? 'done' : 'current',
    sub: run ? `${run.passed} of ${run.total}` : built ? 'first run' : undefined,
  });
  const signedOff = !!(testOk || liveOk);
  steps.push({
    key: 'signoff',
    label: 'Sign off',
    state: signedOff ? 'done' : built && (rulesPass || pending) ? 'current' : 'todo',
    sub: pending
      ? `waiting for Farah`
      : signedOff
        ? (liveOk ?? testOk)!.status === 'fast_lane'
          ? 'fast lane'
          : (liveOk ?? testOk)!.status === 'approved_conditions'
            ? 'with conditions'
            : 'approved'
        : rulesPass && built
          ? 'ready to request'
          : undefined,
  });
  const liveCurrent = live.status === 'running' && live.version === p.version;
  const testCurrent = test.status === 'running' && test.version === p.version;
  steps.push({
    key: 'ship',
    label: 'Ship',
    state: liveCurrent ? 'done' : testCurrent || signedOff ? 'current' : 'todo',
    sub: liveCurrent ? `Live · v${p.version}` : testCurrent ? `Test · v${p.version}` : signedOff ? 'ready to deploy' : undefined,
  });
  // Learning starts as soon as anyone outside the builder uses the app: the Test pilot counts.
  const inUse = live.status === 'running' || test.status === 'running';
  steps.push({
    key: 'learn',
    label: 'Learn',
    state: inUse || flags ? 'current' : 'todo',
    sub: flags ? `${flags} flag${flags > 1 ? 's' : ''}` : inUse ? 'watching' : undefined,
  });
  return steps;
}

export type NextAction =
  | { kind: 'draft_plan'; label: string }
  | { kind: 'approve_plan'; label: string }
  | { kind: 'skip_build'; label: string }
  | { kind: 'invite'; label: string }
  | { kind: 'waiting_review'; label: string; count: number }
  | { kind: 'waiting_decision'; label: string; requestId: string }
  | { kind: 'flags'; label: string }
  | { kind: 'fix'; label: string }
  | { kind: 'request'; label: string; env: 'test' | 'live' }
  | { kind: 'deploy'; label: string; env: 'test' | 'live' }
  | { kind: 'open_live'; label: string };

/** The one thing the builder should do next. Drives the main button and the path hint. */
export function nextAction(p: Project, ws: Workspace | null, now: number): NextAction {
  if (!p.plan) return { kind: 'draft_plan', label: 'Draft the plan' };
  if (!p.planApproved) return { kind: 'approve_plan', label: 'Approve plan and build' };
  if (p.build.status !== 'done') return { kind: 'skip_build', label: 'Skip to the finished build' };
  const pending = pendingRequest(p);
  if (pending) return { kind: 'waiting_decision', label: 'Waiting for Farah', requestId: pending.id };
  const openFlags = arrivedFlags(p, now).filter((f) => f.status === 'open');
  if (openFlags.length) return { kind: 'flags', label: `Review ${openFlags.length} flagged answer${openFlags.length > 1 ? 's' : ''}` };
  const tasks = openTasks(p).length;
  if (tasks) return { kind: 'waiting_review', label: `Waiting on Meera · ${tasks} left`, count: tasks };
  if (!p.invites.some((i) => i.role === 'reviewer') && !p.reviews.length) return { kind: 'invite', label: 'Invite a reviewer' };
  const run = latestRun(p);
  const { pass } = rulesFor(p, ws, now);
  if (run && run.passed < run.total) return { kind: 'fix', label: `Fix ${run.total - run.passed} failing example${run.total - run.passed > 1 ? 's' : ''}` };
  const test = p.deployments.test;
  const live = p.deployments.live;
  const testCurrent = test.status === 'running' && test.version === p.version;
  const liveCurrent = live.status === 'running' && live.version === p.version;
  if (liveCurrent) return { kind: 'open_live', label: 'Open the live app' };
  if (approvedFor(p, 'live')) return { kind: 'deploy', label: `Deploy v${p.version} to Live`, env: 'live' };
  if (testCurrent) return { kind: 'request', label: 'Request Live approval', env: 'live' };
  if (approvedFor(p, 'test')) return { kind: 'deploy', label: `Deploy v${p.version} to Test`, env: 'test' };
  if (!pass) return { kind: 'request', label: 'Request sign-off', env: 'test' };
  return { kind: 'request', label: 'Request sign-off', env: 'test' };
}

/** What happens next, in plain words. Always matches the main button. */
export function pathHint(p: Project, ws: Workspace | null, now: number): string {
  const a = nextAction(p, ws, now);
  switch (a.kind) {
    case 'draft_plan':
      return 'Answer three quick questions in the chat, then Architect drafts a one-page plan.';
    case 'approve_plan':
      return 'Check the plan. Nothing is built until you approve it.';
    case 'skip_build':
      return 'Architect is building the agents, the app and the code, then tests them.';
    case 'waiting_decision': {
      const r = pendingRequest(p);
      return `Farah (IT) is checking the Launch Pack for v${r?.version ?? p.version} → ${r?.env === 'live' ? 'Live' : 'Test'}.`;
    }
    case 'flags':
      return 'People flagged answers they think are wrong. Send them to Meera to check.';
    case 'waiting_review':
      return 'Meera is checking the answers. Each correction she makes becomes a new test.';
    case 'invite':
      return 'Only an expert can say if an answer is right. Invite Meera to check them.';
    case 'fix': {
      const run = latestRun(p);
      const n = run ? run.total - run.passed : 0;
      return `${n} example${n === 1 ? ' gets' : 's get'} the wrong answer. Ask Architect to fix ${n === 1 ? 'it' : 'them'}.`;
    }
    case 'request': {
      const { checks, pass } = rulesFor(p, ws, now);
      const failing = checks.filter((c) => !c.pass);
      if (!pass && failing.length) return `Sign-off opens when every launch rule passes. Still to go: ${failing.map((c) => SHORT_RULE[c.id] ?? c.label.toLowerCase()).join(', ')}.`;
      return a.env === 'live'
        ? `v${p.version} is piloting on Test. Ask Farah to approve Live when the pilot looks good.`
        : 'Every launch rule passes. Ask Farah (IT) to sign off.';
    }
    case 'deploy':
      return `Farah approved it. Deploy v${p.version} to ${a.env === 'live' ? 'Live' : 'Test'} when you are ready.`;
    case 'open_live':
      return 'Live. When someone flags a wrong answer, it comes back here as a new test.';
  }
}

/** Plain-language copy for each step: what happens, who does it, and what opens it. */
export const STEP_COPY: Record<StepKey, { title: string; question: string; body: string; who: { role: Role; does: string }[]; unlocks: string }> = {
  build: {
    title: 'Build',
    question: 'What should the app do?',
    body: 'Describe the app in a sentence. Architect asks three questions, drafts a one-page plan, and builds the agents, the screens and the code once you approve it.',
    who: [{ role: 'builder', does: 'describes and approves' }],
    unlocks: 'Starts with your prompt.',
  },
  prove: {
    title: 'Prove',
    question: 'Are the answers right?',
    body: 'The Answer Key is a list of example cases with the answer your expert expects. Architect runs every example through the app after each change, so you see what got better and what broke.',
    who: [
      { role: 'reviewer', does: 'checks answers, owns the examples' },
      { role: 'builder', does: 'fixes what fails' },
    ],
    unlocks: 'Opens when the first build finishes.',
  },
  signoff: {
    title: 'Sign off',
    question: 'Is it safe to put in front of people?',
    body: 'Before real people use the app, Farah (IT) gets a one-page Launch Pack: test results, expert checks, what data it touches and what it costs. Launch rules decide what needs her and what can go straight through.',
    who: [
      { role: 'approver', does: 'sets the rules and decides' },
      { role: 'builder', does: 'requests sign-off' },
    ],
    unlocks: 'Opens when every launch rule passes.',
  },
  ship: {
    title: 'Ship',
    question: 'Who can use it?',
    body: 'Deploy the approved version: first to Test, a small pilot group, then to Live for everyone. Every earlier version stays one click away.',
    who: [{ role: 'builder', does: 'deploys and rolls back' }],
    unlocks: 'Opens when Farah approves.',
  },
  learn: {
    title: 'Learn',
    question: 'What did people flag?',
    body: 'People using the app can flag an answer they think is wrong. Each flag comes back here. Meera checks it, and her correction becomes a new test, so the same mistake cannot come back.',
    who: [
      { role: 'builder', does: 'sends flags for review' },
      { role: 'reviewer', does: 'confirms the right answer' },
    ],
    unlocks: 'Opens when people start using the app.',
  },
};

export function stageLabel(p: Project, now: number): string {
  if (!p.plan) return 'New';
  if (!p.planApproved) return 'Plan ready';
  if (p.build.status !== 'done') return 'Building';
  if (p.deployments.live.status === 'running') return `Live · v${p.deployments.live.version}`;
  if (pendingRequest(p)) return 'Awaiting sign-off';
  if (p.deployments.test.status === 'running') return `Test · v${p.deployments.test.version}`;
  const run = latestRun(p);
  void now;
  return run ? `Proving · ${run.passed}/${run.total}` : 'Proving';
}
