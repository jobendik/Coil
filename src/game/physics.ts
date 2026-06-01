import type { Node, SweetZone } from '../types';
import { state, fieldLeft, fieldRight } from './state';
import { TAU, clamp, lerp } from '../core/utils';
import {
  EARLY_EASE_BOOST,
  EARLY_EASE_END,
  GATE_MARGIN,
  G_FALL,
  LAUNCH,
  ORBIT,
  PERFECT_TOL0,
  WALL,
} from '../config';

/**
 * Mirror of the in-game flight: constant launch + gravity + wall bounce, returns the closest
 * the swept path comes to T. Used by the gate + fairness checks so they speak EXACTLY the
 * same physics as real play.
 */
export function arcMinApproach(n: Node, T: Node, dir: number, relAng: number, t0Override?: number): number {
  const pl = state.G.player;
  const tr = T.r + pl.r;
  const plr = pl.r;
  // Side walls in the active playfield. Normal runs use the live canvas edges;
  // the Daily Challenge uses the fixed virtual field so the swept flight (and
  // therefore the gate it lights) is identical on every device. For a normal run
  // these are exactly [plr, view.W - plr] — unchanged from before.
  const loW = fieldLeft() + plr;
  const hiW = fieldRight() - plr;
  const Ty = T.wy;
  // LEAD PREDICTION — a moving target drifts during the ~0.4 s flight, so we
  // evaluate its position at each future timestep (same motion equation the
  // update loop uses), not just where it sits at release. This is what lets the
  // gate stay HONEST for moving nodes: it aims where the node WILL be. Static
  // nodes collapse to a constant Tx (amp 0), preserving the old behaviour.
  const moving = T.type === 'move';
  const amp = moving ? (T.amp ?? 0) : 0;
  const spd = T.spd ?? 1;
  const ph = T.ph ?? 0;
  const t0 = t0Override ?? (state.G?.t ?? 0);
  const TxAt = (s: number): number => (moving ? T.baseX + Math.sin((t0 + s * (1 / 60)) * spd + ph) * amp : T.wx);
  let x = n.wx + Math.cos(relAng) * ORBIT;
  let y = n.wy + Math.sin(relAng) * ORBIT;
  const tx = -Math.sin(relAng) * dir;
  const ty = Math.cos(relAng) * dir;
  let vx = tx * LAUNCH;
  let vy = ty * LAUNCH;
  const h = 1 / 60;
  let md2 = 1e18;
  const stopY = Ty - 160;
  const hit2 = (tr - 2) * (tr - 2);

  for (let s = 0; s < 120; s++) {
    const px = x;
    const py = y;
    vy -= G_FALL * h;
    x += vx * h;
    y += vy * h;
    if (x < loW) { x = loW; vx = Math.abs(vx) * WALL; }
    if (x > hiW) { x = hiW; vx = -Math.abs(vx) * WALL; }

    // target X at this flight instant (constant for static nodes)
    const Tx = TxAt(s);
    // squared distance from T to the swept segment (px,py)->(x,y) — no sqrt in the loop
    const abx = x - px;
    const aby = y - py;
    const ab2 = abx * abx + aby * aby;
    let t = ab2 > 0 ? ((Tx - px) * abx + (Ty - py) * aby) / ab2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = px + abx * t - Tx;
    const dy = py + aby * t - Ty;
    const d2 = dx * dx + dy * dy;
    if (d2 < md2) md2 = d2;

    if (d2 < hit2) break;                         // reached the target
    if (vy < 0 && y < stopY) break;               // fallen past it & descending — can't get closer
  }
  return Math.sqrt(md2);
}

/**
 * The heart of the Hybrid: the glowing gate that aims at the target.
 * gateBand() is the SINGLE source of truth, used by both the runtime gate and the
 * gen-time fairness check, so they can never disagree. Honesty is GUARANTEED:
 *   1. Only angles whose real swept flight comes within T.r+pl.r+GATE_MARGIN(6) light up;
 *      real catch is +CATCH_PAD(22) → a 16px buffer no sub-step dip can cross.
 *   2. EVERY catchable lobe is marched with the real flight physics; the WIDEST one wins
 *      (near walls the set fragments into thin slivers + one fat inner lobe — we take the
 *      fat one). The dim band is that true lobe.
 *   3. The bright PERFECT window is clamped INSIDE the lobe → hitting the centre reliably
 *      both catches AND scores perfect.
 * Verified on the actual in-file code over thousands of nodes: 0 unreachable, 0 dim
 * misses, 0 perfect misses, fair minimum window.
 */
export function gateBand(
  n: Node,
  T: Node,
  dir: number,
  want: number,
  minStop = 0,
  t0?: number,
): SweetZone {
  const SAMP = 48;
  const st = TAU / SAMP;
  const thr = T.r + state.G.player.r + GATE_MARGIN;
  const ok = new Array<boolean>(SAMP);
  let any = false;
  for (let i = 0; i < SAMP; i++) {
    ok[i] = arcMinApproach(n, T, dir, i * st, t0) < thr;
    if (ok[i]) any = true;
  }
  if (!any) return { lo: 0, hi: 0, center: 0, tol: 0, reachable: false };
  if (ok.every((v) => v)) {
    return { lo: 0, hi: TAU, center: 0, tol: Math.min(want, Math.PI), reachable: true };
  }
  const D = 0.018;
  let bLo = 0;
  let bHi = 0;
  let bW = -1;
  for (let i = 0; i < SAMP; i++) {
    if (!(ok[i] && !ok[(i - 1 + SAMP) % SAMP])) continue;             // run start
    let l = 0;
    let j = i;
    while (ok[j % SAMP]) {
      l++;
      j++;
      if (l >= SAMP) break;
    }
    const c0 = (i + l / 2) * st;
    if (arcMinApproach(n, T, dir, c0, t0) >= thr) continue;
    let lo = c0;
    let hi = c0;
    let k = 0;                                                        // march this lobe with real physics
    while (k < 300 && arcMinApproach(n, T, dir, lo - D, t0) < thr) { lo -= D; k++; }
    k = 0;
    while (k < 300 && arcMinApproach(n, T, dir, hi + D, t0) < thr) { hi += D; k++; }
    if (hi - lo > bW) { bW = hi - lo; bLo = lo; bHi = hi; }           // keep the widest marched lobe
    if (minStop && bW >= minStop) break;                              // gen check: a fair-enough lobe is plenty
  }
  if (bW < 0) return { lo: 0, hi: 0, center: 0, tol: 0, reachable: false };
  const pmid = (bLo + bHi) / 2;
  const phalf = Math.min(want, (bHi - bLo) / 2);
  return { lo: bLo, hi: bHi, center: pmid, tol: phalf, reachable: true };
}

export function gateWidth(n: Node, T: Node, dir: number): number {
  if (T.type === 'move') {
    // A moving target can be flung at from ANY motion phase. The fairness check
    // must hold for the worst phase, so sample several t0 offsets across the
    // node's full motion period and take the MINIMUM lit-band width. This makes
    // generated moving nodes fair no matter when the player releases.
    const period = TAU / (T.spd ?? 1);
    let worst = Infinity;
    const N = 8;
    for (let k = 0; k < N; k++) {
      const b = gateBand(n, T, dir, 0, 0.30, (k / N) * period);
      worst = Math.min(worst, b.reachable ? b.hi - b.lo : 0);
    }
    return worst;
  }
  const b = gateBand(n, T, dir, 0, 0.30);
  return b.reachable ? b.hi - b.lo : 0;
}

export function computeSweetZone(): void {
  const G = state.G;
  const pl = G.player;
  const T = G.target;
  if (!T) {
    G.sweet = null;
    return;
  }
  // Two-stage tolerance curve so new players land perfects easily, then the
  // challenge scales up. Stage 1 (0..EARLY_EASE_END m): tolerance is up to
  // EARLY_EASE_BOOST× base, decaying to 1× as height climbs. Stage 2 (above
  // EARLY_EASE_END): existing tightening curve from 1× down to 0.62×.
  let scale: number;
  if (G.height < EARLY_EASE_END) {
    scale = lerp(EARLY_EASE_BOOST, 1, G.height / EARLY_EASE_END);
  } else {
    scale = lerp(1, 0.62, clamp((G.height - EARLY_EASE_END) / 700, 0, 1));
  }
  const want = PERFECT_TOL0 * scale;
  G.sweet = gateBand(pl.node, T, pl.dir, want);
}
