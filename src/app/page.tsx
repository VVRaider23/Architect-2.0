'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useApp } from '@/lib/store';
import { useHydrated } from '@/lib/hooks';
import { Logo, TopBar } from '@/components/shell';
import { Button } from '@/components/ui';
import { PromptBox } from '@/components/prompt-box';

/** Screen 1 · Welcome. One job: say what this is, and let you start by typing. */
export default function Welcome() {
  const ready = useHydrated();
  const signedIn = useApp((s) => s.signedIn);
  const ws = useApp((s) => s.workspace);
  const router = useRouter();
  const [idea, setIdea] = useState('');

  useEffect(() => {
    if (ready && signedIn) router.replace(ws ? '/home' : '/setup');
  }, [ready, signedIn, ws, router]);

  const start = () => {
    try {
      localStorage.setItem('arch_idea', idea.trim());
    } catch {
      /* private window: the idea just won't carry over */
    }
    router.push('/signin');
  };

  return (
    <div className="grid-bg flex min-h-screen flex-col">
      <TopBar
        className="border-transparent bg-transparent backdrop-blur-0"
        left={<Logo href="/" />}
        right={
          <Button variant="ghost" href="/signin">
            Sign in
          </Button>
        }
      />
      <main className="flex flex-1 justify-center px-4 pb-20 pt-[13vh]">
        <div className="w-full max-w-[640px] animate-screen-in text-center">
          <h1 className="text-balance text-[40px] font-semibold leading-[1.04] tracking-[-0.035em] sm:text-[54px]">Build AI agent apps your experts trust</h1>
          <p className="mx-auto mt-5 max-w-[500px] text-pretty text-[17px] leading-relaxed text-ink2">
            Describe the app. Architect builds it, checks it with your experts, and ships it.
          </p>
          <div className="mt-9" data-tour="welcome-prompt">
            <PromptBox
              value={idea}
              onChange={setIdea}
              onSubmit={start}
              autoFocus
              placeholder="For example: a claims assistant that flags risky claims for a person to check…"
            />
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
