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
**instant readability at ~150–256 px.** The CrazyGames grid is bright and high-key,
and the page UI is near-black — so a *bright, luminous* tile pops while a dark one
recedes. Lead with a clean, bright thumbnail, NOT a dark cosmic one — confirmed by
live-grid A/B (bright simple won; dark and over-detailed both receded).

**→ Ready-to-paste generation prompts for all 3 variants live in `asset-prompts.md`.**

Specs (follow the dashboard's current export sizes; design at 2×):
- Aspect: **16:9** primary (e.g. 1600×900), plus a **square 1:1** crop for
  mobile placements. Design so the focal point survives a center-square crop.
- Safe area: keep the hero element centered; assume edges get cropped.

Composition (do **not** just screenshot the game — abstract orbs read as generic):
1. **Hero the character.** Render the cyan "Pulse" creature large, with its little
   face/eyes clearly visible — eyes are what make a thumbnail feel alive and clickable.
   Give it a bright motion trail arcing upward (sense of *fling + climb*).
2. **Show the gate.** One glowing orbit-gate ring behind/around it so the mechanic reads
   in half a second.
3. **Vertical motion cue.** A subtle upward streak / a hint of the void below — communicates
   "climb / escape" without clutter.
4. **Bright, clean, few elements.** A luminous cyan creature + a few magenta gates on a
   *bright* nebula reads at thumbnail size; busy detail (heavy nebula, light rays, embers)
   turns to mush when shrunk. Keep it SIMPLE. Avoid text (CrazyGames overlays its own UI).
5. **No UI chrome, no HUD numbers.** Pure character + gate + trail.

Make 2–3 thumbnail variants and A/B them in the dashboard once live (CTR is measurable):
- A: character + gate, magenta accent
- B: character mid-fling with long gold trail, "in motion"
- C: tighter face-forward character close-up (cuteness/identity bet)

---

## 3. Categories

CrazyGames lets you pick **exactly 5** categories, from a fixed taxonomy (don't invent
tags). NOTE: the taxonomy does **not** contain Arcade / Casual / Hypercasual / High Score /
Endless / Touchscreen — pick only from the real list. Verified set:

- **2D** — real art-style browse filter (2D vs 3D).
- **Skill** — the core perfect-timing release loop; sticky, on-genre audience.
- **Physics** — accurate (fling/orbit movement, `src/game/physics.ts`) and well-trafficked.
- **Avoid** — the central tension: outrun the rising lava void.
- **Jumping** — discovery bet: vertical one-tap climbers live here; pulls the
  ascend-forever crowd.

Slot-5 alternative: **Running** (endless-runner crowd) instead of Jumping — but Jumping
fits a *vertical* climber better.

Deliberately NOT used:
- **1 Player** — a structural tag nobody browses to discover a game; the freed slot is
  better spent on a descriptive/discovery tag (single-player is already implied by leaving
  the "multiplayer" form box unchecked).
- **Collect / Relaxing / Ball / Escape** — mistag risk (Collect implies in-run collecting,
  not meta cosmetics; only Zen mode is calm; Ball/Escape read as other genres). Mistagging
  hurts watch-time KPIs by drawing the wrong audience.

Controls/device are a **separate** part of the submission form (mobile-support + SDK-mute
checkboxes, controls text field) — not category slots, so don't spend categories on them.

---

## 4. Short description (the hook)

One or two punchy sentences; this shows near the title.

> Fling a cute cosmic creature gate-to-gate and climb an endless neon void — one
> perfect tap at a time. Chain combos, trigger Frenzy, and collect a whole galaxy
> of characters.

Alt (shorter):

> One tap. Perfect timing. Climb forever. Fling your cosmic creature between glowing
> gates and outrun the rising void.

---

## 5. Long description

Lead with the core loop and the "one more run" hooks; keep it skimmable.

```
Climb as high as you can — one perfect tap at a time.

COIL is a one-tap cosmic arcade climber. Your tiny creature orbits a glowing gate;
tap to fling it to the next one. Release in the bright center for a PERFECT, chain
your perfects into roaring combos, and ride your Overdrive meter into FRENZY — all
while a lava void rises beneath you. Easy to start, genuinely hard to master.

★ One-tap controls — tap, click, or press Space (phone, tablet, and desktop)
★ Perfect-timing combos, an Overdrive meter, and an explosive Frenzy mode
★ Collect a galaxy of characters, trails, worlds, and gear — some bought with coins,
  others EARNED by climbing higher, chaining bigger combos, and keeping your streak alive
★ A fresh seeded Daily Challenge every day, plus daily missions, weekly orders, and login streaks
★ Constellation chains, a free seasonal reward track, and the Star Vault — a
  skill-only jackpot (no gambling, ever)
★ Three ways to play: Endless, the Daily Challenge, and a calm no-fail Zen mode

How high can you climb before the void catches you?
```

Keep it honest (no fake urgency, no "best game ever"). CrazyGames quality review favors
clear, accurate copy.

---

## 6. Controls (dashboard field)

- **Tap / Click / Space / Enter / ↑** — release & fling. Time your release for the
  bright center to land a PERFECT and build your combo.
- That's it. State the one-button simplicity explicitly; it's a selling point.

---

## 7. Mobile-homepage eligibility checklist

CrazyGames' mobile homepage has stricter bars; we already meet them, but verify at submit:

- [x] Initial download well under the mobile cap (JS ~59 KB gz; the ~8 MB of music
      streams lazily *after* the first tap, one track at a time, so it isn't part of first paint).
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
