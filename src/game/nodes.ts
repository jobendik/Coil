import type { Node, NodeType } from '../types';
import { view } from '../core/canvas';
import { state } from './state';
import { TAU, clamp, lerp, rand } from '../core/utils';

export function genNode(): void {
  const G = state.G;
  const { W } = view;
  const idx = G.nodes.length;
  const hm = G.lastNodeY / 12;                       // approx. meters at this point
  const opening = idx < 4;                           // first hops are nearly vertical
  const easy = idx < 8 || hm < 60;
  const diff = clamp(hm / 600, 0, 1);

  const gapMin = opening ? 80 : easy ? 85 : 108;
  const gapMax = opening ? 100 : easy ? 112 : lerp(140, 195, diff);
  const gap = rand(gapMin, gapMax);
  const ny = G.lastNodeY + gap;
  const prev = G.nodes[G.nodes.length - 1];

  // horizontal offset bounded to a reachable cone (~0.9*gap) and softened by difficulty
  const maxOff = Math.min(gap * 0.9, opening ? 26 : easy ? 55 : lerp(75, 140, diff));
  const nx = clamp((prev ? prev.wx : W / 2) + rand(-maxOff, maxOff), 50, W - 50);

  // node tiers unlock gradually with height
  let type: NodeType = 'normal';
  let r = 18;
  if (!easy) {
    const roll = Math.random();
    if (hm > 120 && roll < 0.10 + diff * 0.10) { type = 'small'; r = 12; }
    else if (hm > 200 && roll < 0.24 + diff * 0.12) { type = 'move'; r = 16; }
  }
  // rare bonus (gold)
  if (!easy && hm > 150 && Math.random() < 0.04) { type = 'bonus'; r = 19; }

  const node: Node = {
    wx: nx, wy: ny, r, type, baseX: nx,
    amp: type === 'move' ? rand(35, 80) : 0,
    ph: rand(0, TAU),
    spd: rand(0.7, 1.3),
    pts: type === 'small' ? 3 : 1,
    pulse: rand(0, TAU),
  };
  G.nodes.push(node);
  G.lastNodeY = ny;

  // spikes appear only at altitude, always offset from the line of nodes, never during onboarding
  if (!easy && hm > 320 && Math.random() < 0.06 + diff * 0.14) {
    const sx = clamp(nx + (nx < W / 2 ? rand(95, 150) : -rand(95, 150)), 28, W - 28);
    G.nodes.push({
      wx: sx, wy: ny + rand(-26, 26), r: 15, type: 'spike', baseX: sx,
      amp: 0, pulse: rand(0, TAU),
    });
  }

  // collectibles: sparks often, shields rare and high-altitude
  if (Math.random() < 0.5) {
    G.sparks.push({ wx: clamp(nx + rand(-60, 60), 20, W - 20), wy: ny - gap * 0.5, got: false, kind: 'spark' });
  } else if (hm > 250 && Math.random() < 0.05) {
    G.sparks.push({ wx: clamp(nx + rand(-50, 50), 20, W - 20), wy: ny - gap * 0.5, got: false, kind: 'shield' });
  }
}
