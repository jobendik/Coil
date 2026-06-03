import { Store } from '../core/store';
import { Profile } from './profile';
import { rand } from '../core/utils';

/* =========================================================================
   RETURN-DAY REWARD SYSTEMS — daily login bonus, free spin wheel, bonus chests.
   All purely additive coin sources (never pay-to-win). Tuned "generous" for a
   fresh CrazyGames launch: fast dopamine + a strong reason to come back daily.
   State is persisted + cloud-synced via Store, keyed by calendar day.
   ========================================================================= */

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/* ---------- daily login bonus (escalates over a 7-day week) ---------- */
export const LOGIN_REWARDS = [50, 100, 150, 200, 300, 400, 500];

export const Login = {
  lastClaim: Store.get<string>('coil_login_date', ''),
  day: Store.get<number>('coil_login_day', 0),    // last claimed day in the 1..7 cycle

  available(): boolean {
    return this.lastClaim !== todayKey();
  },

  /** Which day of the 1..7 cycle the next claim lands on. Consecutive days step
   *  up; a missed day (or first ever) restarts at day 1. After day 7 it loops
   *  back to 1 so the ramp repeats each week. */
  pendingDay(): number {
    if (this.lastClaim === yesterdayKey()) return (this.day % 7) + 1;
    return 1;
  },

  rewardFor(day: number): number {
    return LOGIN_REWARDS[Math.min(Math.max(day, 1), 7) - 1];
  },

  claim(): { day: number; reward: number } {
    const day = this.pendingDay();
    const reward = this.rewardFor(day);
    this.day = day;
    this.lastClaim = todayKey();
    Store.set('coil_login_day', day);
    Store.set('coil_login_date', this.lastClaim);
    Profile.addCoins(reward);
    return { day, reward };
  },
};

/* ---------- free daily spin wheel ---------- */
export interface WheelSeg { label: string; coins: number; c: string; }
export const WHEEL_SEGMENTS: WheelSeg[] = [
  { label: '50',  coins: 50,  c: '#2ff3e0' },
  { label: '100', coins: 100, c: '#ff4d8d' },
  { label: '75',  coins: 75,  c: '#9be35a' },
  { label: '200', coins: 200, c: '#ffd24a' },
  { label: '120', coins: 120, c: '#a76bff' },
  { label: '60',  coins: 60,  c: '#55d6ff' },
  { label: '300', coins: 300, c: '#ff9b50' },
  { label: '150', coins: 150, c: '#cdb4ff' },
];

export const Wheel = {
  lastSpin: Store.get<string>('coil_wheel_date', ''),
  lastBonus: Store.get<string>('coil_wheel_bonus', ''),

  available(): boolean {
    return this.lastSpin !== todayKey();
  },

  /** A rewarded "extra spin" is offered once per day, only after the free spin
   *  has been used (so it's bonus upside, never a substitute for the free one). */
  bonusAvailable(): boolean {
    return !this.available() && this.lastBonus !== todayKey();
  },

  rollIdx(): number {
    return Math.floor(rand(0, WHEEL_SEGMENTS.length)) % WHEEL_SEGMENTS.length;
  },

  grantIdx(idx: number): number {
    Profile.addCoins(WHEEL_SEGMENTS[idx].coins);
    return WHEEL_SEGMENTS[idx].coins;
  },

  /** Consume the free daily spin and return the winning segment index + reward. */
  spin(): { idx: number; coins: number } {
    const idx = this.rollIdx();
    this.lastSpin = todayKey();
    Store.set('coil_wheel_date', this.lastSpin);
    return { idx, coins: this.grantIdx(idx) };
  },

  /** Consume the once-daily rewarded bonus spin. */
  spinBonus(): { idx: number; coins: number } {
    const idx = this.rollIdx();
    this.lastBonus = todayKey();
    Store.set('coil_wheel_bonus', this.lastBonus);
    return { idx, coins: this.grantIdx(idx) };
  },
};

/* ---------- bonus chests (earned via dailies / milestones) ---------- */
export const Chest = {
  count: Store.get<number>('coil_chests', 0),
  lastDailyGrant: Store.get<string>('coil_chest_daily', ''),

  /** Add chests to the player's stash (e.g. on completing all dailies). */
  grant(n: number): void {
    if (n <= 0) return;
    this.count += n;
    Store.set('coil_chests', this.count);
  },

  /** Grant the once-per-day "all missions complete" chest (idempotent per day).
   *  Returns true if a chest was actually granted. */
  grantDailyOnce(): boolean {
    if (this.lastDailyGrant === todayKey()) return false;
    this.lastDailyGrant = todayKey();
    Store.set('coil_chest_daily', this.lastDailyGrant);
    this.grant(1);
    return true;
  },

  available(): boolean {
    return this.count > 0;
  },

  /** Open one chest. Generous coin range + a few ◈ shards; consumes one. */
  open(): { coins: number; shards: number } {
    if (this.count <= 0) return { coins: 0, shards: 0 };
    this.count -= 1;
    Store.set('coil_chests', this.count);
    const coins = Math.round(rand(180, 420) / 10) * 10;
    const shards = Math.round(rand(3, 9));
    Profile.addCoins(coins);
    Profile.addShards(shards);
    return { coins, shards };
  },
};
