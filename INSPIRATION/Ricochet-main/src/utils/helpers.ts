// =========================================================================
// Utility helpers
// =========================================================================

export const TAU = Math.PI * 2;

export function rand(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

export function irand(a: number, b: number): number {
  return Math.floor(rand(a, b + 1));
}

export function clamp(v: number, a: number, b: number): number {
  return v < a ? a : v > b ? b : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(Math.floor(n));
}

export function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element #${id} not found`);
  return el;
}
