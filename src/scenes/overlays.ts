import { view } from '../core/canvas';
import { Profile } from '../game/profile';
import { Login, Wheel, Chest, LOGIN_REWARDS, WHEEL_SEGMENTS } from '../game/rewards';
import { TAU, clamp, glowFX, hexA, lerp, rr, text } from '../core/utils';
import { btn } from '../core/ui';
import { SFX, cymbal } from '../core/audio';
import { Confetti, Coins, FlyCoins, Shock, Sparkles, bankXY } from '../core/fx';
import { buzz } from '../core/haptics';
import { CG } from '../core/cg';
import { dimVoid } from './play';

/* =========================================================================
   HOME REWARD OVERLAYS — daily login bonus, spin wheel, bonus chest.
   Rendered as modals on top of the home scene. home.ts calls resetButtons()
   then drawOverlay() so these become fully modal (only their buttons receive
   taps). A full-screen absorber is registered LAST so taps outside the panel
   do nothing instead of leaking through.
   ========================================================================= */

export type Overlay = 'none' | 'login' | 'wheel' | 'chest';

const ov = {
  kind: 'none' as Overlay,
  t: 0,
  // login
  loginDone: false,
  loginReward: 0,
  loginDay: 0,
  // wheel
  angle: 0,
  startAngle: 0,
  finalAngle: 0,
  spinning: false,
  spinT: 0,
  spun: false,
  wheelCoins: 0,
  // chest
  opening: false,
  openT: 0,
  opened: false,
  chestCoins: 0,
  chestDoubled: false,
  // shared rewarded-ad guard (prevents double-trigger while an ad loads)
  adBusy: false,
  adMsgT: 0,    // brief "ad unavailable" feedback timer (s)
};

/* Opt-in rewarded ad: on platform, watch → onOk; off platform (dev/standalone)
   grant it directly so the flow stays testable. Guards against double-taps. */
function rewarded(onOk: () => void): void {
  if (ov.adBusy) return;
  if (CG.ready) {
    ov.adBusy = true;
    CG.rewarded(
      () => { ov.adBusy = false; onOk(); },
      () => { ov.adBusy = false; ov.adMsgT = 2.4; },   // ad failed/closed early — tell the player
    );
  } else {
    onOk();
  }
}

/* label for a rewarded button — "WATCH" on platform, "FREE" off it. */
function adVerb(): string {
  return CG.ready ? 'WATCH' : 'FREE';
}

export function overlayKind(): Overlay {
  return ov.kind;
}

export function openOverlay(kind: Overlay): void {
  ov.kind = kind;
  ov.t = 0;
  ov.loginDone = false;
  ov.loginReward = 0;
  ov.spinning = false;
  ov.spinT = 0;
  ov.spun = !Wheel.available();
  ov.opening = false;
  ov.openT = 0;
  ov.opened = false;
  ov.chestDoubled = false;
  ov.adBusy = false;
}

export function closeOverlay(): void {
  ov.kind = 'none';
}

/** Auto-open the login bonus the first time home is shown on a new day. Called
 *  by home.ts; only fires when a bonus is actually available and nothing else
 *  is open. */
export function maybeAutoOpenLogin(): void {
  if (ov.kind === 'none' && Login.available()) openOverlay('login');
}

function panel(): { x: number; y: number; w: number; h: number } {
  const { W, H } = view;
  const w = Math.min(W * 0.86, 440);
  const h = Math.min(H * 0.56, 460);
  return { x: W / 2 - w / 2, y: H / 2 - h / 2, w, h };
}

function drawPanel(): { x: number; y: number; w: number; h: number } {
  const { ctx } = view;
  const p = panel();
  rr(p.x, p.y, p.w, p.h, 20);
  const g = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
  g.addColorStop(0, 'rgba(32,26,64,.98)');
  g.addColorStop(1, 'rgba(14,10,30,.99)');
  ctx.fillStyle = g;
  ctx.fill();
  rr(p.x, p.y, p.w, p.h, 20);
  ctx.strokeStyle = 'rgba(255,255,255,.12)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  return p;
}

function actionButton(key: string, x: number, y: number, w: number, h: number, label: string, col: string, dark: string, act: () => void, enabled = true): void {
  const { ctx } = view;
  rr(x, y, w, h, 14);
  if (enabled) {
    ctx.fillStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.shadowBlur = 0;
    text(label, x + w / 2, y + h / 2, 17, dark, 800, 0, 'center', "'Unbounded'");
    btn(key, x, y, w, h, act);
  } else {
    ctx.fillStyle = 'rgba(20,16,48,.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.14)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    text(label, x + w / 2, y + h / 2, 14, '#7e88b5', 800, 0, 'center', "'Unbounded'");
  }
}

/* full-screen tap absorber — registered LAST so panel buttons win, but a tap
   anywhere else is swallowed (modal). */
function absorber(): void {
  const { W, H } = view;
  btn('ovabsorb', 0, 0, W, H, () => { /* swallow */ });
}

/* ----------------------------------- LOGIN ----------------------------------- */
function drawLogin(): void {
  const { ctx, W } = view;
  const p = drawPanel();
  const cx = W / 2;
  text('DAILY BONUS', cx, p.y + 34, 22, '#ffe39b', 800, 12, 'center', "'Unbounded'");
  const pend = Login.pendingDay();
  text(ov.loginDone ? 'See you tomorrow!' : 'Day ' + pend + '  ·  come back daily for more',
    cx, p.y + 60, 11, '#9fb0e0', 700, 0);

  // 7-day calendar strip
  const cells = LOGIN_REWARDS.length;
  const gap = 7;
  const stripW = p.w - 40;
  const cw = (stripW - gap * (cells - 1)) / cells;
  const cy = p.y + 90;
  const chh = 56;
  for (let i = 0; i < cells; i++) {
    const day = i + 1;
    const x = p.x + 20 + i * (cw + gap);
    const claimed = day < pend || (ov.loginDone && day <= ov.loginDay);
    const isToday = day === pend && !ov.loginDone;
    rr(x, cy, cw, chh, 10);
    ctx.fillStyle = isToday ? hexA('#ffd24a', 0.18) : claimed ? 'rgba(149,227,90,.12)' : 'rgba(255,255,255,.05)';
    ctx.fill();
    rr(x, cy, cw, chh, 10);
    ctx.lineWidth = isToday ? 2 : 1;
    ctx.strokeStyle = isToday ? '#ffd24a' : claimed ? 'rgba(149,227,90,.4)' : 'rgba(255,255,255,.08)';
    if (isToday) { ctx.shadowColor = '#ffd24a'; ctx.shadowBlur = glowFX(10); }
    ctx.stroke();
    ctx.shadowBlur = 0;
    text('D' + day, x + cw / 2, cy + 14, 9, claimed ? '#9be35a' : isToday ? '#ffd24a' : '#8a93bf', 800, 0);
    if (claimed) {
      ctx.strokeStyle = '#9be35a';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x + cw / 2 - 5, cy + 34); ctx.lineTo(x + cw / 2 - 1, cy + 38); ctx.lineTo(x + cw / 2 + 6, cy + 30);
      ctx.stroke();
    } else {
      text('◎' + LOGIN_REWARDS[i], x + cw / 2, cy + 36, 10, isToday ? '#ffe39b' : '#9fb0e0', 800, 0);
    }
  }

  // reward headline
  if (ov.loginDone) {
    text('+' + ov.loginReward + ' ◎', cx, cy + chh + 44, 30, '#ffd24a', 800, 14, 'center', "'Unbounded'");
  } else {
    text('TODAY: +' + Login.rewardFor(pend) + ' ◎', cx, cy + chh + 44, 22, '#ffe39b', 800, 10, 'center', "'Unbounded'");
  }

  const bw = p.w * 0.6;
  const bx = cx - bw / 2;
  const by = p.y + p.h - 70;
  if (ov.loginDone) {
    actionButton('loginok', bx, by, bw, 50, 'CONTINUE', '#9be35a', '#04130a', () => closeOverlay());
  } else {
    actionButton('loginclaim', bx, by, bw, 50, 'CLAIM', '#ffd24a', '#3a2400', () => {
      const r = Login.claim();
      ov.loginDone = true;
      ov.loginReward = r.reward;
      ov.loginDay = r.day;
      SFX.chaching();
      cymbal(0.4);
      buzz([20, 40, 20]);
      Confetti.rain(40);
      const b = bankXY();
      FlyCoins.send(cx, view.H * 0.5, 14, b.x, b.y);
      Coins.spawn(cx, view.H * 0.5, 12, { fountain: true, up: 120 });
    });
  }
  absorber();
}

/* ----------------------------------- WHEEL ----------------------------------- */
function posMod(a: number, m: number): number {
  return ((a % m) + m) % m;
}

function drawWheel(dt: number): void {
  const { ctx, W, H } = view;
  const p = drawPanel();
  const cx = W / 2;
  text('DAILY SPIN', cx, p.y + 34, 22, '#cdb4ff', 800, 12, 'center', "'Unbounded'");

  const segs = WHEEL_SEGMENTS;
  const n = segs.length;
  const seg = TAU / n;
  const R = Math.min(p.w * 0.36, 128);
  const wy = p.y + 60 + R;

  // advance spin animation
  if (ov.spinning) {
    ov.spinT += dt;
    const pr = clamp(ov.spinT / 3.2, 0, 1);
    const e = 1 - Math.pow(1 - pr, 3);
    ov.angle = lerp(ov.startAngle, ov.finalAngle, e);
    if (pr >= 1) {
      ov.spinning = false;
      ov.spun = true;
      SFX.chaching();
      cymbal(0.45);
      buzz([30, 50, 30]);
      Confetti.rain(46);
      const b = bankXY();
      FlyCoins.send(cx, wy, 14, b.x, b.y);
      Shock.ring(cx, wy, '#ffd24a', { r0: 20, r1: Math.max(W, H) * 0.6, lw: 5, life: 0.6 });
      Sparkles.scatter(18, '#ffd24a');
    }
  }

  // wheel slices
  ctx.save();
  for (let i = 0; i < n; i++) {
    const a0 = i * seg + ov.angle;
    const a1 = a0 + seg;
    ctx.beginPath();
    ctx.moveTo(cx, wy);
    ctx.arc(cx, wy, R, a0, a1);
    ctx.closePath();
    ctx.fillStyle = hexA(segs[i].c, 0.85);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.25)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // label
    const am = a0 + seg / 2;
    ctx.save();
    ctx.translate(cx + Math.cos(am) * R * 0.64, wy + Math.sin(am) * R * 0.64);
    ctx.rotate(am + Math.PI / 2);
    ctx.fillStyle = '#0a0720';
    ctx.font = "800 13px 'Unbounded', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(segs[i].label, 0, 0);
    ctx.restore();
  }
  // hub
  ctx.beginPath();
  ctx.arc(cx, wy, R * 0.14, 0, TAU);
  ctx.fillStyle = '#1a1140';
  ctx.fill();
  ctx.strokeStyle = '#ffd24a';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // top pointer
  ctx.save();
  ctx.fillStyle = '#ffd24a';
  ctx.shadowColor = '#ffd24a';
  ctx.shadowBlur = glowFX(8);
  ctx.beginPath();
  ctx.moveTo(cx, wy - R + 2);
  ctx.lineTo(cx - 11, wy - R - 16);
  ctx.lineTo(cx + 11, wy - R - 16);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  const bw = p.w * 0.6;
  const bx = cx - bw / 2;
  const by = p.y + p.h - 70;
  if (ov.spun && !ov.spinning) {
    if (ov.wheelCoins > 0) text('+' + ov.wheelCoins + ' ◎', cx, by - 30, 22, '#ffd24a', 800, 10, 'center', "'Unbounded'");
    else text(Wheel.bonusAvailable() ? 'Free spin used — one bonus spin left' : 'Come back tomorrow for a free spin',
      cx, by - 28, 12, '#9fb0e0', 700, 0);
    if (Wheel.bonusAvailable()) {
      // opt-in rewarded extra spin (once/day) alongside CONTINUE
      const fullW = p.w * 0.82;
      const fbx = cx - fullW / 2;
      const half = (fullW - 10) / 2;
      actionButton('wheelbonus', fbx, by, half, 50, adVerb() + ' +1', '#ffd24a', '#3a2400',
        () => rewarded(() => { const r = Wheel.spinBonus(); startSpinAnim(r.idx, r.coins); }));
      actionButton('wheelok', fbx + half + 10, by, half, 50, 'CONTINUE', '#cdb4ff', '#1a1140', () => closeOverlay());
    } else {
      actionButton('wheelok', bx, by, bw, 50, 'CONTINUE', '#cdb4ff', '#1a1140', () => closeOverlay());
    }
  } else if (ov.spinning) {
    actionButton('wheelspin', bx, by, bw, 50, 'SPINNING…', '#cdb4ff', '#1a1140', () => { /* busy */ }, false);
  } else {
    actionButton('wheelspin', bx, by, bw, 50, 'SPIN', '#ffd24a', '#3a2400', () => {
      const res = Wheel.spin();
      startSpinAnim(res.idx, res.coins);
    });
  }
  absorber();
}

/* Start (or restart, for a bonus spin) the wheel deceleration animation so it
   lands on `idx` under the top pointer. Coins are already granted by the caller. */
function startSpinAnim(idx: number, coins: number): void {
  const seg = TAU / WHEEL_SEGMENTS.length;
  ov.wheelCoins = coins;
  ov.spun = false;
  ov.spinning = true;
  ov.spinT = 0;
  ov.startAngle = ov.angle;
  const am = idx * seg + seg / 2;
  const align = posMod((-Math.PI / 2 - am) - ov.startAngle, TAU);
  ov.finalAngle = ov.startAngle + 4 * TAU + align;
  SFX.click();
  buzz(10);
}

/* ----------------------------------- CHEST ----------------------------------- */
function drawChest(dt: number): void {
  const { ctx, W, H } = view;
  const p = drawPanel();
  const cx = W / 2;
  text('BONUS CHEST', cx, p.y + 34, 22, '#ffd24a', 800, 12, 'center', "'Unbounded'");
  text(Chest.count + ' chest' + (Chest.count === 1 ? '' : 's') + ' ready', cx, p.y + 60, 11, '#9fb0e0', 700, 0);

  const chy = p.y + 150;
  const lift = ov.opening ? Math.min(1, ov.openT / 0.4) : (ov.opened ? 1 : 0);
  if (ov.opening) {
    ov.openT += dt;
    if (ov.openT >= 0.45 && !ov.opened) {
      ov.opened = true;
      ov.opening = false;
      SFX.chaching();
      cymbal(0.5);
      buzz([30, 50, 30, 50]);
      Confetti.rain(54);
      const b = bankXY();
      FlyCoins.send(cx, chy, 16, b.x, b.y);
      Coins.spawn(cx, chy - 10, 16, { fountain: true, up: 160 });
      Shock.ring(cx, chy, '#ffd24a', { r0: 20, r1: Math.max(W, H) * 0.7, lw: 5, life: 0.6 });
      Sparkles.scatter(22, '#ffd24a');
    }
  }

  // chest drawing
  const bw0 = 96;
  const bh0 = 64;
  ctx.save();
  // body
  rr(cx - bw0 / 2, chy - bh0 / 2, bw0, bh0, 8);
  ctx.fillStyle = '#7a4a18';
  ctx.fill();
  ctx.strokeStyle = '#ffd24a';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#ffd24a';
  ctx.shadowBlur = glowFX(opened() ? 16 : 8);
  ctx.stroke();
  ctx.shadowBlur = 0;
  // lid (lifts/rotates on open)
  ctx.save();
  ctx.translate(cx - bw0 / 2, chy - bh0 / 2);
  ctx.rotate(-lift * 0.5);
  rr(0, -16, bw0, 20, 8);
  ctx.fillStyle = '#9a6024';
  ctx.fill();
  ctx.strokeStyle = '#ffd24a';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
  // lock
  if (!opened()) {
    ctx.fillStyle = '#ffd24a';
    rr(cx - 6, chy - 6, 12, 14, 3);
    ctx.fill();
  } else {
    // inner glow
    ctx.fillStyle = hexA('#fff3b0', 0.5 + Math.sin(ov.t * 6) * 0.2);
    ctx.beginPath();
    ctx.arc(cx, chy - 6, 10, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  const bw = p.w * 0.6;
  const bx = cx - bw / 2;
  const by = p.y + p.h - 70;
  if (ov.opened) {
    text('+' + ov.chestCoins + ' ◎', cx, by - 30, 24, '#ffd24a', 800, 12, 'center', "'Unbounded'");
    const hasNext = Chest.count > 0;
    const nextLabel = hasNext ? 'OPEN NEXT (' + Chest.count + ')' : 'CONTINUE';
    const nextCol = hasNext ? '#ffd24a' : '#9be35a';
    const nextDark = hasNext ? '#3a2400' : '#04130a';
    const nextAct = hasNext ? () => startOpen() : () => closeOverlay();
    if (!ov.chestDoubled) {
      // opt-in rewarded 2× on this chest, alongside the next action
      const fullW = p.w * 0.82;
      const fbx = cx - fullW / 2;
      const half = (fullW - 10) / 2;
      actionButton('chest2x', fbx, by, half, 50, adVerb() + ' 2×', '#ff9b50', '#3a1400', () => rewarded(() => {
        Profile.addCoins(ov.chestCoins);
        ov.chestCoins *= 2;
        ov.chestDoubled = true;
        SFX.chaching();
        cymbal(0.4);
        buzz([20, 40, 20]);
        Confetti.rain(36);
        const b = bankXY();
        FlyCoins.send(cx, view.H * 0.5, 12, b.x, b.y);
      }));
      actionButton('chestnext', fbx + half + 10, by, half, 50, nextLabel, nextCol, nextDark, nextAct);
    } else {
      actionButton('chestnext', bx, by, bw, 50, nextLabel, nextCol, nextDark, nextAct);
    }
  } else if (ov.opening) {
    actionButton('chestbusy', bx, by, bw, 50, 'OPENING…', '#ffd24a', '#3a2400', () => { /* busy */ }, false);
  } else if (Chest.count > 0) {
    actionButton('chestopen', bx, by, bw, 50, 'OPEN', '#ffd24a', '#3a2400', () => startOpen());
  } else {
    text('Complete all daily missions to earn a chest', cx, by - 26, 11, '#9fb0e0', 700, 0);
    actionButton('chestok', bx, by, bw, 50, 'CONTINUE', '#cdb4ff', '#1a1140', () => closeOverlay());
  }
  absorber();
}

function opened(): boolean {
  return ov.opened || ov.opening;
}

function startOpen(): void {
  if (Chest.count <= 0) return;
  const r = Chest.open();
  ov.chestCoins = r.coins;
  ov.opening = true;
  ov.opened = false;
  ov.openT = 0;
  ov.chestDoubled = false;
  SFX.click();
  buzz(12);
}

export function drawOverlay(dt: number): void {
  if (ov.kind === 'none') return;
  ov.t += dt;
  dimVoid(0.78);
  // celebratory FX render over the dim
  Confetti.draw();
  Coins.draw();
  FlyCoins.draw();
  Shock.draw();
  Sparkles.draw();
  if (ov.kind === 'login') drawLogin();
  else if (ov.kind === 'wheel') drawWheel(dt);
  else if (ov.kind === 'chest') drawChest(dt);
  // transient "ad unavailable" feedback so a failed rewarded tap isn't silent
  if (ov.adMsgT > 0) {
    ov.adMsgT -= dt;
    const { W, H } = view;
    text('Ad unavailable — please try again', W / 2, H * 0.9, 12, '#ff9b50', 700, 6);
  }
}
