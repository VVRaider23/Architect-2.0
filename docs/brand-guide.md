# Architect 2.0 — Brand Guide

> **Calm until something needs you.** The screen stays quiet; colour and motion only appear to show the next step, a result, or a risk.

**See it rendered:** [architect-2-0-alpha.vercel.app/brand-guide.html](https://architect-2-0-alpha.vercel.app/brand-guide.html): every token, the type scale, the motion curves and working components, in the night and paper themes (source: [`public/brand-guide.html`](../public/brand-guide.html)).

---

## Visual idea

**A drafting table at night: grey-black, precise, with one light on the thing that matters next.**

Architect 2.0 is where an app gets built *and proven*, so it borrows from the drafting table: a faint grid, thin exact lines, a title block, and a drawing that fills in as the app is built. The dark workspace is for building, and it sits comfortably next to the tools builders already live in (code editors, terminals). The people who never touch code, Meera and Farah, get **paper**: the same system in a light theme, because their job is reading and deciding.

**Rule:** only one thing on a screen may use the accent colour, and it's the next step.

---

## Typography

One family, two cuts. The same type runs on every surface; hierarchy comes from size and weight, not from mixing fonts.

**Display and UI: Geist Sans** (Vercel, open source): neutral, sharp and very readable at small sizes. It feels engineered without feeling cold.
- 600 (semibold): headlines, button labels, key numbers
- 500 (medium): labels, tabs, list titles
- 400 (regular): body text, descriptions

**Data and code: Geist Mono**: the same shapes, fixed width.
- Code, file names, claim IDs (`C-1043`), keys, the build drawing's labels

**Font loading:** the `geist` package through Next.js font loading (`geist/font/sans`, `geist/font/mono`), exposed as `--font-geist-sans` and `--font-geist-mono`. No external requests, no flash of a fallback font.

```tsx
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
<html className={`${GeistSans.variable} ${GeistMono.variable}`}>
```

### Type scale

| Context | Font | Weight | Size | Tracking |
|---|---|---|---|---|
| Welcome headline | Geist Sans | 600 | 54 px (40 px on phones) | −0.035em |
| Screen headlines | Geist Sans | 600 | 34 px (30 px on phones) | −0.02em |
| Card and dialog titles | Geist Sans | 600 | 17–22 px | −0.01em |
| Body, descriptions | Geist Sans | 400 | 15–17 px, line height 1.6 | 0 |
| Buttons | Geist Sans | 500 | 13–15.5 px by size | 0 |
| Labels, small print | Geist Sans | 500 | 12.5–13.5 px | 0 |
| Code, IDs, drawing labels | Geist Mono | 400 | 11–13.5 px | 0 |

Numbers that change (scores, credits, times) use tabular figures so they don't jiggle as they count.

---

## Colours

All colours live in one place (`src/app/globals.css`) as CSS variables, so the whole look can change in one file. The **night** theme is the default; **paper** switches on by adding the `paper` class to any area.

### Night (builders' workspace)

| Token | Value | Use |
|---|---|---|
| `bg` | `#0B0C10` | Page background |
| `surface` | `#0F1016` | Panels, cards |
| `surface2` | `#151720` | Raised: menus, inputs, secondary buttons |
| `sunken` | `#1B1E29` | Hover and quiet fills |
| `line` | `#212431` | Borders, dividers |
| `line2` | `#2C3041` | Stronger borders, tracks, the active tab |
| `ink` | `#ECEDF3` | Main text |
| `ink2` | `#A4A7BA` | Secondary text |
| `ink3` | `#808399` | Quiet text: hints, timestamps, placeholders |

### Paper (Meera and Farah, and printing)

| Token | Value | Use |
|---|---|---|
| `bg` | `#F6F5F1` | Page background, warm paper |
| `surface` | `#FFFFFF` | Cards |
| `surface2` | `#F3F2ED` | Raised fills |
| `sunken` | `#ECEBE5` | Hover |
| `line` / `line2` | `#E4E2DB` / `#D3D1C8` | Borders |
| `ink` / `ink2` / `ink3` | `#17181E` / `#555867` / `#6B6E7E` | Text, from strongest to quietest |

### Accent: Iris

Iris (`#8B93FF` on night, `#4B55D9` on paper) marks **the next step**: the main button, the current journey step, the focus ring, a selected option, the build drawing's lines.

Where it appears:
- The one main button on each screen (with a soft glow on night)
- The "happening now" dot in the journey bar
- Focus rings, selected radio and menu ticks
- The lines of the build drawing and the ship track

**Cap:** at most about 5% of any screen. If two things are iris, one of them is wrong.

### Semantic (status only)

| Token | Night | Paper | Use |
|---|---|---|---|
| `ok` | `#3DD68C` | `#11703A` | Right answers, passed checks, Live |
| `warn` | `#F5B94A` | `#9A5B00` | Needs attention: warnings, "On Test", high-risk labels |
| `bad` | `#FF6B6B` | `#C2362F` | Wrong answers, failed checks, blocked |

Each has a **soft** background and a **line** border for tags (night: `ok-soft #11241F`, `ok-line #1C513A`, `bad-soft #28171B`, `bad-line #5E2C2F`, `warn-soft #272117`, `warn-line #5B4724`; paper: `ok-soft #E3F2E8`, `bad-soft #FBE9E7`, `warn-soft #FBF0D9`). There is no separate "info" colour: information is iris or plain text.

### Special palettes

- **Code** has its own darker ground so it reads as a different material: `code #090A0E`, `code-ink #D4D6E2`, `code-dim #70748A`, `code-add #10261E`, `code-del #2C1417`.
- **Merged** pull requests use a single purple, `#B79CFF`, the only colour outside the system, because "merged" has meant purple on GitHub for years.
- **The generated app** (Harborline Claims) is not Architect. It has its own light look and theme presets, and it always sits inside a paper frame so it never borrows Architect's colours.

### Contrast (WCAG)

| Pair | Ratio | Grade |
|---|---|---|
| Night `ink` on `bg` | 16.7 : 1 | AAA |
| Night `ink3` on `bg` | 5.2 : 1 | AA |
| Night text on iris button | 7.2 : 1 | AAA |
| Night `ok` on `ok-soft` | 8.6 : 1 | AAA |
| Night `bad` on `bad-soft` | 6.2 : 1 | AA |
| Paper `ink` on `bg` | 16.2 : 1 | AAA |
| Paper `ink3` on `bg` | 4.6 : 1 | AA |
| Paper white on iris button | 5.8 : 1 | AA |
| Paper `ok` on `ok-soft` | 5.3 : 1 | AA (was 4.3 before the green was darkened) |
| Code `code-dim` on `code` | 4.3 : 1 | AA Large only: used only for line numbers, never for content |

---

## Logo

```
[A]  Architect
```

- **The mark:** a rounded square (`#15171F`, border `#2C3041`) holding an **A** drawn as two strokes in `#ECEDF3`, with the crossbar in iris `#8B93FF`: a drafting A, and the crossbar is the "light on the next step".
- **Wordmark:** "Architect" in Geist Sans 600, tracking −0.01em, in `ink`. On project screens the wordmark drops and only the mark shows, followed by the project name.
- Not an icon of a building, not a gradient, not a mascot.
- Sizes: 26 px in top bars, 20 px next to chat messages, 18 px on the deployed app's strip.
- **Favicon:** the mark alone (`src/app/icon.svg`).

---

## Surfaces

1. **Get in** (Welcome, Sign in, Setup): the drafting grid behind one centred column; only the logo on top.
2. **App shell** (Home, Projects, Usage, Settings): top bar and a short side menu with the credits meter.
3. **Focus** (most project screens): one column in the middle, nothing on the sides.
4. **Workspace** (App, Agents, Code): the chat on the left, the thing you're looking at on the right.
5. **Paper** (Meera, Farah): light, plain, one column.

Layout details for each are in [design.md](design.md#layouts).

---

## Motion

### Principles

1. **Motion explains cause and effect.** Something moves because you did something, or because something finished. Never for decoration.
2. **Fast out, gentle stop.** Things start quickly and settle softly. Nothing bounces.
3. **Nothing loops,** except loaders and the green "live" pulse.
4. **"Reduce motion" wins.** With it on, everything is instant.

### Curves and times

| Name | Curve | Used for |
|---|---|---|
| out | `cubic-bezier(0.23, 1, 0.32, 1)` | Almost everything: pop-ins, fades, glides |
| in-out | `cubic-bezier(0.77, 0, 0.175, 1)` | Things travelling between two places (the ship dot) |
| drawer | `cubic-bezier(0.32, 0.72, 0, 1)` | Drawers and panels sliding in |

Press 110 ms · hover and colour 150 ms · pop-in 150 ms · fades and slides 160–260 ms · drawers 300 ms · the ship dot 900 ms · the score ring 1,000 ms · each layer of the build drawing 1,100 ms.

### Keyframes

```css
fade-in     /* opacity only, 160 ms: things appearing in place */
slide-up    /* 6 px up + fade, 220 ms: revealed details */
slide-left  /* 24 px from the right, 260 ms: the next question */
screen-in   /* 8 px up + a 3 px blur clearing, 260 ms: every screen's entrance */
pop-in      /* scale 0.96 → 1, 150 ms: menus, modals, chips */
toast-in    /* 10 px up + blur clearing, 260 ms */
stamp       /* scale 1.25 → 1 at −4°, 360 ms: Farah's stamp */
shake       /* ±6 px, 320 ms: a bad input */
countdown   /* a line shrinking, for as long as a toast stays */
landed      /* a ring pulsing out of the ship stop */
```

---

## Visual texture

### 1. The drafting grid (Welcome, Building, the App canvas)

A 32 px grid of lines at 3.5% of the text colour. Felt more than seen.

```css
background-image: linear-gradient(rgb(var(--ink) / 0.035) 1px, transparent 1px),
                  linear-gradient(90deg, rgb(var(--ink) / 0.035) 1px, transparent 1px);
background-size: 32px 32px;
```

### 2. Drawn lines (the build drawing)

Every line has `pathLength="1"` and animates its dash offset from 1 to 0, so it writes itself from start to end. Strong lines are 1.6 px iris; guide lines are 1 px iris at 50%. Labels are Geist Mono 11 px. A title block sits bottom right ("Sheet 1, plan v1").

### 3. The glow

The main button on night carries a faint iris glow (`0 10px 30px -12px` iris at 55%), the only soft light on the screen. It's what makes "the next step" findable at a glance.

---

## Spacing

Base unit **4 px**.

| Value | Common use |
|---|---|
| 4 px | Icon to text in small chips |
| 8 px | Between related controls |
| 12 px | Inside compact rows; between buttons |
| 16 px | Page gutters on phones; card padding (small) |
| 20 px | Card padding |
| 24 px | Between groups |
| 32–40 px | Between sections of a screen |
| 8% of the screen height | Space above a Focus screen's headline |

---

## Shape

| Element | Radius |
|---|---|
| Buttons | 8–12 px (grows with size) |
| Inputs | 10 px |
| Cards, lists | 12–16 px |
| Dialogs, palette | 16 px |
| The hold button | 14 px |
| Avatars, dots, chips | round |
| Tags | 6 px |

---

## Icons

[Lucide](https://lucide.dev), 16 px in buttons and lists (14 px in small ones), stroke 2. Icons always sit next to words, except where a tooltip or label names them (search, close, copy). No brand logos are drawn; "Continue with GitHub" uses a branch icon.

---

## Breakpoints

| Width | What changes |
|---|---|
| < 640 px | Headlines step down (54 → 40, 34 → 30); some button labels become icons |
| < 768 px | The side menu becomes a row of tabs; the app preview starts in its phone layout |
| < 1024 px | The journey bar hides (search, Deploy and person switch stay); the chat becomes a drawer |
| ≥ 1280 px | The chat widens to 360 px; secondary labels (Open, Download) appear |

---

## Voice

Architect talks like a calm senior colleague: short sentences, plain words, numbers as digits, and always what happens next.

**Fixed conventions**
- Headlines are the question or the answer: "Who can use it?", "3 answers are wrong".
- Buttons are verbs that say what will happen: "Fix all 3", "Deploy v2 to Test". Busy and done use the same verb: Deploy → Deploying → Deployed.
- People are named: "Ask Meera", "Waiting for Farah", never "the reviewer".
- Errors say what to do next, never whose fault it was.

**Tone rules**
- No exclamation marks, no jokes, no "Oops".
- No jargon a claims handler wouldn't use.
- Honest about what's simulated: "In demo mode the repo is simulated."

**Words**

| We say | We don't say |
|---|---|
| Wrong answers | Failed evals, regressions |
| Test run | Eval run, CI suite |
| Answer Key | Golden dataset |
| Launch Pack | Compliance artifact |
| Test / Live | Staging / production |
| Flag | Feedback event |
| Agent (an AI worker with one job) | Autonomous entity |

---

## What this brand is NOT

- Not neon. One accent, used sparingly, never a gradient.
- Not "AI magic": no sparkles, glowing orbs or robot mascots.
- Not a dashboard: no walls of charts, no numbers without a sentence around them.
- Not busy: never two main buttons on one screen.
- Not cute: no confetti, no bouncing, no exclamation marks.
- Not dark everywhere: people who read and decide get paper.
