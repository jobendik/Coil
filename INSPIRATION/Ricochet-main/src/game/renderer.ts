// =========================================================================
// Canvas renderer
// =========================================================================
import { ctx, W, H } from './canvas.ts';
import { State, balls, projectiles, particles, dust, ambient, player } from './state.ts';
import { TAU, rand, clamp } from '../utils/helpers.ts';
import type { Ball, Particle } from '../types/index.ts';

// ---- Background ----------------------------------------------------------

export function drawBackground(): void {
  ctx.fillStyle = '#15131f';
  ctx.fillRect(0, 0, W, H);

  const grd = ctx.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0,   'rgba(198,255,0,0.018)');
  grd.addColorStop(0.5, 'rgba(0,0,0,0)');
  grd.addColorStop(1,   'rgba(255,45,117,0.025)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  const step = 36;
  for (let x = step / 2; x < W; x += step) {
    for (let y = step / 2; y < H; y += step) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, TAU);
      ctx.fill();
    }
  }

  ctx.strokeStyle = 'rgba(198,255,0,0.07)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(0, H / 2 + 60);
  ctx.lineTo(W, H / 2 + 60);
  ctx.stroke();
}

// ---- Floor ---------------------------------------------------------------

export function drawFloor(): void {
  const fg = ctx.createLinearGradient(0, H - 60, 0, H);
  fg.addColorStop(0, 'rgba(255,255,255,0.01)');
  fg.addColorStop(1, 'rgba(0,0,0,0.4)');
  ctx.fillStyle = fg;
  ctx.fillRect(0, H - 60, W, 60);

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(0, H - 30);
  ctx.lineTo(W, H - 30);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(198,255,0,0.18)';
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.moveTo(20, 30);      ctx.lineTo(20, H - 30);
  ctx.moveTo(W - 20, 30);  ctx.lineTo(W - 20, H - 30);
  ctx.moveTo(20, 30);      ctx.lineTo(W - 20, 30);
  ctx.stroke();

  const cs = 18;
  ctx.strokeStyle = 'rgba(198,255,0,0.4)';
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.moveTo(20, 30 + cs);       ctx.lineTo(20, 30);          ctx.lineTo(20 + cs, 30);
  ctx.moveTo(W - 20 - cs, 30);   ctx.lineTo(W - 20, 30);      ctx.lineTo(W - 20, 30 + cs);
  ctx.moveTo(20, H - 30 - cs);   ctx.lineTo(20, H - 30);      ctx.lineTo(20 + cs, H - 30);
  ctx.moveTo(W - 20 - cs, H - 30); ctx.lineTo(W - 20, H - 30); ctx.lineTo(W - 20, H - 30 - cs);
  ctx.stroke();
}

// ---- Player --------------------------------------------------------------

export function drawPlayer(): void {
  ctx.save();
  ctx.translate(player.x, H * 0.88);

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.ellipse(0, 28, 28, 5, 0, 0, TAU);
  ctx.fill();

  const w = 40, h = 24;
  ctx.shadowColor = 'rgba(198,255,0,0.6)';
  ctx.shadowBlur  = 18;
  ctx.fillStyle   = '#c6ff00';
  ctx.beginPath();
  ctx.moveTo(0, -h);
  ctx.lineTo(w, h);
  ctx.lineTo(-w, h);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#0f0e17';
  ctx.beginPath();
  ctx.moveTo(0, -h + 8);
  ctx.lineTo(w - 10, h - 3);
  ctx.lineTo(-w + 10, h - 3);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#c6ff00';
  ctx.fillRect(-2, -h + 6, 4, h - 2);

  ctx.fillStyle = '#fff';
  ctx.fillRect(-1.5, -h - 3, 3, 5);
  ctx.restore();

  const g = ctx.createLinearGradient(player.x, H * 0.88 - 20, player.x, 50);
  g.addColorStop(0, 'rgba(198,255,0,0.25)');
  g.addColorStop(1, 'rgba(198,255,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(player.x - 0.5, 50, 1, H * 0.88 - 60);
}

// ---- Projectiles ---------------------------------------------------------

export function drawProjectiles(): void {
  for (const p of projectiles) {
    const gradient = ctx.createLinearGradient(p.x, H * 0.88, p.x, p.y);
    gradient.addColorStop(0, 'rgba(198,255,0,0)');
    gradient.addColorStop(1, 'rgba(198,255,0,1)');
    ctx.strokeStyle = gradient;
    ctx.lineWidth   = 2.5;
    ctx.beginPath();
    ctx.moveTo(p.x, H * 0.88);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();

    ctx.shadowColor = '#c6ff00';
    ctx.shadowBlur  = 14;
    ctx.fillStyle   = '#fff';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

// ---- Balls ---------------------------------------------------------------

export function drawBall(b: Ball): void {
  const { x, y, r, color } = b;
  const t = performance.now() / 1000;
  const pulse = Math.sin(t * 2 + (b.bornAt ?? 0) / 1000) * 0.05 + 1;

  // floor shadow
  const shy = H - 30;
  const shD = clamp((shy - y) / 500, 0.2, 1);
  ctx.globalAlpha = 0.3 * (1 - shD);
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(x, shy + 1, r * 0.7, r * 0.18, 0, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;

  // glow
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur  = 28;

  const grd = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * pulse);
  grd.addColorStop(0,    'rgba(255,255,255,0.95)');
  grd.addColorStop(0.25, color);
  grd.addColorStop(0.7,  color);
  grd.addColorStop(1,    'rgba(0,0,0,0.6)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(x, y, r * pulse, 0, TAU);
  ctx.fill();
  ctx.restore();

  // specular
  ctx.globalAlpha = 0.85;
  ctx.fillStyle   = '#fff';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.4, y - r * 0.45, r * 0.18, r * 0.08, -0.6, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;

  // HP bar if multi-hit
  if (b.maxHp > 1) {
    const bw = r * 1.4;
    const bh = 4;
    const bx = x - bw / 2;
    const by = y + r + 6;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw * (b.hp / b.maxHp), bh, 2);
    ctx.fill();
  }

  // flash on hit
  if (b.flash && b.flash > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255,255,255,${b.flash * 0.6})`;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.05, 0, TAU);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
}

// ---- Particles -----------------------------------------------------------

export function drawParticles(): void {
  for (const p of particles) {
    const a = clamp(p.life / p.maxLife, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle   = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur  = 6;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;
}

// ---- Dust ----------------------------------------------------------------

export function drawDust(): void {
  for (const d of dust) {
    const t = d.life / d.maxLife;
    ctx.globalAlpha = t * 0.5;
    ctx.fillStyle   = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---- Ambient -------------------------------------------------------------

export function drawAmbient(): void {
  for (const a of ambient) {
    ctx.globalAlpha = a.opacity;
    ctx.fillStyle   = Math.random() < 0.5 ? 'rgba(198,255,0,0.45)' : 'rgba(125,211,252,0.4)';
    ctx.beginPath();
    ctx.arc(a.x, a.y, a.r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---- Vignette ------------------------------------------------------------

export function drawVignette(): void {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 0.82);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.65)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// ---- Menu decorative balls -----------------------------------------------

export function drawMenuBalls(): void {
  const t = performance.now() / 1000;
  const configs = [
    { hx: 280, color: '#7fd3ff', r: 44 },
    { hx: 720, color: '#c6ff00', r: 52 },
    { hx: 1160, color: '#a78bfa', r: 40 },
  ];
  configs.forEach(({ hx, color, r }, i) => {
    const bx = hx + Math.sin(t * 0.6 + i) * 80;
    const by = 360 + Math.cos(t * 0.8 + i * 1.2) * 60 + i * 20;
    drawBall({
      x: bx, y: by,
      r, hp: 1, maxHp: 1,
      color,
      trail: [],
      bornAt: 0,
      flash:  0,
    });
  });
}

// ---- Main draw -----------------------------------------------------------

export function draw(): void {
  ctx.fillStyle = '#0f0e17';
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  if (State.shake > 0) {
    ctx.translate(
      (Math.random() - 0.5) * State.shake,
      (Math.random() - 0.5) * State.shake,
    );
  }

  drawBackground();
  drawAmbient();
  drawFloor();

  if (State.scene === 'game' || State.scene === 'pause' || State.scene === 'gameover') {
    drawProjectiles();
    for (const b of balls) drawBall(b);
    drawDust();
    drawPlayer();
    drawParticles();
  } else {
    drawMenuBalls();
  }

  ctx.restore();
  drawVignette();
}
