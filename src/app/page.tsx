'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Compass, Info, Loader2, Mail, MailCheck, PlayCircle } from 'lucide-react';
import { useApp } from '@/lib/store';
import { useHydrated } from '@/lib/hooks';
import { githubUrl, logInRequest, signUpRequest, useServer } from '@/lib/account';
import { enterAccount } from '@/lib/enter';
import { Logo, LogoMark } from '@/components/shell';
import { LoopArt } from '@/components/loop-art';
import { Avatar, Button, inputCls } from '@/components/ui';
import { PEOPLE } from '@/lib/seed';
import { cn } from '@/lib/utils';

type Method = 'GitHub' | 'Google' | 'SSO' | 'email';

export default function SignInPage() {
  return (
    <Suspense>
      <SignIn />
    </Suspense>
  );
}

function SignIn() {
  const ready = useHydrated();
  const signedIn = useApp((s) => s.signedIn);
  const ws = useApp((s) => s.workspace);
  const signIn = useApp((s) => s.signIn);
  const { loaded, features, user } = useServer();
  const router = useRouter();
  const search = useSearchParams();

  const [busy, setBusy] = useState<Method | 'demo' | null>(null);
  const [tab, setTab] = useState<'signin' | 'create'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [demoEmail, setDemoEmail] = useState('arjun@harborline.com');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(search.get('error') ?? '');

  // Already signed in here, or on the server (another tab or device): go straight in.
  useEffect(() => {
    if (!ready) return;
    if (signedIn) router.replace(ws ? '/home' : '/setup');
    else if (loaded && user) void enterAccount(user, 'saved session', router);
  }, [ready, signedIn, ws, router, loaded, user]);

  const demo = (method: Method | 'demo', addr?: string) => {
    setBusy(method);
    setTimeout(() => {
      signIn(method === 'email' ? 'an email link' : method === 'demo' ? 'the demo' : method, addr, 'demo');
      router.push(useApp.getState().workspace ? '/home' : '/setup');
    }, 450);
  };

  const accounts = features.accounts;
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const submitAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validEmail) return setError('Enter your work email.');
    if (password.length < 8) return setError('Passwords are at least 8 characters.');
    setBusy('email');
    try {
      const { user: u } = tab === 'create' ? await signUpRequest(email, password, name) : await logInRequest(email, password);
      await useServer.getState().refresh();
      await enterAccount(u, tab === 'create' ? 'a new account' : 'email and password', router);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setBusy(null);
    }
  };

  if (!ready || signedIn || (loaded && user)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[13px] text-ink2">
        <LogoMark size={22} />
      </div>
    );
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-surface px-12 py-10 text-ink lg:flex">
        <div className="flex items-center gap-2 text-[15.5px] font-semibold">
          <LogoMark />
          Architect
          <span className="rounded-md border border-line2 px-1.5 py-[1px] font-mono text-[10.5px] text-ink2">2.0</span>
        </div>
        <div className="max-w-[560px]">
          <h1 className="text-[40px] font-semibold leading-[1.08] tracking-tight">Build agent apps your experts trust and your IT team approves.</h1>
          <p className="mt-4 text-[16px] leading-relaxed text-ink2">
            Describe the app in a sentence. Architect builds it, your expert proves the answers are right, and IT signs off before anyone relies on it.
          </p>
          <ul className="mt-7 grid gap-3 sm:grid-cols-3" aria-label="The three people in every project">
            {(
              [
                ['builder', 'builds it', 'accent'],
                ['reviewer', 'checks the answers', 'ok'],
                ['approver', 'approves the launch', 'warn'],
              ] as const
            ).map(([role, does, tone]) => {
              const person = PEOPLE.find((x) => x.role === role)!;
              return (
                <li key={role} className="flex items-center gap-2.5 rounded-xl border border-line bg-surface2 px-3 py-2.5">
                  <Avatar initials={person.initials} size={30} tone={tone} />
                  <span className="text-[13px] leading-tight">
                    <span className="block font-semibold text-ink">{person.short}</span>
                    <span className="block text-ink3">{does}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <LoopArt className="mt-6 w-full max-w-[460px]" />
        </div>
        <p className="text-[12.5px] text-ink3">A working prototype of Architect 2.0, the next version of architect.new.</p>
      </section>

      <section className="flex flex-col items-center justify-center px-5 py-10">
        <div className="mb-8 lg:hidden">
          <Logo href="/" />
        </div>
        <div className="w-full max-w-[400px]">
          <div className="rounded-2xl border border-accent-line bg-accent-soft/60 p-5">
            <div className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-accent-ink">
              <Compass className="h-4 w-4" /> New here?
            </div>
            <div className="mt-1.5 text-[19px] font-semibold tracking-tight">See the whole thing in 3 minutes</div>
            <p className="mt-1 text-[13.5px] leading-relaxed text-ink2">A guided tour builds a real app with you, from one sentence to real users. You play all three people. No sign-in needed.</p>
            <Button className="mt-4" size="lg" variant="primary" full href="/tour" icon={<ArrowRight className="h-4 w-4" />}>
              Take the guided tour
            </Button>
          </div>
          <div className="my-7 flex items-center gap-3 text-[12px] text-ink3">
            <span className="h-px flex-1 bg-line" /> or sign in to build your own <span className="h-px flex-1 bg-line" />
          </div>
          <h2 className="text-[24px] font-semibold tracking-tight">{accounts && tab === 'create' ? 'Create your account' : 'Sign in'}</h2>
          <p className="mt-1 text-[14px] text-ink2">Build it. Prove it. Ship it.</p>

          {!loaded ? (
            <div className="mt-10 flex justify-center text-ink3">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : accounts ? (
            <>
              {features.github && (
                <Button
                  className="mt-6"
                  size="lg"
                  variant="dark"
                  full
                  loading={busy === 'GitHub'}
                  onClick={() => {
                    setBusy('GitHub');
                    window.location.href = githubUrl('signin', '/home');
                  }}
                >
                  Continue with GitHub
                </Button>
              )}
              <div className={cn('flex rounded-lg border border-line bg-sunken p-0.5', features.github ? 'mt-5' : 'mt-6')} role="tablist">
                {(
                  [
                    ['signin', 'Sign in'],
                    ['create', 'Create account'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    role="tab"
                    aria-selected={tab === id}
                    onClick={() => {
                      setTab(id);
                      setError('');
                    }}
                    className={cn('flex-1 rounded-md py-1.5 text-[13px] font-medium', tab === id ? 'bg-surface shadow-card' : 'text-ink2')}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <form onSubmit={submitAccount} className="mt-4 grid gap-3">
                {tab === 'create' && (
                  <label className="grid gap-1.5">
                    <span className="text-[13px] font-semibold">Your name</span>
                    <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Arjun Mehta" />
                  </label>
                )}
                <label className="grid gap-1.5">
                  <span className="text-[13px] font-semibold">Work email</span>
                  <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@company.com" />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-[13px] font-semibold">Password</span>
                  <input
                    className={inputCls}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={tab === 'create' ? 'new-password' : 'current-password'}
                    placeholder={tab === 'create' ? 'At least 8 characters' : ''}
                  />
                </label>
                <Button type="submit" size="lg" variant="primary" full loading={busy === 'email'}>
                  {tab === 'create' ? 'Create account' : 'Sign in'}
                </Button>
              </form>
            </>
          ) : (
            <>
              <div className="mt-6 grid gap-2.5">
                <Button size="lg" variant="dark" full loading={busy === 'GitHub'} onClick={() => demo('GitHub')}>
                  Continue with GitHub
                </Button>
                <Button size="lg" full loading={busy === 'Google'} onClick={() => demo('Google')}>
                  Continue with Google
                </Button>
                <Button size="lg" full loading={busy === 'SSO'} onClick={() => demo('SSO')}>
                  Continue with company SSO
                </Button>
              </div>
              <div className="my-6 flex items-center gap-3 text-[12px] text-ink3">
                <span className="h-px flex-1 bg-line" /> or use email <span className="h-px flex-1 bg-line" />
              </div>
              {sent ? (
                <div className="rounded-xl border border-line bg-surface p-5 shadow-card animate-slide-up">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ok-soft text-ok">
                      <MailCheck className="h-[18px] w-[18px]" />
                    </span>
                    <div>
                      <div className="text-[14.5px] font-semibold">Check your inbox</div>
                      <div className="text-[13px] text-ink2">We sent a sign-in link to {demoEmail}.</div>
                    </div>
                  </div>
                  <Button className="mt-4" variant="primary" full icon={<ArrowRight className="h-4 w-4" />} onClick={() => demo('email', demoEmail)}>
                    Open the link (demo)
                  </Button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!/.+@.+\..+/.test(demoEmail)) return setError('Enter your work email.');
                    setSent(true);
                  }}
                  className="grid gap-3"
                >
                  <label className="grid gap-1.5">
                    <span className="text-[13px] font-semibold">Work email</span>
                    <input className={inputCls} type="email" value={demoEmail} onChange={(e) => setDemoEmail(e.target.value)} autoComplete="email" />
                  </label>
                  <Button type="submit" size="lg" variant="primary" full icon={<Mail className="h-4 w-4" />}>
                    Send me a sign-in link
                  </Button>
                </form>
              )}
            </>
          )}

          {error && <p className="mt-3 rounded-lg border border-bad-line bg-bad-soft px-3 py-2 text-[13px] text-bad">{error}</p>}

          <div className="mt-6 grid gap-2">
            {accounts && (
              <Button full variant="ghost" loading={busy === 'demo'} onClick={() => demo('demo')}>
                Try it without an account
              </Button>
            )}
            <Button full variant="subtle" href="/demo" icon={<PlayCircle className="h-4 w-4" />}>
              Open a finished example (no sign-in)
            </Button>
          </div>

          <div className="mt-6 flex gap-2.5 rounded-xl border border-line bg-surface2 px-3.5 py-3 text-[12.5px] leading-relaxed text-ink2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink3" />
            {accounts ? (
              <span>Your account keeps your projects in our database, so you can pick up on any device. Without an account, work is saved only in this browser.</span>
            ) : (
              <span>Demo mode: sign-in is simulated and everything you do is saved in this browser. Nothing is sent anywhere.</span>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
