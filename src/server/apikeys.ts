/**
 * API keys for a deployed app. A key is signed by the server, so it can be checked without a database:
 * it carries which project, environment and version it runs, plus a random part.
 *
 *   ak_test_<payload>.<signature>
 *
 * `ak_demo` is a shared public key for trying the API from the README. It runs the latest rules.
 */
import crypto from 'node:crypto';
import { databaseUrl, env } from './env';

export type ApiEnv = 'test' | 'live';

export interface KeyClaims {
  /** Project id */
  p: string;
  /** App version the key runs */
  v: number;
  /** Environment */
  e: ApiEnv;
  /** Random part, so every key is different */
  n: string;
}

export const DEMO_KEY = 'ak_demo';

function secret(): Buffer {
  const base = env('AUTH_SECRET') || `architect-2::${databaseUrl() || 'local-dev'}`;
  return crypto.createHash('sha256').update(`api-keys::${base}`).digest();
}

function sign(body: string): string {
  return crypto.createHmac('sha256', secret()).update(body).digest('base64url').slice(0, 32);
}

export function mintKey(input: { project: string; version: number; env: ApiEnv }): string {
  const claims: KeyClaims = { p: input.project.slice(0, 40), v: input.version, e: input.env, n: crypto.randomBytes(6).toString('base64url') };
  const body = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `ak_${input.env}_${body}.${sign(body)}`;
}

export function readKey(key: string, latestVersion: number): KeyClaims | null {
  const k = key.trim();
  if (k === DEMO_KEY) return { p: 'demo', v: latestVersion, e: 'test', n: 'demo' };
  const m = k.match(/^ak_(test|live)_([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]{32})$/);
  if (!m) return null;
  const expected = Buffer.from(sign(m[2]));
  const given = Buffer.from(m[3]);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  try {
    const claims = JSON.parse(Buffer.from(m[2], 'base64url').toString('utf8')) as KeyClaims;
    if (claims.e !== m[1] || typeof claims.v !== 'number' || typeof claims.p !== 'string') return null;
    return claims;
  } catch {
    return null;
  }
}
