'use client';

import { useApp } from '@/lib/store';
import { AppShell, RequireAuth, usageRows } from '@/components/shell';
import { CountUp } from '@/components/ui';
import { ShellSkeleton } from '@/components/skeletons';

export default function UsagePage() {
  return (
    <RequireAuth fallback={<ShellSkeleton page="usage" />}>
      <AppShell>
        <Usage />
      </AppShell>
    </RequireAuth>
  );
}

/** Where this month's credits went, in plain words. */
function Usage() {
  const ws = useApp((s) => s.workspace);
  const projects = useApp((s) => s.projects);
  const rows = usageRows(projects);
  const used = rows.reduce((n, r) => n + r.n, 0);
  if (!ws) return null;
  return (
    <div className="mx-auto w-full max-w-[640px] px-4 pb-24 pt-10 sm:px-6">
      <div className="animate-screen-in">
        <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Usage</h1>
        <p className="mt-2 text-[15px] text-ink2">Every build and test run shows its cost before it starts.</p>
        <div className="mt-8 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="text-[13px] text-ink3">Credits left</div>
            <div className="mt-1 text-[32px] font-semibold tracking-tight">
              <CountUp to={ws.credits} />
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="text-[13px] text-ink3">Used this month</div>
            <div className="mt-1 text-[32px] font-semibold tracking-tight">
              <CountUp to={used} />
            </div>
          </div>
        </div>
        <ul className="mt-8 flex flex-col gap-5">
          {rows.map((r) => (
            <li key={r.label}>
              <div className="flex items-baseline justify-between text-[14.5px]">
                <span className="font-medium">{r.label}</span>
                <span className="tabular text-ink2">{r.n.toLocaleString('en-US')}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line2">
                <div className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out" style={{ width: `${Math.max(3, (r.n / used) * 100)}%` }} />
              </div>
              <div className="mt-1.5 text-[13px] text-ink3">{r.what}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
