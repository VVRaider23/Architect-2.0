import { NextRequest, NextResponse } from 'next/server';
import { dbConfigured, ensureSchema, sql } from '@/server/db';
import { callbackUrl, githubConfigured } from '@/server/github';
import { aiProvider, allow, complete } from '@/server/ai';
import { databaseProvider, databaseSetting, env } from '@/server/env';

export const dynamic = 'force-dynamic';

/** Scrubs anything that looks like a connection string or key out of an error message. */
const clean = (e: unknown) =>
  String(e instanceof Error ? e.message : e)
    .replace(/postgres(ql)?:\/\/\S+/gi, '[database address]')
    .replace(/(sk-[a-z0-9-_]{6})[a-z0-9-_]+/gi, '$1…')
    .slice(0, 160);

let aiCache: { at: number; result: string } | null = null;

/**
 * Which real features are switched on, and whether they actually work. Safe to open in a browser:
 * it never shows keys or addresses. Add ?ai=1 to also make one tiny AI call (cached for 10 minutes).
 */
export async function GET(req: NextRequest) {
  let database = 'off';
  if (dbConfigured) {
    try {
      await ensureSchema();
      await sql()`select 1`;
      database = 'ok';
    } catch (e) {
      database = `error: ${clean(e)}`;
    }
  }

  const github = !githubConfigured() ? 'off' : dbConfigured ? 'ok' : 'needs the database too';

  const provider = aiProvider();
  let ai = provider ? `configured (${provider})` : 'off';
  if (provider && req.nextUrl.searchParams.get('ai') === '1') {
    if (aiCache && Date.now() - aiCache.at < 10 * 60_000) ai = aiCache.result;
    else if (!allow(`health:${req.headers.get('x-forwarded-for') ?? 'local'}`, 6)) ai = 'not checked: too many checks, try again later';
    else {
      try {
        const reply = await complete('Reply with the single word: ready', 'Are you there?', 5);
        ai = reply ? 'ok' : 'error: empty reply';
      } catch (e) {
        ai = `error: ${clean(e)}`;
      }
      // Remember only a working key, so a fixed key can be checked again straight away.
      if (ai === 'ok') aiCache = { at: Date.now(), result: ai };
    }
  }

  return NextResponse.json(
    {
      database,
      databaseService: databaseProvider(),
      databaseSetting: databaseSetting(),
      // Settings from the first version (Supabase sign-in) that nothing reads any more.
      unusedSettings: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'].filter((k) => env(k)),
      accounts: database === 'ok',
      github,
      githubRedirectUri: githubConfigured() ? callbackUrl(req.nextUrl.origin) : null,
      ai,
      model: provider ? env('AI_MODEL') || (provider === 'anthropic' ? 'claude-haiku-4-5-20251001' : 'gpt-4.1-mini') : null,
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}
