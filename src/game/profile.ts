import { Store } from '../core/store';
import { TITLES } from '../config';

export function xpForLevel(l: number): number {
  return Math.round(60 * Math.pow(l, 1.35));
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export const Profile = {
  xp: Store.get<number>('coil_xp', 0),
  coins: Store.get<number>('coil_coins', 0),
  best: Store.get<number>('coil_best', 0),
  bestCombo: Store.get<number>('coil_best_combo', 0),
  constellations: Store.get<number>('coil_constel', 0),
  streak: Store.get<number>('coil_streak', 0),
  lastPlayDate: Store.get<string>('coil_last_play', ''),

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

  /** Persist the all-time best combo (drives combo-based cosmetic unlocks). */
  setBestCombo(c: number): void {
    if (c > this.bestCombo) {
      this.bestCombo = c;
      Store.set('coil_best_combo', c);
    }
  },

  /** Lifetime constellation-chain completions (drives a cosmetic unlock + achievement). */
  addConstellations(n: number): void {
    if (n <= 0) return;
    this.constellations += n;
    Store.set('coil_constel', this.constellations);
  },

  /**
   * Called when the player starts a run. Returns whether this is the FIRST run
   * of the calendar day (which the run-loop uses to grant a 2× coin bonus).
   * Also rolls the daily login streak forward or breaks it.
   */
  markRunStart(): boolean {
    const today = todayKey();
    if (this.lastPlayDate === today) return false;
    if (this.lastPlayDate === yesterdayKey()) {
      this.streak += 1;
    } else {
      this.streak = 1;
    }
    this.lastPlayDate = today;
    Store.set('coil_streak', this.streak);
    Store.set('coil_last_play', this.lastPlayDate);
    return true;
  },

  /**
   * Has the player already played today? Drives the home-screen badge so the
   * "FIRST RUN BONUS" tease only shows when it would actually fire.
   */
  hasPlayedToday(): boolean {
    return this.lastPlayDate === todayKey();
  },
};
