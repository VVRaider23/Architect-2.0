'use client';

import { useMemo, useRef, useState } from 'react';
import { Check, Copy, Download, FileCode2, Folder, GitBranch, RotateCcw, Terminal, Upload } from 'lucide-react';
import { useApp } from '@/lib/store';
import { useUI } from '@/lib/ui';
import { generateFiles, languageOf, sortedPaths } from '@/lib/codegen';
import type { Project } from '@/lib/types';
import { CodeBlock, DiffBlock } from '@/components/code-view';
import { PRButton, useGitHub } from './github';
import { Button, Chip, Empty } from '@/components/ui';
import { useClickOutside } from '@/components/shell';
import { branchFor, cn, timeAgo } from '@/lib/utils';


export function CodeTab({ p }: { p: Project }) {
  const codeFile = useUI((s) => s.codeFile);
  const diffChangeId = useUI((s) => s.diffChangeId);
  const openCode = useUI((s) => s.openCode);
  const undoChange = useApp((s) => s.undoChange);
  const toast = useApp((s) => s.toast);
  const gh = useGitHub(p);
  const [zipping, setZipping] = useState(false);

  const files = useMemo(() => generateFiles(p), [p]);
  const paths = useMemo(() => sortedPaths(files), [files]);
  const change = diffChangeId ? p.changes.find((c) => c.id === diffChangeId) : undefined;
  const lastChange = [...p.changes].reverse().find((c) => !c.undone);
  const modified = new Set(lastChange?.files.map((f) => f.path) ?? []);
  const file = codeFile && files[codeFile] !== undefined ? codeFile : change?.diffFile ?? 'claims_agents/risk_rules.py';

  const groups = useMemo(() => {
    const g = new Map<string, string[]>();
    for (const path of paths) {
      const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/') + 1) : '';
      if (!g.has(dir)) g.set(dir, []);
      g.get(dir)!.push(path);
    }
    return Array.from(g.entries());
  }, [paths]);

  if (p.build.status !== 'done') {
    return (
      <div className="p-8">
        <Empty title="No code yet" body="Code is written during the build and committed to your GitHub repo. Watch it being written in Preview." />
      </div>
    );
  }

  const download = async () => {
    setZipping(true);
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      const root = p.repo.split('/')[1] ?? 'app';
      for (const [path, text] of Object.entries(files)) zip.file(`${root}/${path}`, text);
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${root}-v${p.version}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast(`Downloaded ${Object.keys(files).length} files. Run the tests with: pytest`, 'ok');
    } finally {
      setZipping(false);
    }
  };

  const cloneCmd = `git clone https://github.com/${p.github?.repo ?? p.repo}.git`;
  const showDiff = !!change && change.diffFile === file && change.beforeText !== undefined;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface px-5 py-2.5">
        <label className="flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface2 px-2 text-[12.5px]">
          <GitBranch className="h-3.5 w-3.5 text-ink2" />
          <select
            aria-label="Branch or change"
            className="max-w-[210px] truncate bg-transparent font-mono text-[12px] focus:outline-none"
            value={change?.id ?? 'main'}
            onChange={(e) => {
              const ch = p.changes.find((c) => c.id === e.target.value);
              openCode(ch?.diffFile ?? file, ch?.id ?? null);
            }}
          >
            <option value="main">main</option>
            {p.changes.map((c) => (
              <option key={c.id} value={c.id}>
                {branchFor(c.title)}
                {c.undone ? ' (undone)' : ''}
              </option>
            ))}
          </select>
        </label>
        {gh.real ? (
          p.github ? (
            <>
              <a
                href={p.github.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-ok-line bg-ok-soft px-2.5 py-[3px] text-[12px] font-medium text-ok hover:underline"
              >
                <Check className="h-3 w-3" /> On GitHub · {p.github.repo} ↗
              </a>
              <Button size="sm" loading={gh.busy === 'push'} onClick={gh.push} icon={<Upload className="h-3.5 w-3.5" />}>
                Push latest
              </Button>
            </>
          ) : (
            <Button size="sm" variant="dark" loading={gh.busy === 'push'} onClick={gh.push} icon={<Upload className="h-3.5 w-3.5" />}>
              {gh.canPush ? 'Export to my GitHub' : 'Connect GitHub to export'}
            </Button>
          )
        ) : (
          <Chip tone="ok" icon={<Check className="h-3 w-3" />} title={`Every change is a commit on ${p.repo} (simulated in demo mode)`}>
            Synced with {p.repo}
          </Chip>
        )}
        <div className="flex-1" />
        <RunLocally cloneCmd={cloneCmd} root={p.repo.split('/')[1] ?? 'app'} examples={p.answerKey.length} />
        <Button size="sm" variant="primary" loading={zipping} onClick={download} icon={<Download className="h-3.5 w-3.5" />}>
          Download code (.zip)
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[240px_minmax(0,1fr)]">
        <nav className="scroll-thin flex min-h-0 flex-col overflow-y-auto border-r border-line bg-surface2 py-2" aria-label="Files">
          {groups.map(([dir, list]) => (
            <div key={dir || 'root'} className="mb-1">
              {dir && (
                <div className="flex items-center gap-1.5 px-3 py-1 font-mono text-[11.5px] text-ink2">
                  <Folder className="h-3.5 w-3.5 text-ink3" /> {dir}
                </div>
              )}
              {list.map((path) => {
                const name = path.slice(dir.length);
                const on = path === file;
                return (
                  <button
                    key={path}
                    onClick={() => openCode(path, change && change.diffFile === path ? change.id : null)}
                    className={cn(
                      'flex w-full items-center gap-1.5 py-1 pr-3 text-left font-mono text-[12px]',
                      dir ? 'pl-7' : 'pl-3',
                      on ? 'bg-accent-soft font-medium text-accent-ink' : 'text-ink hover:bg-sunken',
                    )}
                  >
                    <FileCode2 className="h-3.5 w-3.5 shrink-0 text-ink3" />
                    <span className="min-w-0 flex-1 truncate">{name}</span>
                    {modified.has(path) && <span className="rounded bg-warn-soft px-1 text-[10px] font-semibold text-warn">M</span>}
                  </button>
                );
              })}
            </div>
          ))}
          <div className="mt-auto border-t border-line px-3 pb-1 pt-3">
            <div className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink3">Changes</div>
            <ul className="mt-1.5 grid gap-1">
              {[...p.changes].reverse().map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => openCode(c.diffFile ?? file, c.id)}
                    className={cn('w-full rounded-md px-2 py-1.5 text-left text-[12px] hover:bg-sunken', change?.id === c.id && 'bg-sunken')}
                  >
                    <div className={cn('font-medium', c.undone && 'line-through opacity-60')}>
                      #{c.n} {c.title}
                    </div>
                    <div className="text-[11px] text-ink2">
                      fixed {c.fixed} · broke {c.broke} · {c.committed ? `PR #${c.pr}` : 'not committed'}
                    </div>
                  </button>
                </li>
              ))}
              {!p.changes.length && <li className="px-2 text-[12px] text-ink3">No changes yet. Ask Architect in chat.</li>}
            </ul>
          </div>
        </nav>

        <div className="flex min-h-0 min-w-0 flex-col">
          <div className="flex flex-wrap items-center gap-2 border-b border-code-line bg-[#252421] px-4 py-2 text-[12px] text-code-dim">
            <span className="font-mono text-code-ink">{file}</span>
            {showDiff ? (
              <span>
                · change #{change!.n}: {change!.title}
              </span>
            ) : (
              <span>· {files[file]?.split('\n').length ?? 0} lines · edit freely in your repo, it stays in sync</span>
            )}
            <div className="flex-1" />
            {change && !change.undone && (
              <>
                <span className="font-mono">
                  <span className="text-[#7FD49A]">fixed {change.fixed}</span> · <span className={change.broke ? 'text-[#F2A197]' : ''}>broke {change.broke}</span> · {change.before} → {change.after}
                </span>
                {showDiff && (
                  <button onClick={() => openCode(file, null)} className="rounded-md border border-code-line px-2 py-0.5 text-code-ink hover:bg-[#2E2C29]">
                    Show full file
                  </button>
                )}
                <PRButton p={p} ch={change} dark />
                <button onClick={() => undoChange(p.id, change.id)} className="flex items-center gap-1 rounded-md border border-code-line px-2 py-0.5 text-code-ink hover:bg-[#2E2C29]">
                  <RotateCcw className="h-3.5 w-3.5" /> Undo
                </button>
              </>
            )}
            {change?.undone && <span>· undone {timeAgo(change.at)}</span>}
          </div>
          {showDiff ? (
            <DiffBlock before={change!.beforeText ?? ''} after={change!.afterText ?? ''} lang={languageOf(file)} className="min-h-0 flex-1 py-2" />
          ) : (
            <CodeBlock text={files[file] ?? ''} lang={languageOf(file)} className="min-h-0 flex-1 py-2" />
          )}
        </div>
      </div>
    </div>
  );
}

/** For developers: the four commands to run the app, its tests and its API on their own machine. */
function RunLocally({ cloneCmd, root, examples }: { cloneCmd: string; root: string; examples: number }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));
  const steps: [string, string][] = [
    [cloneCmd, 'or unzip the download'],
    [`cd ${root}`, ''],
    ['pip install -r claims_agents/requirements.txt', ''],
    ['pytest tests/ -q', `runs the Answer Key: ${examples} examples`],
    ['uvicorn claims_agents.api:app --reload', 'the API on localhost:8000'],
  ];
  const all = steps.map(([c]) => c).join('\n');
  return (
    <div ref={ref} className="relative">
      <Button size="sm" variant="ghost" onClick={() => setOpen((o) => !o)} icon={<Terminal className="h-3.5 w-3.5" />} aria-expanded={open}>
        Run it locally
      </Button>
      {open && (
        <div className="absolute right-0 top-10 z-40 w-[min(520px,calc(100vw-32px))] rounded-xl border border-line bg-surface p-4 shadow-pop animate-slide-up">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-semibold">Run it on your own machine</span>
            <button
              onClick={() => {
                void navigator.clipboard?.writeText(all).catch(() => undefined);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[12px] font-medium text-accent hover:bg-accent-soft"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy all'}
            </button>
          </div>
          <p className="mt-0.5 text-[12.5px] text-ink2">Plain Python and Next.js. Nothing here needs Architect to run.</p>
          <ol className="mt-3 grid gap-1.5 rounded-lg bg-code px-3 py-2.5 font-mono text-[12px] text-code-ink">
            {steps.map(([cmd, note], i) => (
              <li key={cmd} className="flex flex-wrap items-baseline gap-x-3">
                <span className="select-none text-code-dim">{i + 1}</span>
                <span className="break-all">{cmd}</span>
                {note && <span className="text-code-dim"># {note}</span>}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
