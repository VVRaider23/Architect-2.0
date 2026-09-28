export type DiffLine = { type: 'same' | 'add' | 'del'; text: string; a?: number; b?: number };

/** Small LCS line diff. Files here are short, so O(n*m) is fine. */
export function lineDiff(before: string, after: string): DiffLine[] {
  const a = before === '' ? [] : before.split('\n');
  const b = after === '' ? [] : after.split('\n');
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ type: 'same', text: a[i], a: i + 1, b: j + 1 });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: 'del', text: a[i], a: i + 1 });
      i++;
    } else {
      out.push({ type: 'add', text: b[j], b: j + 1 });
      j++;
    }
  }
  while (i < n) out.push({ type: 'del', text: a[i], a: ++i });
  while (j < m) out.push({ type: 'add', text: b[j], b: ++j });
  return out;
}

export function countDelta(before: string | undefined, after: string | undefined) {
  if (before === after) return { add: 0, del: 0 };
  const d = lineDiff(before ?? '', after ?? '');
  return {
    add: d.filter((x) => x.type === 'add').length,
    del: d.filter((x) => x.type === 'del').length,
  };
}

/** Keep changed lines plus `ctx` lines of context around them. */
export function hunks(d: DiffLine[], ctx = 3): (DiffLine | { type: 'gap' })[] {
  const keep = new Array(d.length).fill(false);
  d.forEach((l, idx) => {
    if (l.type !== 'same') {
      for (let k = Math.max(0, idx - ctx); k <= Math.min(d.length - 1, idx + ctx); k++) keep[k] = true;
    }
  });
  const out: (DiffLine | { type: 'gap' })[] = [];
  let gap = false;
  d.forEach((l, idx) => {
    if (keep[idx]) {
      out.push(l);
      gap = false;
    } else if (!gap) {
      out.push({ type: 'gap' });
      gap = true;
    }
  });
  return out;
}
