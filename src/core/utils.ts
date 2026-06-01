import type { FxLevel } from '../types';
import { view } from './canvas';

export const TAU = Math.PI * 2;

export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const rand = (a: number, b: number): number => a + Math.random() * (b - a);

/** "#rrggbb" (or "#rgb") + alpha → "rgba(...)". Used for glow/void/world tints. */
export function hexA(hex: string, a: number): string {
  let h = (hex || '#fff').replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Blend two "#rrggbb" colours; t=0 → a, t=1 → b. Returns an "rgb(...)" string. */
export function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.replace('#', ''), 16);
  const pb = parseInt(b.replace('#', ''), 16);
  const r = Math.round(((pa >> 16) & 255) + (((pb >> 16) & 255) - ((pa >> 16) & 255)) * t);
  const g = Math.round(((pa >> 8) & 255) + (((pb >> 8) & 255) - ((pa >> 8) & 255)) * t);
  const bl = Math.round((pa & 255) + ((pb & 255) - (pa & 255)) * t);
  return `rgb(${r},${g},${bl})`;
}

export function angDiff(a: number, b: number): number {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return Math.abs(d);
}

const screenW = window.screen ? window.screen.width : 999;
const screenH = window.screen ? window.screen.height : 999;
export const fx = {
  level: ((window.devicePixelRatio || 1) < 1.5 && Math.min(screenW, screenH) <= 380
    ? 'medium'
    : 'high') as FxLevel,
  // Global motion scale (1 = full, 0 = none). Driven by the Reduced Motion
  // setting / prefers-reduced-motion. Honoured by shake(), Flash, and combo
  // vignettes so sensitive players keep the game readable and comfortable.
  motion: 1,
};

export function glowFX(v: number): number {
  return fx.level === 'low' ? Math.min(v, 3) : fx.level === 'medium' ? v * 0.55 : v;
}

export function pcount(n: number): number {
  return fx.level === 'low' ? Math.ceil(n * 0.4) : fx.level === 'medium' ? Math.ceil(n * 0.7) : n;
}

export function distPointToSegment(
  px: number, py: number, ax: number, ay: number, bx: number, by: number,
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const ab2 = abx * abx + aby * aby;
  const t = ab2 > 0 ? clamp((apx * abx + apy * aby) / ab2, 0, 1) : 0;
  const cx = ax + abx * t;
  const cy = ay + aby * t;
  return Math.hypot(px - cx, py - cy);
}

export function rr(x: number, y: number, w: number, h: number, r: number): void {
  const { ctx } = view;
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function text(
  t: string,
  x: number,
  y: number,
  size: number,
  color: string,
  weight: number = 700,
  glow: number = 0,
  align: CanvasTextAlign = 'center',
  font = "'Sora'",
): void {
  const { ctx } = view;
  ctx.save();
  ctx.font = `${weight} ${size}px ${font}, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (glow) {
    ctx.shadowColor = color;
    ctx.shadowBlur = glowFX(glow);
  }
  ctx.fillStyle = color;
  ctx.fillText(t, x, y);
  // The second pass exists only to deepen the bloom on big headline text. It
  // doubles fill cost on every glowed string, so reserve it for large labels
  // (titles/callouts) where the extra punch reads — small HUD/body text gets a
  // single pass, which is plenty and noticeably cheaper on text-heavy screens.
  if (glow && size >= 24) ctx.fillText(t, x, y);
  ctx.restore();
}
