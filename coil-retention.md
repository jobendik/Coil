# coil-retention.md

# Retention Design — **COIL**

*Orbital-latch / tangential-release vertical climber · hypercasual · CrazyGames · no real-money systems*

---

## 0. How to read this document

This is the complete retention specification for **Coil**, adapted from the universal `retention.md` model and rewritten around Coil's actual mechanic: latch a pivot, orbit it, release tangentially at the right instant, fly, re-latch, climb.

Every system below is concrete — real names, real numbers, real copy. Tune the numbers, but treat the *shape* of each system as the design intent. Where the generic retention model assumes "matches," Coil has **runs**, and runs are very short (20–90 seconds). That single fact reshapes everything: the loop has to reward fast, fail fast, and restart instantly.

Two non-negotiables carried over from the parent doc:

- **No real money.** No purchases, no subscriptions, no pay-to-win. Every reward is earned by playing. The only commercial surface is CrazyGames' optional rewarded ad (used for the revive and a couple of opt-in bonuses), and even that is treated here as a *session mechanic*, not a money mechanic.
- **Pressure to excite, never to deceive or trap.** The player should think *"one more climb,"* never *"I can't get out of this."*

---

## 1. Philosophy: what actually retains a hypercasual climber

Coil is not a match-based game. It is a **skill-expression loop with an instant fail-and-retry core**. That changes the retention center of gravity:

```text
In a match game, retention lives in the post-match screen.
In a hypercasual climber, retention lives in the half-second after death.
```

The single most important number in Coil is the **retry rate after death** — the percentage of deaths that are immediately followed by another run with zero menu friction. Everything in Section 4 and 5 exists to keep that number above ~80%.

The retention pyramid still applies, but reweighted for Coil:

1. **Moment-to-moment (dominant):** Is the latch/release satisfying *right now*? Does a clean release feel incredible? Does a near-miss sting in a way that makes me retry?
2. **Run:** Did this 40-second run produce a visible number I can beat?
3. **Session:** Did stacking runs move *something* — a meter, a level, a daily goal?
4. **Return:** Is there a fresh reason to open Coil tomorrow (a new daily layout, a near-complete reward, a streak)?
5. **Identity & mastery:** Am I demonstrably getting better, and do I have a personal look?
6. **Collection:** Is there a skin/trail/effect I'm chasing?

A healthy Coil player should always have **something to beat, something almost finished, something new to see, and something to come back for tomorrow.** Each of those maps to a concrete system below.

---

## 2. The four nested loops (Coil-specific)

```text
MOMENT  : latch → orbit → time release → SNAP → fly → re-latch
RUN     : climb → near-miss or death → instant retry prompt → "beat best?"
SESSION : runs accumulate → XP, Sparks, daily goal, season track, PB attempts
RETURN  : new Daily Ascent seed → streak → near-complete chest → unlocked zone preview
```

Each loop must hand the player a reason to enter the next-larger loop *before* they have time to consider quitting. The death screen (5.2) is where the run loop hands off to the session and return loops — it is the most important screen in the game.

---

## 3. Core vocabulary (use these names consistently in code, UI, and copy)

| Concept | Name | Meaning |
|---|---|---|
| The player object | **Orb** | What you control around pivots |
| Anchor point | **Pivot** | What you latch and orbit |
| The line connecting orb to pivot | **Tether** | Visual + thematic |
| A correctly-timed tangential release into the next latch | **Clean release** | Keeps Flow alive |
| A release inside the tight timing window | **Perfect Snap** | Boosts Flow harder, emits Sparks, screen pop |
| Consecutive clean releases multiplier | **Flow** | x1 → x2 → x3… resets on death |
| Soft earned currency | **Sparks** | Released by Snaps and runs; buys cosmetics |
| Your best run, replayed as a translucent racer | **Echo** | Ghost to race |
| Primary score | **Height** (meters) | How high you climbed |
| Themed altitude bands | **Zones** | Visual milestones + mastery tracks |
| Daily fixed-seed challenge | **Daily Ascent** | Same layout for everyone that UTC day |

---

## 4. Moment-to-moment: the skill engine (retention dies here first)

No amount of meta-progression saves a hypercasual game whose core verb doesn't feel great. Build this first and tune it relentlessly. This is where Coil's "fairness auditing" work pays off — a fair, readable timing window is a retention feature.

### 4.1 The release timing windows

Each release is judged against the angle/timing needed to reach a catchable next pivot. Define **three** outcome bands:

```text
PERFECT SNAP  : tight central window  → max trajectory accuracy + Flow boost + Sparks + full juice
CLEAN RELEASE : wider safe window     → reaches a pivot, keeps Flow alive, light juice
MISS          : outside window        → trajectory misses all catchable pivots → fall → death
```

The gap between PERFECT and CLEAN is the entire skill ceiling. Beginners survive on CLEAN; experts chase PERFECT for Flow and Sparks. **Never** make PERFECT mandatory for survival — that kills the casual on-ramp.

### 4.2 Perfect Snap juice (the dopamine source)

A Perfect Snap must feel disproportionately good. On a Perfect:

- Rising-pitch SFX (pitch scales with current Flow multiplier — your ear hears the streak climbing)
- A brief screen pop / chromatic flash and a tight time-dilation hit-stop (~40–60ms)
- Sparks burst out of the release point and stream into the HUD counter
- A small `PERFECT` / `x3` floating text (reuse the `popFX` pattern from Ricochet)
- Subtle haptic on mobile

Borrow directly from Ricochet's existing FX layer (`popFX`, `medal`, score-bump, particle bursts). The polish is already proven; re-skin it for Coil's palette.

### 4.3 Flow (the in-run multiplier)

```text
Each CLEAN release      : keeps Flow, no increase (you're surviving, not excelling)
Each PERFECT SNAP       : Flow += 1 step (x1 → x1.5 → x2 → x2.5 → x3 → cap)
Any MISS / death        : Flow resets to x1
```

Flow multiplies **Height score and Sparks earned**, not survivability. This rewards skilled play with score and currency, never with a power advantage — which keeps the game fair and the leaderboards honest. Show Flow as a prominent, glowing HUD element that visibly intensifies as it climbs (color shift, particle density). The *fear of breaking a high Flow* is a powerful, honest in-run tension — the player's own skill is the stake, not a purchased asset.

### 4.4 The honest near-miss (this is the legit version of "near-miss")

The retention taxonomy flags fake near-miss animations as a critical dark pattern — but that rule is about *gacha* (showing a jackpot you couldn't have won). In a **skill** game, a *real* near-miss is the opposite: it's truthful and it's the strongest retry driver in the genre.

When the orb flies past a pivot and misses by a small margin, sell it honestly:

- Slow-mo the final approach for ~0.3s as the orb sails past the pivot
- Show the actual gap (`MISSED BY 6m`) — true information, not theater
- Let the orb fall with weight, then snap to the retry prompt fast

This makes the player feel *"I was SO close, I can fix that"* — which is honest because they genuinely were close and genuinely can. Contrast with the banned version: never show a Perfect Snap window that was impossible to hit, and never fake the gap distance.

### 4.5 Escalation within a run

Tension must rise so a long run *feels* like an achievement:

- Pivot spacing widens gradually with height (tighter release timing required)
- Orbit speed increases subtly per Zone
- Optional hazards per Zone (drifting pivots, shrinking pivots, pivots that detach after one orbit)

Escalation gives a single run an arc and makes "I reached Zone 3" a story worth retelling.

---

## 5. The run loop and the death screen

### 5.1 The instant-retry rule

```text
Death → result appears within ~0.4s → primary RETRY button under the thumb → one tap restarts
```

No interstitial. No menu round-trip. No forced ad. The retry button is large, centered, and the literal default action. Tapping anywhere outside the secondary buttons should also retry. This single rule protects the genre's most important metric.

### 5.2 The death/result screen — the retention engine

Even at 0.4s, the screen must do retention work. It is the handoff from "run" to "session" and "return." Required elements, in reveal order:

```text
1. HEIGHT this run            (big, immediate)        — e.g.  412 m
2. BEST marker comparison     (the hook)              — e.g.  BEST 587 m  ·  −175 m
3. Sparks earned              (currency drip)         — e.g.  +38 ✦
4. ONE progress bar moving    (almost-done hook)      — e.g.  Daily goal  2/3 climbs
5. A "next" line              (direction)             — e.g.  "Beat 587m to crack today's top 10%"
6. RETRY (primary) + small secondary buttons
```

Rules for the death screen:

- **Show exactly one progress bar**, chosen by priority (PB-near > daily-goal-near > season-near > chest-near). Stacking five bars on a 0.4s screen is noise; one near-complete bar is a hook. Pick the bar the player is *closest* to finishing.
- **Always compare to BEST.** The delta to personal best (`−175 m`) is the core retry driver. When the run beats BEST, this screen transforms (5.3).
- **The "next" line** is the goal-gradient nudge — honest, specific, and always pointed at the nearest reachable target.
- Secondary buttons: `MENU`, `REVIVE` (if eligible, see §13). Quitting is always one tap away and never shamed.

### 5.3 Personal-best celebration (the spike)

Beating your own BEST is the purest free dopamine in the genre. When a run exceeds BEST:

- Interrupt the death flow with a `NEW BEST` banner, golden particle wash, triumphant stinger
- Animate the BEST number ticking up to the new value
- Award a one-time Sparks bonus and any milestone reward
- Then offer RETRY ("can you do it again?")

Make this moment loud. It costs nothing, it's fully earned, and it's the reason players grind hypercasual games for hours.

### 5.4 The BEST line in the world

Render the player's personal best as a literal glowing horizontal line in the climb at that height (`BEST 587m`). Climbing toward a visible target you set yourself is enormously motivating, and crossing it triggers 5.3 live, mid-run. This is the single highest-ROI retention feature in the whole document — build it in Phase 1.

---

## 6. The Echo: race your own ghost

The **Echo** is a translucent replay of the player's best run, climbing alongside them in real time.

- Record the input timeline of any run that beats BEST; play it back as a faint orb on the next attempts.
- The player physically watches themselves pull ahead of or fall behind their best self.
- No multiplayer, no servers, no money — just a recorded input stream and the existing physics.

The Echo turns every run into a head-to-head race against the most motivating opponent that exists: yesterday's you. It dramatically deepens the "one more try" loop. Optional toggle for players who find it distracting.

**Stretch (Phase 3):** "Rival Echoes" — anonymized, honestly-labeled ghosts of real players near your skill band on the Daily Ascent leaderboard (`Echo of rank #14`). Honest labeling is mandatory — never present an AI/scripted ghost as a real person.

---

## 7. Daily Ascent: the return engine

A **fixed-seed daily challenge** is the strongest *return* mechanic available to a free hypercasual game. Build it in Phase 1 or early Phase 2.

### 7.1 How it works

- Every UTC day, a deterministic seed generates one shared pivot layout. **Everyone in the world climbs the same Coil that day.**
- Unlimited attempts; the player's **best** Height of the day is what counts. (Best-of-day, not one-shot — keeps it low-stress and casual-friendly.)
- A dedicated daily leaderboard (see §7.2).
- Completing the day's first Daily Ascent run grants a guaranteed reward (Sparks + chest progress) — the daily gift, earned through one quick climb rather than a passive login.

### 7.2 Daily leaderboard

```text
DAILY ASCENT — Today
Your best:   612 m   ·   Top 18%
#1  Lumen      1,204 m
#2  …
Rewards: Top 50% small chest · Top 10% Spark bonus · everyone who climbs: daily reward
```

Reward by **participation tiers**, not only the top ranks (carried from the parent doc) — this avoids toxicity and keeps the bottom 90% motivated. "Top 18%" framing beats absolute rank because almost everyone can improve their percentile.

### 7.3 Why it works

It gives a *new puzzle every day*, a fair social comparison (same layout for all), a guaranteed daily reward for one short climb, and a reason to open the app at a roughly consistent time. It is habit-forming **without** deception, fake scarcity, or guilt.

---

## 8. Progression: Climber Level

A universal account level gives every run long-term meaning and is the spine of the unlock schedule.

```text
Every run grants XP (height-based + Perfect-Snap bonus + first-run-of-day bonus).
Wins (new PB, daily completion) grant more, but every run grants something.
```

Recommended curve (fast early so new players feel momentum):

```text
Lvl 1–5   : ~1 level per run
Lvl 6–15  : every 2–3 runs
Lvl 16–30 : every 4–6 runs
Lvl 31+   : long-term prestige curve
```

Unlock schedule (gates features so the game reveals depth gradually):

```text
Lvl 2  : Daily Missions
Lvl 3  : first cosmetic chest
Lvl 4  : Echo ghost
Lvl 5  : Daily Ascent + leaderboard
Lvl 6  : Zone 2 theme
Lvl 8  : Weekly Missions
Lvl 10 : Season Track
Lvl 12 : Collection album
Lvl 15 : Zone mastery tracks
Lvl 20 : Prestige badge / title
```

Pair the number with **titles** (emotionally stronger than digits): `Drifter → Latcher → Climber → Slingshot → Ascendant → Voidwalker → Coilmaster`.

---

## 9. Missions (Coil-mapped)

Three layers, all optional, all completable through normal play, none requiring social spam or ads.

### 9.1 Daily Missions (3, rerollable once/day)

Designed to be done in 5–15 minutes and to nudge *varied* play:

```text
Reach 400 m in a single run
Land 8 Perfect Snaps in one run
Reach a x3 Flow
Clear 25 pivots total today
Complete today's Daily Ascent
```

### 9.2 Weekly Missions (larger, aspirational)

```text
Reach 1,000 m
Land 100 Perfect Snaps this week
Complete the Daily Ascent on 4 different days
Reach Zone 4
Beat your personal best 3 times
```

Completing all weekly missions unlocks this week's **Earned Elite Track** (§12).

### 9.3 Career milestones (long-term, teach the ceiling)

```text
Total height climbed: 100,000 m
1,000 Perfect Snaps
Reach Zone 6
Maintain x4 Flow for 20 releases
Unlock 25 cosmetics
```

Mission rules: optional, batchable, never block core play, never punitive. Show partial progress everywhere — `Perfect Snaps 73/100` is itself a return hook.

---

## 10. Zones & mastery

### 10.1 Zones

Themed altitude bands give a single run texture and give the meta a "see the next zone" pull:

```text
Zone 1  Surface    0–500 m     calm, wide windows (teaches the mechanic)
Zone 2  Updraft    500–1,200   faster orbits
Zone 3  Drift      1,200–2,000 drifting pivots
Zone 4  Storm      2,000–3,000 shrinking pivots, screen motion
Zone 5  Void       3,000–4,200 detaching pivots
Zone 6+ Aurora     4,200+      everything, escalating
```

Each Zone is a **visual + audio reskin** of the same physics — cheap to produce, high perceived value. "I finally reached the Void" is a story; the first sight of a new Zone is a reason to push one more run.

### 10.2 Zone mastery

Level the *things the player engages with*, not just the account:

```text
Updraft Mastery  Lvl 3   ·  61%
Next reward: Aurora tether trail
Task: Land 40 Perfect Snaps in Zone 2
```

Mastery multiplies long-term goals without new content and gives skilled players per-zone identity.

---

## 11. Collection & the Sparks economy

### 11.1 Cosmetics (pure collection, zero power)

Everything here is visual only — never affects physics, fairness, or score:

- **Orb skins** (the player object)
- **Tether trails** (the line + motion trail)
- **Snap-flash effects** (the burst on a Perfect Snap)
- **Pivot themes** (recolor the anchors)
- **Death effects** (how the orb falls/shatters)
- **Titles & profile banners**

### 11.2 Single soft currency: Sparks ✦

Keep it to **one** currency. (The parent doc allows up to three; Coil is hypercasual — one is cleaner and avoids the "manipulative mobile shop" feel.)

```text
Earned from: Perfect Snaps, run height, Daily Ascent, missions, chests, level-ups.
Spent on:    cosmetics, cosmetic shards, daily-mission rerolls, Echo skins.
```

No cash-in, so leftover balance isn't financial harm — but it still creates a clean return goal: *"need 60 more Sparks for the Aurora trail."*

### 11.3 Shards (so every reward is useful)

```text
Void Orb Skin: 4/5 shards
Unlock at 5 shards · duplicates convert to universal shards
```

Shards make duplicates non-frustrating and let players chase a *specific* cosmetic. **No inventory limits** — storage caps are friction without fun; omit them entirely.

### 11.4 Collection completion bonuses

```text
Complete all Zone-2 cosmetics → "Updraft Stylist" title
Complete a season set       → exclusive banner
```

---

## 12. Free Season + Earned Elite Track

A free Season Track is the strongest cross-genre live-service retention layer; Coil keeps it 100% free.

### 12.1 Free Season Track

- 30 tiers for a ~3–4 week season (hypercasual attention spans favor shorter, completable seasons).
- Season XP comes from runs, missions, and Daily Ascent.
- Rewards: Sparks, shards, full cosmetics, titles, Snap-flash effects, Zone themes.

### 12.2 Earned "Elite" Track (the honest premium-track effect)

You can keep the *motivational contrast* of a paid premium track **without money** by gating an Elite track behind gameplay:

```text
Free Track  : unlocked by normal play
Elite Track : unlocked by completing all Weekly Missions this week
```

When the Elite track unlocks, apply **retroactive** rewards (this is safe because it's free, not monetized):

```text
You completed this week's missions. Elite Track unlocked.
All Elite rewards up to your current tier are now claimable.
```

This feels fantastic — progress was quietly building in the background — and it preserves the dual-track psychology with none of the financial harm.

### 12.3 Season FOMO — the safe version

```text
GOOD:  "Available during Season 2. May return in a future archive event."
BAD:   "Never returns. Last chance forever."
```

Old season cosmetics return via archive chests later. Never use permanent lockout, never "never returns" — especially given a young/CrazyGames audience.

---

## 13. The rewarded revive (the one ad touchpoint, framed as retention)

Coil already has a rewarded-revive system. Framed as retention rather than monetization, it does two jobs: extends sessions and turns a high-Flow death into a "save my run" moment. Design it honestly:

```text
On death, IF (run is notable: near PB / high Flow / past a Zone gate) AND (revive not yet used this run):
  → Offer ONE optional revive via rewarded ad OR a Spark cost.
  → Resume from a safe pivot just below death point, Flow preserved (or stepped down one).
  → Max one revive per run. After that, RETRY only.
```

Honesty rules (these protect trust and satisfy CrazyGames policy):

- **Deliver exactly what's promised.** Watch the ad → revive happens, immediately, every time. No bait-and-switch, no randomized "chance to revive."
- **Never required.** A player who never revives must be able to reach every reward, leaderboard tier, and cosmetic. Revive is convenience, not a gate.
- **Never nagged.** Offer once per qualifying death; if declined, go straight to RETRY. No re-prompts.
- Use CrazyGames' rewarded-ad SDK correctly (gameplay stop/start callbacks around the ad) so the climb pauses cleanly.

The retention value: the player who was 12m from a new PB gets one honest shot to save it — a genuine "so close, let me finish this" moment, not a manufactured trap.

---

## 14. Onboarding: the first 60 seconds

In hypercasual, the first session is the entire funnel. Get the player latching within ~3 seconds of load.

```text
0–3s   : Orb is already orbiting the first pivot. One prompt: "TAP to release."
3–8s   : First successful latch → immediate satisfying Snap + first Sparks.
~15s   : First Perfect Snap taught contextually ("Release at the glow = PERFECT").
~30s   : First death → instant RETRY → BEST line now exists to beat.
~60s   : First reward / first Climber Level → Daily Mission teaser → second run.
```

Principles:

- **No tutorial wall.** Teach by doing, one idea at a time, inside live play.
- **First-session generosity is not manipulative** (no money involved) — front-load rewards so the player learns the reward economy fast.
- The first death must immediately present the BEST line and a one-tap retry — the loop has to *click* before they can bounce.

---

## 15. Anti-frustration & adaptive assistance

A climber's risk is the rage-quit. Soften failure without removing challenge or shaming the player.

- **Generous CLEAN window early**, narrowing slowly with height — beginners survive on timing they can actually hit.
- **Repeated-fail assist:** if a player dies near the same low height several runs in a row, *quietly* widen the catch tolerance a touch for the next run (never announced, never a popup). Adaptive difficulty should be invisible.
- **Every death teaches:** show the honest `MISSED BY 6m` so the player learns the fix.
- **Never shame.** No "you failed again," no guilt copy. Failure framing is neutral and forward-pointing ("So close — beat 587m").
- Pity progress: even a short run grants *some* Sparks/XP, so no run is wasted time.

---

## 16. Notifications & UI pressure (honest, mostly in-game)

In a browser/CrazyGames context, in-game nudges matter far more than push.

- **Toasts** (non-blocking) for: daily reward ready, mission near-complete, chest unlocked, new Zone reached, new PB, season tier hit.
- **Badges** only for *real, claimable* things (a reward waiting, a new cosmetic). Never inflate badges for empty updates.
- **No blocking modals during a climb.** Ever. The only mid-run interruption permitted is the optional one-time revive offer on a qualifying death.
- **Soft visual hierarchy is fine:** RETRY is the bright primary, MENU is a clear smaller secondary. The decline/exit is always visible, honestly labeled, never fake-disabled.

---

## 17. The "always have something" checklist (mapped to Coil)

At every moment, a Coil player should have all seven. If any is missing, that's a retention hole.

| Need | Coil system |
|---|---|
| Something to **beat now** | BEST line + Echo (race yourself, live) |
| Something **almost done** | Nearest progress bar on the death screen (chest / daily / season) |
| Something **new to see** | The next Zone reveal |
| Something **improving** | Climber Level + Zone mastery |
| Something **rare to chase** | A specific cosmetic via shards |
| Something **personal to show** | Equipped orb/trail/title, profile banner |
| Something **to return for** | Tomorrow's Daily Ascent + weekly activity streak |

---

## 18. Return systems (the daily/weekly cadence)

- **Daily Ascent** (§7) — the primary return reason; new seed each UTC day.
- **Weekly activity streak (forgiving):** `Climb on any 3 days this week → weekly chest.` Missing a day never wipes earned rewards. Use streak *freezes*; never use "you're about to lose everything" copy.
- **Login gift = earned, not passive:** the reward lands after one quick Daily Ascent climb, so opening the app always converts into actual play.
- **Weekly event rotation** (Phase 3): flexible windows, not strict hours — `Double Sparks Weekend`, `Perfect-Snap Challenge`, `Storm Zone Rush`. Real timers only.

---

## 19. Coil-specific hard-NO list

These appear in the 166-technique library but **must not** ship in Coil — they erode trust and *raise* rage-quit/bounce even with no money at stake:

- Fake activity feeds / fake "X players online" / fake social proof counters
- Fake scarcity ("only 3 skins left") and resetting countdowns presented as real
- Exit-friction, sunk-cost guilt, emotional "don't abandon your climb" interruptions
- Confirmshaming ("No, I don't want to improve")
- Streak-warning anxiety copy
- Energy gates or artificial waits that **block** play (fatal in hypercasual)
- **Fake** near-miss (showing a Perfect window or rival ghost that wasn't real) — the honest near-miss in §4.4 is encouraged; the fabricated one is banned
- Modal stacking during a run
- Required ads / bait-and-switch revives
- Any vulnerability targeting

The litmus test for every borderline feature: **who does the pressure serve?** "Your chest is 94% full" (invites) and "Don't abandon your progress!" (traps) use the same lever — always pick the invite.

---

## 20. Data model (local-first; platform sync where available)

```json
{
  "playerId": "local-or-crazygames-id",
  "level": 12,
  "xp": 8420,
  "title": "Slingshot",
  "sparks": 1280,
  "bestHeight": 5870,
  "bestRunEcho": "<recorded-input-timeline>",
  "lifetimeHeight": 142300,
  "perfectSnapsTotal": 1840,
  "highestZone": 4,
  "lastPlayedDate": "2026-06-02",
  "weeklyActivityDays": ["Mon", "Wed"],
  "dailyAscent": { "seed": "2026-06-02", "best": 612, "claimed": true },
  "missions": { "daily": [], "weekly": [], "rerollUsed": false },
  "season": { "id": "season_02", "xp": 18400, "tier": 18, "eliteUnlocked": false },
  "collection": { "owned": [], "shards": {}, "equipped": { "orb": "", "trail": "", "snap": "", "title": "" } },
  "mastery": { "zone1": {}, "zone2": {} },
  "settings": { "reducedMotion": false, "echoVisible": true, "haptics": true }
}
```

### Run reward pipeline

```text
Run ends
→ base reward from Height
→ Flow multiplier applied to Height score + Sparks
→ Perfect-Snap bonus
→ first-run-of-day / new-PB modifiers
→ update XP, Climber Level
→ update Season XP
→ update missions
→ update Zone mastery
→ update chest / collection progress
→ pick the single nearest progress bar for the death screen
→ recommend next action ("Beat 587m to crack top 10%")
```

---

## 21. Implementation phasing

### Phase 1 — Minimum Viable Retention (ship this)

The core loop plus the cheapest, highest-impact hooks.

- Tight, fair release windows: CLEAN / PERFECT SNAP / MISS (§4.1–4.2)
- Flow multiplier (§4.3)
- Honest near-miss slow-mo (§4.4)
- **Instant retry** + death/result screen with one progress bar (§5.1–5.2)
- **Personal best + BEST line in world + PB celebration** (§5.3–5.4) — highest ROI in the doc
- Sparks currency + a starter set of cosmetics + equip (§11)
- Climber Level + XP + first unlocks (§8)
- Toasts/badges for real events (§16)
- 60-second onboarding (§14)

### Phase 2 — Strong Retention

- **Daily Ascent + daily leaderboard** (§7)
- **Echo ghost** (§6)
- Daily + Weekly Missions, rerolls (§9)
- Zones 1–4 + Zone reveals (§10.1)
- Free Season Track (30 tiers) (§12.1)
- Weekly activity streak (forgiving) (§18)
- Rewarded revive, honest (§13)

### Phase 3 — Advanced Retention

- Earned Elite Track + retroactive unlock (§12.2)
- Zone mastery tracks (§10.2)
- Shard system + collection completion bonuses (§11.3–11.4)
- Rival Echoes (honestly labeled) (§6)
- Weekly event rotation, flexible windows (§18)
- Career milestones (§9.3)

### Phase 4 — Live-Service Layer

- Monthly seasons + archive chests
- Prestige / Coilmaster track
- Rotating challenge modifiers (one-life, mirror-Coil, no-Echo)
- Long-term collection albums + completion meta-titles

---

## 22. Metrics

### Core

- D1 / D7 / D30 retention
- **Retry rate after death** (the genre's master metric — target >80%)
- Runs per session
- **PB-beat rate** (sessions that produced a new best)
- Daily Ascent participation rate
- Daily/Weekly mission completion rate
- Median session length (expect short; optimize for *return*, not minutes)
- Season tier distribution

### Quality (do not optimize time-spent at the expense of these)

- Bounce after first death (onboarding failure signal)
- Repeated-fail-then-quit (frustration signal → tune §15 assist)
- Rage-quit signals (rapid app close mid-run)
- Reduced-motion / Echo-off toggles flipped (overstimulation signal)
- Revive decline rate (if near 100%, the offer is mistimed or annoying)

---

## 23. Anti-addiction guardrails

- No real-money pressure, anywhere.
- No fake scarcity, fake social proof, or fake near-miss.
- No play-blocking energy gates or waits.
- No punishment for missing days; earned rewards are never removed.
- No guilt copy; failure framing is always neutral and forward-pointing.
- No vulnerability targeting; no late-night/spend-history nudging.
- Clear reduced-motion, haptics, and Echo toggles.
- Always-visible, honest exit.
- Rewards make climbing feel *meaningful*, never *mandatory*.

---

## 24. Final principle

Coil's retention is not built on trapping the climber. It's built on **unfinished desire** plus **the cleanest skill loop you can tune.**

Every session, the player should feel:

```text
That release felt incredible.
I was so close to my best.
I almost finished that chest.
I want to see the next Zone.
I'll beat today's Ascent tomorrow.
One more climb.
```

That is the same psychological machinery the darker systems use — minus the deception, the financial harm, the shame, and the obstruction. Keep the motivation, drop the manipulation, and Coil earns the return instead of forcing it.
