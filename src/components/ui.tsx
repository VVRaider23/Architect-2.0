'use client';

import Link from 'next/link';
import { useEffect, useRef, type ReactNode } from 'react';
import { Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'dark' | 'danger' | 'subtle';
type Size = 'sm' | 'md' | 'lg';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-ink border border-accent hover:border-accent-ink',
  secondary: 'bg-surface text-ink border border-line2 hover:bg-surface2 hover:border-ink3',
  ghost: 'bg-transparent text-ink border border-transparent hover:bg-sunken',
  dark: 'bg-ink text-white border border-ink hover:bg-[#33312d]',
  danger: 'bg-surface text-bad border border-bad-line hover:bg-bad-soft',
  subtle: 'bg-sunken text-ink border border-line hover:bg-line',
};
const SIZE: Record<Size, string> = {
  sm: 'h-8 px-3 text-[12.5px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-[13.5px] gap-2 rounded-lg',
  lg: 'h-11 px-5 text-[14.5px] gap-2 rounded-[10px]',
};

interface ButtonProps {
  children?: ReactNode;
  variant?: Variant;
  size?: Size;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  className?: string;
  type?: 'button' | 'submit';
  title?: string;
  full?: boolean;
  target?: '_blank';
  'aria-label'?: string;
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
  className,
  type = 'button',
  title,
  full,
  target,
  ...rest
}: ButtonProps) {
  const cls = cn(
    'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium transition-colors duration-150',
    VARIANT[variant],
    SIZE[size],
    full && 'w-full',
    (disabled || loading) && 'pointer-events-none opacity-50',
    className,
  );
  const inner = (
    <>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </>
  );
  if (href && !disabled) {
    return (
      <Link href={href} className={cls} title={title} aria-label={rest['aria-label']} target={target} rel={target ? 'noreferrer' : undefined}>
        {inner}
      </Link>
    );
  }
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled || loading} title={title} aria-label={rest['aria-label']}>
      {inner}
    </button>
  );
}

type Tone = 'neutral' | 'accent' | 'ok' | 'bad' | 'warn' | 'outline' | 'dashed' | 'dark';
const TONE: Record<Tone, string> = {
  neutral: 'bg-sunken text-ink border-line',
  accent: 'bg-accent-soft text-accent-ink border-accent-line',
  ok: 'bg-ok-soft text-ok border-ok-line',
  bad: 'bg-bad-soft text-bad border-bad-line',
  warn: 'bg-warn-soft text-warn border-warn-line',
  outline: 'bg-surface text-ink border-line2',
  dashed: 'bg-transparent text-ink2 border-line2 border-dashed',
  dark: 'bg-ink text-white border-ink',
};

export function Chip({
  children,
  tone = 'neutral',
  className,
  icon,
  title,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  icon?: ReactNode;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-[3px] text-[12px] font-medium leading-4',
        TONE[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

export function Card({ children, className, pad = true }: { children: ReactNode; className?: string; pad?: boolean }) {
  return <div className={cn('rounded-xl border border-line bg-surface shadow-card', pad && 'p-4', className)}>{children}</div>;
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('font-mono text-[11px] uppercase tracking-[0.08em] text-ink2', className)}>{children}</div>;
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-line2 bg-surface px-1.5 py-[1px] font-mono text-[11px] text-ink2 shadow-[0_1px_0_#cbc7bd]">{children}</kbd>
  );
}

export function Avatar({ initials, tone = 'neutral', size = 32 }: { initials: string; tone?: 'neutral' | 'accent' | 'warn' | 'ok'; size?: number }) {
  const t = {
    neutral: 'bg-sunken text-ink',
    accent: 'bg-accent-soft text-accent-ink',
    warn: 'bg-warn-soft text-warn',
    ok: 'bg-ok-soft text-ok',
  }[tone];
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full border border-line font-semibold', t)}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  width = 560,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  width?: number;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const t = setTimeout(() => ref.current?.querySelector<HTMLElement>('input,textarea,select,button')?.focus(), 30);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(t);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(29,28,26,0.45)] p-4 animate-fade-in" onMouseDown={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-line bg-surface shadow-pop animate-slide-up scroll-thin"
        style={{ maxWidth: width }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 px-6 pb-2 pt-5">
          <div className="flex-1">
            <h2 className="text-[19px] font-semibold leading-tight">{title}</h2>
            {description && <p className="mt-1 text-[13.5px] text-ink2">{description}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="-mr-2 rounded-lg p-2 text-ink2 hover:bg-sunken">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 pb-5 pt-2">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-line bg-surface2 px-6 py-3.5">{footer}</div>}
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
        'relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border transition-colors',
        checked ? 'border-accent bg-accent' : 'border-line2 bg-sunken',
        disabled && 'opacity-50',
      )}
    >
      <span className={cn('inline-block h-[18px] w-[18px] rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[18px]' : 'translate-x-[2px]')} />
    </button>
  );
}

export const inputCls =
  'h-10 w-full rounded-lg border border-line2 bg-surface px-3 text-[14px] text-ink placeholder:text-ink3 focus:border-accent focus:outline-none focus:shadow-ring';

export const textareaCls =
  'w-full rounded-lg border border-line2 bg-surface px-3 py-2.5 text-[14px] leading-relaxed text-ink placeholder:text-ink3 focus:border-accent focus:outline-none focus:shadow-ring resize-none';

export function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-semibold">
        {label}
      </label>
      {children}
      {hint && <p className="text-[12.5px] text-ink2">{hint}</p>}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'ok' | 'bad' | 'warn' }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3 shadow-card">
      <div className="text-[12px] text-ink2">{label}</div>
      <div className="mt-0.5 text-[22px] font-semibold tracking-tight">{value}</div>
      {sub && (
        <div className={cn('mt-0.5 text-[12px]', tone === 'ok' ? 'text-ok' : tone === 'bad' ? 'text-bad' : tone === 'warn' ? 'text-warn' : 'text-ink2')}>
          {sub}
        </div>
      )}
    </div>
  );
}

export function Empty({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line2 bg-surface2 px-6 py-10 text-center">
      <div className="text-[15px] font-semibold">{title}</div>
      {body && <p className="max-w-md text-[13.5px] text-ink2">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ProgressBar({ value, tone = 'accent' }: { value: number; tone?: 'accent' | 'ok' }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-sunken">
      <div className={cn('h-full rounded-full transition-all duration-500', tone === 'ok' ? 'bg-ok' : 'bg-accent')} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
