import { NextResponse } from 'next/server';
import { ensureSchema, sql, userByEmail, type UserRow } from '@/server/db';
import { dbConfigured } from '@/server/db';
import { hashPassword, publicUser, setSessionCookie } from '@/server/auth';
import { body, fail } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!dbConfigured) return fail('Accounts are not turned on for this site yet.', 503);
  const b = await body<{ email: string; password: string; name: string }>(req);
  const email = String(b.email ?? '').trim().toLowerCase();
  const password = String(b.password ?? '');
  const name = String(b.name ?? '').trim().slice(0, 80) || email.split('@')[0];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Enter a valid email address.');
  if (password.length < 8) return fail('Use at least 8 characters for your password.');
  try {
    await ensureSchema();
    if (await userByEmail(email)) return fail('An account with this email already exists. Sign in instead.', 409);
    const hash = await hashPassword(password);
    const rows = await sql()<UserRow[]>`insert into users (email, name, password_hash) values (${email}, ${name}, ${hash}) returning *`;
    const res = NextResponse.json({ user: publicUser(rows[0]), created: true });
    setSessionCookie(res, rows[0].id);
    return res;
  } catch (err) {
    console.error('signup failed', err);
    return fail('Could not create the account right now. Please try again.', 500);
  }
}
