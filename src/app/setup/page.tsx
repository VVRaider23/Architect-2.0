'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Cloud, Server } from 'lucide-react';
import { useApp } from '@/lib/store';
import { githubUrl, useServer } from '@/lib/account';
import { Logo, RequireAuth } from '@/components/shell';
import { Button, inputCls } from '@/components/ui';
import { cn } from '@/lib/utils';

export default function SetupPage() {
  return (
    <RequireAuth needWorkspace={false}>
      <Setup />
    </RequireAuth>
  );
}

function Setup() {
  const email = useApp((s) => s.userEmail);
  const setupWorkspace = useApp((s) => s.setupWorkspace);
  const signOut = useApp((s) => s.signOut);
  const router = useRouter();
  const domain = email.split('@')[1] || 'harborline.com';
  const personalDomain = /^(gmail|googlemail|yahoo|outlook|hotmail|live|icloud|me|proton|protonmail|github)\b/i.test(domain);
  const accountName = useServer.getState().user?.name;
  const [name, setName] = useState(
    domain.startsWith('harborline')
      ? 'Harborline Insurance'
      : !/^(gmail|googlemail|yahoo|outlook|hotmail|live|icloud|me|proton|protonmail|github)\b/i.test(domain) && domain.includes('.')
        ? domain.split('.')[0].replace(/^\w/, (c) => c.toUpperCase())
        : accountName
          ? `${accountName.split(' ')[0]}’s workspace`
          : 'My workspace',
  );
  const [domainJoin, setDomainJoin] = useState(true);
  const [runsOn, setRunsOn] = useState<'lyzr' | 'own'>('lyzr');
  const { features, user } = useServer();
  const realGithub = features.github;
  const ghLogin = user?.github?.login;
  const [github, setGithub] = useState<'none' | 'connecting' | 'done'>('none');

  const connect = () => {
    setGithub('connecting');
    if (realGithub) {
      window.location.href = githubUrl('connect', '/setup');
      return;
    }
    setTimeout(() => setGithub('done'), 900);
  };
  const connected = realGithub ? !!ghLogin : github === 'done';

  const create = () => {
    setupWorkspace({ name: name.trim() || 'My workspace', domainJoin, runsOn, github: ghLogin });
    router.push('/home');
  };

  return (
    <main className="min-h-screen">
      <header className="flex h-14 items-center justify-between border-b border-line bg-surface px-5">
        <Logo href="/setup" />
        <span className="text-[13px] text-ink2">Signed in as {email}</span>
      </header>
      <div className="mx-auto max-w-[620px] px-5 py-12">
        <div className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink3">First run · one screen</div>
        <h1 className="mt-2 text-[30px] font-semibold tracking-tight">Set up your workspace</h1>
        <p className="mt-1.5 text-[15px] text-ink2">Three things, then you’re building. Everything here can change later in Settings.</p>

        <div className="mt-8 grid gap-6 rounded-2xl border border-line bg-surface p-6 shadow-card">
          <label className="grid gap-1.5">
            <span className="text-[13px] font-semibold">Workspace name</span>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your company" />
            <span className="mt-1 flex items-center gap-2 text-[13px] text-ink2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#2446B5]"
                checked={domainJoin}
                onChange={(e) => setDomainJoin(e.target.checked)}
                id="domainJoin"
              />
              <label htmlFor="domainJoin">
                {personalDomain ? (
                  'Only people you invite can join'
                ) : (
                  <>
                    Anyone with a <span className="font-medium text-ink">@{domain}</span> email can join
                  </>
                )}
              </label>
            </span>
          </label>

          <div className="grid gap-2">
            <span className="text-[13px] font-semibold">GitHub</span>
            <div className="flex items-center gap-3 rounded-xl border border-line bg-surface2 px-4 py-3">
              {connected ? (
                <>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ok-soft text-ok">
                    <Check className="h-4 w-4" />
                  </span>
                  <div className="flex-1 text-[13.5px]">
                    Connected as <span className="font-semibold">{ghLogin ? `@${ghLogin}` : 'arjun-harborline'}</span>
                    <div className="text-[12.5px] text-ink2">Used for imports, commits and pull requests.</div>
                  </div>
                  {!realGithub && (
                    <Button size="sm" variant="ghost" onClick={() => setGithub('none')}>
                      Change
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <div className="flex-1 text-[13.5px] text-ink2">Connect to import repos and keep every change in your own GitHub.</div>
                  <Button size="sm" variant="dark" loading={github === 'connecting'} onClick={connect}>
                    Connect GitHub
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <span className="text-[13px] font-semibold">Where should apps run?</span>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {(
                [
                  ['lyzr', 'Lyzr cloud', 'Fastest to start. You can move any app to your own cloud later.', Cloud],
                  ['own', 'Your cloud', 'AWS, Azure or Google Cloud, or your own servers. Connect it in Settings.', Server],
                ] as const
              ).map(([id, title, body, Icon]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setRunsOn(id)}
                  aria-pressed={runsOn === id}
                  className={cn(
                    'flex flex-col gap-1.5 rounded-xl border p-4 text-left transition-colors',
                    runsOn === id ? 'border-accent bg-accent-soft shadow-ring' : 'border-line bg-surface hover:border-line2',
                  )}
                >
                  <span className="flex items-center gap-2 text-[14px] font-semibold">
                    <Icon className="h-4 w-4 text-accent" /> {title}
                    {runsOn === id && <Check className="ml-auto h-4 w-4 text-accent" />}
                  </span>
                  <span className="text-[12.5px] leading-relaxed text-ink2">{body}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="rounded-xl bg-surface2 px-4 py-3 text-[13px] leading-relaxed text-ink2">
            <span className="font-semibold text-ink">Teammates:</span> you’ll invite reviewers and approvers from inside a project, when there’s something for them to look at.
          </p>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => {
              signOut();
              router.push('/');
            }}
          >
            Back
          </Button>
          <Button variant="primary" size="lg" onClick={create} disabled={!name.trim()}>
            Create workspace
          </Button>
        </div>
      </div>
    </main>
  );
}
