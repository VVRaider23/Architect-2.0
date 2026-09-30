import type { Action, AnswerKeyItem, Claim, ItemSource, Project, ProofResult } from './types';
import { ACTION_SHORT, KIND_LABEL, latestRun, money } from './engine';

/** How each next step reads in a sentence: "It should ask for the police report." */
export const SHOULD: Record<Action, string> = {
  fast_track: 'be fast-tracked',
  senior_handler: 'go to a senior handler',
  ask_police_report: 'ask for the police report',
  request_photos: 'ask for photos',
  normal_review: 'go to a normal review',
};

/** How each next step reads as a short label: "Asks for the police report". */
export const DOES: Record<Action, string> = {
  fast_track: 'Fast-track',
  senior_handler: 'Sends to a senior handler',
  ask_police_report: 'Asks for the police report',
  request_photos: 'Asks for photos',
  normal_review: 'Normal review',
};

export interface Miss {
  item: AnswerKeyItem;
  result: ProofResult;
  said: string;
  should: string;
  after: string;
}

/** The answers the latest test run got wrong, in plain words. */
export function missesOf(p: Project): Miss[] {
  const run = latestRun(p);
  if (!run) return [];
  const items = new Map(p.answerKey.map((i) => [i.id, i]));
  return run.results
    .filter((r) => !r.pass)
    .map((r) => {
      const item = items.get(r.itemId)!;
      return { item, result: r, said: ACTION_SHORT[r.verdict.action], should: SHOULD[item.expected.action], after: DOES[item.expected.action] };
    })
    .filter((m) => m.item);
}

/** One sentence on what the misses have in common. */
export function missReason(ms: Miss[]): string {
  if (!ms.length) return '';
  const kinds = new Set(ms.map((m) => m.item.claim.kind));
  const all = ms.length === 1 ? 'It is' : ms.length === 2 ? 'Both are' : `All ${ms.length === 3 ? 'three' : ms.length} are`;
  if (kinds.size === 1 && kinds.has('theft')) return `${all} theft claims. Your policy says theft needs a police report first.`;
  if (kinds.size === 1 && kinds.has('water_damage')) return `${all} water damage claims over $5,000. Your policy says those need photos first.`;
  return 'The Risk scorer is missing a rule for these.';
}

export const words = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Each next step as a short name and what it means in everyday words: "Fast-track · pay it quickly". */
export const PLAIN: Record<Action, { title: string; gloss: string }> = {
  fast_track: { title: 'Fast-track', gloss: 'pay it quickly' },
  senior_handler: { title: 'Senior handler', gloss: 'an experienced person decides' },
  ask_police_report: { title: 'Hold it', gloss: 'ask for the police report first' },
  request_photos: { title: 'Ask for photos', gloss: 'see the damage before deciding' },
  normal_review: { title: 'Normal review', gloss: 'a person checks it' },
};

/** The facts that matter about a claim, in one short line: "$950, no police report". */
export function claimFacts(c: Claim) {
  if (c.kind === 'theft') return `${money(c.amount)}, ${c.policeReport ? 'police report attached' : 'no police report'}`;
  return `${money(c.amount)}, ${KIND_LABEL[c.kind].toLowerCase()}`;
}

const FROM: Record<ItemSource, (n: number) => string> = {
  plan: (n) => `${n} from the plan you approved`,
  generated: (n) => `${n} that Architect wrote to cover more cases`,
  expert: (n) => `${n} added by your expert`,
  live_flag: (n) => `${n} from answers people flagged in real use`,
  import: (n) => `${n} from your repo`,
};

/** Where the Answer Key's examples came from, in one sentence: "3 from the plan you approved, and 12 that…". */
export function examplesFrom(p: Project) {
  const counts = new Map<ItemSource, number>();
  for (const i of p.answerKey) counts.set(i.source, (counts.get(i.source) ?? 0) + 1);
  const parts = (['plan', 'generated', 'import', 'expert', 'live_flag'] as ItemSource[]).filter((k) => counts.get(k)).map((k) => FROM[k](counts.get(k)!));
  if (!parts.length) return '';
  return parts.length === 1 ? `All ${parts[0].replace(/^\d+ /, '')}.` : `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}.`;
}
