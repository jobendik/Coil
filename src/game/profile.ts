import { Store } from '../core/store';
import { TITLES } from '../config';

export function xpForLevel(l: number): number {
  return Math.round(60 * Math.pow(l, 1.35));
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function nDaysAgoKey(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function yesterdayKey(): string {
  return nDaysAgoKey(1);
}

const WEEK_MS = 7 * 86_400_000;

export const Profile = {
  xp: Store.num('coil_xp', 0),
  coins: Store.num('coil_coins', 0),
  best: Store.num('coil_best', 0),
  bestCombo: Store.num('coil_best_combo', 0),
  constellations: Store.num('coil_constel', 0),
  streak: Store.num('coil_streak', 0),
  lastPlayDate: Store.get<string>('coil_last_play', ''),
  runsPlayed: Store.num('coil_runs', 0),
  highestZone: Store.num('coil_top_zone', 0),
  graceMs: Store.num('coil_grace_ms', 0),   // last streak-grace use (forgiving streak, M4)
  graceUsedThisStart: false,                          // did the just-started run consume a grace? (drives a gentle toast)
  shards: Store.num('coil_shards', 0),        // ◈ premium collectible currency (M8)
  lifetimeHeight: Store.num('coil_life_h', 0), // total metres ever climbed (career milestones, M8)
  perfectsTotal: Store.num('coil_life_perf', 0), // lifetime perfect snaps (career milestones, M8)

  addShards(n: number): void {
    if (n <= 0) return;
    this.shards += n;
    Store.set('coil_shards', this.shards);
  },

  spendShards(n: number): boolean {
    if (this.shards < n) return false;
    this.shards -= n;
    Store.set('coil_shards', this.shards);
    return true;
  },

  /** Accrue lifetime totals (drives career milestones). Pass the run deltas. */
  addLifetime(heightDelta: number, perfDelta: number): void {
    if (heightDelta > 0) { this.lifetimeHeight += heightDelta; Store.set('coil_life_h', this.lifetimeHeight); }
    if (perfDelta > 0) { this.perfectsTotal += perfDelta; Store.set('coil_life_perf', this.perfectsTotal); }
  },

  /** Record the highest Zone index ever reached. Returns true the FIRST time a
   *  new top zone is reached (drives the "notable death" Ascent tease + a toast). */
  noteZone(z: number): boolean {
    if (z > this.highestZone) {
      this.highestZone = z;
      Store.set('coil_top_zone', z);
      return true;
    }
    return false;
  },

  level(): number {
    return this.levelProgress().l;
  },

  levelProgress(): { l: number; cur: number; need: number } {
    let l = 1;
    // Coerce defensively: xp is loaded via Store.num (finite), but a same-session
    // Infinity here would make `x -= finite` stay Infinity and spin forever — and
    // this runs every frame on the home/result screens. The l<1000 ceiling is far
    // above any reachable level, so it never bites in normal play.
    let x = Number.isFinite(this.xp) ? this.xp : 0;
    while (x >= xpForLevel(l) && l < 1000) {
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
    this.graceUsedThisStart = false;
    if (this.lastPlayDate === today) return false;
    if (this.lastPlayDate === yesterdayKey()) {
      this.streak += 1;
    } else if (this.lastPlayDate === nDaysAgoKey(2) && (Date.now() - this.graceMs) >= WEEK_MS) {
      // FORGIVING STREAK (M4): missing a single day no longer resets the streak.
      // One automatic grace per week bridges a one-day gap — the streak continues
      // instead of collapsing to 1. No anxiety copy; a gentle "streak saved" toast.
      this.streak += 1;
      this.graceMs = Date.now();
      this.graceUsedThisStart = true;
      Store.set('coil_grace_ms', this.graceMs);
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

  /**
   * Count a started run (any mode). Drives the minimal first-session home: the
   * full meta-layer is hidden until the player has experienced the core loop once,
   * protecting session-1 gameplay-conversion (CrazyGames onboarding guidance).
   */
  noteRun(): void {
    this.runsPlayed += 1;
    Store.set('coil_runs', this.runsPlayed);
  },
};
