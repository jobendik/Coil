import { Store } from '../core/store';
import { TITLES } from '../config';

export function xpForLevel(l: number): number {
  return Math.round(60 * Math.pow(l, 1.35));
}

export const Profile = {
  xp: Store.get<number>('coil_xp', 0),
  coins: Store.get<number>('coil_coins', 0),
  best: Store.get<number>('coil_best', 0),

  level(): number {
    let l = 1;
    let x = this.xp;
    while (x >= xpForLevel(l)) {
      x -= xpForLevel(l);
      l++;
    }
    return l;
  },

  levelProgress(): { l: number; cur: number; need: number } {
    let l = 1;
    let x = this.xp;
    while (x >= xpForLevel(l)) {
      x -= xpForLevel(l);
      l++;
    }
    return { l, cur: x, need: xpForLevel(l) };
  },

  title(): string {
    return TITLES[Math.min(TITLES.length - 1, Math.floor((this.level() - 1) / 4))];
  },

  addXP(n: number): void {
    this.xp += n;
    Store.set('coil_xp', this.xp);
  },

  addCoins(n: number): void {
    this.coins += n;
    Store.set('coil_coins', this.coins);
  },

  setBest(h: number): boolean {
    if (h > this.best) {
      this.best = h;
      Store.set('coil_best', h);
      return true;
    }
    return false;
  },
};
