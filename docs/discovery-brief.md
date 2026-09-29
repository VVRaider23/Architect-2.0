# Discovery Brief: Architect 2.0, the trust gap

**Promoted from Idea Log:** 2026-09-24 | **Owner:** VVRaider23 | **Status:** Promoted to PRD (with the riskiest assumption still to be tested, see below)

> This document asks one question: is there a real problem here worth building for? It grades the evidence honestly. The solution lives in the [PRD](prd.md).

---

## Confidence tags

🟢 We checked it ourselves · 🟡 Someone else's data or docs · 🔵 A belief we haven't proven · 🔴 We were wrong (kept visible)

---

## The problem, as best we understand it

Teams in companies with strict rules (insurers, banks, hospitals) can now build an AI agent app quickly. The frameworks and the prompt-to-app tools make the building part fast 🟡. What they can't do quickly is get the app **trusted**. Two people stand between a demo and real use: the **business expert**, who is the only one who knows whether an answer is right, and the **IT approver**, who must say yes to anything that touches customer data. Today, the expert's checks travel as screenshots in chat, fixes silently break other answers because nobody tests answers after every change, and IT is handed a slide deck instead of evidence 🔵. The cost is apps that stay demos. We believe this is real because it is the obvious gap between "the app works on my screen" and "the company lets people use it" 🔵, but we have **not** interviewed anyone yet. That is the named gap in this brief.

## ICP (who has this problem)

- **Structural condition:** an AI app can only go live after **three different people agree**: someone who builds it, someone who knows the right answers, and someone who approves the risk. It does not matter what industry or company size; if any one of the three can block the launch, this problem exists.
- **Explicitly excluded:**
  - Solo builders making apps for themselves (no expert or approver to convince).
  - Consumer apps where "good enough" is fine and nobody signs off.
  - Teams whose AI never touches customers or their data (IT has nothing to approve).

## Riskiest assumption

- **The assumption:** *A domain expert will check an agent's answers regularly if the review is plain words, one case at a time, and each correction visibly becomes a test.*
- **Why this one:** everything downstream depends on it. The Answer Key is only as good as the expert's corrections; the Launch Pack is only convincing if an expert actually reviewed the answers; the learning loop needs her to confirm flags. If experts won't review, Architect 2.0 is just another app builder.
- **Cheapest test that would prove it wrong:** put the review screen in front of 5 real domain experts (claims handlers, nurses, compliance analysts) with 15 real-looking cases each. Watch without helping. If fewer than 3 of 5 finish, or they take more than about a minute per case, the assumption is in trouble.
- **Test result:** 🔵 not run yet. The prototype has the exact screen ready for it (Meera's review screen, keys R, W and N).

## Evidence

| Claim | Evidence | Source | Confidence |
|---|---|---|---|
| The next Architect must serve both non-technical builders and developers | The assignment brief asks for this: sign-in, home, chat, live preview, agents, the screens being built, GitHub and publishing, plus "go beyond this list" | The brief as published by other applicants (the original link was blocked for us) | 🟡 |
| Judges score design and flow first, then feature coverage; working features are a bonus | Same brief | As above | 🟡 |
| A common answer is "one project, two views" (a simple one for business users, a technical one for developers) | Several public submissions take this approach | Our reading of public repos, Sept 2026 | 🟡 |
| Today's Architect already has a prompt box, AI Consultant, a plan before building, Guided or One Shot, agents, app preview, deploy and GitHub import | Documented features | docs.architect.new | 🟡 |
| Experts' feedback travels as screenshots and IT gets slide decks | A pattern we believe is common | No interviews yet | 🔵 |
| When nobody reruns the examples, a fix can break other answers without anyone noticing | The prototype reruns every example after each change and shows "fixed X, broke Y", so a break can't go unnoticed. How often breaks happen in real apps, we haven't measured | Our engine (that a break is caught) / real apps (how often) | 🟢 / 🔵 |
| ~~A single project screen with a chat, a status bar and seven tabs is clear enough for a first-time visitor~~ | Walking through our first version as a newcomer, it was not clear where to look or what to do next | Our own walkthrough | 🔴 → replaced by one-job screens |

## Steelman: the strongest case against doing this

"Nobody buys a product for the approval step. Builders pick tools that make building faster, and the approval problem is solved by process, not software: a spreadsheet of test cases and a meeting with IT. Adding two more people to the tool adds friction for the builder, who is the one choosing the tool. And the big AI coding tools will add evals and approvals as a feature within a year."

Is it wrong? Partly not. The builder is the buyer, so Architect 2.0 must be at least as fast to build with as today's Architect, which is why Build still comes first and the expert and IT steps only appear when there is something for them to do. But the spreadsheet-and-meeting process is exactly what fails: it doesn't rerun after every change, and it produces no evidence IT can trust later. And a coding tool adding an "evals" tab still leaves the expert and IT outside the editor. The defensible part is not the test runner; it is **a workflow the expert and IT can use without an engineer in the room**. That is only true if the riskiest assumption holds.

## What would have to be true

1. Experts will review answers when it's plain words and quick. 🔵 Test planned (above).
2. IT will accept a generated one-page Launch Pack plus launch rules as enough evidence for a small pilot. 🔵 Test: show 3 IT approvers the Launch Pack and ask what's missing.
3. Builders will keep using it because the build itself is fast and the code is theirs (their framework, their GitHub). 🟢 in the prototype: prompt to first test run in about 21 seconds; code in five frameworks; real GitHub pushes and pull requests when connected.
4. The loop works end to end without an engineer translating. 🟢 in the prototype: the automated click-through runs build, review, fix, sign-off, deploy and flags as all three people with no errors.

---

## Exit criteria for this stage

- [x] Riskiest assumption named and graded (🔵, with a concrete test planned, not left open-ended)
- [x] ICP defined by a structural condition (three people must agree), not a demographic
- [x] Steelman argued honestly, including where it is right
- [x] Decision: **promote to PRD**, and run the expert-review test before any real pilot. Promoting now is deliberate: the assignment calls for a working prototype, and the prototype is the cheapest way to run the test.
