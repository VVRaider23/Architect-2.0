import type { Action, AnswerKeyItem, Project, ProofResult } from './types';
import { ACTION_SHORT, latestRun } from './engine';

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
