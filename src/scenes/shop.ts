import { view } from '../core/canvas';
import { state } from '../game/state';
import { Profile } from '../game/profile';
import { Owned, equipSkin, ownSkin, skin, skinState } from '../game/skins';
import { Store } from '../core/store';
import { TAU, rr, text } from '../core/utils';
import { btn } from '../core/ui';
import { SFX } from '../core/audio';
import { drawBG, dimVoid } from './play';
import { SKINS } from '../config';

export function renderShop(): void {
  const { ctx, W, H, SAFE_TOP } = view;
  drawBG();
  dimVoid(0.55);
  text('COLLECTION', W / 2, 46 + SAFE_TOP, 26, '#fff', 800, 14, 'center', "'Unbounded'");
  text('◎ ' + Profile.coins, W / 2, 80 + SAFE_TOP, 16, '#ffe39b', 700, 6);
  const cols = 2;
  const gap = 14;
  const mx = 20;
  const cw = (W - mx * 2 - gap) / cols;
  const ch = 132;
  const gy = 110 + SAFE_TOP;
  for (let i = 0; i < SKINS.length; i++) {
    const s = SKINS[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = mx + col * (cw + gap);
    const y = gy + row * (ch + gap);
    const owned = Owned.includes(s.id);
    const eq = skinState.equipped === s.id;
    rr(x, y, cw, ch, 14);
    ctx.fillStyle = 'rgba(16,12,38,.9)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = eq ? s.c : 'rgba(255,255,255,.08)';
    if (eq) {
      ctx.shadowColor = s.c;
      ctx.shadowBlur = 14;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    const pcx = x + cw / 2;
    const pcy = y + 44;
    ctx.save();
    if (owned) {
      ctx.fillStyle = s.c;
      ctx.shadowColor = s.c;
      ctx.shadowBlur = 16;
    } else {
      ctx.fillStyle = '#2a2550';
    }
    ctx.beginPath();
    ctx.arc(pcx, pcy, 16, 0, TAU);
    ctx.fill();
    if (owned) {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(pcx, pcy, 6, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    text(s.name, pcx, y + 82, 15, owned ? '#fff' : '#7e88b5', 700, 0);
    if (eq) {
      text('EQUIPPED', pcx, y + 108, 13, s.c, 700, 4);
    } else if (owned) {
      text('EQUIP', pcx, y + 108, 13, '#9fb0e0', 700, 0);
      btn('eq' + s.id, x, y, cw, ch, () => equipSkin(s.id));
    } else {
      const can = Profile.coins >= s.price;
      text((can ? 'BUY  ' : '') + s.price + ' ◎', pcx, y + 108, 13, can ? '#ffe39b' : '#7e88b5', 700, can ? 4 : 0);
      if (can) {
        btn('buy' + s.id, x, y, cw, ch, () => {
          if (Profile.coins >= s.price) {
            Profile.coins -= s.price;
            Store.set('coil_coins', Profile.coins);
            ownSkin(s.id);
            equipSkin(s.id);
            SFX.unlock();
          }
        });
      }
    }
  }
  const bw = W * 0.5;
  const bh = 48;
  const bx = W / 2 - bw / 2;
  const by = H - 70;
  const sk = skin();
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
