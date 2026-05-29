/* =========================================================================
   DOOMED-FLIGHT FAST-FORWARD TEST

   A gentle launch means a hopeless fling can float up and drift down for 3–4 s
   before death registers. update.ts runs a lookahead (predictDoom) and sets
   G.doomed when a fling provably can't catch any gate, so the main loop can
   fast-forward the inevitable. This guards the two cases that matter:

     A. A fling falling into the void with no reachable gate IS flagged doomed.
     B. A fling aimed straight at a reachable gate is NEVER flagged doomed
        (it just catches) — so good play is never sped up.
   ========================================================================= */
import { state, resetRun } from '../src/game/state';
import { update } from '../src/game/update';
import { view, initCanvas, resize } from '../src/core/canvas';
import type { Node } from '../src/types';

initCanvas();
resize();

let failures = 0;
const check = (cond: boolean, msg: string): void => {
  if (!cond) { failures++; console.error('  ✗ ' + msg); }
};

function unreachable(): Node {
  return { wx: 40, wy: 1000, r: 18, type: 'normal', baseX: 40, next: null };
}

// A — DOOMED: on-screen, falling, only an unreachable gate; generation suppressed.
{
  resetRun(false);
  const G = state.G;
  const pl = G.player;
  G.tut = -1;
  state.scene = 'play';
  pl.latched = false;
  pl.lastReleased = null;
  pl.wx = view.W / 2; pl.wy = 400; pl.vx = 0; pl.vy = -220;
  G.cameraY = 0; G.maxY = 400; G.voidY = -100; G.invuln = 0;
  G.nodes = [unreachable()];
  G.lastNodeY = pl.wy + 2 * view.H;     // keep genNode from refilling reachable gates
  let doomed = false;
  for (let i = 0; i < 10 && !G.dead; i++) { update(1 / 60); if (G.doomed) { doomed = true; break; } }
  check(doomed, 'A: a hopeless fall into the void should be flagged doomed');
}

// B — SAFE: a gate sits directly in the upward path; must NOT be flagged doomed.
{
  resetRun(false);
  const G = state.G;
  const pl = G.player;
  G.tut = -1;
  state.scene = 'play';
  pl.latched = false;
  pl.lastReleased = null;
  pl.wx = view.W / 2; pl.wy = 0; pl.vx = 0; pl.vy = 580;
  G.cameraY = -0.42 * view.H; G.maxY = 0; G.voidY = -1.0 * view.H;
  G.nodes = [{ wx: view.W / 2, wy: 120, r: 18, type: 'normal', baseX: view.W / 2, next: null }];
  G.lastNodeY = pl.wy + 2 * view.H;
  let falseDoom = false;
  for (let i = 0; i < 14 && !pl.latched; i++) { update(1 / 60); if (G.doomed) { falseDoom = true; break; } }
  check(!falseDoom, 'B: a fling aimed at a reachable gate must never be flagged doomed');
  check(pl.latched, 'B: the player should latch onto the reachable gate');
}

if (failures === 0) {
  console.log('doom: ✓ doomed falls fast-forward, good flings are untouched');
} else {
  console.error(`  ${failures} doom-prediction failures`);
  process.exit(1);
}
