# Design decisions

Why Architect 2.0 looks and works the way it does. Short version: **building an agent app is no longer the hard part; getting people to trust it is.** Every screen is designed around that.

## 1. Starting from the problem, not the feature list

Watch an agent app die in a real company and it rarely dies in the build. It dies in the gap after the demo:

- The **business expert** (a claims lead, a nurse, a compliance analyst) is the only person who knows whether an answer is right, but she can't read code or eval dashboards. Her feedback arrives as screenshots in chat.
- The **IT approver** has to say yes to something that touches customer data, but gets a slide deck instead of evidence.
- The **builder** is stuck in the middle, translating between them by hand.

So Architect 2.0 is built for three people, not one:

| Person | The question they own | What the product gives them |
|---|---|---|
| Arjun, builder | "Does it work?" | Prompt-to-app build, code in any framework, GitHub, change receipts |
| Meera, expert | "Are the answers right?" | A review queue in plain words. Right, wrong or not sure. Her corrections become tests. |
| Farah, IT | "Is it safe to launch?" | Launch rules she sets once, and a one-page Launch Pack built from evidence |

## 2. One loop, and the loop is the menu

**Build → Prove → Sign off → Ship → Learn**, then back to Build when people flag answers.

The first version of this prototype had a status bar, a row of seven tabs and a stage label, each telling the same story differently. First-time visitors couldn't tell where they were. Now the project screen has **one menu, and it is the loop itself**:

- Each step shows its state: done (✓), happening now (blue), or not yet (grey).
- Build holds the four screens a builder works in, in Architect's order: **Plan → Agents → App → Code**.
- Every step opens with **the question it answers**, who does it and what unlocks it ("Are the answers right? Meera checks answers, Arjun fixes what fails.").
- A **Next** line and **one main button** (top right, where Architect puts Deploy) always agree on what to do next.

## 3. Decisions, and what we rejected

| Decision | Why | What we didn't do |
|---|---|---|
| The expert owns the **Answer Key** (example cases with the expected answer) | The person who knows the right answer should define it. Her corrections turn into tests automatically. | Builder-written test suites the expert never sees |
| The expert **never sees code** | Review is a card: the claim, what the assistant said, why. Right / Wrong / Not sure, with keyboard shortcuts. | Showing traces or JSON to non-engineers |
| Every change gets a **receipt** | Files changed, examples fixed, examples broken, cost. Undo and a pull request are one click away. | "Done!" messages you have to trust |
| The **Launch Pack is generated**, never typed | Every line comes from a test run, a review, a setting or a commit. | An approval request the builder writes |
| **Launch rules** plus a **fast lane** | IT decides once what needs them. Small, safe changes go straight to Test and still show in the audit trail. | Asking IT to approve every change |
| **Framework-neutral** agents | Agents are described once (`agent.yaml`) and generated for LangGraph, CrewAI, OpenAI Agents SDK, Google ADK or Lyzr. The code lives in your GitHub. | Locking developers into one runtime |
| **Learn by doing**: a guided tour | A narrator builds a real app with the visitor, highlights the button to press, switches people, and can do each step for them. | A wall of onboarding text or a video you can't touch |
| **Plain words** | "3 wrong answers, all theft claims", "test run", "Launch Pack". | "Eval failures", "regression suite", "deployment gate" |

## 4. What we kept from today's Architect

The prompt box as the front door, the **AI Consultant**, the **prompt library**, the **+ menu** (attach files, add Lyzr Studio agents), **Guided or One Shot** building, a plan (PRD) before anything is built, **Plan → Agents → App**, **Edit in Lyzr Studio**, app **themes**, **Deploy** with a custom domain, **Import** a GitHub repo, **Export to my GitHub**, **environment variables** and a **usage** breakdown behind the credits count.

## 5. What's new

Prove (Answer Key, expert review queue, test runs on every change), Sign off (launch rules, Launch Pack, conditions, fast lane), Ship (Preview → Test pilot → Live, rollback), Learn (flags from real users become tests), three roles, code view and download, real GitHub pushes and pull requests with the test report, and an agent playground.

## 6. The flow, end to end

Sign in (email, GitHub or no sign-in) → set up a workspace and connect GitHub → describe the app on Home → answer three questions → approve the plan → watch it build → see the app in test mode → invite the expert → she reviews → fix with a receipt and a pull request → request sign-off → IT approves with conditions → deploy to Test → people flag answers → they become tests.

## 7. Trade-offs we made on purpose

- The agents' decisions come from a rules engine, not live model calls, so the story (12 of 15, then fixed) is the same for every visitor. Open questions in chat, the agent playground and the AI Consultant do call a real model when a key is set.
- Whole-app generation is scripted; the generated code is real and its tests run with `pytest`.
- Hosting is simulated inside the prototype (`/apps/<id>`), so the deployed app always works during a demo.
- The **View as** switch lets one visitor play all three people. In a real workspace each person signs in as themselves.
