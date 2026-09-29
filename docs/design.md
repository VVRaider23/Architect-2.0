# Architect 2.0 — Design

How every screen looks and behaves, and why. The colours, type and voice live in the [brand guide](brand-guide.md); the flows live in [journeys](journeys.md). The live app is the visual truth: [architect-2-0-alpha.vercel.app](https://architect-2-0-alpha.vercel.app).

## The one rule

**One screen, one job.** Every screen answers one question ("Which answers are wrong?", "Who can use it?") and has one main button. Everything else is either hidden behind a "show more", or it's on another screen.

This rule came from a mistake 🔴. The first version put a chat, a five-step status bar, seven tabs, badges and a main button on one project screen. Walking through it as a newcomer, it wasn't clear where to look or what to do next. The redesign follows *Don't Make Me Think*: fewer things per screen, obvious next steps, and small interactions that confirm every click.

## The five principles

| Principle | What it means on screen | Example |
|---|---|---|
| **One job per screen** | One headline question, one main button | S13: "3 answers are wrong" → **Fix all 3** |
| **The loop is the map** | The only project navigation is Build · Prove · Sign off · Ship · Learn, with each step done, happening now, or locked (with the reason on hover) | "Ship" is locked until Farah signs off; hovering says "Opens when Farah approves" |
| **Each person sees only their job** | Meera and Farah get light, quiet screens with no code | S16 is one card with three buttons |
| **Show what happened** | Every action answers "did it hear me?" and "what changed?" | Build it → "Starting" → "Started"; Fix all → rows turn Right one by one; a toast with Undo |
| **Plain words** | Words a claims handler would use | "3 answers are wrong", never "3 eval failures" |

## Layouts

There are four kinds of screen. Every screen in the app is one of them.

| Layout | Used for | What it is |
|---|---|---|
| **Focus** | Questions, plan, ready, what's wrong, pull request, sign-off, ship, go live, API, flags | The project top bar, then one column in the middle (560 px, or 720 px for lists), starting 8% down the screen. Nothing on the sides. |
| **Workspace** | App, Agents, Code | The project top bar, the chat on the left (340–360 px), and a sub-bar with **App · Agents · Code** tabs over the main area. |
| **Paper** | Meera's review, Farah's decision | A light theme, a plain top bar (logo, project, what this is, person), one 600 px column. It should feel like reading, not building. |
| **App shell** | Home, Projects, Usage, Settings, Import | A top bar plus a short side menu (Home, Projects, Usage, Settings) and the credits meter. On phones the menu becomes a row of tabs. |

Get-in screens (Welcome, Sign in, Setup) are Focus screens with only the logo in the top bar.

### The project top bar

`[logo] / Project name · · · [ Build · Prove · Sign off · Ship · Learn ] · · · [search] [Deploy] [View as] [you]`

- **The journey** sits in the middle. Each step shows a green tick (done), an iris dot (happening now) or a lock (not yet). The step you're looking at is highlighted. Locked steps can't be clicked; hovering explains what opens them.
- **Deploy** stays where Architect has always put it, top right, but it's **locked until Farah signs off**, with the reason in a tooltip ("Opens after Farah signs off"). When there's something to deploy it turns into the main button (Deploy, Go live); once live it shows a green pulse.
- **View as** is the demo switch between Arjun, Meera and Farah.

## The component kit

All in `src/components/ui.tsx`. Each one has its small interaction built in, so every screen gets it for free.

| Component | What it's for | Built-in behaviour |
|---|---|---|
| **Button** | Every click | Sinks to 97% for 110 ms while pressed. Variants: primary (iris, soft glow), secondary, ghost, danger, dark, subtle, ok. Sizes sm–xl. Disabled looks flat, not faded. |
| **ActionButton** | Any action that takes a moment (Build it, Merge, Approve, Deploy) | Three states in one button: *label* → spinner + *busy label* → tick + *done label* in green, then it moves on. The icon swaps with a soft blur. If the action fails, it quietly goes back. |
| **HoldButton** | The one hard-to-undo step: going live | Press and hold ~1.1 s. A ring and a fill grow with the hold; "Keep holding…"; letting go early runs it back in 180 ms. Works with Space or Enter too. |
| **CopyButton** | Keys, addresses, commands, code | The copy icon swaps to a green tick with a blur, "Copied", for 1.6 s. |
| **Segmented** | App / Agents / Code, Guided / One Shot, Test / Live | A highlight glides between options; the text colour flips exactly at its edge (the highlighted copy is clipped to the active tab). |
| **Menu** | Framework, conditions, person switch, + menu | Pops in from its button; arrow keys and Enter; ticks for the chosen option. |
| **Modal** | Invite, "Run it yourself" | Opens near the top (12% down), pops in, Escape closes, focuses the first field. |
| **Tooltip** | Locked things, icons | Waits 420 ms the first time, then shows instantly while you move between tooltips. |
| **Disclosure** | "See every agent and screen", "See the full Launch Pack" | Chevron turns; content slides up. Keeps screens short. |
| **Tag / Chip** | Status (Wrong, Right, Live) and labels | A dot plus a word; colour only ever repeats what the word says. |
| **ScoreRing** | "12 of 15" | Fills over 1 s while the number counts up. Iris with a red remainder when some are wrong; green when all match. |
| **Tick** | Checks, done steps | Draws itself in 280 ms. |
| **CountUp** | Scores, credits | Counts from the old number to the new one, fast then gentle. |
| **Toast** | What just happened | Slides in with a blur. With actions (Undo, View pull request) it stays 7–8 s, shows a countdown line, and pauses while hovered. |
| **ProgressBar, Spinner, Typing** | Waiting | A 6 px bar; a spinner; three blinking dots in chat. |

## Small interactions, and why each one exists

| Where | What happens | Timing | Why |
|---|---|---|---|
| Every button | Sinks while pressed | 110 ms | Confirms the click before anything else happens |
| Prompt boxes (S1, S4, chat) | Send button wakes up (grey → iris with glow) when there's text; the hint "Press Enter to start" fades in | 200 ms | Shows it's ready, without a disabled-button puzzle |
| Sign in (S2) | A bad email shakes the form and says exactly what's missing | 320 ms | Errors feel physical and specific, not like a scolding |
| Questions (S6) | The chosen answer gets a drawn tick, then the next question slides in from the right; progress bars fill | 320 ms, 260 ms | You feel the progress; keys 1-3 make it fast |
| Plan (S7) | The four lines arrive one after another | 60 ms stagger | Reads as a list you can take in, not a wall |
| Building (S8) | A technical drawing of the app draws itself, layer by layer, as each step ticks; the test run ends with 15 small marks, 12 green and 3 red | 1.1 s per layer | Waiting becomes watching; the result is visible before it's read |
| Ready (S9) | The ring fills while the number counts up | 1 s | The score lands with weight |
| App (S10) | Select: hovering outlines a part and names it; clicking puts it in the chat | 100 ms | "Point at it and say what to change" needs no explanation |
| App (S10) | The console slides up from the bottom | 300 ms, drawer curve | Details on demand, out of the way otherwise |
| Agents (S11) | Hover an agent: everything else fades, its connections light up | 200 ms | Shows who talks to whom without a legend |
| What's wrong (S13) | Fix all: each row turns from Wrong to Right, crossing out the old answer | 140 ms stagger | You see exactly what changed, one by one |
| Toast | "Fixed 6 answers. Nothing else broke." with Undo and a countdown line | 7–8 s, pauses on hover | Moving fast is safe when there's a way back |
| Pull request (S14) | The three checks tick in turn; Merge wakes when the last one passes | 0.55 s, 1.15 s, 1.75 s | The checks read as work being done, not a label |
| Meera (S16) | The card flies off towards the answer (right → right, wrong → left); "Saved as a test" flashes | 260 ms | Her answer visibly goes somewhere |
| Farah (S17) | Ticks draw one after another; after Approve, a stamp lands at a slight angle | 360 ms | A decision should feel like a decision |
| Ship (S18) | A dot travels along the track to Test and lands with a pulse; the address appears with copy | 900 ms | "Who can use it" becomes a place you can see |
| Go live (S19) | Press and hold; the ring fills; letting go runs it back | 1.1 s | The one step that's hard to undo can't happen by accident |
| API (S20) | The key blurs into view and hides again after 6 s; the response streams in line by line | 220 ms, 60 ms per line | Secrets stay hidden by default; the response feels live |
| Flags (S21) | The button counts what's ticked: "Turn 2 flags into tests" | instant | The label always says exactly what will happen |
| Everywhere | ⌘K opens the palette; G then A / C / W / S / H / P jumps | instant | Power users never need the mouse |

**Motion rules:** things move fast and stop gently (`cubic-bezier(0.23, 1, 0.32, 1)`); drawers use a softer curve; nothing loops except loaders and the "live" pulse; everything respects "reduce motion" in the operating system.

## Screen by screen

| # | Screen | The job | Main button | The one interaction |
|---|---|---|---|---|
| S1 | Welcome | What is this, where do I start? | (Enter) | Send button wakes up |
| S2 | Sign in | Get in | Continue with GitHub | Email form shakes on a bad address |
| S3 | GitHub access | Where should the code live? | Allow code pushes | Button morphs to "Allowed" |
| S4 | Home | What should we build? | (Enter) | Starters fill the box |
| S5 | Import | Which repo? | Import claims-bot | "Found 3 agents written in CrewAI" appears |
| S6 | Three questions | Answer three quick questions | (keys 1-3) | Tick, then slide to the next |
| S7 | The plan | Is this the right plan? | Build it | Framework menu; details on demand |
| S8 | Building | What's happening, how long is left? | See the results | The drawing draws itself |
| S9 | Ready | Did it work? | See the 3 misses | Ring counts up |
| S10 | Your app | Does it look right? | (Select) | Point-and-ask |
| S11 | Agents | How does it work inside? | (click an agent) | Hover fades the rest |
| S12 | Code | Can I read the code? | Copy | Copy swaps to a tick |
| S13 | What's wrong | Which answers are wrong? | Fix all 3 | Rows turn Right; Undo toast |
| S14 | Pull request | Is the change safe? | Merge | Checks tick in turn |
| S15 | Invite | Who knows the right answers? | Send invite | Type "me", Enter picks Meera |
| S16 | Meera checks | Is this answer right? | Right / Wrong / Not sure | Card flies off |
| S17 | Farah signs off | Is it safe for these people? | Approve for Test | Stamp lands |
| S18 | Deploy | Who can use it right now? | Deploy v2 to Test | The dot travels |
| S19 | Go live | Everyone, on purpose | Hold to go live | Press and hold |
| S20 | Use it from code | How do I call it? | Send a test request | Response streams in |
| S21 | Flags | Should these become tests? | Turn 2 flags into tests | Label counts ticks |
| S22 | Palette | Do anything from the keyboard | (Enter) | Filter as you type |

## Copy rules

- **Headlines are the question or the answer**, never the name of the feature: "Who can use it?", not "Deployments".
- **Buttons are verbs, and say what will happen:** "Fix all 3", "Deploy v2 to Test", "Turn 2 flags into tests". Busy and done states use the same verb: Deploy → Deploying → Deployed.
- **Numbers are digits:** "3 answers are wrong", "12 of 15".
- **Errors say what to do:** "Add the full address, like arjun@harborline.com".
- **Nothing is blamed on the user,** and nothing is cute. No exclamation marks.
- Words we avoid, and what we say instead, are in the [brand guide](brand-guide.md#voice).

## Accessibility

- Every interactive element has a visible focus ring in the accent colour (2 px, offset 2 px).
- Everything works from the keyboard: 1-3 on questions, R / W / N and 1-4 in review, Space or Enter to hold, ⌘K, arrows and Enter in menus and the palette, Escape closes overlays.
- Status is never colour alone: every tag has a word ("Wrong", "Right", "Live").
- Contrast was checked for every text and background pair in both themes. One pair failed (green text on its soft green in the light theme, 4.33:1), so the light theme's green was darkened to `#11703A`.
- Screen readers: menus, tabs, radio groups, dialogs, progress bars and live regions (build steps, toasts, the API response) are labelled.
- "Reduce motion" turns every animation and transition into an instant change.

## On phones

- The journey bar hides below 1024 px; the Deploy button, search and person switch stay.
- The Workspace chat becomes a drawer behind a chat button.
- The app preview starts in its phone layout; the screen-size switch hides.
- Segmented controls never wrap; the side menu becomes a row of tabs.

## Decisions

| # | Decision | Why | What we didn't do | Reopen if |
|---|---|---|---|---|
| 1 | One job per screen, 22 screens | The dense version confused newcomers 🔴 | One busy project screen with tabs | People get lost moving between screens |
| 2 | The journey is the only project menu | Always know where you are and what's next | A status bar plus tabs plus a stage label | |
| 3 | Deploy locked with a reason | Explains the sign-off rule at the exact moment you want to skip it | Hiding Deploy until approved | |
| 4 | Press-and-hold to go live | Going live for everyone is the one step that's hard to undo | A confirmation dialog people click through | People find it slow |
| 5 | Paper theme for Meera and Farah | Their job is reading and deciding, not building | The same dark workspace for everyone | They'd rather match the builder |
| 6 | A drawing during the build | Turns 21 seconds of waiting into watching | A plain progress bar | |
| 7 | Undo in the toast, not a confirm dialog | Fast when right, safe when wrong | "Are you sure?" before every fix | |
| 8 | Point-and-ask in the app preview | Changing a UI by describing where is hard; pointing is easy | Only a free-text chat | |
| 9 | Keys in code read from the environment | A key pasted into code leaks | Printing the real key in snippets | |
