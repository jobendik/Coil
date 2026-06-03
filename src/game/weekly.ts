import { Store } from '../core/store';
import { WEEKLY_GOALS, WEEKLY_ACTIVITY_DAYS, WEEKLY_ACTIVITY_CHESTS, WEEKLY_ALLDONE_CHESTS } from '../config';
import { Profile } from './profile';
import { Chest } from './rewards';
import { Season } from './season';
import type { Goal, MissionState } from '../types';
import { clamp } from '../core/utils';

/* =========================================================================
   WEEKLY ORDERS + ACTIVITY METER (coil-retention-plan.md M4)

   - 5 fixed weekly orders (cumulative across the week). Completing all five
     unlocks the season's Elite Track — the honest "earned premium track".
   - A forgiving activity meter: climb on any 3 days this week → a weekly chest.
     Missing a day never wipes anything; the meter just fills slower.

   Weeks roll on a Monday-based key derived locally (no server). Rolling over to a
   new week resets progress but never removes already-granted rewards.
   ========================================================================= */

/** Monday-based ISO-ish week key: `YYYY-W##`. Same for every device that week. */
export function weekKey(d = new Date()): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  // Shift to the Thursday of this week so the year/week is ISO-stable.
  const day = (x.getDay() + 6) % 7;       // Mon=0 … Sun=6
  x.setDate(x.getDate() - day + 3);
  const firstThu = new Date(x.getFullYear(), 0, 4);
  const week = 1 + Math.round(
    ((x.getTime() - firstThu.getTime()) / 86_400_000 - 3 + ((firstThu.getDay() + 6) % 7)) / 7,
  );
  return `${x.getFullYear()}-W${week}`;
}

function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

interface WeeklyData {
  week: string;
  missions: MissionState[];     // one per WEEKLY_GOALS entry (idx = index into WEEKLY_GOALS)
  days: string[];               // distinct day keys played this week
  chestClaimed: boolean;        // activity-meter chest already granted this week
  eliteGranted: boolean;        // Elite Track already unlocked this week
}

function freshWeek(week: string): WeeklyData {
  return {
    week,
    missions: WEEKLY_GOALS.map((_, idx) => ({ idx, prog: 0, done: false })),
    days: [],
    chestClaimed: false,
    eliteGranted: false,
  };
}

export const Weekly = {
  d: null as unknown as WeeklyData,

  load(): void {
    const stored = Store.get<WeeklyData | null>('coil_weekly', null);
    const k = weekKey();
    const valid = stored !== null && stored.week === k
      && Array.isArray(stored.missions) && stored.missions.length === WEEKLY_GOALS.length;
    this.d = valid ? (stored as WeeklyData) : freshWeek(k);
    if (!valid) this.save();
  },

  save(): void {
    Store.set('coil_weekly', this.d);
  },

  /** Lazily roll to the current week (a session may cross midnight Sunday). */
  sync(): void {
    const k = weekKey();
    if (this.d.week !== k) { this.d = freshWeek(k); this.save(); }
  },

  missions(): MissionState[] {
    return this.d.missions;
  },

  goalFor(m: MissionState): Goal {
    return WEEKLY_GOALS[m.idx];
  },

  /** Record today as an activity day. Returns the number of chests just granted
   *  (when the meter first reaches WEEKLY_ACTIVITY_DAYS this week), else 0. */
  noteDay(): number {
    this.sync();
    const k = dayKey();
    if (!this.d.days.includes(k)) this.d.days.push(k);
    let granted = 0;
    if (!this.d.chestClaimed && this.d.days.length >= WEEKLY_ACTIVITY_DAYS) {
      this.d.chestClaimed = true;
      Chest.grant(WEEKLY_ACTIVITY_CHESTS);
      granted = WEEKLY_ACTIVITY_CHESTS;
    }
    this.save();
    return granted;
  },

  /** Report progress against weekly orders whose metric matches `kind`. Returns
   *  total newly-granted reward (0 if nothing completed). Mirrors Daily.report. */
  report(kind: string, val: number): number {
    this.sync();
    let totalReward = 0;
    for (const m of this.d.missions) {
      if (m.done) continue;
      const g = WEEKLY_GOALS[m.idx];
      if (!g.id.startsWith(kind)) continue;
      if (g.kind === 'cum') m.prog += val;
      else m.prog = Math.max(m.prog, val);
      if (m.prog >= g.t) {
        m.done = true;
        Profile.addCoins(g.reward);
        totalReward += g.reward;
      }
    }
    // All five complete → finale chest + a shard bundle + unlock the Elite Track.
    if (!this.d.eliteGranted && this.allDone()) {
      this.d.eliteGranted = true;
      Chest.grant(WEEKLY_ALLDONE_CHESTS);
      Profile.addShards(40);
      Season.unlockElite();
    }
    this.save();
    return totalReward;
  },

  /** Whole-week completion ratio for the home strip + result-screen season bar. */
  pct(): number {
    let sum = 0;
    for (const m of this.d.missions) sum += clamp(m.prog / WEEKLY_GOALS[m.idx].t, 0, 1);
    return sum / this.d.missions.length;
  },

  doneCount(): number {
    return this.d.missions.filter((m) => m.done).length;
  },

  allDone(): boolean {
    return this.d.missions.every((m) => m.done);
  },

  activityDays(): number {
    return this.d.days.length;
  },
};

Weekly.load();
