import { NextResponse, type NextRequest } from 'next/server';
import { callbackUrl, exchangeCode, githubIdentity } from '@/server/github';
import { ensureSchema, sql, type UserRow } from '@/server/db';
import { currentUser, encrypt, setSessionCookie } from '@/server/auth';

export const dynamic = 'force-dynamic';

function back(req: NextRequest, path: string) {
  const res = NextResponse.redirect(new URL(path, req.url));
  res.cookies.set('gh_oauth', '', { path: '/', maxAge: 0 });
  return res;
}

/** GitHub sends people here after they approve. Signs them in, or links GitHub to the current account. */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  let saved: { state: string; next: string; mode: 'signin' | 'connect' } | null = null;
  try {
    saved = JSON.parse(req.cookies.get('gh_oauth')?.value ?? 'null');
  } catch {
    saved = null;
  }
  if (p.get('error')) return back(req, `/?error=${encodeURIComponent(p.get('error_description') ?? 'GitHub sign-in was cancelled.')}`);
  const code = p.get('code');
  if (!saved || !code || p.get('state') !== saved.state) return back(req, '/?error=The+GitHub+sign-in+link+expired.+Please+try+again.');
  try {
    const { token, scope } = await exchangeCode(code, callbackUrl(req.nextUrl.origin));
    const gh = await githubIdentity(token);
    await ensureSchema();
    const db = sql();
    const enc = encrypt(token);
    const canPush = (sc: string | null | undefined) => /(^|[,\s])(public_repo|repo)([,\s]|$)/.test(sc ?? '');
    // Signing in asks for fewer permissions than "Connect GitHub"; keep the stronger token if we have one.
    const keep = (u: UserRow | undefined) => !!u?.github_token && canPush(u.github_scopes) && !canPush(scope);
    const me = await currentUser();
    let user: UserRow | undefined;
    if (me) {
      // Linking GitHub to the account that is already signed in.
      await db`update users set github_id = null, github_login = null, github_token = null, github_scopes = null where github_id = ${gh.id} and id <> ${me.id}`;
      const k = keep(me);
      [user] = await db<UserRow[]>`
        update users set github_id = ${gh.id}, github_login = ${gh.login},
          github_token = ${k ? me.github_token : enc}, github_scopes = ${k ? me.github_scopes : scope},
          name = coalesce(name, ${gh.name ?? gh.login})
        where id = ${me.id} returning *`;
    } else {
      [user] = await db<UserRow[]>`select * from users where github_id = ${gh.id}`;
      if (user) {
        const k = keep(user);
        [user] = await db<UserRow[]>`
          update users set github_login = ${gh.login}, github_token = ${k ? user.github_token : enc}, github_scopes = ${k ? user.github_scopes : scope}
          where id = ${user.id} returning *`;
      } else {
        // New person. Only keep the email if no other account already uses it.
        const taken = gh.email ? (await db`select 1 from users where lower(email) = lower(${gh.email})`).length > 0 : true;
        [user] = await db<UserRow[]>`
          insert into users (email, name, github_id, github_login, github_token, github_scopes)
          values (${taken ? null : gh.email}, ${gh.name ?? gh.login}, ${gh.id}, ${gh.login}, ${enc}, ${scope}) returning *`;
      }
    }
    const res = back(req, `/auth/callback?next=${encodeURIComponent(saved.next)}&via=github${saved.mode === 'connect' ? '&connected=1' : ''}`);
    setSessionCookie(res, user!.id);
    return res;
  } catch (err) {
    console.error('github callback failed', err);
    return back(req, '/?error=GitHub+sign-in+failed.+Please+try+again.');
  }
}
