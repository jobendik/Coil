# COIL — CrazyGames Store Page Spec

The store page is the **top of the funnel**. CrazyGames promotes games algorithmically
on engagement KPIs, but those KPIs only accrue if people *click* the tile first.
Thumbnail click-through-rate (CTR) is therefore the single highest-leverage asset
outside the build. This doc is the launch spec for the dashboard fields.

> One-line positioning: **a tiny cosmic creature you fling between glowing gates to
> climb an endless void — one perfect tap at a time.**

> **Competitive note:** the similar game **Sticky Orbit** (May 2026, ~720 rates, 8.9/10)
> proves the niche but isn't entrenched. Position COIL *away* from its "orbit
> planets / outrun the sun" framing — lead with **creature collection + perfect tap**.
> Full read in `positioning.md`; thumbnail prompts in `asset-prompts.md`.

---

## 1. Title

Primary: **COIL**

Because "COIL" alone is short and abstract, pair it with a clarifying subtitle in the
**description's first line** (CrazyGames shows the title small; the subtitle does the
explaining). Deliberately avoid the word "orbit" so we don't read as a Sticky Orbit
clone:

- `COIL — One-Tap Cosmic Climber`
- alt: `COIL: Fling & Climb`
- alt: `COIL — Catch the Glow, Climb the Void`

Keep the dashboard **Game title** as `COIL` (brandable, searchable once it ranks);
put the descriptor in the description/preview text, not the title field.

---

## 2. Thumbnail (most important asset)

CrazyGames thumbnails are shown small, in a dense grid, often on mobile. Optimize for
**instant readability at ~256 px and strong colour contrast against a dark grid.**

**→ Ready-to-paste generation prompts for all 3 variants live in `asset-prompts.md`.**

Specs (follow the dashboard's current export sizes; design at 2×):
- Aspect: **16:9** primary (e.g. 1600×900), plus a **square 1:1** crop for
  mobile placements. Design so the focal point survives a centre-square crop.
- Safe area: keep the hero element centred; assume edges get cropped.

Composition (do **not** just screenshot the game — abstract orbs read as generic):
1. **Hero the character.** Render the cyan "Pulse" creature large, with its little
   face/eyes clearly visible — eyes are what make a thumbnail feel alive and clickable.
   Give it a bright motion trail arcing upward (sense of *fling + climb*).
2. **Show the gate.** One glowing orbit-gate ring behind/around it so the mechanic reads
   in half a second.
3. **Vertical motion cue.** A subtle upward streak / a hint of the void below — communicates
   "climb / escape" without clutter.
4. **High contrast, few colours.** Cyan + magenta + gold on near-black. Avoid text on the
   thumbnail (CrazyGames overlays its own UI; text shrinks to mush).
5. **No UI chrome, no HUD numbers.** Pure character + gate + trail.

Make 2–3 thumbnail variants and A/B them in the dashboard once live (CTR is measurable):
- A: character + gate, magenta accent
- B: character mid-fling with long gold trail, "in motion"
- C: tighter face-forward character close-up (cuteness/identity bet)

---

## 3. Tags / categories

Pick from CrazyGames' existing tag taxonomy (don't invent tags). Target set:

- **Arcade** (primary genre)
- **Casual**
- **Hypercasual** (if available — matches the one-tap loop)
- **Skill**
- **High Score** / **Endless** (whichever the taxonomy uses for endless-runner scoring)
- **1 Player**
- **Mouse** + **Touchscreen** (controls; the game supports keyboard too)

Avoid over-tagging — pick the 5–7 most accurate; mistagging hurts watch-time KPIs because
it draws the wrong audience.

---

## 4. Short description (the hook)

One or two punchy sentences; this shows near the title.

> Tap to fling your little star between glowing gates and climb an endless cosmic void.
> Nail the bright centre for a perfect, chain combos, and outrun the rising dark.

Alt (shorter):

> One tap. Perfect timing. Climb forever. Fling your cosmic creature gate-to-gate and
> escape the rising void.

---

## 5. Long description

Lead with the core loop and the "one more run" hooks; keep it skimmable.

```
Climb as high as you can — one perfect tap at a time.

COIL is a one-tap cosmic arcade climber. Your little star orbits a glowing gate;
tap to fling it to the next one. Release in the bright centre for a PERFECT, chain
those perfects into roaring combos, and ride your Overdrive into FRENZY mode while
the void rises beneath you.

★ One-tap controls — easy to start, hard to master
★ Perfect-timing combos, Overdrive and Frenzy mode
★ A Collection to chase: characters, trails and worlds — some bought with coins,
  others EARNED by climbing higher, chaining bigger combos, and keeping your streak
★ A new Daily Challenge route every day, plus daily missions and login streaks
★ The Star Vault: a skill-only jackpot for the boldest runs
★ Plays great on phone, tablet, and desktop — touch, mouse, or keyboard

How far can you climb before the void catches you?
```

Keep it honest (no fake urgency, no "best game ever"). CrazyGames quality review favours
clear, accurate copy.

---

## 6. Controls (dashboard field)

- **Tap / Click / Spacebar** — release & fling
- That's it. State the one-button simplicity explicitly; it's a selling point.

---

## 7. Mobile-homepage eligibility checklist

CrazyGames' mobile homepage has stricter bars; we already meet them, but verify at submit:

- [x] Initial download well under the mobile cap (JS ~29 KB gz; the 4 MB music streams
      lazily *after* the first tap, so it isn't part of first paint).
- [x] Touchscreen controls, no hover-dependent UI.
- [x] Portrait-friendly layout with safe-area insets (top + bottom) handled.
- [x] No external runtime dependencies (fonts self-hosted; only the CrazyGames SDK loads
      from CrazyGames' own CDN).
- [x] Audio gated behind a user gesture (no autoplay).
- [x] 60 fps on low-end / Chromebook via adaptive FX + reduced-motion.

---

## 8. Preview video / GIF (if used)

- First **2 seconds** must show a fling + a PERFECT pop — lead with the satisfying moment,
  not the menu.
- Show one combo escalation (the screen "erupting" at x8+) and one cosmetic.
- Keep it ≤15 s, loopable, no long intro.

---

## 9. Post-launch: what to watch & iterate

CrazyGames' dashboard updates daily. After Basic Launch, read the KPIs and iterate the
*page* as aggressively as the game:

- **Low CTR** → it's the thumbnail. Swap variant, retest.
- **Good CTR, low playtime** → first-run feel / difficulty; check the local telemetry
  (death-height histogram, first-run length, perfect rate) shipped in `core/telemetry.ts`.
- **Good playtime, low D1** → push the daily challenge / streak reward visibility.

Leaderboards are invite-only; the weekly-height submission is already wired and dormant
(`LEADERBOARDS_ENABLED` in `config.ts`) — flip it the moment you're invited.
