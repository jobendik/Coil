import { view } from '../core/canvas';
import { state } from '../game/state';
import { Profile } from '../game/profile';
import { Owned, equipSkin, skin, skinState } from '../game/skins';
import { MILESTONE_SKINS, MILESTONE_STEP } from '../config';
import { TAU, clamp, glowFX, hexA, lerp, rr, text } from '../core/utils';
import { btn } from '../core/ui';
import { SFX, cymbal } from '../core/audio';
import { Shock, Sparkles, Confetti } from '../core/fx';
import { buzz } from '../core/haptics';
import { drawBG, dimVoid } from './play';
import type { Skin } from '../types';

/* =========================================================================
   ASCENT — the death-screen "how far you climbed / what waits above" panel.

   A VERTICAL climb tower (the game's natural axis): every 100 m is an evolution
   form. On death the player's creature animates CLIMBING up the rail from the
   base to exactly the height they reached this run — decelerating like a slot
   reel — and stops JUST below the next reward, which glows above with a
   "so close" counter. That near-miss (lifted straight from slot_machine.md, but
   re-cast vertically to suit a climbing game) is the "one more run" hook.

   Earned forms are full-colour and tap-to-equip; locked ones are greyed with
   their requirement, so the next carrot is always in frame. Drag to explore the
   full ladder; PLAY AGAIN sits right beside the glowing reward.
   ========================================================================= */

const RAIL_FRAC = 0.30;        // rail x as a fraction of canvas width
const PPM = 0.92;              // pixels per metre (100 m ≈ 92 px between stops)
const TOP_M = MILESTONE_SKINS.length * MILESTONE_STEP + 120;  // headroom above the top form
const STOP_R = 19;             // reward creature radius
const CLIMB_DUR = 1.7;         // marker climb animation length (s)

// Vertical scroll + drag state (shared with the input hooks in main.ts).
const scroll = { y: 0, target: 0, max: 0, dragging: false, lastPY: 0, moved: 0 };
let t = 0;                     // scene clock
let climb = 0;                 // 0..1 marker climb progress (eased into markerH)
let runH = 0;                  // height reached this run (the marker's destination)
let earnedName: string | null = null;  // a form newly earned THIS run (celebrate it)
let arrived = false;           // marker reached the top — fire the arrival FX once
let sparkAcc = 0;              // throttles climb-trail sparkles

/* `requestReplay` is injected by main.ts so PLAY AGAIN can restart the run
   without this scene importing the game loop. */
let onReplay: () => void = () => { /* injected by main.ts */ };
export function setAscentReplay(fn: () => void): void { onReplay = fn; }

function railX(): number { return view.W * RAIL_FRAC; }

/** Top of the scrollable track (below the title) and its visible height. */
function trackTop(): number { return view.SAFE_TOP + 92; }
function trackBottom(): number { return view.H - 132 - view.SAFE_BOTTOM; }

/** Virtual (pre-scroll) y of a height inside the content column. */
function vy(h: number): number { return (TOP_M - h) * PPM; }
/** Screen y of a height, after scroll. */
function Y(h: number): number { return trackTop() + vy(h) - scroll.y; }

function earnedCount(): number {
  return MILESTONE_SKINS.reduce((n, s) => n + (Owned.includes(s.id) ? 1 : 0), 0);
}
function stopH(i: number): number {
  return (MILESTONE_SKINS[i].req?.value as number) ?? (i + 1) * MILESTONE_STEP;
}

/** The nearest milestone stop strictly above this run — the immediate near-miss
 *  goal. Returns null only when the run cleared the whole ladder. */
function targetAboveRun(): { s: Skin; h: number } | null {
  for (let i = 0; i < MILESTONE_SKINS.length; i++) {
    if (stopH(i) > runH) return { s: MILESTONE_SKINS[i], h: stopH(i) };
  }
  return null;
}
/** The first still-locked reward (by all-time best) — the standing carrot. */
function nextLocked(): { s: Skin; h: number } | null {
  for (let i = 0; i < MILESTONE_SKINS.length; i++) {
    if (!Owned.includes(MILESTONE_SKINS[i].id)) return { s: MILESTONE_SKINS[i], h: stopH(i) };
  }
  return null;
}

const easeOutQuart = (x: number): number => 1 - Math.pow(1 - x, 4);
function markerH(): number { return runH * easeOutQuart(climb); }

/** Opened from the result screen. `h` is the height reached this run; `earned`
 *  is the name of a form unlocked on this very run (if any) so we can celebrate. */
export function openAscent(h: number, earned: string | null = null): void {
  t = 0;
  climb = 0;
  arrived = false;
  sparkAcc = 0;
  runH = Math.max(0, Math.round(h));
  earnedName = earned;

  const { H } = view;
  const viewH = trackBottom() - trackTop();
  scroll.max = Math.max(0, vy(0) - viewH);
  // Frame the immediate goal (next stop above the run) in the upper third so the
  // climbing marker rises into view and stops just beneath it.
  const tgt = targetAboveRun();
  const focusH = tgt ? tgt.h : TOP_M - 80;
  scroll.target = clamp(vy(focusH) - viewH * 0.30, 0, scroll.max);
  scroll.y = scroll.target;
  scroll.dragging = false;
  scroll.moved = 0;

  // Anticipation riser as the climb begins (the reveal of "what's ahead").
  SFX.riser(0.9);
  if (earned) { Confetti.rain(40); setTimeout(() => { SFX.unlock(); cymbal(0.4); }, 500); }
  void H;
}

/* ---- input hooks (wired from main.ts; only active while scene === 'ascent') ---- */
export function ascentDown(y: number): void {
  scroll.dragging = true;
  scroll.lastPY = y;
  scroll.moved = 0;
}
export function ascentMove(y: number): void {
  if (!scroll.dragging) return;
  const dy = y - scroll.lastPY;
  scroll.lastPY = y;
  scroll.moved += Math.abs(dy);
  scroll.y = clamp(scroll.y - dy, 0, scroll.max);
  scroll.target = scroll.y;
}
/** Returns true if the gesture was a tap (negligible movement) so the caller
    should run the button hit-test at the release point. */
export function ascentUp(): boolean {
  const wasTap = scroll.moved < 8;
  scroll.dragging = false;
  return wasTap;
}

/* small procedural "creature" — colour orb + specular + eyes (matches the
   in-game player look). Greyed + padlocked when locked. */
function drawCreature(x: number, y: number, r: number, s: Skin, owned: boolean, bob = true): void {
  const { ctx } = view;
  ctx.save();
  if (!owned) {
    ctx.fillStyle = 'rgba(255,255,255,.05)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.14)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.strokeStyle = '#7e88b5';
    ctx.fillStyle = '#7e88b5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y - 3, 4, Math.PI, 0);
    ctx.stroke();
    rr(x - 5.5, y - 1, 11, 9, 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  const wob = bob ? Math.sin(t * 3 + x * 0.02) * 1.5 : 0;
  ctx.translate(x, y + wob);
  ctx.fillStyle = s.c;
  ctx.shadowColor = s.c;
  ctx.shadowBlur = glowFX(18);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.beginPath();
  ctx.arc(-r * 0.32, -r * 0.34, r * 0.26, 0, TAU);
  ctx.fill();
  for (const o of [-1, 1]) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(o * r * 0.34, r * 0.02, r * 0.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#0a0720';
    ctx.beginPath();
    ctx.arc(o * r * 0.34, r * 0.06, r * 0.1, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function equip(s: Skin): void {
  if (!Owned.includes(s.id)) return;
  if (skinState.equipped === s.id) return;
  equipSkin(s.id);
  SFX.unlock();
  buzz(12);
  const { W, H } = view;
  Shock.ring(W / 2, H * 0.42, s.c, { r0: 16, r1: Math.max(W, H) * 0.6, lw: 4, life: 0.5 });
  Sparkles.scatter(14, s.t);
}

export function renderAscent(dt: number): void {
  const { ctx, W, H, SAFE_TOP, SAFE_BOTTOM } = view;
  t += dt;
  if (climb < 1) climb = Math.min(1, climb + dt / CLIMB_DUR);
  drawBG();
  dimVoid(0.78);
  if (!scroll.dragging) scroll.y = lerp(scroll.y, scroll.target, Math.min(1, dt * 8));

  const rx = railX();
  const earned = earnedCount();
  const total = MILESTONE_SKINS.length;
  const tgt = targetAboveRun();
  const carrot = nextLocked();

  // ---- title ----
  text('ASCENT', W / 2, 38 + SAFE_TOP, 24, '#fff', 800, 12, 'center', "'Unbounded'");
  text(runH + ' M THIS RUN  ·  BEST ' + Profile.best + ' M', W / 2, 64 + SAFE_TOP, 11, '#9fb0e0', 700, 0);

  const top = trackTop();
  const bot = trackBottom();

  // clip the track so the tower scrolls cleanly past the edges
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, top, W, bot - top);
  ctx.clip();

  const yBase = Y(0);
  const yTopCap = Y(TOP_M);

  // ---- the rail (faint full-height spine) ----
  ctx.strokeStyle = 'rgba(255,255,255,.10)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(rx, Math.max(top, yTopCap));
  ctx.lineTo(rx, Math.min(bot, yBase));
  ctx.stroke();

  // ---- the conquered climb (base → marker), glowing in the player's colour ----
  const sk = skin();
  const yMark = Y(markerH());
  ctx.save();
  ctx.strokeStyle = sk.c;
  ctx.lineWidth = 5;
  ctx.shadowColor = sk.c;
  ctx.shadowBlur = glowFX(14);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(rx, Math.min(bot, yBase));
  ctx.lineTo(rx, clamp(yMark, top - 40, bot + 40));
  ctx.stroke();
  ctx.restore();

  // ---- reward stops ----
  for (let i = 0; i < total; i++) {
    const s = MILESTONE_SKINS[i];
    const h = stopH(i);
    const sy = Y(h);
    if (sy < top - 40 || sy > bot + 40) continue;  // offscreen — skip
    const owned = Owned.includes(s.id);
    const eq = skinState.equipped === s.id;
    const isTarget = !!tgt && tgt.s.id === s.id;     // the immediate near-miss goal
    const isCarrot = !!carrot && carrot.s.id === s.id; // the standing locked reward
    const glow = (isTarget || isCarrot) && !owned;
    const pulse = glow ? 0.5 + 0.5 * Math.sin(t * 4) : 0;

    // tick connecting the rail to the label
    ctx.strokeStyle = owned ? hexA(s.c, 0.5) : 'rgba(255,255,255,.12)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(rx + STOP_R, sy);
    ctx.lineTo(rx + STOP_R + 14, sy);
    ctx.stroke();

    // reward orb (with a halo when it's the carrot/goal)
    if (glow) {
      ctx.save();
      ctx.globalAlpha = 0.25 + pulse * 0.4;
      ctx.fillStyle = hexA(s.c, 0.9);
      ctx.shadowColor = s.c;
      ctx.shadowBlur = glowFX(24);
      ctx.beginPath();
      ctx.arc(rx, sy, STOP_R + 8 + pulse * 5, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    drawCreature(rx, sy, STOP_R, s, owned, owned);

    // label column to the right
    const lx = rx + STOP_R + 22;
    text(h + ' M', lx, sy - 9, 12.5, owned ? s.t : (glow ? s.t : '#8a93bf'), 800, glow ? 4 : 0, 'left', "'Unbounded'");
    if (eq) {
      text(s.name + '  ·  EQUIPPED', lx, sy + 9, 11, s.c, 800, 3, 'left');
    } else if (owned) {
      text(s.name, lx, sy + 9, 12, '#fff', 700, 0, 'left');
      // tap-to-equip pill
      const pw = 58;
      rr(lx, sy + 18, pw, 18, 9);
      ctx.fillStyle = hexA(s.c, 0.16);
      ctx.fill();
      ctx.strokeStyle = hexA(s.c, 0.5);
      ctx.lineWidth = 1;
      ctx.stroke();
      text('EQUIP', lx + pw / 2, sy + 27, 10, s.t, 800, 0);
    } else {
      // locked — name hidden, show how close (best vs requirement)
      const frac = clamp(Profile.best / h, 0, 1);
      text(glow ? '??? — ' + Math.max(0, h - Profile.best) + ' M TO GO' : '???',
        lx, sy + 9, 11, glow ? '#ffe39b' : '#7e88b5', 800, 0, 'left');
      const bw = W * 0.34;
      rr(lx, sy + 18, bw, 4, 2);
      ctx.fillStyle = 'rgba(255,255,255,.08)';
      ctx.fill();
      rr(lx, sy + 18, bw * frac, 4, 2);
      ctx.fillStyle = hexA(s.c, 0.8);
      ctx.fill();
    }

    // equip tap target (taps are filtered from drags in main.ts)
    if (owned && !eq) btn('asc' + s.id, rx - STOP_R, sy - STOP_R, W * 0.6, STOP_R * 2 + 6, () => equip(s));
  }

  // ---- BEST tick (when the all-time best sits above this run) ----
  if (Profile.best > runH && Profile.best < TOP_M) {
    const by = Y(Profile.best);
    if (by > top - 10 && by < bot + 10) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,.45)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(rx - 40, by);
      ctx.lineTo(rx - STOP_R - 4, by);
      ctx.stroke();
      ctx.restore();
      text('BEST', rx - 52, by, 9, '#cfe0ff', 800, 0, 'right');
    }
  }

  // ---- the climbing player marker ----
  const my = clamp(yMark, top - 30, bot + 30);
  // a little forward-spark trail while it's still rising
  if (climb < 1) {
    sparkAcc += dt;
    if (sparkAcc > 0.05) { sparkAcc = 0; Sparkles.pop(rx + (Math.random() - 0.5) * 10, my + 8, sk.t); }
  }
  drawCreature(rx, my, 15, sk, true, false);
  // "YOU" flag
  text('YOU', rx, my - 26, 9, '#eaf6ff', 800, 6);

  ctx.restore();  // end track clip

  // arrival burst — fired once when the climb completes
  if (climb >= 1 && !arrived) {
    arrived = true;
    Shock.ring(rx, my, sk.c, { r0: 10, r1: 120, lw: 3, life: 0.5 });
    Sparkles.scatter(12, sk.t);
    cymbal(0.35);
    buzz([20, 40]);
    if (tgt && !Owned.includes(tgt.s.id)) SFX.milestone();
  }

  Sparkles.draw();
  Shock.draw();
  Confetti.draw();

  // scroll affordance (vertical)
  if (scroll.max > 1) {
    const prog = scroll.y / scroll.max;
    const trackH = (bot - top) * 0.5;
    const sxr = W - 8;
    rr(sxr - 3, top + (bot - top - trackH) / 2, 4, trackH, 2);
    ctx.fillStyle = 'rgba(255,255,255,.07)';
    ctx.fill();
    rr(sxr - 3, top + (bot - top - trackH) / 2 + (trackH - 34) * prog, 4, 34, 2);
    ctx.fillStyle = 'rgba(255,255,255,.32)';
    ctx.fill();
  }

  // ---- near-miss banner ----
  const banY = bot + 22;
  if (earnedName) {
    text('✦ NEW FORM UNLOCKED', W / 2, banY, 13, '#9be35a', 800, 8);
    text(earnedName + ' is yours — tap it above to equip', W / 2, banY + 20, 11, '#dcffb0', 700, 0);
  } else if (tgt && !Owned.includes(tgt.s.id)) {
    const gap = tgt.h - runH;
    const close = runH >= tgt.h * 0.7;
    text((close ? 'SO CLOSE · ' : '') + gap + ' M TO YOUR NEXT FORM', W / 2, banY, 13, '#ffe39b', 800, 8);
    text('Climb to ' + tgt.h + ' m to unlock a new evolution', W / 2, banY + 20, 11, '#9fb0e0', 700, 0);
  } else if (carrot) {
    const gap = carrot.h - Profile.best;
    text(gap + ' M TO ' + (carrot.s.name).toUpperCase(), W / 2, banY, 13, '#ffe39b', 800, 8);
    text('Reach ' + carrot.h + ' m to evolve again', W / 2, banY + 20, 11, '#9fb0e0', 700, 0);
  } else {
    text('MAX EVOLUTION — every form is yours', W / 2, banY, 13, '#9be35a', 800, 8);
    text(earned + ' / ' + total + ' evolved · a true Legend', W / 2, banY + 20, 11, '#dcffb0', 700, 0);
  }

  // ---- CTAs: PLAY AGAIN (the money shot) + BACK ----
  const pw = W * 0.62;
  const px = W / 2 - pw / 2;
  const py = H - 64 - SAFE_BOTTOM;
  const gap2 = 9;
  const playW = pw * 0.62;
  const backW = pw - playW - gap2;

  rr(px, py, playW, 46, 13);
  ctx.fillStyle = sk.c;
  ctx.shadowColor = sk.c;
  ctx.shadowBlur = glowFX(18);
  ctx.fill();
  ctx.shadowBlur = 0;
  text('PLAY AGAIN', px + playW / 2, py + 23, 16, '#04030a', 800, 0, 'center', "'Unbounded'");
  btn('ascplay', px, py, playW, 46, () => onReplay());

  const bx = px + playW + gap2;
  rr(bx, py, backW, 46, 13);
  ctx.fillStyle = 'rgba(20,16,48,.8)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.18)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text('BACK', bx + backW / 2, py + 23, 14, '#eaf6ff', 800, 0, 'center', "'Unbounded'");
  btn('ascback', bx, py, backW, 46, () => { state.scene = state.G ? 'over' : 'home'; });
}
