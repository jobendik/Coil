import { view } from '../core/canvas';
import { state } from '../game/state';
import { skin, Owned } from '../game/skins';
import { Profile } from '../game/profile';
import { Daily } from '../game/daily';
import { TAU, rr, text } from '../core/utils';
import { btn } from '../core/ui';
import { drawBG, drawTopToggles } from './play';
import { MILESTONES, SKINS } from '../config';
import { resetRun } from '../game/state';

function startPlay(): void {
  resetRun();
  state.scene = 'play';
}

function nextGoalLine(): string {
  if (!Daily.d.done) return "Complete today's mission";
  const nm = MILESTONES.find((m) => m > Profile.best);
  if (nm && Profile.best >= nm * 0.6) return 'Reach ' + nm + ' m';
  if (Profile.best > 0) return 'Beat your best: ' + Profile.best + ' m';
  const ns = SKINS.find((s) => !Owned.includes(s.id));
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

  const lp = Profile.levelProgress();
  text('BEST  ' + Profile.best + ' m', cx, H * 0.55, 22, sk.t, 700, 8);
  text(Profile.title() + '  ·  Level ' + lp.l, cx, H * 0.55 + 30, 13, '#9fb0e0', 600, 0);

  const dg = Daily.g;
  const bx = W * 0.12;
  const bw = W * 0.76;
  const by = H * 0.625;
  ctx.fillStyle = '#8a93bf';
  ctx.font = "600 11px 'Sora'";
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('DAILY MISSION', bx, by - 4);
  ctx.textAlign = 'right';
  ctx.fillStyle = Daily.d.done ? '#9be35a' : '#ffe39b';
  ctx.fillText(Daily.d.done ? 'COMPLETE ✓' : '+' + dg.reward + ' ◎', bx + bw, by - 4);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#dfe7ff';
  ctx.font = "600 13px 'Sora'";
  ctx.fillText(dg.text(dg.t), bx, by + 16);
  rr(bx, by + 30, bw, 8, 4);
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  ctx.fill();
  rr(bx, by + 30, bw * Daily.pct(), 8, 4);
  ctx.fillStyle = Daily.d.done ? '#9be35a' : '#2ff3e0';
  ctx.fill();

  text('NEXT  ·  ' + nextGoalLine(), cx, H * 0.735, 13, '#ffe39b', 700, 6);

  const pw = W * 0.62;
  const ph = 60;
  const pxx = W / 2 - pw / 2;
  const pyy = H * 0.79;
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
  btn('play', pxx, pyy, pw, ph, () => startPlay());

  const sw = W * 0.62;
  const sh = 46;
  const sxx = W / 2 - sw / 2;
  const syy = pyy + ph + 12;
  rr(sxx, syy, sw, sh, 12);
  ctx.fillStyle = 'rgba(20,16,48,.7)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.12)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text('◎ ' + Profile.coins + '   ·   COLLECTION', W / 2, syy + sh / 2, 15, sk.t, 700, 4);
  btn('shop', sxx, syy, sw, sh, () => {
    state.scene = 'shop';
  });
  drawTopToggles();
}
