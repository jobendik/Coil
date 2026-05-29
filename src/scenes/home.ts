import { view } from '../core/canvas';
import { state } from '../game/state';
import { skin, Owned } from '../game/skins';
import { Profile } from '../game/profile';
import { Daily } from '../game/daily';
import { DailyRun } from '../game/dailyrun';
import { Vault } from '../game/vault';
import { glowFX, TAU, clamp, rr, text } from '../core/utils';
import { btn } from '../core/ui';
import { Telemetry } from '../core/telemetry';
import { drawBG, drawTopToggles } from './play';
import { MILESTONES, SKINS } from '../config';

let onPlayRequested: () => void = () => { /* injected by main.ts */ };
export function setPlayHandler(fn: () => void): void {
  onPlayRequested = fn;
}

let onDailyRequested: () => void = () => { /* injected by main.ts */ };
export function setDailyHandler(fn: () => void): void {
  onDailyRequested = fn;
}

let onZenRequested: () => void = () => { /* injected by main.ts */ };
export function setZenHandler(fn: () => void): void {
  onZenRequested = fn;
}

function nextGoalLine(): string {
  if (!Daily.allDone()) return "Complete today's missions";
  const nm = MILESTONES.find((m) => m > Profile.best);
  if (nm && Profile.best >= nm * 0.6) return 'Reach ' + nm + ' m';
  if (Profile.best > 0) return 'Beat your best: ' + Profile.best + ' m';
  const ns = SKINS.find((s) => !Owned.includes(s.id) && !s.req);
  if (ns) return 'Unlock ' + ns.name;
  return 'Climb as high as you can';
}

let homeT = 0;

export function renderHome(dt: number): void {
  const { ctx, W, H } = view;
  homeT += dt;
  drawBG();
  const cx = W / 2;
  const cy = H * 0.32;
  const sk = skin();
  const ang = homeT * 1.6;
  const R = 64;

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,.08)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.stroke();
  ctx.restore();

  // a hint of the gate on the home logo
  ctx.save();
  ctx.strokeStyle = sk.t;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.shadowColor = sk.t;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(cx, cy, R, -0.5, 0.5);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = sk.c;
  ctx.shadowColor = sk.c;
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(cx, cy, 14, 0, TAU);
  ctx.fill();
  ctx.restore();

  const px = cx + Math.cos(ang) * R;
  const py = cy + Math.sin(ang) * R;
  ctx.save();
  ctx.strokeStyle = sk.c;
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(px, py);
  ctx.stroke();
  ctx.restore();

  const face = ang + Math.PI / 2;
  ctx.save();
  ctx.translate(px, py);
  ctx.fillStyle = sk.c;
  ctx.shadowColor = sk.c;
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, TAU);
  ctx.fill();
  const ex = Math.cos(face);
  const ey = Math.sin(face);
  for (const o of [-1, 1]) {
    const ox = ey * o * 3;
    const oy = -ex * o * 3;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ox + ex * 2, oy + ey * 2, 2.4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#0a0720';
    ctx.beginPath();
    ctx.arc(ox + ex * 3, oy + ey * 3, 1.2, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  text('COIL', cx, cy - 118, 64, '#fff', 800, 26, 'center', "'Unbounded'");
  text('Tap in the glowing gate · climb the void', cx, cy - 76, 13, '#9fb0e0', 600, 0);

  // STAR VAULT ticker — a slow long-term carrot (won by a bonus catch at high combo)
  {
    const vy = H * 0.43;
    const pp = 0.6 + Math.sin(homeT * 3) * 0.4;
    ctx.save();
    ctx.fillStyle = '#ffd24a';
    ctx.font = "800 10px 'Unbounded', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ffd24a';
    ctx.shadowBlur = glowFX(10 + pp * 6);
    ctx.fillText('✦ STAR VAULT ✦', cx, vy);
    ctx.font = "800 18px 'Unbounded', sans-serif";
    ctx.fillStyle = '#fff3b0';
    ctx.shadowBlur = glowFX(16 + pp * 8);
    ctx.fillText('★ ' + Math.round(Vault.v).toLocaleString(), cx, vy + 18);
    ctx.restore();
  }

  const lp = Profile.levelProgress();
  text('BEST  ' + Profile.best + ' m', cx, H * 0.485, 22, sk.t, 700, 8);
  text(Profile.title() + '  ·  Level ' + lp.l, cx, H * 0.485 + 20, 12, '#9fb0e0', 600, 0);

  // Streak + first-run-of-day badges — the single biggest return-day driver.
  // We center one or two pills horizontally so neither falls into the mission
  // rows below; pills are skipped entirely when not applicable.
  const showStreak = Profile.streak >= 2;
  const showBonus = !Profile.hasPlayedToday();
  if (showStreak || showBonus) {
    const pillY = H * 0.48 + 46;
    if (showStreak && showBonus) {
      text('🔥 ' + Profile.streak + '-DAY', cx - 62, pillY, 11, '#ff9b50', 800, 4, 'center');
      text('2× FIRST RUN', cx + 62, pillY, 11, '#ffe39b', 800, 4, 'center');
    } else if (showStreak) {
      text('🔥 ' + Profile.streak + '-DAY STREAK', cx, pillY, 11, '#ff9b50', 800, 4, 'center');
    } else {
      text('2× COINS  ·  FIRST RUN', cx, pillY, 11, '#ffe39b', 800, 4, 'center');
    }
  }

  // Three compact mission rows
  const bx = W * 0.10;
  const bw = W * 0.80;
  const rowY = H * 0.60;
  const rowH = 26;
  const missions = Daily.missions();
  ctx.textBaseline = 'middle';
  ctx.font = "700 10px 'Sora'";
  ctx.textAlign = 'left';
  ctx.fillStyle = '#8a93bf';
  ctx.fillText('DAILY MISSIONS', bx, rowY - 12);
  ctx.textAlign = 'right';
  ctx.fillStyle = Daily.allDone() ? '#9be35a' : '#ffe39b';
  const completedCount = missions.filter((m) => m.done).length;
  ctx.fillText(completedCount + ' / ' + missions.length, bx + bw, rowY - 12);
  for (let i = 0; i < missions.length; i++) {
    const m = missions[i];
    const g = Daily.goalFor(m);
    const y = rowY + i * rowH;
    const pct = clamp(m.prog / g.t, 0, 1);
    // text
    ctx.textAlign = 'left';
    ctx.font = "600 11px 'Sora'";
    ctx.fillStyle = m.done ? '#9be35a' : '#dfe7ff';
    ctx.fillText((m.done ? '✓ ' : '') + g.text(g.t), bx, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = m.done ? '#9be35a' : '#ffe39b';
    ctx.fillText(m.done ? '+' + g.reward + ' ◎' : Math.min(m.prog, g.t) + '/' + g.t, bx + bw, y);
    // bar
    rr(bx, y + 10, bw, 5, 3);
    ctx.fillStyle = 'rgba(255,255,255,.07)';
    ctx.fill();
    rr(bx, y + 10, bw * pct, 5, 3);
    ctx.fillStyle = m.done ? '#9be35a' : (g.tier === 'hard' ? '#ff4d8d' : g.tier === 'med' ? '#2ff3e0' : '#9be35a');
    ctx.fill();
  }

  text('NEXT  ·  ' + nextGoalLine(), cx, H * 0.74, 12, '#ffe39b', 700, 6);

  const pw = W * 0.62;
  const ph = 60;
  const pxx = W / 2 - pw / 2;
  // Lift the PLAY + secondary row clear of the home-indicator safe area.
  const pyy = H * 0.79 - view.SAFE_BOTTOM;
  const pulse = 1 + Math.sin(homeT * 3) * 0.02;
  ctx.save();
  ctx.translate(W / 2, pyy + ph / 2);
  ctx.scale(pulse, pulse);
  ctx.translate(-W / 2, -(pyy + ph / 2));
  rr(pxx, pyy, pw, ph, 14);
  ctx.fillStyle = sk.c;
  ctx.shadowColor = sk.c;
  ctx.shadowBlur = 22;
  ctx.fill();
  ctx.restore();
  text('PLAY', W / 2, pyy + ph / 2, 22, '#04030a', 800, 0, 'center', "'Unbounded'");
  btn('play', pxx, pyy, pw, ph, () => onPlayRequested());

  // secondary row: DAILY ✦ · ZEN · COLLECTION (three equal columns)
  const sw = W * 0.8;
  const sh = 46;
  const sxx = W / 2 - sw / 2;
  const syy = pyy + ph + 12;
  const sgap = 8;
  const third = (sw - sgap * 2) / 3;
  const dx = sxx;
  const zx = sxx + third + sgap;
  const cx2 = sxx + (third + sgap) * 2;
  const dm = DailyRun.topMedal();
  const fresh = !DailyRun.played();

  // DAILY
  rr(dx, syy, third, sh, 12);
  ctx.fillStyle = 'rgba(20,16,48,.7)';
  ctx.fill();
  ctx.strokeStyle = fresh ? '#ffd24a' : (dm ? dm.c : 'rgba(255,255,255,.12)');
  ctx.lineWidth = 1.5;
  if (fresh) { ctx.shadowColor = '#ffd24a'; ctx.shadowBlur = glowFX(8 + Math.sin(homeT * 4) * 4); }
  ctx.stroke();
  ctx.shadowBlur = 0;
  text('DAILY ✦', dx + third / 2, syy + 15, 12, fresh ? '#ffd24a' : '#fff', 800, fresh ? 5 : 0);
  text(DailyRun.played() ? 'Best ' + DailyRun.d.best + ' m' : 'New today!',
    dx + third / 2, syy + 31, 9, '#9fb0e0', 600, 0);
  btn('daily', dx, syy, third, sh, () => onDailyRequested());

  // ZEN — the calm, unkillable mode
  rr(zx, syy, third, sh, 12);
  ctx.fillStyle = 'rgba(20,16,48,.7)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(149,227,90,.45)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text('ZEN', zx + third / 2, syy + 15, 13, '#9be35a', 800, 0);
  text('No fail · relax', zx + third / 2, syy + 31, 9, '#9fb0e0', 600, 0);
  btn('zen', zx, syy, third, sh, () => onZenRequested());

  // COLLECTION
  rr(cx2, syy, third, sh, 12);
  ctx.fillStyle = 'rgba(20,16,48,.7)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.12)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text('SHOP', cx2 + third / 2, syy + 15, 12, sk.t, 700, 0);
  text('◎ ' + Profile.coins, cx2 + third / 2, syy + 31, 9, '#ffe39b', 700, 0);
  btn('shop', cx2, syy, third, sh, () => {
    Telemetry.shopOpen();
    state.scene = 'shop';
  });

  drawTopToggles();
}
