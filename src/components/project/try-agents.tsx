'use client';

import { useState } from 'react';
import { FlaskConical, Sparkles } from 'lucide-react';
import { askAI, useServer } from '@/lib/account';
import { ACTION_LABEL, KIND_LABEL, money, triage } from '@/lib/engine';
import type { Action, Claim, ClaimKind, Project, Risk } from '@/lib/types';
import { RiskChip } from '@/components/domain';
import { Button, Card, textareaCls } from '@/components/ui';
import { cn } from '@/lib/utils';

const SAMPLE =
  'Hi, someone stole my e-bike from our shared garage last night. It cost $2,400 and the receipt is attached. I haven’t been to the police yet. Can you pay out quickly? — R. Iyer';

/** Reads the basic facts out of a claim email, for the rules engine (used when no AI key is set). */
export function parseClaim(text: string): Claim {
  const t = text.toLowerCase();
  const kind: ClaimKind = /(stole|stolen|theft|burglar|robbed|pickpocket|taken from)/.test(t)
    ? 'theft'
    : /(river|storm surge|flash flood)/.test(t)
      ? 'flood'
      : /(leak|pipe|water|dishwasher|boiler|washing machine|flooded the (kitchen|bathroom|basement))/.test(t)
        ? 'water_damage'
        : /(roof|tile)/.test(t)
          ? 'roof'
          : /(fire|smoke|burn)/.test(t)
            ? 'fire'
            : /hail/.test(t)
              ? 'hail'
              : /(windscreen|windshield|glass|screen|window)/.test(t)
                ? 'glass'
                : 'liability';
  const m = text.match(/\$\s?([\d,]+(?:\.\d+)?)/) ?? text.match(/([\d,]{3,})\s?(?:dollars|usd)/i);
  const amount = m ? Number(m[1].replace(/,/g, '')) : 1000;
  const newPolicy = /(new policy|policy last (week|month)|took out the policy (a few weeks|last month|recently)|moved in last month|just bought the policy)/.test(t);
  const police = /(police report|crime (reference|number)|\bcr-\d+|reported it to the police|police reference)/.test(t) && !/(haven.?t|not yet|no) (been to|called|told|reported)?\s*(the )?police/.test(t);
  return {
    id: 'C-TRY',
    title: 'Your claim',
    customer: (text.match(/—\s*([A-Z][\w.]*\s?[A-Z]?[\w.]*)\s*$/) ?? [])[1] ?? 'Customer',
    kind,
    amount,
    policyId: 'HB-2999',
    policyAgeDays: newPolicy ? 30 : 400,
    policeReport: kind === 'theft' ? police : undefined,
    attachments: /attach/.test(t) ? ['attachment.pdf'] : [],
    email: text,
  };
}

interface Out {
  risk: Risk;
  action: Action;
  reason: string;
  draft: string;
  by: 'ai' | 'rules';
  facts?: string;
}

/** A playground: paste any claim and see what the agents would do with it right now. */
export function TryAgents({ p }: { p: Project }) {
  const ai = useServer((s) => s.features.ai);
  const [text, setText] = useState(SAMPLE);
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<Out | null>(null);
  const [error, setError] = useState('');

  const run = async () => {
    setBusy(true);
    setError('');
    try {
      if (ai) {
        const rs = p.agents.find((a) => a.id === 'risk_scorer');
        const rd = p.agents.find((a) => a.id === 'reply_drafter');
        const guardrails = p.agents.flatMap((a) => a.guardrails.filter((g) => g.on).map((g) => g.label));
        const r = await askAI<{ verdict: { risk: Risk; action: Action; reason: string; draft: string } | null; raw?: string }>({
          mode: 'agent',
          agent: { name: 'Risk scorer', instructions: `${rs?.instructions ?? ''} ${rd?.instructions ?? ''}`.trim(), guardrails },
          claim: text,
        });
        if (!r.verdict) throw new Error('The model answered in an unexpected format. Try again.');
        setOut({ ...r.verdict, by: 'ai' });
      } else {
        const claim = parseClaim(text);
        const { verdict } = triage(claim, p.version);
        setOut({
          risk: verdict.risk,
          action: verdict.action,
          reason: verdict.reasons[0],
          draft: verdict.draft,
          by: 'rules',
          facts: `${KIND_LABEL[claim.kind]} · ${money(claim.amount)}${claim.kind === 'theft' ? (claim.policeReport ? ' · police report given' : ' · no police report') : ''}${claim.policyAgeDays < 60 ? ' · new policy' : ''}`,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-[15px] font-semibold">
            <FlaskConical className="h-4 w-4 text-accent" /> Try the agents with a new claim
          </div>
          <p className="mt-0.5 text-[12.5px] text-ink2">
            {ai
              ? `A real AI model follows the Risk scorer’s current instructions (v${p.version}). Change the instructions and try again.`
              : `Runs the current rules (v${p.version}). Add an AI key in Vercel to have a real model answer instead.`}
          </p>
        </div>
      </div>
      <textarea className={cn(textareaCls, 'text-[13px]')} rows={3} value={text} onChange={(e) => setText(e.target.value)} aria-label="Claim email" />
      <div className="flex items-center gap-2">
        <Button size="sm" variant="primary" loading={busy} onClick={run} icon={<Sparkles className="h-3.5 w-3.5" />} disabled={!text.trim()}>
          Run it
        </Button>
        <button className="text-[12.5px] text-ink2 hover:text-ink" onClick={() => setText(SAMPLE)}>
          Reset example
        </button>
      </div>
      {error && <p className="rounded-lg border border-bad-line bg-bad-soft px-3 py-2 text-[12.5px] text-bad">{error}</p>}
      {out && (
        <div className="grid gap-2 rounded-xl border border-line bg-surface2 p-3 animate-slide-up">
          <div className="flex flex-wrap items-center gap-2">
            <RiskChip risk={out.risk} />
            <span className="text-[13.5px] font-semibold">{ACTION_LABEL[out.action]}</span>
            <span className="ml-auto rounded border border-line bg-surface px-1.5 font-mono text-[10.5px] text-ink2">{out.by === 'ai' ? `answered by ${ai === 'openai' ? 'OpenAI' : 'Claude'}` : 'answered by the rules'}</span>
          </div>
          {out.facts && <div className="text-[12px] text-ink3">Read as: {out.facts}</div>}
          <p className="text-[13px]">Why: {out.reason}</p>
          <p className="text-[13px] text-ink2">Draft reply: “{out.draft}”</p>
        </div>
      )}
    </Card>
  );
}
