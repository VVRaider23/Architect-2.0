import type { Env, LaunchRequest, LiveFlag, Project, RequestStatus, RuleCheck, Workspace } from './types';
import { checkRules, latestRun } from './engine';
import { BUILD_STEPS, STEP_MS } from './store';

export const APPROVED: RequestStatus[] = ['approved', 'approved_conditions', 'fast_lane'];

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
  const liveRunning = live.status === 'running';
  steps.push({
    key: 'learn',
    label: 'Learn',
    state: liveRunning || flags ? 'current' : 'todo',
    sub: flags ? `${flags} flag${flags > 1 ? 's' : ''}` : liveRunning ? 'watching' : undefined,
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

/** A plain-words hint shown under the launch path. */
export function pathHint(p: Project, ws: Workspace | null, now: number): string {
  if (!p.plan) return 'Answer three questions and Architect drafts a one-page plan.';
  if (!p.planApproved) return 'Nothing is built until you approve the plan.';
  if (p.build.status !== 'done') return 'Building. The first proof run starts as soon as the agents are ready.';
  const { checks, pass } = rulesFor(p, ws, now);
  const pending = pendingRequest(p);
  if (pending) return `Farah has the Launch Pack for v${pending.version} → ${pending.env === 'test' ? 'Test' : 'Live'}.`;
  const failing = checks.filter((c) => !c.pass);
  if (!pass && failing.length) return `Sign-off opens when every launch rule passes. Still to go: ${failing.map((c) => SHORT_RULE[c.id] ?? c.label.toLowerCase()).join(', ')}.`;
  const testCurrent = p.deployments.test.status === 'running' && p.deployments.test.version === p.version;
  const liveCurrent = p.deployments.live.status === 'running' && p.deployments.live.version === p.version;
  if (liveCurrent) return 'Live. Flagged answers come back here and become tests.';
  if (approvedFor(p, 'live')) return `Farah approved Live. Deploy v${p.version} when you are ready.`;
  if (approvedFor(p, 'test') && !testCurrent) return `Approved. Deploy v${p.version} to Test when you are ready.`;
  if (testCurrent) return `v${p.version} is piloting on Test. Request Live approval when the pilot looks good.`;
  return 'Every launch rule passes. Request sign-off when you are ready.';
}

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
