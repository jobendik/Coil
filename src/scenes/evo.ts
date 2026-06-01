import { view } from '../core/canvas';
import { state } from '../game/state';
import { Profile } from '../game/profile';
import { Owned, equipSkin, skinState } from '../game/skins';
import { MILESTONE_SKINS, MILESTONE_STEP } from '../config';
import { TAU, clamp, glowFX, hexA, lerp, rr, text } from '../core/utils';
import { btn } from '../core/ui';
import { SFX } from '../core/audio';
import { Shock, Sparkles } from '../core/fx';
import { buzz } from '../core/haptics';
import { drawBG, dimVoid } from './play';
import type { Skin } from '../types';

/* =========================================================================
   EVOLUTION PANEL — the death-screen progression visualizer (design #4).
   A horizontal, swipeable track of the milestone characters: every 100 m
   unlocks a new evolution. Earned ones are full-colour and tap-to-equip;
   future ones are greyed with their requirement, so the player always sees
   the next carrot ("just 40 m more to Bloom"). Reachable from the result
   screen; auto-centres on the player's current progress on open.
   ========================================================================= */

const CARD_W = 98;
const CARD_H = 150;
const GAP = 14;
const PAD = 22;

// Horizontal scroll + drag state (shared with the input hooks in main.ts).
const scroll = { x: 0, target: 0, max: 0, dragging: false, lastPX: 0, moved: 0 };
let t = 0;

function earnedCount(): number {
  return MILESTONE_SKINS.reduce((n, s) => n + (Owned.includes(s.id) ? 1 : 0), 0);
}

function contentW(): number {
  const n = MILESTONE_SKINS.length;
  return PAD * 2 + n * CARD_W + (n - 1) * GAP;
}

/** Called when the scene opens — centre the view on the current frontier
    (the boundary between earned and locked) so the next unlock is in sight. */
export function openEvo(): void {
  t = 0;
  const { W } = view;
  scroll.max = Math.max(0, contentW() - W);
  const focus = clamp(earnedCount(), 0, MILESTONE_SKINS.length - 1);
  const focusX = PAD + focus * (CARD_W + GAP) + CARD_W / 2;
  scroll.target = clamp(focusX - W / 2, 0, scroll.max);
  scroll.x = scroll.target;
  scroll.dragging = false;
  scroll.moved = 0;
}

/* ---- input hooks (wired from main.ts; only active while scene === 'evo') ---- */
export function evoDown(x: number): void {
  scroll.dragging = true;
  scroll.lastPX = x;
  scroll.moved = 0;
}
export function evoMove(x: number): void {
  if (!scroll.dragging) return;
  const dx = x - scroll.lastPX;
  scroll.lastPX = x;
  scroll.moved += Math.abs(dx);
  scroll.x = clamp(scroll.x - dx, 0, scroll.max);
  scroll.target = scroll.x;
}
/** Returns true if the gesture was a tap (negligible movement) so the caller
    should run the button hit-test at the release point. */
export function evoUp(): boolean {
  const wasTap = scroll.moved < 8;
  scroll.dragging = false;
  return wasTap;
}

/* small procedural "creature" — colour orb + specular + eyes (matches the
   in-game player look so the preview is honest). Greyed when locked. */
function drawCreature(x: number, y: number, r: number, s: Skin, owned: boolean): void {
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
    // padlock
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
  const bob = Math.sin(t * 3 + x * 0.02) * 1.5;
  ctx.translate(x, y + bob);
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

export function renderEvo(dt: number): void {
  const { ctx, W, H, SAFE_TOP, SAFE_BOTTOM } = view;
  t += dt;
  drawBG();
  dimVoid(0.7);
  if (!scroll.dragging) scroll.x = lerp(scroll.x, scroll.target, Math.min(1, dt * 8));
  scroll.max = Math.max(0, contentW() - W);

  const earned = earnedCount();
  const total = MILESTONE_SKINS.length;
  text('EVOLUTION', W / 2, 40 + SAFE_TOP, 24, '#fff', 800, 12, 'center', "'Unbounded'");
  text(earned + ' / ' + total + ' EVOLVED  ·  swipe to explore', W / 2, 66 + SAFE_TOP, 11, '#9fb0e0', 700, 0);

  const trackTop = H * 0.30;
  const cardY = trackTop;

  // clip the track so cards scroll cleanly past the edges
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, cardY - 16, W, CARD_H + 60);
  ctx.clip();

  for (let i = 0; i < total; i++) {
    const s = MILESTONE_SKINS[i];
    const owned = Owned.includes(s.id);
    const eq = skinState.equipped === s.id;
    // Milestone skins are all height-gated; fall back to the step-derived height
    // rather than assert non-null, so a future entry without a req can't crash here.
    const ms = (s.req?.value as number) ?? (i + 1) * MILESTONE_STEP;
    const x = PAD + i * (CARD_W + GAP) - scroll.x;
    if (x > W + 10 || x + CARD_W < -10) continue;   // offscreen — skip
    const cx = x + CARD_W / 2;

    // card body
    const cg = ctx.createLinearGradient(x, cardY, x, cardY + CARD_H);
    cg.addColorStop(0, owned ? 'rgba(34,28,66,.95)' : 'rgba(20,17,40,.85)');
    cg.addColorStop(1, owned ? 'rgba(14,10,30,.96)' : 'rgba(10,8,22,.9)');
    rr(x, cardY, CARD_W, CARD_H, 16);
    ctx.fillStyle = cg;
    ctx.fill();
    rr(x, cardY, CARD_W, CARD_H, 16);
    ctx.lineWidth = eq ? 2.5 : 1.2;
    ctx.strokeStyle = eq ? s.c : owned ? hexA(s.c, 0.4) : 'rgba(255,255,255,.07)';
    if (eq) { ctx.shadowColor = s.c; ctx.shadowBlur = glowFX(14); }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // milestone ribbon
    text(ms + ' M', cx, cardY + 20, 12, owned ? s.t : '#8a93bf', 800, owned ? 4 : 0, 'center', "'Unbounded'");

    // creature
    drawCreature(cx, cardY + 64, 20, s, owned);

    // name
    text(owned ? s.name : '???', cx, cardY + 102, 13, owned ? '#fff' : '#7e88b5', 800, 0);

    // action / status row
    if (eq) {
      text('EQUIPPED', cx, cardY + 126, 10.5, s.c, 800, 3);
    } else if (owned) {
      rr(cx - 38, cardY + 116, 76, 24, 10);
      ctx.fillStyle = hexA(s.c, 0.16);
      ctx.fill();
      ctx.strokeStyle = hexA(s.c, 0.5);
      ctx.lineWidth = 1;
      ctx.stroke();
      text('EQUIP', cx, cardY + 128, 11, s.t, 800, 0);
    } else {
      // locked — show how close (best vs requirement)
      const frac = clamp(Profile.best / ms, 0, 1);
      text('REACH ' + ms + ' M', cx, cardY + 120, 9, '#8a93bf', 800, 0, 'center', "'Unbounded'");
      const bw = CARD_W * 0.6;
      const bx = cx - bw / 2;
      rr(bx, cardY + 132, bw, 4, 2);
      ctx.fillStyle = 'rgba(255,255,255,.08)';
      ctx.fill();
      rr(bx, cardY + 132, bw * frac, 4, 2);
      ctx.fillStyle = hexA(s.c, 0.8);
      ctx.fill();
    }

    // tap target — equip when owned (taps are filtered from swipes in main.ts)
    if (owned && !eq) btn('evo' + s.id, x, cardY, CARD_W, CARD_H, () => equip(s));
  }
  ctx.restore();

  // unlock-moment FX on top
  Sparkles.draw();
  Shock.draw();

  // scroll affordance dots
  if (scroll.max > 1) {
    const prog = scroll.x / scroll.max;
    const dotY = cardY + CARD_H + 34;
    const trackW2 = W * 0.4;
    rr(W / 2 - trackW2 / 2, dotY, trackW2, 4, 2);
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    ctx.fill();
    rr(W / 2 - trackW2 / 2 + (trackW2 - 40) * prog, dotY, 40, 4, 2);
    ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.fill();
  }

  // next-up carrot line
  if (earned < total) {
    const next = MILESTONE_SKINS[earned];
    const ms = (next.req?.value as number) ?? (earned + 1) * MILESTONE_STEP;
    const left = Math.max(0, ms - Profile.best);
    const line = left > 0 ? 'Next: reach ' + ms + ' m to evolve' : 'Reach ' + ms + ' m to evolve next';
    text(line, W / 2, H * 0.82 - SAFE_BOTTOM, 12, '#ffe39b', 700, 6);
  } else {
    text('Fully evolved — every form unlocked!', W / 2, H * 0.82 - SAFE_BOTTOM, 12, '#9be35a', 800, 6);
  }

  // BACK button
  const bw = W * 0.5;
  const bh = 46;
  const bx = W / 2 - bw / 2;
  const by = H - 64 - SAFE_BOTTOM;
  rr(bx, by, bw, bh, 13);
  ctx.fillStyle = 'rgba(20,16,48,.8)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.18)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text('BACK', W / 2, by + bh / 2, 15, '#eaf6ff', 800, 0, 'center', "'Unbounded'");
  btn('evoback', bx, by, bw, bh, () => { state.scene = state.G ? 'over' : 'home'; });
}
