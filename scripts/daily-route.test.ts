/* =========================================================================
   DAILY ROUTE — WIDTH-INDEPENDENCE + HONESTY

   The Daily Challenge must be the SAME seeded route for every player today,
   regardless of their screen width. Node x-positions, the fairness pull-back,
   and the flight physics used to be clamped to the live canvas width, so a
   390-wide phone and a 540-wide tablet generated DIFFERENT layouts. The fix
   generates + simulates a daily run in a FIXED virtual width (DAILY_VW) centred
   in the canvas (game/state.ts fieldLeft/fieldRight). This test proves:

     A. WIDTH-INDEPENDENCE — the same seed produces a byte-identical route in
        the virtual frame (node.wx - fieldX, wy, type, motion, sparks, spikes)
        across a spread of canvas widths. If the seeded RNG consumption OR any
        placement diverged at any step, every node after it would drift — so a
        full-array match is a strong end-to-end proof.

     B. HONESTY — when the field is OFFSET (a non-390 canvas), every angle the
        gate lights up still brings the real swept flight within catch radius,
        and every node stays reachable. Re-flown with an INDEPENDENT finer-step
        integrator that bounces off the daily field walls — so it's a genuine
        cross-check that the gate and the flight agree about where the walls are.

   Run via `npm test`. Exits non-zero on any violation.
   ========================================================================= */
import { state, resetRun, fieldLeft, fieldRight } from '../src/game/state';
import { genNode, setRunSeed } from '../src/game/nodes';
import { computeSweetZone } from '../src/game/physics';
import { CATCH_PAD, DAILY_VW, G_FALL, LAUNCH, ORBIT, WALL } from '../src/config';
import { view, initCanvas, resize } from '../src/core/canvas';
import type { Node } from '../src/types';

initCanvas();
resize();

const TAU = Math.PI * 2;
let failures = 0;
const fail = (msg: string): void => { failures++; if (failures <= 20) console.error('  ✗ ' + msg); };

/** Generate `calls` nodes of a daily run at canvas width W, with a FIXED seed
 *  (overriding the date seed) so the comparison is reproducible. Returns the
 *  route in VIRTUAL coordinates (x relative to the field's left edge). */
function dailyRoute(W: number, seed: number, calls: number): {
  fieldX: number;
  field: number;
  nodes: Array<{ vx: number; wy: number; type: string; r: number; amp: number; spd: number; ph: number }>;
  sparks: Array<{ vx: number; wy: number; kind: string }>;
} {
  view.W = W;
  view.H = 740;
  resetRun(true);            // daily → freezes fieldX from view.W, seeds with the date
  setRunSeed(seed);          // override with a fixed seed for a reproducible comparison
  const fieldX = state.G.fieldX;
  for (let i = 0; i < calls; i++) genNode();
  return {
    fieldX,
    field: fieldRight() - fieldLeft(),
    nodes: state.G.nodes.map((n) => ({
      vx: n.wx - fieldX, wy: n.wy, type: n.type, r: n.r,
      amp: n.amp ?? 0, spd: n.spd ?? 0, ph: n.ph ?? 0,
    })),
    sparks: state.G.sparks.map((s) => ({ vx: s.wx - fieldX, wy: s.wy, kind: s.kind })),
  };
}

/** Independent, fine-step flight integrator (h/2 of the gate's own step, its own
 *  loop) bouncing off the daily field walls [fl, fr]. Returns the closest the
 *  swept path comes to T. */
function minApproachIndependent(
  n: Node, T: Node, dir: number, relAng: number, t0: number, fl: number, fr: number,
): number {
  const plr = state.G.player.r;
  const loW = fl + plr;
  const hiW = fr - plr;
  const h = 1 / 120;
  let x = n.wx + Math.cos(relAng) * ORBIT;
  let y = n.wy + Math.sin(relAng) * ORBIT;
  let vx = -Math.sin(relAng) * dir * LAUNCH;
  let vy = Math.cos(relAng) * dir * LAUNCH;
  let md = Infinity;
  const moving = T.type === 'move';
  const amp = T.amp ?? 0;
  const spd = T.spd ?? 1;
  const ph = T.ph ?? 0;
  for (let s = 0; s < 240; s++) {
    const px = x;
    const py = y;
    vy -= G_FALL * h;
    x += vx * h;
    y += vy * h;
    if (x < loW) { x = loW; vx = Math.abs(vx) * WALL; }
    if (x > hiW) { x = hiW; vx = -Math.abs(vx) * WALL; }
    const Tx = moving ? T.baseX + Math.sin((t0 + s * h) * spd + ph) * amp : T.wx;
    const Ty = T.wy;
    const abx = x - px;
    const aby = y - py;
    const ab2 = abx * abx + aby * aby;
    let tt = ab2 > 0 ? ((Tx - px) * abx + (Ty - py) * aby) / ab2 : 0;
    tt = tt < 0 ? 0 : tt > 1 ? 1 : tt;
    const dx = px + abx * tt - Tx;
    const dy = py + aby * tt - Ty;
    const d = Math.hypot(dx, dy);
    if (d < md) md = d;
    if (d < T.r + plr) break;
    if (vy < 0 && y < Ty - 200) break;
  }
  return md;
}

/* ---- A. WIDTH-INDEPENDENCE ------------------------------------------------ */
function checkWidthIndependence(): void {
  const WIDTHS = [320, 360, 375, 390, 430, 540];
  const SEEDS = [1, 7, 12345, 0x9e3779b1 >>> 0];
  const CALLS = 400;
  let compared = 0;

  for (const seed of SEEDS) {
    const ref = dailyRoute(390, seed, CALLS);   // reference frame
    for (const W of WIDTHS) {
      const r = dailyRoute(W, seed, CALLS);
      // the field is the fixed virtual width on every device
      if (Math.abs(r.field - DAILY_VW) > 1e-9) {
        fail(`field width ${r.field} != DAILY_VW ${DAILY_VW} at W=${W}`);
      }
      if (r.nodes.length !== ref.nodes.length) {
        fail(`node count ${r.nodes.length} != ${ref.nodes.length} (seed ${seed}, W=${W})`);
        continue;
      }
      if (r.sparks.length !== ref.sparks.length) {
        fail(`spark count ${r.sparks.length} != ${ref.sparks.length} (seed ${seed}, W=${W})`);
      }
      for (let i = 0; i < ref.nodes.length; i++) {
        const a = ref.nodes[i];
        const b = r.nodes[i];
        compared++;
        if (Math.abs(a.vx - b.vx) > 1e-6 || Math.abs(a.wy - b.wy) > 1e-6
            || a.type !== b.type || a.r !== b.r
            || Math.abs(a.amp - b.amp) > 1e-9 || Math.abs(a.spd - b.spd) > 1e-9
            || Math.abs(a.ph - b.ph) > 1e-9) {
          fail(`node ${i} diverged at W=${W} (seed ${seed}): `
            + `vx ${a.vx.toFixed(3)}/${b.vx.toFixed(3)} wy ${a.wy.toFixed(3)}/${b.wy.toFixed(3)} `
            + `type ${a.type}/${b.type}`);
          break;
        }
      }
      const m = Math.min(ref.sparks.length, r.sparks.length);
      for (let i = 0; i < m; i++) {
        const a = ref.sparks[i];
        const b = r.sparks[i];
        if (Math.abs(a.vx - b.vx) > 1e-6 || Math.abs(a.wy - b.wy) > 1e-6 || a.kind !== b.kind) {
          fail(`spark ${i} diverged at W=${W} (seed ${seed})`);
          break;
        }
      }
    }
  }
  console.log(`daily-route: width-independence — ${compared} node comparisons across `
    + `${WIDTHS.length} widths × ${SEEDS.length} seeds, all identical in the virtual frame`);
}

/* ---- B. HONESTY ON AN OFFSET FIELD --------------------------------------- */
function checkHonesty(): void {
  const WIDTHS = [320, 540];           // narrow (negative offset) + wide (large offset)
  const SEEDS = 8;
  const NODES_PER_SEED = 360;
  let pairs = 0;
  let lit = 0;

  for (const W of WIDTHS) {
    for (let seed = 0; seed < SEEDS; seed++) {
      view.W = W;
      view.H = 740;
      resetRun(true);
      setRunSeed((Math.imul(seed + 1, 0x85ebca6b)) >>> 0);
      const G = state.G;
      const fl = fieldLeft();
      const fr = fieldRight();
      while (G.nodes.length < NODES_PER_SEED) genNode();

      for (const n of G.nodes) {
        if (n.type === 'spike') continue;
        const T = n.next;
        if (!T) continue;
        pairs++;
        const pl = G.player;
        pl.node = n;
        pl.latched = true;
        pl.wy = n.wy;
        pl.wx = n.wx;
        G.target = T;
        G.height = Math.max(0, Math.round((n.wy + 90) / 12));

        const phaseTimes = T.type === 'move' ? [0, 0.21, 0.47, 0.83, 1.19, 1.7, 2.3] : [0];
        const SKEW = T.type === 'move' ? 2 / 60 : 0;
        let anyReachable = false;
        for (const t0 of phaseTimes) {
          G.t = t0;
          if (T.type === 'move') T.wx = T.baseX + Math.sin(t0 * (T.spd ?? 1) + (T.ph ?? 0)) * (T.amp ?? 0);
          for (const dir of [1, -1] as const) {
            pl.dir = dir;
            computeSweetZone();
            const sw = G.sweet;
            if (!sw || !sw.reachable) continue;
            anyReachable = true;
            const span = sw.hi - sw.lo;
            const SAMPLES = 14;
            for (let i = 0; i <= SAMPLES; i++) {
              const ang = sw.lo + (span * i) / SAMPLES;
              lit++;
              const md = minApproachIndependent(n, T, dir, ang, t0 + SKEW, fl, fr);
              if (md > T.r + pl.r + CATCH_PAD + 1) {
                fail(`dishonest lit angle: W=${W} seed ${seed} node@${Math.round(n.wy)} dir ${dir} `
                  + `t0 ${t0.toFixed(2)} ang ${ang.toFixed(3)} minApproach ${md.toFixed(1)} `
                  + `> catch ${(T.r + pl.r + CATCH_PAD).toFixed(1)} (T.type=${T.type})`);
              }
            }
            const mdc = minApproachIndependent(n, T, dir, sw.center, t0 + SKEW, fl, fr);
            if (mdc > T.r + pl.r + CATCH_PAD + 1) {
              fail(`dishonest PERFECT centre: W=${W} seed ${seed} node@${Math.round(n.wy)} `
                + `dir ${dir} minApproach ${mdc.toFixed(1)} (T.type=${T.type})`);
            }
          }
        }
        if (!anyReachable) {
          fail(`unreachable gate: W=${W} seed ${seed} node@${Math.round(n.wy)} (T.type=${T.type})`);
        }
      }
    }
  }
  console.log(`daily-route: honesty on offset fields — ${pairs} node pairs, ${lit} lit angles `
    + `checked across widths [${WIDTHS.join(', ')}]`);
}

function run(): void {
  checkWidthIndependence();
  checkHonesty();
  if (failures === 0) {
    console.log('  ✓ daily route is width-independent and its gates stay honest on every canvas');
  } else {
    console.error(`  ${failures} DAILY-ROUTE VIOLATIONS`);
    process.exit(1);
  }
}

run();
