/**
 * Server-only database access. Works with any Postgres: Neon or Supabase through Vercel's Storage tab
 * (DATABASE_URL / POSTGRES_URL), or the local PGlite stand-in (scripts/local-db.mjs) during development.
 * Tables are created on first use, so there is no manual SQL step.
 */
import postgres from 'postgres';

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';

export const dbConfigured = Boolean(url);

let client: postgres.Sql | null = null;

export function sql(): postgres.Sql {
  if (!url) throw new Error('No database is configured (DATABASE_URL).');
  if (!client) {
    const local = /@(localhost|127\.0\.0\.1)(:|\/)/.test(url);
    client = postgres(url, {
      ssl: local ? false : 'require',
      max: local ? 1 : 2,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    });
  }
  return client;
}

let ready: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const db = sql();
      await db`
        create table if not exists users (
          id uuid primary key default gen_random_uuid(),
          email text unique,
          name text,
          password_hash text,
          github_id bigint unique,
          github_login text,
          github_token text,
          github_scopes text,
          created_at timestamptz not null default now()
        )`;
      await db`
        create table if not exists app_state (
          user_id uuid primary key references users (id) on delete cascade,
          state jsonb not null,
          updated_at timestamptz not null default now()
        )`;
    })().catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}

export interface UserRow {
  id: string;
  email: string | null;
  name: string | null;
  password_hash: string | null;
  github_id: string | null;
  github_login: string | null;
  github_token: string | null;
  github_scopes: string | null;
}

export async function userById(id: string): Promise<UserRow | null> {
  await ensureSchema();
  const rows = await sql()<UserRow[]>`select * from users where id = ${id}`;
  return rows[0] ?? null;
}

export async function userByEmail(email: string): Promise<UserRow | null> {
  await ensureSchema();
  const rows = await sql()<UserRow[]>`select * from users where lower(email) = lower(${email})`;
  return rows[0] ?? null;
}
