# Architect 2.0 — Build AI agent apps your experts trust

**DRI (the person responsible):** VVRaider23 | **Team:** solo builder, working with Claude
**Status:** Prototype built, pilot-ready | **Created:** 2026-09-24 | **Last updated:** 2026-09-29
**Design:** code-first, the live prototype is the visual truth: [architect-2-0-alpha.vercel.app](https://architect-2-0-alpha.vercel.app) | **Engineering doc:** [blueprint.md](blueprint.md) | **Analytics:** not wired to an analytics tool yet. The app's audit trail already records every action listed in §14; wiring it is a milestone in §20.

**Document lineage:** [discovery-brief.md](discovery-brief.md) says whether it's worth building. This PRD says what and why. [journeys.md](journeys.md) holds the step-by-step flows and the screen list. [design.md](design.md) holds how screens look and behave, [brand-guide.md](brand-guide.md) holds colours, type and voice, and [blueprint.md](blueprint.md) holds how it's built. One home per fact: if this PRD and another doc disagree about a screen, journeys.md wins; about a colour, the brand guide wins; about the code, the blueprint wins.

---

## A note to whoever reads this

I wrote this so you can understand the product without me in the room. Every section says what I found, why I chose what I chose, and what is still unproven. If something is unclear, that's a gap in this document.

If you read three things: **§1 The problem**, **§9 Success criteria** (how we'll know it worked) and **§16 Key logic** (the rules that will otherwise get decided in a chat thread).

---

> **Confidence tags**, used on every claim that matters.
> 🟢 We checked it ourselves: we ran it, measured it, or read the code.
> 🟡 Someone else says so: public docs, the assignment brief as other applicants published it.
> 🔵 A bet we believe but haven't proven. Treat it as a hypothesis.
> 🔴 We were wrong. Kept visible, with what corrected it.

> **Honesty rules**
> 1. **No invented numbers.** There are no user interviews and no usage data yet. Where a number would need them, it says so.
> 2. **Baselines are honest zeros.** The product has never had real users, so every "before" number is "not measured".
> 3. **Research gaps are named.** The biggest: no interviews with experts or IT approvers yet. The planned test is in the [discovery brief](discovery-brief.md#riskiest-assumption).
> 4. **Every scoping call shows impact and effort** in the table where the call is made.

---

## Changelog

| Change | Date | People | Comments |
|---|---|---|---|
| First working prototype: build, prove, sign off, ship, learn; real accounts, GitHub and AI when keys are set | 2026-09-28 | VVRaider23 | Tab-based project screen |
| Redesign: grey-black look, 22 one-job screens, small interactions, press-and-hold to go live | 2026-09-29 | VVRaider23 | Replaced the tab-based screen after our own walkthrough found it confusing (see §1.3, 🔴 row) |
| This document set written in the Builder OS format | 2026-09-29 | VVRaider23 | |
| The welcome page always shows; placeholders and a progress line between screens | 2026-09-29 | VVRaider23 | Project moves measured at ~630 ms of frozen screen before, 10-50 ms after (with a 300 ms network delay) |
| Two ways in, sign-in that follows them, and a Developer tools switch | 2026-09-29 | VVRaider23 | Chosen over keeping a copy of today's Architect next to 2.0 (see §12, "One app, two ways in") |

---

# PART A — WHY

---

## 1. The problem

**Building an AI agent app is no longer the hard part. Getting a company to trust it is.**

A developer can now build an agent app in days 🔵. But in a company with strict rules, the app can't go live until two other people agree: the **business expert**, who is the only one who knows whether an answer is right, and **IT**, who must approve anything that touches customer data. Today the expert's checks arrive as screenshots, nobody reruns the examples after a fix, and IT is shown a slide deck instead of evidence 🔵. The app stalls between demo and launch.

**What we are not trying to solve:** making the AI models themselves smarter, hosting at scale, or helping people build consumer apps where nobody has to approve anything.

### 1.1 A real-looking scenario

Harborline Insurance (a made-up company) wants an assistant that sorts incoming claims. **Arjun**, a senior AI engineer, builds it in a day: it reads the claim email, checks the policy, scores the risk and drafts a reply. In his demo, 12 of 15 example claims get the right answer. The 3 misses are all theft claims: the policy says theft needs a police report first, and the app fast-tracks them anyway.

**Meera** runs claims operations. She spots the theft problem immediately, but she can't read code or an evaluation dashboard, so she sends screenshots in a chat thread. Arjun fixes the theft rule. Nobody reruns the other 12 examples, so nobody knows if the fix broke something else.

**Farah** leads IT and security. The app reads customer emails, so she needs to know: which answers were checked, by whom, what data it touches, and who will be able to use it. Arjun writes her a slide deck. She asks for evidence the deck can't give. Weeks pass. The app stays a demo.

### 1.2 How it breaks, every time

Demo excitement → the expert's feedback travels as screenshots → fixes go in without rerunning the examples → IT asks for evidence, gets a deck → approval stalls → the app never leaves the demo.

This is structural, not a people problem: **the tools that build agent apps don't test the answers with the expert, the tools that test answers don't build or ship the app, and nothing gives IT a page they can trust** 🔵.

### 1.3 Evidence

| Evidence | Size | Source | Confidence |
|---|---|---|---|
| The next Architect must work for non-technical builders **and** developers | The brief's must-haves: sign-in, home, chat, live preview, agents, the screens being built, GitHub, publishing, and "go beyond this list" | The assignment brief as other applicants published it (the original link was blocked for us) | 🟡 |
| Judges look at design and flow first | Then feature coverage; working features are a bonus | Same brief | 🟡 |
| Many applicants answer with "one project, two views" | Several public submissions | Our reading of public repos, Sept 2026 | 🟡 |
| Experts' checks travel as screenshots; IT gets decks | Not measured | No interviews yet (named gap) | 🔵 |
| In the prototype, a new app goes from prompt to its first test run in about 21 seconds | 8 build steps × 2.6 s | The build timer in the code | 🟢 |
| The whole loop runs end to end as all three people | Build, review, fix, merge, sign-off, deploy, flags, API, go live, 62 screenshots, zero errors | Automated click-through, 2026-09-29 | 🟢 |
| ~~One project screen with a chat, a status bar and seven tabs is clear for first-time visitors~~ | Walking through it as a newcomer, it wasn't clear where to look or what to do next | Our own walkthrough of version 1 | 🔴 → rebuilt as one job per screen |

### 1.4 Why now

Agent frameworks such as LangGraph, CrewAI, the OpenAI Agents SDK and Google ADK have made the agents themselves easy to write 🟡. Prompt-to-app tools have made the screens easy to generate 🟡. When building gets cheap, the scarce thing becomes **getting the app approved**, and no tool owns that step for the three people involved 🔵.

> **Key insight**
>
> Nobody needs another way to build an agent app. They need a way to get one **approved**, and approval is a three-person job that today's tools treat as a one-person one.

---

## 2. Target user

**Segment:** teams where an AI app can only go live after **three people agree**: the builder, the domain expert and the risk approver. Typically insurers, banks and hospitals, but the defining condition is the three-person sign-off, not the industry.

| Behaviour | What it looks like | What it forces the product to be |
|---|---|---|
| The expert can't read code or dashboards | Feedback arrives as screenshots | Review must be one case at a time, in plain words, with three choices: right, wrong, not sure |
| IT approves evidence and rules, not demos | "Show me what was checked" | The approval page must be **built from test results**, never typed by the builder |
| The builder already has an editor, a framework and GitHub | "Don't lock me in" | Code in the builder's chosen framework, in their own GitHub, with pull requests |
| The app changes often | Every fix can break something else | Every change reruns every example and says what it fixed and what it broke |

These traits aren't fixed by better onboarding. They make it a different product: one built for three people instead of one.

**Explicitly out of scope:** solo builders with no expert or approver; consumer apps; internal tools that never touch customers or their data.

**Say-do gap:** skipped. We have no behavioural data yet, and we won't pretend to.

---

## 3. What people use today, and why it falls short

**The real benchmark is a workaround:** a spreadsheet of test cases, screenshots in chat, and a slide deck for IT. It costs nothing to set up and produces no evidence anyone can trust later.

| Tool type | What works | What falls short | Why it can't simply be fixed |
|---|---|---|---|
| Prompt-to-app tools (Replit, Lovable, Emergent) | An app from a prompt, fast 🟡 | As far as we have seen, no built-in way for an expert to check answers or for IT to sign off 🔵 | Built for **one** person making an app, not three people agreeing on one |
| AI coding tools (Claude Code, Codex, Cursor) | Writing and changing code fast, inside the developer's own repo 🟡 | The expert and IT never open an editor 🔵 | They live where the developer works; the other two people don't work there |
| Agent testing tools | Scoring answers against examples 🟡 | They don't build or ship the app, and an engineer has to set them up 🔵 | The expert still can't use them alone |
| Today's Architect | Great for non-technical builders: prompt box, AI Consultant, plan first, agents, deploy 🟡 | Developers want framework choice, their own code and GitHub (the brief's own premise) 🟡 | Its model is "one person describes an app" |

**The ceilings nobody escapes:** single-user tools can't hold a three-person approval; editor-bound tools can't reach the expert or IT; testing tools don't ship. The wedge is **the workflow between the three people**.

---

## 4. Business impact

| Problem | What it does to the business | Estimated impact | Confidence |
|---|---|---|---|
| Agent apps stall before launch | Money spent building apps nobody uses | Not sized | 🔵 |
| Expert time wasted on screenshots | Slow, unrecorded feedback | Not sized | 🔵 |
| IT approves without evidence, or refuses | Risk taken blindly, or value never delivered | Not sized | 🔵 |

**Total impact:** not formally sized, deliberately. There is no usage data and no interviews. The pilot in §23 exists to size it.

---

## 5. Which problems to attack first (impact vs effort)

| # | Problem | Impact | Effort (for one builder, this week) | Decision |
|---|---|---|---|---|
| P1 | Fixes go in without rerunning the examples | HIGH: silent breaks destroy trust | LOW: rerun everything, count fixed and broken | **Attack now** |
| P2 | The expert can't check answers herself | HIGH: she is the only source of truth | MED: a plain-words review screen | **Attack now** |
| P3 | IT gets a deck, not evidence | HIGH: the final blocker | MED: generate the Launch Pack from runs and reviews | **Attack now** |
| P4 | Developers feel locked in | MED: they choose the tool | MED: one agent description, generated for five frameworks, pushed to their GitHub | **Attack now** |
| P5 | Real hosting and scale | HIGH | HIGH: out of reach for a prototype | **Defer**, simulate hosting |
| P6 | Live model accuracy varies run to run | MED | HIGH: would make the demo unrepeatable | **Defer**, use deterministic rules (§18) |

**Chosen chain:** P1 → P2 → P3 → the end of "demo that never launches". Nothing downstream is trustworthy until every change reruns the examples, so P1 comes first; P2 feeds the examples; P3 turns them into a decision.

**What we are not solving, and why:**

| Problem | Why it's out (structural, not "later") |
|---|---|
| Making the models smarter | Not ours to fix; we make their mistakes visible |
| Billing and plans | Credits are shown, but pricing is a business decision outside this prototype |
| Real multi-tenant hosting | Needs infrastructure a prototype can't prove; simulated so the demo always works |

---

## 6. The narrowed problem, and what we're assuming

**Teams that need a builder, an expert and IT to agree before an AI app goes live have no shared place to do it. The expert can't check answers without an engineer, fixes go in without rerunning the examples, and IT is asked to trust a slide deck. Existing tools serve one of the three people. The solution has to serve all three, each seeing only their own job.**

| Assumption | Basis | Confidence |
|---|---|---|
| Experts will review answers if it's plain words and quick | The riskiest bet; test planned | 🔵 |
| IT will accept a generated Launch Pack plus launch rules for a small pilot | Belief; test planned | 🔵 |
| Builders will stay because building is fast and the code is theirs | Prototype: 21 s to first test run, five frameworks, real GitHub | 🟢 prototype / 🔵 real teams |
| A deterministic rules engine is enough to show the loop | The same rules run in the generated Python tests | 🟢 |

---

## 7. The approach, in one breath

One loop for three people: **Build → Prove → Sign off → Ship → Learn**. The builder builds. The expert's examples become the tests. IT approves from a page made of evidence. People's flags come back as new tests, and the loop starts again.

## 8. What success looks like

*Harborline's claims assistant went live on a Tuesday. Arjun built it in an afternoon. Meera checked 15 answers over coffee, marked 3 wrong, and those 3 became tests; Arjun's fix passed all 18. Farah read one page, added "review again in 30 days", and approved a pilot for 12 people. Two weeks later, handlers flagged two water-damage answers. They became tests too, the fix went out through the fast lane, and Farah saw it in her audit trail the next morning. Nobody wrote a slide deck.*

## 9. Success criteria

No real users yet, so every baseline is "not measured". These are the numbers the pilot (§23) will read.

| Metric | Baseline | Target (window) | Kill signal | Type | Confidence | Hypothesis |
|---|---|---|---|---|---|---|
| First-time visitors who finish the guided tour | Not measured | 60% (pilot) | Under 30% at n ≥ 20 (early warning at n = 8) | Primary | 🔵 | H1 |
| Visitors who can say what the product does, in one sentence, after the tour | Not measured | 70% | Under 40% at n ≥ 20 | Primary | 🔵 | H1 |
| Experts who finish a 15-answer review without help | Not measured | 4 of 5 | Fewer than 3 of 5 | Primary | 🔵 | H2 |
| Seconds per answer in the review | Not measured | Under 20 s | Over 60 s | Secondary | 🔵 | H2 |
| IT approvers who say the Launch Pack is enough for a pilot | Not measured | 2 of 3 | 0 of 3 | Primary | 🔵 | H3 |
| **North Star:** apps that reach Live with a full proof trail (reviews, runs, approval) | 0 | Tracked, not gated | n/a | Secondary | 🔵 | |
| **Aha moment:** the builder sees "Fixed 3 answers. Nothing else broke." right after the expert's corrections | 🟢 in the prototype flow | Reached by 80% of builders who invite an expert | Under 40% | Secondary | 🔵 | H4 |
| **Guardrail:** deploys without an approved request for that exact version | 0 🟢 (the code refuses) | Stays 0 | Any | Guardrail | 🟢 | |
| **Guardrail:** merges of a change that broke an example | 0 🟢 (Merge is blocked) | Stays 0 | Any | Guardrail | 🟢 | |

**Sample-size rule:** a rate read at n = 8 is only an early warning; we trust it at n ≥ 20.

## 10. Hypotheses

| H# | Hypothesis | Kill signal | What dies with it |
|---|---|---|---|
| H1 | A newcomer understands the three-person loop within one guided tour | Under 30% finish, or under 40% can explain it | The "one loop" story; we'd go back to a simpler single-person pitch |
| H2 | Experts will review answers themselves when it's one card, plain words, three choices | Fewer than 3 of 5 finish | The Answer Key as expert-owned; Prove becomes a builder tool only |
| H3 | IT will accept a generated Launch Pack plus launch rules for a pilot | 0 of 3 approvers accept | Sign off as a product step; it becomes an export |
| H4 | "Fixed X, broke 0" after the expert's corrections is the moment builders trust the tool | Builders ignore the receipt and undo button | The change receipt as the core trust device |

## 11. Non-goals

- **Real hosting at scale.** Out of scope for the prototype; apps "run" inside it. Revisit when a pilot customer needs a real deployment.
- **Live model calls for every agent decision.** Deliberate: decisions come from a rules engine so every visitor sees the same story. Open chat questions and the AI Consultant do use a real model when a key is set.
- **Real Gmail, claims database, Slack or Lyzr Studio connections.** Sample connections only. Revisit per pilot customer.
- **More than one worked example.** The engine knows one domain, insurance claims. Other prompts are accepted and the app says honestly that it uses the claims example.
- **Replacing the developer's editor.** Never in this form: the code is theirs, in their GitHub. We hand off, we don't compete.

---

# PART B — WHAT

---

## 12. Product concept

### The inversion

| Every agent-app tool today | Architect 2.0 |
|---|---|
| One person, one screen | Three people, each seeing only their job |
| "It looks done" | "It's proven done": every answer checked against the expert's examples |
| Tests written by engineers | Tests written by the expert, in plain words |
| Approval by slide deck | Approval from a page built out of evidence |
| Launch is a button | Launch is a pilot first, then a press-and-hold for everyone |
| Feedback in chat threads | Flags that become tests |

### Architecture in one sentence

Arjun describes the app and Architect builds it; **the Answer Key reruns after every change**; Meera's corrections and people's flags keep adding examples; Farah's launch rules decide what needs her; nobody has to translate for anyone else.

### Non-negotiables

| Constraint | What it means | Basis |
|---|---|---|
| **One job per screen** | Each screen answers one question and has one main button | Our own walkthrough of version 1 (§1.3, 🔴 row) 🟢 |
| **The expert never sees code** | Review is a card: the case, what the app said, right / wrong / not sure | Target user trait (§2) 🔵 |
| **The Launch Pack is generated, never typed** | Every line comes from a test run, a review, a setting or a commit | Target user trait (§2) 🔵 |
| **No lock-in** | Agents described once, generated for LangGraph, CrewAI, OpenAI Agents SDK, Google ADK or Lyzr; code in the builder's GitHub | Target user trait (§2) 🔵 |
| **Plain words** | "3 answers are wrong", never "3 eval failures" | The brief's audience includes non-technical people 🟡 |

### Design rationale: why one loop, and not "two views"

- **Two views split the product by skill; one loop splits it by job.** Meera isn't a "less technical Arjun". She has a different job: deciding what's right. So she gets a different screen, not a simplified one.
- **The loop is the menu.** A project's only navigation is Build · Prove · Sign off · Ship · Learn, and each step shows whether it's done, happening now or locked. You always know where you are.
- **Trust is earned step by step.** Preview (only you) → Test (a pilot group) → Live (everyone), each gated by evidence.

### One app, two ways in (and why not a "classic" copy)

The brief asks the next Architect to serve non-technical builders and developers. We looked at three ways to do that:

| Option | What it is | Verdict |
|---|---|---|
| A · Two apps | Keep a copy of today's Architect for non-technical builders, and 2.0 for developers | **No.** It splits the pitch ("pick a version"), starts with "are you technical?", doubles every feature and fix, and would be our guess at a product we don't have the code for |
| B · One app, two ways in | **Describe it** or **Bring your code** on the welcome page and Home, and a **Developer tools** switch that shows the code, the raw build log and API keys up front, or tucks them away | **Yes.** Same app, same data; only how much you see changes. Nobody is asked what they are: the way they came in is the signal |
| C · A guide for today's users | "Coming from today's Architect?" card mapping old places to new | Later, if current users can't find what they know |

How B decides without asking: 🟢 in the prototype
- **Sign-in follows the way in.** "Describe it" opens with an email box and skips the GitHub question; "Bring your code" puts GitHub first, because Architect needs it to read the code.
- **Developer tools guess, then obey.** On after a GitHub sign-in or bringing code; off after "Describe it" with email. One switch in Settings, the account menu and ⌘K wins over the guess. Off never removes anything: the code and the API sit in a </> menu next to the tabs.

### The brief's two questions, answered

**Why would a non-technical person pick this over Replit, Lovable or Emergent?** 🔵
Those tools get you an app fast. Then you're on your own: is it giving the right answers, and will IT let anyone use it? Architect 2.0 brings in the people who decide that. Your expert checks the answers in plain words, every correction becomes a test, IT approves from one page, and it goes to a small pilot group before everyone. You don't just get an app. You get an app your company will actually allow people to use.

**Why would a developer pick this over Claude Code, Codex or Cursor?** 🔵
Keep them. They're great at writing code, and your code stays in your GitHub in your framework (LangGraph, CrewAI, OpenAI Agents SDK, Google ADK or Lyzr), so you can open it in any of them. What they don't give you is the part after "it works on my machine": examples written by the expert that rerun on every change, pull requests that carry the test report, launch rules and an audit trail IT accepts, and an API for every deployed version. Architect owns the step between your editor and a yes from IT.

## 13. Key features

**P0: it can't ship without these**

| # | Feature | What it does | Impact | Effort | Owner |
|---|---|---|---|---|---|
| 1 | Prompt → questions → plan → build | Describe it, answer 3 questions, approve a 4-line plan, watch it build | HIGH | MED | VVRaider23 |
| 2 | Answer Key and test runs | Every change reruns every example and counts matches | HIGH | LOW | VVRaider23 |
| 3 | Expert review | Right / wrong / not sure; a correction adds a new example | HIGH | MED | VVRaider23 |
| 4 | Fix with receipt, undo and pull request | "Fixed 6. Nothing else broke." with Undo and a pull request whose checks tick in turn | HIGH | MED | VVRaider23 |
| 5 | Launch rules, Launch Pack, decision | Farah approves from one page, with conditions | HIGH | MED | VVRaider23 |
| 6 | Preview → Test → Live, with hold-to-go-live | Pilot first; going live takes a deliberate press-and-hold | HIGH | LOW | VVRaider23 |
| 7 | The brief's must-haves | Sign-in, home, chat, live preview, agents, screens being built, GitHub, publishing | HIGH | MED | VVRaider23 |

**P1: makes it stronger**

| # | Feature | What it does | Impact | Effort | Owner |
|---|---|---|---|---|---|
| 8 | Flags become tests | People using the app flag answers; they go to the expert | HIGH | LOW | VVRaider23 |
| 9 | Every app is also an API | A key per environment, code in curl, Python and JavaScript, a test request button | MED | LOW | VVRaider23 |
| 10 | Point-and-ask | Click any part of the app preview and ask for a change about it | MED | LOW | VVRaider23 |
| 11 | Guided tour | A narrator builds a real app with you and can do each step | HIGH | MED | VVRaider23 |
| 12 | Command palette | ⌘K or Ctrl+K: jump anywhere or run any action | MED | LOW | VVRaider23 |
| 13 | Real accounts, GitHub, AI | Turned on by settings; demo mode without them | MED | MED | VVRaider23 |
| 14 | Two ways in, and Developer tools | Describe it or bring your code; the code, build log and API keys up front for developers, tucked away for everyone else | HIGH | LOW | VVRaider23 |
| 15 | Instant screens | Placeholders shaped like the next screen, a thin progress line, and every project screen loaded in the background | MED | LOW | VVRaider23 |

**P2: waits for a pilot customer**

| # | Feature | Trigger |
|---|---|---|
| 16 | Real hosting | A pilot needs a real deployment |
| 17 | Real connections (Gmail, claims system, Slack) | A pilot names the systems |
| 18 | More domains than insurance claims | Two pilots outside insurance |
| 19 | "Coming from today's Architect?" guide | Current Architect users can't find what they know |

**Deliberately not building:** a code editor (the developer has one), billing, a marketplace, a mobile app.

## 14. What we'll measure (events)

Not wired to an analytics tool yet (named gap). Every event below is already recorded in the app's audit trail 🟢, which is where the analytics events would come from.

| Event | Properties | Fires when | Answers |
|---|---|---|---|
| `project_started` | mode (guided / one shot / import) | A project is created | Funnel start |
| `plan_approved` | framework | Build it pressed | Funnel |
| `build_finished` | seconds, first score | First test run done | Time to first result |
| `expert_invited` | | Invite sent | H2 reach |
| `answer_reviewed` | verdict, seconds on card | Meera answers a card | H2 |
| `change_applied` | fixed, broke, source (chat / fix all) | A fix goes in | H4 |
| `change_undone` | | Undo pressed | H4 |
| `pr_merged` | | Merge pressed | Funnel |
| `signoff_requested` | environment, fast lane? | Request sent | Funnel |
| `decision_made` | status, conditions | Farah decides | H3 |
| `deployed` | environment, version | Deploy / hold completes | North Star |
| `flag_sent_to_review` | count | Flags sent to Meera | Learn loop |
| `tour_step` | step number | Each tour step | H1 |

## 15. Key flows

One line per person here; the full step-by-step flows with diagrams are in [journeys.md](journeys.md).

- **Arjun (builder):** describe the app (or bring his code) → sign in (email goes straight in; GitHub asks one question about saving code) → 3 questions → plan → build → "12 of 15 match" → see what's wrong → invite Meera → Fix all → merge the pull request → ask Farah → deploy to Test → hold to go live → use it from code.
- **Meera (expert):** open the link → one card at a time → Right, Wrong (then pick the right answer) or Not sure → "All done".
- **Farah (IT):** open the request → read the ticked facts → add a condition if needed → Approve → stamp.
- **Anyone:** ⌘K to jump or act; the guided tour to see it all in three minutes.

## 16. Key logic

The rules, so they don't get decided in a chat thread later.

| # | Rule | Exception or edge case |
|---|---|---|
| 1 | Deploying needs an approved request **for that exact version** | A new change after approval needs a new request |
| 2 | **Live always needs Farah** | No fast lane to Live, ever |
| 3 | The **fast lane** only goes to Test, only if every launch rule passes, it isn't the first launch, and the change didn't widen what data the agents can reach | Adding Slack alerts widens access, so it closes the fast lane until the next approval |
| 4 | Launch rules: every high-risk example passes; at least 95% of examples match; an expert reviewed within 14 days; personal data is masked | Farah can change the numbers and turn rules off in Settings; builders can see them but not change them |
| 5 | Every change reruns every example and reports fixed and broke | |
| 6 | **Merge is blocked** if a change broke any example | |
| 7 | Only the **latest** change can be undone | Trying an older one explains why it can't |
| 8 | When Meera marks an answer wrong, a **similar new example** is added, so a fix can't just memorise one case | |
| 9 | If Meera says the app was right and the Answer Key was wrong, the Answer Key is updated | |
| 10 | Meera and Farah **never see code** | |
| 11 | Going live needs a **press-and-hold** (about a second); letting go early cancels | Space or Enter can be held too |
| 12 | API keys are per environment and version | A key for Test runs the version on Test, not the latest |

## 17. User stories

### Job 1: Build an app (Arjun)

| # | Story | Acceptance criteria | Traces to |
|---|---|---|---|
| U1 | As a builder, I want to describe the app in a sentence and see a short plan, so I know what I'm approving | (1) 3 questions, one at a time, keys 1-3 (2) a 4-line plan, framework choice, cost (3) nothing builds before Build it | §2 builder trait |
| U2 | As a builder, I want to see the app build and get a score, so I know if it works | (1) progress with time left (2) a first test run (3) "12 of 15 match" with the misses named | §1.1 |
| U3 | As a builder, I want to import my own repo, so I don't start over | (1) search or paste a repo (2) a one-line summary of what was found (3) a plan that starts from the repo | Brief 🟡 |

### Job 2: Prove the answers (Meera and Arjun)

| # | Story | Acceptance criteria | Traces to |
|---|---|---|---|
| U4 | As a builder, I want to invite the expert by name, so she gets the answers to check | (1) type "me" → Meera (2) she never sees code | §1.1 |
| U5 | As an expert, I want to mark answers right or wrong in plain words, so my knowledge becomes the standard | (1) one card at a time (2) R / W / N keys (3) after W, pick the right answer (4) "Saved as a test" | H2 |
| U6 | As a builder, I want one button to fix what's wrong, with a way back, so I can move fast safely | (1) Fix all → rows turn right one by one (2) "Nothing else broke" (3) Undo in the message | H4 |
| U7 | As a builder, I want each fix as a pull request with its checks, so the code history stays honest | (1) checks tick in turn (2) Merge only when all pass | §2 builder trait |

### Job 3: Approve the launch (Farah)

| # | Story | Acceptance criteria | Traces to |
|---|---|---|---|
| U8 | As IT, I want one page of facts from the test runs, so I can decide without a meeting | (1) every line from runs and reviews (2) who will use it | H3 |
| U9 | As IT, I want to add conditions, so I can say yes with limits | (1) pick from a short list (2) conditions show on the decision | H3 |
| U10 | As IT, I want to set launch rules once, so small safe updates don't need me | (1) rules in Settings (2) fast lane only to Test | §16 rules 3-4 |

### Job 4: Ship and learn (Arjun)

| # | Story | Acceptance criteria | Traces to |
|---|---|---|---|
| U11 | As a builder, I want to deploy to a pilot group first, so problems surface small | (1) Preview → Test → Live track (2) Live locked until approved | §16 rule 2 |
| U12 | As a builder, I want going live to be deliberate, so it never happens by accident | (1) press and hold (2) letting go cancels | §16 rule 11 |
| U13 | As a developer, I want to call the app from our systems, so it fits what we have | (1) a key per environment (2) code snippets (3) a test request with the real response | Brief 🟡 |
| U14 | As a builder, I want flags from real use to become tests, so the same mistake can't come back | (1) pick flags (2) they go to Meera (3) her answers become tests | §8 |

### Job 5: Get around (anyone)

| # | Story | Acceptance criteria | Traces to |
|---|---|---|---|
| U15 | As anyone, I want to jump or act from the keyboard | ⌘K / Ctrl+K on every screen; arrow keys and Enter | Design |
| U16 | As a newcomer, I want to see the whole thing without reading, so I get it in minutes | A guided tour that builds a real app and can do each step | H1 |
| U17 | As a demo viewer, I want to see it as each person | A "View as" switch: Arjun, Meera, Farah | H1 |

## 18. Trade-offs, limits, dependency risks

**What this doesn't solve**

| Area | Honestly |
|---|---|
| Whether the AI is actually right | It shows where it's wrong against the expert's examples; it can't know what nobody wrote down |
| Real hosting | Simulated inside the prototype |
| Domains beyond insurance claims | One worked example |

**Trade-offs we made on purpose**

| Trade-off | What we gave up | Why |
|---|---|---|
| Rules engine instead of live model calls for agent decisions | Realism of model variance | Every visitor sees the same story (12 of 15, then fixed), and the same rules run in the generated Python tests |
| Simulated hosting | Real deployments | The demo always works |
| A "View as" switch | Real three-account setup in the demo | One visitor can play all three people |
| One job per screen | Seeing everything at once | Newcomers weren't able to follow the dense version (§1.3) |

**Dependency risks**

| Risk | If it bites | Early warning |
|---|---|---|
| GitHub OAuth rules change | Sign-in with GitHub and pushes stop | `/api/health` shows GitHub off; sign-in errors |
| AI provider outage | Chat answers fall back to scripted replies | Chat stops marking answers "AI" |
| Neon or Postgres outage | Accounts can't sign in; demo mode still works | "Not saved yet" badge |

## 19. The moonshot

**From "a tool that builds agent apps" to "the place a company approves any AI app".** If every app carries its Answer Key and its Launch Pack, then importing *any* repo (built in any tool) gives IT the same one-page decision. Architect becomes the approval layer for all of a company's AI, and the expert's examples become an asset that outlives any one model or framework.

**Why not now:** it needs real hosting, real connections and proof that experts and IT will actually use the loop (H2, H3). **If validated,** the flywheel is: more apps → more examples → faster, safer approvals → more apps. A general-purpose coding tool can't copy it without inviting the expert and IT in, which changes what the tool is.

---

# PART C — HOW

---

## 20. Milestones

| Milestone | Owner | Planned | Actual | Comments |
|---|---|---|---|---|
| Brief read and the big idea chosen (three people, one loop) | VVRaider23 | 2026-09-24 | 2026-09-24 | |
| First working prototype, live | VVRaider23 | 2026-09-28 | 2026-09-28 | |
| **Premortem** | VVRaider23 | Before the pilot | Not run | Named gap: run before any real pilot |
| Stage A: the grey-black look | VVRaider23 | 2026-09-29 | 2026-09-29 | |
| Stages B and C: 22 one-job screens, small interactions | VVRaider23 | 2026-09-29 | 2026-09-29 | |
| Stage D: retest everything, new demo video, docs | VVRaider23 | 2026-09-29 | 2026-09-29 | |
| Submission: live link and repo | VVRaider23 | 2026-09-29 | | |
| Analytics wired from the audit trail | VVRaider23 | Before the pilot | | Gate for reading §9 |
| Expert review test (5 experts) | VVRaider23 | Before the pilot | | The riskiest assumption |
| Pilot with 3 three-person teams | VVRaider23 | After the tests | | |
| **Postmortem** | VVRaider23 | After the pilot | | Grades the §10 hypotheses |

## 21. Operational checklist

| Team | Question | Y/N | Action |
|---|---|---|---|
| Analytics | More tracking needed? | Y | Wire §14 events from the audit trail |
| Languages | More than one language? | N | English only for the prototype |
| Internal teams | Training needed? | N | The guided tour is the training |
| Partners | Anyone external affected? | Y | GitHub (OAuth app), the AI provider, Neon; all optional |
| Legal | Legal questions? | N for the prototype | Trigger: the first pilot with real customer data needs a data review |
| Risk | New risks? | Y | Customer data in a pilot: personal-data masking is a launch rule and on by default |

## 22. Getting it in front of people

The submission is the launch: the live link, the repo, a short demo video, and a guided tour that explains itself. There is no other go-to-market motion for a prototype.

## 23. Rollout and phasing

- **Now (prototype):** everything in §13 P0 and P1, in demo mode, with real accounts, GitHub and AI when keys are set.
- **Next (after the expert and IT tests pass):** a pilot with 3 teams that each have a builder, an expert and an approver. Read §9.
- **Later (parked):** real hosting and connections (unpark when a pilot needs them); more domains (unpark after two pilots outside insurance).

---

# PART D — WORKING SECTION

---

## 24. Meeting notes

There were no meetings; decisions were made in working sessions and are logged in [journeys.md → Decisions](journeys.md#decisions) and [design.md → Decisions](design.md#decisions).

## 25. Open questions

| Question | Owner | Deadline or trigger |
|---|---|---|
| Will experts review without help? | VVRaider23 | Before the pilot (the riskiest assumption) |
| Is the Launch Pack enough for IT, or what's missing? | VVRaider23 | Before the pilot |
| What should pricing look like: per app, per seat, per test run? | VVRaider23 | Only if the pilot succeeds |

## 26. Decision log

Decisions that took real time live in [journeys.md](journeys.md#decisions) (flows) and [design.md](design.md#decisions) (look and behaviour). Each has a "reopen if" note so it isn't argued twice.

---

*Evidence sources: the assignment brief as other applicants published it (the original link was blocked for us); docs.architect.new; our own automated click-through tests of the prototype (2026-09-29).*
