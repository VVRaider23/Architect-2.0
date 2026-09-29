'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { create } from 'zustand';
import {
  AlertTriangle,
  Bot,
  Code2,
  Compass,
  FileCode2,
  FolderKanban,
  GitPullRequest,
  GitBranch,
  Home,
  LayoutTemplate,
  Play,
  Plus,
  Rocket,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Terminal,
  UserPlus,
  Users,
  Wrench,
  Flag,
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { latestRun } from '@/lib/engine';
import { approvedFor, pendingRequest } from '@/lib/stage';
import { homeFor } from '@/lib/routes';
import { PEOPLE } from '@/lib/seed';
import { cn } from '@/lib/utils';
import { Kbd } from './ui';

export const usePalette = create<{ open: boolean; setOpen: (b: boolean) => void }>()((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));

type Group = 'Actions' | 'Go to' | 'Files' | 'People';
interface Cmd {
  id: string;
  group: Group;
  label: string;
  icon: ReactNode;
  keys?: string[];
  words?: string;
  mono?: boolean;
  run: () => void;
}

const ic = 'h-4 w-4';

function isTyping(el: EventTarget | null) {
  const t = el as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
}

/** ⌘K anywhere: type what you want to do. Also G then A, C, W or H to jump. */
export function CommandPalette() {
  const open = usePalette((s) => s.open);
  const setOpen = usePalette((s) => s.setOpen);
  const pathname = usePathname();
  const router = useRouter();
  const signedIn = useApp((s) => s.signedIn);
  const viewAs = useApp((s) => s.viewAs);
  const pid = pathname.match(/^\/p\/([^/]+)/)?.[1];
  const p = useApp((s) => s.projects.find((x) => x.id === (pid ?? s.projects[0]?.id)));
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const gAt = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        if (!useApp.getState().signedIn) return;
        e.preventDefault();
        setOpen(!usePalette.getState().open);
        return;
      }
      if (usePalette.getState().open || isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (!useApp.getState().signedIn) return;
      const k = e.key.toLowerCase();
      if (k === 'g') {
        gAt.current = Date.now();
        return;
      }
      if (Date.now() - gAt.current > 900) return;
      gAt.current = 0;
      const id = window.location.pathname.match(/^\/p\/([^/]+)/)?.[1];
      const to: Record<string, string | undefined> = {
        h: '/home',
        p: '/projects',
        a: id && `/p/${id}/agents`,
        c: id && `/p/${id}/code`,
        w: id && `/p/${id}/prove`,
        s: id && `/p/${id}/ship`,
      };
      if (to[k]) router.push(to[k]!);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router, setOpen]);

  useEffect(() => {
    if (open) {
      setQ('');
      setHi(0);
    }
  }, [open]);

  const cmds = useMemo<Cmd[]>(() => {
    const go = (href: string) => () => router.push(href);
    const st = () => useApp.getState();
    const list: Cmd[] = [];
    if (p && viewAs === 'builder') {
      const run = latestRun(p);
      const fails = run ? run.total - run.passed : 0;
      if (fails && p.version < 3)
        list.push({
          id: 'fix',
          group: 'Actions',
          label: `Fix the ${fails} wrong answer${fails === 1 ? '' : 's'}`,
          icon: <Wrench className={ic} />,
          words: 'repair failing misses',
          run: () => {
            const cid = st().fixFailing(p.id);
            if (!cid) return;
            const ch = st().projects.find((x) => x.id === p.id)?.changes.find((c) => c.id === cid);
            st().toast(`Fixed ${ch?.fixed ?? fails} answers. ${ch?.broke ? `${ch.broke} broke.` : 'Nothing else broke.'}`, 'ok', {
              ms: 8000,
              actions: [
                { label: 'Undo', run: () => useApp.getState().undoChange(p.id, cid) },
                { label: 'View pull request', primary: true, run: () => router.push(`/p/${p.id}/pr/${cid}`) },
              ],
            });
          },
        });
      if (p.answerKey.length)
        list.push({
          id: 'run',
          group: 'Actions',
          label: `Run all ${p.answerKey.length} tests`,
          icon: <Play className={ic} />,
          words: 'proof check answer key',
          run: () => {
            const rid = st().runProof(p.id, 'From the command palette');
            const r = st().projects.find((x) => x.id === p.id)?.runs.find((x) => x.id === rid);
            if (r) st().toast(`Run #${r.n}: ${r.passed} of ${r.total} match.`, r.passed === r.total ? 'ok' : 'neutral');
          },
        });
      const last = [...p.changes].reverse().find((c) => !c.undone);
      if (last) list.push({ id: 'pr', group: 'Actions', label: 'Open the pull request', icon: <GitPullRequest className={ic} />, words: 'merge change', run: go(`/p/${p.id}/pr/${last.id}`) });
      list.push({ id: 'invite', group: 'Actions', label: 'Invite someone to check answers', icon: <UserPlus className={ic} />, words: 'expert reviewer meera', run: () => st().setInviteOpen(p.id) });
      const testOk = approvedFor(p, 'test');
      const liveOk = approvedFor(p, 'live');
      const testOn = p.deployments.test.status === 'running' && p.deployments.test.version === p.version;
      const liveOn = p.deployments.live.status === 'running' && p.deployments.live.version === p.version;
      if (testOk && !testOn)
        list.push({
          id: 'deploy-test',
          group: 'Actions',
          label: `Deploy v${p.version} to Test`,
          icon: <Rocket className={ic} />,
          words: 'ship pilot',
          run: () => {
            st().deploy(p.id, 'test');
            router.push(`/p/${p.id}/ship`);
          },
        });
      if (liveOk && !liveOn) list.push({ id: 'live', group: 'Actions', label: 'Go live for everyone', icon: <Rocket className={ic} />, words: 'deploy ship launch', run: go(`/p/${p.id}/live`) });
      if (!testOk && !pendingRequest(p) && p.build.status === 'done')
        list.push({ id: 'signoff', group: 'Actions', label: 'Ask Farah to sign off', icon: <ShieldCheck className={ic} />, words: 'approval request launch it', run: go(`/p/${p.id}/signoff`) });
      list.push(
        { id: 'g-app', group: 'Go to', label: 'App', icon: <LayoutTemplate className={ic} />, words: 'preview screens', run: go(`/p/${p.id}/app`) },
        { id: 'g-agents', group: 'Go to', label: 'Agents', icon: <Bot className={ic} />, keys: ['G', 'A'], run: go(`/p/${p.id}/agents`) },
        { id: 'g-code', group: 'Go to', label: 'Code', icon: <Code2 className={ic} />, keys: ['G', 'C'], words: 'files github', run: go(`/p/${p.id}/code`) },
        { id: 'g-prove', group: 'Go to', label: 'What’s wrong', icon: <AlertTriangle className={ic} />, keys: ['G', 'W'], words: 'prove answers tests misses', run: go(`/p/${p.id}/prove`) },
        { id: 'g-ship', group: 'Go to', label: 'Ship', icon: <Rocket className={ic} />, keys: ['G', 'S'], words: 'deploy test live', run: go(`/p/${p.id}/ship`) },
        { id: 'g-learn', group: 'Go to', label: 'Flags from real use', icon: <Flag className={ic} />, words: 'learn feedback', run: go(`/p/${p.id}/learn`) },
        { id: 'g-api', group: 'Go to', label: 'Use it from your code', icon: <Terminal className={ic} />, words: 'api key curl', run: go(`/p/${p.id}/api`) },
      );
      for (const f of ['agent.yaml', 'claims_agents/risk_rules.py', 'claims_agents/api.py', 'tests/answer_key.json'])
        list.push({ id: `f-${f}`, group: 'Files', label: f, icon: <FileCode2 className={ic} />, mono: true, run: go(`/p/${p.id}/code?file=${encodeURIComponent(f)}`) });
    }
    if (p && viewAs === 'reviewer') list.push({ id: 'review', group: 'Actions', label: 'Check answers', icon: <ShieldCheck className={ic} />, run: go(`/p/${p.id}/review`) });
    if (p && viewAs === 'approver') list.push({ id: 'decide', group: 'Actions', label: 'Decide on the launch request', icon: <ShieldCheck className={ic} />, run: go(homeFor('approver', p)) });
    if (viewAs === 'builder')
      list.push(
        { id: 'new', group: 'Actions', label: 'Start a new app', icon: <Plus className={ic} />, words: 'build create project prompt', run: go('/home') },
        { id: 'import', group: 'Actions', label: 'Import from GitHub', icon: <GitBranch className={ic} />, words: 'repo', run: go('/import') },
      );
    list.push(
      { id: 'home', group: 'Go to', label: 'Home', icon: <Home className={ic} />, keys: ['G', 'H'], run: go('/home') },
      ...(viewAs === 'builder' ? [{ id: 'projects', group: 'Go to' as Group, label: 'Projects', icon: <FolderKanban className={ic} />, keys: ['G', 'P'], run: go('/projects') }] : []),
      { id: 'settings', group: 'Go to', label: viewAs === 'approver' ? 'Launch rules' : 'Settings', icon: <Settings className={ic} />, run: go('/settings') },
      { id: 'tour', group: 'Go to', label: 'Take the guided tour', icon: <Compass className={ic} />, words: 'help demo', run: go('/tour') },
    );
    for (const person of PEOPLE)
      if (person.role !== viewAs)
        list.push({
          id: `as-${person.id}`,
          group: 'People',
          label: `See it as ${person.short}`,
          icon: person.role === 'builder' ? <Sparkles className={ic} /> : <Users className={ic} />,
          words: person.role === 'reviewer' ? 'expert reviewer' : person.role === 'approver' ? 'it approver security' : 'builder',
          run: () => {
            useApp.getState().setViewAs(person.role);
            router.push(homeFor(person.role, pid ? p : undefined));
          },
        });
    return list;
  }, [p, pid, viewAs, router]);

  const needle = q.trim().toLowerCase();
  const shown = needle
    ? cmds.filter((c) => {
        const hay = `${c.label} ${c.words ?? ''} ${c.group}`.toLowerCase();
        return needle.split(/\s+/).every((w) => hay.includes(w));
      })
    : cmds;

  useEffect(() => {
    setHi(0);
  }, [needle]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-i="${hi}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [hi]);

  if (!open || !signedIn) return null;
  const runAt = (i: number) => {
    const c = shown[i];
    if (!c) return;
    setOpen(false);
    c.run();
  };
  let lastGroup: Group | null = null;
  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/55 px-4 pt-[14vh] animate-fade-in" onMouseDown={() => setOpen(false)}>
      <div
        role="dialog"
        aria-label="Command palette"
        className="w-full max-w-[580px] overflow-hidden rounded-2xl border border-line2 bg-surface shadow-pop animate-pop-in"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="h-4 w-4 shrink-0 text-ink3" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHi((h) => (shown.length ? (h + 1) % shown.length : 0));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHi((h) => (shown.length ? (h - 1 + shown.length) % shown.length : 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                runAt(hi);
              } else if (e.key === 'Escape') {
                setOpen(false);
              }
            }}
            placeholder="Type a command or search…"
            aria-label="Type a command"
            aria-controls="palette-list"
            autoComplete="off"
            spellCheck={false}
            className="h-[52px] min-w-0 flex-1 bg-transparent text-[15.5px] text-ink placeholder:text-ink3 focus:outline-none"
          />
          <Kbd>esc</Kbd>
        </div>
        <div ref={listRef} id="palette-list" role="listbox" aria-label="Commands" className="scroll-thin max-h-[52vh] overflow-y-auto p-1.5">
          {shown.length === 0 && <div className="px-3 py-8 text-center text-[14px] text-ink3">Nothing matches “{q}”. Try “deploy”, “code” or “Meera”.</div>}
          {shown.map((c, i) => {
            const header = c.group !== lastGroup;
            lastGroup = c.group;
            return (
              <div key={c.id}>
                {header && <div className="px-2.5 pb-1 pt-2.5 text-[12px] font-medium text-ink3">{c.group}</div>}
                <button
                  type="button"
                  role="option"
                  aria-selected={i === hi}
                  data-i={i}
                  onMouseMove={() => i !== hi && setHi(i)}
                  onClick={() => runAt(i)}
                  className={cn(
                    'relative flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left text-[14px] transition-colors duration-75',
                    i === hi ? 'bg-sunken text-ink' : 'text-ink2',
                  )}
                >
                  {i === hi && <span aria-hidden className="absolute inset-y-2 left-0 w-[2px] rounded-full bg-accent" />}
                  <span className={cn(i === hi ? 'text-accent' : 'text-ink3')}>{c.icon}</span>
                  <span className={cn('flex-1 truncate', c.mono && 'font-mono text-[13px]')}>{c.label}</span>
                  {c.keys && (
                    <span className="flex gap-1">
                      {c.keys.map((k) => (
                        <Kbd key={k}>{k}</Kbd>
                      ))}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 border-t border-line px-4 py-2.5 text-[12px] text-ink3">
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd> <Kbd>↓</Kbd> move
          </span>
          <span className="flex items-center gap-1">
            <Kbd>↵</Kbd> run
          </span>
          <span className="ml-auto">Works on every screen</span>
        </div>
      </div>
    </div>
  );
}
