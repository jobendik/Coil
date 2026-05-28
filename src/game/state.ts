import type { GameState, Node, Scene } from '../types';
import { view } from '../core/canvas';
import { settings } from '../settings';

/* Singleton container for runtime-mutable state. Splitting into per-domain
   slots keeps modules from reaching into a 30-field "G" anonymously. */
export const state = {
  scene: 'home' as Scene,
  G: null as unknown as GameState,
};

export function resetRun(): void {
  const { W, H } = view;
  const start: Node = { wx: W / 2, wy: -90, r: 18, type: 'normal', baseX: W / 2, next: null };
  const G: GameState = {
    t: 0,
    cameraY: -0.42 * H,
    nodes: [start],
    sparks: [],
    maxY: 0,
    height: 0,
    combo: 1,
    maxCombo: 1,
    perfects: 0,
    coins: 0,
    flings: 0,
    lastNodeY: start.wy,
    dead: false,
    deadT: 0,
    voidY: -1.5 * H,
    shield: false,
    invuln: 0,
    beatBest: false,
    zone: 0,
    nextMilestone: 0,
    toast: null,
    sweet: null,
    target: null,
    tut: settings.seenTut ? -1 : 0,
    tutT: 0,
    player: {
      wx: W / 2,
      wy: -30,
      vx: 0,
      vy: 0,
      latched: true,
      node: start,
      ang: Math.PI / 2,
      dir: 1,
      r: 8,
      trail: [],
      face: 0,
      zap: 0,
      lastReleased: null,
      lastReleasedT: 0,
    },
  };
  state.G = G;
}

/** Convert a world-space Y to screen-space Y (camera applied, screen origin top-left). */
export function sY(wy: number): number {
  return view.H - (wy - state.G.cameraY);
}
