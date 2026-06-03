# Background music — drop-in track folder

Drop extra looping music tracks here (`*.mp3` / `*.ogg`) and they **join the
right pool automatically**, sorted by filename. The bundled
`src/assets/background_music.mp3` is gameplay track 0 (always present); every file
in this folder is an additional track.

## Pools (by filename, case-insensitive)
`src/core/music.ts` globs this folder and sorts each file into one of three beds:

| Filename contains… | Pool | Plays during |
| --- | --- | --- |
| `zen` | Zen | the calm Zen mode (alongside the procedural ambient) |
| `menu` or `deep_void` | Lobby | home & shop (one **stable** menu theme) |
| anything else | Gameplay | active runs (shuffled rotation) |

## How it works
- **Lobby** plays one stable menu theme the whole time the player is browsing.
- **Gameplay** draws from a *shuffle bag* (each track once before any repeat) and
  keeps the **same track across quick replays** — it only rotates after ~3 minutes
  of *actual play* (`GP_ROTATE_S` in `music.ts`). So short runs don't churn the
  music every 30 s, while a long session (the 10-minute playtime window CrazyGames
  measures) still gets variety.
- The end-of-run screens (result / ascent / tease) **hold** the run's bed; music
  only switches back to the lobby theme when the player returns home.
- Tracks load **lazily** — an `<audio>` element is created the first time a track
  is picked — and are cached + reused. With no extra files every pool collapses
  onto track 0: a single, non-churning bed everywhere.

## How many?
**3–5 is the sweet spot.** More is fine *only if each file is small*, because of the
download budget (see below). Aim for at least one lobby track (`menu`/`deep_void`)
and 2–3 gameplay tracks so the rotation has something to shuffle.

## Specs (size is the real constraint)
- **Seamlessly loopable** (no audible seam at the loop point).
- **Compressed:** ~96–128 kbps, mono or joint-stereo. **Target ≤ ~1.5–2 MB each.**
  The current single track is ~4 MB — aim smaller for the rotation tracks.
- **Loudness-matched** to the existing track and to each other, so crossfades and
  swaps aren't jarring (CrazyGames quality bar: consistent, comfortable volume).
- **No embedded cover art / ID3 tags.** The game streams audio only (canvas, no
  player UI), so an attached picture is dead weight. Strip it losslessly — e.g.
  `ffmpeg -i in.mp3 -map 0:a -c:a copy -map_metadata -1 out.mp3` (audio untouched).

## ⚠️ Download budget (important)
All music is lazy-loaded after the first tap, so it never blocks first paint — but
CrazyGames **mobile-homepage eligibility requires initial download ≤ 20 MB** and the
total project ≤ 250 MB. Keep the *sum* of all tracks modest: e.g. 1 × 4 MB default +
4 × ~1.5 MB = ~10 MB total, comfortably under the cap. If you want 10 tracks, push
each down to ~1 MB.
