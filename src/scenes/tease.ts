import type { ResultData, Skin } from '../types';
import { view } from '../core/canvas';
import { state } from '../game/state';
import { Profile } from '../game/profile';
import { Owned, skin } from '../game/skins';
import { MILESTONE_SKINS } from '../config';
import { TAU, clamp, glowFX, hexA, text } from '../core/utils';
import { SFX, cymbal } from '../core/audio';
import { Shock, Sparkles, Confetti } from '../core/fx';
import { buzz } from '../core/haptics';
import { drawBG, dimVoid } from './play';
import { Result } from './result';

/* =========================================================================
   ASCENT TEASE — a short, auto-playing cinematic shown the instant a run ends,
   BEFORE the game-over screen. It displays the COMPLETE ascent ladder: the
   player's creature climbs the whole tower of evolution forms, each earned form
   lighting up in a cascade as it's passed, the still-locked forms waiting dim
   above, and the next reward pulsing just beyond the frontier — framed as
   "↑ X m to <Form> · ONE MORE RUN?". Auto-advances to the result screen after
   ~3 s (tap to skip). Skipped for Zen (no real climb / best). The full, browsable
   + equippable tower still lives in scenes/ascent.ts (reached from the result).
   ========================================================================= */

const DURATION = 3.2;        // seconds on screen before auto-advancing
const SKIP_LOCK = 0.55;      // ignore taps this long so death-moment tap-spam can't skip
const CLIMB_DUR = 1.9;       // marker climb animation length (s)

let d: ResultData = null as unknown as ResultData;
let t = 0;
let runH = 0;
let lit = 0;                 // earned forms the climb has lit so far (drives the cascade pops)
let flared = false;

function formH(s: Skin): number {
  return (s.req?.value as number) || 0;
}
function nextLocked(): Skin | null {
  for (const s of MILESTONE_SKINS) if (!Owned.includes(s.id)) return s;
  return null;
}

/** Opened by endRun() with the just-banked result payload. */
export function openTease(data: ResultData): void {
  d = data;
  t = 0;
  lit = 0;
  flared = false;
  runH = Math.max(0, Math.round(data.h));
  SFX.riser(1.0);
  buzz(18);
}

/** Hand off to the normal game-over screen. */
function finish(): void {
  Result.show(d);
  state.scene = 'over';
}

/** Tap anywhere to skip — but not in the first instants (death-tap guard). */
export function teaseTap(): void {
  if (t > SKIP_LOCK) finish();
}

/** colour orb + specular + eyes (matches the in-game player look). */
function creature(x: number, y: number, r: number, s: Skin): void {
  const { ctx } = view;
  ctx.save();
  ctx.fillStyle = s.c;
  ctx.shadowColor = s.c;
  ctx.shadowBlur = glowFX(18);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.beginPath();
  ctx.arc(x - r * 0.32, y - r * 0.34, r * 0.26, 0, TAU);
  ctx.fill();
  for (const o of [-1, 1]) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x + o * r * 0.34, y + r * 0.02, r * 0.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#0a0720';
    ctx.beginPath();
    ctx.arc(x + o * r * 0.34, y + r * 0.06, r * 0.1, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

export function renderTease(dt: number): void {
  const { ctx, W, H } = view;
  t += dt;
  drawBG();
  dimVoid(0.76);
  const sk = skin();
  const best = Profile.best;
  const forms = MILESTONE_SKINS;
  const next = nextLocked();

  // small run recap up top — "how far you came this run"
  text('RUN OVER', W / 2, H * 0.075, 18, '#9fb0e0', 800, 6, 'center', "'Unbounded'");
  text(runH + ' M', W / 2, H * 0.125, 30, '#fff', 800, 12, 'center', "'Unbounded'");

  // ---- the COMPLETE ascent ladder ----
  const cx = W * 0.38;                 // rail x (labels breathe to the right)
  const yBot = H * 0.84;               // 0 m
  const yTop = H * 0.205;              // top form
  const TOP = formH(forms[forms.length - 1]) || forms.length * 100;
  const Y = (h: number): number => yBot - (clamp(h, 0, TOP) / TOP) * (yBot - yTop);

  // climb the frontier (your best) — the marker rises, lighting earned forms
  const climb01 = 1 - Math.pow(1 - clamp(t / CLIMB_DUR, 0, 1), 3);
  const mH = best * climb01;
  const my = Y(mH);

  // cascade: pop a spark + tick each time the rising marker lights a new form
  let litNow = 0;
  for (const s of forms) if (Owned.includes(s.id) && mH >= formH(s)) litNow++;
  if (litNow > lit) {
    lit = litNow;
    Sparkles.scatter(5, sk.t);
    Sparkles.pop(cx, my, sk.t);
    SFX.tick();
  }

  ctx.save();
  ctx.lineCap = 'round';
  // dim full spine
  ctx.strokeStyle = 'rgba(255,255,255,.10)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, yBot);
  ctx.lineTo(cx, yTop);
  ctx.stroke();
  // lit conquered climb (base → marker)
  ctx.strokeStyle = sk.c;
  ctx.shadowColor = sk.c;
  ctx.shadowBlur = glowFX(12);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx, yBot);
  ctx.lineTo(cx, my);
  ctx.stroke();
  ctx.restore();

  const pulse = 0.5 + 0.5 * Math.sin(t * 4);

  // form nodes — earned light up as the climb passes them; the next reward glows;
  // forms beyond it stay dim, so the whole journey (and what's left) is on screen
  for (const s of forms) {
    const h = formH(s);
    const y = Y(h);
    const owned = Owned.includes(s.id);
    const isNext = !!next && s.id === next.id;
    if (isNext) {
      ctx.save();
      ctx.globalAlpha = 0.2 + pulse * 0.35;
      ctx.fillStyle = s.c;
      ctx.shadowColor = s.c;
      ctx.shadowBlur = glowFX(26);
      ctx.beginPath();
      ctx.arc(cx, y, 16 + pulse * 6, 0, TAU);
      ctx.fill();
      ctx.restore();
      creature(cx, y, 13, s);
      text(s.name.toUpperCase(), cx + 26, y, 13, s.t, 800, 6, 'left');
    } else if (owned && mH >= h) {
      creature(cx, y, 10, s);   // lit — climbed past
    } else {
      // dim: an earned form not yet reached in the animation, or a far locked one
      ctx.fillStyle = owned ? hexA(s.c, 0.3) : 'rgba(255,255,255,.14)';
      ctx.beginPath();
      ctx.arc(cx, y, owned ? 4 : 3, 0, TAU);
      ctx.fill();
    }
  }

  // the climbing player marker + "you" frontier tag
  creature(cx, my, 13, sk);
  if (climb01 > 0.6) {
    const tag = d.newBest ? 'NEW BEST · ' + best + ' M' : best + ' M BEST';
    text(tag, cx + 24, my, 11, d.newBest ? '#9be35a' : '#cfe0ff', 800, d.newBest ? 5 : 0, 'left');
  }

  // arrival flare once the climb settles at the frontier
  if (t > CLIMB_DUR && !flared) {
    flared = true;
    if (next) Shock.ring(cx, Y(formH(next)), next.c, { r0: 16, r1: Math.max(W, H) * 0.5, lw: 4, life: 0.6 });
    Sparkles.scatter(16, next ? next.t : sk.t);
    cymbal(0.4);
    SFX.milestone();
    buzz([20, 40, 20]);
  }

  // ---- callout + hook below the ladder ----
  if (next) {
    const gap = Math.max(0, formH(next) - best);
    const close = gap <= 40;
    if (t > 1.2) {
      const a = clamp((t - 1.2) / 0.3, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      text((close ? 'SO CLOSE!  ' : '') + '↑ ' + gap + ' M TO ' + next.name.toUpperCase(),
        W / 2, H * 0.885, 17, next.t, 800, 8, 'center', "'Unbounded'");
      ctx.restore();
    }
  } else if (t > 1.2) {
    text('MAX EVOLUTION — every form earned!', W / 2, H * 0.885, 15, '#9be35a', 800, 8);
  }

  if (t > 2.2) {
    const p = 0.6 + 0.4 * Math.sin(t * 6);
    text('ONE MORE RUN?', W / 2, H * 0.93, 22, '#ffe39b', 800, glowFX(14 * p), 'center', "'Unbounded'");
  }
  text('tap to continue', W / 2, H * 0.97, 10, '#7e88b5', 700, 0);

  Sparkles.draw();
  Shock.draw();
  Confetti.draw();

  if (t >= DURATION) finish();
}
