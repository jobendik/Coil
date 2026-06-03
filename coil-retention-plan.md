# coil-retention-plan.md

# Coil — Sequenced Retention Implementation Plan

*Derived from `coil-retention.md`, measured against the current build, ordered by **effort × retry-rate impact**.*

This plan turns the gap analysis into a build order. It is sequenced so the cheapest, highest-impact work ships first, nothing regresses the **gate-honesty invariant** or the **ethical guardrails** (`coil-retention.md` §19, §23), and each item has concrete acceptance criteria and the files it touches.

**Legend** — Effort: `XS` <2h · `S` half-day · `M` 1–2 days · `L` 3–5 days. Impact is on the genre's master metric (retry-rate after death) unless noted.

---

## The one decision that comes first: the Ascent tease vs. the instant-retry rule

**The conflict.** `coil-retention.md` §1/§5.1 is emphatic: *death → result in ~0.4s → one-tap RETRY → no interstitial*, because retry-rate is "the genre's master metric." The recently-shipped Ascent tease ([tease.ts](src/scenes/tease.ts)) inserts a **3.2s auto-cinematic** (`DURATION = 3.2`, skip only after `SKIP_LOCK = 0.55`) between *every* real-mode death and the retry button. So the common path is now `die → watch/skip → result → RETRY` (≈2 taps, up to 3.2s) instead of one tap in 0.4s.

The tease is genuinely good — it's the evolution-ladder *return* hook the generic audit said was missing. The problem is only that it fires on **every** death, taxing the ~80% of deaths that aren't notable.

### Options considered

| Option | What | Verdict |
|---|---|---|
| A. Keep tease on every death | Status quo | ❌ Violates the doc's #1 metric; taxes the retry loop on ordinary deaths |
| B. Remove the tease entirely | Pure instant-retry | ❌ Throws away a strong, already-built return hook |
| **C. Gate the tease to *notable* deaths** | Tease only when the run earned something worth celebrating; instant-retry otherwise | ✅ **Recommended** — keeps both, costs ~nothing |

### Recommendation: Option C — "celebrate the notable, retry the rest"

In [`endRun()`](src/game/update.ts#L906), branch on whether the run produced a peak moment:

```text
notable = data.newBest
        || data.claimedUnlocks has a milestone-evolution form   (a new Ascent form was earned)
        || the run reached a Zone it had never reached before    (first-time zone reveal)

notable  → openTease(data)        (the cinematic is earned — it shows what you just unlocked)
ordinary → Result.show(data)      (straight to a fast, one-tap-retry result screen)
```

This is the doc's own logic — it gates the *revive* offer (§13) and *toasts* (§16) to "notable" events for the same reason. ~80% of deaths get instant retry; the ~20% that earned something get the celebration that drives the return loop. Roughly a 10-line change plus the zone-reveal flag.

This decision is the spine of **Milestone 1** below.

---

## Build order at a glance

| # | Item | Effort | Impact | Why this slot |
|---|---|---|---|---|
| **M1** | Gate the tease + restore instant-retry + fairness ruling | `S` | ★★★ | The master metric; tiny change; unblocks everything else |
| **M2** | Honest near-miss death (`MISSED BY 6m` + slow-mo) | `M` | ★★★ | Flagged Phase-1 retry driver; reuses existing FX |
| **M3** | One-bar fast result screen (nearest-progress priority) | `S` | ★★ | Finishes the death-screen rework started in M1 |
| **M4** | Daily reroll + forgiving weekly streak + Weekly Missions | `M` | ★★★ | Cheapest return-cadence layer; additive to existing systems |
| **M5** | Echo ghost (race your best run) | `L` | ★★★ | Doc's #2 retry driver; deepens every run |
| **M6** | Free Season Track (30 tiers, ~3–4 wk) | `L` | ★★★ | The long-tail live-service spine |
| **M7** | Daily Ascent leaderboard + "Top X%" | `S`* | ★★ | *Blocked on CrazyGames invite; wire-and-wait |
| **M8** | Phase-3 depth: Zone mastery · Shards · Elite Track · Career milestones · Events | `L` ea. | ★★ | Depth multipliers once the loop is proven |

---

## M1 — Gate the tease, restore instant-retry, rule on Flow fairness · `S` · ★★★

**Goal.** Death-to-retry ≤1 tap, <0.6s for ordinary deaths; cinematic reserved for notable ones.

**Tasks**
1. Add a `zoneReached` high-water mark to the run/profile so a *first-time* zone entry can be detected (drives "notable").
2. In [`endRun()`](src/game/update.ts#L906): compute `notable` (see Decision above); route notable → `openTease`, ordinary → `Result.show`.
3. In [result.ts](src/scenes/result.ts): make the tap-anywhere-to-retry zone active near-immediately on the *ordinary* path (drop/shorten `REPLAY_ZONE_DELAY` for that path) and keep RETRY visually dominant from frame 1.
4. **Fairness ruling on FRENZY void-ease.** `FRENZY_VOID_EASE = 0.55` ([config.ts:217](src/config.ts#L217)) currently lets a hot streak *survive longer* ([update.ts:301](src/game/update.ts#L301)) — a survivability advantage from the flow state, which §4.3 says Flow must never give. **Recommendation:** disable void-ease in **Daily Ascent** only (`if (G.daily) rise stays unmodified`), so the competitive board is pure skill-distance; keep it in normal mode as juice. (Alternative: remove it everywhere for strict purity.)

**Acceptance** · Ordinary death → another run in one tap, sub-second. · Tease still fires on new-best / new-form / new-zone. · Daily Ascent height is unaffected by FRENZY. · `npm run typecheck` + `npm run build` clean; gate-honesty test still passes.

**Risk** Low. No physics change; pure flow-control + one constant guard.

---

## M2 — Honest near-miss on death · `M` · ★★★

**Goal.** Implement §4.4 — the *legitimate* near-miss. On a skill death (`'void'`/`'fall'`, not `'spike'`), slow-mo the final approach and show the true gap to the nearest catchable pivot.

**Tasks**
1. At the fatal release, compute the **real** minimum distance from the flight arc to the nearest catchable pivot. The physics already computes `arcMinApproach` for the gate-honesty proof — reuse it so the displayed gap is provably truthful (never theater).
2. If that gap is small (e.g. ≤ a tuned threshold), trigger a ~0.3s time-dilation on the death tumble. **Reuse the existing FOCUS slow-mo wash** ([play.ts:1597](src/scenes/play.ts#L1597)) and the death-tumble camera ([update.ts:107](src/game/update.ts#L107)) rather than building new.
3. Show `MISSED BY N m` (round honestly) as a `Callout` near the pivot; then snap to the result/retry per M1.
4. Gate strictly: only for genuine near-misses, never for `'spike'` (ran into death), never fabricated.

**Acceptance** · A near-miss death visibly slows + shows a true gap. · A not-close death shows no false "so close." · Spike deaths never trigger it. · Gate-honesty corpus still 0 dishonest gates.

**Risk** Medium — accuracy of the gap and not over-firing. Mitigated by reusing the audited `arcMinApproach`.

---

## M3 — One-bar fast result screen · `S` · ★★

**Goal.** §5.2 — show **exactly one** progress bar (the nearest-to-complete), not three, on the fast path. Keeps the 0.4s screen a hook, not noise.

**Tasks**
1. In [result.ts](src/scenes/result.ts), add a `nearestBar()` priority picker: `PB-near > daily-goal-near > season-near > chest-near` (season slots in once M6 lands). It already computes all the inputs (`Daily.pct`, `nextUnlockPct`, `levelProgress`).
2. On the ordinary (fast) path, render only that one bar + the BEST delta (`−175 m`) + the existing `nextAction()` line + RETRY. Keep the full three-bar stack only on the notable/tease-follow path or one tap deeper.

**Acceptance** · Ordinary result screen shows one bar, the BEST delta, one next-line, RETRY. · The chosen bar is always the one closest to done.

**Risk** Low. Pure presentation; `nextAction()` logic already picks the nearest carrot.

---

## M4 — Daily reroll + forgiving weekly streak + Weekly Missions · `M` · ★★★

**Goal.** Add the forgiving return cadence the doc repeatedly prefers (§9.1, §18) on top of the existing daily systems.

**Tasks**
1. **Daily reroll** — one reroll/day of a single mission ([daily.ts](src/game/daily.ts)); free once or a small Sparks cost. Add `rerollUsed` to `DailyData`. (Endorsed by both retention docs.)
2. **Weekly activity meter** — "Climb on any 3 days this week → weekly chest." Track `weeklyActivityDays` (already in the doc's data model); reward via the existing [`Chest`](src/game/rewards.ts) system. Missing a day never wipes earned rewards.
3. **Streak grace** — give the daily streak one automatic freeze/week instead of resetting to 1 on a single miss ([profile.ts:92](src/game/profile.ts#L92)); never use anxiety copy.
4. **Weekly Missions** — a 5-task weekly set (larger goals), reusing the `GOALS`/`MissionState` shape with a weekly key. Completing all → unlocks the Elite Track (M8).

**Acceptance** · One mission rerollable/day. · Playing any 3 days/week grants the weekly chest; a 1-day miss doesn't reset the streak. · Weekly missions show partial progress and persist across the week.

**Risk** Low. All additive to proven `Store`-keyed systems; no gameplay change.

---

## M5 — Echo ghost · `L` · ★★★

**Goal.** §6 — a translucent replay of your best run climbing alongside you. The doc's #2 retry driver after the BEST line.

**Tasks**
1. **Record** a sampled position timeline (≈20 Hz: `t, x, y`) of any run that beats BEST. Position-sampling (not input-replay) is robust to physics tuning and small enough to persist (~a few KB for a 60s run) in `bestRunEcho` via [`Store`](src/core/store.ts).
2. **Playback** — render a faint orb interpolated along the timeline vs. `G.t` during the next runs, in the equipped skin colour at low alpha. Reuse the creature draw from [tease.ts](src/scenes/tease.ts).
3. **Toggle** in settings (`echoVisible`) for players who find it distracting — the doc requires it.
4. Skip in Zen (no best). Normal + Daily only.

**Acceptance** · After a new PB, the next run shows a ghost tracing that PB. · Player can see themselves pull ahead/behind. · Toggle hides it. · No measurable FPS cost on the `low` FX tier (skip ghost there if needed).

**Risk** Medium — storage size + playback perf. Mitigated by low sample rate and the existing adaptive FX scaler.

---

## M6 — Free Season Track · `L` · ★★★

**Goal.** §12.1 — a 30-tier, ~3–4 week, 100%-free season; the live-service spine that makes the game feel alive over weeks.

**Tasks**
1. New `Season` system (`Store`-keyed): `{ id, xp, tier }`. Season XP accrues from runs, missions, and Daily Ascent (hook into the [reward pipeline](src/game/update.ts#L820)).
2. A 30-entry reward table (Sparks, shards once M8 lands, full cosmetics, titles, Snap-flash effects, Zone themes). Reuse the cosmetic/`ownX` plumbing in [unlocks.ts](src/game/unlocks.ts).
3. Season UI: a tier track screen (a new scene, or a tab on the existing shop/ascent). Add a season-progress bar to `nearestBar()` (M3).
4. **Safe FOMO copy only** (§12.3): "Available during Season 2. May return in a future archive event." Never "never returns."

**Acceptance** · Every run advances season XP visibly. · Tiers grant claimable rewards. · No permanent-lockout copy anywhere. · Season resets cleanly to the next id.

**Risk** Medium — new persistent system + UI surface. Self-contained; doesn't touch gameplay or fairness.

---

## M7 — Daily Ascent leaderboard + "Top X%" · `S` (blocked) · ★★

**Goal.** §7.2 — fair daily social comparison on the shared seed. The honest percentile ("Top 18%") the doc wants.

**Status.** The submission path is already wired and dormant (`LEADERBOARDS_ENABLED = false`, [config.ts:78](src/config.ts#L78)); CrazyGames leaderboards are invite-only. **A real percentile requires real aggregate data** — do **not** fake "Top X%" before the board is live (that's on the hard-NO list, §19).

**Tasks** · When invited: flip the flag, wire the daily-seed board, render best-of-day + percentile on the result/daily screens with participation-tier rewards (Top 50% / 10% / everyone-who-climbs). Until then: leave the local best-of-day + medals as-is.

**Risk** Low to wire; the only risk is faking comparison before data exists — explicitly avoided.

---

## M8 — Phase-3 depth (parallelizable once the loop is proven) · `L` each · ★★

Build these only after M1–M6 prove the loop. Each is additive and self-contained:

- **Zone mastery** (§10.2) — level the zones the player engages with; per-zone reward tracks. Needs altitude-gated zones first (extend `ZONES` beyond the current 3 toasts into real bands with reveals).
- **Shards** (§11.3) — `n/5`-shard cosmetic unlocks; duplicates → universal shards; **no inventory caps**. Makes every reward useful and lets players chase a *specific* item.
- **Earned Elite Track** (§12.2) — gated behind completing the week's Weekly Missions (M4), with retroactive unlock. The honest premium-track psychology, no money.
- **Career milestones** (§9.3) — lifetime goals (100,000 m total, 1,000 Perfect Snaps) shown with partial progress everywhere.
- **Weekly event rotation** (§18) — flexible windows, real timers (`Double Sparks Weekend`, `Perfect-Snap Challenge`).

---

## Guardrails that apply to every milestone

Carried from `coil-retention.md` §19/§23 — do not regress these while adding hooks:

- **Gate-honesty invariant stays green** — re-run `scripts/gate-honesty.test.ts` after any physics-adjacent change (M1 fairness ruling, M2 near-miss).
- **No fake anything** — no fabricated near-miss/percentile/scarcity/social proof; the M2 gap and the M7 percentile must be real or absent.
- **No play-blocking** — reroll/streak/season never gate core play; revive stays optional and un-nagged.
- **No guilt copy** — failure framing stays neutral and forward-pointing.
- **Honest exit always one tap** — MENU stays visible; RETRY can be dominant, never a trap.
- **Verify via build, not test runner** — `npm run typecheck` + `npm run build` (the test runner is the known-broken path here).

## Metrics to watch as each milestone lands (§22)

- **Retry-rate after death** (target >80%) — M1/M2/M3 should move this most.
- **PB-beat rate** and **runs/session** — M1/M5.
- **Daily/Weekly mission completion** and **return rate** — M4/M6.
- **Quality guards:** bounce-after-first-death, repeated-fail-then-quit, reduced-motion/Echo-off toggle rate. If Echo-off or reduced-motion spikes after M5, the ghost is over-stimulating — dial alpha/sample rate down.

---

## Suggested first sprint

`M1` (gate tease + instant-retry + Flow ruling) → `M2` (honest near-miss) → `M3` (one-bar result). All three are the death-screen rework, they share files, and together they directly target the master metric. `M4` (return cadence) is the natural follow-on because it's cheap and additive. Then the two big rocks, `M5` (Echo) and `M6` (Season), in whichever order suits the roadmap.
