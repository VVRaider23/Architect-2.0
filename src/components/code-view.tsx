'use client';

import { Fragment, type ReactNode } from 'react';
import { hunks, lineDiff } from '@/lib/diff';
import { cn } from '@/lib/utils';

const PY_KW =
  'def|return|if|elif|else|not|in|and|or|import|from|class|for|while|with|as|True|False|None|async|await|lambda|pass|raise|try|except|is';
const TS_KW =
  'import|from|export|default|const|let|var|function|return|async|await|type|interface|if|else|new|true|false|null|undefined|for|of|in';

const RE: Record<string, RegExp> = {
  python: new RegExp(
    `(#.*$)|("""[\\s\\S]*?"""|f?"(?:[^"\\\\]|\\\\.)*"|f?'(?:[^'\\\\]|\\\\.)*')|(\\b\\d[\\d_.]*\\b)|(\\b(?:${PY_KW})\\b)|(\\b[A-Za-z_]\\w*(?=\\())`,
    'g',
  ),
  ts: new RegExp(
    `(\\/\\/.*$)|(\`(?:[^\`\\\\]|\\\\.)*\`|"(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*')|(\\b\\d[\\d_.]*\\b)|(\\b(?:${TS_KW})\\b)|(\\b[A-Za-z_]\\w*(?=\\())`,
    'g',
  ),
  yaml: /(#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b\d[\d_.]*\b)|(^\s*-?\s*[\w./-]+(?=:))/g,
  json: /()("(?:[^"\\]|\\.)*"(?=\s*:))|("(?:[^"\\]|\\.)*")|(\b(?:true|false|null)\b|\b\d[\d.]*\b)/g,
};

const CLS = {
  comment: 'text-[#8A857C] italic',
  string: 'text-[#A8D5A2]',
  number: 'text-[#E6B673]',
  keyword: 'text-[#8FA6F0]',
  fn: 'text-[#E9C98B]',
  key: 'text-[#E6B673]',
};

export function highlight(line: string, lang: string): ReactNode {
  const re = RE[lang];
  if (!re || !line) return line || ' ';
  const out: ReactNode[] = [];
  let last = 0;
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(line))) {
    if (m[0] === '') {
      re.lastIndex++;
      continue;
    }
    if (m.index > last) out.push(line.slice(last, m.index));
    let cls = '';
    if (lang === 'json') cls = m[2] ? CLS.key : m[3] ? CLS.string : CLS.number;
    else if (lang === 'yaml') cls = m[1] ? CLS.comment : m[2] ? CLS.string : m[3] ? CLS.number : CLS.key;
    else cls = m[1] ? CLS.comment : m[2] ? CLS.string : m[3] ? CLS.number : m[4] ? CLS.keyword : CLS.fn;
    out.push(
      <span key={k++} className={cls}>
        {m[0]}
      </span>,
    );
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

export function CodeBlock({ text, lang, className }: { text: string; lang: string; className?: string }) {
  const lines = text.split('\n');
  return (
    <div className={cn('code-scroll overflow-auto bg-code font-mono text-[12.5px] leading-[1.65] text-code-ink', className)}>
      <table className="w-full border-collapse">
        <tbody>
          {lines.map((l, i) => (
            <tr key={i}>
              <td className="w-[1%] select-none whitespace-nowrap px-3 text-right align-top text-[#5E5A53]">{i + 1}</td>
              <td className="whitespace-pre pr-6">{highlight(l, lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DiffBlock({ before, after, lang, className }: { before: string; after: string; lang: string; className?: string }) {
  const d = hunks(lineDiff(before, after), 3);
  return (
    <div className={cn('code-scroll overflow-auto bg-code font-mono text-[12.5px] leading-[1.65] text-code-ink', className)}>
      <table className="w-full border-collapse">
        <tbody>
          {d.map((l, i) =>
            l.type === 'gap' ? (
              <tr key={i}>
                <td colSpan={4} className="bg-[#23221F] px-3 py-0.5 text-[11px] text-[#7E7A72]">
                  ⋯
                </td>
              </tr>
            ) : (
              <Fragment key={i}>
                <tr className={cn(l.type === 'add' && 'bg-code-add', l.type === 'del' && 'bg-code-del')}>
                  <td className="w-[1%] select-none whitespace-nowrap px-2 text-right align-top text-[#5E5A53]">{l.a ?? ''}</td>
                  <td className="w-[1%] select-none whitespace-nowrap px-2 text-right align-top text-[#5E5A53]">{l.b ?? ''}</td>
                  <td className={cn('w-[1%] select-none px-1 align-top', l.type === 'add' ? 'text-[#7FD49A]' : l.type === 'del' ? 'text-[#F2A197]' : 'text-transparent')}>
                    {l.type === 'add' ? '+' : l.type === 'del' ? '−' : ' '}
                  </td>
                  <td className="whitespace-pre pr-6">{highlight(l.text, lang)}</td>
                </tr>
              </Fragment>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}
