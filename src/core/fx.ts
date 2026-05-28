/* =========================================================================
   CASINO-FX LAYER — purely visual reward systems layered on top of the skill
   loop. None of this touches physics. Every pool is capped and FX-level aware
   (see pcount/glowFX) so low-end devices stay smooth. Ported from the
   single-file reference into the modular architecture.

   Draw order is owned by the caller. Convention used by the scenes:
     world layer (behind HUD):  Coins, Rays, Confetti, Shock, Sparkles, FlyCoins
     overlay layer (on top):    Callout, Flash
   ========================================================================= */
import { view } from './canvas';
import { TAU, clamp, glowFX, hexA, lerp, pcount, rand, text } from './utils';
import { SFX } from './audio';

/** Screen-space anchor for the coin-balance counter (top-right HUD). */
export function bankXY(): { x: number; y: number } {
  return { x: view.W - 44, y: 30 + view.SAFE_TOP };
}

/* ---- spinning gold coins with gravity + floor bounce ---- */
interface Coin { x: number; y: number; vx: number; vy: number; spin: number; rot: number; life: number; sz: number; grav: number; bounced: boolean; }
const COINCAP = 140;
export const Coins = {
  a: [] as Coin[],
  spawn(x: number, y: number, n: number, opt?: { up?: number; fountain?: boolean; grav?: number }): void {
    opt = opt || {};
    n = pcount(n);
    const up = opt.up || 0;
    for (let i = 0; i < n; i++) {
      const a = opt.fountain ? -Math.PI / 2 + rand(-0.85, 0.85) : Math.random() * TAU;
      const sp = opt.fountain ? rand(280, 560) : rand(90, 300);
      this.a.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - up,
        spin: rand(-14, 14), rot: Math.random() * TAU, life: rand(1.0, 1.8),
        sz: rand(7, 11), grav: opt.grav || 1000, bounced: false,
      });
    }
    if (this.a.length > COINCAP) this.a.splice(0, this.a.length - COINCAP);
  },
  upd(dt: number): void {
    const { H } = view;
    for (let i = this.a.length - 1; i >= 0; i--) {
      const c = this.a[i];
      c.life -= dt;
      if (c.life <= 0) { this.a[i] = this.a[this.a.length - 1]; this.a.pop(); continue; }
      c.vy += c.grav * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.spin * dt; c.vx *= 0.992;
      if (!c.bounced && c.y > H - 6 && c.vy > 0) { c.vy *= -0.42; c.vx *= 0.6; if (Math.abs(c.vy) < 60) c.bounced = true; }
    }
  },
  draw(): void {
    const { ctx } = view;
    for (const c of this.a) {
      const al = clamp(c.life * 1.6, 0, 1);
      const w = Math.abs(Math.cos(c.rot)) * c.sz + 1.6;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.globalAlpha = al;
      ctx.fillStyle = '#ffcf3a'; ctx.shadowColor = '#ffb020'; ctx.shadowBlur = glowFX(9);
      ctx.beginPath(); ctx.ellipse(0, 0, w, c.sz, 0, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.ellipse(-w * 0.18, -c.sz * 0.18, w * 0.5, c.sz * 0.5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#d9881a'; ctx.beginPath(); ctx.ellipse(0, 0, Math.max(0.8, w * 0.22), c.sz * 0.34, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  },
  clear(): void { this.a.length = 0; },
};

/* ---- confetti (burst + rain) ---- */
interface Conf { x: number; y: number; vx: number; vy: number; rot: number; spin: number; life: number; w: number; h: number; c: string; sway: number; swp: number; }
const CONFCAP = 170;
const CONF_COLORS = ['#2ff3e0', '#ff4d8d', '#ffd24a', '#9be35a', '#a76bff', '#ffffff'];
export const Confetti = {
  a: [] as Conf[],
  burst(x: number, y: number, n: number): void {
    n = pcount(n);
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + rand(-1.3, 1.3); const sp = rand(200, 500);
      this.a.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: Math.random() * TAU, spin: rand(-16, 16), life: rand(1.1, 2.1), w: rand(5, 9), h: rand(8, 14), c: CONF_COLORS[(Math.random() * CONF_COLORS.length) | 0], sway: rand(1, 3), swp: Math.random() * TAU });
    }
    if (this.a.length > CONFCAP) this.a.splice(0, this.a.length - CONFCAP);
  },
  rain(n: number): void {
    const { W } = view;
    n = pcount(n);
    for (let i = 0; i < n; i++) {
      this.a.push({ x: rand(0, W), y: rand(-50, -4), vx: rand(-30, 30), vy: rand(70, 180), rot: Math.random() * TAU, spin: rand(-12, 12), life: rand(1.8, 3.4), w: rand(5, 9), h: rand(8, 14), c: CONF_COLORS[(Math.random() * CONF_COLORS.length) | 0], sway: rand(1, 3), swp: Math.random() * TAU });
    }
    if (this.a.length > CONFCAP) this.a.splice(0, this.a.length - CONFCAP);
  },
  upd(dt: number): void {
    for (let i = this.a.length - 1; i >= 0; i--) {
      const p = this.a[i];
      p.life -= dt;
      if (p.life <= 0) { this.a[i] = this.a[this.a.length - 1]; this.a.pop(); continue; }
      p.vy += 560 * dt; p.swp += dt * 6; p.x += (p.vx + Math.sin(p.swp) * p.sway * 10) * dt; p.y += p.vy * dt; p.rot += p.spin * dt; p.vx *= 0.985;
    }
  },
  draw(): void {
    const { ctx } = view;
    for (const p of this.a) {
      const al = clamp(p.life, 0, 1);
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = al; ctx.fillStyle = p.c;
      const hh = p.h * Math.abs(Math.cos(p.swp)) + 1;
      ctx.fillRect(-p.w / 2, -hh / 2, p.w, hh); ctx.restore();
    }
    ctx.globalAlpha = 1;
  },
  clear(): void { this.a.length = 0; },
};

/* ---- full-screen colour flash ---- */
export const Flash = {
  a: 0, c: '#fff',
  hit(c: string, amt: number): void { this.c = c || '#fff'; this.a = Math.max(this.a, amt || 0.5); },
  upd(dt: number): void { if (this.a > 0) { this.a -= dt * 2.4; if (this.a < 0) this.a = 0; } },
  draw(): void {
    if (this.a <= 0) return;
    const { ctx, W, H } = view;
    ctx.save(); ctx.globalAlpha = clamp(this.a, 0, 1); ctx.fillStyle = this.c; ctx.fillRect(0, 0, W, H); ctx.restore();
  },
  clear(): void { this.a = 0; },
};

/* ---- jackpot light-ray burst ---- */
interface Ray { x: number; y: number; c: string; n: number; t: number; life: number; rot: number; }
const RAYCAP = 8;
export const Rays = {
  a: [] as Ray[],
  burst(x: number, y: number, c: string, n: number): void {
    this.a.push({ x, y, c: c || '#fff', n: n || 12, t: 0, life: 0.65, rot: Math.random() * TAU });
    if (this.a.length > RAYCAP) this.a.shift();
  },
  upd(dt: number): void {
    for (let i = this.a.length - 1; i >= 0; i--) {
      const r = this.a[i]; r.t += dt; r.rot += dt * 1.6;
      if (r.t >= r.life) { this.a[i] = this.a[this.a.length - 1]; this.a.pop(); }
    }
  },
  draw(): void {
    const { ctx } = view;
    for (const r of this.a) {
      const p = r.t / r.life; const al = (1 - p) * 0.55; const len = lerp(18, 170, p);
      ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.rot); ctx.globalAlpha = al; ctx.strokeStyle = r.c;
      ctx.shadowColor = r.c; ctx.shadowBlur = glowFX(10); ctx.lineCap = 'round';
      for (let i = 0; i < r.n; i++) {
        const a = (i / r.n) * TAU; ctx.lineWidth = lerp(7, 1, p);
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * 16, Math.sin(a) * 16); ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len); ctx.stroke();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  },
  clear(): void { this.a.length = 0; },
};

/* ---- expanding shock rings ---- */
interface Sh { x: number; y: number; c: string; t: number; life: number; r0: number; r1: number; lw: number; fill: boolean; }
const SHOCKCAP = 16;
export const Shock = {
  a: [] as Sh[],
  ring(x: number, y: number, c: string, opt?: { life?: number; r0?: number; r1?: number; lw?: number; fill?: boolean }): void {
    opt = opt || {};
    this.a.push({ x, y, c: c || '#fff', t: 0, life: opt.life || 0.5, r0: opt.r0 || 10, r1: opt.r1 || 160, lw: opt.lw || 5, fill: !!opt.fill });
    if (this.a.length > SHOCKCAP) this.a.shift();
  },
  upd(dt: number): void {
    for (let i = this.a.length - 1; i >= 0; i--) {
      const s = this.a[i]; s.t += dt;
      if (s.t >= s.life) { this.a[i] = this.a[this.a.length - 1]; this.a.pop(); }
    }
  },
  draw(): void {
    const { ctx } = view;
    for (const s of this.a) {
      const p = s.t / s.life; const e = 1 - Math.pow(1 - p, 3);
      const r = lerp(s.r0, s.r1, e); const al = (1 - p) * 0.85;
      ctx.save(); ctx.globalAlpha = al; ctx.strokeStyle = s.c; ctx.lineWidth = Math.max(0.5, s.lw * (1 - p));
      ctx.shadowColor = s.c; ctx.shadowBlur = glowFX(16);
      ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, TAU); ctx.stroke();
      if (s.fill) { ctx.globalAlpha = al * 0.16; ctx.fillStyle = s.c; ctx.fill(); }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  },
  clear(): void { this.a.length = 0; },
};

/* ---- ambient sparkle twinkles ---- */
interface Spk { x: number; y: number; c: string; t: number; life: number; sz: number; rot: number; }
const SPARKCAP = 64;
export const Sparkles = {
  a: [] as Spk[],
  pop(x: number, y: number, c: string): void {
    this.a.push({ x, y, c: c || '#fff', t: 0, life: rand(0.4, 0.85), sz: rand(2, 5), rot: Math.random() * TAU });
    if (this.a.length > SPARKCAP) this.a.shift();
  },
  scatter(n: number, c: string): void {
    const { W, H } = view;
    n = pcount(n);
    for (let i = 0; i < n; i++) this.pop(rand(0, W), rand(0, H), c);
  },
  upd(dt: number): void {
    for (let i = this.a.length - 1; i >= 0; i--) {
      const s = this.a[i]; s.t += dt;
      if (s.t >= s.life) { this.a[i] = this.a[this.a.length - 1]; this.a.pop(); }
    }
  },
  draw(): void {
    const { ctx } = view;
    for (const s of this.a) {
      const p = s.t / s.life; const al = Math.sin(p * Math.PI); const sz = s.sz * (0.5 + al * 0.8);
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot); ctx.globalAlpha = al;
      ctx.fillStyle = s.c; ctx.shadowColor = s.c; ctx.shadowBlur = glowFX(10);
      ctx.beginPath();
      ctx.moveTo(0, -sz); ctx.lineTo(sz * 0.26, -sz * 0.26); ctx.lineTo(sz, 0); ctx.lineTo(sz * 0.26, sz * 0.26);
      ctx.lineTo(0, sz); ctx.lineTo(-sz * 0.26, sz * 0.26); ctx.lineTo(-sz, 0); ctx.lineTo(-sz * 0.26, -sz * 0.26);
      ctx.closePath(); ctx.fill(); ctx.restore();
    }
    ctx.globalAlpha = 1;
  },
  clear(): void { this.a.length = 0; },
};

/* ---- coins that scatter then HOME to the balance counter and deposit ---- */
interface FlyCoin { x: number; y: number; vx: number; vy: number; tx: number; ty: number; delay: number; t: number; rot: number; spin: number; sz: number; }
const FLYCAP = 90;
export const FlyCoins = {
  a: [] as FlyCoin[],
  send(x: number, y: number, n: number, tx: number, ty: number): void {
    n = pcount(n);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU; const sp = rand(120, 320);
      this.a.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rand(40, 160), tx, ty, delay: i * 0.018 + rand(0, 0.05), t: 0, rot: Math.random() * TAU, spin: rand(-12, 12), sz: rand(6, 9) });
    }
    if (this.a.length > FLYCAP) this.a.splice(0, this.a.length - FLYCAP);
  },
  upd(dt: number): void {
    for (let i = this.a.length - 1; i >= 0; i--) {
      const c = this.a[i]; c.t += dt;
      if (c.t < c.delay) continue;
      c.rot += c.spin * dt;
      if (c.t - c.delay <= 0.16) { c.vy += 900 * dt; c.x += c.vx * dt; c.y += c.vy * dt; } else {
        const dx = c.tx - c.x; const dy = c.ty - c.y; const d = Math.hypot(dx, dy) || 1;
        const pull = lerp(10, 30, clamp((c.t - c.delay - 0.16) / 0.5, 0, 1));
        c.vx = lerp(c.vx, dx * pull, Math.min(1, dt * 12)); c.vy = lerp(c.vy, dy * pull, Math.min(1, dt * 12));
        c.x += c.vx * dt; c.y += c.vy * dt;
        if (d < 14) { this.a[i] = this.a[this.a.length - 1]; this.a.pop(); SFX.deposit(); Sparkles.pop(c.tx, c.ty, '#fff3b0'); continue; }
      }
    }
  },
  draw(): void {
    const { ctx } = view;
    for (const c of this.a) {
      if (c.t < c.delay) continue;
      const w = Math.abs(Math.cos(c.rot)) * c.sz + 1.6;
      ctx.save(); ctx.translate(c.x, c.y);
      ctx.fillStyle = '#ffcf3a'; ctx.shadowColor = '#ffb020'; ctx.shadowBlur = glowFX(8);
      ctx.beginPath(); ctx.ellipse(0, 0, w, c.sz, 0, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.ellipse(-w * 0.18, -c.sz * 0.18, w * 0.5, c.sz * 0.5, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
  },
  clear(): void { this.a.length = 0; },
};

/* ---- big arcade punch-in callouts ---- */
interface Call { txt: string; c: string; t: number; life: number; big: boolean; }
export const Callout = {
  a: [] as Call[],
  add(txt: string, c: string, big = false): void {
    this.a.push({ txt, c: c || '#fff', t: 0, life: big ? 1.5 : 1.05, big });
    if (this.a.length > 3) this.a.shift();
  },
  upd(dt: number): void {
    for (let i = this.a.length - 1; i >= 0; i--) {
      const o = this.a[i]; o.t += dt;
      if (o.t >= o.life) { this.a[i] = this.a[this.a.length - 1]; this.a.pop(); }
    }
  },
  draw(): void {
    const { ctx, W, H } = view;
    for (let k = 0; k < this.a.length; k++) {
      const o = this.a[k]; const p = o.t / o.life;
      let s: number;
      if (p < 0.22) s = lerp(0.25, 1.22, p / 0.22);
      else if (p < 0.38) s = lerp(1.22, 1.0, (p - 0.22) / 0.16);
      else s = 1.0;
      const al = p < 0.72 ? 1 : clamp(1 - (p - 0.72) / 0.28, 0, 1);
      const yy = H * 0.30 - (p > 0.4 ? (p - 0.4) * 46 : 0) + k * 6;
      ctx.save(); ctx.globalAlpha = al; ctx.translate(W / 2, yy); ctx.rotate(Math.sin(o.t * 30) * 0.015 * (o.big ? 1 : 0.5));
      text(o.txt, 0, 0, (o.big ? 52 : 34) * s, o.c, 900, 26, 'center', "'Unbounded'");
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  },
  clear(): void { this.a.length = 0; },
};

/* helper so void/world tints can reuse the colour util without re-importing */
export { hexA };

/** Advance every FX pool. Called once per frame from the main loop. */
export function fxUpd(dt: number): void {
  Coins.upd(dt); Confetti.upd(dt); Flash.upd(dt); Rays.upd(dt);
  Shock.upd(dt); Sparkles.upd(dt); FlyCoins.upd(dt); Callout.upd(dt);
}

/** Clear every FX pool (run reset). */
export function fxClear(): void {
  Coins.clear(); Confetti.clear(); Flash.clear(); Rays.clear();
  Shock.clear(); Sparkles.clear(); FlyCoins.clear(); Callout.clear();
}

/** World layer (behind HUD): coins, rays, confetti, shock, sparkles, fly-coins. */
export function fxDrawWorld(): void {
  Coins.draw(); Rays.draw(); Confetti.draw(); Shock.draw(); Sparkles.draw(); FlyCoins.draw();
}

/** Overlay layer (above HUD): callout punch-ins then the screen flash. */
export function fxDrawOverlay(): void {
  Callout.draw(); Flash.draw();
}
