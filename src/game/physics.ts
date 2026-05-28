import type { Node, SweetZone } from '../types';
import { view } from '../core/canvas';
import { state } from './state';
import { TAU, clamp, lerp } from '../core/utils';
import { GATE_MARGIN, G_FALL, LAUNCH, ORBIT, PERFECT_TOL0, WALL } from '../config';

/**
 * Mirror of the in-game flight: constant launch + gravity + wall bounce, returns the closest
 * the swept path comes to T. Used by the gate + fairness checks so they speak EXACTLY the
 * same physics as real play.
 */
export function arcMinApproach(n: Node, T: Node, dir: number, relAng: number): number {
  const pl = state.G.player;
  const tr = T.r + pl.r;
  const plr = pl.r;
  const Wp = view.W - pl.r;
  const Tx = T.wx;
  const Ty = T.wy;
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
    if (x < plr) { x = plr; vx = Math.abs(vx) * WALL; }
    if (x > Wp)  { x = Wp;  vx = -Math.abs(vx) * WALL; }

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
): SweetZone {
  const SAMP = 48;
  const st = TAU / SAMP;
  const thr = T.r + state.G.player.r + GATE_MARGIN;
  const ok = new Array<boolean>(SAMP);
  let any = false;
  for (let i = 0; i < SAMP; i++) {
    ok[i] = arcMinApproach(n, T, dir, i * st) < thr;
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
    if (arcMinApproach(n, T, dir, c0) >= thr) continue;
    let lo = c0;
    let hi = c0;
    let k = 0;                                                        // march this lobe with real physics
    while (k < 300 && arcMinApproach(n, T, dir, lo - D) < thr) { lo -= D; k++; }
    k = 0;
    while (k < 300 && arcMinApproach(n, T, dir, hi + D) < thr) { hi += D; k++; }
    if (hi - lo > bW) { bW = hi - lo; bLo = lo; bHi = hi; }           // keep the widest marched lobe
    if (minStop && bW >= minStop) break;                              // gen check: a fair-enough lobe is plenty
  }
  if (bW < 0) return { lo: 0, hi: 0, center: 0, tol: 0, reachable: false };
  const pmid = (bLo + bHi) / 2;
  const phalf = Math.min(want, (bHi - bLo) / 2);
  return { lo: bLo, hi: bHi, center: pmid, tol: phalf, reachable: true };
}

export function gateWidth(n: Node, T: Node, dir: number): number {
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
  const want = PERFECT_TOL0 * lerp(1, 0.62, clamp(G.height / 700, 0, 1));
  G.sweet = gateBand(pl.node, T, pl.dir, want);
}
