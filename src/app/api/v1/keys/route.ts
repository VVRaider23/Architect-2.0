import { NextRequest } from 'next/server';
import { mintKey } from '@/server/apikeys';
import { allow } from '@/server/ai';
import { body, fail, json } from '@/server/http';
import { LATEST_VERSION } from '@/lib/engine';

export const dynamic = 'force-dynamic';

/** Creates an API key for one environment of a deployed app. */
export async function POST(req: NextRequest) {
  if (!allow(`keys:${req.headers.get('x-forwarded-for') ?? 'local'}`, 20)) return fail('Too many keys created. Try again in a few minutes.', 429);
  const b = await body<{ project?: string; version?: number; env?: string }>(req);
  const version = Number(b.version);
  if (!b.project || typeof b.project !== 'string') return fail('Which project is the key for?');
  if (!Number.isInteger(version) || version < 1 || version > LATEST_VERSION) return fail('Unknown version.');
  if (b.env !== 'test' && b.env !== 'live') return fail('Environment must be test or live.');
  return json({ key: mintKey({ project: b.project, version, env: b.env }) });
}
