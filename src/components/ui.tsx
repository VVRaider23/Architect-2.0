'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Check, ChevronRight, Copy, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/*
 * The building blocks. Every one of them answers the same question for the user: "did it hear me?"
 * Buttons sink when pressed, busy buttons say what they are doing, finished buttons say what happened.
 */

type Variant = 'primary' | 'secondary' | 'ghost' | 'dark' | 'danger' | 'subtle' | 'ok';
type Size = 'sm' | 'md' | 'lg' | 'xl';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent border border-transparent hover:brightness-110 shadow-glow',
  secondary: 'bg-surface2 text-ink border border-line2 hover:bg-sunken hover:border-ink3/60',
  ghost: 'bg-transparent text-ink2 border border-transparent hover:bg-surface2 hover:text-ink',
  dark: 'bg-ink text-bg border border-ink hover:bg-ink/90',
  danger: 'bg-surface2 text-bad border border-bad-line hover:bg-bad-soft',
  subtle: 'bg-sunken text-ink border border-line hover:bg-line',
  ok: 'bg-ok text-on-ok border border-transparent',
};
const SIZE: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-9 px-3.5 text-[14px] gap-2 rounded-[9px]',
  lg: 'h-11 px-[18px] text-[15px] gap-2 rounded-[11px]',
  xl: 'h-12 px-5 text-[15.5px] gap-2.5 rounded-xl',
};
const DISABLED = '!border-line !bg-surface !text-ink3 !shadow-none cursor-not-allowed hover:!brightness-100';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export interface ButtonProps {
  children?: ReactNode;
  variant?: Variant;
  size?: Size;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  className?: string;
  type?: 'button' | 'submit';
  title?: string;
  full?: boolean;
  target?: '_blank';
  tour?: string;
  'aria-label'?: string;
  'aria-pressed'?: boolean;
  'aria-expanded'?: boolean;
}

export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  href,
  onClick,
  disabled,
  loading,
  icon,
  iconRight,
  className,
  type = 'button',
  title,
  full,
  target,
  tour,
  ...aria
}: ButtonProps) {
  const cls = cn(
    'press inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium',
    VARIANT[variant],
    SIZE[size],
    full && 'w-full',
    disabled && DISABLED,
    loading && 'cursor-progress',
    className,
  );
  const inner = (
    <>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
      {iconRight}
    </>
  );
  if (href && !disabled) {
    return (
      <Link href={href} className={cls} title={title} data-tour={tour} aria-label={aria['aria-label']} target={target} rel={target ? 'noreferrer' : undefined}>
        {inner}
      </Link>
    );
  }
  return (
    <button
      type={type}
      className={cls}
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      data-tour={tour}
      aria-label={aria['aria-label']}
      aria-pressed={aria['aria-pressed']}
      aria-expanded={aria['aria-expanded']}
    >
      {inner}
    </button>
  );
}

/**
 * A button that shows its own progress: "Build it" → spinner "Building…" → tick "Built".
 * If run() returns false it quietly goes back to the start (nothing happened, nothing to celebrate).
 */
export function ActionButton({
  label,
  busyLabel,
  doneLabel,
  icon,
  run,
  onDone,
  variant = 'primary',
  size = 'lg',
  minMs = 650,
  holdMs = 750,
  resetAfter,
  disabled,
  className,
  full,
  tour,
}: {
  label: string;
  busyLabel?: string;
  doneLabel: string;
  icon?: ReactNode;
  run: () => unknown | Promise<unknown>;
  onDone?: (result: unknown) => void;
  variant?: Variant;
  size?: Size;
  minMs?: number;
  holdMs?: number;
  resetAfter?: number;
  disabled?: boolean;
  className?: string;
  full?: boolean;
  tour?: string;
}) {
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const go = async () => {
    if (state !== 'idle' || disabled) return;
    setState('busy');
    const t0 = Date.now();
    let result: unknown;
    try {
      result = await run();
    } catch {
      result = false;
    }
    await sleep(Math.max(0, minMs - (Date.now() - t0)));
    if (!alive.current) return;
    if (result === false) {
      setState('idle');
      return;
    }
    setState('done');
    await sleep(holdMs);
    if (!alive.current) return;
    onDone?.(result);
    if (resetAfter !== undefined) {
      await sleep(resetAfter);
      if (alive.current) setState('idle');
    }
  };
  const text = state === 'done' ? doneLabel : state === 'busy' ? busyLabel ?? label : label;
  return (
    <button
      type="button"
      onClick={go}
      disabled={disabled}
      aria-busy={state === 'busy'}
      data-tour={tour}
      className={cn(
        'press inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium',
        VARIANT[state === 'done' ? 'ok' : variant],
        SIZE[size],
        full && 'w-full',
        state === 'busy' && 'cursor-progress',
        disabled && DISABLED,
        className,
      )}
    >
      {(icon || state !== 'idle') && (
        <span className="swap h-4 w-4 animate-fade-in" aria-hidden>
          <span className="grid h-4 w-4 place-items-center" data-off={state !== 'idle' || !icon ? '' : undefined}>
            {icon}
          </span>
          <Loader2 className="h-4 w-4 animate-spin" data-off={state !== 'busy' ? '' : undefined} />
          <Check className="h-4 w-4" strokeWidth={2.6} data-off={state !== 'done' ? '' : undefined} />
        </span>
      )}
      <span key={text} className="animate-fade-in">
        {text}
      </span>
    </button>
  );
}

export function CopyButton({
  text,
  label = 'Copy',
  doneText = 'Copied',
  className,
  compact,
}: {
  text: string;
  label?: string;
  doneText?: string;
  className?: string;
  compact?: boolean;
}) {
  const [done, setDone] = useState(false);
  const timer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setDone(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setDone(false), 1600);
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={compact ? label : undefined}
      className={cn(
        'press inline-flex items-center gap-1.5 rounded-lg border border-line2 bg-surface2 font-medium text-ink2 hover:bg-sunken hover:text-ink',
        compact ? 'h-8 w-8 justify-center' : 'h-8 px-2.5 text-[13px]',
        className,
      )}
    >
      <span className="swap h-3.5 w-3.5" aria-hidden>
        <Copy className="h-3.5 w-3.5" data-off={done ? '' : undefined} />
        <Check className="h-3.5 w-3.5 text-ok" strokeWidth={2.8} data-off={done ? undefined : ''} />
      </span>
      {!compact && <span>{done ? doneText : label}</span>}
      <span className="sr-only" aria-live="polite">
        {done ? doneText : ''}
      </span>
    </button>
  );
}

/**
 * Press and hold to confirm. Used for the one step that is hard to take back: going live for everyone.
 * Letting go early runs the ring back, so nothing happens by accident. Space or Enter can be held too.
 */
export function HoldButton({
  label,
  doneLabel,
  ms = 1100,
  onComplete,
  disabled,
  tour,
}: {
  label: string;
  doneLabel: string;
  ms?: number;
  onComplete: () => void;
  disabled?: boolean;
  tour?: string;
}) {
  const [p, setP] = useState(0);
  const [holding, setHolding] = useState(false);
  const [done, setDone] = useState(false);
  const pRef = useRef(0);
  const raf = useRef(0);
  const set = (v: number) => {
    pRef.current = v;
    setP(v);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const finish = () => {
    cancelAnimationFrame(raf.current);
    set(1);
    setHolding(false);
    setDone(true);
    navigator.vibrate?.(12);
    onComplete();
  };
  const begin = () => {
    if (disabled || done) return;
    setHolding(true);
    cancelAnimationFrame(raf.current);
    const from = pRef.current;
    const t0 = performance.now();
    const step = (now: number) => {
      const v = Math.min(1, from + (now - t0) / ms);
      set(v);
      if (v >= 1) return finish();
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };
  const release = () => {
    if (done) return;
    setHolding(false);
    cancelAnimationFrame(raf.current);
    const from = pRef.current;
    const t0 = performance.now();
    const back = (now: number) => {
      const k = Math.min(1, (now - t0) / 180);
      set(from * (1 - k));
      if (k < 1) raf.current = requestAnimationFrame(back);
    };
    raf.current = requestAnimationFrame(back);
  };

  const C = 2 * Math.PI * 14;
  return (
    <button
      type="button"
      data-tour={tour}
      disabled={disabled}
      aria-label={done ? doneLabel : `${label}. Press and hold to confirm.`}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        begin();
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onKeyDown={(e) => {
        if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
          e.preventDefault();
          begin();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          release();
        }
      }}
      onContextMenu={(e) => e.preventDefault()}
      className={cn(
        'relative flex h-[60px] w-full select-none items-center justify-center gap-3 overflow-hidden rounded-[14px] text-[16px] font-semibold transition-[transform,background-color,box-shadow] duration-150 ease-out',
        done ? 'bg-ok text-on-ok' : 'bg-accent text-on-accent shadow-glow',
        holding && 'scale-[0.985]',
        disabled && DISABLED,
      )}
      style={{ touchAction: 'none', WebkitTouchCallout: 'none' }}
    >
      {!done && <span aria-hidden className="absolute inset-y-0 left-0 bg-white/15" style={{ width: `${p * 100}%` }} />}
      <span className="relative grid h-8 w-8 place-items-center" aria-hidden>
        {done ? (
          <Check className="h-5 w-5 animate-pop-in" strokeWidth={2.8} />
        ) : (
          <svg viewBox="0 0 32 32" className="h-8 w-8 -rotate-90">
            <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
            <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - p)} />
          </svg>
        )}
      </span>
      <span className="relative">{done ? doneLabel : holding ? 'Keep holding…' : label}</span>
    </button>
  );
}

type Tone = 'neutral' | 'accent' | 'ok' | 'bad' | 'warn' | 'outline' | 'dashed' | 'dark' | 'merge';
const TONE: Record<Tone, string> = {
  neutral: 'bg-sunken text-ink2 border-line',
  accent: 'bg-accent-soft text-accent-ink border-accent-line',
  ok: 'bg-ok-soft text-ok border-ok-line',
  bad: 'bg-bad-soft text-bad border-bad-line',
  warn: 'bg-warn-soft text-warn border-warn-line',
  outline: 'bg-transparent text-ink2 border-line2',
  dashed: 'bg-transparent text-ink3 border-line2 border-dashed',
  dark: 'bg-ink text-bg border-ink',
  merge: 'bg-[#B79CFF]/15 text-[#C9B6FF] border-[#B79CFF]/30',
};

export function Chip({ children, tone = 'neutral', className, icon, title }: { children: ReactNode; tone?: Tone; className?: string; icon?: ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-[3px] text-[12.5px] font-medium leading-4', TONE[tone], className)}
    >
      {icon}
      {children}
    </span>
  );
}

/** A small status label with a dot: "Passed", "Waiting", "Live". */
export function Tag({ children, tone = 'neutral', pulse, className }: { children: ReactNode; tone?: 'neutral' | 'accent' | 'ok' | 'bad' | 'warn'; pulse?: boolean; className?: string }) {
  const dot = { neutral: 'bg-ink3', accent: 'bg-accent', ok: 'bg-ok', bad: 'bg-bad', warn: 'bg-warn' }[tone];
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-[2px] text-[12px] font-medium', TONE[tone], className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', dot, pulse && 'animate-pulse2')} aria-hidden />
      {children}
    </span>
  );
}

export function Card({ children, className, pad = true, tour }: { children: ReactNode; className?: string; pad?: boolean; tour?: string }) {
  return (
    <div data-tour={tour} className={cn('rounded-2xl border border-line bg-surface shadow-card', pad && 'p-5', className)}>
      {children}
    </div>
  );
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('text-[12.5px] font-medium text-ink3', className)}>{children}</div>;
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd className={cn('inline-flex min-w-[20px] items-center justify-center rounded-md border border-b-2 border-line2 bg-surface2 px-1.5 py-[1px] font-mono text-[11px] text-ink2', className)}>
      {children}
    </kbd>
  );
}

export function Avatar({
  initials,
  tone = 'neutral',
  size = 30,
  ring,
}: {
  initials: string;
  tone?: 'neutral' | 'accent' | 'warn' | 'ok' | 'merge';
  size?: number;
  ring?: boolean;
}) {
  const t = {
    neutral: 'bg-sunken text-ink',
    accent: 'bg-accent-soft text-accent-ink',
    warn: 'bg-warn-soft text-warn',
    ok: 'bg-ok-soft text-ok',
    merge: 'bg-[#B79CFF]/15 text-[#C9B6FF]',
  }[tone];
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full border border-line2 font-semibold', t, ring && 'ring-2 ring-bg')}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.37) }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

/** A tick that draws itself when `on` turns true. */
export function Tick({ on, size = 16, className }: { on: boolean; size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={cn('tick shrink-0', className)}
      data-on={on ? 'true' : 'false'}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} />
    </svg>
  );
}

/** A number that counts up from where it was, fast then gently. */
export function CountUp({ to, ms = 900, className, suffix = '' }: { to: number; ms?: number; className?: string; suffix?: string }) {
  const [v, setV] = useState(0);
  const last = useRef(0);
  useEffect(() => {
    if (reducedMotion()) {
      last.current = to;
      setV(to);
      return;
    }
    const from = last.current;
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      const val = Math.round(from + (to - from) * e);
      setV(val);
      last.current = val;
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return (
    <span className={cn('tabular', className)}>
      {v}
      {suffix}
    </span>
  );
}

/** The score as a ring that fills in: green when every answer matches, iris with a red remainder when some miss. */
export function ScoreRing({ passed, total, size = 132, tour, label = 'right' }: { passed: number; total: number; size?: number; tour?: string; label?: string }) {
  const r = 56;
  const c = 2 * Math.PI * r;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = requestAnimationFrame(() => setShown(total ? passed / total : 0));
    return () => cancelAnimationFrame(t);
  }, [passed, total]);
  const allGood = total > 0 && passed === total;
  return (
    <div data-tour={tour} className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${passed} of ${total} ${label}`}>
      <svg viewBox="0 0 132 132" width={size} height={size} className="-rotate-90">
        <circle cx="66" cy="66" r={r} fill="none" stroke={allGood ? 'rgb(var(--line2))' : 'rgb(var(--bad) / 0.35)'} strokeWidth="10" />
        <circle
          cx="66"
          cy="66"
          r={r}
          fill="none"
          stroke={allGood ? 'rgb(var(--ok))' : 'rgb(var(--accent))'}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - shown)}
          style={{ transition: 'stroke-dashoffset 1000ms var(--ease-out), stroke 300ms' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-semibold leading-none tracking-tight" style={{ fontSize: size * 0.22 }}>
          <CountUp to={passed} ms={1000} />
          <span className="text-[0.62em] text-ink3">/{total}</span>
        </div>
        <div className="mt-1 text-[12px] text-ink3">{label}</div>
      </div>
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-4 w-4 animate-spin text-ink3', className)} aria-hidden />;
}

export function Typing({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)} role="status" aria-label="Working">
      {[0, 160, 320].map((d) => (
        <i key={d} className="h-1.5 w-1.5 rounded-full bg-ink3 animate-blink" style={{ animationDelay: `${d}ms` }} />
      ))}
    </span>
  );
}

/** "Show more" that keeps the screen simple until someone asks for detail. */
export function Disclosure({
  label,
  children,
  defaultOpen = false,
  className,
  tour,
}: {
  label: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  tour?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className={className} data-tour={tour}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="press inline-flex items-center gap-1.5 rounded-md text-[13.5px] font-medium text-ink2 hover:text-ink"
      >
        <ChevronRight className={cn('h-4 w-4 transition-transform duration-200 ease-out', open && 'rotate-90')} aria-hidden />
        {label}
      </button>
      {open && (
        <div id={id} className="mt-3 animate-slide-up">
          {children}
        </div>
      )}
    </div>
  );
}

/* Tooltips wait a moment the first time, then show instantly while you move between them. */
let tipWarmUntil = 0;

export function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  className,
}: {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'bottom';
  align?: 'center' | 'start' | 'end';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [instant, setInstant] = useState(false);
  const timer = useRef<number>(undefined);
  const id = useId();
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const show = () => {
    window.clearTimeout(timer.current);
    const warm = Date.now() < tipWarmUntil;
    setInstant(warm);
    timer.current = window.setTimeout(() => setOpen(true), warm ? 0 : 420);
  };
  const hide = () => {
    window.clearTimeout(timer.current);
    if (open) tipWarmUntil = Date.now() + 500;
    setOpen(false);
  };
  return (
    <span className={cn('relative inline-flex', className)} onPointerEnter={show} onPointerLeave={hide} onFocus={show} onBlur={hide} aria-describedby={open ? id : undefined}>
      {children}
      {open && (
        <span
          role="tooltip"
          id={id}
          className={cn(
            'pointer-events-none absolute z-50 w-max max-w-[260px] rounded-lg bg-ink px-2.5 py-1.5 text-[12.5px] font-medium leading-snug text-bg shadow-pop',
            side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
            align === 'center' && 'left-1/2 -translate-x-1/2',
            align === 'start' && 'left-0',
            align === 'end' && 'right-0',
            !instant && 'animate-fade-in',
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}

/** Closes a popover on a click outside it, or on Escape. */
export function useClickOutside(ref: RefObject<HTMLElement | null>, onOut: () => void, active = true) {
  useEffect(() => {
    if (!active) return;
    const down = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOut();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOut();
    };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', down);
      document.removeEventListener('keydown', key);
    };
  }, [ref, onOut, active]);
}

export interface MenuItem {
  id: string;
  label: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  checked?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}

export function Menu({
  trigger,
  items,
  align = 'start',
  up = false,
  width = 240,
  keepOpen = false,
  label,
  header,
}: {
  trigger: (s: { open: boolean; toggle: () => void }) => ReactNode;
  items: MenuItem[];
  align?: 'start' | 'end';
  up?: boolean;
  width?: number;
  keepOpen?: boolean;
  label?: string;
  header?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    setHi(-1);
  }, []);
  useClickOutside(ref, close, open);
  const toggle = () => setOpen((o) => !o);
  const pick = (it: MenuItem) => {
    if (it.disabled) return;
    it.onSelect?.();
    if (!keepOpen) close();
  };
  const move = (dir: 1 | -1) => {
    if (!items.length) return;
    let i = hi;
    for (let n = 0; n < items.length; n++) {
      i = (i + dir + items.length) % items.length;
      if (!items[i].disabled) break;
    }
    setHi(i);
  };
  return (
    <div
      ref={ref}
      className="relative inline-flex"
      onKeyDown={(e) => {
        if (!open) return;
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          move(1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          move(-1);
        } else if (e.key === 'Enter' && hi >= 0) {
          e.preventDefault();
          pick(items[hi]);
        }
      }}
    >
      {trigger({ open, toggle })}
      {open && (
        <div
          role="menu"
          aria-label={label}
          className={cn(
            'absolute z-40 rounded-xl border border-line2 bg-surface2 p-1 shadow-pop animate-pop-in',
            up ? 'bottom-full mb-2' : 'top-full mt-2',
            align === 'end' ? 'right-0 origin-top-right' : 'left-0 origin-top-left',
          )}
          style={{ width }}
        >
          {header}
          {items.map((it, i) => (
            <button
              key={it.id}
              type="button"
              role={it.checked !== undefined ? 'menuitemradio' : 'menuitem'}
              aria-checked={it.checked}
              disabled={it.disabled}
              onMouseEnter={() => setHi(i)}
              onClick={() => pick(it)}
              className={cn(
                'flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] transition-colors duration-100',
                hi === i && 'bg-sunken',
                it.danger ? 'text-bad' : 'text-ink',
                it.disabled && 'cursor-not-allowed opacity-45',
              )}
            >
              {it.icon && <span className="mt-[1px] text-ink2">{it.icon}</span>}
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{it.label}</span>
                {it.sub && <span className="mt-0.5 block text-[12.5px] leading-snug text-ink3">{it.sub}</span>}
              </span>
              {it.checked !== undefined && <Check className={cn('mt-[2px] h-4 w-4 text-accent transition-opacity', it.checked ? 'opacity-100' : 'opacity-0')} strokeWidth={2.6} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Tabs whose highlight glides between options. The highlighted copy is clipped to the active tab, so text colour flips exactly at the edge. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = 'md',
  label,
  tour,
  className,
}: {
  value: T;
  options: { id: T; label: ReactNode; icon?: ReactNode; tour?: string }[];
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
  label?: string;
  tour?: string;
  className?: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [clip, setClip] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const measure = useCallback(() => {
    const w = wrap.current;
    const el = w?.querySelector<HTMLElement>(`[data-seg="${value}"]`);
    if (!w || !el) return;
    const L = el.offsetLeft;
    const R = w.clientWidth - (el.offsetLeft + el.offsetWidth);
    const T = el.offsetTop;
    const B = w.clientHeight - (el.offsetTop + el.offsetHeight);
    setClip(`inset(${T}px ${R}px ${B}px ${L}px round 7px)`);
  }, [value]);
  useLayoutEffect(() => {
    measure();
  }, [measure, options.length]);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    const ro = new ResizeObserver(() => measure());
    if (wrap.current) ro.observe(wrap.current);
    return () => {
      cancelAnimationFrame(id);
      ro.disconnect();
    };
  }, [measure]);
  const item = cn('inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[7px] font-medium', size === 'sm' ? 'h-7 px-2.5 text-[12.5px]' : 'h-8 px-3 text-[13.5px]');
  return (
    <div ref={wrap} role="tablist" aria-label={label} data-tour={tour} className={cn('relative inline-flex rounded-[10px] border border-line bg-surface p-[3px]', className)}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={o.id === value}
          data-seg={o.id}
          data-tour={o.tour}
          onClick={() => onChange(o.id)}
          className={cn(item, 'press text-ink3 hover:text-ink')}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
      {clip && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex bg-line2 p-[3px]"
          style={{ clipPath: clip, transition: ready ? 'clip-path 260ms var(--ease-out)' : undefined }}
        >
          {options.map((o) => (
            <span key={o.id} className={cn(item, 'text-ink')}>
              {o.icon}
              {o.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  width = 520,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  width?: number;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const t = setTimeout(() => ref.current?.querySelector<HTMLElement>('input,textarea,select')?.focus(), 40);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(t);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 pb-8 pt-[12vh] animate-fade-in" onMouseDown={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full rounded-2xl border border-line2 bg-surface shadow-pop animate-pop-in"
        style={{ maxWidth: width }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 px-6 pb-1 pt-5">
          <div className="flex-1">
            <h2 className="text-[22px] font-semibold leading-tight tracking-tight">{title}</h2>
            {description && <p className="mt-1.5 text-[14px] leading-relaxed text-ink2">{description}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="press -mr-2 rounded-lg p-2 text-ink3 hover:bg-surface2 hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 pb-5 pt-3">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 rounded-b-2xl border-t border-line bg-surface2/60 px-6 py-3.5">{footer}</div>}
      </div>
    </div>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'group relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border transition-colors duration-200',
        checked ? 'border-accent bg-accent' : 'border-line2 bg-sunken',
        disabled && 'opacity-50',
      )}
    >
      <span
        className={cn(
          'inline-block h-[18px] w-[18px] rounded-full shadow transition-all duration-200 ease-out group-active:w-[22px]',
          checked ? 'translate-x-[18px] bg-on-accent group-active:translate-x-[14px]' : 'translate-x-[2px] bg-ink2',
        )}
      />
    </button>
  );
}

export const inputCls =
  'h-11 w-full rounded-[10px] border border-line2 bg-surface px-3.5 text-[15px] text-ink placeholder:text-ink3 transition-[border-color,box-shadow] duration-150 focus:border-accent focus:outline-none focus:shadow-ring';

export const textareaCls =
  'w-full resize-none rounded-[10px] border border-line2 bg-surface px-3.5 py-3 text-[15px] leading-relaxed text-ink placeholder:text-ink3 transition-[border-color,box-shadow] duration-150 focus:border-accent focus:outline-none focus:shadow-ring';

export function Field({ label, htmlFor, hint, error, children }: { label: string; htmlFor?: string; hint?: ReactNode; error?: string | null; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13.5px] font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-[13px] text-bad animate-slide-up" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="text-[13px] text-ink3">{hint}</p>
      )}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'ok' | 'bad' | 'warn' }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <div className="text-[12.5px] text-ink3">{label}</div>
      <div className="mt-0.5 text-[22px] font-semibold tracking-tight tabular">{value}</div>
      {sub && <div className={cn('mt-0.5 text-[12.5px]', tone === 'ok' ? 'text-ok' : tone === 'bad' ? 'text-bad' : tone === 'warn' ? 'text-warn' : 'text-ink3')}>{sub}</div>}
    </div>
  );
}

export function Empty({ title, body, action }: { title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line2 px-6 py-12 text-center">
      <div className="text-[15px] font-semibold">{title}</div>
      {body && <p className="max-w-md text-[14px] leading-relaxed text-ink2">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ProgressBar({ value, tone = 'accent', className }: { value: number; tone?: 'accent' | 'ok'; className?: string }) {
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-line2', className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div
        className={cn('h-full rounded-full transition-[width] duration-500 ease-out', tone === 'ok' ? 'bg-ok' : 'bg-accent')}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
