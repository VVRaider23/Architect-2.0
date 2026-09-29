'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { ChevronDown, Download, ExternalLink, GitBranch, Terminal, Upload } from 'lucide-react';
import { useApp } from '@/lib/store';
import { generateFiles, languageOf, sortedPaths } from '@/lib/codegen';
import type { Project } from '@/lib/types';
import { branchFor, cn } from '@/lib/utils';
import { ProjectRoute, Workspace } from '@/components/frame';
import { CodeBlock, DiffBlock } from '@/components/code-view';
import { useGitHub } from '@/components/project/github';
import { Button, CopyButton, Menu, Modal } from '@/components/ui';

export default function CodePage() {
  return (
    <Suspense>
      <ProjectRoute>{(p, now) => <Code p={p} now={now} />}</ProjectRoute>
    </Suspense>
  );
}

/** Screen 12 · Code. One job: read the code, copy it, or take it with you. */
function Code({ p, now }: { p: Project; now: number }) {
  const router = useRouter();
  const search = useSearchParams();
  const toast = useApp((s) => s.toast);
  const gh = useGitHub(p);
  const files = useMemo(() => generateFiles(p), [p]);
  const paths = useMemo(() => sortedPaths(files), [files]);
  const [file, setFile] = useState<string>(() => {
    const f = search.get('file');
    return f && files[f] !== undefined ? f : 'claims_agents/risk_rules.py';
  });
  const [changeId, setChangeId] = useState<string | null>(null);
  const [runOpen, setRunOpen] = useState(false);
  const [zipping, setZipping] = useState(false);

  useEffect(() => {
    if (p.build.status !== 'done') router.replace(`/p/${p.id}`);
  }, [p.build.status, p.id, router]);
  useEffect(() => {
    const f = search.get('file');
    if (f && files[f] !== undefined) setFile(f);
  }, [search, files]);

  const change = p.changes.find((c) => c.id === changeId);
  const showDiff = !!change && change.diffFile === file && change.beforeText !== undefined;
  const current = files[file] !== undefined ? file : paths[0];
  const text = files[current] ?? '';
  const root = p.repo.split('/')[1] ?? 'app';

  const download = async () => {
    setZipping(true);
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      for (const [path, body] of Object.entries(files)) zip.file(`${root}/${path}`, body);
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${root}-v${p.version}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast(`Downloaded ${Object.keys(files).length} files.`, 'ok');
    } finally {
      setZipping(false);
    }
  };

  const clone = `git clone https://github.com/${p.github?.repo ?? p.repo}.git`;
  const steps: [string, string][] = [
    [clone, 'or unzip the download'],
    [`cd ${root}`, ''],
    ['pip install -r claims_agents/requirements.txt', ''],
    ['pytest tests/ -q', `runs the Answer Key: ${p.answerKey.length} examples`],
    ['uvicorn claims_agents.api:app --reload', 'the API on localhost:8000'],
  ];

  return (
    <Workspace
      p={p}
      now={now}
      tab="code"
      right={
        <>
          <Button size="sm" variant="ghost" icon={<Terminal className="h-3.5 w-3.5" />} onClick={() => setRunOpen(true)}>
            <span className="hidden xl:inline">Run it yourself</span>
          </Button>
          <Button size="sm" variant="ghost" loading={zipping} icon={<Download className="h-3.5 w-3.5" />} onClick={download}>
            <span className="hidden xl:inline">Download</span>
          </Button>
          {gh.real ? (
            p.github ? (
              <Button size="sm" href={p.github.url} target="_blank" icon={<ExternalLink className="h-3.5 w-3.5" />}>
                On GitHub
              </Button>
            ) : (
              <Button size="sm" variant="primary" loading={gh.busy === 'push'} onClick={gh.push} icon={<Upload className="h-3.5 w-3.5" />}>
                {gh.canPush ? 'Save to GitHub' : 'Connect GitHub'}
              </Button>
            )
          ) : (
            <span className="hidden items-center gap-1.5 rounded-lg border border-ok-line bg-ok-soft px-2.5 py-1 text-[12.5px] font-medium text-ok md:inline-flex" title="In demo mode the repo is simulated">
              <GitBranch className="h-3.5 w-3.5" /> {p.repo}
            </span>
          )}
        </>
      }
    >
      <div className="absolute inset-0 flex">
        <nav aria-label="Files" className="scroll-thin hidden w-[260px] shrink-0 overflow-y-auto border-r border-line py-3 md:block" data-tour="code-files">
          {paths.map((path) => {
            const on = path === current;
            const edited = change?.files.some((f) => f.path === path);
            return (
              <button
                key={path}
                type="button"
                onClick={() => setFile(path)}
                aria-current={on ? 'true' : undefined}
                className={cn(
                  'flex w-full items-center gap-2 truncate px-4 py-1.5 text-left font-mono text-[12.5px] transition-colors',
                  on ? 'bg-surface2 text-ink' : 'text-ink3 hover:bg-surface hover:text-ink',
                )}
              >
                <span className="truncate">{path}</span>
                {edited && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-warn" aria-label="changed" />}
              </button>
            );
          })}
        </nav>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-11 shrink-0 items-center gap-2 border-b border-line px-4">
            <select
              aria-label="File"
              value={current}
              onChange={(e) => setFile(e.target.value)}
              className="max-w-[60%] truncate rounded-md border border-line bg-surface px-2 py-1 font-mono text-[12.5px] md:hidden"
            >
              {paths.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            <span className="hidden truncate font-mono text-[12.5px] text-ink2 md:inline">{current}</span>
            <div className="flex-1" />
            {p.changes.length > 0 && (
              <Menu
                align="end"
                width={300}
                label="Branch"
                items={[
                  { id: 'main', label: 'main', sub: 'The code as it is now', checked: !change, onSelect: () => setChangeId(null) },
                  ...p.changes.map((c) => ({
                    id: c.id,
                    label: branchFor(c.title),
                    sub: `${c.title}${c.undone ? ' (undone)' : c.merged ? ' (merged)' : ''}`,
                    checked: c.id === changeId,
                    onSelect: () => {
                      setChangeId(c.id);
                      if (c.diffFile) setFile(c.diffFile);
                    },
                  })),
                ]}
                trigger={({ open, toggle }) => (
                  <button
                    type="button"
                    onClick={toggle}
                    aria-expanded={open}
                    className="press inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface2 px-2.5 font-mono text-[12px] text-ink2 hover:text-ink"
                  >
                    <GitBranch className="h-3.5 w-3.5" />
                    <span className="max-w-[160px] truncate">{change ? branchFor(change.title) : 'main'}</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                )}
              />
            )}
            <CopyButton text={showDiff ? change!.afterText ?? '' : text} />
          </div>
          {showDiff ? (
            <DiffBlock before={change!.beforeText ?? ''} after={change!.afterText ?? ''} lang={languageOf(current)} className="min-h-0 flex-1 py-2" />
          ) : (
            <CodeBlock key={current} text={text} lang={languageOf(current)} className="min-h-0 flex-1 py-2 animate-fade-in" />
          )}
        </div>
      </div>

      <Modal open={runOpen} onClose={() => setRunOpen(false)} title="Run it on your computer" description="The code is yours. These five commands run the app and its tests." width={620}>
        <ol className="flex flex-col gap-2">
          {steps.map(([cmd, note]) => (
            <li key={cmd} className="flex items-center gap-2 rounded-xl border border-code-line bg-code py-1.5 pl-3.5 pr-1.5">
              <code className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-code-ink">{cmd}</code>
              {note && <span className="hidden shrink-0 text-[12px] text-code-dim sm:inline">{note}</span>}
              <CopyButton text={cmd} compact />
            </li>
          ))}
        </ol>
      </Modal>
    </Workspace>
  );
}
