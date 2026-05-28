import type { Node, ResultData } from '../types';
import { view } from '../core/canvas';
import { state, sY } from './state';
import { genNode } from './nodes';
import { computeSweetZone } from './physics';
import { P, Pop, shake } from '../core/particles';
import { SFX } from '../core/audio';
import { buzz } from '../core/haptics';
import { settings, setSeenTut } from '../settings';
import { skin } from './skins';
import { Profile } from './profile';
import { Daily } from './daily';
import { Scores } from './scores';
import { CG } from '../core/cg';
import { Result } from '../scenes/result';
import {
  CATCH_PAD,
  G_FALL,
  LAUNCH,
  MILE_REWARD,
  MILESTONES,
  OMEGA,
  ORBIT,
  WALL,
  ZONES,
} from '../config';
import { angDiff, clamp, distPointToSegment, lerp } from '../core/utils';

export function update(dt: number): void {
  if (state.scene !== 'play') return;
  const G = state.G;
  const pl = G.player;
  const { W, H } = view;

  if (G.invuln > 0) G.invuln -= dt;
  if (pl.zap > 0) pl.zap -= dt;
  if (G.dead) {
    G.deadT += dt;
    pl.vy -= G_FALL * dt;
    pl.wx += pl.vx * dt;
    pl.wy += pl.vy * dt;
    if (G.deadT > 0.55) endRun();
    return;
  }

  G.t += dt;
  for (const n of G.nodes) {
    if (n.type === 'move') n.wx = n.baseX + Math.sin(G.t * (n.spd ?? 1) + (n.ph ?? 0)) * (n.amp ?? 0);
  }

  if (pl.latched) {
    const n = pl.node;
    pl.ang += pl.dir * OMEGA * dt;
    pl.wx = n.wx + Math.cos(pl.ang) * ORBIT;
    pl.wy = n.wy + Math.sin(pl.ang) * ORBIT;
    pl.face = lerp(
      pl.face,
      Math.atan2(Math.cos(pl.ang) * pl.dir, -Math.sin(pl.ang) * pl.dir),
      Math.min(1, dt * 10),
    );
    // safety: target should always exist (genNode links .next ahead of the player)
    if (!G.target && n.next) {
      G.target = n.next;
      computeSweetZone();
    }
    // moving nodes: the precomputed gate would go stale, so refresh it (throttled, ~30Hz)
    if (n.type === 'move' || (G.target && G.target.type === 'move')) {
      G._sweetTick = (G._sweetTick ?? 0) + 1;
      if (G._sweetTick >= 2) {
        G._sweetTick = 0;
        computeSweetZone();
      }
    }
  } else {
    const px = pl.wx;
    const py = pl.wy;
    pl.vy -= G_FALL * dt;
    pl.wx += pl.vx * dt;
    pl.wy += pl.vy * dt;
    if (pl.wx < pl.r) { pl.wx = pl.r; pl.vx = Math.abs(pl.vx) * WALL; }
    if (pl.wx > W - pl.r) { pl.wx = W - pl.r; pl.vx = -Math.abs(pl.vx) * WALL; }
    pl.face = lerp(pl.face, Math.atan2(pl.vy, pl.vx), Math.min(1, dt * 10));
    pl.trail.push({ x: pl.wx, y: pl.wy });
    if (pl.trail.length > 12) pl.trail.shift();
    for (const n of G.nodes) {
      const sd = distPointToSegment(n.wx, n.wy, px, py, pl.wx, pl.wy);
      if (n.type === 'spike') {
        if (sd < n.r + pl.r) { hit('spike'); return; }
        continue;
      }
      if (sd < n.r + pl.r + CATCH_PAD && n !== pl.lastReleased) {
        const dx = pl.wx - n.wx;
        const dy = pl.wy - n.wy;
        const d = Math.hypot(dx, dy) || 0.001;
        latch(n, d, dx, dy);
        break;
      }
    }
    pl.lastReleasedT += dt;
    if (pl.lastReleasedT > 0.25) pl.lastReleased = null;
  }

  G.maxY = Math.max(G.maxY, pl.wy);
  G.height = Math.max(0, Math.round((G.maxY + 90) / 12));
  const camT = pl.wy - 0.42 * H;
  if (camT > G.cameraY) G.cameraY = lerp(G.cameraY, camT, Math.min(1, dt * 6));

  if (!G.beatBest && Profile.best > 0 && G.height > Profile.best) {
    G.beatBest = true;
    G.toast = { txt: 'NEW BEST!', t: 1.6, c: '#9be35a' };
    SFX.milestone();
  }
  while (G.nextMilestone < MILESTONES.length && G.height >= MILESTONES[G.nextMilestone]) {
    const m = MILESTONES[G.nextMilestone];
    G.nextMilestone++;
    const rw = MILE_REWARD[m] || 10;
    G.toast = { txt: m + ' M', t: 1.4, c: '#fff' };
    G.coins += rw;
    SFX.milestone();
    shake(2, 0.12);
    CG.happy();
  }
  let z = 0;
  for (let i = 0; i < ZONES.length; i++) if (G.height >= ZONES[i].from) z = i;
  if (z !== G.zone) {
    G.zone = z;
    G.toast = { txt: ZONES[z].name, t: 1.6, c: skin().t };
  }

  // void pressure — a SKILL-FAIR chaser (not a timer). It creeps up steadily but slower than
  // efficient climbing, and never lags more than 'lead' behind your highest point. So good
  // play stays ahead indefinitely; hesitating on the orbit or missing a node is what the void
  // punishes. The lead shrinks over time to keep raising the pressure. (Was a quadratic timer
  // that capped every player — even flawless ones — at the same height.)
  const lead = lerp(H * 1.45, H * 0.9, clamp(G.t / 110, 0, 1));
  G.voidY += (26 + clamp(G.t, 0, 110) * 0.40 + Math.max(0, G.t - 110) * 0.05) * dt;
  G.voidY = Math.max(G.voidY, G.maxY - lead);
  if (G.invuln <= 0 && pl.wy <= G.voidY + pl.r) {
    hit('void');
    return;
  }
  if (sY(pl.wy) > H + 160 && !pl.latched && G.invuln <= 0) {
    hit('fall');
    return;
  }

  // collectibles
  for (const s of G.sparks) {
    if (s.got) continue;
    if (Math.hypot(pl.wx - s.wx, pl.wy - s.wy) < 24) {
      s.got = true;
      if (s.kind === 'shield') {
        G.shield = true;
        SFX.shield();
        P.ring(s.wx, sY(s.wy), '#9ffff2', 16, 200);
        Pop.add(s.wx, sY(s.wy), 'SHIELD', '#9ffff2');
      } else {
        G.coins += 2;
        SFX.coin();
        P.burst(s.wx, sY(s.wy), 6, '#ffe39b', 160, 0.4, 3);
        Pop.add(s.wx, sY(s.wy), '+2', skin().t);
      }
    }
  }

  while (G.lastNodeY < pl.wy + H * 1.5) genNode();
  G.nodes = G.nodes.filter((n) => n.wy > G.voidY - 120);
  G.sparks = G.sparks.filter((s) => !s.got && s.wy > G.voidY - 120);

  if (G.tut >= 0) {
    G.tutT += dt;
    if (G.tut === 1 && G.tutT > 4.5) {
      G.tut = 2;
      G.tutT = 0;
    }
    if (G.tut === 2 && G.tutT > 3.5) {
      G.tut = -1;
      if (!settings.seenTut) setSeenTut(true);
    }
  }
  if (G.toast) {
    G.toast.t -= dt;
    if (G.toast.t <= 0) G.toast = null;
  }
}

export function latch(n: Node, _d: number, dx: number, dy: number): void {
  const G = state.G;
  const pl = G.player;
  pl.latched = true;
  pl.node = n;
  pl.ang = Math.atan2(dy, dx);
  const cross = pl.vx * Math.sin(pl.ang) - pl.vy * Math.cos(pl.ang);
  pl.dir = cross >= 0 ? 1 : -1;
  pl.trail.length = 0;
  SFX.catch(G.combo);
  P.burst(n.wx, sY(n.wy), 8, skin().c, 140, 0.35, 3.5);
  if (n.type === 'bonus') {
    const g = 25;
    G.coins += g;
    SFX.bonus();
    P.ring(n.wx, sY(n.wy), '#ffd24a', 20, 300);
    Pop.add(n.wx, sY(n.wy) - 16, '+' + g + ' ◎', '#ffd24a');
    n.type = 'normal';
    n.r = 18;
  }
  G.target = n.next;
  computeSweetZone();
  if (G.tut === 0) {
    G.tut = 1;
    G.tutT = 0;
  }
}

export function release(): void {
  const G = state.G;
  const pl = G.player;
  if (!pl.latched) return;
  G.flings++;
  const tx = -Math.sin(pl.ang) * pl.dir;
  const ty = Math.cos(pl.ang) * pl.dir;
  // CONSTANT launch — survival never depends on precision
  pl.vx = tx * LAUNCH;
  pl.vy = ty * LAUNCH;
  pl.latched = false;
  pl.lastReleased = pl.node;
  pl.lastReleasedT = 0;
  // PERFECT is pure reward: did we fling inside the bright gate?
  const sw = G.sweet;
  const isPerfect = !!sw && sw.reachable && angDiff(pl.ang, sw.center) <= sw.tol;
  if (isPerfect) {
    G.perfects++;
    G.combo = Math.min(12, G.combo + 1);
    G.maxCombo = Math.max(G.maxCombo, G.combo);
    const gain = Math.round(3 * G.combo);
    G.coins += gain;
    SFX.perfect(G.combo);
    buzz(8);
    P.ring(pl.wx, sY(pl.wy), '#fff', 22, 330);
    P.burst(pl.wx, sY(pl.wy), 10, skin().t, 260, 0.5, 4);
    Pop.add(pl.wx, sY(pl.wy) - 18, `PERFECT x${G.combo}`, '#fff');
    shake(2.5, 0.12);
    pl.zap = 0.25;
  } else {
    G.combo = Math.max(1, G.combo - 1);
    SFX.fling();
    P.ring(pl.wx, sY(pl.wy), skin().c, 12, 220);
  }
}

export function hit(cause: 'void' | 'fall' | 'spike'): void {
  const G = state.G;
  const pl = G.player;
  if (G.shield && cause !== 'fall') {
    G.shield = false;
    G.invuln = 0.7;
    pl.vy = 720;
    pl.latched = false;
    SFX.shield();
    shake(7, 0.3);
    P.ring(pl.wx, sY(pl.wy), '#9ffff2', 26, 360);
    G.toast = { txt: 'SHIELD USED', t: 1.0, c: '#9ffff2' };
    return;
  }
  if (G.dead) return;
  G.dead = true;
  G.deadT = 0;
  pl.latched = false;
  SFX.death();
  buzz(30);
  shake(11, 0.5);
  P.burst(pl.wx, sY(pl.wy), 30, skin().c, 360, 0.7, 7);
}

/**
 * Idempotent banking: awards deltas over the run's high-water marks so a
 * mid-run revive continues the SAME run without ever double-counting
 * score, XP, coins, or daily progress. Returns a ResultData payload for
 * the result screen.
 */
export function bankRun(): ResultData {
  const G = state.G;
  const h = G.height;
  const mc = G.maxCombo;
  const perf = G.perfects;
  const coins = G.coins;

  const dH = Math.max(0, h - G.banked.h);
  const dPerf = Math.max(0, perf - G.banked.perf);
  const dMC = Math.max(0, mc - G.banked.mc);
  const firstEnd = !G.dailyRunCounted;

  const xpGain = dH + dPerf * 6 + dMC * 3 + (firstEnd ? 10 : 0);
  const prevLvl = Profile.level();
  Profile.addXP(xpGain);
  Profile.addCoins(coins);
  const newBest = Profile.setBest(h);
  const leveledUp = Profile.level() > prevLvl;

  const reports: boolean[] = [];
  if (firstEnd) {
    reports.push(Daily.report('runs', 1));
    G.dailyRunCounted = true;
  }
  reports.push(
    Daily.report('perf', dPerf),
    Daily.report('coins', coins),
    Daily.report('height', h),
    Daily.report('combo', mc),
  );
  const dDone = reports.some(Boolean);

  G.banked.h = h;
  G.banked.perf = perf;
  G.banked.mc = mc;
  G.coins = 0;                        // segment coins are now banked

  Scores.add(h);
  if (newBest) CG.happy();
  if (leveledUp || dDone || newBest) SFX.unlock();

  return { h, mc, perf, coins, newBest, xpGain, leveledUp, dailyJustDone: dDone };
}

export function endRun(): void {
  CG.gameplayStop();
  Result.show(bankRun());
  state.scene = 'over';
}

/**
 * One continue per run: places the player on the highest safe node, with
 * shield + invuln, and pushes the void back below the screen. Called by
 * `requestRevive`, which either watches a rewarded ad or — on platforms
 * without an SDK — grants the free continue so the flow is testable.
 */
export function revive(): void {
  const G = state.G;
  const { W, H } = view;
  const pl = G.player;
  G.dead = false;
  G.deadT = 0;

  let best: Node | null = null;
  let bd = 1e9;
  for (const n of G.nodes) {
    if (n.type === 'spike') continue;
    if (n.wy <= G.voidY + 140) continue;
    const d = Math.abs(n.wy - G.maxY);
    if (d < bd) { bd = d; best = n; }
  }
  if (!best) {
    best = {
      wx: W / 2, wy: G.maxY + 30, r: 18, type: 'normal', baseX: W / 2, next: null,
      amp: 0, ph: 0, spd: 1, pulse: 0,
    };
    G.nodes.push(best);
  }

  pl.latched = true;
  pl.node = best;
  pl.ang = -Math.PI / 2;
  pl.dir = 1;
  pl.vx = 0;
  pl.vy = 0;
  pl.trail.length = 0;
  pl.lastReleased = null;
  pl.wx = best.wx;
  pl.wy = best.wy - 30;                   // sit a short hop above the node for visual clarity

  G.target = best.next;
  computeSweetZone();
  G.voidY = Math.min(G.voidY, pl.wy - H * 1.15);
  G.shield = true;
  G.invuln = 1.6;
  G.combo = 1;
  G.revivedThisRun = true;
  G.toast = { txt: 'BACK IN!', t: 1.4, c: '#9ffff2' };
  P.ring(pl.wx, sY(pl.wy), '#9ffff2', 24, 320);
  SFX.shield();

  state.scene = 'play';
  CG.gameplayStart();
}

export function requestRevive(): void {
  const G = state.G;
  if (G.revivedThisRun) return;
  if (CG.ready) {
    CG.rewarded(revive, () => {
      G.toast = { txt: 'AD UNAVAILABLE', t: 1.3, c: '#ff8a9c' };
    });
  } else {
    revive();   // standalone/dev: grant the one continue so the flow is testable off-platform
  }
}
