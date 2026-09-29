'use client';

import { useApp } from './store';

/**
 * The two ways in: describe an app, or bring your code.
 *
 * What someone chose before signing in is kept in this browser, so it survives the trip
 * through sign-in (including GitHub's own page) and they land where they meant to go.
 */
export type Way = 'describe' | 'code';

const read = (k: string) => {
  try {
    return localStorage.getItem(k) ?? '';
  } catch {
    return '';
  }
};
const write = (k: string, v: string) => {
  try {
    if (v) localStorage.setItem(k, v);
    else localStorage.removeItem(k);
  } catch {
    /* private window: the choice just won't carry over */
  }
};

/** Remember how someone is starting, and what they typed (an idea, or a repo). */
export function saveStart(way: Way, value: string) {
  write('arch_way', way);
  if (way === 'code') write('arch_repo', value.trim());
  else write('arch_idea', value.trim());
}

export function savedWay(): Way {
  return read('arch_way') === 'code' ? 'code' : 'describe';
}

export function savedRepo() {
  return read('arch_repo');
}

/** Where to go once you're in: Home for an idea, Import for code. A saved repo is used once. */
export function landing(): string {
  if (savedWay() !== 'code') return '/home';
  const repo = savedRepo();
  write('arch_way', '');
  write('arch_repo', '');
  return repo ? `/import?repo=${encodeURIComponent(repo)}` : '/import';
}

/** The way someone last used on Home, so a developer who always brings code sees that first. */
export function preferredWay(): Way {
  return read('arch_way_pref') === 'code' ? 'code' : 'describe';
}
export function preferWay(way: Way) {
  write('arch_way_pref', way);
}

const PERSONAL = /^(gmail|googlemail|yahoo|outlook|hotmail|live|icloud|me|proton|protonmail|github)\b/i;

/** A sensible workspace name from the email address, so there is nothing to fill in. */
export function workspaceName(email: string, accountName?: string) {
  const domain = email.split('@')[1] || 'harborline.com';
  if (domain.startsWith('harborline')) return 'Harborline Insurance';
  if (!PERSONAL.test(domain) && domain.includes('.')) return domain.split('.')[0].replace(/^\w/, (c) => c.toUpperCase());
  return accountName ? `${accountName.split(' ')[0]}’s workspace` : 'My workspace';
}

/** Is this a company address (so colleagues with the same domain can join)? */
export function isWorkEmail(email: string) {
  return !PERSONAL.test(email.split('@')[1] || '');
}

/**
 * Sets up the workspace without asking anything. Used when someone signs in with email:
 * the GitHub question is for people who came in with GitHub, and can be answered later.
 */
export function quickWorkspace(email: string, accountName?: string, github?: string) {
  useApp.getState().setupWorkspace({ name: workspaceName(email, accountName), domainJoin: isWorkEmail(email), runsOn: 'lyzr', github });
}
