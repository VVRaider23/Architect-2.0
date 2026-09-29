'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/lib/nav';
import { Suspense, useEffect, useRef, useState } from 'react';
import { GitBranch, Mail } from 'lucide-react';
import { useApp } from '@/lib/store';
import { useHydrated } from '@/lib/hooks';
import { githubUrl, logInRequest, signUpRequest, useServer } from '@/lib/account';
import { enterAccount } from '@/lib/enter';
import { landing, quickWorkspace, savedRepo, savedWay, type Way } from '@/lib/start';
import { Logo, TopBar } from '@/components/shell';
import { GetInSkeleton, ShellSkeleton } from '@/components/skeletons';
import { ActionButton, Button, Field, inputCls } from '@/components/ui';
import { cn } from '@/lib/utils';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignInPage() {
  return (
    <Suspense fallback={<GetInSkeleton />}>
      <SignIn />
    </Suspense>
  );
}

/**
 * Screen 2 · Sign in. One job: get in without thinking about it.
 * The first option follows the way you came in: an email box if you described an app,
 * GitHub if you brought your code (Architect needs GitHub to read it).
 */
function SignIn() {
  const ready = useHydrated();
  const signedIn = useApp((s) => s.signedIn);
  const ws = useApp((s) => s.workspace);
  const signIn = useApp((s) => s.signIn);
  const { loaded, features, user } = useServer();
  const router = useRouter();
  const search = useSearchParams();
  // What you chose before signing in. Read once; this screen only shows after the saved state loads.
  const [way] = useState<Way>(() => (typeof window === 'undefined' ? 'describe' : savedWay()));
  const [repo] = useState(() => (typeof window === 'undefined' ? '' : savedRepo()));
  const [idea] = useState(() => {
    if (typeof window === 'undefined') return '';
    try {
      return localStorage.getItem('arch_idea') ?? '';
    } catch {
      return '';
    }
  });
  const [emailOpen, setEmailOpen] = useState(way === 'describe');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [create, setCreate] = useState(false);
  const [error, setError] = useState(search.get('error') ?? '');
  const [shaking, setShaking] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  // Already signed in here, or on the server (another tab or device): go straight in.
  useEffect(() => {
    if (!ready) return;
    if (signedIn) router.replace(ws ? '/home' : '/setup');
    else if (loaded && user) void enterAccount(user, 'saved session', router);
  }, [ready, signedIn, ws, router, loaded, user]);

  useEffect(() => {
    if (ready && emailOpen) setTimeout(() => emailRef.current?.focus(), 60);
  }, [ready, emailOpen]);

  // Already in: show the shape of where we're heading while we get there.
  if (ready && signedIn && ws) return <ShellSkeleton page="home" />;
  if (!ready || signedIn || (loaded && user)) return <GetInSkeleton />;

  /** GitHub people answer one question about their code; email people go straight in. */
  const next = (via: 'github' | 'email') => {
    const s = useApp.getState();
    if (s.workspace) return router.push(landing());
    if (via === 'email') {
      quickWorkspace(s.userEmail);
      return router.push(landing());
    }
    router.push('/setup');
  };
  const bad = (msg: string) => {
    setError(msg);
    setShaking(true);
    setTimeout(() => setShaking(false), 340);
    return false;
  };

  const submitEmail = async () => {
    setError('');
    if (!EMAIL.test(email.trim())) return bad('Add the full address, like arjun@harborline.com');
    if (!features.accounts) {
      signIn('an email link', email.trim(), 'demo');
      return true;
    }
    if (password.length < 8) return bad('Passwords are at least 8 characters.');
    try {
      const { user: u } = create ? await signUpRequest(email.trim(), password, '') : await logInRequest(email.trim(), password);
      await useServer.getState().refresh();
      await enterAccount(u, create ? 'a new account' : 'email and password', router);
      return 'account';
    } catch (err) {
      return bad(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    }
  };

  const github = (
    <ActionButton
      full
      size="xl"
      variant={way === 'code' && !emailOpen ? 'primary' : 'secondary'}
      icon={<GitBranch className="h-4 w-4" />}
      label="Continue with GitHub"
      busyLabel="Opening GitHub"
      doneLabel="Signed in"
      tour="signin-github"
      run={() => {
        if (features.github) {
          window.location.href = githubUrl('signin', '/setup');
          return new Promise(() => undefined);
        }
        signIn('GitHub', undefined, 'demo');
        return true;
      }}
      onDone={() => next('github')}
    />
  );

  const emailForm = (
    <div className="animate-slide-up">
      <form
        noValidate
        className={cn('flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4', shaking && 'shake')}
        onSubmit={(e) => {
          e.preventDefault();
          void submitEmail().then((r) => r === true && next('email'));
        }}
      >
        <Field label="Work email" htmlFor="em" error={error || null}>
          <input
            ref={emailRef}
            id="em"
            type="email"
            autoComplete="email"
            spellCheck={false}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            placeholder="arjun@harborline.com"
            className={cn(inputCls, error && 'border-bad focus:border-bad')}
          />
        </Field>
        {features.accounts && (
          <Field label={create ? 'Choose a password' : 'Password'} htmlFor="pw" hint={create ? 'At least 8 characters.' : undefined}>
            <input
              id="pw"
              type="password"
              autoComplete={create ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
            />
          </Field>
        )}
        <Button type="submit" variant="primary" size="lg" full>
          {features.accounts && create ? 'Create account' : 'Continue'}
        </Button>
        {features.accounts && (
          <button type="button" onClick={() => setCreate((c) => !c)} className="press text-[13.5px] text-ink3 hover:text-ink">
            {create ? 'I already have an account' : 'New here? Create an account'}
          </button>
        )}
      </form>
    </div>
  );

  const saved = way === 'code' ? repo : idea;
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar className="border-transparent bg-transparent" left={<Logo href="/" />} />
      <main className="flex flex-1 justify-center px-4 pb-20 pt-[12vh]">
        <div className="w-full max-w-[400px] animate-screen-in">
          <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.02em]">{way === 'code' ? 'Sign in to bring your code' : 'Sign in to start building'}</h1>
          {saved ? (
            <p className="mt-2.5 text-[15px] leading-relaxed text-ink2">
              Your {way === 'code' ? 'repo' : 'idea'} is saved: <span className={cn('text-ink3', way === 'code' && 'font-mono text-[14px]')}>{saved.length > 70 ? `${saved.slice(0, 70)}…` : saved}</span>
            </p>
          ) : (
            <p className="mt-2.5 text-[15px] text-ink2">{way === 'code' ? 'Sign in with GitHub so Architect can read your code.' : 'Use your work email. There’s nothing to install.'}</p>
          )}

          <div className="mt-8 flex flex-col gap-3">
            {way === 'code' ? (
              <>
                {github}
                {!emailOpen ? (
                  <Button full size="xl" icon={<Mail className="h-4 w-4" />} onClick={() => setEmailOpen(true)}>
                    Continue with email
                  </Button>
                ) : (
                  emailForm
                )}
              </>
            ) : (
              <>
                {emailForm}
                <div className="flex items-center gap-3 py-1 text-[12.5px] text-ink3" aria-hidden>
                  <span className="h-px flex-1 bg-line" />
                  or
                  <span className="h-px flex-1 bg-line" />
                </div>
                {github}
                <p className="text-[13px] leading-relaxed text-ink3">GitHub is handy if you write code: Architect can then save your app’s code there too.</p>
              </>
            )}
            {error && !emailOpen && <p className="text-[13.5px] text-bad">{error}</p>}
          </div>

          <p className="mt-8 text-[13.5px] text-ink3">
            Just looking?{' '}
            <Link href="/demo" className="text-ink2 underline decoration-line2 underline-offset-4 hover:text-ink">
              Open a finished example
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
