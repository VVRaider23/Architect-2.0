'use client';

import { create } from 'zustand';
import type { AgentId, Tab } from './types';

/** Short-lived screen state for the project workspace (not saved). */
interface UIState {
  projectId: string | null;
  tab: Tab;
  codeFile: string | null;
  diffChangeId: string | null;
  replay: { itemId: string; runId?: string } | null;
  agent: AgentId;
  signoff: null | 'test' | 'live';
  chatOpen: boolean;
  testMode: boolean;
  proofFilter: 'all' | 'failing' | 'high' | 'expert';
  bind: (pid: string, tab: Tab) => void;
  setTab: (t: Tab) => void;
  openCode: (file: string | null, changeId?: string | null) => void;
  openReplay: (itemId: string, runId?: string) => void;
  closeReplay: () => void;
  setAgent: (a: AgentId) => void;
  openSignoff: (env: 'test' | 'live' | null) => void;
  setChatOpen: (b: boolean) => void;
  setTestMode: (b: boolean) => void;
  setProofFilter: (f: UIState['proofFilter']) => void;
}

export const useUI = create<UIState>()((set, get) => ({
  projectId: null,
  tab: 'plan',
  codeFile: null,
  diffChangeId: null,
  replay: null,
  agent: 'risk_scorer',
  signoff: null,
  chatOpen: false,
  testMode: true,
  proofFilter: 'all',
  bind: (pid, tab) => {
    if (get().projectId === pid) return;
    set({ projectId: pid, tab, codeFile: null, diffChangeId: null, replay: null, agent: 'risk_scorer', signoff: null, testMode: true, proofFilter: 'all' });
  },
  setTab: (tab) => set({ tab, replay: null }),
  openCode: (file, changeId = null) => set({ tab: 'code', codeFile: file, diffChangeId: changeId, replay: null }),
  openReplay: (itemId, runId) => set({ replay: { itemId, runId } }),
  closeReplay: () => set({ replay: null }),
  setAgent: (agent) => set({ agent }),
  openSignoff: (signoff) => set({ signoff }),
  setChatOpen: (chatOpen) => set({ chatOpen }),
  setTestMode: (testMode) => set({ testMode }),
  setProofFilter: (proofFilter) => set({ proofFilter }),
}));
