import { NextResponse } from 'next/server';
import { dbConfigured, userByEmail } from '@/server/db';
import { checkPassword, publicUser, setSessionCookie } from '@/server/auth';
import { body, fail } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!dbConfigured) return fail('Accounts are not turned on for this site yet.', 503);
  const b = await body<{ email: string; password: string }>(req);
  const email = String(b.email ?? '').trim().toLowerCase();
  const password = String(b.password ?? '');
  try {
    const u = await userByEmail(email);
    if (!u || !(await checkPassword(password, u.password_hash))) {
      await new Promise((r) => setTimeout(r, 400));
      return fail(u && !u.password_hash ? 'This account uses GitHub sign-in. Use "Continue with GitHub".' : 'That email and password don’t match an account.', 401);
    }
    const res = NextResponse.json({ user: publicUser(u) });
    setSessionCookie(res, u.id);
    return res;
  } catch (err) {
    console.error('login failed', err);
    return fail('Could not sign in right now. Please try again.', 500);
  }
}
