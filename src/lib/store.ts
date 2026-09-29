'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  Action,
  AgentId,
  AnswerKeyItem,
  AuditEvent,
  ChangeReceipt,
  ChatCard,
  Claim,
  ConsultantAnswers,
  Env,
  FrameworkId,
  ImportInfo,
  Invite,
  LaunchRequest,
  LaunchRules,
  Project,
  ProofRun,
  RequestStatus,
  Review,
  ReviewVerdict,
  Risk,
  Role,
  ToastAction,
  ToastMsg,
  Verdict,
  Workspace,
} from './types';
import {
  ACTION_LABEL,
  RISK_LABEL,
  checkRules,
  creditsForRun,
  latestRun,
  runAll,
  triage,
} from './engine';
import {
  LIVE_FLAG_CLAIMS,
  PEOPLE,
  VARIANTS,
  defaultWorkspace,
  frameworkLabel,
  newProject,
  planFor,
  seedAnswerKey,
} from './seed';
import { generateFiles } from './codegen';
import { countDelta } from './diff';
import { uid } from './utils';

export const BUILD_STEPS = [
  'Set up the project',
  'Database and sign-in',
  'Screens: Claims inbox, Claim detail',
  'Agents: Triage lead, Intake reader, Policy checker',
  'Agent: Risk scorer',
  'Connect Gmail and the claims database',
  'First test run',
  'Commit to GitHub',
];
export const IMPORT_STEPS = [
  'Read your repo and map the agents',
  'Add agent.yaml (framework-neutral)',
  'Wrap the agents so every step is traced',
  'Screens: Claims inbox, Claim detail',
  'Draft a starter Answer Key',
  'Connect Gmail and the claims database',
  'First test run',
  'Open a pull request',
];
/** The environment variables a new claims app starts with. */
export const DEFAULT_ENV_VARS = ['LYZR_API_KEY', 'GMAIL_OAUTH_TOKEN', 'CLAIMS_DB_URL', 'POLICY_DOCS_BUCKET'];

export const stepsFor = (p: Pick<Project, 'importedFrom'>) => (p.importedFrom ? IMPORT_STEPS : BUILD_STEPS);
export const STEP_MS = 2600;
export const FLAG_DELAY_MS = 25_000;

const DEFAULT_PROMPT =
  'A claims triage assistant: reads claim emails and PDFs, checks the policy, flags risky claims for a human, and drafts replies for our claims team.';

export const DEMO_PROMPT = DEFAULT_PROMPT;
const DEFAULT_RISKY = 'Water damage over $10,000, a policy less than 60 days old, or a theft claim without a police report.';

type ChangeKind = 'theft' | 'water' | 'slack' | 'framework';

const EXPLAIN = /(fail|miss|wrong|explain the (result|run|proof))/;
const QUESTION = /\?\s*$|^(what|why|how|which|who|when|where|can|could|does|do|is|are|should|would|will|tell me|explain)\b/;
const FRAMEWORK_IDS: FrameworkId[] = ['langgraph', 'crewai', 'openai-agents', 'google-adk', 'lyzr'];

/** What a chat message asks for. "open" means nothing scripted matches, so a real AI can answer it. */
export function chatIntent(p: Project, raw: string): 'invite' | 'plan' | 'queued' | 'change' | 'explain' | 'run' | 'deploy' | 'signoff' | 'open' {
  const t = raw.trim().toLowerCase();
  if (t === '/invite' || /\binvite\b/.test(t)) return 'invite';
  if (!p.planApproved) return /slack/.test(t) || !QUESTION.test(t) ? 'plan' : 'open';
  if (p.build.status !== 'done') return QUESTION.test(t) ? 'open' : 'queued';
  const fw = FRAMEWORK_IDS.find((f) => t.includes(frameworkLabel(f).toLowerCase().replace(' sdk', '')) || t.includes(f));
  if (/(police|theft|stolen)/.test(t) && !QUESTION.test(t)) return 'change';
  if (/\bfix\b/.test(t) && p.version < 3) return 'change';
  if (/(water|photo|9,?[0-9]{3}|5,?000)/.test(t) && !QUESTION.test(t)) return 'change';
  if (/slack/.test(t) && !QUESTION.test(t)) return 'change';
  if (fw && /(switch|move|change|use|convert|port)/.test(t) && !/^(what|why|how|which|should)\b/.test(t)) return 'change';
  if (EXPLAIN.test(t)) return 'explain';
  if (/(\brun\b|rerun|\btests?\b|proof)/.test(t) && !QUESTION.test(t)) return 'run';
  if (/(deploy|ship|launch|live)/.test(t) && !QUESTION.test(t)) return 'deploy';
  if (/(sign.?off|approv|request)/.test(t) && !QUESTION.test(t)) return 'signoff';
  return 'open';
}

export interface ReviewInput {
  verdict: ReviewVerdict;
  correction?: string;
  correctRisk?: Risk;
  correctAction?: Action;
  rule?: string;
}

interface NewExample {
  title: string;
  kind: Claim['kind'];
  amount: number;
  policyAgeDays: number;
  policeReport: boolean;
  email: string;
  risk: Risk;
  action: Action;
  highRisk: boolean;
}

export interface AppState {
  signedIn: boolean;
  authMode: 'demo' | 'account';
  userEmail: string;
  viewAs: Role;
  workspace: Workspace | null;
  projects: Project[];
  audit: AuditEvent[];
  toasts: ToastMsg[];
  inviteOpenFor: string | null;
  /** Developer tools, chosen in Settings. null until someone chooses; then `devGuess` decides. */
  devTools: boolean | null;
  /** Our guess before anyone chooses: on after a GitHub sign-in or bringing code from GitHub. */
  devGuess: boolean;

  signIn: (method: string, email?: string, mode?: 'demo' | 'account') => void;
  setDevTools: (on: boolean) => void;
  signOut: () => void;
  setupWorkspace: (input: { name: string; domainJoin: boolean; runsOn: 'lyzr' | 'own'; github?: string }) => void;
  setViewAs: (role: Role) => void;
  resetDemo: () => void;

  createProject: (prompt: string, opts?: { oneShot?: boolean; studioAgents?: { id: string; name: string; description: string }[] }) => string;
  setTheme: (pid: string, theme: string) => void;
  setCustomDomain: (pid: string, domain: string) => void;
  setEnvVar: (pid: string, name: string) => void;
  setApiKey: (pid: string, env: 'test' | 'live', key: string, version: number) => void;
  removeEnvVar: (pid: string, name: string) => void;
  importProject: (info: ImportInfo, frameworkId: FrameworkId | null) => string;
  quickStartDemo: () => string;
  answerConsultant: (pid: string, answers: Partial<ConsultantAnswers>) => void;
  draftPlan: (pid: string) => void;
  setFramework: (pid: string, fw: FrameworkId) => void;
  approvePlan: (pid: string) => void;
  skipBuild: (pid: string) => void;
  completeBuild: (pid: string) => void;
  runProof: (pid: string, trigger: string) => string | undefined;
  sendChat: (pid: string, text: string) => void;
  addChat: (pid: string, from: 'user' | 'architect', text: string, ai?: boolean) => void;
  applyChange: (pid: string, kind: ChangeKind, fw?: FrameworkId) => string | null;
  undoChange: (pid: string, changeId: string) => void;
  openPullRequest: (pid: string, changeId: string) => void;
  mergeChange: (pid: string, changeId: string) => void;
  /** Fixes whatever the latest test run gets wrong (theft first, then water damage). Returns the change id. */
  fixFailing: (pid: string) => string | null;
  recordPush: (pid: string, info: { repo: string; url: string; commitUrl: string }) => void;
  recordPullRequest: (pid: string, changeId: string, pr: { number: number; url: string }) => void;
  addExample: (pid: string, ex: NewExample) => void;
  deleteExample: (pid: string, itemId: string) => void;
  importCsv: (pid: string, text: string) => number;
  setInviteOpen: (pid: string | null) => void;
  invite: (pid: string, invites: Invite[], message: string) => void;
  submitReview: (pid: string, taskId: string, input: ReviewInput) => void;
  requestSignoff: (pid: string, env: 'test' | 'live', audience: string) => LaunchRequest | null;
  decide: (pid: string, requestId: string, status: RequestStatus, conditions: string[], comment: string) => void;
  deploy: (pid: string, env: 'test' | 'live') => boolean;
  rollback: (pid: string, env: 'test' | 'live') => void;
  flagAnswer: (pid: string, env: Env, claim: Claim, verdict: Verdict, note: string, by: string) => void;
  sendFlagToReview: (pid: string, flagId: string) => void;
  /** Guided tour: flags from the pilot arrive now instead of in 25 seconds. */
  arriveFlagsNow: (pid: string) => void;
  updateAgent: (pid: string, agentId: AgentId, patch: { instructions?: string; model?: string }) => void;
  toggleGuardrail: (pid: string, agentId: AgentId, gid: string) => void;
  updateRules: (patch: Partial<LaunchRules>) => void;
  askQuestion: (pid: string, text: string, from: Role) => void;
  toast: (text: string, tone?: ToastMsg['tone'], opts?: { actions?: ToastAction[]; ms?: number }) => void;
  dismissToast: (id: string) => void;
}

const actorName = (role: Role) => PEOPLE.find((p) => p.role === role)!.short;

function msg(p: Project, from: 'user' | 'architect', text: string, card?: ChatCard) {
  p.chat.push({ id: uid('m'), from, text, at: Date.now(), card });
}

function pushAudit(s: AppState, actor: string, action: string, target: string, detail?: string) {
  s.audit.unshift({ id: uid('ev'), at: Date.now(), actor, action, target, detail });
  if (s.audit.length > 300) s.audit.length = 300;
}

function doRun(s: AppState, p: Project, trigger: string): ProofRun {
  const results = runAll(p.answerKey, p.version);
  const passed = results.filter((r) => r.pass).length;
  const run: ProofRun = {
    id: uid('run'),
    n: p.runs.length + 1,
    at: Date.now(),
    version: p.version,
    results,
    passed,
    total: results.length,
    credits: creditsForRun(results.length),
    trigger,
  };
  p.runs.push(run);
  if (s.workspace) s.workspace.credits = Math.max(0, s.workspace.credits - run.credits);
  return run;
}

function pickVariant(p: Project, claim: Claim): Claim {
  const used = new Set(p.answerKey.map((i) => i.claim.id));
  const pool =
    claim.kind === 'theft'
      ? claim.policeReport
        ? VARIANTS.theft_report
        : VARIANTS.theft_no_report
      : claim.kind === 'water_damage'
        ? VARIANTS.water_mid
        : [];
  const fresh = pool.find((v) => !used.has(v.id));
  if (fresh) return { ...fresh };
  const n = p.answerKey.length + 1;
  return {
    ...claim,
    id: `C-${1200 + n}`,
    title: `${claim.title} (similar case)`,
    customer: ['Y. Ahmed', 'Q. Laurent', 'U. Obi', 'Z. Klein'][n % 4],
    amount: Math.round(claim.amount * 1.15),
  };
}

function changeTitle(kind: ChangeKind, fw?: FrameworkId) {
  if (kind === 'theft') return 'Theft claims need a police report';
  if (kind === 'water') return 'Water damage over $5,000 needs photos';
  if (kind === 'slack') return 'Slack alert for high-risk claims';
  return `Switch agents to ${frameworkLabel(fw ?? 'langgraph')}`;
}

function buildProject(s: AppState, prompt: string): Project {
  const id = uid('p');
  const p = newProject(id, prompt, Date.now());
  msg(p, 'user', prompt);
  if (!/claim/i.test(prompt)) {
    msg(
      p,
      'architect',
      'Heads up: this prototype’s agent engine is wired for one worked example, an insurance claims assistant. I kept your prompt, and the plan, tests and code below use that example so you can see the whole flow.',
    );
  }
  msg(p, 'architect', 'Got it. Three quick questions so the plan fits the way Harborline works:', { type: 'questions' });
  return p;
}

function finishBuild(s: AppState, p: Project) {
  if (p.build.status === 'done') return;
  p.build = { status: 'done', step: BUILD_STEPS.length, startedAt: p.build.startedAt, credits: 140 };
  if (s.workspace) s.workspace.credits = Math.max(0, s.workspace.credits - 140);
  p.answerKey = seedAnswerKey(Date.now());
  p.deployments.preview = { ...p.deployments.preview, version: p.version, status: 'running', at: Date.now(), history: [{ version: p.version, at: Date.now() }] };
  const run = doRun(s, p, 'First build');
  const misses = run.total - run.passed;
  msg(
    p,
    'architect',
    `${p.importedFrom ? `Pull request #1 on ${p.repo} adds agent.yaml, tracing, an Answer Key and a proof workflow.` : 'The first build is ready.'} The first test run is in: ${run.passed} of ${run.total} answers match the Answer Key. ${
      misses ? `The ${misses} misses are all theft claims.` : ''
    } Want your claims expert to check the answers?`,
    { type: 'run', runId: run.id },
  );
  p.chat.push({
    id: uid('m'),
    from: 'architect',
    text: 'Suggested next steps',
    at: Date.now(),
    card: {
      type: 'suggest',
      items: [
        { label: 'Invite Meera to review', prompt: '/invite' },
        { label: 'Why is the Risk scorer failing?', prompt: 'Why is the Risk scorer failing?' },
        { label: 'Fix the theft misses', prompt: 'Fix the misses: theft claims need a police report number before approval.' },
      ],
    },
  });
  pushAudit(s, 'Architect', 'built', p.name, `First test run ${run.passed}/${run.total}`);
}

function makeChange(s: AppState, p: Project, kind: ChangeKind, fw?: FrameworkId): ChangeReceipt | null {
  const beforeFiles = generateFiles(p);
  const vFrom = p.version;
  const beforeResults = runAll(p.answerKey, vFrom);
  const beforeLabel = `${beforeResults.filter((r) => r.pass).length}/${beforeResults.length}`;
  if (kind === 'theft') {
    if (p.version >= 2) return null;
    p.version = 2;
    const rs = p.agents.find((a) => a.id === 'risk_scorer');
    if (rs && !/police report/i.test(rs.instructions)) rs.instructions += ' Theft claims need a police report number before approval (policy clause 4.2).';
  } else if (kind === 'water') {
    if (p.version >= 3) return null;
    if (p.version < 2) p.version = 2;
    p.version = 3;
    const rs = p.agents.find((a) => a.id === 'risk_scorer');
    if (rs && !/photo/i.test(rs.instructions)) rs.instructions += ' Water damage over $5,000 needs photos before a decision.';
  } else if (kind === 'slack') {
    if (p.slackAlerts) return null;
    p.slackAlerts = true;
    p.accessChanged = true;
    const rd = p.agents.find((a) => a.id === 'reply_drafter');
    if (rd && !rd.tools.includes('Slack (post alerts)')) rd.tools.push('Slack (post alerts)');
  } else if (kind === 'framework') {
    if (!fw || fw === p.framework) return null;
    p.framework = fw;
  }
  const afterFiles = generateFiles(p);
  const paths = Array.from(new Set([...Object.keys(beforeFiles), ...Object.keys(afterFiles)]));
  const files = paths
    .map((path) => ({ path, ...countDelta(beforeFiles[path], afterFiles[path]) }))
    .filter((f) => f.add + f.del > 0);
  const run = doRun(s, p, `Change #${p.changes.length + 1}`);
  const afterById = new Map(run.results.map((r) => [r.itemId, r.pass]));
  let fixed = 0;
  let broke = 0;
  for (const r of beforeResults) {
    const now = afterById.get(r.itemId);
    if (!r.pass && now) fixed++;
    if (r.pass && now === false) broke++;
  }
  const change: ChangeReceipt = {
    id: uid('chg'),
    n: p.changes.length + 1,
    title: changeTitle(kind, fw),
    at: Date.now(),
    files,
    fixed,
    broke,
    before: beforeLabel,
    after: `${run.passed}/${run.total}`,
    credits: 9,
    versionFrom: vFrom,
    versionTo: p.version,
    committed: false,
    diffFile:
      kind === 'slack'
        ? 'claims_agents/alerts.py'
        : kind === 'framework'
          ? Object.keys(afterFiles).find((f) => /claims_agents\/(graph|crew|team|agent|tools)\.py$/.test(f))
          : 'claims_agents/risk_rules.py',
  };
  // Keep the before/after text of the main file so the Code tab can show the exact diff later.
  change.beforeText = change.diffFile ? beforeFiles[change.diffFile] ?? '' : '';
  change.afterText = change.diffFile ? afterFiles[change.diffFile] ?? '' : '';
  p.changes.push(change);
  if (s.workspace) s.workspace.credits = Math.max(0, s.workspace.credits - change.credits);
  return change;
}

function explainFailures(p: Project): string {
  const run = latestRun(p);
  if (!run) return 'There is no test run yet. Approve the plan and I will build and test it.';
  const fails = run.results.filter((r) => !r.pass);
  if (!fails.length) return `All ${run.total} examples pass in run #${run.n}. Nothing is failing right now.`;
  const byKind = new Map<string, number>();
  const items = new Map(p.answerKey.map((i) => [i.id, i]));
  for (const f of fails) {
    const k = items.get(f.itemId)?.claim.kind ?? 'other';
    byKind.set(k, (byKind.get(k) ?? 0) + 1);
  }
  const theft = byKind.get('theft') ?? 0;
  const water = byKind.get('water_damage') ?? 0;
  const parts: string[] = [];
  if (theft)
    parts.push(
      `${theft} theft claim${theft > 1 ? 's' : ''}: the Policy checker finds clause 4.2 ("theft claims need a police report") but the Risk scorer never uses it`,
    );
  if (water)
    parts.push(
      `${water} water damage claim${water > 1 ? 's' : ''} between $5,000 and $10,000: the Risk scorer has no rule for them`,
    );
  return `${fails.length} of ${run.total} examples fail, all in the Risk scorer. ${parts.join('; ')}. Want me to add the missing rule${
    parts.length > 1 ? 's' : ''
  } and rerun the tests?`;
}

const initialState = () => ({
  signedIn: false,
  authMode: 'demo' as const,
  userEmail: '',
  viewAs: 'builder' as Role,
  workspace: null as Workspace | null,
  projects: [] as Project[],
  audit: [] as AuditEvent[],
  toasts: [] as ToastMsg[],
  inviteOpenFor: null as string | null,
  devTools: null as boolean | null,
  devGuess: false,
});

export const useApp = create<AppState>()(
  persist(
    immer((set, get) => {
      const withProject = (pid: string, fn: (p: Project, s: AppState) => void) =>
        set((s) => {
          const p = s.projects.find((x) => x.id === pid);
          if (p) fn(p, s);
        });

      return {
        ...initialState(),

        signIn: (method, email, mode = 'demo') =>
          set((s) => {
            s.signedIn = true;
            s.authMode = mode;
            s.userEmail = email || 'arjun@harborline.com';
            s.viewAs = 'builder';
            if (/github/i.test(method)) s.devGuess = true;
            pushAudit(s, 'Arjun', 'signed in', 'Architect', `with ${method}${mode === 'demo' ? ' (demo)' : ''}`);
          }),

        setDevTools: (on) =>
          set((s) => {
            s.devTools = on;
          }),

        signOut: () =>
          set((s) => {
            s.signedIn = false;
          }),

        setupWorkspace: (input) =>
          set((s) => {
            const ws = defaultWorkspace(input.name || 'Harborline Insurance');
            ws.domainJoin = input.domainJoin;
            ws.runsOn = input.runsOn;
            if (input.github) ws.github = input.github;
            s.workspace = ws;
            pushAudit(s, 'Arjun', 'created workspace', ws.name);
          }),

        setViewAs: (role) =>
          set((s) => {
            s.viewAs = role;
          }),

        resetDemo: () =>
          set((s) => {
            Object.assign(s, initialState());
          }),

        createProject: (prompt, opts) => {
          let id = '';
          set((s) => {
            if (!s.workspace) s.workspace = defaultWorkspace();
            const p = buildProject(s, prompt.trim() || DEFAULT_PROMPT);
            id = p.id;
            p.mode = opts?.oneShot ? 'oneshot' : 'guided';
            if (opts?.studioAgents?.length) {
              p.studioAgents = opts.studioAgents;
              msg(p, 'architect', `Added ${opts.studioAgents.length} agent${opts.studioAgents.length > 1 ? 's' : ''} from Lyzr Studio: ${opts.studioAgents.map((a) => a.name).join(', ')}. They join the team as they are, and you can edit them in Studio.`);
            }
            if (opts?.oneShot) {
              // One Shot: skip the questions, use sensible defaults and start building straight away.
              p.chat = p.chat.filter((m) => m.card?.type !== 'questions');
              p.answers = { users: ['Claims handlers'], systems: ['Gmail', 'Claims database', 'Policy PDFs'], risky: DEFAULT_RISKY, answered: true };
              p.plan = planFor(p, p.answers);
              p.planApproved = true;
              msg(p, 'architect', 'One Shot mode: I skipped the questions and used sensible defaults. The plan is in the Plan tab if you want to check it.', { type: 'plan' });
              p.build = { status: 'building', step: 0, startedAt: Date.now(), credits: 0 };
              msg(p, 'architect', 'Building now.', { type: 'build' });
            }
            s.projects.unshift(p);
            pushAudit(s, 'Arjun', 'started project', p.name, opts?.oneShot ? 'One Shot' : undefined);
          });
          return id;
        },

        setTheme: (pid, theme) =>
          withProject(pid, (p) => {
            p.theme = theme;
          }),

        setEnvVar: (pid, name) =>
          withProject(pid, (p, s) => {
            const key = name.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
            if (!key) return;
            const list = p.envVars ?? DEFAULT_ENV_VARS.map((n) => ({ name: n, at: p.createdAt }));
            p.envVars = [...list.filter((v) => v.name !== key), { name: key, at: Date.now() }];
            pushAudit(s, 'Arjun', 'set environment variable', p.name, key);
          }),

        setApiKey: (pid, env, key, version) =>
          withProject(pid, (p, s) => {
            p.apiKeys = { ...(p.apiKeys ?? {}), [env]: { key, version, at: Date.now() } };
            pushAudit(s, 'Arjun', 'created an API key', p.name, `${env === 'live' ? 'Live' : 'Test'} · v${version}`);
          }),

        removeEnvVar: (pid, name) =>
          withProject(pid, (p, s) => {
            const list = p.envVars ?? DEFAULT_ENV_VARS.map((n) => ({ name: n, at: p.createdAt }));
            p.envVars = list.filter((v) => v.name !== name);
            pushAudit(s, 'Arjun', 'removed environment variable', p.name, name);
          }),

        setCustomDomain: (pid, domain) =>
          withProject(pid, (p, s) => {
            p.customDomain = domain.trim().toLowerCase() || undefined;
            if (p.customDomain) pushAudit(s, 'Arjun', 'added custom domain', p.name, p.customDomain);
          }),

        importProject: (info, frameworkId) => {
          let id = '';
          set((s) => {
            if (!s.workspace) s.workspace = defaultWorkspace();
            s.devGuess = true;
            const pid = uid('p');
            const repoName = info.repo.split('/')[1] ?? info.repo;
            const p = newProject(pid, `Import ${info.url}`, Date.now());
            p.name = repoName.replace(/[-_.]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim() || 'Imported app';
            p.repo = info.repo;
            if (frameworkId) p.framework = frameworkId;
            p.importedFrom = info;
            msg(p, 'user', `Import ${info.url}`);
            const fw = info.framework ? `${info.framework} agents` : 'no agent framework yet';
            const agents = info.agents.length ? `${info.agents.length} agent file${info.agents.length > 1 ? 's' : ''}` : 'no obvious agent files';
            const tools = info.tools.length ? `, using ${info.tools.slice(0, 4).join(', ')}` : '';
            msg(
              p,
              'architect',
              `I read ${info.repo}: ${fw}, ${agents}${tools}. ${info.tests ? 'It has some tests, but none check the agents’ answers.' : 'No tests yet.'} Your code stays in your repo: I’ll work on a branch and open pull requests.`,
            );
            msg(
              p,
              'architect',
              'Heads up: in this prototype the test engine runs one worked example, an insurance claims assistant. The repo reading above is real; the plan, tests and code below use that example so you can see the whole flow.',
            );
            p.answers = {
              users: ['Claims handlers'],
              systems: ['Gmail', 'Claims database', 'Policy PDFs'],
              risky: DEFAULT_RISKY,
              answered: true,
            };
            p.plan = planFor(p, p.answers);
            p.plan.title = `${p.name} · plan v1 (starts from your repo)`;
            msg(p, 'architect', 'Here is a plan that starts from what is already there, so you only approve what changes.', { type: 'plan' });
            s.projects.unshift(p);
            pushAudit(s, 'Arjun', 'imported', info.repo, info.framework ?? undefined);
            id = pid;
          });
          return id;
        },

        quickStartDemo: () => {
          let id = '';
          set((s) => {
            if (!s.workspace) s.workspace = defaultWorkspace();
            const p = buildProject(s, DEFAULT_PROMPT);
            id = p.id;
            p.answers = {
              users: ['Claims handlers'],
              systems: ['Gmail', 'Claims database', 'Policy PDFs'],
              risky: DEFAULT_RISKY,
              answered: true,
            };
            p.plan = planFor(p, p.answers);
            msg(p, 'architect', 'Here is the plan.', { type: 'plan' });
            p.planApproved = true;
            p.build = { status: 'building', step: 0, startedAt: Date.now() - STEP_MS * BUILD_STEPS.length, credits: 0 };
            msg(p, 'architect', 'Building now.', { type: 'build' });
            finishBuild(s, p);
            s.projects.unshift(p);
            pushAudit(s, 'Arjun', 'started project', p.name, 'demo shortcut');
          });
          return id;
        },

        answerConsultant: (pid, answers) =>
          withProject(pid, (p) => {
            p.answers = { ...p.answers, ...answers };
          }),

        draftPlan: (pid) =>
          withProject(pid, (p) => {
            p.answers.answered = true;
            if (!p.answers.users.length) p.answers.users = ['Claims handlers'];
            if (!p.answers.systems.length) p.answers.systems = ['Gmail', 'Claims database', 'Policy PDFs'];
            if (!p.answers.risky.trim()) p.answers.risky = DEFAULT_RISKY;
            p.plan = planFor(p, p.answers);
            if (p.answers.systems.includes('Slack')) p.slackAlerts = true;
            msg(
              p,
              'architect',
              'Here is the plan. Two things only you can decide: the framework, and whether my three example answers are right.',
              { type: 'plan' },
            );
          }),

        setFramework: (pid, fw) =>
          withProject(pid, (p) => {
            p.framework = fw;
          }),

        approvePlan: (pid) =>
          withProject(pid, (p, s) => {
            if (p.planApproved) return;
            p.planApproved = true;
            p.build = { status: 'building', step: 0, startedAt: Date.now(), credits: 0 };
            msg(p, 'user', `Approved the plan · ${frameworkLabel(p.framework)}`);
            msg(p, 'architect', "Building now. You can keep chatting; I'll queue changes for after this step.", { type: 'build' });
            pushAudit(s, 'Arjun', 'approved plan', p.name, frameworkLabel(p.framework));
          }),

        skipBuild: (pid) =>
          withProject(pid, (p) => {
            if (p.build.status === 'building') p.build.startedAt = Date.now() - STEP_MS * BUILD_STEPS.length - 10;
          }),

        completeBuild: (pid) =>
          withProject(pid, (p, s) => {
            finishBuild(s, p);
          }),

        runProof: (pid, trigger) => {
          let id: string | undefined;
          withProject(pid, (p, s) => {
            if (!p.answerKey.length) return;
            const run = doRun(s, p, trigger);
            id = run.id;
            pushAudit(s, actorName(s.viewAs), 'ran proof', p.name, `Run #${run.n}: ${run.passed}/${run.total}`);
          });
          return id;
        },

        sendChat: (pid, raw) => {
          const text = raw.trim();
          if (!text) return;
          const st = get();
          const proj = st.projects.find((x) => x.id === pid);
          if (!proj) return;
          const t = text.toLowerCase();

          if (t === '/invite' || /\binvite\b/.test(t)) {
            withProject(pid, (p) => {
              if (t !== '/invite') msg(p, 'user', text);
              msg(p, 'architect', 'Opening the invite window. Meera gets the review queue; Farah only hears from us when you request sign-off.');
            });
            set((s) => {
              s.inviteOpenFor = pid;
            });
            return;
          }

          withProject(pid, (p, s) => {
            msg(p, 'user', text);
            if (!p.planApproved) {
              if (/slack/.test(t)) {
                p.slackAlerts = true;
                if (p.plan && !p.plan.connections.some((c) => c.startsWith('Slack'))) p.plan.connections.push('Slack (alerts)');
                msg(p, 'architect', 'Added Slack alerts for high-risk claims to the plan.');
              } else {
                msg(p, 'architect', 'Noted. I will fold that into the plan. Approve it when you are happy and I will start building.');
              }
              return;
            }
            if (p.build.status !== 'done') {
              msg(p, 'architect', 'Queued. I will apply it as soon as the build finishes.');
              return;
            }
            const fw = (['langgraph', 'crewai', 'openai-agents', 'google-adk', 'lyzr'] as FrameworkId[]).find((f) =>
              t.includes(frameworkLabel(f).toLowerCase().replace(' sdk', '')) || t.includes(f),
            );
            let kind: ChangeKind | null = null;
            const q = QUESTION.test(t);
            if ((/(police|theft|stolen)/.test(t) && !q) || (/\bfix\b/.test(t) && p.version < 2 && !/water/.test(t))) kind = 'theft';
            else if ((/(water|photo|9,?[0-9]{3}|5,?000)/.test(t) && !q) || (/\bfix\b/.test(t) && p.version < 3)) kind = 'water';
            else if (/slack/.test(t) && !q) kind = 'slack';
            else if (fw && /(switch|move|change|use|convert|port)/.test(t) && !/^(what|why|how|which|should)\b/.test(t)) kind = 'framework';

            if (kind) {
              const ch = makeChange(s, p, kind, fw);
              if (!ch) {
                msg(p, 'architect', kind === 'framework' ? `The agents already run on ${frameworkLabel(p.framework)}.` : 'That is already in place. Nothing to change.');
                return;
              }
              const summary =
                kind === 'framework'
                  ? `Done. I regenerated the agents for ${frameworkLabel(p.framework)} from agent.yaml. ${ch.files.length} files changed and the proof is unchanged: ${ch.after}.`
                  : `Done. ${ch.files.length} file${ch.files.length > 1 ? 's' : ''} changed. ${
                      ch.fixed ? `${ch.fixed} failing example${ch.fixed > 1 ? 's' : ''} now pass` : 'No test results changed'
                    }${ch.broke ? `, but ${ch.broke} broke` : ', and nothing else broke'}.`;
              msg(p, 'architect', summary, { type: 'receipt', changeId: ch.id });
              pushAudit(s, 'Arjun', 'changed', p.name, `#${ch.n} ${ch.title} (${ch.before} → ${ch.after})`);
              return;
            }
            if (EXPLAIN.test(t)) {
              msg(p, 'architect', explainFailures(p));
              return;
            }
            if (/(\brun\b|rerun|\btests?\b|proof)/.test(t)) {
              const run = doRun(s, p, 'Asked in chat');
              msg(p, 'architect', `Run #${run.n}: ${run.passed} of ${run.total} examples match.`, { type: 'run', runId: run.id });
              return;
            }
            if (/(deploy|ship|launch|live)/.test(t)) {
              msg(p, 'architect', 'Use Sign off to ask Farah for approval, then deploy to Test and Live from Ship.');
              return;
            }
            if (/(sign.?off|approv|request)/.test(t)) {
              msg(p, 'architect', 'Use "Request sign-off" at the top right. I will attach the Launch Pack and check the launch rules for you.');
              return;
            }
            msg(
              p,
              'architect',
              'In this demo I can fix failing answers, rerun the tests, explain what is failing, add Slack alerts, or switch the agent framework (try "switch to CrewAI").',
              {
                type: 'suggest',
                items: [
                  { label: 'Why is it failing?', prompt: 'Why is it failing?' },
                  { label: 'Run the tests', prompt: 'Run the tests' },
                  { label: 'Switch to CrewAI', prompt: 'Switch the agents to CrewAI' },
                ],
              },
            );
          });
        },

        addChat: (pid, from, text, ai) =>
          withProject(pid, (p) => {
            p.chat.push({ id: uid('m'), from, text, at: Date.now(), ai });
          }),

        applyChange: (pid, kind, fw) => {
          let id: string | null = null;
          withProject(pid, (p, s) => {
            const ch = makeChange(s, p, kind, fw);
            if (ch) {
              id = ch.id;
              msg(p, 'architect', `Done: ${ch.title}. ${ch.fixed} fixed, ${ch.broke} broke.`, { type: 'receipt', changeId: ch.id });
              pushAudit(s, 'Arjun', 'changed', p.name, `#${ch.n} ${ch.title}`);
            }
          });
          return id;
        },

        undoChange: (pid, changeId) =>
          withProject(pid, (p, s) => {
            const ch = p.changes.find((c) => c.id === changeId);
            if (!ch || ch.undone) return;
            const last = [...p.changes].reverse().find((c) => !c.undone);
            if (!last || last.id !== ch.id) {
              s.toasts.push({ id: uid('t'), text: 'Only the latest change can be undone.', tone: 'bad' });
              return;
            }
            ch.undone = true;
            if (ch.title.startsWith('Slack')) {
              p.slackAlerts = false;
              p.accessChanged = false;
            } else if (ch.title.startsWith('Switch')) {
              // switching back is just another switch; keep it simple
            } else {
              p.version = ch.versionFrom;
            }
            const run = doRun(s, p, `Undo #${ch.n}`);
            msg(p, 'architect', `Undid change #${ch.n}. The tests are back to ${run.passed}/${run.total}.`, { type: 'run', runId: run.id });
            pushAudit(s, 'Arjun', 'undid change', p.name, `#${ch.n}`);
          }),

        openPullRequest: (pid, changeId) =>
          withProject(pid, (p, s) => {
            const ch = p.changes.find((c) => c.id === changeId);
            if (!ch || ch.committed) return;
            ch.committed = true;
            ch.pr = 13 + p.changes.filter((c) => c.committed).length;
            s.toasts.push({ id: uid('t'), text: `Pull request #${ch.pr} opened with the test report attached.`, tone: 'ok' });
            pushAudit(s, 'Arjun', 'opened pull request', p.repo, `#${ch.pr} ${ch.title}`);
          }),

        mergeChange: (pid, changeId) =>
          withProject(pid, (p, s) => {
            const ch = p.changes.find((c) => c.id === changeId);
            if (!ch || ch.merged || ch.undone) return;
            if (!ch.pr) ch.pr = 13 + p.changes.filter((c) => c.pr).length + 1;
            ch.committed = true;
            ch.merged = true;
            msg(p, 'architect', `Merged pull request #${ch.pr} into main: ${ch.title}.`);
            pushAudit(s, 'Arjun', 'merged pull request', p.repo, `#${ch.pr} ${ch.title}`);
          }),

        fixFailing: (pid) => {
          let id: string | null = null;
          withProject(pid, (p, s) => {
            const kind: ChangeKind | null = p.version < 2 ? 'theft' : p.version < 3 ? 'water' : null;
            if (!kind) return;
            const ch = makeChange(s, p, kind);
            if (!ch) return;
            id = ch.id;
            msg(p, 'architect', `Done: ${ch.title}. ${ch.fixed} fixed, ${ch.broke} broke.`, { type: 'receipt', changeId: ch.id });
            pushAudit(s, 'Arjun', 'changed', p.name, `#${ch.n} ${ch.title} (${ch.before} → ${ch.after})`);
          });
          return id;
        },

        recordPush: (pid, info) =>
          withProject(pid, (p, s) => {
            const first = !p.github;
            p.github = { ...info, pushedAt: Date.now() };
            p.repo = info.repo;
            msg(
              p,
              'architect',
              first
                ? `Pushed the code to a new GitHub repository, ${info.repo}. Every change from now on can go there as a pull request with its proof report.`
                : `Pushed the latest code to ${info.repo}.`,
            );
            pushAudit(s, 'Arjun', 'pushed code to GitHub', p.name, info.repo);
          }),

        recordPullRequest: (pid, changeId, pr) =>
          withProject(pid, (p, s) => {
            const ch = p.changes.find((c) => c.id === changeId);
            if (!ch) return;
            ch.committed = true;
            ch.pr = pr.number;
            ch.prUrl = pr.url;
            s.toasts.push({ id: uid('t'), text: `Pull request #${pr.number} opened on GitHub with the test report.`, tone: 'ok' });
            pushAudit(s, 'Arjun', 'opened pull request', p.repo, `#${pr.number} ${ch.title}`);
          }),

        addExample: (pid, ex) =>
          withProject(pid, (p, s) => {
            const n = p.answerKey.length + 1;
            const who = s.viewAs === 'reviewer' ? 'Meera' : 'Arjun';
            const item: AnswerKeyItem = {
              id: uid('ak'),
              n,
              claim: {
                id: `C-${1300 + n}`,
                title: ex.title,
                customer: 'New customer',
                kind: ex.kind,
                amount: ex.amount,
                policyId: `HB-${2400 + n}`,
                policyAgeDays: ex.policyAgeDays,
                policeReport: ex.policeReport,
                attachments: [],
                email: ex.email || ex.title,
              },
              expected: { risk: ex.risk, action: ex.action },
              expectedText: `${RISK_LABEL[ex.risk]}: ${ACTION_LABEL[ex.action].toLowerCase()}.`,
              highRisk: ex.highRisk,
              source: 'expert',
              author: who,
              createdAt: Date.now(),
            };
            p.answerKey.push(item);
            s.toasts.push({ id: uid('t'), text: `Example #${n} added to the Answer Key.`, tone: 'ok' });
            pushAudit(s, who, 'added example', p.name, ex.title);
          }),

        deleteExample: (pid, itemId) =>
          withProject(pid, (p, s) => {
            const it = p.answerKey.find((i) => i.id === itemId);
            p.answerKey = p.answerKey.filter((i) => i.id !== itemId);
            if (it) pushAudit(s, actorName(s.viewAs), 'removed example', p.name, it.claim.title);
          }),

        importCsv: (pid, text) => {
          let added = 0;
          withProject(pid, (p, s) => {
            const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
            const kinds = ['water_damage', 'theft', 'glass', 'roof', 'fire', 'flood', 'hail', 'liability'];
            const risks = ['low', 'medium', 'high', 'blocked'];
            const actions = ['fast_track', 'senior_handler', 'ask_police_report', 'request_photos', 'normal_review'];
            for (const line of lines) {
              const [title, kind, amount, age, report, risk, action, high] = line.split(',').map((x) => x.trim());
              if (!title || title.toLowerCase() === 'title') continue;
              if (!kinds.includes(kind) || !risks.includes(risk) || !actions.includes(action)) continue;
              const n = p.answerKey.length + 1;
              p.answerKey.push({
                id: uid('ak'),
                n,
                claim: {
                  id: `C-${1400 + n}`,
                  title,
                  customer: 'Imported',
                  kind: kind as Claim['kind'],
                  amount: Number(amount) || 0,
                  policyId: `HB-${2500 + n}`,
                  policyAgeDays: Number(age) || 365,
                  policeReport: /^(y|yes|true|1)$/i.test(report ?? ''),
                  attachments: [],
                  email: title,
                },
                expected: { risk: risk as Risk, action: action as Action },
                expectedText: `${RISK_LABEL[risk as Risk]}: ${ACTION_LABEL[action as Action].toLowerCase()}.`,
                highRisk: /^(y|yes|true|1)$/i.test(high ?? ''),
                source: 'import',
                author: s.viewAs === 'reviewer' ? 'Meera' : 'Arjun',
                createdAt: Date.now(),
              });
              added++;
            }
            if (added) pushAudit(s, actorName(s.viewAs), 'imported examples', p.name, `${added} from CSV`);
          });
          return added;
        },

        setInviteOpen: (pid) =>
          set((s) => {
            s.inviteOpenFor = pid;
          }),

        invite: (pid, invites, message) =>
          withProject(pid, (p, s) => {
            const valid = invites.filter((i) => /.+@.+\..+/.test(i.email));
            p.invites.push(...valid.map((i) => ({ ...i, at: Date.now() })));
            if (valid.some((i) => i.role === 'reviewer')) {
              const run = latestRun(p);
              if (run) {
                const open = new Set(p.tasks.filter((t) => !t.done && t.itemId).map((t) => t.itemId));
                const batch = p.tasks.find((t) => !t.done)?.batch ?? uid('batch');
                for (const r of run.results) {
                  if (open.has(r.itemId)) continue;
                  p.tasks.push({ id: uid('task'), kind: 'answer', itemId: r.itemId, runId: run.id, createdAt: Date.now(), requestedBy: 'Arjun', done: false, batch });
                }
              }
            }
            s.inviteOpenFor = null;
            const names = valid.map((i) => `${i.email.split('@')[0].split('.')[0].replace(/^\w/, (c) => c.toUpperCase())} (${i.role === 'reviewer' ? 'Reviewer' : i.role === 'approver' ? 'Approver' : 'Builder'})`);
            const openTasks = p.tasks.filter((t) => !t.done).length;
            msg(
              p,
              'architect',
              `Invited ${names.join(' and ')}. ${openTasks ? `${openTasks} answers are waiting in the review queue.` : ''}${message ? ` Your note went with the invite.` : ''}`,
            );
            s.toasts.push({ id: uid('t'), text: 'Invites sent.', tone: 'ok' });
            pushAudit(s, 'Arjun', 'invited', p.name, names.join(', '));
          }),

        submitReview: (pid, taskId, input) =>
          withProject(pid, (p, s) => {
            const task = p.tasks.find((t) => t.id === taskId);
            if (!task || task.done) return;
            task.done = true;
            const review: Review = {
              id: uid('rev'),
              taskId,
              itemId: task.itemId,
              flagId: task.flagId,
              by: 'Meera',
              verdict: input.verdict,
              correction: input.correction,
              correctRisk: input.correctRisk,
              correctAction: input.correctAction,
              rule: input.rule,
              at: Date.now(),
            };
            if (task.kind === 'answer' && task.itemId) {
              const item = p.answerKey.find((i) => i.id === task.itemId);
              const run = p.runs.find((r) => r.id === task.runId) ?? latestRun(p);
              const res = run?.results.find((r) => r.itemId === task.itemId);
              review.autoPass = res?.pass;
              if (item) {
                item.confirmedBy = 'Meera';
                if (input.verdict === 'right' && res && !res.pass) {
                  // The expert says the agent was right: the Answer Key was wrong.
                  item.expected = { risk: res.verdict.risk, action: res.verdict.action };
                  item.expectedText = `${RISK_LABEL[res.verdict.risk]}: ${ACTION_LABEL[res.verdict.action].toLowerCase()}. (Updated by Meera)`;
                }
                if (input.verdict === 'wrong') {
                  const risk = input.correctRisk ?? item.expected.risk;
                  const action = input.correctAction ?? item.expected.action;
                  item.expected = { risk, action };
                  if (input.correction) item.expectedText = input.correction;
                  const variant = pickVariant(p, item.claim);
                  const newItem: AnswerKeyItem = {
                    id: uid('ak'),
                    n: p.answerKey.length + 1,
                    claim: variant,
                    expected: { risk, action },
                    expectedText: input.correction || `${RISK_LABEL[risk]}: ${ACTION_LABEL[action].toLowerCase()}.`,
                    highRisk: risk === 'blocked' || risk === 'high' || item.highRisk,
                    source: 'expert',
                    author: 'Meera',
                    createdAt: Date.now(),
                    note: `From Meera's correction on ${item.claim.id}`,
                  };
                  p.answerKey.push(newItem);
                  review.createdItemId = newItem.id;
                }
              }
            }
            if (task.kind === 'flag' && task.flagId) {
              const flag = p.flags.find((f) => f.id === task.flagId);
              if (flag) {
                flag.status = 'reviewed';
                if (input.verdict === 'wrong') {
                  const risk = input.correctRisk ?? 'medium';
                  const action = input.correctAction ?? 'request_photos';
                  const newItem: AnswerKeyItem = {
                    id: uid('ak'),
                    n: p.answerKey.length + 1,
                    claim: { ...flag.claim },
                    expected: { risk, action },
                    expectedText: input.correction || `${RISK_LABEL[risk]}: ${ACTION_LABEL[action].toLowerCase()}.`,
                    highRisk: flag.claim.amount >= 9000,
                    source: 'live_flag',
                    author: 'Meera',
                    createdAt: Date.now(),
                    note: `Flagged live by ${flag.by}`,
                  };
                  p.answerKey.push(newItem);
                  review.createdItemId = newItem.id;
                }
              }
            }
            if (input.rule && !p.expertRules.includes(input.rule)) p.expertRules.push(input.rule);
            p.reviews.push(review);
            pushAudit(
              s,
              'Meera',
              input.verdict === 'wrong' ? 'corrected an answer' : input.verdict === 'right' ? 'confirmed an answer' : 'marked unsure',
              p.name,
              review.createdItemId ? 'added a test' : undefined,
            );
            const open = p.tasks.filter((t) => !t.done).length;
            if (open === 0) {
              const round = new Set(p.tasks.filter((t) => t.batch === task.batch).map((t) => t.id));
              const mine = p.reviews.filter((r) => round.has(r.taskId));
              const corrected = mine.filter((r) => r.createdItemId).length;
              const run = doRun(s, p, "After Meera's review");
              msg(
                p,
                'architect',
                `Meera finished reviewing: ${mine.length} answer${mine.length === 1 ? '' : 's'}, ${corrected} corrected. ${
                  corrected
                    ? `Her corrections added ${corrected} new test${corrected === 1 ? '' : 's'}, so the Answer Key now has ${p.answerKey.length} examples.`
                    : 'She confirmed the answers as they are.'
                } Run #${run.n}: ${run.passed} of ${run.total} match.`,
                { type: 'run', runId: run.id },
              );
              if (run.passed < run.total) {
                p.chat.push({
                  id: uid('m'),
                  from: 'architect',
                  text: 'Suggested next steps',
                  at: Date.now(),
                  card: {
                    type: 'suggest',
                    items: [
                      { label: 'Why is it failing?', prompt: 'Why is it failing?' },
                      {
                        label: p.version < 2 ? 'Fix the theft misses' : 'Fix the water damage misses',
                        prompt:
                          p.version < 2
                            ? 'Fix the misses: theft claims need a police report number before approval.'
                            : 'Fix the water damage misses: over $5,000 needs photos.',
                      },
                    ],
                  },
                });
              }
            }
          }),

        requestSignoff: (pid, env, audience) => {
          let req: LaunchRequest | null = null;
          withProject(pid, (p, s) => {
            const run = latestRun(p);
            if (!run || !s.workspace) return;
            const rules = s.workspace.rules;
            const checks = checkRules(p, rules, Date.now());
            const firstLaunch = !p.requests.some(
              (r) => r.env === env && ['approved', 'approved_conditions', 'fast_lane'].includes(r.status),
            );
            const allPass = checks.every((c) => c.pass);
            const fast = rules.fastLane && env === 'test' && !firstLaunch && allPass && !p.accessChanged;
            const r: LaunchRequest = {
              id: uid('req'),
              n: p.requests.length + 1,
              env,
              audience,
              requestedBy: 'Arjun',
              at: Date.now(),
              version: p.version,
              runId: run.id,
              status: fast ? 'fast_lane' : 'pending',
              checks,
              firstLaunch,
              decision: fast
                ? { by: 'Launch rules', at: Date.now(), conditions: [], comment: 'Every launch rule passed and data access did not change, so it took the fast lane to Test.' }
                : undefined,
            };
            p.requests.push(r);
            req = { ...r };
            msg(
              p,
              'architect',
              fast
                ? `Every launch rule passed, so v${p.version} took the fast lane to Test. Farah will see it in her audit trail. You can deploy now.`
                : `Sent the Launch Pack for v${p.version} → ${env === 'test' ? 'Test' : 'Live'} to Farah. ${checks.filter((c) => c.pass).length} of ${checks.length} launch rules pass.`,
            );
            pushAudit(s, 'Arjun', fast ? 'launched via fast lane' : 'requested sign-off', p.name, `v${p.version} → ${env}`);
          });
          return req;
        },

        decide: (pid, requestId, status, conditions, comment) =>
          withProject(pid, (p, s) => {
            const r = p.requests.find((x) => x.id === requestId);
            if (!r) return;
            r.status = status;
            r.decision = { by: 'Farah', at: Date.now(), conditions, comment };
            if (status === 'approved' || status === 'approved_conditions') p.accessChanged = false;
            const label: Record<RequestStatus, string> = {
              pending: 'is waiting',
              approved: 'approved',
              approved_conditions: 'approved with conditions',
              changes: 'sent back with changes',
              rejected: 'rejected',
              fast_lane: 'fast lane',
            };
            msg(
              p,
              'architect',
              `Farah ${label[status]} v${r.version} for ${r.env === 'test' ? 'Test' : 'Live'}.${conditions.length ? ` Conditions: ${conditions.join('; ')}.` : ''}${comment ? ` "${comment}"` : ''}`,
            );
            s.toasts.push({ id: uid('t'), text: `Decision recorded: ${label[status]}.`, tone: status.startsWith('approved') ? 'ok' : 'neutral' });
            pushAudit(s, 'Farah', label[status], p.name, `v${r.version} → ${r.env}${conditions.length ? ` · ${conditions.join('; ')}` : ''}`);
          }),

        deploy: (pid, env) => {
          let ok = false;
          withProject(pid, (p, s) => {
            const approved = [...p.requests]
              .reverse()
              .find((r) => r.env === env && ['approved', 'approved_conditions', 'fast_lane'].includes(r.status));
            if (!approved || approved.version !== p.version) {
              s.toasts.push({
                id: uid('t'),
                text: `v${p.version} needs an approved launch request for ${env === 'test' ? 'Test' : 'Live'} first.`,
                tone: 'bad',
              });
              return;
            }
            const d = p.deployments[env];
            d.version = p.version;
            d.status = 'running';
            d.at = Date.now();
            d.audience = approved.audience;
            d.history.push({ version: p.version, at: Date.now() });
            ok = true;
            if (p.version < 3 && !p.flags.length) {
              const base = Date.now() + FLAG_DELAY_MS;
              LIVE_FLAG_CLAIMS.forEach((f, i) => {
                const { verdict } = triage(f.claim, p.version);
                p.flags.push({ id: uid('flag'), claim: f.claim, verdict, env, by: f.by, note: f.note, at: base + i * 8000, status: 'open' });
              });
            }
            msg(p, 'architect', `v${p.version} is running on ${env === 'test' ? 'Test' : 'Live'} for ${approved.audience}.`);
            s.toasts.push({ id: uid('t'), text: `v${p.version} deployed to ${env === 'test' ? 'Test' : 'Live'}.`, tone: 'ok' });
            pushAudit(s, 'Arjun', 'deployed', p.name, `v${p.version} → ${env}`);
          });
          return ok;
        },

        rollback: (pid, env) =>
          withProject(pid, (p, s) => {
            const d = p.deployments[env];
            if (d.history.length < 2) return;
            d.history.pop();
            const prev = d.history[d.history.length - 1];
            d.version = prev.version;
            d.at = Date.now();
            s.toasts.push({ id: uid('t'), text: `Rolled ${env === 'test' ? 'Test' : 'Live'} back to v${prev.version}.`, tone: 'neutral' });
            pushAudit(s, 'Arjun', 'rolled back', p.name, `${env} → v${prev.version}`);
          }),

        flagAnswer: (pid, env, claim, verdict, note, by) =>
          withProject(pid, (p, s) => {
            p.flags.push({ id: uid('flag'), claim, verdict, env, by, note, at: Date.now(), status: 'open' });
            s.toasts.push({ id: uid('t'), text: 'Thanks. The answer was flagged for the team.', tone: 'ok' });
            pushAudit(s, by, 'flagged an answer', p.name, claim.title);
          }),

        arriveFlagsNow: (pid) =>
          withProject(pid, (p) => {
            const now = Date.now();
            const later = p.flags.filter((f) => f.at > now);
            later.forEach((f, i) => {
              f.at = now - (later.length - i) * 4000;
            });
          }),

        sendFlagToReview: (pid, flagId) =>
          withProject(pid, (p, s) => {
            const f = p.flags.find((x) => x.id === flagId);
            if (!f || f.status !== 'open') return;
            f.status = 'sent';
            const batch = p.tasks.find((t) => !t.done)?.batch ?? uid('batch');
            p.tasks.push({ id: uid('task'), kind: 'flag', flagId, createdAt: Date.now(), requestedBy: 'Arjun', done: false, batch });
            s.toasts.push({ id: uid('t'), text: "Sent to Meera's review queue.", tone: 'ok' });
            pushAudit(s, 'Arjun', 'sent flag to review', p.name, f.claim.title);
          }),

        updateAgent: (pid, agentId, patch) =>
          withProject(pid, (p, s) => {
            const a = p.agents.find((x) => x.id === agentId);
            if (!a) return;
            Object.assign(a, patch);
            pushAudit(s, 'Arjun', 'edited agent', p.name, a.name);
          }),

        toggleGuardrail: (pid, agentId, gid) =>
          withProject(pid, (p, s) => {
            const a = p.agents.find((x) => x.id === agentId);
            const g = a?.guardrails.find((x) => x.id === gid);
            if (!a || !g) return;
            g.on = !g.on;
            pushAudit(s, 'Arjun', g.on ? 'turned on guardrail' : 'turned off guardrail', p.name, `${a.name}: ${g.label}`);
          }),

        updateRules: (patch) =>
          set((s) => {
            if (!s.workspace) return;
            Object.assign(s.workspace.rules, patch);
            pushAudit(s, 'Farah', 'updated launch rules', s.workspace.name);
          }),

        askQuestion: (pid, text, from) =>
          withProject(pid, (p, s) => {
            const who = actorName(from);
            msg(p, 'architect', `${who} asked: “${text.trim()}” Reply here, or add the answer to the Launch Pack notes.`);
            s.toasts.push({ id: uid('t'), text: 'Question sent to Arjun.', tone: 'ok' });
            pushAudit(s, who, 'asked a question', p.name, text.trim());
          }),

        toast: (text, tone = 'neutral', opts) =>
          set((s) => {
            s.toasts.push({ id: uid('t'), text, tone, ...opts });
          }),

        dismissToast: (id) =>
          set((s) => {
            s.toasts = s.toasts.filter((t) => t.id !== id);
          }),
      };
    }),
    {
      name: 'architect2-demo-v1',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      // Version 2 added the Developer tools switch. Anyone who used Architect before it existed
      // always saw the code, so they keep seeing it until they choose otherwise.
      migrate: (saved, version) => {
        const state = (saved ?? {}) as Partial<AppState>;
        return (version < 2 ? { ...state, devTools: state.devTools ?? null, devGuess: true } : state) as AppState;
      },
      partialize: (s) => ({
        devTools: s.devTools,
        devGuess: s.devGuess,
        signedIn: s.signedIn,
        authMode: s.authMode,
        userEmail: s.userEmail,
        viewAs: s.viewAs,
        workspace: s.workspace,
        projects: s.projects,
        audit: s.audit,
      }),
    },
  ),
);

export const useProject = (pid: string) => useApp((s) => s.projects.find((p) => p.id === pid));
