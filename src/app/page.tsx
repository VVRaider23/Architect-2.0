'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useApp } from '@/lib/store';
import { useHydrated } from '@/lib/hooks';
import { useRouter } from '@/lib/nav';
import { saveStart, type Way } from '@/lib/start';
import { Logo, TopBar } from '@/components/shell';
import { Button } from '@/components/ui';
import { PromptBox } from '@/components/prompt-box';
import { RepoBox, WayTabs } from '@/components/start';

/**
 * Screen 1 · Welcome. One job: say what this is, and let you start by typing.
 * It always shows, even if you've been here before. If you're already signed in,
 * the top right takes you back to your projects and typing an idea starts building it.
 */
export default function Welcome() {
  const ready = useHydrated();
  const signedIn = useApp((s) => s.signedIn);
  const ws = useApp((s) => s.workspace);
  const createProject = useApp((s) => s.createProject);
  const setViewAs = useApp((s) => s.setViewAs);
  const router = useRouter();
  const [way, setWay] = useState<Way>('describe');
  const [idea, setIdea] = useState('');
  const [repo, setRepo] = useState('');
  const [busy, setBusy] = useState(false);
  const inside = ready && signedIn;

  // Way 1 · Describe it.
  const start = () => {
    if (inside && ws) {
      // Already set up: go straight to the three questions for this idea.
      setBusy(true);
      setViewAs('builder');
      const id = createProject(idea.trim());
      router.push(`/p/${id}/questions`);
      return;
    }
    saveStart('describe', idea);
    router.push(inside ? '/setup' : '/signin');
  };

  // Way 2 · Bring your code.
  const startCode = (name: string) => {
    if (inside && ws) {
      setBusy(true);
      setViewAs('builder');
      router.push(name ? `/import?repo=${encodeURIComponent(name)}` : '/import');
      return;
    }
    saveStart('code', name);
    router.push(inside ? '/setup' : '/signin');
  };

  return (
    <div className="grid-bg flex min-h-screen flex-col">
      <TopBar
        className="border-transparent bg-transparent backdrop-blur-0"
        left={<Logo href="/" />}
        right={
          !ready ? (
            // Keeps the space while we check whether you're signed in, so nothing jumps.
            <span aria-hidden className="block h-9 w-[92px]" />
          ) : inside ? (
            <Button variant="secondary" href="/home" iconRight={<ArrowRight className="h-4 w-4" />} className="animate-fade-in">
              Your projects
            </Button>
          ) : (
            <Button variant="ghost" href="/signin" className="animate-fade-in">
              Sign in
            </Button>
          )
        }
      />
      <main className="flex flex-1 justify-center px-4 pb-20 pt-[13vh]">
        <div className="w-full max-w-[640px] animate-screen-in text-center">
          <h1 className="text-balance text-[40px] font-semibold leading-[1.04] tracking-[-0.035em] sm:text-[54px]">Build AI agent apps your experts trust</h1>
          <p className="mx-auto mt-5 max-w-[500px] text-pretty text-[17px] leading-relaxed text-ink2">
            Describe the app, or bring your code. Architect builds it, checks it with your experts, and ships it.
          </p>
          <div className="mt-9 flex justify-center">
            <WayTabs way={way} onChange={setWay} />
          </div>
          <div className="mt-3" data-tour="welcome-prompt">
            {way === 'describe' ? (
              <PromptBox
                value={idea}
                onChange={setIdea}
                onSubmit={start}
                busy={busy}
                autoFocus
                placeholder="For example: a claims assistant that flags risky claims for a person to check…"
                hint={inside && ws ? 'Press Enter to plan it' : 'Press Enter to start'}
              />
            ) : (
              <RepoBox
                value={repo}
                onChange={setRepo}
                onSubmit={startCode}
                busy={busy}
                autoFocus
                hint={
                  inside
                    ? 'Architect reads it, finds the agents and adds tests. Nothing changes in your repo until you accept a pull request.'
                    : 'Next you’ll sign in with GitHub, so Architect can read your code. Nothing changes in your repo until you accept a pull request.'
                }
              />
            )}
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[14px]">
            <Link href="/tour" className="press group inline-flex items-center gap-1.5 text-ink2 hover:text-ink">
              Or take the 3-minute tour
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <Link href="/demo" className="press text-ink3 hover:text-ink">
              See a finished example
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
