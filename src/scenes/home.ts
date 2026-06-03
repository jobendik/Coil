import { view } from '../core/canvas';
import { state } from '../game/state';
import { skin, Owned } from '../game/skins';
import { Profile } from '../game/profile';
import { Daily } from '../game/daily';
import { DailyRun } from '../game/dailyrun';
import { Vault } from '../game/vault';
import { Season } from '../game/season';
import { openSeason } from './season';
import { Event } from '../game/events';
import { SFX } from '../core/audio';
import { glowFX, TAU, clamp, rr, text, hexA, mixHex } from '../core/utils';
import { btn, resetButtons } from '../core/ui';
import { Telemetry } from '../core/telemetry';
import { drawBG, drawTopToggles, drawAccessoryAt } from './play';
import { Wheel, Chest } from '../game/rewards';
import { overlayKind, openOverlay, drawOverlay, maybeAutoOpenLogin } from './overlays';
import { MILESTONES, SEASON_TIERS, SKINS } from '../config';
import { drawMenuBg } from './menubg';
import type { Goal } from '../types';

/* =========================================================================
   HOME — premium facelift.

   Design intent: make the menu read as a polished arcade title, not a webpage.
   The four levers that do the heavy lifting:
     1. DEPTH — a planet-horizon glow + aurora layered over the shared bg so the
        screen has atmosphere, not a flat fill.
     2. FRAMED PANELS — the stats + daily-missions blocks sit on glossy, hairline-
        bordered cards with a top sheen, instead of floating text.
     3. GLOSS — the logo gets a chrome/gradient treatment; the PLAY button gets a
        gel body, a moving shimmer, and side chevrons.
     4. ICONOGRAPHY — every mission row + the DAILY/ZEN/SHOP tiles carry a small
        vector glyph, which is what makes a UI feel "designed".

   It is 100% procedural (no raster assets) so first paint stays instant and the
   look recolours with the equipped skin/world. Everything routes blur through
   glowFX() and skips the optional flourishes on the 'low' FX tier, so the
   adaptive perf scaler keeps it 60fps on weak devices. Public API + every btn()
   key is unchanged, so it's a straight drop-in for src/scenes/home.ts.
   ========================================================================= */

let onPlayRequested: () => void = () => { /* injected by main.ts */ };
export function setPlayHandler(fn: () => void): void { onPlayRequested = fn; }

let onDailyRequested: () => void = () => { /* injected by main.ts */ };
export function setDailyHandler(fn: () => void): void { onDailyRequested = fn; }

let onZenRequested: () => void = () => { /* injected by main.ts */ };
export function setZenHandler(fn: () => void): void { onZenRequested = fn; }

let homeT = 0;
let loginOffered = false;

/* ---------- small helpers ---------- */
function nextGoalLine(): string {
  if (!Daily.allDone()) return "Complete today's missions";
  const nm = MILESTONES.find((m) => m > Profile.best);
  if (nm && Profile.best >= nm * 0.6) return 'Reach ' + nm + ' m';
  if (Profile.best > 0) return 'Beat your best: ' + Profile.best + ' m';
  const ns = SKINS.find((s) => !Owned.includes(s.id) && !s.req);
  if (ns) return 'Unlock ' + ns.name;
  return 'Climb as high as you can';
}

function msToMidnight(): number {
  const d = new Date();
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
  return next.getTime() - d.getTime();
}
function fmtHMS(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const x = s % 60;
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${p(h)}:${p(m)}:${p(x)}`;
}

/* A glossy, hairline-bordered card with a top sheen — the panel grammar that
   makes blocks read as "real game UI" instead of floating text. */
function card(x: number, y: number, w: number, h: number, glow?: string): void {
  const { ctx } = view;
  const r = 16;
  if (glow && glowFX(10) > 3) {
    ctx.save();
    ctx.shadowColor = glow;
    ctx.shadowBlur = glowFX(20);
    rr(x, y, w, h, r);
    ctx.fillStyle = hexA(glow, 0.05);
    ctx.fill();
    ctx.restore();
  }
  rr(x, y, w, h, r);
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, 'rgba(38,30,74,0.66)');
  g.addColorStop(1, 'rgba(13,9,28,0.74)');
  ctx.fillStyle = g;
  ctx.fill();
  // top sheen (clipped to the card)
  ctx.save();
  rr(x, y, w, h, r);
  ctx.clip();
  const sh = ctx.createLinearGradient(x, y, x, y + h * 0.55);
  sh.addColorStop(0, 'rgba(255,255,255,0.07)');
  sh.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sh;
  ctx.fillRect(x, y, w, h * 0.55);
  ctx.restore();
  // border + crisp top hairline
  rr(x, y, w, h, r);
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  ctx.moveTo(x + 12, y + 1);
  ctx.lineTo(x + w - 12, y + 1);
  ctx.stroke();
}

/* A gel/plastic button: top-lit body gradient, sheen, a slow shimmer sweep and a
   bright inner rim. The "juicy arcade" CTA the store page asks for. */
function glossButton(
  x: number, y: number, w: number, h: number, color: string,
  opts?: { r?: number; pulse?: number; shimmer?: number },
): void {
  const { ctx } = view;
  const r = opts?.r ?? 16;
  const pulse = opts?.pulse ?? 1;
  // outer bloom
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = glowFX(24 * pulse);
  rr(x, y, w, h, r);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
  // body (top light → bottom dark)
  rr(x, y, w, h, r);
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, mixHex(color, '#ffffff', 0.4));
  g.addColorStop(0.5, color);
  g.addColorStop(1, mixHex(color, '#05030e', 0.28));
  ctx.fillStyle = g;
  ctx.fill();
  // sheen + shimmer (clipped)
  ctx.save();
  rr(x, y, w, h, r);
  ctx.clip();
  const sh = ctx.createLinearGradient(x, y, x, y + h * 0.5);
  sh.addColorStop(0, 'rgba(255,255,255,0.5)');
  sh.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sh;
  ctx.fillRect(x, y, w, h * 0.5);
  if (opts?.shimmer !== undefined && glowFX(10) > 3) {
    const sp = ((opts.shimmer % 1) + 1) % 1;
    const sx = x - w * 0.4 + sp * (w * 1.8);
    const sg = ctx.createLinearGradient(sx - 34, 0, sx + 34, 0);
    sg.addColorStop(0, 'rgba(255,255,255,0)');
    sg.addColorStop(0.5, 'rgba(255,255,255,0.32)');
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
  // bright inner rim
  rr(x + 1.5, y + 1.5, w - 3, h - 3, r - 1);
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

/* Chrome "COIL" wordmark: bloom + faint chromatic split for depth + a vertical
   metal gradient body + a top edge highlight. Reads premium with zero assets. */
function drawGlossLogo(cx: number, cy: number): void {
  const { ctx } = view;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = "800 64px 'Unbounded', sans-serif";
  // outer bloom
  ctx.save();
  ctx.shadowColor = '#9ad7ff';
  ctx.shadowBlur = glowFX(34);
  ctx.fillStyle = 'rgba(180,220,255,0.5)';
  ctx.fillText('COIL', cx, cy);
  ctx.restore();
  // subtle chromatic depth
  ctx.globalAlpha = 0.32;
  ctx.fillStyle = '#2ff3e0';
  ctx.fillText('COIL', cx - 1.5, cy + 1.5);
  ctx.fillStyle = '#a76bff';
  ctx.fillText('COIL', cx + 1.5, cy - 1.5);
  ctx.globalAlpha = 1;
  // chrome body
  const g = ctx.createLinearGradient(cx, cy - 30, cx, cy + 30);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.45, '#dfeefc');
  g.addColorStop(0.5, '#a8c4e4');
  g.addColorStop(0.55, '#cfe2f5');
  g.addColorStop(1, '#7f93b8');
  ctx.fillStyle = g;
  ctx.fillText('COIL', cx, cy);
  // top edge highlight
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - 190, cy - 36, 380, 20);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText('COIL', cx, cy);
  ctx.restore();
  ctx.restore();
}

/* The hero: the actual game mechanic, dressed up — a glowing gate arc with its
   bright "perfect" segment, a core orb, and the orbiting creature trailing a
   comet. Teaches the loop in half a second AND looks alive. */
function drawHeroOrbit(cx: number, cy: number, R: number): void {
  const { ctx } = view;
  const sk = skin();
  const ang = homeT * 1.6;

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,.08)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.stroke();
  ctx.restore();

  // bright "perfect gate" arc — the game's signature, on the menu
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = sk.t;
  ctx.globalAlpha = 0.32;
  ctx.lineWidth = 12;
  ctx.shadowColor = sk.t;
  ctx.shadowBlur = glowFX(14);
  ctx.beginPath();
  ctx.arc(cx, cy, R, -0.6, 0.6);
  ctx.stroke();
  ctx.globalAlpha = 0.92;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, R, -0.4, 0.4);
  ctx.stroke();
  ctx.restore();

  // central core
  ctx.save();
  ctx.fillStyle = sk.c;
  ctx.shadowColor = sk.c;
  ctx.shadowBlur = glowFX(22);
  ctx.beginPath();
  ctx.arc(cx, cy, 15, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  ctx.beginPath();
  ctx.arc(cx - 5, cy - 5, 4, 0, TAU);
  ctx.fill();
  ctx.restore();

  const px = cx + Math.cos(ang) * R;
  const py = cy + Math.sin(ang) * R;

  // tether
  ctx.save();
  ctx.strokeStyle = sk.c;
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(px, py);
  ctx.stroke();
  ctx.restore();

  // comet trail behind the creature
  if (glowFX(10) > 3) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 1; k <= 9; k++) {
      const a2 = ang - k * 0.1;
      const tx = cx + Math.cos(a2) * R;
      const ty = cy + Math.sin(a2) * R;
      const f = 1 - k / 10;
      ctx.globalAlpha = f * 0.5;
      ctx.fillStyle = sk.t;
      ctx.beginPath();
      ctx.arc(tx, ty, f * 4 + 0.5, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  // orbiting creature with idle blink
  const face = ang + Math.PI / 2;
  ctx.save();
  ctx.translate(px, py);
  ctx.fillStyle = sk.c;
  ctx.shadowColor = sk.c;
  ctx.shadowBlur = glowFX(16);
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.beginPath();
  ctx.arc(-2.6, -3, 2.4, 0, TAU);
  ctx.fill();
  const ex = Math.cos(face);
  const ey = Math.sin(face);
  const ht = homeT * 0.9;
  const blink = ((ht % 3.3) < 0.1 || (ht % 5.1) < 0.09) ? 1 : 0;
  for (const o of [-1, 1]) {
    const ox = ey * o * 3;
    const oy = -ex * o * 3;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(ox + ex * 2, oy + ey * 2, 2.4, 2.4 * (blink ? 0.15 : 1), 0, 0, TAU);
    ctx.fill();
    if (!blink) {
      ctx.fillStyle = '#0a0720';
      ctx.beginPath();
      ctx.arc(ox + ex * 3, oy + ey * 3, 1.2, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
  drawAccessoryAt(px, py, 8, homeT);
}

/* ---------- small vector glyphs ---------- */
function iconClock(cx: number, cy: number, r: number, col: string): void {
  const { ctx } = view;
  ctx.save();
  ctx.strokeStyle = col;
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx, cy - r * 0.55);
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + r * 0.45, cy);
  ctx.stroke();
  ctx.restore();
}
function iconCalendar(cx: number, cy: number, col: string): void {
  const { ctx } = view;
  ctx.save();
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  rr(cx - 8, cy - 6, 16, 14, 3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy - 1);
  ctx.lineTo(cx + 8, cy - 1);
  ctx.moveTo(cx - 4, cy - 9);
  ctx.lineTo(cx - 4, cy - 5);
  ctx.moveTo(cx + 4, cy - 9);
  ctx.lineTo(cx + 4, cy - 5);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy + 3, 1.6, 0, TAU);
  ctx.fill();
  ctx.restore();
}
function iconLotus(cx: number, cy: number, col: string): void {
  const { ctx } = view;
  ctx.save();
  ctx.strokeStyle = col;
  ctx.lineWidth = 1.6;
  for (const a of [-0.7, 0, 0.7]) {
    ctx.save();
    ctx.translate(cx, cy + 5);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.ellipse(0, -7, 3, 8, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
function iconCart(cx: number, cy: number, col: string): void {
  const { ctx } = view;
  ctx.save();
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 9, cy - 7);
  ctx.lineTo(cx - 6, cy - 7);
  ctx.lineTo(cx - 4, cy + 2);
  ctx.lineTo(cx + 7, cy + 2);
  ctx.lineTo(cx + 9, cy - 4);
  ctx.lineTo(cx - 3, cy - 4);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx - 3, cy + 6, 1.6, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 6, cy + 6, 1.6, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/* circular-arrow "reroll" glyph */
function iconReroll(cx: number, cy: number, col: string): void {
  const { ctx } = view;
  ctx.save();
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, 6, -0.5, TAU - 1.1);
  ctx.stroke();
  // arrowhead at the open end
  const a = TAU - 1.1;
  const ax = cx + Math.cos(a) * 6;
  const ay = cy + Math.sin(a) * 6;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(ax - 3.5, ay - 1);
  ctx.lineTo(ax + 0.5, ay + 3.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

type MissionFam = 'runs' | 'coins' | 'height' | 'perf' | 'combo';
function missionFamily(id: string): MissionFam {
  if (id.startsWith('height')) return 'height';
  if (id.startsWith('combo')) return 'combo';
  if (id.startsWith('perf')) return 'perf';
  if (id.startsWith('coins')) return 'coins';
  return 'runs';
}
function drawMissionIcon(cx: number, cy: number, fam: MissionFam, col: string, g: Goal): void {
  const { ctx } = view;
  ctx.save();
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (fam === 'height') {
    for (const dy of [3, -1]) {
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy + dy + 1);
      ctx.lineTo(cx, cy + dy - 3);
      ctx.lineTo(cx + 4, cy + dy + 1);
      ctx.stroke();
    }
  } else if (fam === 'coins') {
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(cx - 1.5, cy - 1.5, 2, 0, TAU);
    ctx.fill();
  } else if (fam === 'perf') {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const rr2 = i % 2 ? 2 : 5;
      ctx.lineTo(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2);
    }
    ctx.closePath();
    ctx.fill();
  } else if (fam === 'combo') {
    ctx.font = "800 11px 'Unbounded', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('x' + g.t, cx, cy + 0.5);
  } else {
    ctx.beginPath();
    ctx.moveTo(cx - 3, cy - 4);
    ctx.lineTo(cx - 3, cy + 4);
    ctx.lineTo(cx + 4, cy);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function secondaryTile(
  x: number, y: number, w: number, h: number, accent: string,
  label: string, sub: string, glow: boolean, icon: (cx: number, cy: number, col: string) => void,
): void {
  const { ctx } = view;
  rr(x, y, w, h, 12);
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, 'rgba(30,24,62,0.8)');
  g.addColorStop(1, 'rgba(14,10,30,0.85)');
  ctx.fillStyle = g;
  ctx.fill();
  rr(x, y, w, h, 12);
  ctx.lineWidth = 1.4;
  if (glow) {
    ctx.strokeStyle = accent;
    ctx.shadowColor = accent;
    ctx.shadowBlur = glowFX(8 + Math.sin(homeT * 4) * 4);
  } else {
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
  icon(x + w / 2, y + 15, glow ? accent : '#cdd8ff');
  text(label, x + w / 2, y + 30, 11.5, glow ? accent : '#eaf2ff', 800, glow ? 4 : 0);
  if (sub) text(sub, x + w / 2, y + 41, 8.5, '#9fb0e0', 600, 0);
}

function chipPill(cx: number, cy: number, label: string, col: string): void {
  const { ctx } = view;
  ctx.save();
  ctx.font = "800 10px 'Sora', sans-serif";
  const tw = ctx.measureText(label).width;
  const w = tw + 22;
  const h = 20;
  const x = cx - w / 2;
  const y = cy - h / 2;
  rr(x, y, w, h, h / 2);
  ctx.fillStyle = hexA(col, 0.14);
  ctx.fill();
  rr(x, y, w, h, h / 2);
  ctx.strokeStyle = hexA(col, 0.45);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
  text(label, cx, cy, 10, col, 800, 3);
}

/* Top-right reward shortcuts (spin wheel + bonus chest) with "available" badges. */
function drawRewardIcons(): void {
  const { ctx, W, SAFE_TOP } = view;
  const s = 42;
  const pad = 12;
  const top = pad + SAFE_TOP;
  const wx = W - pad - s;
  const cxx = W - pad - 2 * s - 8;
  const vxx = W - pad - 3 * s - 16;

  const pill = (x: number): void => {
    rr(x, top, s, s, 10);
    ctx.fillStyle = 'rgba(20,16,48,.7)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.08)';
    ctx.lineWidth = 1;
    ctx.stroke();
  };
  const badge = (x: number): void => {
    ctx.save();
    ctx.fillStyle = '#ff4d8d';
    ctx.shadowColor = '#ff4d8d';
    ctx.shadowBlur = glowFX(8 + Math.sin(homeT * 6) * 4);
    ctx.beginPath();
    ctx.arc(x + s - 6, top + 6, 5, 0, TAU);
    ctx.fill();
    ctx.restore();
  };

  pill(wx);
  ctx.save();
  ctx.strokeStyle = '#cdb4ff';
  ctx.lineWidth = 2;
  ctx.translate(wx + s / 2, top + s / 2);
  ctx.rotate(homeT * 0.6);
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, TAU);
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 2, Math.sin(a) * 2);
    ctx.lineTo(Math.cos(a) * 9, Math.sin(a) * 9);
    ctx.stroke();
  }
  ctx.restore();
  if (Wheel.available()) badge(wx);
  btn('homewheel', wx, top, s, s, () => openOverlay('wheel'));

  pill(cxx);
  ctx.save();
  ctx.strokeStyle = '#ffd24a';
  ctx.fillStyle = '#ffd24a';
  ctx.lineWidth = 2;
  const bx = cxx + s / 2;
  const by = top + s / 2;
  rr(bx - 9, by - 2, 18, 10, 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bx - 9, by - 2);
  ctx.lineTo(bx - 9, by - 6);
  ctx.lineTo(bx + 9, by - 6);
  ctx.lineTo(bx + 9, by - 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(bx, by + 3, 1.6, 0, TAU);
  ctx.fill();
  ctx.restore();
  if (Chest.available()) badge(cxx);
  btn('homechest', cxx, top, s, s, () => openOverlay('chest'));

  // Weekly Orders shortcut — a small checklist glyph opening the weekly overlay.
  pill(vxx);
  ctx.save();
  const vx = vxx + s / 2;
  const vy = top + s / 2;
  ctx.strokeStyle = '#9be35a';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const ly = vy - 7 + i * 7;
    ctx.beginPath();
    ctx.moveTo(vx - 8, ly);
    ctx.lineTo(vx - 4, ly);
    ctx.moveTo(vx - 1, ly);
    ctx.lineTo(vx + 8, ly);
    ctx.stroke();
  }
  ctx.restore();
  btn('homeweekly', vxx, top, s, s, () => openOverlay('weekly'));
}

export function renderHome(dt: number): void {
  const { ctx, W, H } = view;
  homeT += dt;
  drawBG();
  drawMenuBg();

  const cx = W / 2;
  const cy = H * 0.32;
  const sk = skin();

  // ---- logo + tagline + hero orbit ----
  drawGlossLogo(cx, cy - 118);
  text('Tap in the glowing gate · climb the void', cx, cy - 74, 13, '#9fb0e0', 600, 0);
  // weekly event chip (M8) — the "scheduled to return for" hook
  const ev = Event.current();
  if (ev.id !== 'none' && Profile.runsPlayed >= 1) {
    chipPill(cx, cy - 54, '⚡ ' + ev.name + ' · ' + ev.desc, '#ffd24a');
  }
  drawHeroOrbit(cx, cy, 64);

  // ---- FIRST SESSION: only the core loop + one pulsing PLAY (onboarding) ----
  if (Profile.runsPlayed < 1) {
    const pw = W * 0.64;
    const ph = 66;
    const pxx = W / 2 - pw / 2;
    const pyy = H * 0.62 - view.SAFE_BOTTOM;
    const pulse = 1 + Math.sin(homeT * 3) * 0.03;
    ctx.save();
    ctx.translate(W / 2, pyy + ph / 2);
    ctx.scale(pulse, pulse);
    ctx.translate(-W / 2, -(pyy + ph / 2));
    glossButton(pxx, pyy, pw, ph, sk.c, { r: 18, shimmer: homeT * 0.3 });
    ctx.restore();
    text('PLAY', W / 2, pyy + ph / 2, 26, '#04030a', 800, 0, 'center', "'Unbounded'");
    btn('play', pxx, pyy, pw, ph, () => onPlayRequested());
    drawTopToggles();
    return;
  }

  // ---- bottom cluster is anchored from the bottom (respects SAFE_BOTTOM) ----
  const secH = 46;
  const secY = H - secH - 10 - view.SAFE_BOTTOM;
  const playH = 60;
  const playY = secY - 12 - playH;
  const nextY = playY - 18;

  // ---- STATS CARD: Star Vault | Best/Level, with a streak chip ----
  const cardX = W * 0.07;
  const cardW = W * 0.86;
  const statY = H * 0.4;
  const statH = H * 0.135;
  card(cardX, statY, cardW, statH, '#1a1440');
  const lx = cardX + cardW * 0.27;
  const pp = 0.6 + Math.sin(homeT * 3) * 0.4;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd24a';
  ctx.font = "800 9px 'Unbounded', sans-serif";
  ctx.shadowColor = '#ffd24a';
  ctx.shadowBlur = glowFX(8 + pp * 5);
  ctx.fillText('✦ STAR VAULT ✦', lx, statY + 22);
  ctx.font = "800 22px 'Unbounded', sans-serif";
  ctx.fillStyle = '#fff3b0';
  ctx.shadowBlur = glowFX(14 + pp * 6);
  ctx.fillText('★ ' + Math.round(Vault.v).toLocaleString(), lx, statY + 46);
  ctx.restore();
  // divider
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + cardW * 0.5, statY + 16);
  ctx.lineTo(cardX + cardW * 0.5, statY + statH - 30);
  ctx.stroke();
  ctx.restore();
  const rx2 = cardX + cardW * 0.73;
  const lp = Profile.levelProgress();
  text('BEST', rx2, statY + 18, 10, '#9fb0e0', 700, 0);
  text(Profile.best + ' m', rx2, statY + 40, 24, sk.t, 800, 8);
  text(Profile.title() + ' · Lv ' + lp.l, rx2, statY + 60, 10, '#cdd8ff', 600, 0);
  // streak / first-run / constellation chip
  const chipY = statY + statH - 15;
  const showStreak = Profile.streak >= 2;
  const showBonus = !Profile.hasPlayedToday();
  if (showStreak && showBonus) {
    chipPill(cx - 58, chipY, '🔥 ' + Profile.streak + '-DAY', '#ff9b50');
    chipPill(cx + 58, chipY, '2× FIRST RUN', '#ffe39b');
  } else if (showStreak) {
    chipPill(cx, chipY, '🔥 ' + Profile.streak + '-DAY STREAK', '#ff9b50');
  } else if (showBonus) {
    chipPill(cx, chipY, '2× COINS · FIRST RUN', '#ffe39b');
  } else if (Profile.constellations > 0) {
    chipPill(cx, chipY, '✦ ' + Profile.constellations + ' CONSTELLATIONS', '#cdb4ff');
  }

  // ---- SEASON banner (tappable → the full 30-tier track) ----
  const mX = W * 0.07;
  const mW = W * 0.86;
  const seasonY = statY + statH + 10;
  const seasonH = 30;
  rr(mX, seasonY, mW, seasonH, 10);
  ctx.fillStyle = 'rgba(30,22,60,0.7)';
  ctx.fill();
  rr(mX, seasonY, mW, seasonH, 10);
  ctx.strokeStyle = hexA('#a76bff', 0.4);
  ctx.lineWidth = 1.2;
  ctx.stroke();
  text('SEASON · TIER ' + Season.d.tier, mX + 12, seasonY + seasonH / 2, 11, '#cdb4ff', 800, 0, 'left', "'Unbounded'");
  // mini progress bar
  const sbW = mW * 0.34;
  const sbX = mX + mW - sbW - 40;
  rr(sbX, seasonY + seasonH / 2 - 3, sbW, 6, 3);
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  ctx.fill();
  rr(sbX, seasonY + seasonH / 2 - 3, sbW * (Season.d.tier >= SEASON_TIERS ? 1 : Season.tierProgress()), 6, 3);
  ctx.fillStyle = '#a76bff';
  ctx.fill();
  text('▸', mX + mW - 16, seasonY + seasonH / 2, 14, '#cdb4ff', 800, 0, 'center');
  btn('homeseason', mX, seasonY, mW, seasonH, () => { openSeason('home'); state.scene = 'season'; });

  // ---- DAILY MISSIONS PANEL (between the season banner and the NEXT line) ----
  const mTop = seasonY + seasonH + 10;
  const mBottom = nextY - 14;
  const mH = Math.max(90, mBottom - mTop);
  card(mX, mTop, mW, mH);
  const bx = W * 0.1;
  const bw = W * 0.8;
  text('DAILY MISSIONS', bx, mTop + 18, 10.5, '#cdd8ff', 800, 0, 'left', "'Unbounded'");
  iconClock(bx + bw - 56, mTop + 18, 5, '#8fa0c8');
  text(fmtHMS(msToMidnight()), bx + bw, mTop + 18, 10, '#9fb0e0', 700, 0, 'right');
  const missions = Daily.missions();
  const innerTop = mTop + 30;
  const rowH = (mH - 36) / missions.length;
  for (let i = 0; i < missions.length; i++) {
    const m = missions[i];
    const g = Daily.goalFor(m);
    const y = innerTop + i * rowH + rowH / 2;
    const pct = clamp(m.prog / g.t, 0, 1);
    const tierCol = m.done ? '#9be35a' : (g.tier === 'hard' ? '#ff4d8d' : g.tier === 'med' ? '#2ff3e0' : '#9be35a');
    // icon chip
    rr(bx, y - 11, 22, 22, 6);
    ctx.fillStyle = hexA(tierCol, m.done ? 0.22 : 0.12);
    ctx.fill();
    rr(bx, y - 11, 22, 22, 6);
    ctx.strokeStyle = hexA(tierCol, 0.4);
    ctx.lineWidth = 1;
    ctx.stroke();
    drawMissionIcon(bx + 11, y, missionFamily(g.id), tierCol, g);
    // The one daily reroll (M4) shows a ⟳ on each incomplete row; tapping any one
    // swaps that mission for another in the same tier and spends the day's reroll.
    const rerollable = !m.done && Daily.canReroll();
    const barRight = bx + bw - (rerollable ? 26 : 0);
    const valX = rerollable ? bx + bw - 30 : bx + bw;
    // label + value
    text((m.done ? '✓ ' : '') + g.text(g.t), bx + 30, y - 3, 11, m.done ? '#9be35a' : '#dfe7ff', 600, 0, 'left');
    text(m.done ? '+' + g.reward + ' ◎' : Math.min(m.prog, g.t) + '/' + g.t,
      valX, y - 3, 10.5, m.done ? '#9be35a' : '#ffe39b', 800, 0, 'right');
    if (rerollable) {
      iconReroll(bx + bw - 9, y - 3, '#9fb0e0');
      btn('dreroll' + i, bx + bw - 22, y - 14, 26, 26, () => {
        if (Daily.reroll(i)) SFX.click();
      });
    }
    // bar
    rr(bx + 30, y + 8, barRight - (bx + 30), 5, 3);
    ctx.fillStyle = 'rgba(255,255,255,.07)';
    ctx.fill();
    rr(bx + 30, y + 8, (barRight - (bx + 30)) * pct, 5, 3);
    ctx.fillStyle = tierCol;
    if (!m.done) { ctx.shadowColor = tierCol; ctx.shadowBlur = glowFX(6); }
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // ---- NEXT line ----
  text('NEXT  ·  ' + nextGoalLine(), cx, nextY, 12, '#ffe39b', 700, 6);

  // ---- PLAY (the money shot) ----
  const pw = W * 0.66;
  const pxx = W / 2 - pw / 2;
  const pulse = 1 + Math.sin(homeT * 3) * 0.02;
  ctx.save();
  ctx.translate(W / 2, playY + playH / 2);
  ctx.scale(pulse, pulse);
  ctx.translate(-W / 2, -(playY + playH / 2));
  glossButton(pxx, playY, pw, playH, sk.c, { r: 16, shimmer: homeT * 0.3 });
  ctx.restore();
  // side chevrons (Coil moves up → "go")
  ctx.save();
  ctx.strokeStyle = hexA(sk.c, 0.55);
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const s of [-1, 1]) {
    const axc = W / 2 + s * (pw / 2 + 18);
    ctx.beginPath();
    ctx.moveTo(axc - s * 4, playY + playH / 2 - 7);
    ctx.lineTo(axc + s * 4, playY + playH / 2);
    ctx.lineTo(axc - s * 4, playY + playH / 2 + 7);
    ctx.stroke();
  }
  ctx.restore();
  text('PLAY', W / 2, playY + playH / 2, 23, '#04030a', 800, 0, 'center', "'Unbounded'");
  btn('play', pxx, playY, pw, playH, () => onPlayRequested());

  // ---- secondary row: DAILY ✦ · ZEN · SHOP ----
  const sw = W * 0.84;
  const sxx = W / 2 - sw / 2;
  const sgap = 8;
  const third = (sw - sgap * 2) / 3;
  const dm = DailyRun.topMedal();
  const fresh = !DailyRun.played();
  secondaryTile(sxx, secY, third, secH, fresh ? '#ffd24a' : (dm ? dm.c : '#9fb0e0'),
    'DAILY', DailyRun.played() ? 'Best ' + DailyRun.d.best + ' m' : 'New today!', fresh, iconCalendar);
  btn('daily', sxx, secY, third, secH, () => onDailyRequested());

  const zx = sxx + third + sgap;
  secondaryTile(zx, secY, third, secH, '#9be35a', 'ZEN', 'No fail · relax', false, iconLotus);
  btn('zen', zx, secY, third, secH, () => onZenRequested());

  const sx3 = sxx + (third + sgap) * 2;
  secondaryTile(sx3, secY, third, secH, sk.t, 'SHOP', '◎ ' + Profile.coins, false, iconCart);
  btn('shop', sx3, secY, third, secH, () => {
    Telemetry.shopOpen();
    state.scene = 'shop';
  });

  drawRewardIcons();
  drawTopToggles();

  if (!loginOffered) {
    loginOffered = true;
    maybeAutoOpenLogin();
  }
  if (overlayKind() !== 'none') {
    resetButtons();
    drawOverlay(dt);
  }
}