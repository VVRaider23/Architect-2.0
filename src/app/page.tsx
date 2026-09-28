'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Info, Mail, MailCheck } from 'lucide-react';
import { useApp } from '@/lib/store';
import { useHydrated } from '@/lib/hooks';
import { getSupabase, supabaseConfigured } from '@/lib/supabase';
import { loadCloudState } from '@/lib/cloud';
import { Logo, LogoMark } from '@/components/shell';
import { LoopArt } from '@/components/loop-art';
import { Button, inputCls } from '@/components/ui';

type Method = 'GitHub' | 'Google' | 'SSO' | 'email';

export default function SignInPage() {
  const ready = useHydrated();
  const signedIn = useApp((s) => s.signedIn);
  const ws = useApp((s) => s.workspace);
  const signIn = useApp((s) => s.signIn);
  const router = useRouter();

  const [busy, setBusy] = useState<Method | null>(null);
  const [email, setEmail] = useState('arjun@harborline.com');
  const [password, setPassword] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (ready && signedIn) router.replace(ws ? '/home' : '/setup');
  }, [ready, signedIn, ws, router]);

  const finishDemo = (method: Method, addr?: string) => {
    signIn(method === 'email' ? 'an email link' : method, addr, 'demo');
    router.push(useApp.getState().workspace ? '/home' : '/setup');
  };

  const onProvider = async (method: Exclude<Method, 'email'>) => {
    setError('');
    setBusy(method);
    const sb = await getSupabase();
    if (sb && method !== 'SSO') {
      const { error: err } = await sb.auth.signInWithOAuth({
        provider: method === 'GitHub' ? 'github' : 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (err) {
        setError(`${method} sign-in isn't turned on for this Supabase project yet. Use email, or the demo.`);
        setBusy(null);
      }
      return;
    }
    setTimeout(() => finishDemo(method), 650);
  };

  const validEmail = /.+@.+\..+/.test(email);

  const onEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNote('');
    if (!validEmail) {
      setError('Enter your work email.');
      return;
    }
    const sb = await getSupabase();
    if (!sb) {
      setBusy('email');
      setTimeout(() => {
        setBusy(null);
        setSent(true);
      }, 600);
      return;
    }
    if (password.length < 6) {
      setError('Passwords are at least 6 characters.');
      return;
    }
    setBusy('email');
    const res = await sb.auth.signInWithPassword({ email, password });
    if (res.error) {
      setBusy(null);
      setError(
        /invalid/i.test(res.error.message)
          ? 'That email and password don’t match an account. New here? Create an account below.'
          : res.error.message,
      );
      return;
    }
    await afterRealSignIn(res.data.user?.email ?? email);
  };

  const onCreate = async () => {
    setError('');
    setNote('');
    const sb = await getSupabase();
    if (!sb) return;
    if (!validEmail || password.length < 6) {
      setError('Enter your work email and a password of at least 6 characters.');
      return;
    }
    setBusy('email');
    const res = await sb.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
    if (res.error) {
      setBusy(null);
      setError(res.error.message);
      return;
    }
    if (!res.data.session) {
      setBusy(null);
      setNote('Account created. Check your inbox to confirm your email, then sign in.');
      return;
    }
    await afterRealSignIn(res.data.user?.email ?? email);
  };

  const afterRealSignIn = async (addr: string) => {
    try {
      const remote = await loadCloudState();
      if (remote) useApp.setState({ workspace: remote.workspace, projects: remote.projects ?? [], audit: remote.audit ?? [] });
    } catch (err) {
      console.warn('Could not load saved state from Supabase', err);
    }
    signIn('email and password', addr, 'supabase');
    router.push(useApp.getState().workspace ? '/home' : '/setup');
  };

  if (!ready || signedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[13px] text-ink2">
        <LogoMark size={22} />
      </div>
    );
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-[#1D1C1A] px-12 py-10 text-white lg:flex">
        <div className="flex items-center gap-2 text-[15.5px] font-semibold">
          <LogoMark />
          Architect
          <span className="rounded-md border border-[#3A3834] px-1.5 py-[1px] font-mono text-[10.5px] text-[#C9C5BC]">2.0</span>
        </div>
        <div className="max-w-[560px]">
          <h1 className="text-[40px] font-semibold leading-[1.08] tracking-tight">
            Build agent apps your experts trust and your IT team approves.
          </h1>
          <ol className="mt-8 grid gap-4">
            {[
              ['Build', 'from a prompt or your repo, in the framework you choose.'],
              ['Prove', 'it with your experts’ own examples, rerun on every change.'],
              ['Ship', 'with IT’s sign-off, on your cloud or ours.'],
            ].map(([h, t], i) => (
              <li key={h} className="flex gap-3.5">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#4A4742] font-mono text-[12px] text-[#C9C5BC]">
                  {i + 1}
                </span>
                <p className="text-[16px] leading-relaxed text-[#C9C5BC]">
                  <span className="font-semibold text-white">{h}</span> {t}
                </p>
              </li>
            ))}
          </ol>
          <LoopArt className="mt-8 w-full max-w-[480px]" />
        </div>
        <p className="text-[12.5px] text-[#9C988F]">A working prototype of Architect 2.0, the next version of architect.new.</p>
      </section>

      <section className="flex flex-col items-center justify-center px-5 py-10">
        <div className="mb-8 lg:hidden">
          <Logo href="/" />
        </div>
        <div className="w-full max-w-[400px]">
          <h2 className="text-[26px] font-semibold tracking-tight">Sign in</h2>
          <p className="mt-1 text-[14px] text-ink2">Build it. Prove it. Ship it.</p>

          <div className="mt-6 grid gap-2.5">
            <Button size="lg" variant="dark" full loading={busy === 'GitHub'} onClick={() => onProvider('GitHub')}>
              Continue with GitHub
            </Button>
            <Button size="lg" full loading={busy === 'Google'} onClick={() => onProvider('Google')}>
              Continue with Google
            </Button>
            <Button size="lg" full loading={busy === 'SSO'} onClick={() => onProvider('SSO')}>
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
                  <div className="text-[13px] text-ink2">We sent a sign-in link to {email}.</div>
                </div>
              </div>
              <Button className="mt-4" variant="primary" full icon={<ArrowRight className="h-4 w-4" />} onClick={() => finishDemo('email', email)}>
                Open the link (demo)
              </Button>
              <button className="mt-2 w-full text-center text-[12.5px] text-ink2 hover:text-ink" onClick={() => setSent(false)}>
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={onEmail} className="grid gap-3">
              <label className="grid gap-1.5">
                <span className="text-[13px] font-semibold">Work email</span>
                <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@company.com" />
              </label>
              {supabaseConfigured && (
                <label className="grid gap-1.5">
                  <span className="text-[13px] font-semibold">Password</span>
                  <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
                </label>
              )}
              <Button type="submit" size="lg" variant="primary" full loading={busy === 'email'} icon={<Mail className="h-4 w-4" />}>
                {supabaseConfigured ? 'Sign in' : 'Send me a sign-in link'}
              </Button>
              {supabaseConfigured && (
                <button type="button" onClick={onCreate} className="text-[13px] font-medium text-accent hover:underline">
                  New here? Create an account
                </button>
              )}
            </form>
          )}

          {error && <p className="mt-3 rounded-lg border border-bad-line bg-bad-soft px-3 py-2 text-[13px] text-bad">{error}</p>}
          {note && <p className="mt-3 rounded-lg border border-ok-line bg-ok-soft px-3 py-2 text-[13px] text-ok">{note}</p>}

          <p className="mt-6 text-[13px] leading-relaxed text-ink2">
            <span className="font-semibold text-ink">Invited to review or approve?</span> Use the email your invite went to. You’ll land right on the answers or the launch waiting for you.
          </p>

          <div className="mt-6 flex gap-2.5 rounded-xl border border-line bg-surface2 px-3.5 py-3 text-[12.5px] leading-relaxed text-ink2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink3" />
            {supabaseConfigured ? (
              <span>
                Real sign-in is on (Supabase). Your workspace is saved to your account.{' '}
                <button className="font-medium text-accent hover:underline" onClick={() => finishDemo('SSO')}>
                  Explore the demo without an account
                </button>
              </span>
            ) : (
              <span>Demo mode: sign-in is simulated and everything you do is saved in this browser. Nothing is sent anywhere.</span>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
