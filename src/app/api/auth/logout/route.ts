import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/server/auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
