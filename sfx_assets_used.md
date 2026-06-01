# COIL — SFX Assets In Use

> A swap-map for the game's sound effects: **what's playing, where it came from, and
> every alternative you can swap in.**
>
> **Every event ships a real sample — no procedural/synthesized SFX is ever heard.**
> Active samples live in [`src/assets/sfx/`](src/assets/sfx/) (**23 files**, ~784 KB).
> The raw audition library lives in `sfxCandidates/` (git-ignored, ~43 MB).
>
> Two provenance types below:
> - **Curated (root):** a finished file you dropped in the project root; moved in and
>   used **as-is** (full length, your levels — not re-trimmed).
> - **Converted (candidate):** picked from `sfxCandidates/` and run through the
>   trim + fade + loudness-normalize + mono-MP3 pipeline.

---

## How the sampling works (read first)

- The loader in [`src/core/audio.ts`](src/core/audio.ts) globs `src/assets/sfx/*.{mp3,ogg,wav}`,
  lazy-loads after the first tap, and **every event plays its sample.**
- The **filename = the event key** (lowercase, exact). Drop a file with the right
  name in `src/assets/sfx/` to replace a sound — no code change.
- **Multiple variants per event:** a **trailing number** is stripped to form the key,
  so `click1.mp3` / `click2.mp3` / `click3.mp3` all group under `click` and **one is
  chosen at random each time** (kills repetition fatigue on frequent UI sounds). A
  plain `coin.mp3` → key `coin` (single variant). Currently `click` and `tick` use 3
  variants each; everything else is single.
- **No procedural plays.** The Web-Audio synthesis in `audio.ts` remains only as an
  inert load-failure safety net (it can fire solely if a sample fails to decode).
- `perfect` and `catch` get `playbackRate` nudged **up** at higher combos — keep them
  neutral-pitched.

### To swap a CONVERTED (candidate) sound
```bash
ffmpeg -y -i "sfxCandidates/<FOLDER>/<FILE>.wav" -t <T> \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=out:st=<FADE_ST>:d=<FADE_DUR>" \
  -ac 1 -ar 44100 -codec:a libmp3lame -b:a 96k "src/assets/sfx/<EVENT>.mp3"
```
Params are in the [defaults table](#conversion-defaults-converted-files). To swap a
**curated (root)** sound, just drop a new `<event>.mp3` in `src/assets/sfx/`.

> ⚠️ **Content-dedupe:** Vite hashes assets by content, so two events made from the
> *same source + same trim* collapse to one asset and sound identical. Use different
> source files or trims to keep them distinct (e.g. `perfect` and `combo` both use
> *glass ding 1* but at 0.70 s vs 0.95 s, so they stay separate).

> Tip: just say "swap `catch` to `glass ding 2`" and I'll re-convert it.

---

## Active samples — full table (19 events / 23 files)

### Core gameplay (8)
| Event | Fires on | Game fn | Source | Provenance |
|---|---|---|---|---|
| `perfect` | perfect-window fling | `SFX.perfect()` | `03_perfect/glass ding 1` | converted · 0.70 s |
| `combo` | combo tier-up (x3/x5/x8/x12) | `SFX.milestone()` | `07_milestone/glass ding 1` | converted · 0.95 s |
| `coin` | coin / spark pickup | `SFX.coin()` | **root** `coin.mp3` | curated · 0.88 s |
| `bonus` | bonus-node catch | `SFX.bonus()` | `05_bonus/hit with melodic resonance 1` | converted · 0.80 s |
| `catch` | latching onto a gate | `SFX.catch()` | `02_catch/catch ball 5` | converted · 0.32 s |
| `fling` | normal (non-perfect) release | `SFX.fling()` | `01_fling/woosh 2` | converted · 0.50 s |
| `unlock` | cosmetic unlock fanfare | `SFX.unlock()` | **root** `unlock.mp3` | curated · 0.62 s |
| `death` | run ends (void / fall / collapse) | `SFX.death()` | **root** `death.mp3` | curated · 6.12 s |

### Economy / UI (8)
| Event | Fires on | Game fn | Source | Provenance |
|---|---|---|---|---|
| `shield` | shield power-up gained / consumed | `SFX.shield()` | **root** `shield.mp3` | curated · 0.89 s |
| `click` 🎲 | UI button tap | `SFX.click()` | `10_click/clicky button 1·2·3` | converted · 3 variants |
| `tick` 🎲💤 | count-up roll *(no call sites — unused)* | `SFX.tick()` | `10_click/button assorted 1·2·3` | converted · 3 variants |
| `deposit` | coin lands in the bank (count-up) | `SFX.deposit()` | **root** `deposit.mp3` | curated · 0.60 s |
| `chaching` | cash-register (purchase / payout) | `SFX.chaching()` | `13_chaching/oven ding 1` | converted · 0.60 s |
| `cascade` | coin tumble (bonus catch) | `SFX.coinCascade()` | **root** `cascade.mp3` | curated · 1.90 s |
| `jackpot` | daily-medal / vault fanfare | `SFX.jackpot()` | **root** `jackpot.mp3` | curated · 5.64 s |
| `riser` | ascending anticipation before payout | `SFX.riser()` | **root** `riser.mp3` | curated · 3.48 s |

### Fanfare layers (3 — stacked on top of big-win cues)
| Event | Fires on | Game fn | Source | Provenance |
|---|---|---|---|---|
| `cheer` | crowd swell on big wins | `cheerSwell()` | **root** `cheer_swell.mp3` → `cheer.mp3` | curated · 2.12 s |
| `cymbal` † | bright fanfare topping (purchases, unlocks, wins) | `cymbal()` | `18_big_win/glass full of beads 2` | converted · 0.55 s |
| `bigwin` | layered big-win stinger (frenzy / vault / milestones) | `bigWinAudio()` | **root** `big_win.mp3` → `bigwin.mp3` | curated · 2.54 s |

🎲 random variant each play · 💤 wired but `SFX.tick()` has **no call sites** today.
† `cymbal` is the only event you didn't provide a sound for — it keeps its previous
candidate pick (a bead shimmer). Drop a `cymbal.mp3` to replace it.

---

## Per-event alternatives (candidate library)

Current pick = `★`. To swap, convert the chosen file to `src/assets/sfx/<event>.mp3`
(curated events: just overwrite the file). Folders live in `sfxCandidates/`.

| Event | Folder | Files (★ = current) |
|---|---|---|
| `perfect` | `03_perfect/` | ★`glass ding 1` · `…2`–`…5` · `hit with melodic resonance 1`–`4` |
| `combo` | `07_milestone/` | ★`glass ding 1` · `…2`–`…5` · `hit with melodic resonance 1`–`4` |
| `coin` | `04_coin/` | `ding 1`–`3` · `glass clink 1`–`5` · `metal button pop up 1`–`3` *(now a root file)* |
| `bonus` | `05_bonus/` | ★`hit with melodic resonance 1` · `…2`–`…4` · `glass ding 1`–`3` · `slide whistle 1`–`4` |
| `catch` | `02_catch/` | `catch ball 1`–`4` · ★`catch ball 5` · `glass ding 1`–`3` · `ping pong ball hit 1`–`3` |
| `fling` | `01_fling/` | `swoosh 1`–`5` · `throw` · `woosh 1` · ★`woosh 2` · `…3` · `…4` |
| `unlock` | `08_unlock/` | `novelty noise maker 1`–`5` · `party blower 1`–`3` · `slide whistle 1`–`3` *(now a root file)* |
| `death` | `09_death/` | `body fall 1`–`3` · `body fall with lots of bass 1`–`4` · `rumbling 1`–`4` *(now a root file)* |
| `shield` | `06_shield/` | `novelty noise maker 1`–`3` · `slide whistle 1`–`5` *(now a root file)* |
| `click` | `10_click/` | ★`clicky button 1·2·3` · `clicky button 4·5` · `button assorted 1`–`5` · `button pressed 1`–`3` · `switch press 1`–`3` |
| `tick` | `10_click/` `11_tick/` | ★`button assorted 1·2·3` · `button pressed 1`–`3` · `knob clicky turn 1`–`6` |
| `deposit` | `12_deposit/` | `glass clink 1`–`4` · `glass ding 1`–`3` · `metal latch 1`–`3` *(now a root file)* |
| `chaching` | `13_chaching/` | `ding 1`–`3` · `glass ding 1`–`3` · `metal button pop up 1`–`3` · ★`oven ding 1` · `…2` |
| `cascade` | `14_coin_cascade/` | `glass full of beads 1`–`5` · `plastic cascade 1`–`4` · `silverware chaos 1`–`5` · `silverware dropped 1`–`4` *(now a root file)* |
| `jackpot` | `15_jackpot/` | `novelty noise maker 1`–`4` · `party blower 1`–`3` · `scream 1`–`3` *(now a root file)* |
| `riser` | `16_riser/` | `novelty noise maker spinner 1`–`3` · `party blower 1`–`4` · `slide whistle 1`–`5` *(now a root file)* |
| `cheer` | `17_cheer_swell/` | `feedback 1`–`3` · `scream 1`–`5` *(now a root file)* |
| `cymbal` / `bigwin` | `18_big_win/` | `glass full of beads 1` · ★cymbal`…2` · `…3` · `hit with melodic resonance 1`–`4` · `rumbling 1`–`3` *(bigwin now a root file)* |

To add more random variety to `click`/`tick`, just drop extra numbered files
(`click4.mp3`, …) — they auto-join the random pool.

---

## Procedural-only events

**None.** Every event has a sample; the synthesis is an inert load-failure safety net.

---

## Conversion defaults (converted files)

Converted samples: **mono · 44.1 kHz · MP3 96 kbps · loudnorm `I=-16:TP=-1.5:LRA=11`
· fade-out tail**. (Curated root files are used as-provided — no row here.)

| Event | `-t` | fade st | fade dur |
|---|---|---|---|
| `perfect` | 0.70 | 0.45 | 0.25 |
| `combo` | 0.95 | 0.60 | 0.35 |
| `bonus` | 0.80 | 0.50 | 0.30 |
| `catch` | 0.32 | 0.24 | 0.08 |
| `fling` | 0.50 | 0.38 | 0.12 |
| `chaching` | 0.60 | 0.40 | 0.20 |
| `click1–3` | 0.16 | 0.10 | 0.06 |
| `tick1–3` | 0.18 | 0.11 | 0.07 |
| `cymbal` | 0.55 | 0.35 | 0.20 |

Curated (root, as-is): `coin` `unlock` `death` `shield` `deposit` `cascade`
`jackpot` `riser` `cheer` `bigwin`.

> Note: the curated set is longer/heavier (death 6.1 s, jackpot 5.6 s, riser 3.5 s),
> so the SFX total is ~784 KB (up from ~180 KB). Still lazy-loaded after first tap, so
> first paint is unaffected. If you want them loudness-matched to each other / the
> music, or trimmed shorter, say the word.

See also the drop-in spec in [`src/assets/sfx/README.md`](src/assets/sfx/README.md).
