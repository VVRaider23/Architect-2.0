# Architect 2.0 · Build it. Prove it. Ship it.

A working prototype of the next version of [architect.new](https://architect.new): build an AI-agent app from a prompt or from your own repo, **prove** it with your experts' examples, and **ship** it with IT's sign-off.

**Live demo:** [architect-2-0-alpha.vercel.app](https://architect-2-0-alpha.vercel.app) · **Try it in 3 minutes:** follow the [demo script](#demo-script-about-3-minutes).

---

## The problem

> Building the agent app is now the easy part. Proving it's ready to launch is the hard part, and no neutral tool does both.

Developers at insurers, banks and hospitals can now build an agent app in days. What stops it going live is **proof**. The business expert needs to see that the answers are right, and IT needs to see that they are safe. Today, the tools that build the app don't test the agents, and the tools that test the agents don't build the app. So expert feedback arrives as screenshots, IT approval is pieced together by hand, and the app stalls between demo and launch.

## The idea: one loop, one tool

**Build → Prove → Sign off → Ship → Learn**

| Step | What happens |
|---|---|
| **Build** | Describe the app, answer 3 questions, approve a one-page plan (with the cost shown first). Or import a GitHub repo. You choose the agent framework: LangGraph, CrewAI, OpenAI Agents SDK, Google ADK or Lyzr. |
| **Prove** | Every change reruns the **Answer Key**, the expert's own examples. The expert reviews answers without ever seeing code, and each correction becomes a new test. |
| **Sign off** | IT approves from a **Launch Pack** built from the evidence, checked against **launch rules** they set once. Low-risk updates can take a **fast lane**. |
| **Ship** | Preview → Test (pilot) → Live, with one-click rollback, on Lyzr cloud or your own. |
| **Learn** | People using the app flag wrong answers. Flags go to the expert and become tests, and the loop starts again. |

## Three people, one project

Use the **View as** switch (top right) to see the same project as each person. It's a demo shortcut, so you don't need three accounts.

| Person | Role | Sees |
|---|---|---|
| **Arjun Mehta** | Builder (senior AI engineer) | Everything, including the code |
| **Meera Krishnan** | Reviewer (claims operations lead) | The answers, the Answer Key and the app. No code. |
| **Farah Siddiqui** | Approver (IT and security lead) | Launch Packs, launch rules, agents and the audit trail |

The demo company, **Harborline Insurance**, is fictional.

## Demo script (about 3 minutes)

1. **Create an account** (or **Continue with GitHub**, or **Try it without an account**), then **Create workspace**.
2. On Home, pick the **Claims triage** template, then **Plan it**. Answer the 3 questions, then **Draft the plan**.
3. **Approve plan and build.** Watch the app and its code assemble, or skip ahead.
4. **Preview → Test mode:** 12 of 15 answers match. Click **Stolen bike** to replay what each agent did, step by step.
5. **Invite a reviewer.** Then **Waiting on Meera** switches you to Meera. Press **R** (right) or **W** (wrong); the three theft claims are wrong.
6. Back as Arjun, click **Fix 6 failing examples**. The change receipt shows *fixed 6, broke 0*. View the diff and open a pull request.
7. **Request sign-off.** As Farah, read the **Launch Pack**, then choose **Approve with conditions**.
8. **Deploy v2 to Test** and open the pilot app. About 25 seconds later, two claims handlers flag water-damage answers (see the **Live** tab).
9. **Send them to Meera.** She marks them wrong, you fix them, and the fix takes the **fast lane** to Test. Then **Request Live approval**, approve, and **Deploy to Live**.

Short on time? On Home, click **Open a finished demo project**. To start over, use **Reset demo data** in the account menu.

## What's in it

| Brief item | Where | What works |
|---|---|---|
| Authentication | `/`, `/setup` | **Real accounts** (email and password) and **Sign in with GitHub**, with secure sessions. Demo sign-in when no database is set. |
| Database | every screen | Each person's workspace, projects, reviews and audit trail are **saved in Postgres** and come back on any device. A "Saved" badge shows it. |
| Homepage | `/home` | Changes with the role. **Builder:** prompt box with the **+ menu** (attach files, add Lyzr Studio agents, prompt library), **Guided / One Shot** switch, **AI Consultant** ideas, projects, "Needs you". **Reviewer:** review queue and impact. **Approver:** launches waiting, rules, decisions. |
| Chat window | Left panel of a project | Consultant questions, plan, live build progress, change receipts, "why is it failing?". Open questions are answered by a **real AI model** from the project's facts (marked **AI**). |
| App preview | **Preview** tab | The generated app on desktop or mobile, with **theme presets**. Test mode shows pass or fail per example, with Replay. |
| Agent section | **Agents** tab | Agent map with per-agent scores. Edit instructions and model, toggle guardrails, **Edit in Lyzr Studio**, and **try the agents on any claim** with a real AI model. |
| UI getting built | **Preview** tab while building | Build steps, the app assembling and the code being written |
| GitHub integration | Setup, **Import**, **Code** tab | **Real GitHub:** connect your account, see your repos, analyze any repo, **push the generated code to a new repo** and **open real pull requests** with the proof report. |
| Deploying | **Launch** tab | Preview, Test and Live, sign-off, fast lane, rollback, custom domain and working app addresses |
| Beyond the brief | **Proof**, review queue, Launch Pack, **Live**, Settings | Answer Key, expert review, launch rules, live flags, audit trail with CSV export |

### Real vs simulated

**Real:**
- accounts, sessions and the Postgres database (when `DATABASE_URL` is set)
- GitHub sign-in, your repos, new repos, commits and pull requests (when the GitHub OAuth app is set)
- AI answers in chat, the agent playground and the AI Consultant (when an AI key is set)
- the agent decision engine (the same rules as the generated Python)
- proof runs, pass/fail and step-by-step traces
- reviews that become tests, and a guard against the fix memorising one case
- launch rules, approvals with conditions, fast lane, deploy gating and rollback
- the audit trail
- the generated code: download it and run `pytest`
- GitHub repo analysis (`/api/github/analyze`)
- sync across browser tabs

**Simulated, to keep the demo repeatable:**
- the proof engine's decisions come from rules, not model calls, so the story (12 of 15, then fixed) is the same every time
- whole-app generation (a scripted build)
- hosting on Lyzr cloud or your cloud (the deployed app runs inside this prototype at `/apps/<id>`)
- Gmail, the claims database, Slack and Lyzr Studio agents (sample connections)
- live traffic numbers

Without any keys, everything still works in demo mode, and work is saved in the browser.

## Run it locally

```bash
npm install
npm run dev        # http://localhost:3000
```

No keys are needed. For a local database, run `node scripts/local-db.mjs` and set `DATABASE_URL=postgres://postgres@127.0.0.1:5433/postgres`.

## Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new), import this repository and press **Deploy**. No settings are needed.
2. Turn on the real features by adding them in Vercel (**Settings → Environment Variables**), then redeploy:

| Setting | How to get it | What it turns on |
|---|---|---|
| `DATABASE_URL` | **Storage → Create Database → Neon**, connected to the project (added for you) | Real accounts, with each person's work saved in the database |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | github.com → Settings → Developer settings → OAuth Apps → New. Callback URL: `https://<your-site>/api/auth/github/callback` | Sign in with GitHub, your repos, pushing code, pull requests |
| `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` | console.anthropic.com or platform.openai.com | Real AI answers in chat, the agent playground and the AI Consultant |
| `GITHUB_TOKEN` (optional) | A read-only GitHub token | Higher limits for reading public repos on Import |

Database tables are created automatically on first use; there's no SQL to run. See [`.env.example`](.env.example) for all settings.

## How it's built

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · Zustand · Postgres (Neon) · GitHub OAuth and REST API · Anthropic or OpenAI · JSZip · IBM Plex

```
src/app/                pages: sign-in, setup, home, import, project, review queue,
                        launch pack, settings, the deployed app, and the demo link
src/components/         UI kit, app shell, chat, project tabs, the generated claims app, code viewer
src/lib/engine.ts       the agents' decision rules, proof runs and launch-rule checks
src/lib/codegen.ts      the code Architect generates, for each framework
src/lib/store.ts        app state and every action: build, review, change, request, decide, deploy
src/server/             accounts and sessions, the Postgres tables, GitHub OAuth and pushes, AI calls
src/app/api/            auth, saved state, GitHub, AI and repo analysis routes
```

## Design principles

- **The launch path is the spine.** Builders already have many ways to build; what's missing is proof and sign-off. Every screen shows where the app is on Build → Prove → Sign off → Ship → Learn, and one main button says what to do next.
- **Each person sees only their job.** Meera sees answers, never code. Farah sees evidence, never code.
- **Evidence, not claims.** Every line in a Launch Pack comes from a test run, a trace, a commit or a setting. Nothing is typed by the builder.
- **Every change gets a receipt.** It lists the files changed, what it fixed, what it broke and what it cost, with undo and a pull request.
- **No lock-in.** Agents are described once in `agent.yaml` and regenerated for any framework. The code lives in your own GitHub.
