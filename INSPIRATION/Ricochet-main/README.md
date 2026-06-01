# Ricochet

A Pang-style arcade game built with vanilla TypeScript and Canvas 2D, with an integrated dark-pattern simulation layer that demonstrates 166 real manipulative design techniques in a safe, clearly-labelled context.

## What it is

**Ricochet** is a browser arcade game where you pop bouncing balls before they multiply. Built without frameworks — raw Canvas 2D, Web Audio API, and TypeScript.

On top of the game sits **Ricochet Systems** — an educational dark-pattern director that intercepts game events (play, wave clear, game over, quit) and overlays real-world monetisation dark patterns as they would appear in a commercial mobile game. Every technique is identified by name, risk level, and category. Nothing is real — no payments, no tracking, no ads.

The goal is to make dark patterns legible by showing them in motion, in context, with their mechanics exposed.

## Tech stack

| Layer | Tech |
|---|---|
| Game engine | Vanilla Canvas 2D + Web Audio API |
| Language | TypeScript 5.4 |
| Bundler | Vite 5.2 |
| Styling | CSS custom properties + 9 modular CSS files |
| Framework | None |

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) (or whichever port Vite picks).

```bash
npm run build    # type-check + bundle to dist/
npm run preview  # preview the production build
```

## Dark pattern layer

The simulation director (`src/systems/director.ts`) intercepts every meaningful game event:

| Trigger | Technique category shown |
|---|---|
| First session load | Privacy & consent |
| Play button | Pre-play onboarding (economy, progression, scarcity) |
| Every 10 ball pops | Reward moments (progression, gacha, visual) |
| Wave clear | Battle pass, scarcity, social proof |
| Lose a life | Loss recovery (progression, economy, meta) |
| Game over | Results wrapper (exit, gacha, battle pass) |
| Quit / go to menu | Exit interruption |

The director covers **166 techniques** across 12 groups:

`economy` · `scarcity` · `progression` · `gacha` · `vip` · `social` · `exit` · `visual` · `privacy` · `ads` · `meta` · `battlepass`

Each technique carries a name, description, risk level (`Critical` / `High` / `Medium` / `Low`), regulatory category, and example demo. All data is in `src/systems/techniques.ts`.

### Keyboard shortcuts (in-browser)

| Key | Action |
|---|---|
| `T` | Advance to next technique |
| `R` | Reset the 166-technique counter |

The chip in the top-right (`Season systems 0/166`) also advances manually.

## Project structure

```
src/
  game/
    main.ts        — entry point
    state.ts       — global game state
    canvas.ts      — canvas setup + resize
    physics.ts     — ball / paddle / collision
    renderer.ts    — draw loop
    flow.ts        — scene transitions, scoring, game over
    audio.ts       — Web Audio sound effects
    input.ts       — keyboard + pointer input
    powerups.ts    — powerup types and logic
    hooks.ts       — event hook interface (onPopBall, onNextWave, …)
  systems/
    director.ts    — dark-pattern simulation director
    techniques.ts  — 166 technique definitions
  styles/          — 9 CSS modules (tokens, base, menu, hud, fx, overlays, sim, responsive, index)
  types/index.ts   — shared TypeScript types
  utils/helpers.ts — small utility functions
index.html         — shell + DOM for all screens
dp.html            — original monolith (reference / archive)
retention.md       — retention design notes
```

## Disclaimer

All dark patterns shown are simulations. No real money is charged. No real data is collected. No real scarcity or social proof is used. The "activity feed" is generated. The purpose is education and critical awareness, not exploitation.

## License

MIT
