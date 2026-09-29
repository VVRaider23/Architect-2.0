# Blueprint: Architect 2.0

> **The PRD says what and why. This says how it's built, and the step-by-step to ship it.** One document: the spec (what connects to what), the technical reference (how it stays reliable) and the build plan (the sessions that shipped it).

**Status:** Built and live (prototype) · Ready for pilot once the gate's pilot checks pass
**Mode:** extends-existing: the redesign rebuilt every screen on top of the existing store, rules engine and server, without changing them beyond three small additions
**Pattern source:** the first working prototype (commit `ede303e`, 2026-09-28): its store actions, engine and API routes are reused unchanged
**Authoring inputs:** [prd.md](prd.md) · [journeys.md](journeys.md) · [design.md](design.md) · [brand-guide.md](brand-guide.md) · the clickable redesign prototype
**DRI:** VVRaider23 | **Last updated:** 2026-09-29
**Architecture (one line):** Next.js pages (client) → one app store (all actions) → saved in the browser, and as one JSON document per user in Postgres when accounts are on → server routes for accounts, GitHub, AI and the public API
**Stack (one line):** Next.js 15.5 (App Router) · React 19.2 · TypeScript 5.9 strict · Tailwind 3.4 · Zustand 5 · Postgres (Neon) · GitHub OAuth · Anthropic or OpenAI · Vercel

---

## Confidence tags

- 🟢 **Confirmed:** we read the code, ran it, or measured it.
- 🟡 **Secondary:** docs or someone else say so; not verified here.
- 🔵 **Hypothesis:** believed, not tested. A 🔵 on the critical path blocks the gate.
- 🔴 **Disproven:** checked and wrong; kept so nobody retries it.

---

# Part 1 — The spec

## 1. Summary and guiding principle

Architect 2.0 lets one builder, one domain expert and one IT approver take an AI agent app from a sentence to live use: **Build → Prove → Sign off → Ship → Learn**. The redesign is a structural clone of the first prototype's logic with an entirely new front end: 22 one-job screens instead of one tabbed project screen. 🟢

**Guiding principle:** *reuse the store, the engine and the server; rebuild only what people see.* The only new logic is three store actions (§5).

### Confirmed scope decisions

| Decision | Resolution | Tag |
|---|---|---|
| Agent decisions | A deterministic rules engine (`src/lib/engine.ts`), versioned v1 → v3; the same rules ship in the generated Python tests | 🟢 |
| Hosting | Simulated: deployed apps run inside the prototype at `/apps/[id]` | 🟢 |
| Real features | Accounts, database, GitHub, AI turn on with settings; everything works without them in demo mode | 🟢 |
| Three people | One visitor plays all three with a "View as" switch | 🟢 |
| Real multi-account projects | **Out of scope** for the prototype: needs server-side actions (§9) | 🟢 |
| Real connections (Gmail, claims DB, Slack) | **Out of scope**: sample connections | 🟢 |
| Analytics | **Out of scope** for now: the audit trail records every action; wiring comes before the pilot | 🟢 |

## 2. ⭐ The one structural decision

```
Decision:   All app state lives in ONE client store (Zustand), and is saved whole: to the
            browser always, and as a single JSON document per user in Postgres when
            accounts are on. Every action (build, review, fix, request, decide, deploy)
            runs in the browser.
Evidence:   A full loop (the 14-step guided tour: build, review, fix, merge, sign-off,
            deploy, flags) produces 72,920 bytes of saved state. Demo mode needs no server
            at all. The automated click-through (62 screens, all three people) runs with
            zero errors on this design.                                            🟢
Confidence: 🟢 for the prototype (one visitor, three roles)
            🔵 for real teams (three people on three devices editing one project)
Blast radius if wrong: real multi-account collaboration would need the store's actions
            moved to server routes with per-project tables, and conflict handling. The
            screens would not change; `src/lib/store.ts` would become API calls.
Alternative considered + why rejected: normalized tables per entity with server actions.
            Rejected for the prototype: roughly triple the work, and demo mode would stop
            working without a database.
```

The 🔵 half doesn't block the prototype, whose critical path is one visitor. It **does** block a real pilot, so it's Open Decision #1 (§9) and a pilot gate check.

## 3. Architecture overview

```
VISITOR (browser)
  │
  ├── Pages (src/app, all client components)
  │     Get in · Home · Build flow · Workspace · Prove · Sign off · Ship · Learn
  │          │ read and call
  │          ▼
  ├── App store (src/lib/store.ts, Zustand + Immer)
  │     every action ─── Rules engine (src/lib/engine.ts)   triage, test runs, launch rules
  │                 └── Code generator (src/lib/codegen.ts) real files, 5 frameworks
  │          │ persisted
  │          ├──► localStorage  "architect2-demo-v1"          (always)
  │          └──► PUT /api/state ──► Postgres app_state (jsonb)  (accounts on; debounced)
  │
SERVER (Next.js route handlers, src/app/api + src/server)
  ├── /api/auth/*        email + password (scrypt), GitHub OAuth, signed session cookie
  ├── /api/github/*      your repos, analyze a repo, push code / open a pull request
  ├── /api/ai            chat, AI Consultant, agent playground (Anthropic or OpenAI)
  ├── /api/v1/keys       mint a signed API key for one project, environment and version
  ├── /api/v1/claims/triage   the public API: runs the engine for the key's version
  └── /api/health        which real features are on
```

**Decision log**
- Datastore: Postgres, one `jsonb` row per user, because the state is small and saved whole (§2) 🟢
- Auth: own sessions (HMAC-signed cookie) plus GitHub OAuth, because it needs no extra service 🟢
- Front end: Next.js App Router, client components, because every screen reads the same live store 🟢
- Background jobs: none; "flags arriving" is a timestamp the screens compare with the clock 🟢
- AI provider: Anthropic or OpenAI by setting; only open questions use it, never agent decisions 🟢

## 4. Data model

**In the store** (`src/lib/types.ts`), the shapes the screens consume:

```
Workspace — the company: name, launch rules, credits, members
Project — one app
  plan, planApproved, build {status, step, startedAt}   ← S6–S8
  agents[] {instructions, model, tools, guardrails[]}   ← S11
  version (1 → 3), answerKey[] {claim, expected, highRisk, author}
  runs[] {results[] {verdict, pass, trace}, passed, total}   ← S9, S13
  tasks[] / reviews[] {verdict, correction, createdItemId}   ← S16
  changes[] {files, fixed, broke, before/after text, pr, merged, undone}   ← S13, S14
  requests[] {env, audience, checks[], status, decision}   ← S17, S23
  deployments {preview, test, live} {version, status, history}   ← S18, S19
  flags[] {claim, verdict, by, note, at, status}   ← S21
  apiKeys {test, live}   ← S20
  chat[] {from, text, card}   ← the Workspace chat
Audit trail — every action: who, what, when   ← Settings → Audit trail
Toasts — in memory only, never saved (they can hold Undo functions)
```

**In Postgres** (created on first use, no SQL to run):

```
users — one per account
  id uuid pk · email unique · name · password_hash (scrypt) · github_id unique
  github_login · github_token (AES-256-GCM encrypted) · github_scopes · created_at
app_state — the saved store, one row per user
  user_id uuid pk → users(id) on delete cascade
  state jsonb not null · updated_at timestamptz
```

Access rule: a user can only read and write their own `app_state` row (the session decides which). 🟢

## 5. New logic in this redesign

Only three additions to the store; everything else is reused. 🟢

| Action | What it does | Used by |
|---|---|---|
| `fixFailing(project)` | Picks the right fix for what's failing (theft first, then water damage), applies it, reruns every example, returns the change | S13 Fix all, the palette, the tour |
| `mergeChange(project, change)` | Marks the change's pull request merged, logs it | S14 Merge |
| `toast(text, tone, {actions, ms})` | Toasts can now carry buttons (Undo, View pull request) and a duration | Fix all, chat changes, flags arriving |

`ChangeReceipt` gained `merged?`; `ToastMsg` gained `actions?` and `ms?`.

**Public API contract** (unchanged, 🟢):

```
POST /api/v1/claims/triage
  Authorization: Bearer <key>      (ak_demo, or a key from S20)
  { "kind": "theft", "amount": 950, "police_report": false, ... }
→ 200 { app, version, environment, claim, decision: { risk, next_step, reasons, draft_reply }, steps[] }
→ 401 { error } for a missing or unknown key
GET  the same address → a short description of the fields
```

## 6. Server changes

None in the redesign. 🟢 The GitHub reconnect link now points to the new Code screen (`/p/[id]/code`).

## 7. Front-end changes

Every screen is new. The route map (screen numbers match [journeys.md](journeys.md#screen-inventory)):

| Screen | Route | File |
|---|---|---|
| S1 Welcome | `/` | `src/app/page.tsx` |
| S2 Sign in | `/signin` | `src/app/signin/page.tsx` |
| S3 GitHub access | `/setup` | `src/app/setup/page.tsx` |
| S4 Home | `/home` | `src/app/home/page.tsx` |
| S5 Import | `/import` | `src/app/import/page.tsx` |
| S6 Questions | `/p/[id]/questions` | `src/app/p/[id]/questions/page.tsx` |
| S7 Plan | `/p/[id]/plan` | `…/plan/page.tsx` |
| S8 Building | `/p/[id]/build` | `…/build/page.tsx` + `src/components/blueprint.tsx` |
| S9 Ready | `/p/[id]/ready` | `…/ready/page.tsx` |
| S10 Your app | `/p/[id]/app` | `…/app/page.tsx` + `claims-app.tsx` (parts tagged `data-sel`) |
| S11 Agents | `/p/[id]/agents` | `…/agents/page.tsx` |
| S12 Code | `/p/[id]/code` | `…/code/page.tsx` |
| S13 What's wrong | `/p/[id]/prove` | `…/prove/page.tsx` |
| S14 Pull request | `/p/[id]/pr/[cid]` | `…/pr/[cid]/page.tsx` |
| S15 Invite | overlay | `src/components/project/invite.tsx` |
| S16 Meera | `/p/[id]/review` | `…/review/page.tsx` |
| S17 Farah | `/p/[id]/requests/[rid]` | `…/requests/[rid]/page.tsx` |
| S18 Deploy | `/p/[id]/ship` | `…/ship/page.tsx` |
| S19 Go live | `/p/[id]/live` | `…/live/page.tsx` |
| S20 API | `/p/[id]/api` | `…/api/page.tsx` |
| S21 Flags | `/p/[id]/learn` | `…/learn/page.tsx` |
| S22 Palette | overlay | `src/components/palette.tsx` |
| S23 Ask Farah | `/p/[id]/signoff` | `…/signoff/page.tsx` |
| Project entry | `/p/[id]` | redirects to the right screen (`src/lib/routes.ts`); old `?tab=` links still work |

Removed: the tabbed project workspace and its 13 tab components, `src/lib/ui.ts`, `loop-art.tsx`.

## 8. Chunk map and boundaries

| Chunk | What | Consumes | Provides |
|---|---|---|---|
| **C1 Kit** | `src/components/ui.tsx`: Button, ActionButton, HoldButton, CopyButton, Segmented, Menu, Modal, Tooltip, Disclosure, Tag, ScoreRing, Tick, CountUp | Tailwind tokens | Every screen |
| **C2 Frames** | `shell.tsx` (TopBar, AppShell, PersonSwitch, UserMenu, Toaster, RequireAuth), `frame.tsx` (ProjectRoute, journey bar, Deploy lock, Focus / Workspace / Paper layouts) | C1, the store | All pages |
| **C3 Get in** | S1–S5 | C1, C2, account API | A signed-in visitor with a workspace |
| **C4 Build flow** | S6–S9 | store: answerConsultant, draftPlan, approvePlan, skipBuild, completeBuild | A built project with a first run |
| **C5 Workspace** | S10–S12, chat panel | store: sendChat; `/api/ai`; codegen; GitHub hook | Changes from chat |
| **C6 Prove** | S13–S16 | store: fixFailing, undoChange, mergeChange, invite, submitReview | A proven version |
| **C7 Sign off** | S17, S23, S24 | store: requestSignoff, decide; engine: checkRules | An approved request |
| **C8 Ship** | S18–S20 | store: deploy, rollback, setApiKey; `/api/v1/*` | Test and Live deployments |
| **C9 Learn and anywhere** | S21, S22, the guided tour | store: sendFlagToReview, arriveFlagsNow; all of the above | Flags as tests; keyboard access; the tour |

**Boundary rule:** screens never change project data directly; they call a store action. Screens may keep only screen state (what's open, what's hovered, an animation snapshot).

## 9. Open decisions

| # | Decision | Needed by | Options |
|---|---|---|---|
| 1 | Real multi-account projects (⭐, 🔵) | Before the pilot | Move store actions to server routes with per-project rows; or share one project document per workspace with optimistic locking |
| 2 | Real hosting | When a pilot needs it | Lyzr cloud; the customer's cloud |
| 3 | Analytics tool | Before the pilot | Emit the §14 PRD events from the audit trail to PostHog or similar |
| 4 | Pricing | After the pilot | Per app, per seat, or per test run |

---

# Part 2 — Technical reference

## 10. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15.5, App Router | Pages and server routes in one app; deploys to Vercel with no config |
| UI | React 19.2, Tailwind 3.4, Geist Sans and Mono, Lucide icons | Tokens as CSS variables; one file changes the look |
| State | Zustand 5 + Immer + persist | One store, saved whole (§2) |
| Types | TypeScript 5.9, strict | |
| Database | Postgres via `postgres` (Neon on Vercel) | Optional; tables created on first use |
| Auth | Own HMAC-signed session cookie; scrypt passwords; GitHub OAuth | No extra service |
| AI | Anthropic or OpenAI by setting | Optional; only for open questions |
| Files | JSZip | "Download" on the Code screen |
| Hosting | Vercel, deploy on push to `main` | |

## 11. File structure

```
src/app/                    every screen (see §7) and the API routes
  api/                      auth, state, github, ai, v1 (keys, claims/triage), health
src/components/
  ui.tsx                    the kit, with small interactions built in
  shell.tsx, frame.tsx      top bars, app shell, project frame, layouts
  palette.tsx, tour.tsx     the command palette, the guided tour
  blueprint.tsx             the drawing on the Building screen
  prompt-box.tsx, project-row.tsx, home-extras.tsx, claims-app.tsx, code-view.tsx, domain.tsx
  project/                  chat-panel, invite, github
src/lib/
  store.ts                  state and every action
  engine.ts                 decisions, test runs, launch-rule checks
  codegen.ts                the generated code, per framework
  stage.ts, routes.ts       where a project is; which screen fits
  words.ts                  plain-words helpers for misses
src/server/                 accounts and sessions, Postgres, GitHub, AI, API keys
public/brand-guide.html     the brand guide, rendered (served at /brand-guide.html)
docs/                       this document set
```

## 12. Environment variables

All optional. With none set, the app runs in demo mode and saves work in the browser. Server-only: none of these reach the browser.

```
# Server only (never public)
DATABASE_URL=            # real accounts + saved work (Neon on Vercel sets it)
AUTH_SECRET=             # signs sessions, encrypts GitHub tokens; derived from DATABASE_URL if empty
GITHUB_CLIENT_ID=        # sign in with GitHub, repos, pushes, pull requests
GITHUB_CLIENT_SECRET=
APP_URL=                 # the site's address, so GitHub always returns there
ANTHROPIC_API_KEY=       # or OPENAI_API_KEY: real AI answers
AI_MODEL=                # optional model override
GITHUB_TOKEN=            # optional: higher limits for reading public repos

# Public: none
```

`/api/health` reports which are on, without revealing values. 🟢

## 13. Key flows (system view)

**The proof loop** 🟢
1. `approvePlan` → build timer starts; `ProjectRoute` calls `completeBuild` when the time is up → seed Answer Key (15 examples) → first test run (v1: 12 of 15).
2. `invite` (reviewer) → one review task per example in a batch.
3. `submitReview(wrong, fix)` → the example's expected answer updates, and a similar new example is added; after the last task, a test run.
4. `fixFailing` → next rules version → every example rerun → a change with fixed and broke counts.
5. `mergeChange` → marked merged. `requestSignoff` → launch rules checked → pending, or fast lane.
6. `decide(approved)` → `deploy(test)` allowed for that exact version → flags scheduled 25 s later.
7. `sendFlagToReview` → review tasks → corrections → `fixFailing` (v3) → fast lane to Test.

**Saving** 🟢: every store change writes localStorage; with an account, `SyncState` debounces a `PUT /api/state` of the whole state, shows "Saving… / Saved / Not saved yet", and reloads on sign-in. Another tab's change arrives through the `storage` event.

**Calling the API** 🟢: `POST /api/v1/keys` mints a key signed with the server secret and scoped to project, environment and version → `POST /api/v1/claims/triage` verifies it and runs the engine for that version.

## 14. Integrations

| Service | Used for | Scopes / limits | If it's down |
|---|---|---|---|
| GitHub OAuth | Sign in; "Allow code pushes" | Sign in: `read:user user:email`; pushes add `public_repo` | Email sign-in and demo mode still work |
| GitHub REST | Repos list, analyze, push, pull requests | The user's token | Import falls back to demo repos; Code shows the simulated repo |
| Anthropic / OpenAI | Open chat questions, AI Consultant, agent playground | One call per question | Scripted replies |
| Neon Postgres | Accounts and saved work | One row per user | "Not saved yet"; the browser copy stays |

## 15. Security checklist

| Item | Status |
|---|---|
| Secrets only in server environment variables, never in the browser bundle | 🟢 |
| Session cookie: HMAC-signed, `httpOnly`, `secure` in production, `sameSite=lax` | 🟢 |
| Passwords hashed with scrypt and a random salt | 🟢 |
| GitHub tokens encrypted at rest (AES-256-GCM) | 🟢 |
| API keys signed and scoped to one project, environment and version | 🟢 |
| API examples read the key from `ARCHITECT_KEY`; the key is hidden on screen by default and hides again after 6 s | 🟢 |
| Each user reads and writes only their own saved state | 🟢 |
| Personal-data masking is a launch rule, on by default | 🟢 |
| Rate limiting on auth and the public API | Not done: known limitation (§18) |

## 16. Performance

| Measure | Now | Target |
|---|---|---|
| First load JavaScript per screen | 154–171 KB (build output) 🟢 | Under 200 KB |
| Prompt to first test run (demo) | ~21 s by design (8 steps × 2.6 s), skippable 🟢 | Kept: the wait is the show |
| Saved state for a full loop | ~73 KB 🟢 | Under 1 MB per workspace |
| Re-render clock | Ticks only while a build runs or flags are due 🟢 | |

## 17. CI/CD and deploys

Push to `main` → Vercel builds (`next build`, type-checked) and deploys to [architect-2-0-alpha.vercel.app](https://architect-2-0-alpha.vercel.app). Before each push: `npx tsc --noEmit`, `npm run build`, and the Playwright click-through of every screen as all three people plus the guided tour (run locally; not in CI yet).

## 18. Known limitations

- One visitor plays three people; real three-account projects need Open Decision #1.
- Agent decisions come from rules, not live models, by design (the story is the same for everyone).
- Hosting, Gmail, the claims database, Slack and Studio agents are simulated.
- No rate limiting on sign-in or the public API.
- The click-through tests aren't in CI yet.
- One worked domain: insurance claims.

---

# Part 3 — Build plan to v0 (as executed)

## 19. Pre-flight

- [x] The PRD and journeys agreed (the three people, the 22 screens)
- [x] The redesign prototype clicked through end to end
- [x] The first working prototype live, with real accounts, GitHub and AI behind settings

## 20. Sessions

### S1 — The look *(Stage A)* ✅
Grey-black tokens and the paper theme in `globals.css`; Geist fonts; a new logo mark; every colour moved to tokens; contrast checked for every pair (one fix: paper green darkened to `#11703A`).
**Done-check:** build passes; a screenshot pass on every old screen; pushed and live.

### S2 — The kit ✅
All components with their interactions (§8 C1).
**Done-check:** type-check passes; older screens still compile against it.

### S3 — Frames and the store additions ✅
Top bars, app shell, project frame (journey bar, Deploy lock), layouts, toasts with actions; `fixFailing`, `mergeChange`.
**Done-check:** a project route loads, finishes a build on time, announces flags.

### S4 — Get in and Home ✅
S1–S5, including real sign-in paths and repo reading.

### S5 — The build flow ✅
S6–S9: questions with keys, the plan, the drawing, the score ring.

### S6 — The workspace ✅
S10–S12: point-and-ask, the console, the agent graph and drawer, code with diffs and download.

### S7 — Prove ✅
S13–S16: Fix all with the staggered rows and Undo; pull request checks; invite; Meera's review.

### S8 — Sign off and ship ✅
S17–S21, S23: Farah's page and stamp, the ship track, press-and-hold, the API screen, flags.

### S9 — Anywhere ✅
The palette, G-key jumps, the guided tour rewritten for the new screens, old links redirected, old screens deleted.
**Done-check:** automated click-through of 62 screens as all three people with zero errors; the tour completes all 14 steps with zero errors; phone-size screenshots checked.

### S10 — Retest and ship *(Stage D)*
Re-run everything, record a new demo video, update the README and screenshots, push, check the live site and `/api/health`.

## 21. Checkpoints

| After | Check | Result |
|---|---|---|
| S1 | Nothing broke visually on the old screens | ✅ |
| S3 | Old routes still build against the new kit | ✅ |
| S9 | Full click-through + tour, zero errors | ✅ |
| S10 | Live site serves every screen; health check green | Pending |

## 22. Audits

- **Contrast:** every text and background pair in both themes (see the [brand guide](brand-guide.md#contrast-wcag)). ✅
- **Keyboard:** questions, review, hold, palette, menus and dialogs all work without a mouse. ✅
- **Phones:** home, prove, ship and the app workspace at 390 px. ✅
- **Copy:** plain words throughout; no "eval", "regression", "staging". ✅

## 23. Launch prep and deploy order

1. `npx tsc --noEmit` and `npm run build` pass.
2. The click-through and the tour pass locally.
3. Push to `main`; Vercel deploys.
4. Open the live site: Welcome, the tour's first steps, `/api/health`, `/brand-guide.html`.
5. Submit the live link and the repo.

## 24. Week 1 after launch

Watch: `/api/health` (which features are on), Vercel's error log, and the audit trail of test sessions: how far visitors get in the tour (the H1 read), where they stop.

---

# Gate

## Part 1 (the spec is safe to start)

| Check | Prototype | Pilot |
|---|---|---|
| ⭐ decision stated with evidence | ✅ 🟢 | ❌ 🔵 multi-account (Open Decision #1) |
| No 🔵 on the critical path | ✅ | ❌ H2 (experts review) and H3 (IT accepts) untested |
| Out-of-scope rows present | ✅ | ✅ |
| Every screen traced to a journey | ✅ | ✅ |

## Part 2 (the running system is reliable)

| Check | Status |
|---|---|
| Every environment variable listed, server-only | ✅ |
| Security checklist filled | ✅ (rate limiting open) |
| Integrations have a fallback | ✅ |

## Part 3 (the plan ships it)

| Check | Status |
|---|---|
| Every session has a done-check | ✅ |
| Checkpoints recorded | ✅ (S10 pending) |

**Verdict:** the prototype passes. A real pilot is blocked until Open Decision #1 is made and the expert and IT tests (PRD H2, H3) are run.
