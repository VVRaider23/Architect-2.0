import crypto from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { authorizeUrl, callbackUrl, githubConfigured, SCOPES } from '@/server/github';
import { dbConfigured } from '@/server/db';

export const dynamic = 'force-dynamic';

/** Starts "Continue with GitHub" (mode=signin) or "Connect GitHub" to push code (mode=connect). */
export async function GET(req: NextRequest) {
  if (!githubConfigured() || !dbConfigured) return NextResponse.redirect(new URL('/?error=github-off', req.url));
  const mode = req.nextUrl.searchParams.get('mode') === 'connect' ? 'connect' : 'signin';
  const nextParam = req.nextUrl.searchParams.get('next') ?? '/home';
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/home';
  const state = crypto.randomBytes(16).toString('base64url');
  const res = NextResponse.redirect(authorizeUrl(state, SCOPES[mode], callbackUrl(req.nextUrl.origin)));
  res.cookies.set('gh_oauth', JSON.stringify({ state, next, mode }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return res;
}
