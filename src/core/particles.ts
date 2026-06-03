import type { Particle, PopText } from '../types';
import { view } from './canvas';
import { TAU, clamp, fx, pcount, rand, text } from './utils';

/* ---------- screen shake ---------- */
export const shakeState = { t: 0, mag: 0 };

export function shake(m: number, t = 0.25): void {
  // Scaled by the global motion setting (0 disables shake entirely for the
  // Reduced Motion / prefers-reduced-motion path).
  m *= fx.motion;
  if (m <= 0) return;
  shakeState.mag = Math.max(shakeState.mag, m);
  shakeState.t = Math.max(shakeState.t, t);
}

export function updateShake(dt: number): void {
  if (shakeState.t > 0) {
    shakeState.t -= dt;
    if (shakeState.t <= 0) shakeState.mag = 0;
  }
}

/* ---------- particles ---------- */
const PCAP = 240;

export const P = {
  a: [] as Particle[],

  burst(x: number, y: number, n: number, c: string, sp = 220, life = 0.5, sz = 4): void {
    n = pcount(n);
    for (let i = 0; i < n; i++) {
      const an = Math.random() * TAU;
      const s = rand(sp * 0.3, sp);
      this.a.push({
        x, y,
        vx: Math.cos(an) * s,
        vy: Math.sin(an) * s,
        life, max: life, c,
        sz: rand(sz * 0.5, sz),
      });
    }
    if (this.a.length > PCAP) this.a.splice(0, this.a.length - PCAP);
  },

  ring(x: number, y: number, c: string, n = 18, sp = 260): void {
    n = pcount(n);
    for (let i = 0; i < n; i++) {
      const an = (i / n) * TAU;
      this.a.push({
        x, y,
        vx: Math.cos(an) * sp,
        vy: Math.sin(an) * sp,
        life: 0.5, max: 0.5, c,
        sz: 3,
      });
    }
    if (this.a.length > PCAP) this.a.splice(0, this.a.length - PCAP);
  },

  upd(dt: number): void {
    for (let i = this.a.length - 1; i >= 0; i--) {
      const p = this.a[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.a[i] = this.a[this.a.length - 1];
        this.a.pop();
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
    }
  },

  draw(): void {
    const { ctx } = view;
    for (const p of this.a) {
      const al = clamp(p.life / p.max, 0, 1);
      ctx.globalAlpha = al;
      ctx.fillStyle = p.c;
      if (fx.level === 'low') {
        const s = Math.max(1, p.sz * al);
        ctx.fillRect(p.x - s * 0.5, p.y - s * 0.5, s, s);
        continue;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.sz * al, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },

  clear(): void {
    this.a.length = 0;
  },
};

/* ---------- floating score pops ---------- */
export const Pop = {
  a: [] as PopText[],

  add(x: number, y: number, t: string, c: string): void {
    this.a.push({ x, y, t, c, life: 1 });
  },

  upd(dt: number): void {
    for (let i = this.a.length - 1; i >= 0; i--) {
      const p = this.a[i];
      p.life -= dt * 1.2;
      p.y -= 30 * dt;
      if (p.life <= 0) {
        this.a[i] = this.a[this.a.length - 1];
        this.a.pop();
      }
    }
  },

  draw(): void {
    const { ctx } = view;
    for (const p of this.a) {
      ctx.globalAlpha = clamp(p.life, 0, 1);
      text(p.t, p.x, p.y, 16, p.c, 700, 8);
    }
    ctx.globalAlpha = 1;
  },

  clear(): void {
    this.a.length = 0;
  },
};
