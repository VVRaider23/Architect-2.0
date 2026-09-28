'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Code2, Copy, Eye, EyeOff, KeyRound, Play } from 'lucide-react';
import { useApp } from '@/lib/store';
import { useUI } from '@/lib/ui';
import { createApiKey } from '@/lib/account';
import type { Project } from '@/lib/types';
import { highlight } from '@/components/code-view';
import { Button, Card, Chip } from '@/components/ui';
import { cn } from '@/lib/utils';

type Lang = 'curl' | 'python' | 'javascript';
const LANG_LABEL: Record<Lang, string> = { curl: 'curl', python: 'Python', javascript: 'JavaScript' };
const EXAMPLE_BODY = `{
  "title": "Stolen bike",
  "kind": "theft",
  "amount": 950,
  "police_report": false,
  "customer": "J. Rao"
}`;

function snippet(lang: Lang, url: string, key: string): string {
  if (lang === 'curl')
    return `curl -X POST ${url} \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{"kind": "theft", "amount": 950, "police_report": false}'`;
  if (lang === 'python')
    return `import requests

res = requests.post(
    "${url}",
    headers={"Authorization": "Bearer ${key}"},
    json={"kind": "theft", "amount": 950, "police_report": False},
)
print(res.json()["decision"])`;
  return `const res = await fetch("${url}", {
  method: "POST",
  headers: {
    Authorization: "Bearer ${key}",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ kind: "theft", amount: 950, police_report: false }),
});
console.log((await res.json()).decision);`;
}

const mask = (key: string) => (key.length > 16 ? `${key.slice(0, 8)}…${key.slice(-4)}` : key);

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => {
        void navigator.clipboard?.writeText(text).catch(() => undefined);
        setDone(true);
        setTimeout(() => setDone(false), 1400);
      }}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[12px] font-medium text-accent hover:bg-accent-soft"
    >
      {done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {done ? 'Copied' : label}
    </button>
  );
}

/** Developers can call the deployed app from their own code: an endpoint, a key and ready-to-run snippets. */
export function ApiCard({ p }: { p: Project }) {
  const setApiKey = useApp((s) => s.setApiKey);
  const openCode = useUI((s) => s.openCode);
  const running = (['live', 'test'] as const).filter((e) => p.deployments[e].status === 'running');
  const [env, setEnv] = useState<'test' | 'live'>(running[0] ?? 'test');
  const [lang, setLang] = useState<Lang>('curl');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [origin, setOrigin] = useState('');
  const [payload, setPayload] = useState(EXAMPLE_BODY);
  const [result, setResult] = useState<{ status: number; ms: number; body: string } | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);
  useEffect(() => {
    if (!running.includes(env) && running[0]) setEnv(running[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running.join()]);

  const d = p.deployments[env];
  const saved = p.apiKeys?.[env];
  const url = `${origin}/api/v1/claims/triage`;
  const stale = !!saved && d.version !== null && saved.version !== d.version;
  const code = useMemo(() => (saved ? snippet(lang, url, saved.key) : ''), [lang, url, saved]);

  if (!running.length) {
    return (
      <Card className="flex flex-wrap items-center gap-3">
        <Code2 className="h-5 w-5 text-ink3" />
        <div className="min-w-0 flex-1">
          <div className="text-[14.5px] font-semibold">Use it from your own code</div>
          <p className="text-[13px] text-ink2">Your app is also an API. Deploy it to Test to get an endpoint and a key your systems can call.</p>
        </div>
      </Card>
    );
  }

  const create = async () => {
    setBusy(true);
    setError('');
    try {
      const { key } = await createApiKey(p.id, env, d.version ?? p.version);
      setApiKey(p.id, env, key, d.version ?? p.version);
      setResult(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create a key.');
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    if (!saved) return;
    setSending(true);
    const t = performance.now();
    try {
      const res = await fetch('/api/v1/claims/triage', {
        method: 'POST',
        headers: { Authorization: `Bearer ${saved.key}`, 'Content-Type': 'application/json' },
        body: payload,
      });
      const text = await res.text();
      let pretty = text;
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        /* not JSON: show as is */
      }
      setResult({ status: res.status, ms: Math.round(performance.now() - t), body: pretty });
    } catch {
      setResult({ status: 0, ms: Math.round(performance.now() - t), body: 'The request did not reach the server.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card pad={false} tour="api">
      <div className="flex flex-wrap items-start gap-3 border-b border-line px-4 py-3.5">
        <Code2 className="mt-0.5 h-5 w-5 text-accent" />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold">Use it from your own code</div>
          <p className="text-[12.5px] text-ink2">
            Your app is also an API. Send a claim from any system and get back the decision, a draft reply and every agent’s step.
          </p>
        </div>
        {running.length > 1 && (
          <div className="flex rounded-lg border border-line bg-surface2 p-0.5 text-[12.5px]" role="radiogroup" aria-label="Environment">
            {running.map((e) => (
              <button
                key={e}
                role="radio"
                aria-checked={env === e}
                onClick={() => {
                  setEnv(e);
                  setResult(null);
                }}
                className={cn('rounded-md px-2.5 py-1 font-medium', env === e ? 'bg-surface shadow-card' : 'text-ink2')}
              >
                {e === 'live' ? 'Live' : 'Test'} · v{p.deployments[e].version}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 px-4 py-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 content-start gap-3">
          <div className="grid gap-1">
            <span className="text-[12px] font-medium text-ink2">Endpoint</span>
            <div className="flex min-w-0 items-center gap-2 rounded-lg border border-line bg-surface2 px-2.5 py-1.5">
              <Chip tone="accent" className="font-mono !text-[11px]">
                POST
              </Chip>
              <span className="min-w-0 flex-1 truncate font-mono text-[12.5px]" title={url}>
                {url}
              </span>
              <CopyButton text={url} />
            </div>
          </div>

          <div className="grid gap-1">
            <span className="text-[12px] font-medium text-ink2">API key · {env === 'live' ? 'Live' : 'Test'}</span>
            {saved ? (
              <div className="flex min-w-0 items-center gap-2 rounded-lg border border-line bg-surface2 px-2.5 py-1.5">
                <KeyRound className="h-3.5 w-3.5 shrink-0 text-ink3" />
                <span className="min-w-0 flex-1 truncate font-mono text-[12.5px]">{show ? saved.key : mask(saved.key)}</span>
                <button onClick={() => setShow((x) => !x)} className="rounded-md p-1 text-ink3 hover:bg-sunken hover:text-ink" aria-label={show ? 'Hide key' : 'Show key'}>
                  {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
                <CopyButton text={saved.key} />
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="primary" loading={busy} onClick={create} icon={<KeyRound className="h-3.5 w-3.5" />}>
                  Create an API key
                </Button>
                <span className="text-[12px] text-ink2">Runs v{d.version} on {env === 'live' ? 'Live' : 'Test'}.</span>
              </div>
            )}
            {stale && (
              <p className="text-[12px] text-warn">
                This key runs v{saved!.version}, but {env === 'live' ? 'Live' : 'Test'} now runs v{d.version}.{' '}
                <button onClick={create} className="font-medium underline">
                  Create a new key
                </button>
              </p>
            )}
            {error && <p className="text-[12px] text-bad">{error}</p>}
          </div>

          {saved && (
            <div className="min-w-0 overflow-hidden rounded-lg border border-code-line bg-code">
              <div className="flex items-center gap-1 border-b border-code-line px-2 py-1.5">
                {(Object.keys(LANG_LABEL) as Lang[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={cn('rounded-md px-2 py-0.5 text-[12px]', lang === l ? 'bg-[#2E2C29] text-code-ink' : 'text-code-dim hover:text-code-ink')}
                  >
                    {LANG_LABEL[l]}
                  </button>
                ))}
                <span className="ml-auto text-[11px] text-code-dim">copies with your key</span>
                <CopyButton text={code} />
              </div>
              <pre className="code-scroll overflow-x-auto px-3 py-2.5 font-mono text-[12px] leading-relaxed text-code-ink">
                {(show ? code : code.replace(saved.key, mask(saved.key))).split('\n').map((line, i) => (
                  <div key={i}>{highlight(line, lang === 'python' ? 'python' : lang === 'javascript' ? 'ts' : 'text')}</div>
                ))}
              </pre>
            </div>
          )}
          <p className="text-[12px] text-ink2">
            Running it on your own servers? The same endpoint is in your code:{' '}
            <button onClick={() => openCode('claims_agents/api.py')} className="font-mono text-accent hover:underline">
              claims_agents/api.py
            </button>
          </p>
        </div>

        <div className="grid min-w-0 content-start gap-2">
          <span className="text-[12px] font-medium text-ink2">Try it: send a claim</span>
          <textarea
            className="min-h-[132px] w-full resize-y rounded-lg border border-line2 bg-surface px-3 py-2 font-mono text-[12px] leading-relaxed focus:border-accent focus:outline-none"
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            aria-label="Request body"
            spellCheck={false}
          />
          <div className="flex items-center gap-2">
            <Button size="sm" variant={saved ? 'primary' : 'secondary'} disabled={!saved} loading={sending} onClick={send} icon={<Play className="h-3.5 w-3.5" />}>
              Send a test request
            </Button>
            {!saved && <span className="text-[12px] text-ink3">Create a key first.</span>}
            {result && (
              <span className={cn('font-mono text-[12px]', result.status >= 200 && result.status < 300 ? 'text-ok' : 'text-bad')}>
                {result.status || 'error'} · {result.ms} ms
              </span>
            )}
          </div>
          {result && (
            <pre className="code-scroll max-h-[260px] overflow-auto rounded-lg border border-code-line bg-code px-3 py-2.5 font-mono text-[12px] leading-relaxed text-code-ink">
              {result.body.split('\n').map((line, i) => (
                <div key={i}>{highlight(line, 'json')}</div>
              ))}
            </pre>
          )}
        </div>
      </div>
    </Card>
  );
}
