# Sampled SFX — drop-in folder

Drop real sound-effect files here and they're used automatically, **replacing the
procedural Web-Audio tone for that event only**. Anything you don't provide keeps
its zero-weight procedural fallback, so you can add them one at a time.

## How it works
`src/core/audio.ts` globs this folder (`*.mp3 | *.ogg | *.wav`), lazily fetches +
decodes the files **after the first user gesture** (so first paint stays fast), and
each `SFX.*` method plays its sample if present, else the procedural tone. No code
changes needed — just match the filenames below.

## Filenames (lowercase, exact — extension may be .mp3 / .ogg / .wav)
| File        | Fires on                          | Priority |
|-------------|-----------------------------------|----------|
| `perfect`   | a perfect-window fling            | ★ highest |
| `combo`     | a combo-tier-up (x3/x5/x8/x12)    | ★ highest |
| `coin`      | coin / spark pickup               | ★ highest |
| `death`     | run ends (void / fall / collapse) | ★ highest |
| `unlock`    | cosmetic unlock fanfare           | ★ highest |
| `fling`     | a normal (non-perfect) release    | optional |
| `bonus`     | bonus-node catch                  | optional |
| `catch`     | latching onto any gate            | optional |

`perfect` and `catch` are pitch-shifted up slightly at higher combos (the engine
nudges `playbackRate`), so record them at a neutral / low-combo pitch.

## Specs (keep them tiny — they lazy-load, but smaller = snappier)
- **Short:** most ≤ 250 ms; `death`/`unlock` up to ~0.8 s. No long tails.
- **Mono**, 44.1 kHz. Prefer **.ogg** or **.mp3** (~96–128 kbps) for size.
- **Loudness-normalized** and consistent with each other (CrazyGames quality bar:
  comfortable, consistent volume). Leave a hair of headroom — they mix on top of
  the music bed and other SFX.
- Target a few KB each; the whole set should be well under ~150 KB.
