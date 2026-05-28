import { Store } from '../core/store';
import { GOALS } from '../config';
import { Profile } from './profile';
import type { DailyData, Goal } from '../types';
import { clamp } from '../core/utils';

function dayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export const Daily = {
  d: null as unknown as DailyData,
  g: null as unknown as Goal,

  load(): void {
    let d = Store.get<DailyData | null>('coil_daily', null);
    const k = dayKey();
    if (!d || d.date !== k) {
      d = { date: k, idx: hashStr(k) % GOALS.length, prog: 0, done: false };
      Store.set('coil_daily', d);
    }
    this.d = d;
    this.g = GOALS[d.idx];
  },

  save(): void {
    Store.set('coil_daily', this.d);
  },

  report(kind: string, val: number): boolean {
    if (this.d.done) return false;
    const g = this.g;
    if (g.kind === 'cum') {
      if (kind === g.id) this.d.prog += val;
    } else if (kind === g.id) {
      this.d.prog = Math.max(this.d.prog, val);
    }
    if (this.d.prog >= g.t) {
      this.d.done = true;
      Profile.addCoins(g.reward);
      this.save();
      return true;
    }
    this.save();
    return false;
  },

  pct(): number {
    return clamp(this.d.prog / this.g.t, 0, 1);
  },
};

Daily.load();
