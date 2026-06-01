# Background music — drop-in rotation folder

Drop extra looping music tracks here (`*.mp3` / `*.ogg`) and they **join the
rotation automatically**. The bundled `src/assets/background_music.mp3` is track 0
(always present); every file in this folder is an additional track.

## How it works
`src/core/music.ts` globs this folder and builds a track list. `Music.cycle()` runs
at the start of every run and **crossfades to a different track**, so a long session
(the 10-minute playtime window CrazyGames measures) doesn't loop one tune. Tracks
load **lazily** — an `<audio>` element is only created the first time a track is
picked — and are cached + reused. With no extra files, behavior is identical to
today (single track, no cycling).

## How many?
**3–5 is the sweet spot.** More is fine *only if each file is small*, because of the
download budget (see below). The procedural intensity layer already adds
within-track variation as the combo builds, so you don't need a huge library.

## Specs (size is the real constraint)
- **Seamlessly loopable** (no audible seam at the loop point).
- **Compressed:** ~96–128 kbps, mono or joint-stereo. **Target ≤ ~1.5–2 MB each.**
  The current single track is ~4 MB — aim smaller for the rotation tracks.
- **Loudness-matched** to the existing track and to each other, so crossfades and
  swaps aren't jarring (CrazyGames quality bar: consistent, comfortable volume).

## ⚠️ Download budget (important)
All music is lazy-loaded after the first tap, so it never blocks first paint — but
CrazyGames **mobile-homepage eligibility requires initial download ≤ 20 MB** and the
total project ≤ 250 MB. Keep the *sum* of all tracks modest: e.g. 1 × 4 MB default +
4 × ~1.5 MB = ~10 MB total, comfortably under the cap. If you want 10 tracks, push
each down to ~1 MB.
