'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { GitBranch, Mail } from 'lucide-react';
import { useApp } from '@/lib/store';
import { useHydrated } from '@/lib/hooks';
import { githubUrl, logInRequest, signUpRequest, useServer } from '@/lib/account';
import { enterAccount } from '@/lib/enter';
import { Loading, Logo, TopBar } from '@/components/shell';
import { ActionButton, Button, Field, inputCls } from '@/components/ui';
import { cn } from '@/lib/utils';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignInPage() {
  return (
    <Suspense fallback={<Loading />}>
      <SignIn />
    </Suspense>
  );
}

/** Screen 2 · Sign in. One job: get in without thinking about it. */
function SignIn() {
  const ready = useHydrated();
  const signedIn = useApp((s) => s.signedIn);
  const ws = useApp((s) => s.workspace);
  const signIn = useApp((s) => s.signIn);
  const { loaded, features, user } = useServer();
  const router = useRouter();
  const search = useSearchParams();
  const [idea, setIdea] = useState('');
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [create, setCreate] = useState(false);
  const [error, setError] = useState(search.get('error') ?? '');
  const [shaking, setShaking] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      setIdea(localStorage.getItem('arch_idea') ?? '');
    } catch {
      /* ignore */
    }
  }, []);

  // Already signed in here, or on the server (another tab or device): go straight in.
  useEffect(() => {
    if (!ready) return;
    if (signedIn) router.replace(ws ? '/home' : '/setup');
    else if (loaded && user) void enterAccount(user, 'saved session', router);
  }, [ready, signedIn, ws, router, loaded, user]);

  useEffect(() => {
    if (emailOpen) setTimeout(() => emailRef.current?.focus(), 60);
  }, [emailOpen]);

  if (!ready || signedIn || (loaded && user)) return <Loading />;

  const next = () => router.push(useApp.getState().workspace ? '/home' : '/setup');
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

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar className="border-transparent bg-transparent" left={<Logo href="/" />} />
      <main className="flex flex-1 justify-center px-4 pb-20 pt-[12vh]">
        <div className="w-full max-w-[400px] animate-screen-in">
          <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.02em]">Sign in to start building</h1>
          {idea ? (
            <p className="mt-2.5 text-[15px] leading-relaxed text-ink2">
              Your idea is saved: <span className="text-ink3">{idea.length > 70 ? `${idea.slice(0, 70)}…` : idea}</span>
            </p>
          ) : (
            <p className="mt-2.5 text-[15px] text-ink2">It takes one click.</p>
          )}

          <div className="mt-8 flex flex-col gap-3">
            <ActionButton
              full
              size="xl"
              variant={emailOpen ? 'secondary' : 'primary'}
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
              onDone={next}
            />
            {!emailOpen ? (
              <Button full size="xl" icon={<Mail className="h-4 w-4" />} onClick={() => setEmailOpen(true)}>
                Continue with email
              </Button>
            ) : (
              <div className="animate-slide-up">
              <form
                noValidate
                className={cn('flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4', shaking && 'shake')}
                onSubmit={(e) => {
                  e.preventDefault();
                  void submitEmail().then((r) => r === true && next());
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
