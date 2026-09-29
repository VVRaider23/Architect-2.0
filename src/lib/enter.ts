'use client';

import type { useRouter } from 'next/navigation';
import { useApp } from './store';
import { loadRemoteState, type AccountUser } from './account';
import { landing, quickWorkspace } from './start';

/**
 * Loads the account's saved workspace into this browser, then opens where you meant to go:
 * Home for an idea, Import for the repo you brought. A new account that came in with GitHub
 * answers the one GitHub question first; one that came in with email gets its workspace made for it.
 */
export async function enterAccount(user: AccountUser, method: string, router: Pick<ReturnType<typeof useRouter>, 'push'>, next?: string) {
  const remote = await loadRemoteState().catch(() => null);
  if (remote && (remote.workspace || remote.projects?.length)) {
    useApp.setState({ workspace: remote.workspace, projects: remote.projects ?? [], audit: remote.audit ?? [] });
  }
  const email = user.email ?? (user.github ? `${user.github.login}@github` : undefined);
  useApp.getState().signIn(method, email, 'account');
  if (useApp.getState().workspace) return router.push(next ?? landing());
  if (/github/i.test(method)) return router.push('/setup');
  quickWorkspace(email ?? '', user.name ?? undefined);
  router.push(landing());
}
