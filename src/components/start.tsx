'use client';

import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowUp, GitBranch, Loader2, MessageSquareText } from 'lucide-react';
import type { Way } from '@/lib/start';
import { repoFrom, type RepoChoice } from '@/lib/repos';
import { cn } from '@/lib/utils';

const WAYS: { id: Way; label: string; icon: typeof GitBranch }[] = [
  { id: 'describe', label: 'Describe it', icon: MessageSquareText },
  { id: 'code', label: 'Bring your code', icon: GitBranch },
];

/**
 * The two ways in. Plain text tabs with one underline that slides to the chosen one,
 * so they read as "how do you want to start?" rather than as another setting.
 */
export function WayTabs({ way, onChange, className }: { way: Way; onChange: (w: Way) => void; className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [bar, setBar] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const el = wrap.current?.querySelector<HTMLElement>(`[data-way="${way}"]`);
    if (el) setBar({ left: el.offsetLeft, width: el.offsetWidth });
  }, [way]);

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const next = way === 'describe' ? 'code' : 'describe';
    onChange(next);
    wrap.current?.querySelector<HTMLElement>(`[data-way="${next}"]`)?.focus();
  };

  return (
    <div ref={wrap} role="tablist" aria-label="How do you want to start?" className={cn('relative inline-flex gap-6', className)} onKeyDown={onKey} data-tour="ways-in">
      {WAYS.map((w) => {
        const on = w.id === way;
        return (
          <button
            key={w.id}
            type="button"
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            data-way={w.id}
            onClick={() => onChange(w.id)}
            className={cn('press inline-flex items-center gap-2 pb-2.5 text-[14.5px] font-medium transition-colors duration-200', on ? 'text-ink' : 'text-ink3 hover:text-ink2')}
          >
            <w.icon className={cn('h-4 w-4 transition-colors duration-200', on ? 'text-accent' : 'text-ink3')} aria-hidden />
            {w.label}
          </button>
        );
      })}
      <span
        aria-hidden
        className="absolute bottom-0 left-0 h-[2px] rounded-full bg-accent transition-[transform,width] duration-300 ease-out"
        style={bar ? { width: bar.width, transform: `translateX(${bar.left}px)` } : { width: 0 }}
      />
    </div>
  );
}

/**
 * "Bring your code": one line for a GitHub repo, the same size and feel as the idea box,
 * so switching between the two ways in doesn't make the page jump.
 */
export function RepoBox({
  value,
  onChange,
  onSubmit,
  busy,
  autoFocus,
  hint,
  picks,
  onPick,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Called with the repo (owner/name), or '' to choose one after signing in. */
  onSubmit: (repo: string) => void;
  busy?: boolean;
  autoFocus?: boolean;
  hint: string;
  picks?: RepoChoice[];
  onPick?: (repo: string) => void;
}) {
  const [error, setError] = useState('');
  const [shaking, setShaking] = useState(false);
  const repo = repoFrom(value);
  const typed = value.trim().length > 0;

  const submit = () => {
    if (busy) return;
    if (typed && !repo) {
      setError('That doesn’t look like a GitHub repo. Try owner/name, or paste its github.com link.');
      setShaking(true);
      setTimeout(() => setShaking(false), 340);
      return;
    }
    onSubmit(repo ?? '');
  };

  return (
    <div>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className={cn(
          'rounded-2xl border bg-surface text-left shadow-card transition-[border-color,box-shadow] duration-200 focus-within:shadow-ring',
          error ? 'border-bad/70' : 'border-line2 focus-within:border-accent/70',
          shaking && 'shake',
        )}
      >
        <label className="flex items-center gap-2.5 px-4 pt-4">
          <GitBranch className="h-4 w-4 shrink-0 text-ink3" aria-hidden />
          <input
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setError('');
            }}
            placeholder="github.com/your-team/your-repo"
            aria-label="Your GitHub repo"
            aria-invalid={!!error}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            autoFocus={autoFocus}
            className="h-9 min-w-0 flex-1 bg-transparent text-[16px] text-ink placeholder:text-ink3 focus:outline-none"
          />
        </label>
        <div className="flex items-center gap-2 px-3 pb-3 pt-3">
          <span className="min-w-0 flex-1 truncate pl-1 text-[12.5px] text-ink3">{repo ? `Press Enter to read ${repo}` : typed ? 'owner/name or a github.com link' : 'Paste a repo, or press Enter to pick one'}</span>
          <button
            type="submit"
            aria-label="Continue"
            className={cn(
              'press grid h-9 w-9 shrink-0 place-items-center rounded-[10px] transition-all duration-200',
              !typed || repo ? 'bg-accent text-on-accent shadow-glow' : 'scale-95 bg-line2 text-ink3',
            )}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" strokeWidth={2.4} />}
          </button>
        </div>
      </form>
      {error ? (
        <p className="mt-2.5 text-left text-[13.5px] text-bad animate-slide-up" role="alert">
          {error}
        </p>
      ) : (
        <p className="mt-2.5 text-left text-[13.5px] leading-relaxed text-ink3">{hint}</p>
      )}
      {picks && picks.length > 0 && (
        <div className="mt-5 text-left">
          <div className="mb-2 text-[12.5px] font-medium text-ink3">Or pick one of yours</div>
          <ul className="flex flex-col gap-1.5">
            {picks.map((r) => (
              <li key={r.name}>
                <button
                  type="button"
                  onClick={() => onPick?.(r.name)}
                  className="press group flex w-full items-center gap-3 rounded-xl border border-line bg-surface px-4 py-2.5 text-left transition-colors hover:border-line2 hover:bg-surface2"
                >
                  <GitBranch className="h-4 w-4 shrink-0 text-ink3 transition-colors group-hover:text-accent" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-[13.5px] text-ink">{r.name}</span>
                    <span className="block truncate text-[12.5px] text-ink3">{r.meta}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
