import { currentUser, decrypt } from '@/server/auth';
import { GitHubError, listRepos } from '@/server/github';
import { fail, json } from '@/server/http';

export const dynamic = 'force-dynamic';

/** The signed-in person's GitHub repositories, newest first. */
export async function GET() {
  const u = await currentUser();
  const token = decrypt(u?.github_token ?? null);
  if (!u || !token) return fail('Connect GitHub first.', 401);
  try {
    const repos = await listRepos(token);
    return json({ login: u.github_login, repos: repos.map((r) => ({ name: r.full_name, description: r.description, language: r.language, pushedAt: r.pushed_at, private: r.private, url: r.html_url })) });
  } catch (err) {
    console.error('list repos failed', err);
    if (err instanceof GitHubError && err.status === 401) return json({ error: 'Your GitHub connection has expired. Connect GitHub again.', needConnect: true }, 401);
    return fail('GitHub didn’t answer. Try again in a moment.', 502);
  }
}
