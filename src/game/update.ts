import type { Node } from '../types';
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

export function hit(cause: 'void' | 'fall'): void {
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

export function endRun(): void {
  const G = state.G;
  const h = G.height;
  const mc = G.maxCombo;
  const perf = G.perfects;
  const coins = G.coins;
  const newBest = Profile.setBest(h);
  const xpGain = h + perf * 6 + mc * 3 + 10;
  const prevLvl = Profile.level();
  Profile.addXP(xpGain);
  Profile.addCoins(coins);
  const leveledUp = Profile.level() > prevLvl;
  const dDone = [
    Daily.report('runs', 1),
    Daily.report('perf', perf),
    Daily.report('coins', coins),
    Daily.report('height', h),
    Daily.report('combo', mc),
  ].some(Boolean);
  if (leveledUp || dDone) SFX.unlock();
  Result.show({ h, mc, perf, coins, newBest, xpGain, leveledUp, dailyJustDone: dDone });
  state.scene = 'over';
}
