import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Reads a public GitHub repo and reports what Architect would work with: the agent framework,
 * agent files, tools and data, screens, secret keys and tests. Uses the GitHub API when it can
 * (set GITHUB_TOKEN for higher limits) and falls back to raw file reads when the API is rate-limited.
 */

const API = process.env.GITHUB_API_URL ?? 'https://api.github.com';
const RAW = process.env.GITHUB_RAW_URL ?? 'https://raw.githubusercontent.com';

type Supported = 'lyzr' | 'langgraph' | 'crewai' | 'openai-agents' | 'google-adk';

interface Found {
  id: string;
  label: string;
  evidence: string;
  supported?: Supported;
}

export interface RepoAnalysis {
  repo: string;
  url: string;
  description: string | null;
  defaultBranch: string;
  stars: number | null;
  pushedAt: string | null;
  languages: string[];
  frameworks: Found[];
  primary: Supported | null;
  agents: string[];
  tools: string[];
  screens: { found: boolean; label: string };
  secrets: string[];
  tests: { found: boolean; count: number };
  fileCount: number | null;
  partial: boolean;
  notes: string[];
}

const FRAMEWORK_RULES: { id: string; label: string; supported?: Supported; py?: RegExp; js?: RegExp; readme?: RegExp }[] = [
  { id: 'langgraph', label: 'LangGraph', supported: 'langgraph', py: /(^|[\s"'\[,])langgraph\b/im, js: /"@langchain\/langgraph"/, readme: /\blanggraph\b/i },
  { id: 'crewai', label: 'CrewAI', supported: 'crewai', py: /(^|[\s"'\[,])crewai\b/im, readme: /\bcrew\s?ai\b/i },
  { id: 'openai-agents', label: 'OpenAI Agents SDK', supported: 'openai-agents', py: /(^|[\s"'\[,])openai-agents\b/im, js: /"@openai\/agents"/, readme: /openai agents sdk/i },
  { id: 'google-adk', label: 'Google ADK', supported: 'google-adk', py: /(^|[\s"'\[,])google-adk\b/im, readme: /\b(google adk|agent development kit)\b/i },
  { id: 'lyzr', label: 'Lyzr', supported: 'lyzr', py: /(^|[\s"'\[,])lyzr[\w-]*\b/im, readme: /\blyzr\b/i },
  { id: 'autogen', label: 'AutoGen', py: /(^|[\s"'\[,])(pyautogen|autogen-agentchat|ag2)\b/im, readme: /\bautogen\b/i },
  { id: 'langchain', label: 'LangChain', py: /(^|[\s"'\[,])langchain(-core|-openai|-anthropic)?\b/im, js: /"(langchain|@langchain\/core)"/ },
  { id: 'llamaindex', label: 'LlamaIndex', py: /(^|[\s"'\[,])llama-index\b/im, js: /"llamaindex"/ },
  { id: 'pydantic-ai', label: 'Pydantic AI', py: /(^|[\s"'\[,])pydantic-ai\b/im },
  { id: 'smolagents', label: 'smolagents', py: /(^|[\s"'\[,])smolagents\b/im },
  { id: 'agno', label: 'Agno', py: /(^|[\s"'\[,])agno\b/im },
  { id: 'semantic-kernel', label: 'Semantic Kernel', py: /(^|[\s"'\[,])semantic-kernel\b/im },
  { id: 'mastra', label: 'Mastra', js: /"@mastra\/core"/ },
  { id: 'ai-sdk', label: 'Vercel AI SDK', js: /"ai"\s*:/ },
];

const TOOL_RULES: [RegExp, string][] = [
  [/\b(psycopg2?|asyncpg|sqlalchemy|"pg")\b/i, 'Postgres'],
  [/\b(google-api-python-client|googleapis|gmail)\b/i, 'Google APIs (Gmail, Drive)'],
  [/\b(slack[_-]sdk|@slack\/web-api|slack-bolt)\b/i, 'Slack'],
  [/\b(anthropic|@anthropic-ai\/sdk|langchain-anthropic)\b/i, 'Anthropic (Claude)'],
  [/(^|[\s"'\[,])(openai|@ai-sdk\/openai|langchain-openai)\b/im, 'OpenAI'],
  [/\b(google-genai|google-generativeai|vertexai|@google\/genai)\b/i, 'Google Gemini'],
  [/\b(pinecone|chromadb|qdrant|weaviate|pgvector|faiss)/i, 'Vector database'],
  [/\b(tavily|serpapi|duckduckgo)/i, 'Web search'],
  [/\bboto3\b/i, 'AWS'],
  [/\bredis\b/i, 'Redis'],
  [/\bsupabase\b/i, 'Supabase'],
  [/\b(fastapi|flask|django)\b/i, 'Python web server'],
];

const SCREEN_RULES: [RegExp, string][] = [
  [/"next"\s*:/, 'Next.js'],
  [/"react"\s*:/, 'React'],
  [/"vue"\s*:/, 'Vue'],
  [/"svelte"\s*:/, 'Svelte'],
  [/\bstreamlit\b/i, 'Streamlit'],
  [/\bgradio\b/i, 'Gradio'],
  [/\bchainlit\b/i, 'Chainlit'],
];

function parseRepo(input: string): { owner: string; repo: string } | null {
  const s = input.trim().replace(/^git@github\.com:/, 'github.com/').replace(/\.git$/, '');
  const m = s.match(/^(?:https?:\/\/)?(?:www\.)?(?:github\.com\/)?([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\/.*)?$/);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
}

async function get(url: string, headers: Record<string, string> = {}, ms = 8000): Promise<Response | null> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { headers, signal: ctl.signal, cache: 'no-store' });
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function rawText(owner: string, repo: string, ref: string, path: string): Promise<string | null> {
  const res = await get(`${RAW}/${owner}/${repo}/${ref}/${path.split('/').map(encodeURIComponent).join('/')}`);
  if (!res || !res.ok) return null;
  const text = await res.text();
  return text.slice(0, 200_000);
}

export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get('repo') ?? '';
  const parsed = parseRepo(input);
  if (!parsed) return NextResponse.json({ error: 'Paste a GitHub repo like owner/name or https://github.com/owner/name.' }, { status: 400 });
  const { owner, repo } = parsed;
  const notes: string[] = [];
  const apiHeaders: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'architect-2-prototype',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (process.env.GITHUB_TOKEN) apiHeaders.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  // 1. Repo details and the full file list, from the API when it answers.
  let description: string | null = null;
  let defaultBranch = 'HEAD';
  let stars: number | null = null;
  let pushedAt: string | null = null;
  let fullName = `${owner}/${repo}`;
  let paths: string[] | null = null;
  let languages: string[] = [];
  let partial = false;

  const meta = await get(`${API}/repos/${owner}/${repo}`, apiHeaders);
  if (meta && meta.status === 404) {
    return NextResponse.json({ error: `Couldn’t find ${owner}/${repo}. Check the name, and note that only public repos can be read without connecting GitHub.` }, { status: 404 });
  }
  if (meta && meta.ok) {
    const m = (await meta.json()) as { full_name: string; description: string | null; default_branch: string; stargazers_count: number; pushed_at: string };
    fullName = m.full_name;
    description = m.description;
    defaultBranch = m.default_branch || 'HEAD';
    stars = m.stargazers_count;
    pushedAt = m.pushed_at;
    const [tree, langs] = await Promise.all([
      get(`${API}/repos/${owner}/${repo}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`, apiHeaders),
      get(`${API}/repos/${owner}/${repo}/languages`, apiHeaders),
    ]);
    if (tree && tree.ok) {
      const t = (await tree.json()) as { tree: { path: string; type: string }[]; truncated: boolean };
      paths = t.tree.filter((x) => x.type === 'blob').map((x) => x.path);
      if (t.truncated) notes.push('This repo is very large, so only part of the file list was read.');
    }
    if (langs && langs.ok) {
      const l = (await langs.json()) as Record<string, number>;
      languages = Object.entries(l)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([k]) => k);
    }
  } else {
    partial = true;
    notes.push('GitHub’s API didn’t answer (usually its hourly limit), so Architect read the main files directly. Add GITHUB_TOKEN for the full file list.');
  }

  // 2. Dependency files, README and env example.
  const skip = /(^|\/)(node_modules|\.venv|venv|dist|build|site-packages|\.next)\//;
  const depNames = ['requirements.txt', 'pyproject.toml', 'package.json', 'setup.py', 'Pipfile', 'environment.yml'];
  let depPaths: string[];
  if (paths) {
    depPaths = paths
      .filter((p) => !skip.test(p) && depNames.includes(p.split('/').pop() ?? ''))
      .sort((a, b) => a.split('/').length - b.split('/').length)
      .slice(0, 8);
  } else {
    depPaths = depNames;
  }
  const ref = paths ? defaultBranch : 'HEAD';
  const envPath = paths ? paths.find((p) => /(^|\/)\.env\.(example|sample|template)$/.test(p) && !skip.test(p)) : '.env.example';
  const [depTexts, readme, envText] = await Promise.all([
    Promise.all(depPaths.map(async (p) => ({ path: p, text: await rawText(owner, repo, ref, p) }))),
    rawText(owner, repo, ref, paths?.find((p) => /^readme\.md$/i.test(p)) ?? 'README.md'),
    envPath ? rawText(owner, repo, ref, envPath) : Promise.resolve(null),
  ]);
  const deps = depTexts.filter((d) => d.text !== null) as { path: string; text: string }[];

  if (!paths && !deps.length && !readme) {
    return NextResponse.json(
      { error: `Couldn’t read ${owner}/${repo}. It may be private, renamed, or GitHub may be unreachable right now.` },
      { status: 404 },
    );
  }

  // 3. Frameworks.
  const frameworks: Found[] = [];
  for (const rule of FRAMEWORK_RULES) {
    const hit = deps.find((d) => (d.path.endsWith('package.json') ? rule.js?.test(d.text) : rule.py?.test(d.text)));
    if (hit) frameworks.push({ id: rule.id, label: rule.label, supported: rule.supported, evidence: `found in ${hit.path}` });
  }
  if (!frameworks.some((f) => f.supported) && readme) {
    for (const rule of FRAMEWORK_RULES) {
      if (rule.supported && rule.readme?.test(readme) && !frameworks.some((f) => f.id === rule.id))
        frameworks.push({ id: rule.id, label: rule.label, supported: rule.supported, evidence: 'mentioned in the README' });
    }
  }
  const primary = frameworks.find((f) => f.supported)?.supported ?? null;

  // 4. Agent files, tools, screens, secrets, tests.
  const code = (paths ?? []).filter((p) => !skip.test(p) && /\.(py|ts|tsx|js)$/.test(p));
  const agents = code
    .filter((p) => /(agent|crew|graph|workflow|tool|node|task)s?[^/]*\.(py|ts|js)$/i.test(p.split('/').pop() ?? '') && !/(^|\/)(tests?|__tests__|examples?\/.*\/tests?)\//i.test(p) && !/test/i.test(p.split('/').pop() ?? ''))
    .slice(0, 12);
  const allDeps = deps.map((d) => d.text).join('\n');
  const tools = Array.from(new Set(TOOL_RULES.filter(([re]) => re.test(allDeps)).map(([, label]) => label)));
  const screenHit = SCREEN_RULES.find(([re]) => re.test(allDeps));
  const hasPages = (paths ?? []).some((p) => /(^|\/)(app|pages|src\/app|src\/pages)\/.*\.(tsx|jsx)$/.test(p));
  const screens = screenHit ? { found: true, label: screenHit[1] } : hasPages ? { found: true, label: 'Web pages' } : { found: false, label: 'None found' };
  const secrets = envText
    ? Array.from(new Set(envText.split('\n').map((l) => l.match(/^\s*([A-Z][A-Z0-9_]{2,})\s*=/)?.[1]).filter(Boolean) as string[])).slice(0, 10)
    : [];
  const testFiles = (paths ?? []).filter((p) => !skip.test(p) && /(^|\/)(test_[^/]+\.py|[^/]+_test\.py|[^/]+\.(test|spec)\.(ts|tsx|js))$/.test(p));
  const hasTestsDir = (paths ?? []).some((p) => /(^|\/)tests?\//.test(p) && !skip.test(p));

  if (!languages.length) {
    const exts = new Set(deps.map((d) => (d.path.endsWith('package.json') ? 'TypeScript/JavaScript' : 'Python')));
    languages = Array.from(exts);
  }
  if (!frameworks.length) notes.push('No agent framework found. Architect can add one, or wrap your existing code as agents.');

  const out: RepoAnalysis = {
    repo: fullName,
    url: `https://github.com/${fullName}`,
    description,
    defaultBranch: paths ? defaultBranch : 'main',
    stars,
    pushedAt,
    languages,
    frameworks,
    primary,
    agents,
    tools,
    screens,
    secrets,
    tests: { found: testFiles.length > 0 || hasTestsDir, count: testFiles.length },
    fileCount: paths ? paths.length : null,
    partial,
    notes,
  };
  return NextResponse.json(out, { headers: { 'Cache-Control': 'no-store' } });
}
