import { Store } from '../core/store';
import { DAILY_MEDALS } from '../config';
import { Profile } from './profile';
import type { DailyMedal } from '../types';

/* DAILY CHALLENGE — a date-seeded route every player climbs the same way today.
   Beat the medal thresholds for one-time daily coin rewards. This is distinct
   from the daily *missions* (cumulative tasks); this is a single shared run. */

function dayKey(): string {
  // UTC, deliberately: the date-seeded route must be IDENTICAL for every player
  // worldwide on the same calendar day. Local time would seed players in
  // different timezones onto different routes (and let someone cross local
  // midnight to re-attempt the same day), breaking the shared-route fairness the
  // Daily leaderboard depends on. Personal-cadence dates (streak in profile.ts,
  // login/wheel in rewards.ts) stay LOCAL on purpose — they're not competitive.
  const d = new Date();
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Deterministic seed for today's route (same for every player, all day). */
export function dailySeed(): number {
  return hashStr('coil_daily_route_' + dayKey());
}

interface DailyRunData {
  date: string;
  best: number;
  attempts: number;
  claimed: Record<string, number>;
}

export const DailyRun = {
  d: null as unknown as DailyRunData,

  load(): void {
    const k = dayKey();
    const stored = Store.get<DailyRunData | null>('coil_dailyrun', null);
    if (!stored || stored.date !== k) {
      this.d = { date: k, best: 0, attempts: 0, claimed: {} };
      Store.set('coil_dailyrun', this.d);
    } else {
      this.d = stored;
      // Guard a pre-`claimed` save so finish()'s this.d.claimed[m.id] can't throw.
      if (!this.d.claimed || typeof this.d.claimed !== 'object') this.d.claimed = {};
    }
  },

  save(): void {
    Store.set('coil_dailyrun', this.d);
  },

  played(): boolean {
    return this.d.attempts > 0;
  },

  /** Highest-threshold medal earned — picked by threshold, not array order, so
   *  reordering DAILY_MEDALS in config can't surface the wrong/lower medal. */
  topMedal(): DailyMedal | null {
    let m: DailyMedal | null = null;
    for (const x of DAILY_MEDALS) if (this.d.best >= x.th && (!m || x.th > m.th)) m = x;
    return m;
  },

  /** Lowest-threshold medal not yet reached (the next target). */
  nextMedal(): DailyMedal | null {
    let m: DailyMedal | null = null;
    for (const x of DAILY_MEDALS) if (this.d.best < x.th && (!m || x.th < m.th)) m = x;
    return m;
  },

  /** Record a finished daily run, granting any freshly-earned medals (once/day). */
  finish(h: number): DailyMedal[] {
    this.d.attempts++;
    if (h > this.d.best) this.d.best = h;
    const earned: DailyMedal[] = [];
    for (const m of DAILY_MEDALS) {
      if (h >= m.th && !this.d.claimed[m.id]) {
        this.d.claimed[m.id] = 1;
        Profile.addCoins(m.rw);
        earned.push(m);
      }
    }
    this.save();
    return earned;
  },
};

DailyRun.load();
