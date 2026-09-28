import { currentUser } from '@/server/auth';
import { ensureSchema, sql } from '@/server/db';
import { body, fail, json } from '@/server/http';

export const dynamic = 'force-dynamic';

/** The signed-in person's saved workspace, projects and audit trail. */
export async function GET() {
  const u = await currentUser();
  if (!u) return fail('Not signed in.', 401);
  await ensureSchema();
  const rows = await sql()<{ state: unknown; updated_at: string }[]>`select state, updated_at from app_state where user_id = ${u.id}`;
  return json({ state: rows[0]?.state ?? null, updatedAt: rows[0]?.updated_at ?? null });
}

export async function PUT(req: Request) {
  const u = await currentUser();
  if (!u) return fail('Not signed in.', 401);
  const b = await body<{ state: Record<string, unknown> }>(req);
  if (!b.state || typeof b.state !== 'object') return fail('Nothing to save.');
  const size = JSON.stringify(b.state).length;
  if (size > 3_000_000) return fail('This workspace is too large to save.', 413);
  await ensureSchema();
  await sql()`
    insert into app_state (user_id, state, updated_at) values (${u.id}, ${sql().json(b.state as never)}, now())
    on conflict (user_id) do update set state = excluded.state, updated_at = now()`;
  return json({ ok: true, savedAt: new Date().toISOString() });
}

/** Same as PUT; used by the browser to save the last changes when a tab closes. */
export const POST = PUT;
