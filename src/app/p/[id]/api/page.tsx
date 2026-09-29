'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Eye, EyeOff, KeyRound, Play } from 'lucide-react';
import { useApp } from '@/lib/store';
import { createApiKey } from '@/lib/account';
import type { Project } from '@/lib/types';
import { cn } from '@/lib/utils';
import { FocusScreen, ProjectRoute, ScreenTitle } from '@/components/frame';
import { highlight } from '@/components/code-view';
import { ActionButton, Button, CopyButton, Segmented, Tag } from '@/components/ui';

export default function ApiPage() {
  return <ProjectRoute>{(p, now) => <Api p={p} now={now} />}</ProjectRoute>;
}

type Lang = 'curl' | 'python' | 'javascript';
const BODY = { kind: 'theft', amount: 950, police_report: false, title: 'Stolen bike', customer: 'J. Rao' };

/** Code that reads the key from the environment, so the key itself never ends up pasted into a file. */
function snippet(lang: Lang, url: string): string {
  if (lang === 'curl')
    return `curl -X POST ${url} \\
  -H "Authorization: Bearer $ARCHITECT_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"kind": "theft", "amount": 950, "police_report": false}'`;
  if (lang === 'python')
    return `import os, requests

res = requests.post(
    "${url}",
    headers={"Authorization": f"Bearer {os.environ['ARCHITECT_KEY']}"},
    json={"kind": "theft", "amount": 950, "police_report": False},
)
print(res.json()["decision"])`;
  return `const res = await fetch("${url}", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.ARCHITECT_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ kind: "theft", amount: 950, police_report: false }),
});
console.log((await res.json()).decision);`;
}

const masked = (key: string) => `${key.slice(0, key.indexOf('_', 3) + 1 || 8)}${'•'.repeat(12)}${key.slice(-3)}`;

/** Screen 20 · Use it from your code. One job: call the app from your own systems. */
function Api({ p, now }: { p: Project; now: number }) {
  const setApiKey = useApp((s) => s.setApiKey);
  const running = (['test', 'live'] as const).filter((e) => p.deployments[e].status === 'running');
  const [env, setEnv] = useState<'test' | 'live'>(running.includes('live') ? 'live' : 'test');
  const [lang, setLang] = useState<Lang>('curl');
  const [show, setShow] = useState(false);
  const [origin, setOrigin] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ status: number; ms: number; lines: string[] } | null>(null);
  const [shown, setShown] = useState(0);
  const hideTimer = useRef<number>(undefined);

  useEffect(() => setOrigin(window.location.origin), []);
  useEffect(() => () => window.clearTimeout(hideTimer.current), []);
  useEffect(() => {
    if (!result) return;
    setShown(0);
    const t = setInterval(() => setShown((n) => (n >= result.lines.length ? n : n + 1)), 60);
    return () => clearInterval(t);
  }, [result]);

  const d = p.deployments[env];
  const saved = p.apiKeys?.[env];
  const url = `${origin}/api/v1/claims/triage`;
  const code = useMemo(() => snippet(lang, url), [lang, url]);

  if (!running.length)
    return (
      <FocusScreen p={p} now={now} section="ship">
        <ScreenTitle sub="Your app is also an API. Deploy it to Test first, then your own systems can send it claims and get decisions back.">Use it from your code</ScreenTitle>
        <div className="mt-8">
          <Button variant="primary" size="xl" href={`/p/${p.id}/ship`} iconRight={<ArrowRight className="h-4 w-4" />}>
            Go to Ship
          </Button>
        </div>
      </FocusScreen>
    );

  const reveal = () => {
    window.clearTimeout(hideTimer.current);
    if (show) return setShow(false);
    setShow(true);
    hideTimer.current = window.setTimeout(() => setShow(false), 6000);
  };

  const create = async () => {
    setError('');
    try {
      const { key } = await createApiKey(p.id, env, d.version ?? p.version);
      setApiKey(p.id, env, key, d.version ?? p.version);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create a key.');
      return false;
    }
  };

  const send = async () => {
    if (!saved) return false;
    const t = performance.now();
    try {
      const res = await fetch('/api/v1/claims/triage', {
        method: 'POST',
        headers: { Authorization: `Bearer ${saved.key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(BODY),
      });
      const text = await res.text();
      let pretty = text;
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        /* not JSON */
      }
      setResult({ status: res.status, ms: Math.round(performance.now() - t), lines: pretty.split('\n') });
    } catch {
      setResult({ status: 0, ms: Math.round(performance.now() - t), lines: ['The request did not reach the server.'] });
    }
    return true;
  };

  return (
    <FocusScreen p={p} now={now} section="ship" wide>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <ScreenTitle sub="Send it a claim from your own systems. It sends back the decision and the reasons.">Use it from your code</ScreenTitle>
        {running.length > 1 && (
          <Segmented
            size="sm"
            label="Which app"
            value={env}
            onChange={(e) => {
              setEnv(e);
              setResult(null);
            }}
            options={[
              { id: 'test', label: 'Test' },
              { id: 'live', label: 'Live' },
            ]}
          />
        )}
      </div>

      <div className="mt-8 flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3" data-tour="api-key">
        <KeyRound className="h-4 w-4 shrink-0 text-ink3" />
        {saved ? (
          <>
            <code key={String(show)} className={cn('min-w-0 flex-1 truncate font-mono text-[13.5px]', show ? 'animate-msg-in text-ink' : 'text-ink2')}>
              {show ? saved.key : masked(saved.key)}
            </code>
            <button
              type="button"
              onClick={reveal}
              aria-pressed={show}
              aria-label={show ? 'Hide the key' : 'Show the key'}
              className="press grid h-8 w-8 place-items-center rounded-lg text-ink3 hover:bg-surface2 hover:text-ink"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <CopyButton text={saved.key} />
          </>
        ) : (
          <>
            <span className="flex-1 text-[14.5px] text-ink2">You need a key to call the {env === 'live' ? 'Live' : 'Test'} app.</span>
            <ActionButton size="md" label="Create a key" busyLabel="Creating" doneLabel="Created" run={create} holdMs={300} />
          </>
        )}
      </div>
      {error ? (
        <p className="mt-2 text-[13.5px] text-bad">{error}</p>
      ) : (
        saved && (
          <p className="mt-2 text-[13.5px] text-ink3">
            Save it as <code className="font-mono text-ink2">ARCHITECT_KEY</code> where your code runs. The examples below read it from there.
          </p>
        )
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-code-line bg-code">
        <div className="flex items-center gap-2 border-b border-code-line px-2 py-2">
          <Segmented
            size="sm"
            label="Language"
            value={lang}
            onChange={setLang}
            className="border-code-line bg-code"
            options={[
              { id: 'curl', label: 'curl' },
              { id: 'python', label: 'Python' },
              { id: 'javascript', label: 'JavaScript' },
            ]}
          />
          <div className="flex-1" />
          <CopyButton text={code} className="border-code-line bg-transparent text-code-dim hover:bg-white/5 hover:text-code-ink" />
        </div>
        <pre className="code-scroll overflow-x-auto px-4 py-3.5 font-mono text-[12.5px] leading-[1.7] text-code-ink">
          {code.split('\n').map((l, i) => (
            <div key={i}>{highlight(l, lang === 'python' ? 'python' : lang === 'javascript' ? 'typescript' : 'bash') || ' '}</div>
          ))}
        </pre>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <ActionButton
          size="lg"
          icon={<Play className="h-4 w-4" />}
          label={result ? 'Send it again' : 'Send a test request'}
          busyLabel="Sending"
          doneLabel="Answered"
          disabled={!saved}
          resetAfter={600}
          holdMs={500}
          tour="api-send"
          run={send}
        />
        {result && (
          <span className="animate-pop-in">
            <Tag tone={result.status >= 200 && result.status < 300 ? 'ok' : 'bad'}>
              {result.status || 'No answer'} in {result.ms} ms
            </Tag>
          </span>
        )}
      </div>
      {result && (
        <pre className="code-scroll mt-4 max-h-[320px] overflow-auto rounded-xl border border-code-line bg-code px-4 py-3.5 font-mono text-[12.5px] leading-[1.7] text-code-ink" aria-live="polite">
          {result.lines.slice(0, shown).map((l, i) => (
            <div key={i} className="animate-fade-in">
              {highlight(l, 'json') || ' '}
            </div>
          ))}
        </pre>
      )}
    </FocusScreen>
  );
}
