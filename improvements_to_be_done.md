# COIL — Improvements To Be Done

> A prioritized, actionable roadmap for taking COIL from **"accepted on CrazyGames"**
> to **"ranked and retained on CrazyGames."**
>
> Scope of this audit: full `src/` tree (~7.6k LOC), the production build, the
> CrazyGames SDK integration, the launch kit (`crazygames/`), and the strategy
> docs (`ideas.md`, `dopamine_tec.md`).
>
> Last reviewed: 2026-05-31 · Build: `dist-cg` JS **39 KB gz** / music 4 MB (lazy) · `tsc` clean.

---

## Progress update — branch `claude/game-polish-refinement-6jisqn` (2026-06-11)

Production-polish pass (code-only; `tsc` clean, all 8 tests green incl. the
extended render-smoke):

- **Desktop pause — DONE.** ESC / P pauses the live run (CrazyGames desktop
  traffic had no way to pause at all). Player pause is a separate flag from the
  ad/tab-hidden system pause so neither can clobber the other; it fires the SDK's
  `gameplayStop`/`gameplayStart` (a real in-game break per CG guidance), pauses
  music, and renders a PAUSED overlay over the frozen play frame. Tap or any
  pause/action key resumes; mobile is untouched (no new tap surface in-run).
- **HOW TO PLAY overlay — DONE** (closes the audit's "no instructions surface
  outside the one-shot in-run tutorial" gap). A "?" icon joins the home toggle
  cluster and opens a modal with three illustrated rows (orbit→tap, the bright
  perfect arc, the rising void) drawn in the game's real colours, plus desktop
  key hints. Reuses the overlays.ts modal framework (panel/absorber/actionButton).
- **Settings-toggle captions — DONE.** The icon-only toggles now flash a short
  caption naming what changed ("REDUCED MOTION ON", "MUSIC OFF", …) under the
  cluster — previously the only feedback was an icon tint swap.
- **Reduced-motion compliance fix.** The FRENZY banner heartbeat ignored
  `fx.motion`; it now stills under Reduced Motion like every other pulse.
- **Overlay layout fix.** The "Ad unavailable" line was pinned at `H*0.9`, which
  lands ON the panel's action buttons on screens shorter than ~575 px; it now
  anchors just below the panel.
- **Season screen arrival beat** (soft riser) — it was the only meta screen with
  zero entry feedback. **Zen DONE button** stroke fixed (the rgba didn't match
  `#9be35a` and was half-strength → low contrast).
- **Render-smoke extended** to cover the pause + help overlays (throw-free,
  balanced save/restore), so the new surfaces are CI-guarded like the rest.

---

## Progress update — branch `claude/elegant-brown-r5Hmy` (2026-06-01)

Shipped (code-only; verified `tsc` clean, all tests green incl. gate-honesty with
decay gates, `dist-cg` ~41 KB gz JS, source map dropped):

- **1.1 Sampled-SFX layer — DONE (infra).** Drop-in path in `audio.ts`: lazy-loads
  files from `src/assets/sfx/` (by filename) after first gesture, procedural
  fallback per event. *Awaiting the actual audio files* (see that folder's README).
- **1.2 Music anti-fatigue — DONE.** Procedural intensity layer (combo/FRENZY) +
  multi-track rotation: extra files in `src/assets/music/` auto-join, crossfaded per
  run. *More tracks optional* (README has specs + the download budget).
- **1.3 Expressive creature — DONE.** Blink, fear-near-void, joy-on-FRENZY, landing squash.
- **1.4 New depth beat — DONE.** Decay (unstable) gate; honest-gate invariant re-proven.
- **1.5 Void tension — DONE.** Late-game squeeze strengthened; `FRENZY_VOID_EASE`
  was dead config — now actually applied.
- **2.1 First-session home — DONE.** Minimal home (logo + creature + PLAY) until run 1.
- **3.2 / 3.3 — DONE.** Lifetime constellation count surfaced on home; menu creature blinks.
- **5.5 Source-map hygiene — DONE.** Production build no longer emits the `.map`.
- **6.3 Colour-blind gate — DONE.** A home-screen toggle delineates the perfect
  window by SHAPE (white boundary + centre ticks) + forced white, so it's readable
  without relying on hue.
- **6.5 Animated shop previews — DONE.** Trails flow/twinkle and accessory orbits
  rotate / auras breathe in the grid (drives purchase desire).
- **4.1 Progression-pacing audit — DONE.** Added `scripts/pacing-audit.test.ts`
  (CI-checked, like gate-honesty): maps every unlock vs the real coin economy and
  simulates a plateauing new player. Findings: early game is dense (unlocks at runs
  1,1,2,4,5,5,6,7,8,9…), even 100 m evolution ladder, longest mid-progression gap
  2 runs. **Bug found + fixed:** `shop.buy()` had `if (item.req) return`, so the
  coin-priced skill-route items (Void/Prism/Prism Ribbon/Aurora/Star Lace) were
  *permanently locked* for anyone who couldn't hit the height/combo/streak —
  contradicting config's "price is the fallback". Now **dual-route**: reach the req
  for free, or buy with coins (shop shows an "or ◎N" chip). Price-0 items (evo1-12,
  Nova, Crown, Visor) stay pure-skill prestige by design.
- **5.1 Test runner — CORRECTION:** it is **not** broken. `npm test` passes after
  `npm install` (esbuild is a devDependency); CI runs `npm ci` first. The honest-gate
  property is testable in CI today (0 violations across ~890k lit angles, incl. decay).

Still open (asset/external, can't be done in-repo): **Tier 0** thumbnail / preview /
screenshots / on-platform QA, plus the actual SFX/music files (drop-in paths ready).
Remaining code items are post-launch only (4.3 weekly rotation, 6.4 what's-new) —
best driven by live telemetry — see their tiers below.

---

## How to read this document

Each item is tagged:

- **Impact** — how much it moves CrazyGames KPIs (playtime, D1/D7, gameplay-conversion, CTR).
- **Effort** — rough build cost (S / M / L).
- **Status** — `TODO` / `IN PROGRESS` / `DONE` / `WON'T DO`.
- **Files** — the concrete code touch-points.

The KPIs that actually decide promotion (per CrazyGames' Basic Launch guidance and
`ideas.md`): **10+ min average playtime, 10–15% D1 retention, 80%+ gameplay
conversion, fast load, small build.** Every item below is justified against one of these.

---

## Verdict snapshot

| Dimension | Grade | One-line |
|---|---|---|
| Platform / SDK compliance | **A** | Ads, cloud save, perf scaling, safe-areas all correct |
| Performance / load size | **A** | 39 KB gz JS, lazy-streamed music, two-way FX scaling |
| Core gameplay feel | **A−** | Provably-honest gate is the moat; mid-game needs new beats |
| Retention systems | **A** | Deeper than the closest competitor (Sticky Orbit) |
| Sound & music | **C+** | All-procedural SFX + a single track — the weakest pillar |
| Graphics / identity | **B−** | Clean but generic silhouette; the face-creature is under-used |
| Onboarding (session 1) | **B** | Good tutorial, but the home screen is overloaded for run 1 |
| Store assets readiness | **Incomplete** | Thumbnail/screenshots not generated yet — #1 external blocker |

**Bottom line:** ship-ready for *acceptance*; the work below is what converts
acceptance into *ranking*.

---

# TIER 0 — Launch blockers (must be done before submission)

These are external/asset gaps, not code. Nothing here blocks the build, but the
submission is incomplete without them.

### 0.1 Generate the thumbnail (3 variants) — **Impact: Critical · Effort: S · Status: TODO**
Thumbnail CTR is the single highest-leverage asset outside the build; the algorithm
can't measure engagement on a tile nobody clicks.
- Use the ready prompts in [`crazygames/asset-prompts.md`](crazygames/asset-prompts.md).
- Produce all 3 variants (A: character+gate magenta · B: mid-fling gold trail · C: face-forward close-up).
- Export 16:9 (1600×900) **and** a 1:1 centre-safe crop for mobile placements.
- Plan to A/B them in the dashboard once live (CTR is measurable).

### 0.2 Capture preview video / GIF — **Impact: High · Effort: S · Status: TODO**
- ≤15 s, loopable, **first 2 seconds = a fling + a PERFECT pop** (lead with the satisfying moment, never the menu).
- Include one combo escalation (screen "erupting" at x8+) and one cosmetic reveal.

### 0.3 Capture store screenshots — **Impact: Med · Effort: S · Status: TODO**
- 4–5 shots: a perfect-catch moment, a Frenzy bloom, the Collection/shop, a Constellation chain, the Daily.
- Hero the character with its face visible in at least one.

### 0.4 Fill in the dashboard fields — **Impact: Med · Effort: S · Status: TODO**
- Copy is already written in [`crazygames/store-page.md`](crazygames/store-page.md) (title, short/long description, tags, controls). Paste and verify the tag taxonomy still matches CrazyGames' current list at submit time.

### 0.5 On-platform QA pass — **Impact: Critical · Effort: M · Status: TODO**
The whole game has only been verified off-platform. Before submit, run inside the
CrazyGames QA tool / a real embed and confirm:
- [ ] SDK `init()` resolves; `gameplayStart/Stop` fire on run start/end and tab-blur.
- [ ] A midgame interstitial actually shows after the 150 s grace + 3 min gap, and the loop **pauses + mutes** correctly (`CG.bindPauseHook` in [`main.ts`](src/main.ts)).
- [ ] Rewarded **revive** and **double-coins** both fire `onReward` only on genuine completion, and `onFail` on adblock/skip.
- [ ] Cross-device cloud save: progress made logged-in on device A appears on device B (`Store.hydrateFromCloud()` → reload path in [`cg.ts`](src/core/cg.ts)).
- [ ] Mobile portrait: safe-area insets correct on a notched device; no hover-only UI.
- [ ] Cold-load to first interactive frame is fast on a throttled connection.

---

# TIER 1 — Highest-ROI gameplay/feel improvements (do first after launch blockers)

These directly raise **playtime** and **session-1 conversion**, the KPIs that gate promotion.

### 1.1 Add a sampled-SFX layer for the load-bearing moments — **Impact: High · Effort: M · Status: TODO**
**The single biggest perceived-polish gap.** Every SFX in [`src/core/audio.ts`](src/core/audio.ts)
is procedural Web Audio (oscillators + filtered noise). It's zero-weight and clever,
but on a juice-driven arcade climber it reads as thin/beepy next to competitors using
sampled hits — and a player feels it in the first 20 seconds.
- Add 5–8 short, tiny, lazy-loaded samples for: **perfect-catch, combo-tier-up, coin pickup, death, unlock/fanfare** (optionally fling + bonus).
- Keep the procedural path as a fallback (and for off-platform/no-asset runs).
- Budget: keep each sample small and load them *after* first tap, like the music, so first paint is unaffected.
- Touch-point: extend the `SFX` object in [`audio.ts`](src/core/audio.ts) with a sample-buffer path; gate on a loaded flag.

### 1.2 Second music bed / layered stems (anti-fatigue) — **Impact: High · Effort: M · Status: TODO**
One 4 MB track ([`src/assets/background_music.mp3`](src/assets/background_music.mp3))
means audio fatigue by ~minute 10 — *exactly* the playtime window CrazyGames
measures. Options, cheapest first:
- Add a **second track** that swaps by zone/depth or per session.
- Or a **layered/stem** approach: a calm base + an intensity layer that fades in at high combo/Frenzy (note: adaptive intensity was deliberately removed in commit `33a19d8` — reintroduce carefully as *layering*, not playbackRate/volume hacks).
- Keep the Zen procedural ambient bed ([`src/core/music.ts`](src/core/music.ts)) as-is; it's good.

### 1.3 Expressive creature reactions — **Impact: High · Effort: S–M · Status: TODO**
Your differentiator vs. Sticky Orbit is "a cosmic creature with a face you collect
and bond with." In-game the creature is currently an 8 px ellipse with two eye-dots
([`drawPlayer` in play.ts](src/scenes/play.ts)). Make it *emote* — pure canvas, zero weight:
- **Squash/stretch** on catch (you already have flight stretch; add a landing squash).
- **Fear** near the void (eyes widen / look down — you already compute `closeness`).
- **Joy** during Frenzy / on combo-tier-up (happy eyes, a little bounce).
- **Blink** occasionally at idle on the home screen.
This sells the collection fantasy far more than the thumbnail alone can.

### 1.4 Introduce a new gameplay beat at depth — **Impact: High · Effort: M–L · Status: TODO**
The node vocabulary (normal/small/bonus/spike/move) is fully revealed within a few
minutes; after that only cosmetics change, not the *gameplay*. To hit 10-min playtime
you want escalating gameplay novelty, not just escalating unlocks.
- Introduce **one new node type or hazard** that first appears mid-run (e.g. at the GLITCH STORM / DEEP VOID zone boundaries already defined in [`config.ts`](src/config.ts) `ZONES`).
- Candidate ideas (pick 1, must respect the honest-gate invariant): shrinking/decaying gates, a node that rotates the orbit direction, a moving hazard band, a "wind" lane that curves flight.
- **Constraint:** anything new must keep `gateBand()`/`arcMinApproach()` honest — extend the fairness check in [`physics.ts`](src/game/physics.ts) so the CI honesty property (0 dishonest gates) still holds.

### 1.5 Strengthen the rising-void tension curve — **Impact: Med · Effort: S · Status: TODO**
The lava void is visually great ([`drawVoid` in play.ts](src/scenes/play.ts)) but the
*pressure* curve is gentle. Sticky Orbit's "outrun the sun" creates escalating dread
you don't quite match. Tune the void rise rate / acceleration by depth so the late
game genuinely squeezes, without undermining the FRENZY flow-protection ease
(`FRENZY_VOID_EASE` in [`config.ts`](src/config.ts)).

---

# TIER 2 — Onboarding & first-session funnel

CrazyGames guidance (and your own `ideas.md`) is explicit: session 1 should reveal
only the core loop. Gameplay conversion (80%+ target) lives here.

### 2.1 Strip the first-session home screen — **Impact: High · Effort: M · Status: TODO**
The very first screen a new player sees ([`home.ts`](src/scenes/home.ts)) currently
renders: daily missions (3 rows), streak pills, Star Vault ticker, wheel + chest
badges, level/title, BEST, and a 6-button bottom cluster (PLAY + DAILY/ZEN/SHOP +
2 reward icons). That's a lot competing with "PLAY."
- For a brand-new player (no runs yet), render a **minimal home**: logo, the orbiting creature, and a single pulsing **PLAY**. Hide missions/vault/streak/wheel/chest/secondary-modes until after run 1–2.
- Gate on an existing "has played" signal (`Profile.hasPlayedToday()` exists; add a lifetime `runsPlayed` check if not already present).

### 2.2 Verify the in-run tutorial reveal pacing — **Impact: Med · Effort: S · Status: TODO**
The 3-line tutorial (`TUT_LINES` in [`play.ts`](src/scenes/play.ts)) + animated
tutorial hand is good. Confirm on a fresh profile that:
- It shows once, doesn't re-trigger for returning players, and never obscures the gate.
- The "TAP TO RELEASE" hand fades cleanly. (Tutorial state lives in `state.G.tut`.)

### 2.3 First-run carrot visibility — **Impact: Med · Effort: S · Status: TODO**
`ideas.md` calls for an explicit early progression carrot ("Reach 500 m to unlock
Void"). The `nextGoalLine()` logic in [`home.ts`](src/scenes/home.ts) does some of
this, but make at least one **concrete, named unlock target** loud during/after the
first run so the player has a reason for run 2.

---

# TIER 3 — Visual identity & "doesn't look like a clone in the grid"

Concept similarity to Sticky Orbit is a *marketing* problem (per
[`crazygames/positioning.md`](crazygames/positioning.md)). The fix is silhouette and
palette differentiation, plus leaning on the character.

### 3.1 Differentiate the in-game silhouette — **Impact: Med · Effort: M · Status: TODO**
Everything is glowing vector orbs on dark — the generic-hypercasual look at 256 px.
- Push the **character identity** (3.1 + 1.3) so screenshots read as "creature climber," not "abstract orbs."
- Consider a subtle signature visual motif (the constellation lines are a good start — make them a recurring brand element in menus too).

### 3.2 Make Constellation Chains more visible as a brand hook — **Impact: Med · Effort: S · Status: TODO**
Constellation Chains ([`drawConstellations` in play.ts](src/scenes/play.ts)) are your
shipped signature differentiator, but they're subtle in-run. Make completing one feel
bigger (the celebration exists; raise its prominence) and surface the lifetime
constellation count somewhere persistent so it reads as a *collectible system*, not a one-off.

### 3.3 Home-screen creature personality — **Impact: Low–Med · Effort: S · Status: TODO**
The orbiting creature on the home logo ([`home.ts`](src/scenes/home.ts)) is static-ish.
Idle blink + occasional look-around makes the menu feel alive and reinforces "collect & bond."

---

# TIER 4 — Content depth & long-tail retention (D7+)

The meta is already deep; these extend the long tail without bloating session 1.

### 4.1 Audit progression pacing end-to-end — **Impact: Med · Effort: M · Status: TODO**
Map the unlock cadence across all four collection tracks (skins, trails, worlds,
accessories in [`config.ts`](src/config.ts)) + the 12 evolution characters
(`MILESTONE_SKINS`, one per 100 m). Confirm:
- A new player unlocks *something* within the first ~5 minutes (CrazyGames pacing guidance).
- There are no dead zones where nothing unlocks for a long stretch.
- The skill-gated unlocks (req-based) are reachable but aspirational.

### 4.2 Leaderboard activation plan — **Impact: Med · Effort: S (when invited) · Status: BLOCKED (invite-only)**
The weekly-height submission is wired and dormant (`LEADERBOARDS_ENABLED` in
[`config.ts`](src/config.ts), `CG.submitHeight` in [`cg.ts`](src/core/cg.ts)). The
moment CrazyGames invites you to leaderboards, flip the flag — zero further work.
Track this as a post-launch trigger.

### 4.3 Consider a weekly content rotation — **Impact: Med · Effort: M · Status: TODO (post-launch)**
You already have a seeded Daily Challenge. A *weekly* themed modifier (e.g. "double
constellations week," a featured world) gives a D7 reason-to-return beyond the daily.
Low priority until KPIs justify it.

---

# TIER 5 — Technical hardening & QA

The engineering is strong; these are gaps and hygiene, not fires.

### 5.1 Fix the broken test runner — **Impact: Med (dev velocity) · Effort: S · Status: TODO**
`npm test` is currently broken (missing `.bin/esbuild`); verification today relies on
`npm run typecheck` + `npm run build`. Either fix the esbuild dep in
[`scripts/run-tests.cjs`](scripts/run-tests.cjs) or document the build-based
verification path so the gate-honesty test (the "0 dishonest gates" property) can
actually run in CI again. **The honest-gate invariant is your moat — it must stay testable.**

### 5.2 Re-run the gate-honesty property after any physics change — **Impact: High · Effort: S · Status: ONGOING**
Any change to nodes, flight, or new hazards (1.4) must re-verify
`gateBand()`/`arcMinApproach()` honesty in [`physics.ts`](src/game/physics.ts). Treat
this as a required check, not optional.

### 5.3 Confirm ad-pause robustness on flaky networks — **Impact: Med · Effort: S · Status: TODO**
The midgame (9 s) and rewarded (12 s) safety timeouts in [`cg.ts`](src/core/cg.ts)
are sensible. Verify on-platform that a hung/slow ad always resolves the loop and
never soft-locks (the `fired`/`done` guards look correct; confirm empirically).

### 5.4 Telemetry review loop — **Impact: Med · Effort: S · Status: TODO (post-launch)**
Local telemetry exists ([`src/core/telemetry.ts`](src/core/telemetry.ts)). After
launch, use the dashboard KPIs + this data to read: death-height histogram, first-run
length, perfect rate. Map:
- Low CTR → thumbnail (swap variant).
- Good CTR, low playtime → first-run feel / difficulty.
- Good playtime, low D1 → push daily/streak visibility.

### 5.5 Bundle/source-map hygiene — **Impact: Low · Effort: S · Status: TODO**
The build emits a 460 KB source map alongside the 113 KB JS. Confirm the production
CrazyGames build either omits the map or that it doesn't count against any size cap /
leak concern. (Functional, just verify.)

---

# TIER 6 — Polish & nice-to-haves (only if time allows)

- **6.1** Haptics audit ([`src/core/haptics.ts`](src/core/haptics.ts)) — confirm mobile vibration fires on perfect/death and respects a setting. *(S)*
- **6.2** Settings persistence — confirm SFX/music/reduced-motion/aim-preview toggles persist across sessions via `Store`. *(S)*
- **6.3** Accessibility — reduced-motion is shipped; consider a colour-blind-safe palette option for the gate's safe/perfect bands (currently colour-coded). *(M)*
- **6.4** Add a lightweight "what's new" beat for returning players after an update. *(S, post-launch)*
- **6.5** Cosmetic preview in shop — confirm trails/accessories animate in the shop grid so purchases feel worth it. *(S)*

---

# Suggested execution order

1. **Tier 0** (all) — can't submit without it. Mostly assets + one QA pass.
2. **1.1 sampled SFX** + **1.3 creature reactions** — highest perceived-quality jump for the least code.
3. **2.1 stripped first-session home** — protects the 80% gameplay-conversion KPI.
4. **1.2 music anti-fatigue** + **1.4 new depth beat** — protects the 10-min playtime KPI.
5. **1.5 void tension**, **Tier 3 identity**, **5.1 test runner** — ranking polish.
6. **Tier 4 / 5 / 6** — post-launch, KPI-driven.

---

# Appendix — what NOT to change (already correct)

- The **defensive CrazyGames SDK wrapper** ([`cg.ts`](src/core/cg.ts)) — leave the
  try/catch-everything + timeout-fallback design intact; it's why the game runs
  everywhere.
- The **wall-clock ad cadence** ([`main.ts`](src/main.ts)) — do not switch to
  count-based; the current 150 s grace + 3 min gap + never-in-session-1 + never-in-Zen
  is policy-correct.
- The **provably-honest gate** ([`physics.ts`](src/game/physics.ts)) — your moat.
  Extend it for new mechanics; never weaken the honesty invariant.
- The **two-way FX auto-scaling with hysteresis** ([`main.ts`](src/main.ts)) — keeps
  60 fps on low-end without effect-stripping the whole session.
- **Lazy-streamed music + self-hosted fonts** — keeps first paint fast; preserve this.
- The **canonical build** is the Vite/TS repo (`src/`); the single
  `coil_star_rush_collection_edition.html` is inspiration only — don't ship it.
