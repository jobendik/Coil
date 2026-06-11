import { view } from '../core/canvas';
import { Profile } from '../game/profile';
import { Weekly } from '../game/weekly';
import { Season } from '../game/season';
import { Login, Wheel, Chest, LOGIN_REWARDS, WHEEL_SEGMENTS } from '../game/rewards';
import { WEEKLY_ACTIVITY_DAYS } from '../config';
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

export type Overlay = 'none' | 'login' | 'wheel' | 'chest' | 'weekly' | 'help';

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
  chestShards: 0,
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
  // Clear last session's reward amounts so reopening can't flash a stale "+N ◎"
  // for a spin/chest that was already banked.
  ov.wheelCoins = 0;
  ov.chestCoins = 0;
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
  const { ctx, S } = view;
  rr(x, y, w, h, 14 * S);
  if (enabled) {
    ctx.fillStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.shadowBlur = 0;
    text(label, x + w / 2, y + h / 2, 17 * S, dark, 800, 0, 'center', "'Unbounded'");
    btn(key, x, y, w, h, act);
  } else {
    ctx.fillStyle = 'rgba(20,16,48,.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.14)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    text(label, x + w / 2, y + h / 2, 14 * S, '#7e88b5', 800, 0, 'center', "'Unbounded'");
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
  const { ctx, W, S } = view;
  const p = drawPanel();
  const cx = W / 2;
  text('DAILY BONUS', cx, p.y + 34 * S, 22 * S, '#ffe39b', 800, 12, 'center', "'Unbounded'");
  const pend = Login.pendingDay();
  text(ov.loginDone ? 'See you tomorrow!' : 'Day ' + pend + '  ·  come back daily for more',
    cx, p.y + 60 * S, 11 * S, '#9fb0e0', 700, 0);

  // 7-day calendar strip
  const cells = LOGIN_REWARDS.length;
  const gap = 7;
  const stripW = p.w - 40 * S;
  const cw = (stripW - gap * (cells - 1)) / cells;
  const cy = p.y + 90 * S;
  const chh = 56 * S;
  for (let i = 0; i < cells; i++) {
    const day = i + 1;
    const x = p.x + 20 * S + i * (cw + gap);
    const claimed = day < pend || (ov.loginDone && day <= ov.loginDay);
    const isToday = day === pend && !ov.loginDone;
    rr(x, cy, cw, chh, 10 * S);
    ctx.fillStyle = isToday ? hexA('#ffd24a', 0.18) : claimed ? 'rgba(149,227,90,.12)' : 'rgba(255,255,255,.05)';
    ctx.fill();
    rr(x, cy, cw, chh, 10 * S);
    ctx.lineWidth = isToday ? 2 : 1;
    ctx.strokeStyle = isToday ? '#ffd24a' : claimed ? 'rgba(149,227,90,.4)' : 'rgba(255,255,255,.08)';
    if (isToday) { ctx.shadowColor = '#ffd24a'; ctx.shadowBlur = glowFX(10); }
    ctx.stroke();
    ctx.shadowBlur = 0;
    text('D' + day, x + cw / 2, cy + chh * 0.25, 9 * S, claimed ? '#9be35a' : isToday ? '#ffd24a' : '#8a93bf', 800, 0);
    if (claimed) {
      ctx.strokeStyle = '#9be35a';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x + cw / 2 - 5 * S, cy + chh * 0.61); ctx.lineTo(x + cw / 2 - 1 * S, cy + chh * 0.68); ctx.lineTo(x + cw / 2 + 6 * S, cy + chh * 0.54);
      ctx.stroke();
    } else {
      text('◎' + LOGIN_REWARDS[i], x + cw / 2, cy + chh * 0.64, 10 * S, isToday ? '#ffe39b' : '#9fb0e0', 800, 0);
    }
  }

  // reward headline
  if (ov.loginDone) {
    text('+' + ov.loginReward + ' ◎', cx, cy + chh + 44 * S, 30 * S, '#ffd24a', 800, 14, 'center', "'Unbounded'");
  } else {
    text('TODAY: +' + Login.rewardFor(pend) + ' ◎', cx, cy + chh + 44 * S, 22 * S, '#ffe39b', 800, 10, 'center', "'Unbounded'");
  }

  const bw = p.w * 0.6;
  const bx = cx - bw / 2;
  const by = p.y + p.h - 70 * S;
  if (ov.loginDone) {
    actionButton('loginok', bx, by, bw, 50 * S, 'CONTINUE', '#9be35a', '#04130a', () => closeOverlay());
  } else {
    actionButton('loginclaim', bx, by, bw, 50 * S, 'CLAIM', '#ffd24a', '#3a2400', () => {
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
  const { ctx, W, H, S } = view;
  const p = drawPanel();
  const cx = W / 2;
  text('DAILY SPIN', cx, p.y + 34 * S, 22 * S, '#cdb4ff', 800, 12, 'center', "'Unbounded'");

  const segs = WHEEL_SEGMENTS;
  const n = segs.length;
  const seg = TAU / n;
  // Radius is capped to the panel HEIGHT too, so on a short modal the wheel never
  // grows into the SPIN button beneath it.
  const R = Math.min(p.w * 0.36, 128, p.h * 0.32);
  const wy = p.y + 56 * S + R;

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
  const by = p.y + p.h - 70 * S;
  if (ov.spun && !ov.spinning) {
    if (ov.wheelCoins > 0) text('+' + ov.wheelCoins + ' ◎', cx, by - 30 * S, 22 * S, '#ffd24a', 800, 10, 'center', "'Unbounded'");
    else text(Wheel.bonusAvailable() ? 'Free spin used — one bonus spin left' : 'Come back tomorrow for a free spin',
      cx, by - 28 * S, 12 * S, '#9fb0e0', 700, 0);
    if (Wheel.bonusAvailable()) {
      // opt-in rewarded extra spin (once/day) alongside CONTINUE
      const fullW = p.w * 0.82;
      const fbx = cx - fullW / 2;
      const half = (fullW - 10) / 2;
      actionButton('wheelbonus', fbx, by, half, 50 * S, adVerb() + ' +1', '#ffd24a', '#3a2400',
        () => rewarded(() => { const r = Wheel.spinBonus(); startSpinAnim(r.idx, r.coins); }));
      actionButton('wheelok', fbx + half + 10, by, half, 50 * S, 'CONTINUE', '#cdb4ff', '#1a1140', () => closeOverlay());
    } else {
      actionButton('wheelok', bx, by, bw, 50 * S, 'CONTINUE', '#cdb4ff', '#1a1140', () => closeOverlay());
    }
  } else if (ov.spinning) {
    actionButton('wheelspin', bx, by, bw, 50 * S, 'SPINNING…', '#cdb4ff', '#1a1140', () => { /* busy */ }, false);
  } else {
    actionButton('wheelspin', bx, by, bw, 50 * S, 'SPIN', '#ffd24a', '#3a2400', () => {
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
  const { ctx, W, H, S } = view;
  const p = drawPanel();
  const cx = W / 2;
  text('BONUS CHEST', cx, p.y + 34 * S, 22 * S, '#ffd24a', 800, 12, 'center', "'Unbounded'");
  text(Chest.count + ' chest' + (Chest.count === 1 ? '' : 's') + ' ready', cx, p.y + 60 * S, 11 * S, '#9fb0e0', 700, 0);

  const chy = p.y + p.h * 0.42;
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
  const bw0 = 96 * S;
  const bh0 = 64 * S;
  ctx.save();
  // body
  rr(cx - bw0 / 2, chy - bh0 / 2, bw0, bh0, 8 * S);
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
  rr(0, -16 * S, bw0, 20 * S, 8 * S);
  ctx.fillStyle = '#9a6024';
  ctx.fill();
  ctx.strokeStyle = '#ffd24a';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
  // lock
  if (!opened()) {
    ctx.fillStyle = '#ffd24a';
    rr(cx - 6 * S, chy - 6 * S, 12 * S, 14 * S, 3 * S);
    ctx.fill();
  } else {
    // inner glow
    ctx.fillStyle = hexA('#fff3b0', 0.5 + Math.sin(ov.t * 6) * 0.2);
    ctx.beginPath();
    ctx.arc(cx, chy - 6 * S, 10 * S, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  const bw = p.w * 0.6;
  const bx = cx - bw / 2;
  const by = p.y + p.h - 70 * S;
  if (ov.opened) {
    text('+' + ov.chestCoins + ' ◎' + (ov.chestShards > 0 ? '   +' + ov.chestShards + ' ◈' : ''),
      cx, by - 30 * S, 22 * S, '#ffd24a', 800, 12, 'center', "'Unbounded'");
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
      actionButton('chest2x', fbx, by, half, 50 * S, adVerb() + ' 2×', '#ff9b50', '#3a1400', () => rewarded(() => {
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
      actionButton('chestnext', fbx + half + 10, by, half, 50 * S, nextLabel, nextCol, nextDark, nextAct);
    } else {
      actionButton('chestnext', bx, by, bw, 50 * S, nextLabel, nextCol, nextDark, nextAct);
    }
  } else if (ov.opening) {
    actionButton('chestbusy', bx, by, bw, 50 * S, 'OPENING…', '#ffd24a', '#3a2400', () => { /* busy */ }, false);
  } else if (Chest.count > 0) {
    actionButton('chestopen', bx, by, bw, 50 * S, 'OPEN', '#ffd24a', '#3a2400', () => startOpen());
  } else {
    text('Complete all daily missions to earn a chest', cx, by - 26 * S, 11 * S, '#9fb0e0', 700, 0);
    actionButton('chestok', bx, by, bw, 50 * S, 'CONTINUE', '#cdb4ff', '#1a1140', () => closeOverlay());
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
  ov.chestShards = r.shards;
  ov.opening = true;
  ov.opened = false;
  ov.openT = 0;
  ov.chestDoubled = false;
  SFX.click();
  buzz(12);
}

/* ----------------------------------- WEEKLY ORDERS ----------------------------------- */
function drawWeekly(): void {
  const { ctx, W, H, S } = view;
  // A taller dedicated panel (5 orders + activity meter need more room than the
  // shared reward panel gives). Height is also bounded to the usable viewport so
  // it never spills past the safe area on a short screen.
  const w = Math.min(W * 0.9, 460);
  const h = Math.min(H * 0.84, 580, H - view.SAFE_TOP - view.SAFE_BOTTOM - 16);
  const p = { x: W / 2 - w / 2, y: (H - h) / 2, w, h };
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

  const cx = W / 2;
  text('WEEKLY ORDERS', cx, p.y + 32 * S, 21 * S, '#9be35a', 800, 12, 'center', "'Unbounded'");
  text('Climb any ' + WEEKLY_ACTIVITY_DAYS + ' days this week · streak-friendly', cx, p.y + 56 * S, 10.5 * S, '#9fb0e0', 700, 0);

  // activity dots
  const days = Weekly.activityDays();
  const dotN = WEEKLY_ACTIVITY_DAYS;
  const dotGap = 26 * S;
  const dotY = p.y + 86 * S;
  const dotX0 = cx - ((dotN - 1) * dotGap) / 2;
  for (let i = 0; i < dotN; i++) {
    const on = i < days;
    ctx.beginPath();
    ctx.arc(dotX0 + i * dotGap, dotY, 7 * S, 0, TAU);
    ctx.fillStyle = on ? '#9be35a' : 'rgba(255,255,255,.12)';
    if (on) { ctx.shadowColor = '#9be35a'; ctx.shadowBlur = glowFX(8); }
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  text(Weekly.d.chestClaimed ? 'Activity chest earned ✓' : days + '/' + dotN + ' days · ' + (dotN - days) + ' to a chest',
    cx, dotY + 22 * S, 10 * S, Weekly.d.chestClaimed ? '#9be35a' : '#ffe39b', 700, 0);

  // 5 order rows
  const ms = Weekly.missions();
  const listTop = p.y + 128 * S;
  const listBot = p.y + p.h - 96 * S;
  const rowH = (listBot - listTop) / ms.length;
  const lx = p.x + 26 * S;
  const lw = p.w - 52 * S;
  for (let i = 0; i < ms.length; i++) {
    const m = ms[i];
    const go = Weekly.goalFor(m);
    const y = listTop + i * rowH + rowH / 2;
    const pct = clamp(m.prog / go.t, 0, 1);
    const c = m.done ? '#9be35a' : '#2ff3e0';
    text((m.done ? '✓ ' : '') + go.text(go.t), lx, y - 7 * S, 11.5 * S, m.done ? '#9be35a' : '#dfe7ff', 600, 0, 'left');
    text(m.done ? '+' + go.reward + ' ◎' : Math.min(m.prog, go.t) + '/' + go.t,
      lx + lw, y - 7 * S, 10.5 * S, m.done ? '#9be35a' : '#ffe39b', 800, 0, 'right');
    rr(lx, y + 6 * S, lw, 5 * S, 3 * S);
    ctx.fillStyle = 'rgba(255,255,255,.07)';
    ctx.fill();
    rr(lx, y + 6 * S, lw * pct, 5 * S, 3 * S);
    ctx.fillStyle = c;
    if (!m.done) { ctx.shadowColor = c; ctx.shadowBlur = glowFX(5); }
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Elite Track status — the honest "earned premium track" (M8).
  const eliteY = p.y + p.h - 78 * S;
  if (Season.d.eliteUnlocked) {
    text('★ ELITE TRACK UNLOCKED — claim it in SEASON', cx, eliteY, 11 * S, '#ffd24a', 800, 8);
  } else {
    text('Complete all 5 to unlock the season ELITE TRACK', cx, eliteY, 10.5 * S, '#cdb4ff', 700, 0);
  }

  const bw = p.w * 0.6;
  actionButton('weeklyok', cx - bw / 2, p.y + p.h - 62 * S, bw, 48 * S, 'CONTINUE', '#9be35a', '#04130a', () => closeOverlay());
  absorber();
}

/* ----------------------------------- HELP -----------------------------------
   "How to play" — a reviewable home-screen surface for the rules the one-shot
   in-run tutorial teaches. Three illustrated rows, drawn with the game's real
   colours so each diagram matches what the player will actually see in-run. */
function drawHelp(): void {
  const { ctx, W, S } = view;
  const p = drawPanel();
  const cx = W / 2;
  text('HOW TO PLAY', cx, p.y + 34 * S, 21 * S, '#fff', 800, 12, 'center', "'Unbounded'");
  text('One tap. Perfect timing. Endless climb.', cx, p.y + 58 * S, 10.5 * S, '#9fb0e0', 700, 0);

  const rows: Array<{ glyph: 'orbit' | 'gate' | 'void'; head: string; body: string }> = [
    { glyph: 'orbit', head: 'TAP TO FLING',     body: 'You orbit a gate — tap to launch upward.' },
    { glyph: 'gate',  head: 'HIT THE BRIGHT ARC', body: 'Release inside it for a PERFECT — chain combos.' },
    { glyph: 'void',  head: 'OUTRUN THE VOID',  body: 'It rises forever. Catch any gate to keep climbing.' },
  ];
  const listTop = p.y + 84 * S;
  const listBot = p.y + p.h - 104 * S;
  const rowH = (listBot - listTop) / rows.length;
  const gx = p.x + 46 * S;             // glyph centre
  const tx = p.x + 84 * S;             // text column
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const y = listTop + i * rowH + rowH / 2;
    ctx.save();
    ctx.lineCap = 'round';
    if (r.glyph === 'orbit') {
      // node + orbiting orb (animated, like the real orbit)
      ctx.strokeStyle = 'rgba(255,255,255,.25)';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(gx, y, 16 * S, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#ffd24a';
      ctx.shadowColor = '#ffd24a';
      ctx.shadowBlur = glowFX(8);
      ctx.beginPath(); ctx.arc(gx, y, 5 * S, 0, TAU); ctx.fill();
      const a = ov.t * 2.7;
      ctx.fillStyle = '#2ff3e0';
      ctx.shadowColor = '#2ff3e0';
      ctx.beginPath(); ctx.arc(gx + Math.cos(a) * 16 * S, y + Math.sin(a) * 16 * S, 4 * S, 0, TAU); ctx.fill();
    } else if (r.glyph === 'gate') {
      // dim ring with the bright "perfect" arc, exactly like the in-run gate
      ctx.strokeStyle = 'rgba(255,255,255,.22)';
      ctx.lineWidth = 3 * S;
      ctx.beginPath(); ctx.arc(gx, y, 15 * S, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#ffd24a';
      ctx.shadowColor = '#ffd24a';
      ctx.shadowBlur = glowFX(10);
      ctx.lineWidth = 4 * S;
      const pu = 0.5 + 0.5 * Math.sin(ov.t * 4);
      ctx.globalAlpha = 0.7 + pu * 0.3;
      ctx.beginPath(); ctx.arc(gx, y, 15 * S, -Math.PI * 0.72, -Math.PI * 0.28); ctx.stroke();
    } else {
      // rising void: a red-hot band creeping up under a fleeing orb
      const vw = 30 * S;
      const vh = 26 * S;
      const g = ctx.createLinearGradient(0, y + vh / 2, 0, y - vh * 0.1);
      g.addColorStop(0, 'rgba(255,59,92,.9)');
      g.addColorStop(1, 'rgba(255,59,92,0)');
      ctx.fillStyle = g;
      ctx.fillRect(gx - vw / 2, y - vh * 0.1, vw, vh * 0.6);
      ctx.fillStyle = '#2ff3e0';
      ctx.shadowColor = '#2ff3e0';
      ctx.shadowBlur = glowFX(8);
      const bob = Math.sin(ov.t * 3) * 2 * S;
      ctx.beginPath(); ctx.arc(gx, y - vh * 0.32 + bob, 4 * S, 0, TAU); ctx.fill();
    }
    ctx.restore();
    text(r.head, tx, y - 8 * S, 11.5 * S, '#fff', 800, 0, 'left', "'Unbounded'");
    text(r.body, tx, y + 9 * S, 10 * S, '#9fb0e0', 600, 0, 'left');
  }

  text('DESKTOP  ·  SPACE to fling  ·  ESC / P to pause', cx, p.y + p.h - 80 * S, 9.5 * S, '#7e88b5', 700, 0);
  const bw = p.w * 0.6;
  actionButton('helpok', cx - bw / 2, p.y + p.h - 62 * S, bw, 48 * S, 'GOT IT', '#2ff3e0', '#04130f', () => closeOverlay());
  absorber();
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
  else if (ov.kind === 'weekly') drawWeekly();
  else if (ov.kind === 'help') drawHelp();
  // transient "ad unavailable" feedback so a failed rewarded tap isn't silent.
  // Anchored just BELOW the panel — a fixed H*0.9 sat on top of the panel's
  // action buttons on short screens (panel bottom reaches H*0.78).
  if (ov.adMsgT > 0) {
    ov.adMsgT -= dt;
    const { W } = view;
    const p = panel();
    text('Ad unavailable — please try again', W / 2, p.y + p.h + 22, 12, '#ff9b50', 700, 6);
  }
}
