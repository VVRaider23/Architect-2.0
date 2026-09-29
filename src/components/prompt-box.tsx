'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { ArrowUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/** The one big box where an app starts. The send button stays asleep until there is something to send. */
export function PromptBox({
  value,
  onChange,
  onSubmit,
  placeholder,
  hint = 'Press Enter to start',
  rows = 2,
  left,
  autoFocus,
  tour,
  busy,
  label = 'Describe your app',
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  hint?: string;
  rows?: number;
  left?: ReactNode;
  autoFocus?: boolean;
  tour?: string;
  busy?: boolean;
  label?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 260)}px`;
  }, [value]);
  const can = value.trim().length > 0 && !busy;
  return (
    <form
      data-tour={tour}
      onSubmit={(e) => {
        e.preventDefault();
        if (can) onSubmit();
      }}
      className="rounded-2xl border border-line2 bg-surface text-left shadow-card transition-[border-color,box-shadow] duration-200 focus-within:border-accent/70 focus-within:shadow-ring"
    >
      <textarea
        ref={ref}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            if (can) onSubmit();
          }
        }}
        placeholder={placeholder}
        aria-label={label}
        autoFocus={autoFocus}
        className="block w-full resize-none bg-transparent px-4 pt-4 text-[16px] leading-relaxed text-ink placeholder:text-ink3 focus:outline-none"
      />
      <div className="flex items-center gap-2 px-3 pb-3 pt-1.5">
        {left}
        <span className={cn('ml-auto text-[12.5px] text-ink3 transition-opacity duration-200', can ? 'opacity-100' : 'opacity-0')} aria-hidden={!can}>
          {hint}
        </span>
        <button
          type="submit"
          aria-label="Start"
          disabled={!can}
          className={cn(
            'press grid h-9 w-9 shrink-0 place-items-center rounded-[10px] transition-all duration-200',
            can ? 'bg-accent text-on-accent shadow-glow' : 'scale-95 bg-line2 text-ink3',
          )}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" strokeWidth={2.4} />}
        </button>
      </div>
    </form>
  );
}
