import type { Node, NodeType } from '../types';
import { view } from '../core/canvas';
import { state } from './state';
import { TAU, clamp, lerp } from '../core/utils';
import { gateWidth } from './physics';

/* Run RNG — defaults to Math.random; the Daily Challenge swaps in a seeded
   generator so every player's route (gaps, offsets, node types, spikes,
   collectibles) is identical that day. Only generation reads this; visuals
   stay live-random. */
function mulberry32(a: number): () => number {
  return function (): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rng: () => number = Math.random;
const rnd = (): number => rng();
const rrand = (a: number, b: number): number => a + rng() * (b - a);

/** Set (or clear) the seeded route generator. Call before resetRun populates nodes. */
export function setRunSeed(seed: number | null): void {
  rng = seed === null ? Math.random : mulberry32(seed);
}

export function genNode(): void {
  const G = state.G;
  const { W } = view;
  const idx = G.nodes.length;
  const prev = G.nodes[G.nodes.length - 1];
  const hm = G.lastNodeY / 12;
  const easy = idx < 6 || hm < 55;
  const diff = clamp(hm / 650, 0, 1);
  const gap = easy ? rrand(92, 118) : rrand(108, lerp(135, 172, diff));
  let ny = G.lastNodeY + gap;
  const maxOff = Math.min(gap * 0.7, easy ? 44 : lerp(64, 100, diff));
  let nx = clamp((prev ? prev.wx : W / 2) + rrand(-maxOff, maxOff), 52, W - 52);
  let type: NodeType = 'normal';
  let r = 18;

  // NOTE: 'move' nodes are intentionally NOT generated. A moving target drifts during the
  // ~0.4s flight, so the gate (which aims at the target's position at release) cannot stay
  // truthful without lead-prediction. Until that exists, we keep every gate honest by using
  // only static targets. The move-node update/recompute code below is left dormant so moving
  // nodes can be re-enabled later if a predictive gate is added.
  if (!easy) {
    const roll = rnd();
    if (hm > 140 && roll < 0.12 + diff * 0.10) {
      type = 'small';
      r = 13;
    }
  }
  if (!easy && hm > 150 && rnd() < 0.05) {
    type = 'bonus';
    r = 19;
  }

  // FAIRNESS: the player orbits prev and flings to this node. Guarantee the gate from prev
  // to here is comfortably hittable for EITHER arrival direction; if not, pull this node
  // toward straight-up over prev (which always widens the window). Easy jumps are always
  // fair, so we skip the (more expensive) check for them. Uses base positions.
  if (prev && !easy) {
    const pbx = prev.type === 'move' ? prev.baseX : prev.wx;
    const MIN_FAIR = 0.30;
    const pivot: Node = { wx: pbx, wy: prev.wy, r: prev.r, type: 'normal', baseX: pbx, next: null };
    let cw = nx;
    let cy = ny;
    let bestW = -1;
    let bw = nx;
    let by = ny;
    let tries = 0;
    while (tries < 6) {
      const cand: Node = { wx: cw, wy: cy, r, type: 'normal', baseX: cw, next: null };
      const w = Math.min(gateWidth(pivot, cand, 1), gateWidth(pivot, cand, -1));
      if (w > bestW) {
        bestW = w;
        bw = cw;
        by = cy;
      }
      if (w >= MIN_FAIR) break;
      cw = lerp(cw, pbx, 0.5);
      cy = lerp(cy, prev.wy + Math.min(ny - prev.wy, 130), 0.35);
      tries++;
    }
    if (bestW < MIN_FAIR) {
      bw = pbx;
      by = prev.wy + 110;
    } // last resort: straight up, modest gap — always fair
    nx = clamp(bw, 52, W - 52);
    ny = by;
  }

  const node: Node = {
    wx: nx, wy: ny, r, type, baseX: nx, next: null,
    // amp: dormant — 'move' nodes are not generated (see note above); kept zero
    // so the moving-node update code in update.ts remains a no-op if re-enabled.
    amp: 0,
    ph: rrand(0, TAU),
    spd: rrand(0.7, 1.2),
    pulse: rrand(0, TAU),
  };
  if (prev) prev.next = node;
  G.nodes.push(node);
  G.lastNodeY = ny;

  // Spikes — instant-death hazards (shield still saves). Placed laterally off the
  // node line so the gate's flight path stays clear. NOT linked into prev.next, so
  // the gate (which targets n.next) never aims at a spike. Gated to hm > 320.
  if (!easy && hm > 320 && rnd() < 0.06 + diff * 0.14) {
    const sx = clamp(nx + (nx < W / 2 ? rrand(95, 150) : -rrand(95, 150)), 28, W - 28);
    G.nodes.push({
      wx: sx, wy: ny + rrand(-26, 26), r: 15, type: 'spike', baseX: sx, next: null,
      amp: 0, ph: rrand(0, TAU), spd: 1, pulse: rrand(0, TAU),
    });
  }

  // collectibles
  if (rnd() < 0.5) {
    G.sparks.push({
      wx: clamp(nx + rrand(-55, 55), 20, W - 20),
      wy: ny - gap * 0.5,
      got: false,
      kind: 'spark',
    });
  } else if (hm > 240 && rnd() < 0.05) {
    G.sparks.push({
      wx: clamp(nx + rrand(-50, 50), 20, W - 20),
      wy: ny - gap * 0.5,
      got: false,
      kind: 'shield',
    });
  }
}
