/* =========================================================================
   ZEN RE-ENTRY TEST

   Zen mode has no death: dropping off the bottom glides you back ONTO the
   nearest gate above. A perfectly vertical fall (vx === 0) previously bounced
   up/down forever. This guards that a straight-down fall re-attaches to a gate
   (latched) rather than oscillating.
   ========================================================================= */
import { state, resetRun } from '../src/game/state';
import { update } from '../src/game/update';
import { view, initCanvas, resize } from '../src/core/canvas';

initCanvas();
resize();

let failures = 0;
const check = (cond: boolean, msg: string): void => {
  if (!cond) { failures++; console.error('  ✗ ' + msg); }
};

// Player falling PERFECTLY straight down (vx === 0) off the bottom, with a gate
// above. One update should glide them onto it.
resetRun(false, true);                       // zen = true
const G = state.G;
const pl = G.player;
G.tut = -1;
state.scene = 'play';
pl.latched = false;
pl.lastReleased = null;
pl.wx = view.W / 2; pl.wy = -60; pl.vx = 0; pl.vy = -120;   // straight down, below screen
G.cameraY = 0;
G.nodes = [{ wx: view.W / 2 + 30, wy: 140, r: 18, type: 'normal', baseX: view.W / 2 + 30, next: null }];
G.lastNodeY = pl.wy + 2 * view.H;            // suppress genNode

let latched = false;
let oscillated = false;
let prevVy = pl.vy;
for (let i = 0; i < 30; i++) {
  update(1 / 60);
  if (pl.latched) { latched = true; break; }
  // detect an unending vertical bounce: vy keeps flipping sign with vx still 0
  if (pl.vx === 0 && Math.sign(pl.vy) !== Math.sign(prevVy) && i > 2) oscillated = true;
  prevVy = pl.vy;
}

check(latched, 'a straight-down Zen fall should re-attach to a gate (latched)');
check(!G.dead, 'Zen should never kill the player');
check(!(oscillated && !latched), 'Zen must not bounce vertically forever');

if (failures === 0) {
  console.log('zen: ✓ a vertical fall glides back onto a gate (no infinite bounce)');
} else {
  console.error(`  ${failures} zen re-entry failures`);
  process.exit(1);
}
