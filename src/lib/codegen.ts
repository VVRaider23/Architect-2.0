/**
 * The code Architect "generates" for a project. It is deterministic: the same project state
 * always produces the same files, so the Code tab, the change receipts (diffs) and the
 * downloadable zip all agree. `claims_agents/risk_rules.py` mirrors src/lib/engine.ts.
 */
import type { FrameworkId, Project } from './types';
import { frameworkLabel } from './seed';

export type Files = Record<string, string>;

function riskRules(version: number): string {
  const lines = [
    '"""Harborline\'s risk rules.',
    '',
    'Plain Python on purpose: the Answer Key tests in tests/ run these rules in CI',
    'on every pull request, whatever agent framework the app uses.',
    '"""',
    '',
    '',
    'def verdict(risk: str, action: str, reason: str) -> dict:',
    '    return {"risk": risk, "action": action, "reasons": [reason]}',
    '',
    '',
    'def score(claim: dict, policy: dict) -> dict:',
    '    """Apply Harborline\'s risk rules and say why."""',
    '    if policy["age_days"] < 60:',
    '        return verdict("high", "senior_handler", "Policy is less than 60 days old")',
    '    if claim["kind"] == "water_damage" and claim["amount"] > 10_000:',
    '        return verdict("high", "senior_handler", "Water damage over $10,000")',
  ];
  if (version >= 2) {
    lines.push(
      '    if claim["kind"] == "theft":',
      '        if not claim.get("police_report"):',
      '            return verdict("blocked", "ask_police_report",',
      '                           "Theft claims need a police report (policy clause 4.2)")',
      '        return verdict("medium", "normal_review", "Theft with a police report: normal review")',
    );
  }
  if (version >= 3) {
    lines.push(
      '    if claim["kind"] == "water_damage" and claim["amount"] > 5_000:',
      '        return verdict("medium", "request_photos", "Water damage over $5,000: ask for photos")',
    );
  }
  lines.push(
    '    if claim["kind"] in ("roof", "fire", "flood", "hail") and claim["amount"] > 5_000:',
    '        return verdict("medium", "request_photos",',
    '                       f"{claim[\'kind\'].title()} over $5,000: ask for photos")',
    '    return verdict("low", "fast_track", "Small claim with no risk signals")',
    '',
  );
  return lines.join('\n');
}

const SCORE_TOOL = `def score_claim(kind: str, amount: float, policy_age_days: int, police_report: bool = False) -> dict:
    """Apply Harborline's risk rules to one claim."""
    return score({"kind": kind, "amount": amount, "police_report": police_report},
                 {"age_days": policy_age_days})`;

function frameworkFile(fw: FrameworkId, slack: boolean): [string, string] {
  const alertImport = slack ? '\nfrom claims_agents.alerts import alert_if_high_risk' : '';
  switch (fw) {
    case 'langgraph':
      return [
        'claims_agents/graph.py',
        `"""Claims triage as a LangGraph graph: one node per agent.

The Triage lead is the graph itself: it routes every claim through the nodes in order.
"""
from typing import TypedDict

from langgraph.graph import END, StateGraph

from claims_agents.nodes import intake_reader, policy_checker, reply_drafter
from claims_agents.risk_rules import score${alertImport}


class ClaimState(TypedDict, total=False):
    email: str
    claim: dict
    policy: dict
    verdict: dict
    draft: str


def risk_scorer(state: ClaimState) -> ClaimState:
    result = score(state["claim"], state["policy"])${slack ? '\n    alert_if_high_risk(state["claim"], result)' : ''}
    return {"verdict": result}


def build_graph():
    graph = StateGraph(ClaimState)
    graph.add_node("intake_reader", intake_reader)
    graph.add_node("policy_checker", policy_checker)
    graph.add_node("risk_scorer", risk_scorer)
    graph.add_node("reply_drafter", reply_drafter)
    graph.set_entry_point("intake_reader")
    graph.add_edge("intake_reader", "policy_checker")
    graph.add_edge("policy_checker", "risk_scorer")
    graph.add_edge("risk_scorer", "reply_drafter")
    graph.add_edge("reply_drafter", END)
    return graph.compile()


triage = build_graph()
`,
      ];
    case 'crewai':
      return [
        'claims_agents/crew.py',
        `"""Claims triage as a CrewAI crew: one agent per role, run in order."""
from crewai import Agent, Crew, Process, Task
from crewai.tools import tool

from claims_agents.risk_rules import score${alertImport}


@tool("Score claim risk")
${SCORE_TOOL}


intake_reader = Agent(role="Intake reader", goal="Pull the facts out of the claim email and attachments",
                      backstory="A careful claims clerk.", allow_delegation=False)
policy_checker = Agent(role="Policy checker", goal="Find the policy clause that applies",
                       backstory="Knows every Harborline policy.", allow_delegation=False)
risk_scorer = Agent(role="Risk scorer", goal="Apply Harborline's risk rules and explain the score",
                    backstory="Follows the rules, explains every score.", tools=[score_claim])
reply_drafter = Agent(role="Reply drafter", goal="Draft a reply for a handler. Never promise a payout.",
                      backstory="Friendly and precise.", allow_delegation=False)

tasks = [
    Task(description="Read this claim: {email}", expected_output="Claim facts as JSON", agent=intake_reader),
    Task(description="Find the policy clause for the claim", expected_output="Policy and clause", agent=policy_checker),
    Task(description="Score the claim with the risk rules", expected_output="Risk, action and reason", agent=risk_scorer),
    Task(description="Draft the reply", expected_output="A short reply draft", agent=reply_drafter),
]

triage = Crew(agents=[intake_reader, policy_checker, risk_scorer, reply_drafter], tasks=tasks,
              process=Process.sequential)
`,
      ];
    case 'openai-agents':
      return [
        'claims_agents/team.py',
        `"""Claims triage with the OpenAI Agents SDK: a lead agent hands off to specialists."""
from agents import Agent, Runner, function_tool

from claims_agents.risk_rules import score${alertImport}


@function_tool
${SCORE_TOOL}


intake_reader = Agent(name="Intake reader", instructions="Pull the facts out of the claim email and attachments.")
policy_checker = Agent(name="Policy checker", instructions="Find the policy clause that applies.")
risk_scorer = Agent(name="Risk scorer", instructions="Score the claim with score_claim and explain it.",
                    tools=[score_claim])
reply_drafter = Agent(name="Reply drafter", instructions="Draft a reply for a handler. Never promise a payout.")

triage_lead = Agent(
    name="Triage lead",
    instructions="Route each claim: intake, then policy, then risk, then the reply.",
    handoffs=[intake_reader, policy_checker, risk_scorer, reply_drafter],
)


def triage(email: str):
    return Runner.run_sync(triage_lead, email)
`,
      ];
    case 'google-adk':
      return [
        'claims_agents/agent.py',
        `"""Claims triage with Google's Agent Development Kit: a sequential agent with sub-agents."""
from google.adk.agents import Agent, SequentialAgent

from claims_agents.risk_rules import score${alertImport}


${SCORE_TOOL}


MODEL = "gemini-2.5-flash"

intake_reader = Agent(name="intake_reader", model=MODEL, instruction="Pull the facts out of the claim email.")
policy_checker = Agent(name="policy_checker", model=MODEL, instruction="Find the policy clause that applies.")
risk_scorer = Agent(name="risk_scorer", model=MODEL, instruction="Score the claim with score_claim and explain it.",
                    tools=[score_claim])
reply_drafter = Agent(name="reply_drafter", model=MODEL, instruction="Draft a reply. Never promise a payout.")

root_agent = SequentialAgent(name="triage_lead",
                             sub_agents=[intake_reader, policy_checker, risk_scorer, reply_drafter])
`,
      ];
    case 'lyzr':
    default:
      return [
        'claims_agents/tools.py',
        `"""Harborline's risk rules as a custom tool for agents running on Lyzr.

The agents themselves are defined in agent.yaml and run on Lyzr's managed runtime.
Register this endpoint as a custom tool for the Risk scorer.
"""
from fastapi import FastAPI
from pydantic import BaseModel

from claims_agents.risk_rules import score${alertImport}

app = FastAPI(title="Harborline risk rules")


class Claim(BaseModel):
    kind: str
    amount: float
    policy_age_days: int
    police_report: bool = False


@app.post("/score")
def score_claim(claim: Claim) -> dict:
    return score(claim.model_dump(), {"age_days": claim.policy_age_days})
`,
      ];
  }
}

const API_REQS = 'fastapi>=0.110\nuvicorn>=0.30\npydantic>=2\n';
const REQS: Record<FrameworkId, string> = {
  langgraph: 'langgraph>=0.2\nanthropic>=0.40\n' + API_REQS + 'pytest>=8\n',
  crewai: 'crewai>=0.80\n' + API_REQS + 'pytest>=8\n',
  'openai-agents': 'openai-agents>=0.1\n' + API_REQS + 'pytest>=8\n',
  'google-adk': 'google-adk>=1.0\n' + API_REQS + 'pytest>=8\n',
  lyzr: API_REQS + 'pytest>=8\n',
};

const NODES = `"""The LLM-backed agents. Model names and prompts come from agent.yaml."""
import json
import os

from anthropic import Anthropic

from claims_agents.privacy import mask_personal_data

client = Anthropic()  # reads ANTHROPIC_API_KEY
MODEL = os.getenv("CLAIMS_MODEL", "claude-haiku-4-5")


def ask_json(system: str, text: str) -> dict:
    msg = client.messages.create(model=MODEL, max_tokens=500, system=system,
                                 messages=[{"role": "user", "content": text}])
    return json.loads(msg.content[0].text)


def intake_reader(state):
    """Reads the email and attachments and pulls out the facts."""
    facts = ask_json("Return JSON with kind, amount and police_report (true/false).",
                     mask_personal_data(state["email"]))
    return {"claim": facts}


def policy_checker(state):
    """Finds the policy and the clause that applies."""
    return {"policy": {"age_days": state["claim"].get("policy_age_days", 365)}}


def reply_drafter(state):
    """Drafts the reply for a handler to send. Never sends it, never promises a payout."""
    decision = state["verdict"]
    reply = ask_json("Draft a short, friendly reply as JSON {\\"draft\\": ...}. Never promise a payout.",
                     json.dumps(decision))
    return {"draft": reply["draft"]}
`;

const PRIVACY = `"""Masks personal data before any text reaches a model (launch rule: personal data masked)."""
import re

EMAIL = re.compile(r"[\\w.+-]+@[\\w-]+\\.[\\w.]+")
PHONE = re.compile(r"\\+?\\d[\\d\\s-]{7,}\\d")


def mask_personal_data(text: str) -> str:
    return PHONE.sub("[phone]", EMAIL.sub("[email]", text))
`;

const ALERTS = `"""Posts high-risk claims to the claims team's Slack channel."""
import os

import requests

WEBHOOK = os.getenv("SLACK_WEBHOOK_URL", "")


def alert_if_high_risk(claim: dict, verdict: dict) -> None:
    if WEBHOOK and verdict["risk"] in ("high", "blocked"):
        requests.post(WEBHOOK, json={"text": f"{verdict['risk'].title()} claim: {verdict['reasons'][0]}"}, timeout=5)
`;

function answerKeyJson(p: Project): string {
  const items = p.answerKey.map((i) => ({
    id: i.claim.id,
    claim: {
      title: i.claim.title,
      kind: i.claim.kind,
      amount: i.claim.amount,
      policy_age_days: i.claim.policyAgeDays,
      police_report: !!i.claim.policeReport,
    },
    expected: i.expected,
    expected_text: i.expectedText,
    high_risk: i.highRisk,
    added_by: i.author,
  }));
  return JSON.stringify(items, null, 2) + '\n';
}

const TEST_FILE = `import json
import pathlib

import pytest

from claims_agents.risk_rules import score

KEY = json.loads((pathlib.Path(__file__).parent / "answer_key.json").read_text())


@pytest.mark.parametrize("example", KEY, ids=[e["id"] for e in KEY])
def test_answer_key(example):
    claim = example["claim"]
    result = score(claim, {"age_days": claim["policy_age_days"]})
    assert (result["risk"], result["action"]) == (
        example["expected"]["risk"],
        example["expected"]["action"],
    ), example["expected_text"]
`;

const WORKFLOW = `name: Proof (Answer Key)
on: [push, pull_request]

jobs:
  answer-key:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install pytest
      - run: pytest tests/ -q
`;

function agentYaml(p: Project): string {
  const on = (id: string) => p.agents.some((a) => a.guardrails.some((g) => g.id === id && g.on));
  const g = (ids: [string, string][]) =>
    ids.filter(([id]) => on(id)).map(([, label]) => label);
  const list = (xs: string[]) => `[${xs.join(', ')}]`;
  const model = (id: string) => (p.agents.find((a) => a.id === id)?.model ?? 'Claude Sonnet').toLowerCase().replace(/\s+/g, '-');
  return `# Framework-neutral agent definition, in the spirit of Lyzr's open agent format (OpenGAP).
# Architect generates the ${frameworkLabel(p.framework)} code in claims_agents/ from this file.
app: ${p.repo.split('/')[1]}
framework: ${p.framework}
agents:
  - id: triage_lead
    role: manager
    job: Routes each claim through the team and keeps the record
    hands_off_to: [intake_reader, policy_checker, risk_scorer, reply_drafter]
  - id: intake_reader
    job: Reads the email and attachments and pulls out the facts
    model: ${model('intake_reader')}
    tools: [gmail.read]
    guardrails: ${list(g([['mask_pii', 'mask_personal_data']]))}
  - id: policy_checker
    job: Finds the policy and the clause that applies
    model: ${model('policy_checker')}
    tools: [claims_db.read]
    knowledge: [policy_pdfs]
  - id: risk_scorer
    job: Applies Harborline's risk rules and explains the score
    model: ${model('risk_scorer')}
    tools: [claims_db.read, score_claim]
    guardrails: ${list(g([['escalate', 'escalate_when_unsure']]))}
  - id: reply_drafter
    job: Drafts the reply for a handler to send
    model: ${model('reply_drafter')}
    tools: [gmail.create_draft${p.slackAlerts ? ', slack.post' : ''}]
    guardrails: ${list(g([['no_payout', 'never_promise_payout'], ['draft_only', 'draft_only']]))}
tests:
  answer_key: tests/answer_key.json
`;
}

function readme(p: Project): string {
  return `# ${p.name}

Built with Architect 2.0 for Harborline Insurance.

- **Agents:** ${frameworkLabel(p.framework)} (see \`claims_agents/\` and \`agent.yaml\`)
- **Web app:** Next.js (see \`web/\`)
- **Answer Key:** ${p.answerKey.length} examples in \`tests/answer_key.json\`, owned by the claims team

## Run it locally

\`\`\`bash
pip install -r claims_agents/requirements.txt
pytest tests/ -q                            # the Answer Key: every example must pass
uvicorn claims_agents.api:app --reload      # the API, on http://localhost:8000
\`\`\`

The same tests run on every pull request (\`.github/workflows/proof.yml\`).

## Call it from your code

\`\`\`bash
curl -X POST http://localhost:8000/api/v1/claims/triage \\
  -H "Content-Type: application/json" \\
  -d '{"kind": "theft", "amount": 950, "police_report": false}'
\`\`\`

Set \`API_KEY\` to require \`Authorization: Bearer <key>\` on every request.
`;
}

const API_FILE = `"""HTTP API for the claims agents.

The same endpoint Architect hosts for you (POST /api/v1/claims/triage), to run on your own servers:

    pip install -r claims_agents/requirements.txt
    uvicorn claims_agents.api:app --reload
"""
import os

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from claims_agents.risk_rules import score

app = FastAPI(title="Claims Triage Assistant")

KINDS = {"water_damage", "theft", "glass", "roof", "fire", "flood", "hail", "liability"}


class Claim(BaseModel):
    kind: str = Field(description="water_damage, theft, glass, roof, fire, flood, hail or liability")
    amount: float
    policy_age_days: int = 365
    police_report: bool = False
    title: str = ""
    customer: str = "there"
    email: str = ""


@app.post("/api/v1/claims/triage")
def triage(claim: Claim, authorization: str = Header(default="")) -> dict:
    expected = os.environ.get("API_KEY")
    if expected and authorization != f"Bearer {expected}":
        raise HTTPException(status_code=401, detail="Invalid API key")
    if claim.kind not in KINDS:
        raise HTTPException(status_code=400, detail=f"kind must be one of {sorted(KINDS)}")
    result = score(claim.model_dump(), {"age_days": claim.policy_age_days})
    return {
        "decision": {
            "risk": result["risk"],
            "next_step": result["action"],
            "reasons": result["reasons"],
        }
    }
`;

const WEB_PAGE = `import { listClaims } from '@/lib/claims';

export default async function ClaimsInbox() {
  const claims = await listClaims();
  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold">Claims inbox</h1>
      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="text-left text-neutral-500">
            <th>Claim</th><th>Customer</th><th>Amount</th><th>Decision</th>
          </tr>
        </thead>
        <tbody>
          {claims.map((c) => (
            <tr key={c.id} className="border-t">
              <td><a href={\`/claims/\${c.id}\`}>{c.title}</a></td>
              <td>{c.customer}</td>
              <td>\${c.amount.toLocaleString()}</td>
              <td>{c.verdict.risk} · {c.verdict.action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
`;

const WEB_LIB = `export type Claim = {
  id: string;
  title: string;
  customer: string;
  amount: number;
  verdict: { risk: string; action: string; reasons: string[] };
};

const AGENTS_URL = process.env.AGENTS_URL ?? 'http://localhost:8000';

export async function listClaims(): Promise<Claim[]> {
  const res = await fetch(\`\${AGENTS_URL}/claims\`, { cache: 'no-store' });
  return res.json();
}
`;

export function generateFiles(p: Project, version = p.version): Files {
  const [fwPath, fwCode] = frameworkFile(p.framework, p.slackAlerts);
  const files: Files = {
    'README.md': readme(p),
    'agent.yaml': agentYaml(p),
    'claims_agents/__init__.py': '',
    [fwPath]: fwCode,
    'claims_agents/risk_rules.py': riskRules(version),
    'claims_agents/privacy.py': PRIVACY,
    'claims_agents/api.py': API_FILE,
    'claims_agents/requirements.txt': REQS[p.framework],
    'tests/answer_key.json': answerKeyJson(p),
    'tests/test_answer_key.py': TEST_FILE,
    'pytest.ini': '[pytest]\npythonpath = .\n',
    '.github/workflows/proof.yml': WORKFLOW,
    'web/app/page.tsx': WEB_PAGE,
    'web/lib/claims.ts': WEB_LIB,
    '.env.example': 'ANTHROPIC_API_KEY=\nAGENTS_URL=http://localhost:8000\n' + (p.slackAlerts ? 'SLACK_WEBHOOK_URL=\n' : ''),
  };
  if (p.framework === 'langgraph') files['claims_agents/nodes.py'] = NODES;
  if (p.slackAlerts) files['claims_agents/alerts.py'] = ALERTS;
  return files;
}

export function sortedPaths(files: Files): string[] {
  return Object.keys(files).sort((a, b) => {
    const da = a.includes('/') ? 0 : 1;
    const db = b.includes('/') ? 0 : 1;
    if (da !== db) return da - db;
    return a.localeCompare(b);
  });
}

export function languageOf(path: string) {
  if (path.endsWith('.py')) return 'python';
  if (path.endsWith('.tsx') || path.endsWith('.ts')) return 'ts';
  if (path.endsWith('.yaml') || path.endsWith('.yml')) return 'yaml';
  if (path.endsWith('.json')) return 'json';
  return 'text';
}
