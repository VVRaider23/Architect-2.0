import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { ACTION_LABEL, AGENT_NAME, KIND_LABEL, LATEST_VERSION, RISK_LABEL, triage } from '@/lib/engine';
import type { Claim, ClaimKind } from '@/lib/types';
import { DEMO_KEY, readKey } from '@/server/apikeys';
import { allow } from '@/server/ai';

export const dynamic = 'force-dynamic';

const KINDS: ClaimKind[] = ['water_damage', 'theft', 'glass', 'roof', 'fire', 'flood', 'hail', 'liability'];

// Anyone with a key may call this from their own code, including from a browser on another site.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Cache-Control': 'no-store',
};

const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: CORS });

const EXAMPLE = { title: 'Stolen bike', kind: 'theft', amount: 950, policy_age_days: 400, police_report: false, customer: 'J. Rao' };

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/** A short, machine-readable description of the endpoint. */
export function GET(req: NextRequest) {
  return reply({
    endpoint: `${req.nextUrl.origin}/api/v1/claims/triage`,
    method: 'POST',
    auth: `Authorization: Bearer <your API key>. Try the shared demo key "${DEMO_KEY}".`,
    body: {
      kind: KINDS.join(' | '),
      amount: 'number, in dollars',
      policy_age_days: 'number, optional (default 365)',
      police_report: 'boolean, optional (theft claims)',
      title: 'string, optional',
      customer: 'string, optional (used in the draft reply)',
      email: 'string, optional (the customer’s message)',
    },
    example: EXAMPLE,
  });
}

/** Runs one claim through the app's agents and returns the decision and every agent's step. */
export async function POST(req: NextRequest) {
  const started = Date.now();
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token) return reply({ error: `Add your API key: "Authorization: Bearer <key>". To try it, use the shared demo key "${DEMO_KEY}".` }, 401);
  const key = readKey(token, LATEST_VERSION);
  if (!key) return reply({ error: 'That API key is not valid. Copy it again from Ship → Use it from your code.' }, 401);
  if (!allow(`api:${key.p}:${req.headers.get('x-forwarded-for') ?? 'local'}`, 120)) return reply({ error: 'Too many requests. Try again in a few minutes.' }, 429);

  let raw: Record<string, unknown>;
  try {
    raw = (await req.json()) as Record<string, unknown>;
  } catch {
    return reply({ error: 'Send the claim as JSON.', example: EXAMPLE }, 400);
  }
  const kind = String(raw.kind ?? '').toLowerCase().replace(/[\s-]+/g, '_') as ClaimKind;
  if (!KINDS.includes(kind)) return reply({ error: `"kind" must be one of: ${KINDS.join(', ')}.`, example: EXAMPLE }, 400);
  const amount = Number(raw.amount);
  if (!Number.isFinite(amount) || amount < 0) return reply({ error: '"amount" must be a number of dollars.', example: EXAMPLE }, 400);
  const ageRaw = raw.policy_age_days ?? raw.policyAgeDays;
  const policyAgeDays = ageRaw === undefined ? 365 : Number(ageRaw);
  if (!Number.isFinite(policyAgeDays) || policyAgeDays < 0) return reply({ error: '"policy_age_days" must be a number.', example: EXAMPLE }, 400);
  const report = raw.police_report ?? raw.policeReport;

  const claim: Claim = {
    id: `api_${crypto.randomBytes(4).toString('hex')}`,
    title: String(raw.title ?? `${KIND_LABEL[kind]} claim`).slice(0, 120),
    customer: String(raw.customer ?? 'there').slice(0, 60),
    kind,
    amount,
    policyId: 'HB-API',
    policyAgeDays,
    policeReport: report === true || report === 'true' || report === 'yes',
    attachments: [],
    email: String(raw.email ?? '').slice(0, 2000),
  };
  const { verdict, trace } = triage(claim, key.v);

  return reply({
    app: 'claims-triage',
    version: key.v,
    environment: key.e,
    claim: { id: claim.id, title: claim.title, kind, amount, policy_age_days: policyAgeDays, police_report: claim.policeReport },
    decision: {
      risk: verdict.risk,
      next_step: verdict.action,
      summary: `${RISK_LABEL[verdict.risk]}: ${ACTION_LABEL[verdict.action].toLowerCase()}`,
      reasons: verdict.reasons,
      draft_reply: verdict.draft,
    },
    steps: trace.map((s) => ({ agent: AGENT_NAME[s.agent], did: s.text, ms: s.ms })),
    took_ms: Date.now() - started,
  });
}
