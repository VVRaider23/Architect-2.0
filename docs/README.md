# Architect 2.0 · The documents

Everything behind the product, written so that someone who has never heard of it can follow along. Start here.

## Architect 2.0 in one minute

**The problem.** Building an AI agent app is now the easy part. A developer can make one in days. What stops it going live is trust: the business expert can't easily check whether the answers are right, and IT won't approve something that touches customer data without evidence. So most agent apps stay as demos.

**The idea.** One loop for the three people who have to agree before an app goes live:

| Step | Who | What happens |
|---|---|---|
| **Build** | Arjun, the builder | Describe the app in a sentence, or bring the code he already has. Architect asks three questions, shows a four-line plan, and builds it. |
| **Prove** | Meera, the expert | She marks answers right or wrong, in plain words. Every correction becomes a test that runs after every change. |
| **Sign off** | Farah, from IT | She gets one page made from the test results, not from anything the builder typed, and approves with one click. |
| **Ship** | Arjun | A small pilot group first, then everyone. Going live is press-and-hold, so it never happens by accident. |
| **Learn** | Everyone using it | People flag answers that look wrong. Each flag goes back to Meera and becomes a new test. |

**Try it:** [architect-2-0-alpha.vercel.app](https://architect-2-0-alpha.vercel.app). Press **Take the 3-minute tour**. No sign-in needed.

## The documents, in reading order

This set follows the [Builder OS](https://github.com/VVRaider23/builder-os) pipeline: each document answers one question, and each one feeds the next.

| # | Document | The question it answers | Read it if you want |
|---|---|---|---|
| 0 | [Discovery brief](discovery-brief.md) | Is this worth building at all? | The riskiest bet, and the strongest case against it |
| 1 | [PRD](prd.md) | What are we building, for whom, and why? | The problem, the users, the goals and how we'll know it worked |
| 2 | [Journeys](journeys.md) | What does each person actually do, step by step? | The flows, and the list of all 22 screens with their states |
| 3 | [Design](design.md) | How does each screen look and behave? | The layout rules, the small interactions, screen-by-screen notes |
| 4 | [Brand guide](brand-guide.md) + [the visual version](https://architect-2-0-alpha.vercel.app/brand-guide.html) (source: [`public/brand-guide.html`](../public/brand-guide.html)) | What does it look and sound like, and why? | Colours, type, motion, words we use and words we avoid, with working components in both themes |
| 5 | [Blueprint](blueprint.md) | How is it built, and how do we ship it safely? | The architecture, the data, the build plan and the launch checklist |

A postmortem comes after real people use it. Writing one now would mean inventing results, so it is scheduled, not written.

## How honest are these documents?

Every claim that matters carries a tag:

- 🟢 **We checked it ourselves** (we ran it, measured it, or read the code)
- 🟡 **Someone else says so** (public docs, the assignment brief as others published it)
- 🔵 **We believe it, but haven't proven it** (a bet, stated as a bet)
- 🔴 **We were wrong** (kept visible, with what corrected it)

We have not interviewed users yet. That is the biggest gap, and the documents say so wherever it matters instead of hiding it.

## Plain words we use

| We say | We mean | We don't say |
|---|---|---|
| **Agent** | An AI worker that does one job, such as reading an email or scoring a risk | Autonomous entity, LLM node |
| **Answer Key** | A list of example cases with the answer the expert expects | Eval dataset, golden set |
| **Test run** | Running every example through the app and counting the matches | Eval run, regression suite |
| **Wrong answer** | The app's answer doesn't match the Answer Key | Failed eval, regression |
| **Launch Pack** | The one page Farah reads before she decides | Deployment gate, compliance artifact |
| **Launch rules** | The checks Farah sets once, such as "at least 95% of answers match" | Policy engine, guardrail config |
| **Fast lane** | A small, safe update that goes to the pilot group without waiting for Farah, and still shows up in her audit trail | Auto-approval |
| **Test** / **Live** | The small pilot group / everyone at the company | Staging / production |
| **Flag** | Someone using the app says "this answer looks wrong" | User feedback event |
