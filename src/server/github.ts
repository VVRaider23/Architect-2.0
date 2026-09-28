/**
 * Server-only GitHub helpers: OAuth sign-in, the signed-in person's repos, and pushing generated code
 * (new repo, commits, branches and pull requests) with the Git Data API.
 * Base URLs can be overridden for local testing against a mock (GITHUB_API_URL, GITHUB_OAUTH_URL).
 */
export const GH_API = process.env.GITHUB_API_URL ?? 'https://api.github.com';
export const GH_OAUTH = process.env.GITHUB_OAUTH_URL ?? 'https://github.com';

export const githubConfigured = () => Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);

export const SCOPES = {
  signin: 'read:user user:email',
  connect: 'read:user user:email public_repo',
};

/** Where GitHub sends people back. Uses the production address on Vercel so it matches the OAuth app. */
export function callbackUrl(origin: string) {
  const base = process.env.APP_URL || (process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : origin);
  return `${base.replace(/\/$/, '')}/api/auth/github/callback`;
}

export function authorizeUrl(state: string, scope: string, redirectUri: string) {
  const q = new URLSearchParams({ client_id: process.env.GITHUB_CLIENT_ID ?? '', redirect_uri: redirectUri, scope, state, allow_signup: 'true' });
  return `${GH_OAUTH}/login/oauth/authorize?${q}`;
}

export async function exchangeCode(code: string, redirectUri: string): Promise<{ token: string; scope: string }> {
  const res = await fetch(`${GH_OAUTH}/login/oauth/access_token`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.GITHUB_CLIENT_ID, client_secret: process.env.GITHUB_CLIENT_SECRET, code, redirect_uri: redirectUri }),
    cache: 'no-store',
  });
  const data = (await res.json()) as { access_token?: string; scope?: string; error_description?: string };
  if (!data.access_token) throw new Error(data.error_description || 'GitHub did not return a token.');
  return { token: data.access_token, scope: data.scope ?? '' };
}

export class GitHubError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function gh<T>(token: string | null, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${GH_API}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'architect-2-prototype',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    let msg = `${res.status}`;
    try {
      const j = (await res.json()) as { message?: string; errors?: { message?: string }[] };
      msg = [j.message, j.errors?.map((e) => e.message).join('; ')].filter(Boolean).join(': ') || msg;
    } catch {
      /* not JSON */
    }
    throw new GitHubError(res.status, msg);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export interface GhUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
}

export async function githubIdentity(token: string): Promise<GhUser> {
  const u = await gh<GhUser>(token, '/user');
  if (!u.email) {
    try {
      const emails = await gh<{ email: string; primary: boolean; verified: boolean }[]>(token, '/user/emails');
      u.email = emails.find((e) => e.primary && e.verified)?.email ?? emails.find((e) => e.verified)?.email ?? null;
    } catch {
      /* email scope not granted */
    }
  }
  return u;
}

export interface RepoSummary {
  full_name: string;
  description: string | null;
  language: string | null;
  pushed_at: string;
  private: boolean;
  html_url: string;
}

export async function listRepos(token: string): Promise<RepoSummary[]> {
  return gh<RepoSummary[]>(token, '/user/repos?sort=pushed&per_page=20&affiliation=owner,collaborator,organization_member');
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface PushInput {
  repo?: string | null;
  name: string;
  description: string;
  files: Record<string, string>;
  message: string;
  branch?: string | null;
  pr?: { title: string; body: string } | null;
}

export interface PushResult {
  repo: string;
  repoUrl: string;
  commitSha: string;
  commitUrl: string;
  pr: { number: number; url: string } | null;
}

async function createRepo(token: string, name: string, description: string): Promise<{ full_name: string; default_branch: string; html_url: string }> {
  for (let i = 0; i < 5; i++) {
    const tryName = i === 0 ? name : `${name}-${i + 1}`;
    try {
      return await gh(token, '/user/repos', { method: 'POST', body: JSON.stringify({ name: tryName, description, private: false, auto_init: true }) });
    } catch (err) {
      if (err instanceof GitHubError && err.status === 422) continue; // name taken
      throw err;
    }
  }
  throw new GitHubError(422, 'Could not find a free repository name.');
}

export async function pushFiles(token: string, input: PushInput): Promise<PushResult> {
  let full = input.repo ?? null;
  let base = 'main';
  if (!full) {
    const r = await createRepo(token, input.name, input.description);
    full = r.full_name;
    base = r.default_branch || 'main';
  } else {
    const r = await gh<{ default_branch: string }>(token, `/repos/${full}`);
    base = r.default_branch || 'main';
  }
  // A brand-new repo can take a moment before its first commit is readable.
  let headSha = '';
  for (let i = 0; i < 6; i++) {
    try {
      const ref = await gh<{ object: { sha: string } }>(token, `/repos/${full}/git/ref/heads/${base}`);
      headSha = ref.object.sha;
      break;
    } catch (err) {
      if (i === 5) throw err;
      await sleep(800);
    }
  }
  const head = await gh<{ tree: { sha: string } }>(token, `/repos/${full}/git/commits/${headSha}`);
  const tree = await gh<{ sha: string }>(token, `/repos/${full}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({
      base_tree: head.tree.sha,
      tree: Object.entries(input.files).map(([path, content]) => ({ path, mode: '100644', type: 'blob', content })),
    }),
  });
  const commit = await gh<{ sha: string; html_url: string }>(token, `/repos/${full}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({ message: input.message, tree: tree.sha, parents: [headSha] }),
  });
  let pr: PushResult['pr'] = null;
  if (input.branch) {
    try {
      await gh(token, `/repos/${full}/git/refs`, { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${input.branch}`, sha: commit.sha }) });
    } catch (err) {
      if (!(err instanceof GitHubError && err.status === 422)) throw err;
      await gh(token, `/repos/${full}/git/refs/heads/${input.branch}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha, force: true }) });
    }
    if (input.pr) {
      try {
        const p = await gh<{ number: number; html_url: string }>(token, `/repos/${full}/pulls`, {
          method: 'POST',
          body: JSON.stringify({ title: input.pr.title, head: input.branch, base, body: input.pr.body }),
        });
        pr = { number: p.number, url: p.html_url };
      } catch (err) {
        if (!(err instanceof GitHubError && err.status === 422)) throw err;
        const owner = full.split('/')[0];
        const open = await gh<{ number: number; html_url: string }[]>(token, `/repos/${full}/pulls?head=${owner}:${input.branch}&state=open`);
        if (open[0]) pr = { number: open[0].number, url: open[0].html_url };
      }
    }
  } else {
    await gh(token, `/repos/${full}/git/refs/heads/${base}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha }) });
  }
  return {
    repo: full,
    repoUrl: `https://github.com/${full}`,
    commitSha: commit.sha,
    commitUrl: commit.html_url || `https://github.com/${full}/commit/${commit.sha}`,
    pr,
  };
}
