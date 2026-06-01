import type { AchSummary, DailyMedal, Node, ResultData } from '../types';
import { view } from '../core/canvas';
import { state, sY } from './state';
import { genNode } from './nodes';
import { computeSweetZone } from './physics';
import { P, Pop, shake } from '../core/particles';
import { SFX, bigWinAudio, cheerSwell, cymbal } from '../core/audio';
import { Callout, Coins, Confetti, Flash, FlyCoins, Rays, Shock, Sparkles, bankXY } from '../core/fx';
import { buzz } from '../core/haptics';
import { settings, setSeenTut } from '../settings';
import { skin } from './skins';
import { Profile } from './profile';
import { Daily } from './daily';
import { Scores } from './scores';
import { Vault } from './vault';
import { Achievements } from './achievements';
import { claimEarnedUnlocks } from './unlocks';
import { Chest } from './rewards';
import { DailyRun } from './dailyrun';
import { CG } from '../core/cg';
import { Telemetry } from '../core/telemetry';
import { Result } from '../scenes/result';
import {
  BOUNCE_VY,
  CATCH_PAD,
  COMBO_TIERS,
  DEATH_ANIM,
  DECAY_TIME,
  FRENZY_COIN_MULT,
  FRENZY_TIME,
  FRENZY_VOID_EASE,
  G_FALL,
  LAND_SQUASH,
  LAUNCH,
  MILE_REWARD,
  MILESTONES,
  NEAR_MISS_RADIUS,
  NEAR_PERFECT_BAND,
  NEAR_PERFECT_MIN_COMBO,
  OMEGA,
  ORBIT,
  OVERDRIVE_BASE,
  OVERDRIVE_PER_COMBO,
  VAULT_WIN_COMBO,
  WALL,
  ZONES,
} from '../config';
import { angDiff, clamp, distPointToSegment, lerp } from '../core/utils';

export function update(dt: number): void {
  if (state.scene !== 'play') return;
  const G = state.G;
  const pl = G.player;
  const { W, H } = view;

  // anticipation freeze — hold the world for a beat after a huge event for impact
  if (G.freezeT > 0) {
    G.freezeT -= dt;
    if (G.freezeT > 0) return;
  }
  Vault.tick(dt);
  // FRENZY countdown — banks a top-up bonus with fanfare when it ends
  if (G.frenzyT > 0) {
    G.frenzyT -= dt;
    if (G.frenzyT <= 0) {
      G.frenzyT = 0;
      const bonus = Math.max(20, Math.round(G.frenzyBanked * 0.5));
      G.coins += bonus;
      Callout.add('FRENZY BONUS  +' + bonus + ' ◎', '#ffd24a', false);
      cymbal(0.4);
      SFX.chaching();
      Confetti.burst(W / 2, H * 0.4, 24);
    }
  }
  // honest near-miss-to-best toast (once per run, only when genuinely close)
  if (!G.bestNearShown && Profile.best > 0 && !G.beatBest
      && Profile.best - G.height > 0 && Profile.best - G.height < 40) {
    G.bestNearShown = true;
    Callout.add('SO CLOSE TO YOUR BEST', '#ffb020', false);
    buzz(15);
  }

  if (G.invuln > 0) G.invuln -= dt;
  if (pl.zap > 0) pl.zap -= dt;
  if (pl.land > 0) pl.land = Math.max(0, pl.land - dt);
  if (G.magnetT > 0) G.magnetT -= dt;
  if (G.comboFlash > 0) G.comboFlash = Math.max(0, G.comboFlash - dt * 2.4);
  if (G.dead) {
    G.deadT += dt;
    pl.vy -= G_FALL * dt;
    pl.wx += pl.vx * dt;
    pl.wy += pl.vy * dt;
    // keep the falling body in frame during the short death tumble
    const camDownD = pl.wy - 0.20 * H;
    if (camDownD < G.cameraY) G.cameraY = lerp(G.cameraY, camDownD, Math.min(1, dt * 6));
    if (G.deadT > DEATH_ANIM) endRun();
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
    // DECAY gate: the gate you're orbiting is collapsing — fling off before the
    // fuse runs out or it shatters (a fall: shield + the once-per-run rescue still
    // save you). A single sharper cue fires near the end; the depleting ring +
    // fracturing in drawNode carry the moment-to-moment urgency.
    if (G.decayT > 0) {
      const before = G.decayT;
      G.decayT -= dt;
      if (before > 0.45 && G.decayT <= 0.45) SFX.fling();
      if (G.decayT <= 0) {
        G.decayT = 0;
        hit('collapse');
        return;
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
    // Doom lookahead (throttled): once a fling provably can't catch anything, flag
    // it so the main loop fast-forwards the inevitable fall instead of making the
    // player watch it for 3–4 s. Re-checked periodically so moving nodes are fair.
    if (!G.dead && !G.zen) {
      G._doomTick = (G._doomTick ?? 0) + 1;
      if (!G.doomed && G._doomTick >= 4) {
        G._doomTick = 0;
        if (predictDoom()) G.doomed = true;
      }
    }
  }

  G.maxY = Math.max(G.maxY, pl.wy);
  G.height = Math.max(0, Math.round((G.maxY + 90) / 12));
  // Camera follow. Climbing: keep the player ~58% down the screen and chase up
  // briskly. Falling: the camera used to FREEZE, so a long plunge dropped the
  // player off the bottom and you couldn't see the abyss approaching. Now it
  // also eases DOWN — but only past a dead-zone (the player must fall ~22% of a
  // screen below the last peak before it engages), so small dips don't jitter
  // the view. The player can sink to ~80% down so the rising void stays in
  // frame beneath them.
  const camUp = pl.wy - 0.42 * H;
  if (camUp > G.cameraY) {
    G.cameraY = lerp(G.cameraY, camUp, Math.min(1, dt * 6));
  } else {
    const camDown = pl.wy - 0.20 * H;          // deeper framing while falling
    if (camDown < G.cameraY) G.cameraY = lerp(G.cameraY, camDown, Math.min(1, dt * 5));
  }

  if (!G.beatBest && Profile.best > 0 && G.height > Profile.best) {
    G.beatBest = true;
    Callout.add('NEW BEST!', '#9be35a', true);
    SFX.riser(0.45);
    bigWinAudio(1.0);
    cymbal(0.5);
    cheerSwell(0.6, 0.18);
    Confetti.rain(60);
    Flash.hit('#9be35a', 0.4);
    shake(7, 0.35);
    buzz([30, 30, 80]);
    const bx = pl.wx;
    const by = sY(pl.wy);
    Shock.ring(bx, by, '#9be35a', { r0: 16, r1: Math.max(W, H) * 0.9, lw: 6, life: 0.65 });
    Sparkles.scatter(20, '#9be35a');
    CG.happy();
    G.freezeT = 0.22;
  }
  while (G.nextMilestone < MILESTONES.length && G.height >= MILESTONES[G.nextMilestone]) {
    const m = MILESTONES[G.nextMilestone];
    G.nextMilestone++;
    const rw = (MILE_REWARD[m] || 10) * G.coinMult;
    G.coins += rw;
    const big = m >= 500;
    Callout.add(m + ' M  +' + rw + ' ◎', '#fff', big);
    const b = bankXY();
    if (big) {
      Confetti.rain(50);
      Coins.spawn(W / 2, H * 0.4, 20, { fountain: true, up: 100 });
      Flash.hit('#ffd24a', 0.3);
      shake(5, 0.22);
      buzz([20, 20, 60]);
      Shock.ring(W / 2, H * 0.4, '#ffd24a', { r0: 20, r1: W * 0.95, lw: 6, life: 0.6 });
      Sparkles.scatter(16, '#ffd24a');
      FlyCoins.send(W / 2, H * 0.4, Math.min(12, rw), b.x, b.y);
      bigWinAudio(0.8);
      cymbal(0.45);
      G.freezeT = 0.18;
    } else {
      Confetti.burst(W / 2, H * 0.4, 14);
      Coins.spawn(W / 2, H * 0.4, 7, { fountain: true, up: 70 });
      Shock.ring(W / 2, H * 0.4, '#fff', { r0: 16, r1: W * 0.6, lw: 4, life: 0.5 });
      FlyCoins.send(W / 2, H * 0.4, Math.min(8, rw), b.x, b.y);
      shake(3, 0.14);
      buzz(25);
      SFX.milestone();
    }
    CG.happy();
  }
  let z = 0;
  for (let i = 0; i < ZONES.length; i++) if (G.height >= ZONES[i].from) z = i;
  if (z !== G.zone) {
    const advancing = z > G.zone;
    G.zone = z;
    if (advancing) {
      // Entering a new zone is a milestone — give it a real "chapter" beat so the
      // endless climb feels like progress through distinct places.
      const { W, H } = view;
      const c = skin().t;
      Callout.add('ENTERING ' + ZONES[z].name, c, true);
      SFX.riser(0.4);
      cymbal(0.35);
      Flash.hit(c, 0.16);
      Shock.ring(W / 2, H * 0.4, c, { r0: 20, r1: Math.max(W, H) * 0.95, lw: 6, life: 0.6 });
      Sparkles.scatter(18, c);
      shake(4, 0.2);
      buzz([20, 30]);
      CG.happy();
    } else {
      G.toast = { txt: ZONES[z].name, t: 1.6, c: skin().t };
    }
  }

  if (!G.zen) {
    // void pressure — a SKILL-FAIR chaser (not a timer). It creeps up steadily but slower than
    // efficient climbing, and never lags more than 'lead' behind your highest point. So good
    // play stays ahead indefinitely; hesitating on the orbit or missing a node is what the void
    // punishes. The lead shrinks over time to keep raising the pressure. (Was a quadratic timer
    // that capped every player — even flawless ones — at the same height.)
    // The lead tightens with time, and the late game genuinely squeezes: after
    // 110 s the rise accelerates ~3× harder so a stalled climb gets caught fast.
    const lead = lerp(H * 1.45, H * 0.86, clamp(G.t / 110, 0, 1));
    let rise = 26 + clamp(G.t, 0, 110) * 0.42 + Math.max(0, G.t - 110) * 0.16;
    // FRENZY flow-protection: the void eases off during the streak so a hot run
    // isn't cut short. (Config const was previously defined but never applied.)
    if (G.frenzyT > 0) rise *= FRENZY_VOID_EASE;
    G.voidY += rise * dt;
    G.voidY = Math.max(G.voidY, G.maxY - lead);
    if (G.invuln <= 0 && pl.wy <= G.voidY + pl.r) {
      hit('void');
      return;
    }
    if (sY(pl.wy) > H + 160 && !pl.latched && G.invuln <= 0) {
      hit('fall');
      return;
    }
  } else if (!pl.latched && sY(pl.wy) > H + 40) {
    // ZEN: there is no death. Drop off the bottom and you glide back ONTO the
    // nearest gate above — a deterministic re-entry, not a ballistic bounce. A
    // perfectly vertical fall used to bounce up/down forever (vx stayed 0); this
    // can't loop because the player ends up latched and orbiting again.
    let best: Node | null = null;
    let bd = Infinity;
    for (const n of G.nodes) {
      if (n.type === 'spike') continue;
      if (n.wy <= pl.wy) continue;          // must be above the player
      const d = n.wy - pl.wy;
      if (d < bd) { bd = d; best = n; }
    }
    G.doomed = false;
    G.invuln = 0.5;
    if (best) {
      pl.latched = true;
      pl.node = best;
      pl.dir = 1;
      pl.ang = -Math.PI / 2;
      pl.vx = 0;
      pl.vy = 0;
      pl.trail.length = 0;
      pl.lastReleased = null;
      pl.wx = best.wx + Math.cos(pl.ang) * ORBIT;
      pl.wy = best.wy + Math.sin(pl.ang) * ORBIT;
      G.target = best.next;
      computeSweetZone();
      SFX.shield();
      P.ring(pl.wx, sY(pl.wy), skin().t, 18, 260);
      Shock.ring(pl.wx, sY(pl.wy), skin().t, { r0: 10, r1: 70, lw: 3, life: 0.4 });
      G.toast = { txt: 'FLOW', t: 0.7, c: skin().t };
    } else {
      // Fallback (no gate above yet): a bounce with a guaranteed centre-ward
      // nudge so it can never be perfectly vertical.
      pl.vy = BOUNCE_VY;
      pl.vx = pl.vx * 0.4 + (W / 2 - pl.wx) * 0.9;
      G.toast = { txt: 'FLOW', t: 0.7, c: skin().t };
    }
  }

  // collectibles (MAGNET pulls coins toward the player; FOCUS/MAGNET are timed power-ups)
  const magnet = G.magnetT > 0;
  for (const s of G.sparks) {
    if (s.got) continue;
    if (magnet && s.kind === 'spark') {
      const dx = pl.wx - s.wx;
      const dy = pl.wy - s.wy;
      const d = Math.hypot(dx, dy) || 1;
      if (d < 220) {
        const pull = Math.min(1, (0.4 + (1 - d / 220) * 1.1) * dt * 9);
        s.wx += dx * pull;
        s.wy += dy * pull;
      }
    }
    const cr = (magnet && s.kind === 'spark') ? 44 : 24;
    if (Math.hypot(pl.wx - s.wx, pl.wy - s.wy) < cr) {
      s.got = true;
      if (s.kind === 'shield') {
        G.shield = true;
        SFX.shield();
        P.ring(s.wx, sY(s.wy), '#9ffff2', 16, 200);
        Rays.burst(s.wx, sY(s.wy), '#9ffff2', 10);
        Pop.add(s.wx, sY(s.wy), 'SHIELD', '#9ffff2');
      } else if (s.kind === 'focus') {
        G.focusT = 3.2;
        SFX.bonus();
        buzz(12);
        P.ring(s.wx, sY(s.wy), '#a76bff', 22, 280);
        Rays.burst(s.wx, sY(s.wy), '#cdb4ff', 10);
        Pop.add(s.wx, sY(s.wy), 'FOCUS', '#cdb4ff');
      } else if (s.kind === 'magnet') {
        G.magnetT = 6.5;
        SFX.bonus();
        buzz(12);
        P.ring(s.wx, sY(s.wy), '#55d6ff', 22, 280);
        Rays.burst(s.wx, sY(s.wy), '#a9ecff', 10);
        Pop.add(s.wx, sY(s.wy), 'MAGNET', '#a9ecff');
      } else {
        const got = 2 * G.coinMult * (G.frenzyT > 0 ? FRENZY_COIN_MULT : 1);
        G.coins += got;
        if (G.frenzyT > 0) G.frenzyBanked += got;
        SFX.chaching();
        P.burst(s.wx, sY(s.wy), 5, '#ffe39b', 160, 0.4, 3);
        Coins.spawn(s.wx, sY(s.wy), 5, { up: 60 });
        Shock.ring(s.wx, sY(s.wy), '#ffe39b', { r0: 6, r1: 42, lw: 2.5, life: 0.4 });
        Pop.add(s.wx, sY(s.wy), '+' + got, skin().t);
        const b = bankXY();
        FlyCoins.send(s.wx, sY(s.wy), 3, b.x, b.y);
      }
    }
  }

  while (G.lastNodeY < pl.wy + H * 1.5) genNode();
  // In Zen the void never rises, so cull below the camera instead of the void line.
  const cullY = G.zen ? G.cameraY - 200 : G.voidY - 120;
  G.nodes = G.nodes.filter((n) => n.wy > cullY);
  G.sparks = G.sparks.filter((s) => !s.got && s.wy > cullY);

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

/**
 * Replays the real ballistic flight from the player's current state — same
 * gravity, wall bounces, catch radius and moving-node prediction the live loop
 * uses — and returns true only if the path reaches the void / bottom WITHOUT
 * ever catching a gate. Deterministic with the real flight, so a false "doomed"
 * is impossible for static nodes; for moving nodes any error is harmless (the
 * real catch still happens during the fast-forward, just sooner).
 */
function predictDoom(): boolean {
  const G = state.G;
  const pl = G.player;
  const { W, H } = view;
  const dt = 1 / 60;
  let x = pl.wx;
  let y = pl.wy;
  let vx = pl.vx;
  let vy = pl.vy;
  for (let i = 0; i < 320; i++) {
    vy -= G_FALL * dt;
    x += vx * dt;
    y += vy * dt;
    if (x < pl.r) { x = pl.r; vx = Math.abs(vx) * WALL; }
    if (x > W - pl.r) { x = W - pl.r; vx = -Math.abs(vx) * WALL; }
    for (const n of G.nodes) {
      if (n.type === 'spike') continue;
      if (n === pl.lastReleased && i < 16) continue;   // matches the 0.25 s re-catch lockout
      const nx = n.type === 'move'
        ? n.baseX + Math.sin((G.t + i * dt) * (n.spd ?? 1) + (n.ph ?? 0)) * (n.amp ?? 0)
        : n.wx;
      if (Math.hypot(x - nx, y - n.wy) < n.r + pl.r + CATCH_PAD) return false;  // will catch → safe
    }
    if (y <= G.voidY + pl.r) return true;          // reaches the void
    if (y < G.cameraY - 160) return true;          // falls off the bottom
  }
  return true;   // ~5 s without a catch — doomed
}

export function latch(n: Node, _d: number, dx: number, dy: number): void {
  const G = state.G;
  const pl = G.player;
  const { W, H } = view;
  pl.latched = true;
  pl.land = LAND_SQUASH;     // squash-on-catch (the creature "lands" with weight)
  G.doomed = false;     // caught a gate — no longer falling to our doom
  pl.node = n;
  // DECAY gate arms a collapse countdown — but never in Zen (the calm mode stays
  // pressure-free), where it simply behaves like a normal gate.
  G.decayT = (!G.zen && n.type === 'decay') ? DECAY_TIME : 0;
  pl.ang = Math.atan2(dy, dx);
  const cross = pl.vx * Math.sin(pl.ang) - pl.vy * Math.cos(pl.ang);
  pl.dir = cross >= 0 ? 1 : -1;
  pl.trail.length = 0;
  SFX.catch(G.combo);
  P.burst(n.wx, sY(n.wy), 8, skin().c, 140, 0.35, 3.5);
  if (n.type === 'bonus') {
    const cx = n.wx;
    const cy = sY(n.wy);
    // STAR VAULT: catch a bonus node while on a high combo to claim the whole pot.
    // Rare, skill-only — never a paid chance.
    if (G.combo >= VAULT_WIN_COMBO && !G.jackpotHit) {
      G.jackpotHit = true;
      const won = Vault.win();
      G.potWon = won;
      G.coins += won;
      Callout.add('STAR VAULT!  +' + won + ' ◎', '#ffd24a', true);
      SFX.riser(0.5);
      bigWinAudio(1.4);
      cymbal(0.6);
      cheerSwell(0.9, 0.22);
      Coins.spawn(cx, cy, 46, { fountain: true, up: 220 });
      Confetti.rain(90);
      Rays.burst(cx, cy, '#ffd24a', 26);
      Shock.ring(cx, cy, '#ffd24a', { r0: 20, r1: Math.max(W, H), lw: 8, life: 0.7, fill: true });
      Sparkles.scatter(28, '#ffd24a');
      FlyCoins.send(cx, cy, 16, bankXY().x, bankXY().y);
      Flash.hit('#ffd24a', 0.6);
      shake(14, 0.55);
      buzz([60, 40, 60, 40, 120]);
      CG.happy();
      G.freezeT = 0.3;
    } else {
      const g = 25 * G.coinMult * (G.frenzyT > 0 ? FRENZY_COIN_MULT : 1);
      G.coins += g;
      if (G.frenzyT > 0) G.frenzyBanked += g;
      SFX.bonus();
      SFX.coinCascade(4);
      P.ring(cx, cy, '#ffd24a', 20, 300);
      Coins.spawn(cx, cy, 7, { fountain: true, up: 90 });
      Rays.burst(cx, cy, '#ffd24a', 8);
      Shock.ring(cx, cy, '#ffd24a', { r0: n.r, r1: 92, lw: 4, life: 0.45 });
      FlyCoins.send(cx, cy, 8, bankXY().x, bankXY().y);
      Pop.add(cx, cy - 16, '+' + g + ' ◎', '#ffd24a');
      shake(2.5, 0.12);
    }
    n.type = 'normal';
    n.r = 18;
  }
  if (G.decayT > 0) P.ring(n.wx, sY(n.wy), '#ff7a4d', 22, 320);   // "this gate is unstable" tell
  G.target = n.next;
  computeSweetZone();
  advanceConstellation(n);
  if (G.tut === 0) {
    G.tut = 1;
    G.tutT = 0;
  }
}

/** Track constellation-chain progress on each catch: a PERFECT fling onto the
 *  next expected member advances the chain; landing the 3rd completes it. Any
 *  non-perfect catch (or a gap) breaks the active chain. */
function advanceConstellation(n: Node): void {
  const G = state.G;
  if (n.constel == null) {
    if (G.constelProg > 0) { G.constelProg = 0; G.constelActive = -1; }
    return;
  }
  const perfect = G.lastReleasePerfect;
  const expected = n.cidx === G.constelProg && (G.constelProg === 0 || G.constelActive === n.constel);
  if (perfect && expected) {
    G.constelActive = n.constel;
    G.constelProg++;
    const cx = n.wx;
    const cy = sY(n.wy);
    if (G.constelProg >= 3) {
      completeConstellation(cx, cy);
    } else {
      SFX.coin();
      Pop.add(cx, cy - 24, '✦'.repeat(G.constelProg), '#cdb4ff');
      P.ring(cx, cy, '#a76bff', 14, 240);
    }
  } else {
    // missed the timing on a marked node — the chain resets
    G.constelActive = -1;
    G.constelProg = 0;
  }
}

function completeConstellation(cx: number, cy: number): void {
  const G = state.G;
  const { W, H } = view;
  G.constelActive = -1;
  G.constelProg = 0;
  G.constellations++;
  if (!G.zen) Profile.addConstellations(1);   // lifetime (real modes only) → unlock + achievement
  const fMul = G.frenzyT > 0 ? FRENZY_COIN_MULT : 1;
  const reward = 80 * G.coinMult * fMul;
  G.coins += reward;
  if (G.frenzyT > 0) G.frenzyBanked += reward;
  Callout.add('CONSTELLATION ✦  +' + reward + ' ◎', '#cdb4ff', true);
  SFX.riser(0.45);
  SFX.chaching();
  cymbal(0.4);
  Flash.hit('#a76bff', 0.28);
  Shock.ring(cx, cy, '#cdb4ff', { r0: 16, r1: Math.max(W, H) * 0.9, lw: 6, life: 0.65, fill: true });
  Rays.burst(cx, cy, '#cdb4ff', 18);
  Sparkles.scatter(22, '#cdb4ff');
  P.ring(cx, cy, '#cdb4ff', 28, 380);
  FlyCoins.send(cx, cy, 12, bankXY().x, bankXY().y);
  shake(6, 0.3);
  buzz([20, 30, 20, 40]);
  CG.happy();
  G.freezeT = 0.16;
}

export function release(): void {
  const G = state.G;
  const pl = G.player;
  const { W, H } = view;
  if (!pl.latched) return;
  G.flings++;
  const tx = -Math.sin(pl.ang) * pl.dir;
  const ty = Math.cos(pl.ang) * pl.dir;
  // CONSTANT launch — survival never depends on precision
  pl.vx = tx * LAUNCH;
  pl.vy = ty * LAUNCH;
  pl.latched = false;
  G.decayT = 0;            // flung clear of the (possibly collapsing) gate
  pl.lastReleased = pl.node;
  pl.lastReleasedT = 0;
  // PERFECT is pure reward: did we fling inside the bright gate?
  // First fling of a run is ALWAYS perfect — it removes the "tap immediately, die" trap
  // that destroys retention in the first 5 seconds.
  const sw = G.sweet;
  const insideGate = !!sw && sw.reachable && angDiff(pl.ang, sw.center) <= sw.tol;
  const isPerfect = insideGate || G.firstFlingPending;
  const fMul = G.frenzyT > 0 ? FRENZY_COIN_MULT : 1;
  if (isPerfect) {
    G.perfects++;
    G.combo = Math.min(12, G.combo + 1);
    G.maxCombo = Math.max(G.maxCombo, G.combo);
    G.overdrive = clamp(G.overdrive + OVERDRIVE_BASE + G.combo * OVERDRIVE_PER_COMBO, 0, 1);
    const gain = Math.round(3 * G.combo) * G.coinMult * fMul;
    G.coins += gain;
    if (G.frenzyT > 0) G.frenzyBanked += gain;
    const sx = pl.wx;
    const sy = sY(pl.wy);
    SFX.perfect(G.combo);
    buzz(8);
    P.ring(sx, sy, '#fff', 22, 330);
    P.burst(sx, sy, 10, skin().t, 260, 0.5, 4);
    if (G.firstFlingPending) {
      Pop.add(sx, sy - 18, 'FIRST! PERFECT', '#fff');
    } else {
      Pop.add(sx, sy - 18, `PERFECT x${G.combo}`, '#fff');
    }
    // Less is more: keep low combos clean and readable (the next node must
    // never be hidden). Shake only fades in once a chain is building, so the
    // screen settles between hits and the big moments below stand out.
    if (G.combo >= 4) shake(1 + (G.combo - 4) * 0.35, 0.1);
    pl.zap = 0.25;
    // shock ring scales with the chain so a long combo visibly hits harder
    Shock.ring(sx, sy, G.combo >= 8 ? '#ffd24a' : skin().c, { r0: pl.r, r1: 50 + G.combo * 8, lw: 3 + G.combo * 0.3, life: 0.42 });
    // a few coins fly to the balance — the satisfying "deposit"
    FlyCoins.send(sx, sy, Math.min(9, 2 + Math.floor(G.combo * 0.6)), bankXY().x, bankXY().y);
    // Combo milestone fireworks — escalate the dopamine at x3/x5/x8/x12.
    for (let i = COMBO_TIERS.length - 1; i >= 0; i--) {
      const tier = COMBO_TIERS[i];
      if (G.combo >= tier.at && G.comboTierReached < i) {
        G.comboTierReached = i;
        const bonus = tier.payout * G.coinMult * fMul;
        G.coins += bonus;
        if (G.frenzyT > 0) G.frenzyBanked += bonus;
        // Vignette pop scales with tier — gentle at x3/x5, full at x8/x12 — so
        // the screen reads as "warming up" then "erupting" instead of one flat
        // blast every few seconds.
        G.comboFlash = i >= 2 ? 1 : 0.45 + i * 0.18;
        G.comboFlashColor = tier.color;
        Pop.add(sx, sy + 18, `${tier.label}  +${bonus} ◎`, tier.color);
        P.ring(sx, sy, tier.color, 30 + i * 6, 420 + i * 60);
        P.burst(sx, sy, 18 + i * 4, tier.color, 320 + i * 50, 0.6, 4);
        Confetti.burst(sx, sy, 8 + i * 4);
        Rays.burst(sx, sy, tier.color, 8 + i * 2);
        // Full-screen flash is a "big moment" cue — reserve it for x8/x12 so the
        // genuine peaks (Frenzy, New Best, Vault) keep their impact by contrast.
        if (i >= 2) Flash.hit(tier.color, 0.18 + (i - 2) * 0.12);
        shake(i >= 2 ? 5 + (i - 2) * 2 : 2 + i, 0.16 + i * 0.04);
        SFX.milestone();
        if (i >= 2) SFX.chaching();
        CG.happy();
        break;
      }
    }
    // OVERDRIVE full → trigger FRENZY (skill-earned flow state)
    if (G.overdrive >= 1 && G.frenzyT <= 0) {
      G.overdrive = 0;
      G.frenzyT = FRENZY_TIME;
      G.frenzyBanked = 0;
      Callout.add('FRENZY!', '#ffd24a', true);
      SFX.riser(0.5);
      bigWinAudio(1.0);
      cymbal(0.5);
      cheerSwell(0.7, 0.18);
      Confetti.rain(40);
      Coins.spawn(W / 2, H * 0.5, 20, { fountain: true, up: 160 });
      Shock.ring(W / 2, H * 0.5, '#ffd24a', { r0: 20, r1: Math.max(W, H), lw: 7, life: 0.65, fill: true });
      Sparkles.scatter(26, '#ffd24a');
      Flash.hit('#ffd24a', 0.45);
      shake(8, 0.4);
      buzz([40, 30, 40, 30, 80]);
      CG.happy();
      G.freezeT = 0.18;
    }
  } else {
    // NEAR-PERFECT SAVE — one per run. If the player only just missed the
    // bright window while on a chain worth keeping, forgive it: hold the combo
    // instead of dropping it. Pure anti-frustration; never grants the perfect's
    // coins or overdrive, so it can't be farmed.
    const nearMiss = !!sw && sw.reachable
      && angDiff(pl.ang, sw.center) <= sw.tol * NEAR_PERFECT_BAND;
    if (nearMiss && G.combo >= NEAR_PERFECT_MIN_COMBO && !G.nearPerfectUsed) {
      G.nearPerfectUsed = true;
      SFX.catch(G.combo);
      Pop.add(pl.wx, sY(pl.wy) - 18, 'NEAR PERFECT', skin().t);
      P.ring(pl.wx, sY(pl.wy), skin().t, 16, 240);
    } else {
      G.combo = Math.max(1, G.combo - 1);
      SFX.fling();
      P.ring(pl.wx, sY(pl.wy), skin().c, 12, 220);
    }
  }
  // Record whether this fling was perfect — the next latch uses it to advance a
  // constellation chain. (firstFlingPending counts as perfect.)
  G.lastReleasePerfect = isPerfect;
  G.firstFlingPending = false;
}

export function hit(cause: 'void' | 'fall' | 'spike' | 'collapse'): void {
  const G = state.G;
  const pl = G.player;
  G.decayT = 0;     // any hit ends the current orbit, so the collapse fuse is moot
  // ZEN: nothing is lethal — a brief grace window and the run continues.
  if (G.zen) { G.invuln = 0.4; return; }
  // Shield now saves EVERY cause (including a fall off the bottom) — one hit,
  // bounce up, brief invulnerability. (Previously falls slipped past it.)
  if (G.shield) {
    G.shield = false;
    G.invuln = 0.7;
    pl.vy = BOUNCE_VY;     // strong, visible launch back up to re-attach to a gate
    pl.latched = false;
    G.doomed = false;
    SFX.shield();
    shake(7, 0.3);
    P.ring(pl.wx, sY(pl.wy), '#9ffff2', 26, 360);
    G.toast = { txt: 'SHIELD USED', t: 1.0, c: '#9ffff2' };
    return;
  }
  // Near-miss save: once per run, if a non-spike node is within rescue range, snap to it.
  // Only fires for 'void' and 'fall' (skill mistakes), not for 'spike' (you ran into death).
  if (G.savesUsedThisRun < 1 && cause !== 'spike') {
    let best: import('../types').Node | null = null;
    let bestD = NEAR_MISS_RADIUS;
    for (const n of G.nodes) {
      if (n.type === 'spike') continue;
      if (n === pl.lastReleased) continue;
      // Only count nodes ABOVE the rising void — saving you onto a doomed node is cruel.
      if (n.wy <= G.voidY + 30) continue;
      const d = Math.hypot(pl.wx - n.wx, pl.wy - n.wy);
      if (d < bestD) { bestD = d; best = n; }
    }
    if (best) {
      G.savesUsedThisRun = 1;
      G.invuln = 0.8;
      pl.latched = true;
      G.doomed = false;
      pl.node = best;
      pl.ang = Math.atan2(pl.wy - best.wy, pl.wx - best.wx);
      pl.dir = Math.random() > 0.5 ? 1 : -1;
      pl.vx = 0;
      pl.vy = 0;
      pl.trail.length = 0;
      pl.wx = best.wx + Math.cos(pl.ang) * ORBIT;
      pl.wy = best.wy + Math.sin(pl.ang) * ORBIT;
      pl.lastReleased = null;
      G.target = best.next;
      G.combo = Math.max(1, G.combo - 1);     // soft penalty: combo dips by 1 but doesn't reset
      G.toast = { txt: 'SAVED!', t: 1.0, c: '#9be35a' };
      P.ring(pl.wx, sY(pl.wy), '#9be35a', 30, 380);
      P.burst(pl.wx, sY(pl.wy), 16, '#9be35a', 280, 0.5, 4);
      shake(5, 0.18);
      SFX.shield();
      buzz(12);
      // Recompute the gate against the rescued node so the next decision is honest.
      computeSweetZone();
      return;
    }
  }
  if (G.dead) return;
  G.dead = true;
  G.deadT = 0;
  pl.latched = false;
  // 'collapse' (an unstable gate shattering under you) is a fall for telemetry.
  Telemetry.death(cause === 'collapse' ? 'fall' : cause, G.height);
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

  // ZEN is a relaxation/practice mode (no death = no risk), so it banks only
  // coins + XP. It deliberately does NOT touch the personal best, combo record,
  // daily missions/medals, leaderboard, or achievements — that keeps every
  // progression gate honestly earned in the real mode and unspoofable via Zen.
  const zen = G.zen;

  const xpGain = dH + dPerf * 6 + dMC * 3 + (firstEnd ? 10 : 0);
  const prevLvl = Profile.level();
  Profile.addXP(xpGain);
  Profile.addCoins(coins);
  const newBest = zen ? false : Profile.setBest(h);
  if (!zen) Profile.setBestCombo(mc);
  const leveledUp = Profile.level() > prevLvl;

  let missionRewards = 0;
  if (!zen) {
    if (firstEnd) {
      missionRewards += Daily.report('runs', 1);
      G.dailyRunCounted = true;
    }
    missionRewards += Daily.report('perf', dPerf);
    missionRewards += Daily.report('coins', coins);
    missionRewards += Daily.report('height', h);
    missionRewards += Daily.report('combo', mc);
  }
  const dDone = missionRewards > 0;
  // Completing ALL daily missions earns a bonus chest (once per day) — a chunky
  // reason to finish the set and to open the chest on the home screen.
  if (!zen && Daily.allDone()) Chest.grantDailyOnce();

  G.banked.h = h;
  G.banked.perf = perf;
  G.banked.mc = mc;
  G.coins = 0;                        // segment coins are now banked

  if (!zen) Scores.add(h);
  Vault.save();

  // Daily Challenge medals (one-time per day) — only on the final bank of a daily run.
  let dailyMedals: DailyMedal[] = [];
  if (G.daily && firstEnd) dailyMedals = DailyRun.finish(h);

  // Genuine achievement unlocks for what the run actually accomplished.
  const summary: AchSummary = {
    best: Profile.best,
    runPerf: perf,
    maxCombo: mc,
    frenzied: G.frenzyT > 0 || G.frenzyBanked > 0,
    streak: Profile.streak,
    potWon: G.jackpotHit,
    daily: G.daily,
    constellations: Profile.constellations,
  };
  const achievements = zen ? [] : Achievements.check(summary);

  // Skill-gated cosmetics: anything whose requirement is now met is earned for
  // free (must run AFTER setBest/setBestCombo + achievement checks above). In
  // Zen nothing above updated, so this naturally grants nothing.
  const claimed = claimEarnedUnlocks();
  const claimedUnlocks = [
    ...claimed.skins.map((s) => s.name),
    ...claimed.trails.map((t) => t.name),
    ...claimed.worlds.map((w) => w.name),
    ...claimed.accessories.map((a) => a.name),
  ];

  if (newBest) { CG.happy(); CG.submitHeight(Profile.best); }
  if (leveledUp || dDone || newBest || dailyMedals.length || achievements.length || claimedUnlocks.length) SFX.unlock();

  return {
    h, mc, perf, coins, newBest, xpGain, leveledUp,
    dailyJustDone: dDone, dailyReward: missionRewards,
    potWon: G.jackpotHit ? G.potWon : 0,
    achievements,
    daily: G.daily,
    zen,
    constellations: G.constellations,
    dailyMedals,
    claimedUnlocks,
  };
}

export function endRun(): void {
  const G = state.G;
  CG.gameplayStop();
  Telemetry.runEnd(G.height, G.perfects, G.flings, settings.reducedMotion);
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
  G.doomed = false;
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
  G.comboTierReached = -1;     // a fresh combo arc can re-trigger milestone fireworks
  G.firstFlingPending = true;  // the back-in fling is also free-perfect to relaunch the rhythm
  G.revivedThisRun = true;
  G.toast = { txt: 'BACK IN!', t: 1.4, c: '#9ffff2' };
  P.ring(pl.wx, sY(pl.wy), '#9ffff2', 24, 320);
  SFX.shield();
  Telemetry.revive();

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
