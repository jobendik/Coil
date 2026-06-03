/* =========================================================================
   RENDER SMOKE TEST

   The perf pass caches several gradients and draws them via ctx.translate (the
   "build at the origin, translate to position" trick, which is mathematically
   identical to a moving-centre gradient). Its one realistic failure mode is an
   unbalanced ctx.save()/restore() (a stray translate that never gets undone,
   skewing every later frame). This drives a real play frame (high FX so the
   nebula + streak caches run, with generated nodes and an active combo flash) and
   a home frame through a recording context, asserting the scene renders without
   throwing AND that save/restore returns to a net depth of zero with no underflow.
   ========================================================================= */
import { state, resetRun } from '../src/game/state';
import { update } from '../src/game/update';
import { renderPlay } from '../src/scenes/play';
import { renderHome } from '../src/scenes/home';
import { view, initCanvas, resize } from '../src/core/canvas';
import { fx } from '../src/core/utils';

initCanvas();
resize();

let failures = 0;
const check = (c: boolean, m: string): void => { if (!c) { failures++; console.error('  ✗ ' + m); } };

// Recording 2D context: every method is a no-op, but save/restore adjust a depth
// counter and gradient factories return a stub. Property assignments are ignored.
let depth = 0;
let minDepth = 0;
const gradStub = { addColorStop(): void { /* no-op */ } };
const recCtx = new Proxy({}, {
  get(_t, p) {
    if (p === 'save') return (): void => { depth++; };
    if (p === 'restore') return (): void => { depth--; if (depth < minDepth) minDepth = depth; };
    if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => gradStub;
    if (p === 'measureText') return () => ({ width: 10 });
    return (): void => { /* no-op */ };
  },
  set() { return true; },
}) as unknown as CanvasRenderingContext2D;
view.ctx = recCtx;

function frame(label: string, fn: () => void): void {
  depth = 0;
  minDepth = 0;
  let threw = '';
  try { fn(); } catch (e) { threw = (e && (e as Error).message) || String(e); }
  check(threw === '', `${label}: renders without throwing${threw ? ' — ' + threw : ''}`);
  check(depth === 0, `${label}: ctx save/restore balanced (net depth ${depth})`);
  check(minDepth >= 0, `${label}: no stray restore (min depth ${minDepth})`);
}

// HIGH tier so the nebula + streak (translate-cached) gradients actually draw.
fx.level = 'high';

// PLAY: generate some nodes, then force an active combo flash so drawComboFlash's
// cached radial runs too.
resetRun(false, false);
state.scene = 'play';
for (let i = 0; i < 40; i++) update(1 / 60);
state.G.comboFlash = 1;
state.G.comboFlashColor = '#2ff3e0';
frame('play (first — cache fill)', () => renderPlay());
frame('play (second — cache hit)', () => renderPlay());

// HOME for broader coverage of the meta render path.
state.scene = 'home';
frame('home', () => renderHome(1 / 60));

if (failures === 0) {
  console.log('render-smoke: ✓ play + home render cleanly with balanced ctx save/restore');
} else {
  console.error(`  ${failures} render-smoke failures`);
  process.exit(1);
}
