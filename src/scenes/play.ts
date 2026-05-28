import type { Node } from '../types';
import { view } from '../core/canvas';
import { state, sY } from '../game/state';
import { skin } from '../game/skins';
import { Profile } from '../game/profile';
import { TAU, clamp, glowFX, lerp, rand, text, rr } from '../core/utils';
import { btn } from '../core/ui';
import { settings, setAimPreview, setMuted } from '../settings';
import { curCatchPad, perfectHi } from '../game/physics';
import {
  G_FALL,
  LAUNCH,
  PERFECT_LO,
  WALL_BOUNCE,
  ZONES,
} from '../config';

/* ---------- starfield (one per session) ---------- */
const STARS = (() => {
  const arr: Array<{ x: number; y: number; d: number; s: number; a: number }> = [];
  for (let i = 0; i < 64; i++) {
    arr.push({
      x: Math.random(),
      y: Math.random(),
      d: rand(0.08, 0.45),
      s: rand(1, 2.4),
      a: rand(0.12, 0.4),
    });
  }
  return arr;
})();

export function drawBG(): void {
  const { ctx, W, H } = view;
  const h = state.G?.height ?? 0;
  let z0 = ZONES[0];
  let z1 = ZONES[0];
  let tt = 0;
  for (let i = 0; i < ZONES.length; i++) {
    if (h >= ZONES[i].from) {
      z0 = ZONES[i];
      z1 = ZONES[Math.min(i + 1, ZONES.length - 1)];
      const span = (z1.from - z0.from) || 1;
      tt = clamp((h - z0.from) / span, 0, 1);
    }
  }
  const mix = (a: string, b: string): string => {
    const pa = parseInt(a.slice(1), 16);
    const pb = parseInt(b.slice(1), 16);
    const r = Math.round(lerp((pa >> 16) & 255, (pb >> 16) & 255, tt));
    const g = Math.round(lerp((pa >> 8) & 255, (pb >> 8) & 255, tt));
    const bl = Math.round(lerp(pa & 255, pb & 255, tt));
    return `rgb(${r},${g},${bl})`;
  };
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, mix(z0.bg[0], z1.bg[0]));
  grad.addColorStop(0.5, mix(z0.bg[1], z1.bg[1]));
  grad.addColorStop(1, mix(z0.bg[2], z1.bg[2]));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  const cam = state.G?.cameraY ?? 0;
  ctx.fillStyle = '#aab8ff';
  for (const st of STARS) {
    const yy = (((st.y * H + cam * st.d) % H) + H) % H;
    ctx.globalAlpha = st.a;
    ctx.fillRect(st.x * W, yy, st.s, st.s);
  }
  ctx.globalAlpha = 1;
}

function drawNode(n: Node): void {
  const { ctx, H } = view;
  const x = n.wx;
  const y = sY(n.wy);
  const sk = skin();
  if (y < -60 || y > H + 60) return;

  if (n.type === 'spike') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(state.G.t * 1.5);
    ctx.fillStyle = '#ff3b5c';
    ctx.shadowColor = '#ff3b5c';
    ctx.shadowBlur = glowFX(14);
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const rr2 = i % 2 ? n.r : n.r * 0.5;
      ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return;
  }

  const bonus = n.type === 'bonus';
  const col = bonus ? '#ffd24a' : n.type === 'small' ? sk.t : sk.c;
  const pr = n.r * (1 + Math.sin(state.G.t * 2 + (n.pulse ?? 0)) * 0.06);
  ctx.save();
  ctx.fillStyle = col;
  ctx.shadowColor = col;
  ctx.shadowBlur = glowFX(bonus ? 24 : 18);
  ctx.beginPath();
  ctx.arc(x, y, pr, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.beginPath();
  ctx.arc(x - pr * 0.3, y - pr * 0.3, pr * 0.28, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/* The player as a small electric creature: trail, tether, charge ring, body w/ squash, eyes. */
function drawPlayer(): void {
  const { ctx } = view;
  const G = state.G;
  const pl = G.player;
  const x = pl.wx;
  const y = sY(pl.wy);
  const sk = skin();

  // trail while flying
  if (!pl.latched && pl.trail.length > 1) {
    ctx.save();
    ctx.strokeStyle = sk.c;
    ctx.lineCap = 'round';
    for (let i = 1; i < pl.trail.length; i++) {
      const a = i / pl.trail.length;
      ctx.globalAlpha = a * 0.5;
      ctx.lineWidth = a * pl.r * 1.3;
      ctx.beginPath();
      ctx.moveTo(pl.trail[i - 1].x, sY(pl.trail[i - 1].y));
      ctx.lineTo(pl.trail[i].x, sY(pl.trail[i].y));
      ctx.stroke();
    }
    ctx.restore();
  }

  // tether + charge ring around the player (perfect band is reward-only — no danger band)
  const pHi = perfectHi();
  const inPerfect = pl.latched && pl.charge >= PERFECT_LO && pl.charge <= pHi;
  if (pl.latched) {
    const n = pl.node;
    const ch = pl.charge;
    const a0 = -Math.PI / 2;
    const RR = 15;

    ctx.save();
    ctx.strokeStyle = sk.c;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(n.wx, sY(n.wy));
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(x, y);
    // dim base ring
    ctx.strokeStyle = 'rgba(255,255,255,.13)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, RR, 0, TAU);
    ctx.stroke();
    // PERFECT band (pulses when you're inside it)
    ctx.strokeStyle = inPerfect ? 'rgba(255,255,255,.95)' : 'rgba(159,255,242,.55)';
    ctx.lineWidth = inPerfect ? 5 : 4;
    if (inPerfect) { ctx.shadowColor = '#fff'; ctx.shadowBlur = glowFX(12); }
    ctx.beginPath();
    ctx.arc(0, 0, RR, a0 + PERFECT_LO * TAU, a0 + pHi * TAU);
    ctx.stroke();
    ctx.shadowBlur = 0;
    // charge progress
    const col = inPerfect ? '#ffffff' : sk.t;
    ctx.strokeStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur = glowFX(inPerfect ? 16 : 6);
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, RR, a0, a0 + ch * TAU);
    ctx.stroke();
    // marker
    const ma = a0 + ch * TAU;
    ctx.fillStyle = col;
    ctx.shadowBlur = glowFX(8);
    ctx.beginPath();
    ctx.arc(Math.cos(ma) * RR, Math.sin(ma) * RR, inPerfect ? 4 : 3, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // shield bubble
  if (G.shield) {
    ctx.save();
    ctx.strokeStyle = '#9ffff2';
    ctx.globalAlpha = 0.6 + Math.sin(G.t * 6) * 0.2;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#9ffff2';
    ctx.shadowBlur = glowFX(12);
    ctx.beginPath();
    ctx.arc(x, y, pl.r + 8, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  // void-near startle
  const closeness = clamp(1 - (pl.wy - G.voidY) / 240, 0, 1);
  const scared = closeness > 0.4;

  if (!(G.invuln > 0 && Math.sin(G.t * 40) < 0)) {
    // perfect "zap" glint right after a perfect release
    if (pl.zap > 0) {
      ctx.save();
      ctx.translate(x, y);
      ctx.strokeStyle = '#fff';
      ctx.globalAlpha = clamp(pl.zap / 0.25, 0, 1);
      ctx.lineWidth = 2;
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = glowFX(12);
      const z = lerp(pl.r + 4, pl.r + 16, 1 - pl.zap / 0.25);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + G.t;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (pl.r + 2), Math.sin(a) * (pl.r + 2));
        ctx.lineTo(Math.cos(a) * z, Math.sin(a) * z);
        ctx.stroke();
      }
      ctx.restore();
    }
    const sp = pl.latched ? 0 : Math.hypot(pl.vx, pl.vy);
    const stretch = clamp(sp / 1400, 0, 0.5);
    const scale = inPerfect ? 1.08 : 1;
    const glow = inPerfect ? 28 : 18;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(pl.face);
    ctx.fillStyle = sk.c;
    ctx.shadowColor = sk.c;
    ctx.shadowBlur = glowFX(glow);
    ctx.beginPath();
    ctx.ellipse(0, 0, pl.r * scale * (1 + stretch), pl.r * scale * (1 - stretch * 0.6), 0, 0, TAU);
    ctx.fill();
    ctx.rotate(-pl.face);
    const ex = Math.cos(pl.face);
    const ey = Math.sin(pl.face);
    const eyeR = scared ? 3.3 : inPerfect ? 3.0 : 2.6;
    const pupil = scared ? 1.0 : 1.3;
    for (const o of [-1, 1]) {
      const px = ey * o * 3.2;
      const py = -ex * o * 3.2;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(px + ex * 2, py + ey * 2, eyeR, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#0a0720';
      ctx.beginPath();
      ctx.arc(px + ex * 3.2, py + ey * 3.2, pupil, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

/* Predicted arc — constant launch speed, so the preview always matches the real flight exactly. */
function drawTrajectory(): void {
  const { ctx, W } = view;
  const G = state.G;
  const pl = G.player;
  if (!settings.aimPreview || !pl.latched) return;
  const sk = skin();
  const tx = -Math.sin(pl.ang) * pl.dir;
  const ty = Math.cos(pl.ang) * pl.dir;
  let x = pl.wx;
  let y = pl.wy;
  let vx = tx * LAUNCH;
  let vy = ty * LAUNCH;
  const dt = 1 / 60;
  const pad = curCatchPad();
  // step count shrinks slightly with height (gentle skill ramp: 70 -> 48)
  const steps = Math.round(lerp(70, 48, clamp(G.height / 600, 0, 1)));
  ctx.save();
  ctx.fillStyle = sk.c;
  for (let i = 0; i < steps; i++) {
    vy -= G_FALL * dt;
    x += vx * dt;
    y += vy * dt;
    if (x < pl.r) { x = pl.r; vx = Math.abs(vx) * WALL_BOUNCE; }
    if (x > W - pl.r) { x = W - pl.r; vx = -Math.abs(vx) * WALL_BOUNCE; }
    let hitN = false;
    for (const n of G.nodes) {
      if (n.type === 'spike') continue;
      if (n === pl.node) continue;
      if (n === pl.lastReleased) continue;
      if (Math.hypot(x - n.wx, y - n.wy) < n.r + pl.r + pad) { hitN = true; break; }
    }
    if (i % 3 === 0) {
      ctx.globalAlpha = clamp(1 - i / steps, 0, 0.6);
      ctx.beginPath();
      ctx.arc(x, sY(y), 2.2, 0, TAU);
      ctx.fill();
    }
    if ((hitN && i > 3) || y < G.voidY) break;
  }
  ctx.restore();
}

function drawVoid(): void {
  const { ctx, W, H } = view;
  const vy = sY(state.G.voidY);
  if (vy < H + 40) {
    const grad = ctx.createLinearGradient(0, vy - 50, 0, H);
    grad.addColorStop(0, 'rgba(255,59,92,0)');
    grad.addColorStop(0.4, 'rgba(255,59,92,.25)');
    grad.addColorStop(1, 'rgba(120,10,40,.9)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, vy - 50, W, H - (vy - 50) + 50);
    ctx.strokeStyle = '#ff3b5c';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ff3b5c';
    ctx.shadowBlur = glowFX(18);
    ctx.beginPath();
    ctx.moveTo(0, vy);
    ctx.lineTo(W, vy);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

const TUT_LINES = [
  'TAP TO RELEASE',
  'RELEASE IN THE GLOW = PERFECT',
  'CLIMB BEFORE THE VOID CATCHES YOU',
];

function drawIconBtn(x: number, y: number, s: number, icon: 'sound' | 'mute' | 'aim', col: string): void {
  const { ctx } = view;
  ctx.save();
  rr(x, y, s, s, 10);
  ctx.fillStyle = 'rgba(20,16,48,.7)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.08)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  const cx = x + s / 2;
  const cy = y + s / 2;
  if (icon === 'sound') {
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy - 3); ctx.lineTo(cx - 3, cy - 3); ctx.lineTo(cx + 1, cy - 7);
    ctx.lineTo(cx + 1, cy + 7); ctx.lineTo(cx - 3, cy + 3); ctx.lineTo(cx - 7, cy + 3);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 3, cy, 4, -0.6, 0.6);
    ctx.stroke();
  } else if (icon === 'mute') {
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy - 3); ctx.lineTo(cx - 3, cy - 3); ctx.lineTo(cx + 1, cy - 7);
    ctx.lineTo(cx + 1, cy + 7); ctx.lineTo(cx - 3, cy + 3); ctx.lineTo(cx - 7, cy + 3);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 3, cy - 4); ctx.lineTo(cx + 9, cy + 4);
    ctx.moveTo(cx + 9, cy - 4); ctx.lineTo(cx + 3, cy + 4);
    ctx.stroke();
  } else if (icon === 'aim') {
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy - 9); ctx.lineTo(cx, cy - 3);
    ctx.moveTo(cx, cy + 3); ctx.lineTo(cx, cy + 9);
    ctx.moveTo(cx - 9, cy); ctx.lineTo(cx - 3, cy);
    ctx.moveTo(cx + 3, cy); ctx.lineTo(cx + 9, cy);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawTopToggles(): void {
  const { W, SAFE_TOP } = view;
  const s = 42;
  const pad = 12;
  const top = pad + SAFE_TOP;
  btn('mute', pad, top, s, s, () => setMuted(!settings.muted));
  drawIconBtn(pad, top, s, settings.muted ? 'mute' : 'sound', settings.muted ? '#5b6488' : '#2ff3e0');
  // aim toggle on the right (mirrors the mute button)
  btn('aim', W - pad - s, top, s, s, () => setAimPreview(!settings.aimPreview));
  drawIconBtn(W - pad - s, top, s, 'aim', settings.aimPreview ? '#2ff3e0' : '#5b6488');
}

export function renderPlay(): void {
  const { ctx, W, H, SAFE_TOP } = view;
  const G = state.G;
  drawBG();
  drawVoid();
  for (const n of G.nodes) drawNode(n);
  for (const s of G.sparks) {
    if (s.got) continue;
    const y = sY(s.wy);
    if (y < -20 || y > H + 20) continue;
    const shield = s.kind === 'shield';
    const col = shield ? '#9ffff2' : '#ffe39b';
    ctx.save();
    ctx.fillStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur = glowFX(12);
    ctx.translate(s.wx, y);
    ctx.rotate(G.t * 3);
    if (shield) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = col;
      ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 3, 0, TAU); ctx.fill();
    } else {
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU;
        ctx.lineTo(Math.cos(a) * 6, Math.sin(a) * 6);
        ctx.lineTo(Math.cos(a + 0.4) * 2.5, Math.sin(a + 0.4) * 2.5);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  drawTrajectory();
  drawPlayer();

  const closeness = clamp(1 - (G.player.wy - G.voidY) / 240, 0, 1);
  if (closeness > 0.05) {
    ctx.save();
    const a = closeness * 0.5 * (0.7 + Math.sin(G.t * 8) * 0.3);
    const grad = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.7);
    grad.addColorStop(0, 'rgba(255,59,92,0)');
    grad.addColorStop(1, `rgba(255,59,92,${a})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // HUD
  text(G.height + ' m', W / 2, 40 + SAFE_TOP, 30, '#fff', 800, 16, 'center', "'Unbounded'");
  if (G.mult > 1) text('x' + G.mult, W / 2, 72 + SAFE_TOP, 16, '#ffb020', 700, 10);
  text('◎ ' + (Profile.coins + G.coins), W - 16, 28 + SAFE_TOP, 14, '#ffe39b', 700, 6, 'right');
  if (G.combo > 2) text(G.combo + ' chain', 16, 28 + SAFE_TOP, 13, skin().t, 600, 4, 'left');

  if (G.tut >= 0) {
    ctx.globalAlpha = clamp(1 - (G.tutT - 3) / 1.5, 0, 1);
    text(TUT_LINES[G.tut], W / 2, H * 0.7, 18, '#fff', 700, 10);
    ctx.globalAlpha = 1;
  }
  if (G.toast) {
    const a = clamp(G.toast.t, 0, 1);
    ctx.globalAlpha = a;
    text(G.toast.txt, W / 2, H * 0.42, 30, G.toast.c, 800, 18, 'center', "'Unbounded'");
    ctx.globalAlpha = 1;
  }
}

export function dimVoid(a: number): void {
  const { ctx, W, H } = view;
  ctx.fillStyle = `rgba(6,4,16,${a})`;
  ctx.fillRect(0, 0, W, H);
}
