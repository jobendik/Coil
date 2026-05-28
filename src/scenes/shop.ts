import { view } from '../core/canvas';
import { state } from '../game/state';
import { Profile } from '../game/profile';
import { Owned, equipSkin, ownSkin, skin, skinState } from '../game/skins';
import {
  OwnedTrails, OwnedWorlds, collectionState,
  equipTrail, equipWorld, ownTrail, ownWorld,
} from '../game/collection';
import { Store } from '../core/store';
import { Confetti, Coins, Rays } from '../core/fx';
import { TAU, glowFX, hexA, rr, text } from '../core/utils';
import { btn } from '../core/ui';
import { SFX } from '../core/audio';
import { drawBG, dimVoid } from './play';
import { SKINS, TRAILS, WORLDS } from '../config';
import type { Skin, Trail, World } from '../types';

type Tab = 'chars' | 'trails' | 'worlds';
let shopTab: Tab = Store.get<Tab>('coil_shop_tab', 'chars');

const TABS: Array<[Tab, string]> = [
  ['chars', 'CHARACTERS'],
  ['trails', 'TRAILS'],
  ['worlds', 'WORLDS'],
];

function ownedFor(tab: Tab): string[] {
  return tab === 'trails' ? OwnedTrails : tab === 'worlds' ? OwnedWorlds : Owned;
}
function equippedFor(tab: Tab): string {
  return tab === 'trails' ? collectionState.trail : tab === 'worlds' ? collectionState.world : skinState.equipped;
}
function equipFor(tab: Tab, id: string): void {
  if (tab === 'trails') equipTrail(id);
  else if (tab === 'worlds') equipWorld(id);
  else equipSkin(id);
}
function accent(tab: Tab, item: Skin | Trail | World): string {
  if (tab === 'worlds') return (item as World).node;
  if (tab === 'trails') return (item as Trail).c || skin().c;
  return (item as Skin).c;
}

function buy(tab: Tab, item: Skin | Trail | World): void {
  if (Profile.coins < item.price) return;
  Profile.coins -= item.price;
  Store.set('coil_coins', Profile.coins);
  if (tab === 'trails') { ownTrail(item.id); equipTrail(item.id); }
  else if (tab === 'worlds') { ownWorld(item.id); equipWorld(item.id); }
  else { ownSkin(item.id); equipSkin(item.id); }
  SFX.unlock();
  const { W, H } = view;
  Confetti.burst(W / 2, H * 0.4, 32);
  Coins.spawn(W / 2, H * 0.4, 12, { fountain: true, up: 80 });
  Rays.burst(W / 2, H * 0.4, accent(tab, item), 16);
}

/* ---------- previews ---------- */
function drawCharPreview(x: number, y: number, r: number, s: Skin, owned: boolean): void {
  const { ctx } = view;
  ctx.save();
  if (owned) { ctx.fillStyle = s.c; ctx.shadowColor = s.c; ctx.shadowBlur = glowFX(16); } else { ctx.fillStyle = '#2a2550'; }
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  if (owned) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r * 0.38, 0, TAU); ctx.fill(); }
  ctx.restore();
}

function drawTrailPreview(x: number, y: number, w: number, item: Trail): void {
  const { ctx } = view;
  const c = item.c || skin().c;
  const t = item.t || skin().t;
  ctx.save();
  ctx.lineCap = 'round';
  if (item.style === 'rainbow') {
    for (let i = 0; i < 7; i++) {
      ctx.strokeStyle = `hsl(${i * 45},90%,65%)`;
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
      const py = y + Math.sin(i * 0.9) * 8;
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
      const py = y + Math.sin(i) * 7;
      ctx.save(); ctx.translate(px, py); ctx.rotate(i);
      ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(2, 0); ctx.lineTo(0, 6); ctx.lineTo(-2, 0); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  } else {
    ctx.strokeStyle = c; ctx.shadowColor = c; ctx.shadowBlur = glowFX(10);
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

export function renderShop(): void {
  const { ctx, W, H, SAFE_TOP } = view;
  drawBG();
  dimVoid(0.55);
  const sk = skin();
  text('COLLECTION', W / 2, 42 + SAFE_TOP, 25, '#fff', 800, 14, 'center', "'Unbounded'");
  text('◎ ' + Profile.coins, W / 2, 72 + SAFE_TOP, 16, '#ffe39b', 700, 6);

  // tabs
  const tx = 16;
  const ty = 92 + SAFE_TOP;
  const tw = (W - 32 - 16) / 3;
  const th = 34;
  for (let i = 0; i < TABS.length; i++) {
    const [id, label] = TABS[i];
    const x = tx + i * (tw + 8);
    const active = shopTab === id;
    rr(x, ty, tw, th, 10);
    ctx.fillStyle = active ? hexA(sk.c, 0.26) : 'rgba(20,16,48,.72)';
    ctx.fill();
    ctx.strokeStyle = active ? sk.c : 'rgba(255,255,255,.10)';
    ctx.lineWidth = 1.4;
    if (active) { ctx.shadowColor = sk.c; ctx.shadowBlur = glowFX(10); }
    ctx.stroke();
    ctx.shadowBlur = 0;
    text(label, x + tw / 2, ty + th / 2, 10, active ? '#fff' : '#9fb0e0', 800, active ? 4 : 0, 'center', "'Unbounded'");
    btn('tab' + id, x, ty, tw, th, () => { shopTab = id; Store.set('coil_shop_tab', id); });
  }

  const list: Array<Skin | Trail | World> = shopTab === 'trails' ? TRAILS : shopTab === 'worlds' ? WORLDS : SKINS;
  const owned = ownedFor(shopTab);
  const eqId = equippedFor(shopTab);
  const cols = 2;
  const gap = 12;
  const mx = 18;
  const cw = (W - mx * 2 - gap) / cols;
  const ch = 126;
  const gy = 138 + SAFE_TOP;
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = mx + col * (cw + gap);
    const y = gy + row * (ch + gap);
    if (y > H - 82) continue;
    const isOwned = owned.includes(item.id);
    const eq = eqId === item.id;
    const can = Profile.coins >= item.price;
    const acol = accent(shopTab, item);
    rr(x, y, cw, ch, 14);
    ctx.fillStyle = 'rgba(16,12,38,.9)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = eq ? acol : 'rgba(255,255,255,.08)';
    if (eq) { ctx.shadowColor = acol; ctx.shadowBlur = glowFX(13); }
    ctx.stroke();
    ctx.shadowBlur = 0;
    const pcx = x + cw / 2;
    const pcy = y + 40;
    if (shopTab === 'chars') drawCharPreview(pcx, pcy, 16, item as Skin, isOwned);
    else if (shopTab === 'trails') drawTrailPreview(pcx, pcy, Math.min(72, cw * 0.65), item as Trail);
    else drawWorldPreview(x + 16, y + 18, cw - 32, 44, item as World);
    text(item.name, pcx, y + 80, 14, isOwned ? '#fff' : '#8a93bf', 800, 0);
    text(item.tag || '', pcx, y + 98, 10, '#7e88b5', 600, 0);
    if (eq) {
      text('EQUIPPED', pcx, y + 114, 12, acol, 800, 5);
    } else if (isOwned) {
      text('EQUIP', pcx, y + 114, 12, '#9fb0e0', 800, 0);
      btn('eq' + shopTab + item.id, x, y, cw, ch, () => equipFor(shopTab, item.id));
    } else {
      text((can ? 'BUY  ' : '') + item.price + ' ◎', pcx, y + 114, 12, can ? '#ffe39b' : '#5b6488', 800, can ? 5 : 0);
      if (can) btn('buy' + shopTab + item.id, x, y, cw, ch, () => buy(shopTab, item));
    }
  }

  Coins.draw();
  Confetti.draw();
  Rays.draw();

  const bw = W * 0.5;
  const bh = 48;
  const bx = W / 2 - bw / 2;
  const by = H - 66;
  rr(bx, by, bw, bh, 12);
  ctx.fillStyle = sk.c;
  ctx.shadowColor = sk.c;
  ctx.shadowBlur = 16;
  ctx.fill();
  ctx.shadowBlur = 0;
  text('BACK', W / 2, by + bh / 2, 16, '#04030a', 800, 0);
  btn('back', bx, by, bw, bh, () => {
    state.scene = 'home';
  });
}
