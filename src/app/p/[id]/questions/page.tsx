'use client';

import { useRouter } from '@/lib/nav';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '@/lib/store';
import type { FrameworkId, Project } from '@/lib/types';
import { cn } from '@/lib/utils';
import { FocusScreen, ProjectRoute } from '@/components/frame';
import { Kbd, Tick } from '@/components/ui';

export default function QuestionsPage() {
  return <ProjectRoute>{(p, now) => <Questions p={p} now={now} />}</ProjectRoute>;
}

const QS: { q: string; a: string[] }[] = [
  { q: 'Who checks the answers?', a: ['A claims handler', 'A senior handler, for risky claims only', 'Nobody. Send replies automatically'] },
  { q: 'Where do the claims arrive?', a: ['Gmail', 'Outlook', 'Our claims system, through an API'] },
  { q: 'Which framework should the agents use?', a: ['LangGraph', 'CrewAI', 'You decide'] },
];

function initialPicks(p: Project): (number | null)[] {
  if (!p.answers.answered) return [null, null, null];
  const u = p.answers.users.includes('Senior handlers') ? 1 : 0;
  const s = p.answers.systems.includes('Outlook') ? 1 : p.answers.systems.includes('Gmail') ? 0 : 2;
  const f = p.framework === 'crewai' ? 1 : 0;
  return [u, s, f];
}

/** Screen 6 · Three questions. One at a time, answered with a click or the keys 1, 2 and 3. */
function Questions({ p, now }: { p: Project; now: number }) {
  const router = useRouter();
  const answerConsultant = useApp((s) => s.answerConsultant);
  const setFramework = useApp((s) => s.setFramework);
  const draftPlan = useApp((s) => s.draftPlan);
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<(number | null)[]>(() => initialPicks(p));
  const [flash, setFlash] = useState<number | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    if (p.planApproved) router.replace(`/p/${p.id}`);
  }, [p.planApproved, p.id, router]);

  const finish = (all: (number | null)[]) => {
    const [u, s, f] = all as number[];
    answerConsultant(p.id, {
      users: [u === 1 ? 'Senior handlers' : 'Claims handlers'],
      systems: [...(s === 0 ? ['Gmail'] : s === 1 ? ['Outlook'] : []), 'Claims database', 'Policy PDFs'],
      risky: '',
    });
    setFramework(p.id, (f === 1 ? 'crewai' : 'langgraph') as FrameworkId);
    draftPlan(p.id);
    router.push(`/p/${p.id}/plan`);
  };

  const pick = (i: number) => {
    if (busy.current) return;
    busy.current = true;
    const next = picks.map((x, k) => (k === step ? i : x));
    setPicks(next);
    setFlash(i);
    setTimeout(() => {
      setFlash(null);
      busy.current = false;
      if (step < QS.length - 1) setStep(step + 1);
      else finish(next);
    }, 320);
  };

  const back = () => {
    if (step > 0) setStep(step - 1);
    else router.push('/home');
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;
      const n = Number(e.key);
      if (n >= 1 && n <= QS[step].a.length) {
        e.preventDefault();
        pick(n - 1);
      } else if (e.key === 'Backspace' || e.key === 'ArrowLeft') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const Q = QS[step];
  return (
    <FocusScreen p={p} now={now} section="build">
      <div className="flex items-center gap-4">
        <button type="button" onClick={back} className="press inline-flex items-center gap-1.5 rounded-md text-[13.5px] text-ink3 hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <span className="text-[13.5px] text-ink3">
          Question <b className="font-semibold text-ink">{step + 1}</b> of {QS.length}
        </span>
        <div className="ml-auto flex gap-1.5" aria-hidden>
          {QS.map((_, i) => (
            <i key={i} className={cn('h-1.5 w-8 rounded-full transition-colors duration-300', i <= step ? 'bg-accent' : 'bg-line2')} />
          ))}
        </div>
      </div>

      <div key={step} className="mt-10 animate-slide-left" aria-live="polite">
        <h1 className="text-balance text-[30px] font-semibold leading-tight tracking-[-0.02em] sm:text-[34px]">{Q.q}</h1>
        <div className="mt-7 flex flex-col gap-2.5" role="radiogroup" aria-label={Q.q}>
          {Q.a.map((a, i) => {
            const on = picks[step] === i;
            return (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={on}
                data-tour={step === 0 && i === 0 ? 'q-first' : undefined}
                onClick={() => pick(i)}
                className={cn(
                  'press flex min-h-[56px] w-full items-center gap-3.5 rounded-xl border px-4 py-3 text-left text-[16px] transition-colors duration-150',
                  on ? 'border-accent bg-accent-soft text-ink' : 'border-line2 bg-surface hover:border-ink3/60 hover:bg-surface2',
                  flash === i && 'scale-[0.99]',
                )}
              >
                <Kbd className={cn(on && 'border-accent-line text-accent-ink')}>{i + 1}</Kbd>
                <span className="flex-1">{a}</span>
                <Tick on={on} size={18} className="text-accent" />
              </button>
            );
          })}
        </div>
        <p className="mt-6 text-[13.5px] text-ink3">Press 1, 2 or 3. You can change any answer on the next screen.</p>
      </div>
    </FocusScreen>
  );
}
