'use client';

import type { useRouter } from 'next/navigation';
import { useApp } from './store';
import { loadRemoteState, type AccountUser } from './account';

/** Loads the account's saved workspace into this browser, then opens Home (or Setup for a new account). */
export async function enterAccount(user: AccountUser, method: string, router: ReturnType<typeof useRouter>, next = '/home') {
  const remote = await loadRemoteState().catch(() => null);
  if (remote && (remote.workspace || remote.projects?.length)) {
    useApp.setState({ workspace: remote.workspace, projects: remote.projects ?? [], audit: remote.audit ?? [] });
  }
  useApp.getState().signIn(method, user.email ?? (user.github ? `${user.github.login}@github` : undefined), 'account');
  router.push(useApp.getState().workspace ? next : '/setup');
}
