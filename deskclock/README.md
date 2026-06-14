# Handoff: Desk Clock (4 cycleable designs)

## Overview
A full-screen desk clock that shows the current time and lets the user cycle between **4 visual designs**. Time is 12-hour format with an AM/PM indicator, plus the weekday and date. The chosen design persists across reloads. There are no other features — this is intentionally a single-purpose clock.

## About the Design Files
The file in this bundle (`Desk Clock.html`) is a **design reference created in HTML** — a working prototype that demonstrates the intended look and behavior. It is **not** production code to paste in directly. The task is to **recreate these designs in the target codebase's existing environment** (React, Vue, SwiftUI, native, a screensaver target, etc.) using that project's established patterns. If no codebase exists yet, pick the most appropriate framework and implement the designs there.

The prototype uses vanilla HTML/CSS/JS with `setTimeout` ticking and Google Fonts. Adapt the structure to your stack — e.g. a `<Clock>` component with a `faceIndex` state and one sub-component per face.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, and interactions are all specified below. Recreate pixel-faithfully, but feel free to substitute your codebase's own font-loading and state mechanisms.

## Core behavior (shared by all faces)
- **Tick:** update every second, aligned to the wall-clock second boundary (`setTimeout(loop, 1000 - Date.now()%1000)`).
- **Time format:** 12-hour. Hour `h12 = h % 12 || 12`. AM/PM string `h >= 12 ? 'PM' : 'AM'`.
- **Seconds:** zero-padded 2 digits (`08`).
- **Date strings:** weekday + month + day-of-month, no leading zero on the day. Examples used: full weekday `SUNDAY`, full month `JUNE`, 3-letter `SUN` / `JUN`. All uppercase.
- **Cycling:** 4 designs in a ring. Controls: ‹ / › arrow buttons, a row of 4 dots (click to jump), and keyboard ← / →. Index wraps modulo 4.
- **Persistence:** store the active face index in `localStorage` under key `deskclock.face`; restore on load (clamp to 0–3).
- **Layout:** each face fills the viewport and is centered. All sizing uses `vmin` so it scales to any screen. Switching is via `display:none` ↔ `display:flex` (NOT opacity), with a transform-only entrance animation (`scale(1.03) → scale(1)`, 0.55s) so the active face is always visible even if animation is throttled.

## Faces / Views

There are 4 faces. Each declares a `theme` of `light` or `dark`, which drives the nav control color.

### Face 1 — Minimal / Modern  (theme: light)
- **Background:** `#ECE9E1` (warm paper). **Text:** `#1b1a16`.
- **Font:** Jost.
- **Layout:** centered vertical stack, `gap: 5.5vmin`.
  - **Date** (top): `SUNDAY · JUNE 14`, weight 400, `2.1vmin`, `letter-spacing: .55em`, uppercase, color `#8c887c`, `white-space:nowrap`.
  - **Clock row** (flex, align top, `gap: 1.6vmin`):
    - **Time** `9:42` (h12 + ":" + mm, no leading zero on hour): Jost weight **200**, `font-size: 24vmin`, `letter-spacing: -.01em`, tabular-nums.
    - **Side column** (offset down with `padding-top: 3vmin`, `gap: 1.4vmin`):
      - **Seconds** `21`: Jost 300, `5.2vmin`, color `#b3afa2`, tabular-nums.
      - **AM/PM** `AM`: Jost 400, `2.6vmin`, `letter-spacing: .4em`, color `#1b1a16`.
  - **Hairline rule** (bottom): `30vmin` wide, `1px`, color `#cdc9bd`.

### Face 2 — Retro Flip  (theme: dark)
A mechanical split-flap flip clock with a real fold/unfold animation.
- **Background:** `radial-gradient(120% 90% at 50% 0%, #202024 0%, #141416 55%, #0e0e10 100%)`. **Text:** `#f3f1ea`.
- **Font:** Archivo 700.
- **Layout:** vertical stack, `gap: 4.2vmin`.
  - **Clock row** (flex, align center, `gap: 1.6vmin`): hours group, blinking colon, minutes group, small seconds group.
    - **Flip groups:** hours (2 digits, `09`), minutes (2 digits), seconds (2 digits). Hours show a **leading zero**. Seconds group is scaled `0.5` (`transform: scale(.5)`, origin center bottom).
    - **Colon:** two dots stacked, each `1.5vmin` circle, color `#56565c`, `gap: 4vmin` between them; **blinks** 50% opacity on a 1s `steps(1,end)` loop.
  - **Meta row** (flex, `gap: 2.4vmin`):
    - **AM/PM pill** `PM`: Archivo 600, `2.4vmin`, `letter-spacing: .25em`, padding `.9vmin 1.8vmin`, radius `.8vmin`, background `#26262b`, text color **`#f3b14e`** (amber), soft shadow.
    - **Date** `SUN · JUN 14`: weight 400, `2.2vmin`, `letter-spacing: .4em`, color `#9a968c`, uppercase, nowrap.
- **Flip card geometry:** width `13vmin`, height `18vmin`, font-size `14vmin`, `perspective: 340px`, radius `1.4vmin`, drop-shadow `0 1.4vmin 2.6vmin rgba(0,0,0,.45)`.
  - **Card halves:** top half background `#2b2b30` with a `1px solid rgba(0,0,0,.45)` bottom seam; bottom half background `#202024`. Each half is `height:50%; overflow:hidden`. The digit (`.num`) is absolutely positioned at full card height (`18vmin`, line-height `18vmin`); top halves anchor `top:0`, bottom halves anchor `bottom:0` — this clips each half to show the correct portion of the glyph. **Do not** use flex centering + translateY here (it causes the glyph to clip to only the top half — a bug we hit and fixed).
  - **Animation (on digit change):** an upper flap folds down `rotateX(0 → -90deg)` over `0.3s ease-in` showing the OLD digit; then a lower flap unfolds `rotateX(90deg → 0)` over `0.3s ease-out` (0.3s delay) showing the NEW digit. On `animationend`, commit the new value to the static bottom half and top flap. `backface-visibility:hidden` on the flaps. Only animate the currently-visible face; set digits instantly (no animation) when switching to this face.

### Face 3 — Typography  (theme: light)
Editorial big-type poster.
- **Background:** `#E7E2D6`. **Text:** `#15130d`. **Accent:** `#cf3f23` (vermilion).
- **Font:** Anton (single weight).
- **Layout:** full-bleed relative container, time centered; satellites absolutely positioned.
  - **Time** `9:41` (no leading-zero hour): Anton, `font-size: 40vmin`, `line-height: .82`, `letter-spacing: -.02em`, tabular-nums.
  - **AM/PM** `AM`: absolute `top:18% right:9%`, Anton `9vmin`, color `#cf3f23`.
  - **Date** `SUNDAY  JUN 14` (full weekday + 3-letter month + day): absolute `left:9% bottom:11%`, **vertical** (`writing-mode: vertical-rl; transform: rotate(180deg)`), Anton `4.4vmin`, `letter-spacing:.06em`, color `#15130d`, uppercase.
  - **Seconds** `33`: absolute `right:9% bottom:11%`, Anton `7vmin`, color `#cf3f23`, tabular-nums.

### Face 4 — Neon / Glow  (theme: dark)
- **Background:** `radial-gradient(120% 120% at 50% 42%, #0d1320 0%, #060810 60%, #030308 100%)`.
- **Font:** Orbitron 700.
- **Layout:** vertical stack, `gap: 4vmin`.
  - **Clock** (flex, align baseline, `gap: 1vmin`):
    - **Time** `9:41`: `24vmin`, color `#d6fbff`, cyan glow `text-shadow: 0 0 .6vmin #aef6ff, 0 0 1.6vmin #4fe9ff, 0 0 4vmin #16b6ff, 0 0 8vmin #0a86e0`. The colon character blinks (50% opacity, 1.1s `steps(1,end)`).
    - **AM/PM** `AM`: Orbitron 500, `5vmin`, aligned to top (`margin-top: 2vmin`), color `#ffd2f4`, magenta glow `0 0 .6vmin #ff9be8, 0 0 2vmin #ff4fd0, 0 0 5vmin #e018b0`.
  - **Meta row** (flex, `gap: 2.6vmin`):
    - **Seconds** `34`: Orbitron 400, `3vmin`, color `#bff0ff`, glow `0 0 .5vmin #7fe8ff, 0 0 2vmin #29c6ff`.
    - **Dot separator:** `1vmin` circle, `#5fe0ff`, `box-shadow: 0 0 1.4vmin #29c6ff`.
    - **Date** `SUNDAY · JUNE 14`: Orbitron 400, `2.3vmin`, `letter-spacing: .34em`, color `#8fb6cf`, uppercase, nowrap.

## Nav control (shared)
- Fixed, bottom-center, `bottom: 4.5vmin`. Pill shape, translucent `backdrop-filter: blur(8px)` background.
- Contents: ‹ button, 4 dots, › button. **No text labels** (design names are intentionally omitted).
- Buttons min 30×30px hit area. Dots `1vmin` (min 8px); active dot uses full theme color and `scale(1.3)`.
- **Theme-aware colors** via CSS vars set on the stage per active face:
  - light → `--ui: #1b1a16`, `--ui-soft: rgba(27,26,22,.42)`, `--ui-bg: rgba(27,26,22,.06)`
  - dark → `--ui: #f3f1ea`, `--ui-soft: rgba(243,241,234,.5)`, `--ui-bg: rgba(243,241,234,.1)`
- **Auto-hide:** fade the nav out after 4s of no `mousemove`/`touchstart`/`keydown`; reveal on any of those (or on hover).

## Interactions & Behavior
- Arrow buttons → prev/next face (wrap). Dots → jump to face. Keyboard ←/→ → prev/next.
- On switching to the flip face, render its digits instantly (no flip animation) so it doesn't animate from stale values.
- Colons blink once per second/1.1s. Seconds update every second on every face.
- Entrance animation per face is transform-only (scale) — never gate visibility on an opacity animation (it can freeze invisible in throttled/background render contexts).

## State Management
- `activeFace: 0..3` — current design; persisted to `localStorage["deskclock.face"]`.
- `now: Date` — re-read each tick; derive `h12`, `mm`, `ss`, `ampm`, weekday, month, day.
- For the flip face, track the previous displayed value per digit to know whether to animate.

## Design Tokens
**Colors**
- Minimal: bg `#ECE9E1`, text `#1b1a16`, muted `#8c887c` / `#b3afa2`, rule `#cdc9bd`
- Flip: bg gradient `#202024→#141416→#0e0e10`, card top `#2b2b30`, card bottom `#202024`, text `#f3f1ea`, amber `#f3b14e`, muted `#9a968c`, dots `#56565c`
- Typography: bg `#E7E2D6`, text `#15130d`, accent `#cf3f23`
- Neon: bg gradient `#0d1320→#060810→#030308`, cyan text `#d6fbff` (glows `#aef6ff/#4fe9ff/#16b6ff/#0a86e0`), magenta `#ffd2f4` (glows `#ff9be8/#ff4fd0/#e018b0`), seconds `#bff0ff`, date `#8fb6cf`, dot `#5fe0ff`
- Nav: see theme vars above

**Typography**
- Jost (200/300/400) — Minimal & nav
- Archivo (600/700) — Flip
- Anton — Typography
- Orbitron (400/500/700) — Neon
- All from Google Fonts. Numeric displays use `font-variant-numeric: tabular-nums`.

**Spacing / radius / motion**
- All measurements in `vmin` (see per-face specs). Card radius `1.4vmin`; AM/PM pill radius `.8vmin`; nav pill fully rounded.
- Flip fold/unfold 0.3s + 0.3s; face entrance 0.55s `cubic-bezier(.2,.7,.2,1)`; colon blink 1s / 1.1s `steps(1,end)`.

## Assets
None — no images or icons. Glyphs (‹ › and dots) are text/CSS. Fonts load from Google Fonts.

## Files
- `Desk Clock.html` — the complete reference prototype (all 4 faces, nav, ticking, persistence). Included in this bundle.

## Notes
- `prefers-reduced-motion: reduce` disables the entrance animation; honor it in the rebuild.
- Respect the system clock / locale if you localize, but the reference deliberately uses English uppercase weekday/month with 12-hour AM/PM.
