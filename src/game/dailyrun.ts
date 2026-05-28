import { Store } from '../core/store';
import { DAILY_MEDALS } from '../config';
import { Profile } from './profile';
import type { DailyMedal } from '../types';

/* DAILY CHALLENGE — a date-seeded route every player climbs the same way today.
   Beat the medal thresholds for one-time daily coin rewards. This is distinct
   from the daily *missions* (cumulative tasks); this is a single shared run. */

function dayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
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
    }
  },

  save(): void {
    Store.set('coil_dailyrun', this.d);
  },

  played(): boolean {
    return this.d.attempts > 0;
  },

  topMedal(): DailyMedal | null {
    let m: DailyMedal | null = null;
    for (const x of DAILY_MEDALS) if (this.d.best >= x.th) m = x;
    return m;
  },

  nextMedal(): DailyMedal | null {
    return DAILY_MEDALS.find((x) => this.d.best < x.th) || null;
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
