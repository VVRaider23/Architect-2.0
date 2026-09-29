'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '@/lib/store';
import type { Project } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ActionButton, Avatar, Button, CopyButton, Modal } from '@/components/ui';

const PEOPLE = [
  { name: 'Meera Krishnan', email: 'meera.k@harborline.com', title: 'Claims operations lead', initials: 'MK' },
  { name: 'Priya Shah', email: 'priya.s@harborline.com', title: 'Claims handler', initials: 'PS' },
  { name: 'Dev Patel', email: 'dev.p@harborline.com', title: 'Claims handler', initials: 'DP' },
];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Pick = { name: string; email: string; initials: string };

/** "Who knows the right answers?" Pick people by name; they get the answers to check, never the code. */
export function InviteModal({ p }: { p: Project }) {
  const open = useApp((s) => s.inviteOpenFor === p.id);
  const setInviteOpen = useApp((s) => s.setInviteOpen);
  const invite = useApp((s) => s.invite);
  const [picked, setPicked] = useState<Pick[]>([]);
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setPicked([]);
      setQ('');
    }
  }, [open]);

  const needle = q.trim().toLowerCase();
  const sugg = needle
    ? PEOPLE.filter((x) => !picked.some((c) => c.email === x.email) && (x.name.toLowerCase().includes(needle) || x.email.includes(needle)))
    : [];
  const typed = EMAIL.test(q.trim()) && !sugg.length;
  const add = (x: Pick) => {
    setPicked((c) => (c.some((y) => y.email === x.email) ? c : [...c, x]));
    setQ('');
    setHi(0);
    inputRef.current?.focus();
  };
  const url = typeof window === 'undefined' ? '' : `${window.location.origin}/p/${p.id}/review`;

  return (
    <Modal
      open={open}
      onClose={() => setInviteOpen(null)}
      title="Who knows the right answers?"
      description="They check answers in plain words and never see code."
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <CopyButton text={url} label="Copy invite link" doneText="Link copied" />
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setInviteOpen(null)}>
              Cancel
            </Button>
            <ActionButton
              size="md"
              label={picked.length > 1 ? `Invite ${picked.length} people` : 'Send invite'}
              busyLabel="Sending"
              doneLabel="Invited"
              disabled={!picked.length}
              tour="invite-send"
              run={() => true}
              onDone={() => invite(p.id, picked.map((x) => ({ email: x.email, role: 'reviewer', at: Date.now() })), '')}
            />
          </div>
        </div>
      }
    >
      <div className="relative">
        <div
          className="flex min-h-[48px] flex-wrap items-center gap-1.5 rounded-[12px] border border-line2 bg-surface px-2 py-1.5 transition-[border-color,box-shadow] focus-within:border-accent focus-within:shadow-ring"
          onClick={() => inputRef.current?.focus()}
        >
          {picked.map((x) => (
            <span key={x.email} className="inline-flex items-center gap-1.5 rounded-full border border-line2 bg-surface2 py-0.5 pl-0.5 pr-1.5 text-[13px] animate-pop-in">
              <Avatar initials={x.initials} size={22} tone="ok" />
              {x.name}
              <button
                type="button"
                aria-label={`Remove ${x.name}`}
                onClick={() => setPicked((c) => c.filter((y) => y.email !== x.email))}
                className="press grid h-5 w-5 place-items-center rounded-full text-ink3 hover:bg-sunken hover:text-ink"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setHi(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHi((h) => Math.min(h + 1, Math.max(0, sugg.length - 1)));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHi((h) => Math.max(0, h - 1));
              } else if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
                if (sugg[hi]) {
                  e.preventDefault();
                  add(sugg[hi]);
                } else if (typed) {
                  e.preventDefault();
                  const email = q.trim();
                  add({ name: email, email, initials: email.slice(0, 2).toUpperCase() });
                }
              } else if (e.key === 'Backspace' && !q && picked.length) {
                setPicked((c) => c.slice(0, -1));
              }
            }}
            placeholder={picked.length ? '' : 'Type a name, like “Meera”'}
            aria-label="Name or email"
            autoComplete="off"
            spellCheck={false}
            className="h-8 min-w-[140px] flex-1 bg-transparent px-1.5 text-[15px] text-ink placeholder:text-ink3 focus:outline-none"
          />
        </div>
        {(sugg.length > 0 || typed) && (
          <div role="listbox" className="absolute left-0 right-0 top-full z-10 mt-1.5 rounded-xl border border-line2 bg-surface2 p-1 shadow-pop animate-pop-in">
            {sugg.map((x, i) => (
              <button
                key={x.email}
                type="button"
                role="option"
                aria-selected={i === hi}
                onMouseEnter={() => setHi(i)}
                onClick={() => add(x)}
                className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left', i === hi && 'bg-sunken')}
              >
                <Avatar initials={x.initials} size={28} tone="ok" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-medium">{x.name}</span>
                  <span className="block truncate text-[12.5px] text-ink3">
                    {x.title} · {x.email}
                  </span>
                </span>
                {i === hi && <span className="text-[12px] text-ink3">Enter</span>}
              </button>
            ))}
            {typed && (
              <button
                type="button"
                onClick={() => add({ name: q.trim(), email: q.trim(), initials: q.trim().slice(0, 2).toUpperCase() })}
                className="flex w-full items-center gap-2.5 rounded-lg bg-sunken px-2.5 py-2 text-left text-[14px]"
              >
                Invite <span className="font-medium">{q.trim()}</span>
              </button>
            )}
          </div>
        )}
      </div>
      <p className="mt-3 text-[13px] text-ink3">They get the answers to check as a simple list: right, wrong or not sure.</p>
    </Modal>
  );
}
