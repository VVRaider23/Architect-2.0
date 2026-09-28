import { type NextRequest } from 'next/server';
import { aiProvider, allow, complete, parseJson } from '@/server/ai';
import { body, fail, json } from '@/server/http';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const RISKS = ['low', 'medium', 'high', 'blocked'];
const ACTIONS = ['fast_track', 'senior_handler', 'ask_police_report', 'request_photos', 'normal_review'];

interface AiInput {
  mode: 'chat' | 'agent' | 'ideas';
  question: string;
  context: unknown;
  agent: { name: string; instructions: string; guardrails: string[] };
  claim: string;
  profile: { role: string; bottleneck: string; tools: string };
}

const CHAT_SYSTEM = `You are Architect, the AI builder inside Architect 2.0 (by Lyzr). You help a developer build an AI-agent app,
prove it with a domain expert's Answer Key (example claims with the right answers), get IT sign-off, and ship it.

Answer the question about THIS project in plain, friendly language: 2 to 5 short sentences. No headings, no bullet lists
unless the user asks, no code unless asked. Be specific and use only the project facts provided; never invent test results.
You can't change the app in this reply. If the user wants a change, tell them the exact message to send
(for example "Fix the theft misses", "Fix the water damage misses", "Run the tests", "Switch the agents to CrewAI",
"Add Slack alerts", "/invite") or which button to press (Request sign-off, Deploy, Invite).`;

export async function POST(req: NextRequest) {
  if (!aiProvider()) return fail('AI is not turned on for this site.', 503);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (!allow(ip)) return fail('That’s a lot of questions at once. Please wait a few minutes.', 429);
  const b = await body<AiInput>(req);
  try {
    if (b.mode === 'chat') {
      const q = String(b.question ?? '').slice(0, 1500);
      if (!q.trim()) return fail('Ask a question.');
      const facts = JSON.stringify(b.context ?? {}).slice(0, 12000);
      const text = await complete(CHAT_SYSTEM, `Project facts (JSON):\n${facts}\n\nQuestion: ${q}`, 450);
      return json({ text });
    }
    if (b.mode === 'agent') {
      const a = b.agent ?? { name: 'Risk scorer', instructions: '', guardrails: [] };
      const claim = String(b.claim ?? '').slice(0, 3000);
      if (!claim.trim()) return fail('Paste a claim to try.');
      const system = `You are the "${String(a.name).slice(0, 60)}" agent in a claims triage app at Harborline Insurance (a fictional insurer).
Your instructions: ${String(a.instructions).slice(0, 3000)}
Guardrails you must follow: ${(a.guardrails ?? []).map(String).join('; ').slice(0, 1000) || 'none'}.
Only use the rules in your instructions. Read the claim and reply with ONLY a JSON object:
{"risk": "low" | "medium" | "high" | "blocked", "action": "fast_track" | "senior_handler" | "ask_police_report" | "request_photos" | "normal_review",
 "reason": "one sentence naming the rule you applied", "draft": "a short, friendly reply to the customer that never promises a payout"}`;
      const text = await complete(system, claim, 400);
      const v = parseJson<{ risk: string; action: string; reason: string; draft: string }>(text);
      if (!v || !RISKS.includes(v.risk) || !ACTIONS.includes(v.action)) return json({ raw: text, verdict: null });
      return json({ verdict: { risk: v.risk, action: v.action, reason: String(v.reason ?? ''), draft: String(v.draft ?? '') } });
    }
    if (b.mode === 'ideas') {
      const p = b.profile ?? { role: '', bottleneck: '', tools: '' };
      const system = `You are Architect's AI Consultant. Suggest agent apps a person could build with Architect in a day.
Reply with ONLY a JSON array of exactly 3 objects: {"title": "2-4 words", "pitch": "one sentence on what it does",
"timeSaved": "e.g. 4 hours a week", "prompt": "a one-sentence build prompt starting with 'A' or 'An'"}. Make them specific to the person.`;
      const text = await complete(system, `Job: ${String(p.role).slice(0, 200)}\nBiggest time sink: ${String(p.bottleneck).slice(0, 400)}\nTools they use: ${String(p.tools).slice(0, 300)}`, 700);
      const ideas = parseJson<{ title: string; pitch: string; timeSaved: string; prompt: string }[]>(text);
      if (!Array.isArray(ideas) || !ideas.length) return fail('Could not come up with ideas. Try again.', 502);
      return json({ ideas: ideas.slice(0, 3) });
    }
    return fail('Unknown request.');
  } catch (err) {
    console.error('ai failed', err);
    return fail('The AI didn’t answer. Try again in a moment.', 502);
  }
}
