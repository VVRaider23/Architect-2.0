import { currentUser, decrypt, publicUser } from '@/server/auth';
import { GitHubError, pushFiles, type PushInput } from '@/server/github';
import { body, fail, json } from '@/server/http';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Pushes the generated code to the person's GitHub: a new repo, a commit, or a branch with a pull request. */
export async function POST(req: Request) {
  const u = await currentUser();
  const token = decrypt(u?.github_token ?? null);
  if (!u || !token) return fail('Connect GitHub first.', 401);
  if (!publicUser(u).github?.canPush) return json({ error: 'GitHub needs permission to create repositories.', needConnect: true }, 403);
  const b = await body<PushInput>(req);
  if (!b.name || !b.files || typeof b.files !== 'object' || !Object.keys(b.files).length) return fail('Nothing to push.');
  const name = String(b.name).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'architect-app';
  const branch = b.branch ? String(b.branch).replace(/[^A-Za-z0-9._/-]+/g, '-').slice(0, 80) : null;
  try {
    const result = await pushFiles(token, {
      repo: b.repo ? String(b.repo) : null,
      name,
      description: String(b.description ?? 'Built with Architect 2.0').slice(0, 300),
      files: b.files as Record<string, string>,
      message: String(b.message ?? 'Update from Architect').slice(0, 2000),
      branch,
      pr: b.pr ? { title: String(b.pr.title).slice(0, 200), body: String(b.pr.body ?? '').slice(0, 20000) } : null,
    });
    return json(result);
  } catch (err) {
    console.error('push failed', err);
    if (err instanceof GitHubError && (err.status === 401 || err.status === 403)) return json({ error: 'GitHub refused. Reconnect GitHub and try again.', needConnect: true }, 403);
    if (err instanceof GitHubError && err.status === 404) return fail('That repository is gone or you no longer have access.', 404);
    return fail(err instanceof Error ? err.message : 'Push failed.', 502);
  }
}
