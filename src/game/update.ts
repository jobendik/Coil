import type { Node, ResultData } from '../types';
import { view } from '../core/canvas';
import { state, sY } from './state';
import { genNode } from './nodes';
import { curCatchPad, perfectHi } from './physics';
import { P, Pop, shake } from '../core/particles';
import { SFX } from '../core/audio';
import { settings, setSeenTut } from '../settings';
import { skin } from './skins';
import { Profile } from './profile';
import { Daily } from './daily';
import { Scores } from './scores';
import { CG } from '../core/cg';
import { Result } from '../scenes/result';
import {
  CHARGE_TIME,
  G_FALL,
  LAUNCH,
  MAXR,
  MILE_REWARD,
  MILESTONES,
  MINR,
  OMEGA,
  PERFECT_LO,
  WALL_BOUNCE,
  ZONES,
} from '../config';
import { clamp, distPointToSegment, lerp } from '../core/utils';

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

  // moving nodes sway sinusoidally around their base x
  for (const n of G.nodes) {
    if (n.type === 'move') n.wx = n.baseX + Math.sin(G.t * (n.spd ?? 1) + (n.ph ?? 0)) * (n.amp ?? 0);
  }

  if (pl.latched) {
    const n = pl.node;
    pl.ang += pl.dir * OMEGA * dt;
    // charge ping-pongs 0..1..0 — perfect band recurs every sweep,
    // so timing it is a learnable rhythm skill (not once-per-latch luck).
    pl.charge += pl.chDir * dt / CHARGE_TIME;
    if (pl.charge >= 1) { pl.charge = 1; pl.chDir = -1; }
    else if (pl.charge <= 0) { pl.charge = 0; pl.chDir = 1; }
    pl.wx = n.wx + Math.cos(pl.ang) * pl.R;
    pl.wy = n.wy + Math.sin(pl.ang) * pl.R;
    pl.face = lerp(
      pl.face,
      Math.atan2(Math.cos(pl.ang) * pl.dir, -Math.sin(pl.ang) * pl.dir),
      Math.min(1, dt * 10),
    );
  } else {
    const prevWx = pl.wx;
    const prevWy = pl.wy;
    pl.vy -= G_FALL * dt;
    pl.wx += pl.vx * dt;
    pl.wy += pl.vy * dt;
    if (pl.wx < pl.r) { pl.wx = pl.r; pl.vx = Math.abs(pl.vx) * WALL_BOUNCE; }
    if (pl.wx > W - pl.r) { pl.wx = W - pl.r; pl.vx = -Math.abs(pl.vx) * WALL_BOUNCE; }
    pl.face = lerp(pl.face, Math.atan2(pl.vy, pl.vx), Math.min(1, dt * 10));
    pl.trail.push({ x: pl.wx, y: pl.wy });
    if (pl.trail.length > 12) pl.trail.shift();

    // swept (continuous) collision: test the movement segment, not just the endpoint
    const pad = curCatchPad();
    for (const n of G.nodes) {
      const sd = distPointToSegment(n.wx, n.wy, prevWx, prevWy, pl.wx, pl.wy);
      if (n.type === 'spike') {
        if (sd < n.r + pl.r) { hit('spike'); return; }
        continue;
      }
      if (sd < n.r + pl.r + pad && n !== pl.lastReleased) {
        const dx = pl.wx - n.wx;
        const dy = pl.wy - n.wy;
        const d = Math.hypot(dx, dy) || 0.0001;
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

  // void: a steady rise (punishes camping) + a maxLead clamp that closes with time
  G.voidY += (G.vbase + G.t * 4) * dt;
  const maxLead = lerp(H * 1.35, H * 0.55, clamp(G.t / 80, 0, 1));
  G.voidY = Math.max(G.voidY, pl.wy - maxLead);
  if (G.invuln <= 0 && pl.wy <= G.voidY + pl.r) { hit('void'); return; }
  if (sY(pl.wy) > H + 160 && !pl.latched && G.invuln <= 0) { hit('fall'); return; }

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

  // tutorial (non-blocking; advances on time, perfect, or N releases)
  if (G.tut >= 0) {
    G.tutT += dt;
    if (G.tut === 1 && G.tutT > 5) { G.tut = 2; G.tutT = 0; }
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

export function latch(n: Node, d: number, dx: number, dy: number): void {
  const G = state.G;
  const pl = G.player;
  pl.latched = true;
  pl.node = n;
  pl.R = clamp(d, MINR, MAXR);
  pl.ang = Math.atan2(dy, dx);
  const cross = pl.vx * Math.sin(pl.ang) - pl.vy * Math.cos(pl.ang);
  pl.dir = cross >= 0 ? 1 : -1;
  pl.charge = 0;
  pl.chDir = 1;
  pl.trail.length = 0;
  G.combo++;
  G.maxCombo = Math.max(G.maxCombo, G.combo);
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
  if (G.tut === 0) { G.tut = 1; G.tutT = 0; }
}

export function release(): void {
  const G = state.G;
  const pl = G.player;
  if (!pl.latched) return;
  const tx = -Math.sin(pl.ang) * pl.dir;
  const ty = Math.cos(pl.ang) * pl.dir;
  const ch = pl.charge;
  const pHi = perfectHi();
  // Hybrid: launch speed is CONSTANT. Perfect is reward-only (combo/score/juice); missing it never hurts survival.
  const isPerfect = ch >= PERFECT_LO && ch <= pHi;
  pl.vx = tx * LAUNCH;
  pl.vy = ty * LAUNCH;
  pl.latched = false;
  pl.lastReleased = pl.node;
  pl.lastReleasedT = 0;
  G.releases++;

  if (isPerfect) {
    G.perfects++;
    G.mult = Math.min(9, G.mult + 1);
    const gain = Math.round(5 * G.mult);
    G.coins += gain;
    SFX.perfect(G.mult);
    P.ring(pl.wx, sY(pl.wy), '#fff', 24, 340);
    P.burst(pl.wx, sY(pl.wy), 10, skin().t, 260, 0.5, 4);
    Pop.add(pl.wx, sY(pl.wy) - 18, `PERFECT x${G.mult}`, '#fff');
    shake(3, 0.14);
    pl.zap = 0.25;
  } else {
    G.mult = 1;                       // multiplier resets on a non-perfect release (score only — never survival)
    SFX.whoosh(0.5);
    P.ring(pl.wx, sY(pl.wy), skin().c, 14, 240);
  }

  if (G.tut === 0) { G.tut = 1; G.tutT = 0; }
  if (G.tut === 1 && (isPerfect || G.releases >= 4)) { G.tut = 2; G.tutT = 0; }
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
  G.combo = 0;
  SFX.death();
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
      wx: W / 2, wy: G.maxY + 30, r: 18, type: 'normal', baseX: W / 2,
      amp: 0, ph: 0, spd: 1, pts: 1, pulse: 0,
    };
    G.nodes.push(best);
  }

  pl.latched = true;
  pl.node = best;
  pl.R = 60;
  pl.ang = -Math.PI / 2;
  pl.dir = 1;
  pl.charge = 0;
  pl.chDir = 1;
  pl.vx = 0;
  pl.vy = 0;
  pl.trail.length = 0;
  pl.lastReleased = null;
  pl.wx = best.wx + Math.cos(pl.ang) * pl.R;
  pl.wy = best.wy + Math.sin(pl.ang) * pl.R;

  G.voidY = Math.min(G.voidY, pl.wy - H * 1.15);
  G.shield = true;
  G.invuln = 1.6;
  G.combo = 0;
  G.mult = 1;
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
