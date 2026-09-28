import type { Project, Workspace } from './types';
import { ACTION_SHORT, RISK_LABEL, latestRun } from './engine';
import { frameworkLabel } from './seed';
import { arrivedFlags, rulesFor, stageLabel } from './stage';

/** A compact, factual summary of a project that the AI answers from. Nothing here is secret. */
export function projectFacts(p: Project, ws: Workspace | null, now = Date.now()) {
  const run = latestRun(p);
  const items = new Map(p.answerKey.map((i) => [i.id, i]));
  const { checks } = rulesFor(p, ws, now);
  return {
    app: p.name,
    prompt: p.prompt.slice(0, 400),
    framework: frameworkLabel(p.framework),
    version: p.version,
    stage: stageLabel(p, now),
    plan: p.plan ? { users: p.plan.users, screens: p.plan.screens, connections: p.plan.connections, guardrails: p.plan.guardrails } : null,
    agents: p.agents.map((a) => ({
      name: a.name,
      job: a.job,
      model: a.model,
      instructions: a.instructions,
      tools: a.tools,
      guardrailsOn: a.guardrails.filter((g) => g.on).map((g) => g.label),
    })),
    answerKey: { examples: p.answerKey.length, highRisk: p.answerKey.filter((i) => i.highRisk).length, fromExperts: p.answerKey.filter((i) => i.author === 'Meera').length },
    latestRun: run
      ? {
          number: run.n,
          passed: run.passed,
          total: run.total,
          failing: run.results
            .filter((r) => !r.pass)
            .slice(0, 8)
            .map((r) => {
              const it = items.get(r.itemId);
              return {
                claim: it ? `${it.claim.id} ${it.claim.title}, $${it.claim.amount}` : r.itemId,
                expected: it ? `${RISK_LABEL[it.expected.risk]} · ${ACTION_SHORT[it.expected.action]}` : '',
                agentSaid: `${RISK_LABEL[r.verdict.risk]} · ${ACTION_SHORT[r.verdict.action]}`,
              };
            }),
        }
      : null,
    expertReviews: { total: p.reviews.length, corrections: p.reviews.filter((r) => r.verdict === 'wrong').length, rules: p.expertRules },
    changes: p.changes.map((c) => ({ n: c.n, title: c.title, fixed: c.fixed, broke: c.broke, result: `${c.before} → ${c.after}`, undone: !!c.undone, pullRequest: c.pr ?? null })),
    launchRules: checks.map((c) => ({ rule: c.label, pass: c.pass, detail: c.detail })),
    launchRequests: p.requests.map((r) => ({ n: r.n, to: r.env, version: r.version, status: r.status, conditions: r.decision?.conditions ?? [] })),
    deployed: { test: p.deployments.test.version, live: p.deployments.live.version },
    liveFlags: arrivedFlags(p, now).map((f) => ({ claim: f.claim.title, by: f.by, status: f.status })),
    people: { builder: 'Arjun (you)', reviewer: 'Meera, claims operations lead', approver: 'Farah, IT and security lead' },
  };
}
