/**
 * The demo agent engine.
 *
 * This is the TypeScript twin of the generated `agents/risk_rules.py`: the rules shown in the
 * Code tab are exactly the rules that run here. Versions:
 *   v1  first build (misses the theft rule, and has a gap for mid-size water damage)
 *   v2  adds "theft claims need a police report" (clause 4.2)
 *   v3  adds "water damage over $5,000 needs photos"
 */
import type {
  Action,
  AgentId,
  AnswerKeyItem,
  Claim,
  ClaimKind,
  LaunchRules,
  ProofResult,
  ProofRun,
  Project,
  Risk,
  RuleCheck,
  TraceStep,
  Verdict,
} from './types';

export const LATEST_VERSION = 3;

export const ACTION_LABEL: Record<Action, string> = {
  fast_track: 'Fast-track and confirm',
  senior_handler: 'Send to a senior handler',
  ask_police_report: 'Ask for the police report number',
  request_photos: 'Ask for photos of the damage',
  normal_review: 'Normal review by a handler',
};

export const ACTION_SHORT: Record<Action, string> = {
  fast_track: 'fast-track',
  senior_handler: 'senior handler',
  ask_police_report: 'ask for police report',
  request_photos: 'ask for photos',
  normal_review: 'normal review',
};

export const RISK_LABEL: Record<Risk, string> = {
  low: 'Low risk',
  medium: 'Medium risk',
  high: 'High risk',
  blocked: "Can't approve yet",
};

export const KIND_LABEL: Record<ClaimKind, string> = {
  water_damage: 'Water damage',
  theft: 'Theft',
  glass: 'Glass',
  roof: 'Roof',
  fire: 'Fire',
  flood: 'Flood',
  hail: 'Hail',
  liability: 'Liability',
};

export const AGENT_NAME: Record<AgentId, string> = {
  triage_lead: 'Triage lead',
  intake_reader: 'Intake reader',
  policy_checker: 'Policy checker',
  risk_scorer: 'Risk scorer',
  reply_drafter: 'Reply drafter',
};

export const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

function decide(c: Claim, version: number): { risk: Risk; action: Action; reasons: string[] } {
  if (c.policyAgeDays < 60) {
    return { risk: 'high', action: 'senior_handler', reasons: ['Policy is less than 60 days old'] };
  }
  if (c.kind === 'water_damage' && c.amount > 10_000) {
    return { risk: 'high', action: 'senior_handler', reasons: ['Water damage over $10,000'] };
  }
  if (version >= 2 && c.kind === 'theft') {
    if (!c.policeReport) {
      return {
        risk: 'blocked',
        action: 'ask_police_report',
        reasons: ['Theft claims need a police report (policy clause 4.2)'],
      };
    }
    return { risk: 'medium', action: 'normal_review', reasons: ['Theft with a police report: normal review'] };
  }
  if (version >= 3 && c.kind === 'water_damage' && c.amount > 5_000) {
    return { risk: 'medium', action: 'request_photos', reasons: ['Water damage over $5,000: ask for photos'] };
  }
  if ((['roof', 'fire', 'flood', 'hail'] as ClaimKind[]).includes(c.kind) && c.amount > 5_000) {
    return {
      risk: 'medium',
      action: 'request_photos',
      reasons: [`${KIND_LABEL[c.kind]} over $5,000: ask for photos`],
    };
  }
  return { risk: 'low', action: 'fast_track', reasons: ['Small claim with no risk signals'] };
}

export function draftFor(action: Action, customer: string): string {
  const hi = `Hi ${customer}, thanks for your claim.`;
  switch (action) {
    case 'fast_track':
      return `${hi} It meets our fast-track criteria, and a handler will confirm the next steps shortly.`;
    case 'senior_handler':
      return `${hi} A senior claims handler is looking at it and will contact you within 2 working days.`;
    case 'ask_police_report':
      return `${hi} Before we can go further, please send us the police report number for the theft.`;
    case 'request_photos':
      return `${hi} Please send a few photos of the damage so we can assess it properly.`;
    case 'normal_review':
      return `${hi} We have your police report, and a handler will review the claim and get back to you.`;
  }
}

const SCORE: Record<Risk, string> = { low: '0.21', medium: '0.52', high: '0.86', blocked: '—' };

function clauseFor(c: Claim): string {
  if (c.kind === 'theft') return 'clause 4.2: "theft claims need a police report"';
  if (c.kind === 'water_damage') return 'clause 3.1: "water damage over $10,000 goes to a senior handler"';
  if (c.policyAgeDays < 60) return 'clause 1.4: "new policies get a senior review"';
  return 'no special clause applies';
}

export function triage(c: Claim, version: number): { verdict: Verdict; trace: TraceStep[] } {
  const d = decide(c, version);
  const verdict: Verdict = { ...d, draft: draftFor(d.action, c.customer) };
  const attach = c.attachments.length ? ` and ${c.attachments.join(', ')}` : '';
  const report =
    c.kind === 'theft' ? (c.policeReport ? ', police report number included' : ', no police report mentioned') : '';
  const trace: TraceStep[] = [
    { agent: 'triage_lead', text: 'Sent the claim to the Intake reader', ms: 180 },
    {
      agent: 'intake_reader',
      text: `Read the email${attach}: ${KIND_LABEL[c.kind].toLowerCase()}, ${money(c.amount)}${report}`,
      ms: 1100,
    },
    {
      agent: 'policy_checker',
      text: `Matched policy ${c.policyId} (${c.policyAgeDays} days old), ${clauseFor(c)}`,
      ms: 1750,
    },
    {
      agent: 'risk_scorer',
      text:
        d.risk === 'blocked'
          ? `Stopped the claim: ${d.reasons[0]}`
          : `Scored it ${SCORE[d.risk]} (${d.risk}) because: ${d.reasons[0].toLowerCase()}`,
      ms: 620,
    },
    { agent: 'reply_drafter', text: `Drafted a reply: ${ACTION_SHORT[d.action]}`, ms: 2350 },
  ];
  return { verdict, trace };
}

function explainMiss(item: AnswerKeyItem, v: Verdict): string {
  const c = item.claim;
  if (c.kind === 'theft' && v.risk !== item.expected.risk) {
    return 'The Risk scorer never checked clause 4.2, so a theft claim went through without a police report check.';
  }
  if (c.kind === 'water_damage' && item.expected.action === 'request_photos') {
    return 'The Risk scorer has no rule for water damage between $5,000 and $10,000.';
  }
  return `The Risk scorer chose "${ACTION_SHORT[v.action]}" but the Answer Key expects "${ACTION_SHORT[item.expected.action]}".`;
}

export function evaluate(item: AnswerKeyItem, version: number): ProofResult {
  const { verdict, trace } = triage(item.claim, version);
  const pass = verdict.risk === item.expected.risk && verdict.action === item.expected.action;
  if (pass) return { itemId: item.id, verdict, pass, trace };
  const t = trace.map((s) =>
    s.agent === 'risk_scorer' ? { ...s, bad: true, text: `${s.text}. ${explainMiss(item, verdict)}` } : s,
  );
  return { itemId: item.id, verdict, pass, trace: t, failedAgent: 'risk_scorer' };
}

export function runAll(items: AnswerKeyItem[], version: number): ProofResult[] {
  return items.map((it) => evaluate(it, version));
}

export const creditsForRun = (n: number) => Math.max(2, Math.round(n / 3));

export function latestRun(p: Project): ProofRun | undefined {
  return p.runs[p.runs.length - 1];
}

export function agentScores(p: Project, run?: ProofRun): Record<AgentId, { pass: number; total: number }> {
  const r = run ?? latestRun(p);
  const total = r?.total ?? 0;
  const failed = r ? r.results.filter((x) => !x.pass).length : 0;
  return {
    triage_lead: { pass: total, total },
    intake_reader: { pass: total, total },
    policy_checker: { pass: total, total },
    risk_scorer: { pass: total - failed, total },
    reply_drafter: { pass: total, total },
  };
}

export const DAY = 24 * 60 * 60 * 1000;

export function checkRules(p: Project, rules: LaunchRules, now: number): RuleCheck[] {
  const run = latestRun(p);
  const checks: RuleCheck[] = [];
  const items = new Map(p.answerKey.map((i) => [i.id, i]));
  if (rules.highRiskAll) {
    const hr = run ? run.results.filter((r) => items.get(r.itemId)?.highRisk) : [];
    const ok = hr.filter((r) => r.pass).length;
    checks.push({
      id: 'high_risk',
      label: 'All high-risk examples pass',
      pass: !!run && hr.length > 0 && ok === hr.length,
      detail: run ? `${ok}/${hr.length}` : 'no test run yet',
    });
  }
  if (rules.minMatchOn) {
    const pct = run && run.total ? Math.round((run.passed / run.total) * 100) : 0;
    checks.push({
      id: 'min_match',
      label: `Overall match at least ${rules.minMatch}%`,
      pass: !!run && pct >= rules.minMatch,
      detail: run ? `${pct}%` : 'no test run yet',
    });
  }
  if (rules.expertReviewOn) {
    const last = p.reviews.reduce((m, r) => Math.max(m, r.at), 0);
    const days = last ? Math.floor((now - last) / DAY) : Infinity;
    checks.push({
      id: 'expert',
      label: `An expert reviewed answers in the last ${rules.expertDays} days`,
      pass: days <= rules.expertDays,
      detail: last ? (days === 0 ? 'today' : `${days} days ago`) : 'no expert review yet',
    });
  }
  if (rules.piiMaskOn) {
    const on = p.agents.some((a) => a.guardrails.some((g) => g.id === 'mask_pii' && g.on));
    checks.push({
      id: 'pii',
      label: 'Personal data masked before models',
      pass: on,
      detail: on ? 'on' : 'turned off in Agents',
    });
  }
  return checks;
}

export function graderAgreement(p: Project): { pct: number | null; n: number } {
  const rs = p.reviews.filter((r) => r.verdict !== 'unsure' && r.autoPass !== undefined);
  if (!rs.length) return { pct: null, n: 0 };
  const agree = rs.filter((r) => (r.verdict === 'right') === r.autoPass).length;
  return { pct: Math.round((agree / rs.length) * 100), n: rs.length };
}

export function passLabel(run?: ProofRun) {
  return run ? `${run.passed}/${run.total}` : '—';
}
