import type {
  Agent,
  AnswerKeyItem,
  Claim,
  ConsultantAnswers,
  Deployment,
  LaunchRules,
  OtherProject,
  Person,
  PlanDoc,
  Project,
  Workspace,
} from './types';

export const PEOPLE: Person[] = [
  {
    id: 'arjun',
    name: 'Arjun Mehta',
    short: 'Arjun',
    email: 'arjun@harborline.com',
    role: 'builder',
    initials: 'AM',
    title: 'Senior AI engineer',
  },
  {
    id: 'meera',
    name: 'Meera Krishnan',
    short: 'Meera',
    email: 'meera.k@harborline.com',
    role: 'reviewer',
    initials: 'MK',
    title: 'Claims operations lead',
  },
  {
    id: 'farah',
    name: 'Farah Siddiqui',
    short: 'Farah',
    email: 'farah.s@harborline.com',
    role: 'approver',
    initials: 'FS',
    title: 'IT and security lead',
  },
];

export const personByRole = (role: Person['role']) => PEOPLE.find((p) => p.role === role)!;
export const personById = (id: string) => PEOPLE.find((p) => p.id === id);

export const DEFAULT_RULES: LaunchRules = {
  highRiskAll: true,
  minMatchOn: true,
  minMatch: 95,
  expertReviewOn: true,
  expertDays: 14,
  piiMaskOn: true,
  fastLane: true,
};

export function defaultWorkspace(name = 'Harborline Insurance', domain = 'harborline.com'): Workspace {
  return {
    id: 'ws_harborline',
    name,
    domain,
    domainJoin: true,
    runsOn: 'lyzr',
    github: 'arjun-harborline',
    rules: { ...DEFAULT_RULES },
    credits: 1240,
    members: PEOPLE,
  };
}

export const OTHER_PROJECTS: OtherProject[] = [
  {
    id: 'broker',
    name: 'Broker Email Assistant',
    stage: 'live',
    stageLabel: 'Live',
    match: '97% match',
    next: '2 flagged answers to review',
    updated: 'Today',
  },
  {
    id: 'underwriting',
    name: 'Underwriting Helper',
    stage: 'awaiting',
    stageLabel: 'Awaiting sign-off',
    match: '44/45',
    next: 'Farah is reviewing the Launch Pack',
    updated: 'Yesterday',
  },
  {
    id: 'policyqa',
    name: 'Policy Q&A for call centre',
    stage: 'proving',
    stageLabel: 'Proving',
    match: '42/45',
    next: '3 answers waiting for Meera',
    updated: 'Mon',
  },
];

const c = (x: Claim): Claim => x;

/** The first proof run: 3 examples from the plan + 12 generated variations. */
export const SEED_CLAIMS: { claim: Claim; risk: AnswerKeyItem['expected']['risk']; action: AnswerKeyItem['expected']['action']; text: string; highRisk: boolean; source: 'plan' | 'generated' }[] = [
  {
    claim: c({ id: 'C-1042', title: 'Burst pipe', customer: 'A. Mendes', kind: 'water_damage', amount: 12400, policyId: 'HB-2210', policyAgeDays: 730, attachments: ['plumber_invoice.pdf'], email: 'Our kitchen pipe burst overnight and flooded the ground floor. The plumber\'s invoice is attached.' }),
    risk: 'high', action: 'senior_handler', text: 'High risk: water damage over $10k. Send to a senior handler.', highRisk: true, source: 'plan',
  },
  {
    claim: c({ id: 'C-1043', title: 'Stolen bike', customer: 'J. Rao', kind: 'theft', amount: 950, policyId: 'HB-2231', policyAgeDays: 400, policeReport: false, attachments: ['receipt.pdf'], email: 'Hi, my bike was stolen outside the station on Monday. Receipt attached. Can you pay out?' }),
    risk: 'blocked', action: 'ask_police_report', text: "Can't approve yet: ask for the police report number.", highRisk: true, source: 'plan',
  },
  {
    claim: c({ id: 'C-1044', title: 'Windscreen chip', customer: 'L. Okafor', kind: 'glass', amount: 180, policyId: 'HB-2254', policyAgeDays: 900, attachments: ['photo.jpg'], email: 'A stone chipped my windscreen on the motorway. Photo attached.' }),
    risk: 'low', action: 'fast_track', text: 'Low risk: fast-track and draft a confirmation.', highRisk: false, source: 'plan',
  },
  {
    claim: c({ id: 'C-1045', title: 'Roof leak', customer: 'P. Iyer', kind: 'roof', amount: 8900, policyId: 'HB-2260', policyAgeDays: 500, attachments: ['roofer_quote.pdf'], email: "Rain came through the roof after the storm. The roofer's quote is attached." }),
    risk: 'medium', action: 'request_photos', text: 'Medium risk: ask for photos of the damage.', highRisk: false, source: 'generated',
  },
  {
    claim: c({ id: 'C-1047', title: 'Flood, new policy', customer: 'S. Haddad', kind: 'flood', amount: 15200, policyId: 'HB-2301', policyAgeDays: 35, attachments: ['photos.zip'], email: 'The river burst its banks and flooded our garage. We only moved in last month.' }),
    risk: 'high', action: 'senior_handler', text: 'High risk: new policy. Send to a senior handler.', highRisk: false, source: 'generated',
  },
  {
    claim: c({ id: 'C-1046', title: 'Phone theft', customer: 'D. Costa', kind: 'theft', amount: 640, policyId: 'HB-2275', policyAgeDays: 610, policeReport: false, attachments: [], email: 'Someone took my phone from my bag at a café. Please refund me.' }),
    risk: 'blocked', action: 'ask_police_report', text: "Can't approve yet: ask for the police report number.", highRisk: true, source: 'generated',
  },
  {
    claim: c({ id: 'C-1049', title: 'Laptop theft, report attached', customer: 'M. Tan', kind: 'theft', amount: 1800, policyId: 'HB-2288', policyAgeDays: 820, policeReport: true, attachments: ['police_report.pdf'], email: 'My laptop was stolen from my car. The police report (CR-55120) is attached.' }),
    risk: 'medium', action: 'normal_review', text: 'Medium risk: normal review, the police report is there.', highRisk: false, source: 'generated',
  },
  {
    claim: c({ id: 'C-1050', title: 'Hail damage to car', customer: 'R. Novak', kind: 'hail', amount: 3200, policyId: 'HB-2290', policyAgeDays: 300, attachments: ['photos.jpg'], email: 'Hail dented the bonnet and roof of my car yesterday.' }),
    risk: 'low', action: 'fast_track', text: 'Low risk: fast-track.', highRisk: false, source: 'generated',
  },
  {
    claim: c({ id: 'C-1051', title: 'Smoke damage', customer: 'K. Adeyemi', kind: 'fire', amount: 900, policyId: 'HB-2293', policyAgeDays: 1400, attachments: [], email: 'A pan fire left smoke marks on the kitchen curtains and ceiling.' }),
    risk: 'low', action: 'fast_track', text: 'Low risk: fast-track.', highRisk: false, source: 'generated',
  },
  {
    claim: c({ id: 'C-1052', title: 'Broken glasses', customer: 'T. Brennan', kind: 'glass', amount: 240, policyId: 'HB-2297', policyAgeDays: 260, attachments: ['receipt.jpg'], email: 'I sat on my glasses. The receipt for the replacement is attached.' }),
    risk: 'low', action: 'fast_track', text: 'Low risk: fast-track.', highRisk: false, source: 'generated',
  },
  {
    claim: c({ id: 'C-1053', title: 'Washing machine leak', customer: 'H. Sato', kind: 'water_damage', amount: 4100, policyId: 'HB-2302', policyAgeDays: 1000, attachments: ['invoice.pdf'], email: 'Our washing machine leaked and damaged the floorboards in the utility room.' }),
    risk: 'low', action: 'fast_track', text: 'Low risk: fast-track.', highRisk: false, source: 'generated',
  },
  {
    claim: c({ id: 'C-1054', title: 'Storm damage to roof tiles', customer: 'G. Moreau', kind: 'roof', amount: 6200, policyId: 'HB-2306', policyAgeDays: 950, attachments: ['quote.pdf'], email: 'Last night\'s storm lifted a row of roof tiles. The quote for repairs is attached.' }),
    risk: 'medium', action: 'request_photos', text: 'Medium risk: ask for photos.', highRisk: false, source: 'generated',
  },
  {
    claim: c({ id: 'C-1055', title: 'Burst pipe, new policy', customer: 'E. Walsh', kind: 'water_damage', amount: 3000, policyId: 'HB-2310', policyAgeDays: 40, attachments: [], email: 'A pipe burst in the bathroom. We took out the policy a few weeks ago.' }),
    risk: 'high', action: 'senior_handler', text: 'High risk: new policy. Send to a senior handler.', highRisk: false, source: 'generated',
  },
  {
    claim: c({ id: 'C-1056', title: 'Cracked phone screen', customer: 'N. Duarte', kind: 'glass', amount: 320, policyId: 'HB-2311', policyAgeDays: 700, attachments: ['photo.jpg'], email: 'I dropped my phone and the screen cracked.' }),
    risk: 'low', action: 'fast_track', text: 'Low risk: fast-track.', highRisk: false, source: 'generated',
  },
  {
    claim: c({ id: 'C-1057', title: 'Basement flood from a pipe', customer: 'O. Lindqvist', kind: 'water_damage', amount: 18000, policyId: 'HB-2318', policyAgeDays: 900, attachments: ['photos.zip', 'invoice.pdf'], email: 'A pipe failed in the basement and flooded it. Photos and the invoice are attached.' }),
    risk: 'high', action: 'senior_handler', text: 'High risk: water damage over $10k. Send to a senior handler.', highRisk: true, source: 'generated',
  },
];

/** Variants used when an expert's correction becomes a new test. */
export const VARIANTS: Record<string, Claim[]> = {
  theft_no_report: [
    { id: 'C-1060', title: 'Stolen scooter, no report', customer: 'F. Ali', kind: 'theft', amount: 2100, policyId: 'HB-2320', policyAgeDays: 450, policeReport: false, attachments: [], email: 'My scooter was taken from outside my flat overnight.' },
    { id: 'C-1062', title: 'Stolen handbag, no report', customer: 'C. Nguyen', kind: 'theft', amount: 760, policyId: 'HB-2327', policyAgeDays: 300, policeReport: false, attachments: ['receipt.pdf'], email: 'My handbag was stolen on the train. Receipt for the bag attached.' },
  ],
  theft_report: [
    { id: 'C-1061', title: 'Stolen jewellery, report given', customer: 'B. Kowalski', kind: 'theft', amount: 3400, policyId: 'HB-2324', policyAgeDays: 1200, policeReport: true, attachments: ['police_report.pdf'], email: 'Burglars took my rings. The police report (CR-60213) is attached.' },
  ],
  water_mid: [
    { id: 'C-1120', title: 'Leaking boiler', customer: 'V. Rossi', kind: 'water_damage', amount: 7400, policyId: 'HB-2341', policyAgeDays: 880, attachments: [], email: 'Our boiler leaked for days before we noticed. The floor needs replacing.' },
  ],
};

export const LIVE_FLAG_CLAIMS: { claim: Claim; by: string; note: string }[] = [
  {
    claim: { id: 'C-1101', title: 'Leak under the bath', customer: 'W. Park', kind: 'water_damage', amount: 9800, policyId: 'HB-2331', policyAgeDays: 700, attachments: ['invoice.pdf'], email: 'Water has been leaking under the bath and the ceiling below has come down.' },
    by: 'Priya S., claims handler',
    note: 'Nearly $10k of water damage, fast-tracked with no photos.',
  },
  {
    claim: { id: 'C-1112', title: 'Dishwasher flood', customer: 'I. Haas', kind: 'water_damage', amount: 9950, policyId: 'HB-2336', policyAgeDays: 1500, attachments: [], email: 'The dishwasher hose split and flooded the kitchen.' },
    by: 'Dev P., claims handler',
    note: 'Same thing again: a big water claim waved through.',
  },
];

export function seedAnswerKey(now: number): AnswerKeyItem[] {
  return SEED_CLAIMS.map((s, i) => ({
    id: `ak_${s.claim.id}`,
    n: i + 1,
    claim: s.claim,
    expected: { risk: s.risk, action: s.action },
    expectedText: s.text,
    highRisk: s.highRisk,
    source: s.source,
    author: s.source === 'plan' ? 'Plan (Arjun)' : 'Generated from the plan',
    createdAt: now,
  }));
}

export function defaultAgents(): Agent[] {
  return [
    {
      id: 'triage_lead',
      name: 'Triage lead',
      job: 'Routes each claim through the team and keeps the record.',
      kind: 'manager',
      instructions: 'Send every new claim through the Intake reader, Policy checker, Risk scorer and Reply drafter, in that order. Keep a record of each step.',
      model: 'Claude Sonnet',
      tools: [],
      knowledge: [],
      guardrails: [{ id: 'log', label: 'Log every decision for the audit trail', on: true }],
    },
    {
      id: 'intake_reader',
      name: 'Intake reader',
      job: 'Reads the email and attachments and pulls out the facts.',
      kind: 'worker',
      instructions: 'Read the claim email and every attachment. Extract the claim type, amount, date, and whether a police report number is given.',
      model: 'Claude Haiku',
      tools: ['Gmail (read)'],
      knowledge: [],
      guardrails: [{ id: 'mask_pii', label: 'Mask personal data before it reaches a model', on: true }],
    },
    {
      id: 'policy_checker',
      name: 'Policy checker',
      job: 'Finds the policy and the clause that applies.',
      kind: 'worker',
      instructions: 'Find the customer\'s policy and quote the clause that applies to this kind of claim.',
      model: 'Claude Haiku',
      tools: ['Claims database (read only)'],
      knowledge: ['Policy PDFs'],
      guardrails: [],
    },
    {
      id: 'risk_scorer',
      name: 'Risk scorer',
      job: "Applies Harborline's risk rules and explains the score.",
      kind: 'worker',
      instructions: 'Score each claim from 0 to 1. High when water damage is over $10,000 or the policy is less than 60 days old. Always explain the score in one sentence.',
      model: 'Claude Sonnet',
      tools: ['Claims database (read only)'],
      knowledge: ['Policy PDFs'],
      guardrails: [{ id: 'escalate', label: 'If unsure, hand the claim to a person', on: true }],
    },
    {
      id: 'reply_drafter',
      name: 'Reply drafter',
      job: 'Drafts the reply for a handler to send. Never sends it.',
      kind: 'worker',
      instructions: 'Draft a short, friendly reply that matches the decision. Never promise a payout. Save it as a draft for a handler.',
      model: 'Claude Haiku',
      tools: ['Gmail (drafts only)'],
      knowledge: [],
      guardrails: [
        { id: 'no_payout', label: 'Never promise a payout', on: true },
        { id: 'draft_only', label: 'Draft only, never send', on: true },
      ],
    },
  ];
}

function emptyDeployments(slug: string): Project['deployments'] {
  const mk = (env: Deployment['env'], url: string): Deployment => ({ env, version: null, url, status: 'none', history: [] });
  return {
    preview: mk('preview', `preview-${slug}.harborline.architect.new`),
    test: mk('test', `${slug}-test.harborline.architect.new`),
    live: mk('live', `${slug}.harborline.architect.new`),
  };
}

const STOP = new Set(['a', 'an', 'the', 'that', 'which', 'for', 'to', 'and', 'our', 'my', 'we', 'i', 'me', 'us', 'please', 'need', 'want', 'build', 'make', 'create', 'app', 'with', 'of', 'in', 'on']);

export function nameFromPrompt(prompt: string): string {
  const p = prompt.toLowerCase();
  if (p.includes('claim')) return 'Claims Triage Assistant';
  // Name it after what comes before "that / which / who / to", e.g. "A KYC assistant that reads…" → "KYC Assistant".
  const head = prompt.split(/\b(?:that|which|who|to|for)\b|[,.:;\n]/i)[0] ?? prompt;
  const words = head
    .replace(/[^a-zA-Z0-9&\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w.toLowerCase()))
    .slice(0, 4)
    .map((w) => (w.length > 1 && w === w.toUpperCase() ? w : w[0].toUpperCase() + w.slice(1).toLowerCase()));
  let name = words.join(' ') || 'New Agent App';
  if (!/assistant|agent|bot|helper|copilot/i.test(name)) name += ' Assistant';
  return name;
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 32) || 'app';

export function newProject(id: string, prompt: string, now: number): Project {
  const name = nameFromPrompt(prompt);
  const slug = slugify(name.replace(/assistant/i, '').trim()) || 'app';
  return {
    id,
    name,
    prompt,
    createdAt: now,
    framework: 'langgraph',
    repo: `harborline/${slug}`,
    answers: { users: [], systems: [], risky: '', answered: false },
    plan: null,
    planApproved: false,
    build: { status: 'none', step: 0, credits: 0 },
    agents: defaultAgents(),
    version: 1,
    answerKey: [],
    runs: [],
    tasks: [],
    reviews: [],
    expertRules: [],
    changes: [],
    requests: [],
    deployments: emptyDeployments(slug),
    flags: [],
    chat: [],
    invites: [],
    slackAlerts: false,
    accessChanged: false,
  };
}

export function planFor(p: Project, a: ConsultantAnswers): PlanDoc {
  const users = a.users.length ? a.users.join(' and ') : 'Claims handlers';
  const internal = a.users.some((u) => /handler|team|staff/i.test(u)) ? ' (12 people, internal)' : '';
  return {
    title: `${p.name} · plan v1`,
    users: `${users} at Harborline${internal}`,
    screens: ['Claims inbox', 'Claim detail', 'Risk review', 'Reply drafts'],
    connections: [
      ...(a.systems.includes('Gmail') ? ['Gmail (read, create drafts)'] : []),
      ...(a.systems.includes('Claims database') ? ['Claims database (read only)'] : []),
      ...(a.systems.includes('Policy PDFs') ? ['Policy PDFs (knowledge)'] : []),
      ...(a.systems.includes('Slack') ? ['Slack (alerts)'] : []),
    ],
    guardrails: ['Never promise a payout', 'Mask personal data before it reaches a model', 'When unsure, hand it to a person'],
    examples: SEED_CLAIMS.filter((s) => s.source === 'plan').map((s) => ({
      claim: `${s.claim.title}, ${'$' + s.claim.amount.toLocaleString('en-US')}${s.claim.kind === 'theft' && !s.claim.policeReport ? ', no police report' : ''}`,
      answer: s.text,
    })),
  };
}

export const FRAMEWORKS: { id: Project['framework']; label: string; lang: string; note: string }[] = [
  { id: 'lyzr', label: 'Lyzr', lang: 'Python', note: "Lyzr's managed agent runtime" },
  { id: 'langgraph', label: 'LangGraph', lang: 'Python', note: 'A graph of nodes, one per agent' },
  { id: 'crewai', label: 'CrewAI', lang: 'Python', note: 'A crew of role-based agents' },
  { id: 'openai-agents', label: 'OpenAI Agents SDK', lang: 'Python', note: 'Agents with handoffs' },
  { id: 'google-adk', label: 'Google ADK', lang: 'Python', note: 'A sequential agent with sub-agents' },
];

export const frameworkLabel = (id: Project['framework']) => FRAMEWORKS.find((f) => f.id === id)?.label ?? id;
