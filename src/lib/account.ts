'use client';

import { create } from 'zustand';
import type { AuditEvent, Project, Workspace } from './types';

export interface Features {
  accounts: boolean;
  github: boolean;
  ai: 'anthropic' | 'openai' | null;
}

export interface AccountUser {
  id: string;
  email: string | null;
  name: string | null;
  github: { login: string; canPush: boolean } | null;
}

export interface SavedState {
  workspace: Workspace | null;
  projects: Project[];
  audit: AuditEvent[];
}

interface ServerState {
  loaded: boolean;
  features: Features;
  user: AccountUser | null;
  save: { status: 'idle' | 'saving' | 'saved' | 'error'; at: number | null };
  refresh: () => Promise<{ user: AccountUser | null; features: Features }>;
  setSave: (status: ServerState['save']['status']) => void;
}

const NONE: Features = { accounts: false, github: false, ai: null };

/** What this deployment can really do (accounts, GitHub, AI) and who is signed in on the server. */
export const useServer = create<ServerState>()((set) => ({
  loaded: false,
  features: NONE,
  user: null,
  save: { status: 'idle', at: null },
  refresh: async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      const data = (await res.json()) as { user: AccountUser | null; features: Features };
      set({ loaded: true, features: data.features ?? NONE, user: data.user ?? null });
      return { user: data.user ?? null, features: data.features ?? NONE };
    } catch {
      set({ loaded: true });
      return { user: null, features: NONE };
    }
  },
  setSave: (status) => set({ save: { status, at: status === 'saved' ? Date.now() : null } }),
}));

async function post<T>(url: string, data: unknown, method = 'POST'): Promise<T> {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const out = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw Object.assign(new Error(out.error || 'Something went wrong.'), { status: res.status, data: out });
  return out;
}

export const signUpRequest = (email: string, password: string, name: string) =>
  post<{ user: AccountUser }>('/api/auth/signup', { email, password, name });

export const logInRequest = (email: string, password: string) => post<{ user: AccountUser }>('/api/auth/login', { email, password });

export const logOutRequest = () => post<{ ok: boolean }>('/api/auth/logout', {});

export async function loadRemoteState(): Promise<SavedState | null> {
  const res = await fetch('/api/state', { cache: 'no-store' });
  if (!res.ok) return null;
  const data = (await res.json()) as { state: SavedState | null };
  return data.state;
}

export const saveRemoteState = (state: SavedState) => post<{ ok: boolean }>('/api/state', { state }, 'PUT');

export const githubUrl = (mode: 'signin' | 'connect', next: string) => `/api/auth/github?mode=${mode}&next=${encodeURIComponent(next)}`;

export interface PushResult {
  repo: string;
  repoUrl: string;
  commitSha: string;
  commitUrl: string;
  pr: { number: number; url: string } | null;
}

export const pushToGitHub = (input: {
  repo?: string | null;
  name: string;
  description: string;
  files: Record<string, string>;
  message: string;
  branch?: string | null;
  pr?: { title: string; body: string } | null;
}) => post<PushResult>('/api/github/push', input);

export async function listMyRepos(): Promise<{ login: string; repos: { name: string; description: string | null; language: string | null; pushedAt: string; private: boolean; url: string }[] }> {
  const res = await fetch('/api/github/repos', { cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not load your repositories.');
  return data;
}

export const askAI = <T,>(input: Record<string, unknown>) => post<T>('/api/ai', input);
