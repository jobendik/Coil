# Submitting COIL to CrazyGames

Everything in the code is wired for CrazyGames. This file is the handoff for the
parts that happen on the developer portal.

## Build the submission bundle

```bash
npm run build:cg
```

This outputs `dist-cg/` with **relative** asset paths (`./assets/...`), which is what
CrazyGames requires — the default `npm run build` (→ `dist/`) uses absolute `/Coil/`
paths for GitHub Pages and must **not** be submitted.

Zip the **contents** of `dist-cg/` (so `index.html` is at the zip root) and upload that.

- Bundle size: ~9 MB total, ~35 files — well under the 250 MB / 1500-file caps.
- Initial download is tiny (JS + CSS + 2 fonts); the large music tracks lazy-load on
  the first input gesture, so time-to-first-frame is fast.
- Fully self-contained: the only external request is the CrazyGames SDK itself
  (`sdk.crazygames.com`, required). Fonts and audio are bundled locally; no Google
  Fonts, CDNs, analytics, or external network calls.

## Submission-form answers

| Question | Answer |
|---|---|
| Does your game save progress? | **Yes — using the Data Module from the CrazyGames SDK** |
| Supports mobile devices | **Yes** (portrait; pointer/touch input) |
| Online multiplayer | **No** |
| Supports CrazyGames muting audio through SDK | **Yes** |
| Orientation | **Portrait** |
| Content rating | PEGI 12 friendly (abstract arcade) |

## SDK integration (all in `src/core/cg.ts`, defensive — no-ops off-platform)

- **Init**: `await SDK.init()` on load (`index.html` includes `crazygames-sdk-v3.js`).
- **Loading handshake**: `game.loadingStart()` on init → `game.loadingStop()` on the
  first rendered frame (`CG.loadingDone()` from the main loop).
- **Gameplay events**: `game.gameplayStart()` on play begin / revive / replay;
  `game.gameplayStop()` on run end. Deliberately **not** fired on tab focus changes
  (per CrazyGames guidance — the loop still pauses + mutes locally on `visibilitychange`).
- **Ads**: `requestAd('midgame')` before replay, `requestAd('rewarded')` for revive /
  bonuses. SFX + music are muted and the loop is paused for the ad's duration, with
  generous "SDK went silent" timeouts so play always resumes (works with AdBlock / no SDK).
- **Audio mute**: honours `game.settings.muteAudio` + `addSettingsChangeListener`,
  via a non-persisted flag that gates both SFX and music without touching the
  player's own saved audio prefs.
- **happytime**: fired on genuine milestones (new best, zone unlock, jackpot),
  rate-limited to one signal per 30 s so it stays a special moment.
- **Cross-device save**: localStorage is the source of truth, mirrored to
  `SDK.data`; a fresh device for a logged-in player hydrates from the cloud once.
- **Leaderboards**: wired but dormant behind `LEADERBOARDS_ENABLED` (invite-only).

## Still on you (portal-side, can't be done from code)

- Cover image + screenshots + (optional) trailer.
- Game description and controls text.
- Run the portal's **QA tool** against the uploaded build.
