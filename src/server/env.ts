/**
 * Server-only settings, read forgivingly: values are trimmed (a pasted key often carries a stray space
 * or newline), and the database address is found even when Vercel's Storage tab added a prefix
 * (for example STORAGE_DATABASE_URL).
 */
export function env(name: string): string {
  return (process.env[name] ?? '').trim();
}

export function databaseUrl(): string {
  const direct = env('DATABASE_URL') || env('POSTGRES_URL');
  if (direct) return direct;
  const key = Object.keys(process.env)
    .filter((k) => /(^|_)(DATABASE_URL|POSTGRES_URL)$/.test(k) && !/UNPOOLED|NON_POOLING|NO_SSL/.test(k))
    .sort()[0];
  return key ? env(key) : '';
}

/** The public address of the site, always with https:// and no trailing slash. */
export function appUrl(): string {
  const raw = env('APP_URL');
  if (!raw) return '';
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withScheme.replace(/\/+$/, '');
}
