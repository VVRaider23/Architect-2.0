/**
 * Server-only AI calls. Uses Anthropic (ANTHROPIC_API_KEY) or OpenAI (OPENAI_API_KEY), whichever is set.
 * AI_MODEL overrides the model. Everything scripted in the demo stays deterministic; AI answers the
 * open questions, runs the "Try it" agent playground and suggests app ideas.
 */
import { env } from './env';

const ANTHROPIC_URL = process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com';
const OPENAI_URL = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com';

export function aiProvider(): 'anthropic' | 'openai' | null {
  return env('ANTHROPIC_API_KEY') ? 'anthropic' : env('OPENAI_API_KEY') ? 'openai' : null;
}

export async function complete(system: string, user: string, maxTokens = 500): Promise<string> {
  const provider = aiProvider();
  if (!provider) throw new Error('No AI key is configured.');
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 25_000);
  try {
    if (provider === 'anthropic') {
      const res = await fetch(`${ANTHROPIC_URL}/v1/messages`, {
        method: 'POST',
        signal: ctl.signal,
        headers: {
          'x-api-key': env('ANTHROPIC_API_KEY'),
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: env('AI_MODEL') || 'claude-haiku-4-5-20251001',
          max_tokens: maxTokens,
          system,
          messages: [{ role: 'user', content: user }],
        }),
      });
      const data = (await res.json()) as { content?: { type: string; text?: string }[]; error?: { message?: string } };
      if (!res.ok) throw new Error(data.error?.message || `Anthropic error ${res.status}`);
      return (data.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('').trim();
    }
    const res = await fetch(`${OPENAI_URL}/v1/chat/completions`, {
      method: 'POST',
      signal: ctl.signal,
      headers: { Authorization: `Bearer ${env('OPENAI_API_KEY')}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: env('AI_MODEL') || 'gpt-4.1-mini',
        max_completion_tokens: maxTokens,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } };
    if (!res.ok) throw new Error(data.error?.message || `OpenAI error ${res.status}`);
    return (data.choices?.[0]?.message?.content ?? '').trim();
  } finally {
    clearTimeout(timer);
  }
}

/** Pulls the first JSON object or array out of a model reply. */
export function parseJson<T>(text: string): T | null {
  const start = text.search(/[[{]/);
  if (start < 0) return null;
  const open = text[start];
  const close = open === '{' ? '}' : ']';
  const end = text.lastIndexOf(close);
  if (end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

// Best-effort limit per server instance, so a shared demo link can't run up a large bill.
const hits = new Map<string, number[]>();
export function allow(key: string, max = 40, windowMs = 10 * 60_000): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) return false;
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return true;
}
