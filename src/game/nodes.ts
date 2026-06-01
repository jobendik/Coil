import type { Node, NodeType, SparkKind } from '../types';
import { state, fieldLeft, fieldRight } from './state';
import { TAU, clamp, lerp } from '../core/utils';
import { gateWidth } from './physics';
import { DECAY_FROM_M } from '../config';

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
  // Playfield x-bounds the route is laid out in. Normal runs use the live canvas
  // [0, view.W]; the Daily Challenge uses a fixed virtual width centred in the
  // canvas (see fieldLeft/fieldRight) so the seeded layout is width-independent.
  const fl = fieldLeft();
  const fr = fieldRight();
  const idx = G.nodes.length;
  const prev = G.nodes[G.nodes.length - 1];
  const hm = G.lastNodeY / 12;
  const easy = idx < 6 || hm < 55;
  const diff = clamp(hm / 650, 0, 1);
  const gap = easy ? rrand(92, 118) : rrand(108, lerp(135, 172, diff));
  let ny = G.lastNodeY + gap;
  const maxOff = Math.min(gap * 0.7, easy ? 44 : lerp(64, 100, diff));
  let nx = clamp((prev ? prev.wx : (fl + fr) / 2) + rrand(-maxOff, maxOff), fl + 52, fr - 52);
  let type: NodeType = 'normal';
  let r = 18;

  // 'move' nodes ARE now generated: arcMinApproach lead-predicts the target's
  // future position (see physics.ts), so the gate aims where the node WILL be
  // and stays honest. Motion is kept gentle (modest amp/speed) so the ~30 Hz
  // gate-recompute lag during flight is negligible vs the honesty buffer — the
  // gate-honesty test verifies this across phases + a recompute time-skew.
  let mvAmp = 0;
  let mvSpd = 0;
  let mvPh = 0;
  if (!easy) {
    const roll = rnd();
    if (hm > 140 && roll < 0.12 + diff * 0.10) {
      type = 'small';
      r = 13;
    } else if (hm > 180 && roll < 0.12 + 0.18 + diff * 0.06) {
      // moving node — gentle horizontal drift introduced after the player is
      // comfortable. amp/spd scale slightly with difficulty but stay bounded.
      type = 'move';
      mvAmp = lerp(20, 34, diff);
      mvSpd = lerp(0.7, 1.05, diff);
      mvPh = rrand(0, TAU);
    }
  }
  if (!easy && type === 'normal' && hm > 150 && rnd() < 0.05) {
    type = 'bonus';
    r = 19;
  }
  // DECAY gate — a new mid-game beat introduced past the GLITCH STORM. Full radius
  // (18) so the gate to it and from it is computed exactly like a normal node; the
  // collapse is a POST-CATCH timer (see update.latch/update), so the honest-gate
  // invariant is untouched (re-proven with decay gates in the gate-honesty test).
  if (!easy && type === 'normal' && hm > DECAY_FROM_M && rnd() < 0.10 + diff * 0.07) {
    type = 'decay';
  }
  // A MOVING predecessor slides the launch origin ±amp as it oscillates; keeping a
  // TIGHT (small) gate reachable across that whole range is fragile (a narrow window
  // where the gate momentarily can't be reached). Don't follow a moving node with a
  // small one — use full radius, which the fairness/reachability checks keep honest.
  if (type === 'small' && prev && prev.type === 'move') { type = 'normal'; r = 18; }

  // FAIRNESS: the player orbits prev and flings to this node. Guarantee the gate from prev
  // to here is comfortably hittable for EITHER arrival direction; if not, pull this node
  // toward straight-up over prev (which always widens the window). Easy jumps are always
  // fair, so we skip the (more expensive) check for them. Uses base positions.
  // For a moving node, keep the full horizontal swing on-screen by clamping the
  // CENTRE (baseX) with the amplitude as margin.
  if (type === 'move') nx = clamp(nx, fl + 52 + mvAmp, fr - 52 - mvAmp);

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
      // Mirror the real node's motion in the fairness candidate so gateWidth
      // samples the worst arrival phase for moving targets.
      const cand: Node = {
        wx: cw, wy: cy, r, type, baseX: cw, next: null,
        amp: mvAmp, spd: mvSpd || 1, ph: mvPh,
      };
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
    nx = clamp(bw, fl + 52 + (type === 'move' ? mvAmp : 0), fr - 52 - (type === 'move' ? mvAmp : 0));
    ny = by;
    // Reachability GUARANTEE across the predecessor's FULL motion. The fairness loop
    // scores the gate from prev's CENTRE, but a MOVING predecessor slides the launch
    // origin ±amp as it oscillates — so a node fair at the centre can be unreachable
    // at an extreme (a rare gate that "vanishes" as prev drifts; the gate is
    // recomputed every ~2 frames from prev's live position). Verify the ACTUAL
    // placement has a reachable gate (either direction) at several points across
    // prev's oscillation; if not, snap straight up over prev, pulling the gap in
    // until a real gate exists everywhere. (No RNG consumed — daily routes stay
    // deterministic.) Closes the gate-honesty REACHABILITY gap for moving-pred nodes.
    const pAmp = prev.type === 'move' ? (prev.amp ?? 0) : 0;
    const pSamples = pAmp > 0
      ? [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1].map((f) => f * pAmp)
      : [0];
    const reachAll = (wx: number, wy: number): boolean => {
      const cand: Node = { wx, wy, r, type, baseX: wx, next: null, amp: mvAmp, spd: mvSpd || 1, ph: mvPh };
      for (const o of pSamples) {
        const piv: Node = { wx: pbx + o, wy: prev.wy, r: prev.r, type: 'normal', baseX: pbx + o, next: null };
        if (gateWidth(piv, cand, 1) <= 0 && gateWidth(piv, cand, -1) <= 0) return false;
      }
      return true;
    };
    if (!reachAll(nx, ny)) {
      const fbx = clamp(pbx, fl + 52 + (type === 'move' ? mvAmp : 0), fr - 52 - (type === 'move' ? mvAmp : 0));
      for (let g = 110; g >= 70; g -= 12) {
        nx = fbx;
        ny = prev.wy + g;
        if (reachAll(nx, ny)) break;
      }
    }
  }

  const node: Node = {
    wx: nx, wy: ny, r, type, baseX: nx, next: null,
    amp: mvAmp,
    ph: mvPh,
    spd: mvSpd || rrand(0.7, 1.2),
    pulse: rrand(0, TAU),
  };
  if (prev) prev.next = node;
  G.nodes.push(node);
  G.lastNodeY = ny;

  // CONSTELLATION CHAINS — mark 3 consecutive path nodes as a set. Perfect all
  // three in a row mid-run to complete it (handled in update.ts). Purely a
  // marker + meta hook; the gate physics/honesty are untouched.
  if ((G._constelPending ?? 0) > 0) {
    node.constel = G._constelGroup;
    node.cidx = 3 - (G._constelPending as number);
    G._constelPending = (G._constelPending as number) - 1;
  } else if (!easy && hm > 90 && type === 'normal' && rnd() < 0.045) {
    G._constelGroup = (G._constelGroup ?? 0) + 1;
    node.constel = G._constelGroup;
    node.cidx = 0;
    G._constelPending = 2;   // the next two path nodes complete the trio
  }

  // Spikes — instant-death hazards (shield still saves). Placed laterally off the
  // node line so the gate's flight path stays clear. NOT linked into prev.next, so
  // the gate (which targets n.next) never aims at a spike. Gated to hm > 320.
  if (!easy && hm > 320 && rnd() < 0.06 + diff * 0.14) {
    const sx = clamp(nx + (nx < (fl + fr) / 2 ? rrand(95, 150) : -rrand(95, 150)), fl + 28, fr - 28);
    G.nodes.push({
      wx: sx, wy: ny + rrand(-26, 26), r: 15, type: 'spike', baseX: sx, next: null,
      amp: 0, ph: rrand(0, TAU), spd: 1, pulse: rrand(0, TAU),
    });
  }

  // collectibles — a coin most of the time, occasionally a power-up.
  const cr = rnd();
  if (cr < 0.5) {
    G.sparks.push({
      wx: clamp(nx + rrand(-55, 55), fl + 20, fr - 20),
      wy: ny - gap * 0.5,
      got: false,
      kind: 'spark',
    });
  } else if (hm > 120 && cr < 0.57) {
    // ~7% power-up node after 120 m. Focus is the most common (relief/precision),
    // then Magnet (coin forgiveness), with the rarer Shield gated higher.
    const pu = rnd();
    const kind: SparkKind = (hm > 240 && pu < 0.38) ? 'shield' : pu < 0.7 ? 'focus' : 'magnet';
    G.sparks.push({
      wx: clamp(nx + rrand(-50, 50), fl + 20, fr - 20),
      wy: ny - gap * 0.5,
      got: false,
      kind,
    });
  }
}
