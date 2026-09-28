/**
 * Server-only settings, read forgivingly: values are trimmed (a pasted key often carries a stray space
 * or newline), and the database address is found even when Vercel's Storage tab added a prefix
 * (for example STORAGE_DATABASE_URL).
 */
export function env(name: string): string {
  return (process.env[name] ?? '').trim();
}

/** Which setting holds the database address, if any. */
export function databaseSetting(): string | null {
  if (env('DATABASE_URL')) return 'DATABASE_URL';
  if (env('POSTGRES_URL')) return 'POSTGRES_URL';
  const key = Object.keys(process.env)
    .filter((k) => /(^|_)(DATABASE_URL|POSTGRES_URL)$/.test(k) && !/UNPOOLED|NON_POOLING|NO_SSL/.test(k) && env(k))
    .sort()[0];
  return key ?? null;
}

export function databaseUrl(): string {
  const key = databaseSetting();
  return key ? env(key) : '';
}

/** The database service, named from its address without revealing it. */
export function databaseProvider(): string | null {
  const url = databaseUrl();
  if (!url) return null;
  let host = '';
  try {
    host = new URL(url).hostname;
  } catch {
    return 'Postgres';
  }
  if (/neon\.tech$/.test(host)) return 'Neon';
  if (/supabase\.(co|com)$/.test(host) || /pooler\.supabase/.test(host)) return 'Supabase';
  if (/^(localhost|127\.0\.0\.1)$/.test(host)) return 'Local Postgres';
  return 'Postgres';
}

/** The public address of the site, always with https:// and no trailing slash. */
export function appUrl(): string {
  const raw = env('APP_URL');
  if (!raw) return '';
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withScheme.replace(/\/+$/, '');
}
