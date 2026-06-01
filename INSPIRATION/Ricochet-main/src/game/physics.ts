// =========================================================================
// Physics / game logic
// =========================================================================
import type { Ball, Particle, DustParticle } from '../types/index.ts';
import { State, balls, projectiles, particles, dust, player, Input } from './state.ts';
import { W, H } from './canvas.ts';
import { rand, irand, clamp, TAU } from '../utils/helpers.ts';
import { sfx } from './audio.ts';
import { Hooks } from './hooks.ts';

// ---- Ball spawning -------------------------------------------------------

const COLORS = ['#c6ff00', '#ff2d75', '#7fd3ff', '#ffb836', '#a78bfa', '#6fffb0'];

export function spawnBall(): void {
  const wave  = State.wave;
  const r     = irand(22, 38) + Math.random() * wave * 0.5;
  const hp    = irand(1, 2 + Math.floor(wave / 3));
  const x     = rand(r + 40, W - r - 40);
  const speed = rand(60, 120 + wave * 8);
  const angle = rand(Math.PI * 0.2, Math.PI * 0.8);
  const color = COLORS[irand(0, COLORS.length - 1)];
  balls.push({
    x,
    y: -r - 10,
    r,
    vx: Math.cos(angle) * speed * (Math.random() < 0.5 ? 1 : -1),
    vy: Math.abs(Math.sin(angle) * speed) + 40,
    hp,
    maxHp: hp,
    color,
    trail: [],
    bornAt: performance.now(),
    flash:  0,
    popEffect: 0,
  });
}

// ---- Particles -----------------------------------------------------------

export function updateParticles(dt: number): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x    += p.vx * dt;
    p.y    += p.vy * dt;
    p.vy   += 600 * dt;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
  for (let i = dust.length - 1; i >= 0; i--) {
    const d = dust[i];
    d.x    += d.vx * dt;
    d.y    += d.vy * dt;
    d.life -= dt;
    if (d.life <= 0) dust.splice(i, 1);
  }
}

export function burstParticles(x: number, y: number, color: string, count = 14): void {
  for (let i = 0; i < count; i++) {
    const angle = rand(0, TAU);
    const speed = rand(120, 460);
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: rand(0.28, 0.62),
      maxLife: 0.62,
      r: rand(2, 6),
      color,
    });
  }
}

export function puffWall(x: number, y: number): void {
  for (let i = 0; i < 6; i++) {
    const angle = rand(0, TAU);
    dust.push({
      x, y,
      vx: Math.cos(angle) * rand(30, 90),
      vy: Math.sin(angle) * rand(30, 90),
      life: rand(0.15, 0.35),
      maxLife: 0.35,
      r: rand(2, 5),
    });
  }
}

export function flashBall(ball: Ball): void {
  ball.flash = 1;
}

// ---- Score / combo -------------------------------------------------------

export function addScore(points: number): void {
  State.score += points;
  const el = document.getElementById('scoreVal');
  if (el) {
    el.textContent = String(State.score).padStart(8, '0');
    el.classList.remove('bump');
    void (el as HTMLElement).offsetWidth; // reflow
    el.classList.add('bump');
  }
}

export function breakCombo(): void {
  State.combo      = 0;
  State.comboTimer = 0;
  const el = document.getElementById('combo');
  if (el) el.classList.remove('active');
}

export function comboWindow(): void {
  State.comboTimer = State.comboWindow;
  State.combo++;
  const el    = document.getElementById('combo');
  const valEl = document.getElementById('comboMult');
  if (el) el.classList.add('active');
  if (valEl) valEl.textContent = 'x' + State.combo;
}

// ---- Ball popping --------------------------------------------------------

export function popBall(ball: Ball, index: number): void {
  const points = Math.ceil(ball.maxHp * 100 * (State.combo > 1 ? State.combo : 1));
  comboWindow();
  addScore(points);
  burstParticles(ball.x, ball.y, ball.color, 18);
  sfx('pop', { pitch: clamp(0.8 + State.combo * 0.06, 0.8, 2.0) });

  balls.splice(index, 1);
  State.ballsPopped++;

  Hooks.onPopBall?.(ball.x, ball.y, ball.color, points);
}

// ---- Projectile collision + shooting ------------------------------------

export function updateProjectiles(dt: number, now: number): void {
  // Spawn new projectiles from player
  if (Input.firing && State.gameActive && State.scene === 'game') {
    if (now - player.lastShot >= player.fireRate) {
      player.lastShot = now;
      const angle = Math.atan2(Input.mouseY - H * 0.88, Input.mouseX - player.x);
      const speed = 1200;
      projectiles.push({
        x: player.x,
        y: H * 0.88,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 6,
        life: 1.2,
      });
      sfx('shoot', { vol: 0.18 });
    }
  }

  // Update existing projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x    += p.vx * dt;
    p.y    += p.vy * dt;
    p.life -= dt;

    // Wall bounce (left/right)
    if (p.x < p.r) { p.x = p.r; p.vx *= -1; puffWall(p.x, p.y); }
    if (p.x > W - p.r) { p.x = W - p.r; p.vx *= -1; puffWall(p.x, p.y); }

    if (p.life <= 0 || p.y > H + 20 || p.y < -20) {
      projectiles.splice(i, 1);
      continue;
    }

    // Ball collision
    for (let j = balls.length - 1; j >= 0; j--) {
      const b  = balls[j];
      const dx = p.x - b.x;
      const dy = p.y - b.y;
      const d  = Math.sqrt(dx * dx + dy * dy);
      if (d < p.r + b.r) {
        // Hit!
        b.hp--;
        flashBall(b);
        sfx('hit', { vol: 0.3 });
        projectiles.splice(i, 1);
        if (b.hp <= 0) {
          popBall(b, j);
        }
        break;
      }
    }
  }
}

// ---- Ball update ---------------------------------------------------------

export function updateBalls(dt: number): void {
  for (let i = balls.length - 1; i >= 0; i--) {
    const b = balls[i];
    b.x += (b.vx ?? 0) * dt;
    b.y += (b.vy ?? 0) * dt;
    b.vy = (b.vy ?? 0) + 200 * dt; // gravity

    // Trail
    b.trail.push({ x: b.x, y: b.y, t: performance.now() });
    if (b.trail.length > 12) b.trail.shift();

    // Flash decay
    if (b.flash && b.flash > 0) b.flash = Math.max(0, b.flash - dt * 8);

    // Wall bounce
    if (b.x - b.r < 0) { b.x = b.r; if (b.vx !== undefined) b.vx *= -0.85; puffWall(0, b.y); }
    if (b.x + b.r > W) { b.x = W - b.r; if (b.vx !== undefined) b.vx *= -0.85; puffWall(W, b.y); }

    // Ceiling bounce
    if (b.y - b.r < 0) { b.y = b.r; if (b.vy !== undefined) b.vy *= -0.85; }

    // Ball escapes bottom → lose a life
    if (b.y - b.r > H) {
      balls.splice(i, 1);
      loseLife();
    }
  }
}

// ---- Player aim ----------------------------------------------------------

export function updatePlayer(): void {
  player.x = clamp(Input.mouseX, 40, W - 40);
}

// ---- Lives ---------------------------------------------------------------

export function loseLife(): void {
  if (!State.gameActive) return;
  State.lives = Math.max(0, State.lives - 1);
  sfx('life', { vol: 0.5 });
  shake(10, 0.4);
  Hooks.onLoseLife?.();

  // Update HUD dots
  const dots = document.querySelectorAll<HTMLElement>('.life-dot');
  dots.forEach((dot, i) => {
    if (i >= State.lives) dot.classList.add('empty');
  });

  if (State.lives <= 0) {
    Hooks.onLifeZero?.();
  }
}

// ---- Screen shake --------------------------------------------------------

export function shake(amount: number, duration: number): void {
  State.shake         = Math.max(State.shake, amount);
  State.shakeDuration = Math.max(State.shakeDuration, duration);
}

export function updateShake(dt: number): void {
  if (State.shakeDuration > 0) {
    State.shakeDuration = Math.max(0, State.shakeDuration - dt);
    State.shake         = State.shakeDuration > 0 ? State.shake : 0;
  }
}
