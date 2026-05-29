import type { GameState, Node, Scene } from '../types';
import { view } from '../core/canvas';
import { settings } from '../settings';
import { Profile } from './profile';
import { setRunSeed } from './nodes';
import { dailySeed } from './dailyrun';
import { fxClear } from '../core/fx';
import { FRENZY_TIME } from '../config';

/* Singleton container for runtime-mutable state. Splitting into per-domain
   slots keeps modules from reaching into a 30-field "G" anonymously. */
export const state = {
  scene: 'home' as Scene,
  G: null as unknown as GameState,
};

export function resetRun(daily = false, zen = false): void {
  const { W, H } = view;
  // Daily Challenge: seed the route generator so every player gets the same
  // layout today. Normal runs use live randomness.
  setRunSeed(daily ? dailySeed() : null);
  fxClear();
  const start: Node = { wx: W / 2, wy: -90, r: 18, type: 'normal', baseX: W / 2, next: null };
  // markRunStart returns true on the FIRST run of a new calendar day, and rolls
  // the login streak forward as a side effect.
  const firstOfDay = Profile.markRunStart();
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
    revivedThisRun: false,
    dailyRunCounted: false,
    banked: { h: 0, perf: 0, mc: 0 },
    firstFlingPending: true,
    savesUsedThisRun: 0,
    nearPerfectUsed: false,
    comboTierReached: -1,
    comboFlash: 0,
    comboFlashColor: '#fff',
    firstRunOfDay: firstOfDay,
    coinMult: firstOfDay ? 2 : 1,
    daily,
    zen,
    focusT: 0,
    magnetT: 0,
    overdrive: 0,
    frenzyT: 0,
    frenzyMax: FRENZY_TIME,
    frenzyBanked: 0,
    jackpotHit: false,
    potWon: 0,
    freezeT: 0,
    bestNearShown: false,
    constelActive: -1,
    constelProg: 0,
    constellations: 0,
    lastReleasePerfect: false,
    _constelPending: 0,
    _constelGroup: 0,
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

/**
 * Surface a one-time "FIRST RUN BONUS · 2× COINS" toast at run start. Called
 * from main.startPlay after resetRun so the toast appears as soon as the play
 * scene draws (and isn't clobbered by any other toast the first tick may set).
 */
export function maybeShowStartToast(): void {
  const G = state.G;
  if (G.firstRunOfDay) {
    G.toast = { txt: `2× COINS · DAY ${Profile.streak}`, t: 2.0, c: '#ffe39b' };
  }
}
