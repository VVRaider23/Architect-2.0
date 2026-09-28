export type Role = 'builder' | 'reviewer' | 'approver';
export type FrameworkId = 'lyzr' | 'langgraph' | 'crewai' | 'openai-agents' | 'google-adk';
export type Env = 'preview' | 'test' | 'live';
export type Tab = 'plan' | 'preview' | 'agents' | 'code' | 'proof' | 'launch' | 'live';

export interface Person {
  id: string;
  name: string;
  short: string;
  email: string;
  role: Role;
  initials: string;
  title: string;
}

export type ClaimKind =
  | 'water_damage'
  | 'theft'
  | 'glass'
  | 'roof'
  | 'fire'
  | 'flood'
  | 'hail'
  | 'liability';

export interface Claim {
  id: string;
  title: string;
  customer: string;
  kind: ClaimKind;
  amount: number;
  policyId: string;
  policyAgeDays: number;
  policeReport?: boolean;
  attachments: string[];
  email: string;
}

export type Risk = 'low' | 'medium' | 'high' | 'blocked';
export type Action = 'fast_track' | 'senior_handler' | 'ask_police_report' | 'request_photos' | 'normal_review';

export interface Verdict {
  risk: Risk;
  action: Action;
  reasons: string[];
  draft: string;
}

export type AgentId = 'triage_lead' | 'intake_reader' | 'policy_checker' | 'risk_scorer' | 'reply_drafter';

export interface TraceStep {
  agent: AgentId;
  text: string;
  ms: number;
  bad?: boolean;
}

export type ItemSource = 'plan' | 'generated' | 'expert' | 'live_flag' | 'import';

export interface AnswerKeyItem {
  id: string;
  n: number;
  claim: Claim;
  expected: { risk: Risk; action: Action };
  expectedText: string;
  highRisk: boolean;
  source: ItemSource;
  author: string;
  createdAt: number;
  confirmedBy?: string;
  note?: string;
}

export interface ProofResult {
  itemId: string;
  verdict: Verdict;
  pass: boolean;
  trace: TraceStep[];
  failedAgent?: AgentId;
}

export interface ProofRun {
  id: string;
  n: number;
  at: number;
  version: number;
  results: ProofResult[];
  passed: number;
  total: number;
  credits: number;
  trigger: string;
}

export type ReviewVerdict = 'right' | 'wrong' | 'unsure';

export interface ReviewTask {
  id: string;
  kind: 'answer' | 'flag';
  itemId?: string;
  runId?: string;
  flagId?: string;
  createdAt: number;
  requestedBy: string;
  done: boolean;
  /** Tasks sent together form one review round. */
  batch?: string;
}

export interface Review {
  id: string;
  taskId: string;
  itemId?: string;
  flagId?: string;
  by: string;
  verdict: ReviewVerdict;
  correction?: string;
  correctRisk?: Risk;
  correctAction?: Action;
  rule?: string;
  at: number;
  createdItemId?: string;
  autoPass?: boolean;
}

export interface FileDelta {
  path: string;
  add: number;
  del: number;
}

export interface ChangeReceipt {
  id: string;
  n: number;
  title: string;
  at: number;
  files: FileDelta[];
  fixed: number;
  broke: number;
  before: string;
  after: string;
  credits: number;
  versionFrom: number;
  versionTo: number;
  pr?: number;
  committed: boolean;
  undone?: boolean;
  diffFile?: string;
  beforeText?: string;
  afterText?: string;
}

export interface Guardrail {
  id: string;
  label: string;
  on: boolean;
}

export interface Agent {
  id: AgentId;
  name: string;
  job: string;
  kind: 'manager' | 'worker';
  instructions: string;
  model: string;
  tools: string[];
  knowledge: string[];
  guardrails: Guardrail[];
}

export interface LaunchRules {
  highRiskAll: boolean;
  minMatchOn: boolean;
  minMatch: number;
  expertReviewOn: boolean;
  expertDays: number;
  piiMaskOn: boolean;
  fastLane: boolean;
}

export interface RuleCheck {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
}

export type RequestStatus = 'pending' | 'approved' | 'approved_conditions' | 'changes' | 'rejected' | 'fast_lane';

export interface LaunchRequest {
  id: string;
  n: number;
  env: 'test' | 'live';
  audience: string;
  requestedBy: string;
  at: number;
  version: number;
  runId: string;
  status: RequestStatus;
  checks: RuleCheck[];
  firstLaunch: boolean;
  decision?: { by: string; at: number; conditions: string[]; comment: string };
}

export interface Deployment {
  env: Env;
  version: number | null;
  at?: number;
  url: string;
  audience?: string;
  status: 'none' | 'deploying' | 'running';
  history: { version: number; at: number }[];
}

export interface LiveFlag {
  id: string;
  claim: Claim;
  verdict: Verdict;
  env: Env;
  by: string;
  note: string;
  at: number;
  status: 'open' | 'sent' | 'reviewed';
}

export type ChatCard =
  | { type: 'questions' }
  | { type: 'plan' }
  | { type: 'build' }
  | { type: 'receipt'; changeId: string }
  | { type: 'run'; runId: string }
  | { type: 'suggest'; items: { label: string; prompt: string }[] };

export interface ChatMsg {
  id: string;
  from: 'user' | 'architect';
  text: string;
  at: number;
  card?: ChatCard;
}

export interface ConsultantAnswers {
  users: string[];
  systems: string[];
  risky: string;
  answered: boolean;
}

export interface PlanDoc {
  title: string;
  users: string;
  screens: string[];
  connections: string[];
  guardrails: string[];
  examples: { claim: string; answer: string }[];
}

export interface BuildState {
  status: 'none' | 'building' | 'done';
  step: number;
  startedAt?: number;
  credits: number;
}

export interface Invite {
  email: string;
  role: Role;
  at: number;
}

export interface Project {
  id: string;
  name: string;
  prompt: string;
  createdAt: number;
  framework: FrameworkId;
  repo: string;
  answers: ConsultantAnswers;
  plan: PlanDoc | null;
  planApproved: boolean;
  build: BuildState;
  agents: Agent[];
  version: number;
  answerKey: AnswerKeyItem[];
  runs: ProofRun[];
  tasks: ReviewTask[];
  reviews: Review[];
  expertRules: string[];
  changes: ChangeReceipt[];
  requests: LaunchRequest[];
  deployments: Record<Env, Deployment>;
  flags: LiveFlag[];
  chat: ChatMsg[];
  invites: Invite[];
  slackAlerts: boolean;
  /** A change touched what data the agents can reach; the fast lane stays closed until the next approval. */
  accessChanged: boolean;
  /** Set when the project started from an existing GitHub repo. */
  importedFrom?: ImportInfo;
}

export interface ImportInfo {
  repo: string;
  url: string;
  framework: string | null;
  agents: string[];
  tools: string[];
  secrets: string[];
  files: number | null;
  screens: string | null;
  tests: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  domain: string;
  domainJoin: boolean;
  runsOn: 'lyzr' | 'own';
  github: string;
  rules: LaunchRules;
  credits: number;
  members: Person[];
}

export interface AuditEvent {
  id: string;
  at: number;
  actor: string;
  action: string;
  target: string;
  detail?: string;
}

export interface ToastMsg {
  id: string;
  text: string;
  tone: 'neutral' | 'ok' | 'bad';
}

export interface OtherProject {
  id: string;
  name: string;
  stage: 'live' | 'awaiting' | 'proving' | 'test';
  stageLabel: string;
  next: string;
  updated: string;
  match: string;
}
