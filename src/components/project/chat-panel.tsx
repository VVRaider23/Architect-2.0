'use client';

import Link from 'next/link';
import { useRouter } from '@/lib/nav';
import { useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import { ArrowUp, Crosshair, X } from 'lucide-react';
import { chatIntent, useApp } from '@/lib/store';
import { askAI, useServer } from '@/lib/account';
import { projectFacts } from '@/lib/facts';
import type { ChatMsg, Project } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Typing } from '@/components/ui';
import { LogoMark } from '@/components/shell';

/** Point-and-ask: the part of the app the builder clicked on, so the next message can refer to it. */
export const usePoint = create<{ on: boolean; target: string | null; setOn: (b: boolean) => void; setTarget: (t: string | null) => void }>()((set) => ({
  on: false,
  target: null,
  setOn: (on) => set({ on }),
  setTarget: (target) => set({ target, on: false }),
}));

/** Tells the builder what a change did, with a way to take it back. */
export function announceChange(p: Project, before: number, router: ReturnType<typeof useRouter>) {
  const st = useApp.getState();
  const q = st.projects.find((x) => x.id === p.id);
  if (!q || q.changes.length <= before) return;
  const ch = q.changes[q.changes.length - 1];
  const what = ch.fixed ? `Fixed ${ch.fixed} answer${ch.fixed === 1 ? '' : 's'}.` : `${ch.title}.`;
  st.toast(`${what} ${ch.broke ? `${ch.broke} broke.` : 'Nothing else broke.'}`, 'ok', {
    ms: 8000,
    actions: [
      { label: 'Undo', run: () => useApp.getState().undoChange(p.id, ch.id) },
      { label: 'View pull request', primary: true, run: () => router.push(`/p/${p.id}/pr/${ch.id}`) },
    ],
  });
}

function CardLink({ m, p, onSend }: { m: ChatMsg; p: Project; onSend: (t: string) => void }) {
  const c = m.card;
  if (!c) return null;
  const chip = 'press inline-flex h-8 items-center rounded-full border border-line2 bg-surface px-3 text-[13px] font-medium text-ink hover:border-accent-line hover:bg-accent-soft';
  if (c.type === 'suggest')
    return (
      <div className="mt-2 flex flex-wrap gap-1.5">
        {c.items.map((it) =>
          it.prompt === '/invite' ? (
            <button key={it.label} type="button" className={chip} onClick={() => useApp.getState().setInviteOpen(p.id)}>
              {it.label}
            </button>
          ) : (
            <button key={it.label} type="button" className={chip} onClick={() => onSend(it.prompt)}>
              {it.label}
            </button>
          ),
        )}
      </div>
    );
  if (c.type === 'questions')
    return p.answers.answered ? null : (
      <Link href={`/p/${p.id}/questions`} className={cn(chip, 'mt-2')}>
        Answer 3 quick questions
      </Link>
    );
  if (c.type === 'plan')
    return (
      <Link href={`/p/${p.id}/plan`} className={cn(chip, 'mt-2')}>
        See the plan
      </Link>
    );
  if (c.type === 'build')
    return p.build.status === 'building' ? (
      <Link href={`/p/${p.id}/build`} className={cn(chip, 'mt-2')}>
        Watch it build
      </Link>
    ) : null;
  if (c.type === 'run') {
    const run = p.runs.find((r) => r.id === c.runId);
    if (!run) return null;
    const all = run.passed === run.total;
    return (
      <Link href={`/p/${p.id}/prove`} className={cn(chip, 'mt-2 gap-2')}>
        <span className={cn('h-2 w-2 rounded-full', all ? 'bg-ok' : 'bg-bad')} />
        {run.passed} of {run.total} match
      </Link>
    );
  }
  if (c.type === 'receipt') {
    const ch = p.changes.find((x) => x.id === c.changeId);
    if (!ch) return null;
    return (
      <Link href={`/p/${p.id}/pr/${ch.id}`} className={cn(chip, 'mt-2 gap-2', ch.undone && 'line-through opacity-60')}>
        {ch.undone ? `Change #${ch.n} was undone` : ch.merged ? `Merged #${ch.pr}` : `View the pull request`}
      </Link>
    );
  }
  return null;
}

export function ChatPanel({ p, open, onClose }: { p: Project; open: boolean; onClose: () => void }) {
  const sendChat = useApp((s) => s.sendChat);
  const addChat = useApp((s) => s.addChat);
  const aiOn = useServer((s) => !!s.features.ai);
  const target = usePoint((s) => s.target);
  const setTarget = usePoint((s) => s.setTarget);
  const router = useRouter();
  const [text, setText] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const first = useRef(true);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: first.current ? 'auto' : 'smooth', block: 'end' });
    first.current = false;
  }, [p.chat.length, pending]);

  useEffect(() => {
    if (target) inputRef.current?.focus();
  }, [target]);

  const send = (raw: string) => {
    const said = raw.trim();
    if (!said || pending) return;
    const t = target ? `${said} (about the ${target.toLowerCase()})` : said;
    setText('');
    setTarget(null);
    if (said === '/invite') {
      useApp.getState().setInviteOpen(p.id);
      return;
    }
    setPending(t);
    const before = p.changes.length;
    if (aiOn && chatIntent(p, t) === 'open') {
      askAI<{ text: string }>({ mode: 'chat', question: t, context: projectFacts(p, useApp.getState().workspace) })
        .then(({ text: answer }) => {
          addChat(p.id, 'user', t);
          addChat(p.id, 'architect', answer || 'I could not come up with an answer. Try asking another way.', true);
        })
        .catch(() => sendChat(p.id, t))
        .finally(() => setPending(null));
      return;
    }
    setTimeout(() => {
      sendChat(p.id, t);
      setPending(null);
      announceChange(p, before, router);
    }, 700);
  };

  const shown = p.chat.slice(-40);
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/50 animate-fade-in lg:hidden" onClick={onClose} aria-hidden />}
      <aside
        aria-label="Chat with Architect"
        className={cn(
          'z-40 flex w-[340px] shrink-0 flex-col border-r border-line bg-surface xl:w-[360px]',
          'max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:shadow-pop max-lg:transition-transform max-lg:duration-300 max-lg:ease-drawer',
          open ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full',
        )}
      >
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-4 lg:hidden">
          <span className="text-[14px] font-medium">Chat</span>
          <div className="flex-1" />
          <button type="button" onClick={onClose} className="press grid h-8 w-8 place-items-center rounded-lg text-ink3 hover:text-ink" aria-label="Close the chat">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 py-4" aria-live="polite">
          <div className="flex flex-col gap-4">
            {shown.map((m) =>
              m.from === 'user' ? (
                <div key={m.id} className="ml-8 self-end rounded-2xl rounded-br-md bg-surface2 px-3.5 py-2.5 text-[14px] leading-relaxed animate-msg-in">
                  {m.text}
                </div>
              ) : m.card?.type === 'suggest' ? (
                <div key={m.id} className="-mt-2 pl-[30px] animate-msg-in">
                  <CardLink m={m} p={p} onSend={send} />
                </div>
              ) : (
                <div key={m.id} className="flex gap-2.5 animate-msg-in">
                  <span className="mt-0.5">
                    <LogoMark size={20} />
                  </span>
                  <div className="min-w-0 flex-1 text-[14px] leading-relaxed text-ink">
                    <p className="text-pretty">{m.text}</p>
                    <CardLink m={m} p={p} onSend={send} />
                  </div>
                </div>
              ),
            )}
            {pending && (
              <>
                <div className="ml-8 self-end rounded-2xl rounded-br-md bg-surface2 px-3.5 py-2.5 text-[14px] leading-relaxed animate-msg-in">{pending}</div>
                <div className="flex items-center gap-2.5">
                  <LogoMark size={20} />
                  <Typing />
                </div>
              </>
            )}
            <div ref={endRef} />
          </div>
        </div>
        <form
          className="border-t border-line p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send(text);
          }}
        >
          {target && (
            <div className="mb-2 flex items-center gap-2 animate-slide-up">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-line bg-accent-soft px-2.5 py-1 text-[12.5px] font-medium text-accent-ink">
                <Crosshair className="h-3.5 w-3.5" /> {target}
              </span>
              <button type="button" onClick={() => setTarget(null)} className="press text-[12.5px] text-ink3 hover:text-ink">
                Clear
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 rounded-xl border border-line2 bg-surface2 py-1.5 pl-3.5 pr-1.5 transition-[border-color,box-shadow] focus-within:border-accent focus-within:shadow-ring">
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={target ? `What should change about the ${target.toLowerCase()}?` : 'Ask for a change…'}
              aria-label="Ask for a change"
              autoComplete="off"
              className="h-8 min-w-0 flex-1 bg-transparent text-[14px] text-ink placeholder:text-ink3 focus:outline-none"
            />
            <button
              type="submit"
              aria-label="Send"
              disabled={!text.trim() || !!pending}
              className={cn(
                'press grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-all duration-200',
                text.trim() && !pending ? 'scale-100 bg-accent text-on-accent' : 'scale-90 bg-line2 text-ink3',
              )}
            >
              <ArrowUp className="h-4 w-4" strokeWidth={2.4} />
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}
