/**
 * Server-only sign-in helpers: password hashing (scrypt), signed session cookies (HMAC-SHA256)
 * and encryption for stored GitHub tokens (AES-256-GCM).
 */
import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import { dbConfigured, userById, type UserRow } from './db';

export const SESSION_COOKIE = 'arch_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/** AUTH_SECRET if set; otherwise derived from the database URL so no extra setup is needed. */
function secret(): Buffer {
  const base = process.env.AUTH_SECRET || `architect-2::${process.env.DATABASE_URL || process.env.POSTGRES_URL || 'local-dev'}`;
  return crypto.createHash('sha256').update(base).digest();
}

const b64 = (b: Buffer) => b.toString('base64url');

export function signSession(uid: string): string {
  const body = b64(Buffer.from(JSON.stringify({ uid, exp: Math.floor(Date.now() / 1000) + MAX_AGE })));
  const sig = b64(crypto.createHmac('sha256', secret()).update(body).digest());
  return `${body}.${sig}`;
}

export function readSession(token: string | undefined): { uid: string } | null {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const want = crypto.createHmac('sha256', secret()).update(body).digest();
  const got = Buffer.from(sig, 'base64url');
  if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as { uid: string; exp: number };
    if (!data.uid || data.exp < Date.now() / 1000) return null;
    return { uid: data.uid };
  } catch {
    return null;
  }
}

export function setSessionCookie(res: NextResponse, uid: string) {
  res.cookies.set(SESSION_COOKIE, signSession(uid), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

/** The signed-in user for this request, or null. */
export async function currentUser(): Promise<UserRow | null> {
  if (!dbConfigured) return null;
  const jar = await cookies();
  const s = readSession(jar.get(SESSION_COOKIE)?.value);
  if (!s) return null;
  try {
    return await userById(s.uid);
  } catch {
    return null;
  }
}

const scrypt = (pw: string, salt: Buffer) =>
  new Promise<Buffer>((resolve, reject) => crypto.scrypt(pw, salt, 64, (err, key) => (err ? reject(err) : resolve(key))));

export async function hashPassword(pw: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(pw, salt);
  return `scrypt$${b64(salt)}$${b64(key)}`;
}

export async function checkPassword(pw: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const [kind, salt, hash] = stored.split('$');
  if (kind !== 'scrypt' || !salt || !hash) return false;
  const key = await scrypt(pw, Buffer.from(salt, 'base64url'));
  const want = Buffer.from(hash, 'base64url');
  return key.length === want.length && crypto.timingSafeEqual(key, want);
}

function tokenKey(): Buffer {
  return crypto.createHash('sha256').update(Buffer.concat([secret(), Buffer.from('github-token')])).digest();
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', tokenKey(), iv);
  const enc = Buffer.concat([c.update(text, 'utf8'), c.final()]);
  return `${b64(iv)}.${b64(c.getAuthTag())}.${b64(enc)}`;
}

export function decrypt(blob: string | null): string | null {
  if (!blob) return null;
  try {
    const [iv, tag, enc] = blob.split('.').map((x) => Buffer.from(x, 'base64url'));
    const d = crypto.createDecipheriv('aes-256-gcm', tokenKey(), iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(enc), d.final()]).toString('utf8');
  } catch {
    return null;
  }
}

export interface PublicUser {
  id: string;
  email: string | null;
  name: string | null;
  github: { login: string; canPush: boolean } | null;
}

export function publicUser(u: UserRow): PublicUser {
  const scopes = (u.github_scopes ?? '').split(/[ ,]+/);
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    github: u.github_login && u.github_token ? { login: u.github_login, canPush: scopes.includes('public_repo') || scopes.includes('repo') } : null,
  };
}

/** What the server can do. Tells the browser which real features to show. */
export function features() {
  return {
    accounts: dbConfigured,
    github: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET && dbConfigured),
    ai: process.env.ANTHROPIC_API_KEY ? 'anthropic' : process.env.OPENAI_API_KEY ? 'openai' : null,
  } as const;
}
