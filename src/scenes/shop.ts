import { view } from '../core/canvas';
import { state } from '../game/state';
import { Profile } from '../game/profile';
import { Owned, equipSkin, ownSkin, skin, skinState } from '../game/skins';
import {
  OwnedTrails, OwnedWorlds, collectionState,
  equipTrail, equipWorld, ownTrail, ownWorld,
} from '../game/collection';
import {
  OwnedAccessories, accessoryState, equipAccessory, ownAccessory,
} from '../game/accessories';
import { Store } from '../core/store';
import { Confetti, Rays, Shock, Sparkles } from '../core/fx';
import { TAU, clamp, glowFX, hexA, rr, text } from '../core/utils';
import { btn } from '../core/ui';
import { SFX } from '../core/audio';
import { Telemetry } from '../core/telemetry';
import { reqFraction, reqLabel, reqProgress } from '../game/unlocks';
import { drawBG, dimVoid } from './play';
import { SKINS, TRAILS, WORLDS, ACCESSORIES } from '../config';
import type { Accessory, Skin, Trail, World } from '../types';

type Tab = 'chars' | 'trails' | 'worlds' | 'gear';
type Item = Skin | Trail | World | Accessory;
let shopTab: Tab = Store.get<Tab>('coil_shop_tab', 'chars');

// Vertical scroll for the item grid so a catalogue taller than the screen stays
// fully reachable (the grid used to silently cull anything past the fold, stranding
// the 7th Worlds/Gear card on short viewports). Direct drag, no inertia; resets to
// the top on tab change / re-entry. Input hooks are wired from main.ts.
const shopScroll = { y: 0, max: 0, dragging: false, lastPY: 0, moved: 0 };
export function shopResetScroll(): void { shopScroll.y = 0; shopScroll.dragging = false; }
export function shopDown(py: number): void { shopScroll.dragging = true; shopScroll.lastPY = py; shopScroll.moved = 0; }
export function shopMove(py: number): void {
  if (!shopScroll.dragging) return;
  const dy = py - shopScroll.lastPY;
  shopScroll.lastPY = py;
  shopScroll.moved += Math.abs(dy);
  shopScroll.y = clamp(shopScroll.y - dy, 0, shopScroll.max);
}
/** True if the gesture was a tap (negligible movement) → caller runs the hit-test. */
export function shopUp(): boolean { const tap = shopScroll.moved < 8; shopScroll.dragging = false; return tap; }

const TABS: Array<[Tab, string]> = [
  ['chars', 'CHARS'],
  ['trails', 'TRAILS'],
  ['worlds', 'WORLDS'],
  ['gear', 'GEAR'],
];

/* ---------- rarity ladder ----------
   Derived from price so the catalogue reads like a real collectible game.
   Drives the card accent, the corner gem, and the small tier label — replaces
   the old flavour tags ("Spooky"/"Zippy") that read as childish. */
interface Rarity { name: string; c: string; }
function rarityOf(price: number): Rarity {
  if (price <= 0) return { name: 'STARTER', c: '#8fa0c8' };
  if (price < 400) return { name: 'UNCOMMON', c: '#5fe0a0' };
  if (price < 800) return { name: 'RARE', c: '#5bb8ff' };
  if (price < 1500) return { name: 'EPIC', c: '#c08bff' };
  return { name: 'LEGENDARY', c: '#ffd24a' };
}

function ownedFor(tab: Tab): string[] {
  return tab === 'trails' ? OwnedTrails : tab === 'worlds' ? OwnedWorlds
    : tab === 'gear' ? OwnedAccessories : Owned;
}
function equippedFor(tab: Tab): string {
  return tab === 'trails' ? collectionState.trail : tab === 'worlds' ? collectionState.world
    : tab === 'gear' ? accessoryState.equipped : skinState.equipped;
}
function equipFor(tab: Tab, id: string): void {
  if (tab === 'trails') equipTrail(id);
  else if (tab === 'worlds') equipWorld(id);
  else if (tab === 'gear') equipAccessory(id);
  else equipSkin(id);
}
function accent(tab: Tab, item: Item): string {
  if (tab === 'worlds') return (item as World).node;
  if (tab === 'trails') return (item as Trail).c || skin().c;
  if (tab === 'gear') return (item as Accessory).c || skin().c;
  return (item as Skin).c;
}

function buy(tab: Tab, item: Item): void {
  // Pure-skill items (a `req` and NO price) are earned only — never buyable.
  // Items with BOTH a req and a price>0 are dual-route: reach the req for free,
  // OR buy with coins as the fallback (config calls the price exactly that). This
  // keeps skill-plateaued players progressing instead of hitting a dead zone once
  // the height-gated track outruns them (see scripts/pacing-audit.test.ts §4.1).
  if (item.req && item.price <= 0) return;
  if (Profile.coins < item.price) return;
  Profile.coins -= item.price;
  Store.set('coil_coins', Profile.coins);
  if (tab === 'trails') { ownTrail(item.id); equipTrail(item.id); }
  else if (tab === 'worlds') { ownWorld(item.id); equipWorld(item.id); }
  else if (tab === 'gear') { ownAccessory(item.id); equipAccessory(item.id); }
  else { ownSkin(item.id); equipSkin(item.id); }
  Telemetry.unlock(item.id);
  SFX.unlock();
  // Unlock moment is a clean "reveal", not a coin party — the player just SPENT
  // coins, so a fountain of them reads wrong. A rarity-tinted shock + a few rays
  // + sparkles feels premium and earned.
  const { W, H } = view;
  const acol = accent(tab, item);
  Shock.ring(W / 2, H * 0.42, acol, { r0: 18, r1: Math.max(W, H) * 0.7, lw: 5, life: 0.6 });
  Rays.burst(W / 2, H * 0.42, acol, 14);
  Sparkles.scatter(16, acol);
  Confetti.burst(W / 2, H * 0.42, 18);
}

/* ---------- previews ---------- */
function drawCharPreview(x: number, y: number, r: number, s: Skin, owned: boolean): void {
  const { ctx } = view;
  ctx.save();
  if (owned) {
    // soft halo so the orb reads as a glowing creature, not a flat dot
    ctx.fillStyle = s.c;
    ctx.shadowColor = s.c;
    ctx.shadowBlur = glowFX(18);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    // specular highlight
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.beginPath();
    ctx.arc(x - r * 0.32, y - r * 0.34, r * 0.26, 0, TAU);
    ctx.fill();
    // little face — gives every character an identity (design goal)
    for (const o of [-1, 1]) {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x + o * r * 0.34, y - r * 0.02, r * 0.2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#0a0720';
      ctx.beginPath();
      ctx.arc(x + o * r * 0.34, y + r * 0.02, r * 0.1, 0, TAU);
      ctx.fill();
    }
  } else {
    // locked silhouette + padlock
    ctx.fillStyle = 'rgba(255,255,255,.05)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.16)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    drawLock(x, y, '#7e88b5');
  }
  ctx.restore();
}

function drawLock(cx: number, cy: number, col: string): void {
  const { ctx } = view;
  ctx.save();
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  // shackle
  ctx.beginPath();
  ctx.arc(cx, cy - 3, 4, Math.PI, 0);
  ctx.stroke();
  // body
  rr(cx - 5.5, cy - 1, 11, 9, 2);
  ctx.fill();
  ctx.restore();
}

function drawTrailPreview(x: number, y: number, w: number, item: Trail): void {
  const { ctx } = view;
  const c = item.c || skin().c;
  const t = item.t || skin().t;
  // Shop is re-rendered every frame; performance.now() gives the previews life
  // without needing a run's G.t (stubbed to 0 in tests → static there).
  const tm = performance.now() / 1000;
  ctx.save();
  ctx.lineCap = 'round';
  if (item.style === 'rainbow') {
    for (let i = 0; i < 7; i++) {
      ctx.strokeStyle = `hsl(${(i * 45 + tm * 80) % 360},90%,65%)`;   // hue cycles
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 5 - i * 0.35;
      ctx.beginPath();
      ctx.moveTo(x - w / 2 + i * 3, y + (i % 2) * 2);
      ctx.quadraticCurveTo(x, y - 18 + i, x + w / 2, y);
      ctx.stroke();
    }
  } else if (item.style === 'dots' || item.style === 'bubbles') {
    const bubbles = item.style === 'bubbles';
    ctx.fillStyle = c; ctx.strokeStyle = t; ctx.shadowColor = c; ctx.shadowBlur = glowFX(8); ctx.lineWidth = 1.4;
    for (let i = 0; i < 8; i++) {
      const px = x - w / 2 + (i * w) / 7;
      const py = y + Math.sin(i * 0.9 + tm * 2.2) * 8;                // undulating flow
      ctx.globalAlpha = 0.35 + i * 0.08;
      ctx.beginPath();
      ctx.arc(px, py, bubbles ? 5 : 3 + i * 0.2, 0, TAU);
      if (bubbles) ctx.stroke();
      else ctx.fill();
    }
  } else if (item.style === 'sparkle') {
    ctx.fillStyle = t; ctx.shadowColor = t; ctx.shadowBlur = glowFX(10);
    for (let i = 0; i < 7; i++) {
      const px = x - w / 2 + (i * w) / 6;
      const py = y + Math.sin(i + tm * 2) * 7;
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(tm * 4 + i);             // twinkle
      ctx.save(); ctx.translate(px, py); ctx.rotate(i + tm * 2);
      ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(2, 0); ctx.lineTo(0, 6); ctx.lineTo(-2, 0); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  } else {
    ctx.strokeStyle = c; ctx.shadowColor = c; ctx.shadowBlur = glowFX(10 + Math.sin(tm * 3) * 4);
    ctx.lineWidth = item.style === 'comet' ? 8 : 5;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y + 8);
    ctx.quadraticCurveTo(x, y - 18, x + w / 2, y + 4);
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawWorldPreview(x: number, y: number, w: number, h: number, item: World): void {
  const { ctx } = view;
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, item.bg[0]);
  g.addColorStop(0.55, item.bg[1]);
  g.addColorStop(1, item.bg[2]);
  ctx.save();
  rr(x, y, w, h, 10);
  ctx.fillStyle = g;
  ctx.fill();
  rr(x, y, w, h, 10);
  ctx.clip();
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 16; i++) {
    ctx.globalAlpha = 0.25 + ((i * 37) % 30) / 100;
    ctx.fillRect(x + ((i * 53) % w), y + ((i * 29) % h), 1.5, 1.5);
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = item.void;
  ctx.shadowColor = item.void;
  ctx.shadowBlur = glowFX(8);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y + h - 10);
  ctx.lineTo(x + w, y + h - 18);
  ctx.stroke();
  ctx.restore();
}

/* accessory preview — a neutral character orb wearing the accessory. Animated off
   performance.now() (the shop has no run G.t, but is redrawn every frame). */
function drawAccessoryPreview(x: number, y: number, item: Accessory): void {
  const { ctx } = view;
  const sk = skin();
  const r = 15;
  const c = item.c || sk.c;
  const tcol = item.t || sk.t;
  const tm = performance.now() / 1000;
  ctx.save();
  // base orb
  ctx.fillStyle = sk.c;
  ctx.shadowColor = sk.c;
  ctx.shadowBlur = glowFX(14);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.beginPath();
  ctx.arc(x - r * 0.32, y - r * 0.34, r * 0.26, 0, TAU);
  ctx.fill();
  // accessory
  ctx.fillStyle = c;
  ctx.strokeStyle = c;
  ctx.shadowColor = c;
  ctx.shadowBlur = glowFX(8);
  if (item.kind === 'orbit') {
    const n = item.count || 3;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU - Math.PI / 2 + tm * 1.1;     // satellites orbit
      const sx = x + Math.cos(a) * (r + 10);
      const sy = y + Math.sin(a) * (r + 10) * 0.66;
      if (item.shape === 'star') {
        ctx.save(); ctx.translate(sx, sy);
        ctx.beginPath();
        for (let k = 0; k < 4; k++) {
          const sa = (k / 4) * TAU;
          ctx.lineTo(Math.cos(sa) * 3.2, Math.sin(sa) * 3.2);
          ctx.lineTo(Math.cos(sa + 0.39) * 1.3, Math.sin(sa + 0.39) * 1.3);
        }
        ctx.closePath(); ctx.fill(); ctx.restore();
      } else if (item.shape === 'moon') {
        ctx.beginPath(); ctx.arc(sx, sy, 2.8, 0, TAU); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(sx, sy, 2.6, 0, TAU); ctx.fill();
      }
    }
  } else if (item.kind === 'aura') {
    if (item.glyph === 'halo') {
      ctx.strokeStyle = tcol;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(x, y - r - 6, r * 0.95, r * 0.34, 0, 0, TAU);
      ctx.stroke();
    } else {
      ctx.globalAlpha = 0.35 + 0.25 * Math.sin(tm * 3);     // aura breathes
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, r + 7 + Math.sin(tm * 3) * 1.5, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  } else if (item.kind === 'crown') {
    if (item.glyph === 'visor') {
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.78, Math.PI * 1.16, Math.PI * 1.84);
      ctx.stroke();
    } else {
      ctx.save();
      ctx.translate(x, y - r - 1);
      ctx.beginPath();
      ctx.moveTo(-7, 2); ctx.lineTo(-7, -3); ctx.lineTo(-3, 0);
      ctx.lineTo(0, -6); ctx.lineTo(3, 0); ctx.lineTo(7, -3); ctx.lineTo(7, 2);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}

/* small rarity gem in the card corner */
function drawGem(cx: number, cy: number, r: number, col: string): void {
  const { ctx } = view;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = col;
  ctx.shadowColor = col;
  ctx.shadowBlur = glowFX(6);
  rr(-r, -r, r * 2, r * 2, 1.5);
  ctx.fill();
  ctx.restore();
}

/* coin-balance pill, centered under the title */
function drawCoinPill(cx: number, cy: number): void {
  const { ctx } = view;
  const label = Profile.coins.toLocaleString();
  ctx.save();
  ctx.font = "700 15px 'Sora', sans-serif";
  const tw = ctx.measureText(label).width;
  const pad = 16;
  const cr = 7;
  const pw = pad + cr * 2 + 7 + tw + pad;
  const ph = 30;
  const px = cx - pw / 2;
  const py = cy - ph / 2;
  rr(px, py, pw, ph, ph / 2);
  ctx.fillStyle = 'rgba(20,16,48,.72)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,210,74,.30)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // gold coin glyph
  const coinX = px + pad + cr;
  ctx.fillStyle = '#ffcf3a';
  ctx.shadowColor = '#ffb020';
  ctx.shadowBlur = glowFX(6);
  ctx.beginPath();
  ctx.arc(coinX, cy, cr, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff3b0';
  ctx.beginPath();
  ctx.arc(coinX - cr * 0.25, cy - cr * 0.25, cr * 0.45, 0, TAU);
  ctx.fill();
  ctx.restore();
  text(label, coinX + cr + 7, cy, 15, '#ffe39b', 700, 0, 'left');
}

export function renderShop(): void {
  const { ctx, W, H, SAFE_TOP, SAFE_BOTTOM } = view;
  drawBG();
  dimVoid(0.62);
  const sk = skin();

  // ---- header ----
  text('COLLECTION', W / 2, 40 + SAFE_TOP, 24, '#fff', 800, 12, 'center', "'Unbounded'");
  drawCoinPill(W / 2, 70 + SAFE_TOP);

  // ---- segmented tab control (single track, no neon glow) ----
  const trackX = 16;
  const trackY = 92 + SAFE_TOP;
  const trackW = W - 32;
  const trackH = 38;
  rr(trackX, trackY, trackW, trackH, 12);
  ctx.fillStyle = 'rgba(12,9,30,.7)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.06)';
  ctx.lineWidth = 1;
  ctx.stroke();
  const segPad = 4;
  const segW = (trackW - segPad * 2) / TABS.length;
  for (let i = 0; i < TABS.length; i++) {
    const [id, label] = TABS[i];
    const active = shopTab === id;
    const sx = trackX + segPad + i * segW;
    if (active) {
      rr(sx, trackY + segPad, segW, trackH - segPad * 2, 9);
      ctx.fillStyle = hexA(sk.c, 0.18);
      ctx.fill();
      ctx.strokeStyle = hexA(sk.c, 0.55);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    text(label, sx + segW / 2, trackY + trackH / 2, 10.5,
      active ? '#fff' : '#8a93bf', 800, 0, 'center', "'Unbounded'");
    btn('tab' + id, sx, trackY, segW, trackH, () => { shopTab = id; shopScroll.y = 0; Store.set('coil_shop_tab', id); });
  }

  // ---- item grid ----
  const list: Item[] = shopTab === 'trails' ? TRAILS : shopTab === 'worlds' ? WORLDS
    : shopTab === 'gear' ? ACCESSORIES : SKINS;
  const owned = ownedFor(shopTab);
  const eqId = equippedFor(shopTab);
  const cols = 2;
  const gap = 12;
  const mx = 18;
  const cw = (W - mx * 2 - gap) / cols;
  const ch = 134;
  const gy = 148 + SAFE_TOP;
  const gridBottom = H - 76 - SAFE_BOTTOM;                 // viewport bottom (above BACK)
  const rows = Math.ceil(list.length / cols);
  const contentH = rows > 0 ? (rows - 1) * (ch + gap) + ch : 0;
  shopScroll.max = Math.max(0, contentH - (gridBottom - gy));
  shopScroll.y = clamp(shopScroll.y, 0, shopScroll.max);

  // Register BACK *before* the grid so it always wins a tap, even if a scrolled
  // card straddles its row (hitButtons is first-match). Visuals are drawn after.
  const bw = W * 0.5;
  const bh = 46;
  const bx = W / 2 - bw / 2;
  const by = H - 64 - SAFE_BOTTOM;
  btn('back', bx, by, bw, bh, () => { shopScroll.y = 0; state.scene = 'home'; });

  // Clip the grid to its viewport so scrolled cards don't paint over header/footer.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, gy - 6, W, gridBottom - gy + 12);
  ctx.clip();
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = mx + col * (cw + gap);
    const y = gy + row * (ch + gap) - shopScroll.y;
    if (y > gridBottom || y + ch < gy) continue;          // cull off-viewport (no draw, no button)
    // Clamp this card's tap region to the visible viewport so a card straddling an
    // edge can't register a hit-rect over the (button-less) header/footer.
    const btnY = Math.max(y, gy);
    const btnH = Math.min(y + ch, gridBottom) - btnY;
    const isOwned = owned.includes(item.id);
    const eq = eqId === item.id;
    const can = Profile.coins >= item.price;
    const acol = accent(shopTab, item);
    const rar = rarityOf(item.price);

    // card: subtle top-lit gradient + hairline border (rarity-tinted)
    const cg = ctx.createLinearGradient(x, y, x, y + ch);
    cg.addColorStop(0, 'rgba(30,24,60,.92)');
    cg.addColorStop(1, 'rgba(12,9,28,.94)');
    rr(x, y, cw, ch, 14);
    ctx.fillStyle = cg;
    ctx.fill();
    rr(x, y, cw, ch, 14);
    ctx.lineWidth = eq ? 2 : 1;
    ctx.strokeStyle = eq ? acol : isOwned ? hexA(rar.c, 0.4) : 'rgba(255,255,255,.07)';
    if (eq) { ctx.shadowColor = acol; ctx.shadowBlur = glowFX(12); }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // rarity gem (top-left)
    drawGem(x + 14, y + 14, 3.5, rar.c);
    // owned/equipped tick (top-right)
    if (isOwned) {
      ctx.save();
      const tx = x + cw - 14;
      const ty = y + 14;
      ctx.strokeStyle = eq ? acol : '#6fe0a0';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tx - 4, ty); ctx.lineTo(tx - 1, ty + 3); ctx.lineTo(tx + 4, ty - 3);
      ctx.stroke();
      ctx.restore();
    }

    const pcx = x + cw / 2;
    const pcy = y + 44;
    if (shopTab === 'chars') drawCharPreview(pcx, pcy, 17, item as Skin, isOwned);
    else if (shopTab === 'trails') drawTrailPreview(pcx, pcy, Math.min(72, cw * 0.65), item as Trail);
    else if (shopTab === 'gear') drawAccessoryPreview(pcx, pcy, item as Accessory);
    else drawWorldPreview(x + 16, y + 22, cw - 32, 44, item as World);

    text(item.name, pcx, y + 82, 14, isOwned ? '#fff' : '#c5cef0', 800, 0);
    text(rar.name, pcx, y + 99, 9, rar.c, 800, 0, 'center', "'Unbounded'");

    // action row
    if (eq) {
      text('EQUIPPED', pcx, y + 117, 11, acol, 800, 3);
    } else if (isOwned) {
      text('TAP TO EQUIP', pcx, y + 117, 10.5, '#9fb0e0', 700, 0);
      btn('eq' + shopTab + item.id, x, btnY, cw, btnH, () => equipFor(shopTab, item.id));
    } else if (item.req) {
      // SKILL ROUTE — show the requirement + progress bar. If the item ALSO has a
      // price it's DUAL-ROUTE: reach the req for free, or buy with coins (a small
      // "or ◎N" chip, tappable when affordable). Price-0 items stay earn-only.
      const frac = reqFraction(item.req);
      const dual = item.price > 0;
      text(reqLabel(item.req), pcx, y + (dual ? 103 : 110), 9.5, rar.c, 800, 0, 'center', "'Unbounded'");
      text(reqProgress(item.req), pcx, y + (dual ? 115 : 123), 8.5, '#8a93bf', 700, 0);
      const bw2 = cw * 0.6;
      const bx2 = pcx - bw2 / 2;
      rr(bx2, y + ch - 12, bw2, 3, 1.5);
      ctx.fillStyle = 'rgba(255,255,255,.08)';
      ctx.fill();
      rr(bx2, y + ch - 12, bw2 * frac, 3, 1.5);
      ctx.fillStyle = rar.c;
      ctx.fill();
      if (dual) {
        const can2 = Profile.coins >= item.price;
        const label = 'or ◎ ' + item.price.toLocaleString();
        ctx.save();
        ctx.font = "800 9.5px 'Sora', sans-serif";
        const tw = ctx.measureText(label).width;
        const chipW = tw + 16;
        const chipX = pcx - chipW / 2;
        const chipY = y + 124;
        rr(chipX, chipY, chipW, 16, 8);
        ctx.fillStyle = can2 ? 'rgba(255,210,74,.14)' : 'rgba(255,255,255,.05)';
        ctx.fill();
        ctx.restore();
        text(label, pcx, chipY + 8, 9.5, can2 ? '#ffe39b' : '#7e88b5', 800, 0);
        if (can2) btn('buy' + shopTab + item.id, x, btnY, cw, btnH, () => buy(shopTab, item));
      }
    } else {
      // price chip
      const priceTxt = item.price.toLocaleString();
      ctx.save();
      ctx.font = "800 11px 'Sora', sans-serif";
      const ptw = ctx.measureText(priceTxt).width;
      const chipW = 12 + 5 + 4 + ptw + 12;
      const chipX = pcx - chipW / 2;
      const chipY = y + 108;
      rr(chipX, chipY, chipW, 19, 9.5);
      ctx.fillStyle = can ? 'rgba(255,210,74,.14)' : 'rgba(255,255,255,.05)';
      ctx.fill();
      ctx.restore();
      const dotX = chipX + 12;
      const dotY = chipY + 9.5;
      ctx.save();
      ctx.fillStyle = can ? '#ffcf3a' : '#5b6488';
      ctx.beginPath();
      ctx.arc(dotX, dotY, 4, 0, TAU);
      ctx.fill();
      ctx.restore();
      text(priceTxt, dotX + 4 + 5, dotY, 11, can ? '#ffe39b' : '#7e88b5', 800, 0, 'left');
      if (can) btn('buy' + shopTab + item.id, x, btnY, cw, btnH, () => buy(shopTab, item));
    }
  }
  ctx.restore();   // end grid clip

  // scroll affordance — a thin track + thumb on the right edge when scrollable
  if (shopScroll.max > 1) {
    const viewH = gridBottom - gy;
    const thumbH = Math.max(28, viewH * (viewH / contentH));
    const ty2 = gy + (viewH - thumbH) * (shopScroll.y / shopScroll.max);
    rr(W - 6, ty2, 3, thumbH, 1.5);
    ctx.fillStyle = hexA(sk.c, 0.5);
    ctx.fill();
  }

  // unlock-moment FX (drawn above the grid)
  Sparkles.draw();
  Rays.draw();
  Shock.draw();
  Confetti.draw();

  // ---- BACK button visuals (the hit-region was registered before the grid) ----
  rr(bx, by, bw, bh, 13);
  ctx.fillStyle = 'rgba(20,16,48,.8)';
  ctx.fill();
  ctx.strokeStyle = hexA(sk.c, 0.5);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text('BACK', W / 2, by + bh / 2, 15, sk.t, 800, 0, 'center', "'Unbounded'");
}
