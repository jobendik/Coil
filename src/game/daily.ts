import { Store } from '../core/store';
import { GOALS } from '../config';
import { Profile } from './profile';
import type { DailyData, Goal, GoalTier, MissionState } from '../types';
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

function rollMissions(key: string): MissionState[] {
  // Deterministic-by-day picks: one per tier so each day always shows a clear easy/med/hard ladder.
  const tiers: GoalTier[] = ['easy', 'med', 'hard'];
  const base = hashStr(key);
  return tiers.map((tier, i) => {
    const pool: number[] = [];
    for (let j = 0; j < GOALS.length; j++) if (GOALS[j].tier === tier) pool.push(j);
    const idx = pool[(base + i * 17) % pool.length];
    return { idx, prog: 0, done: false };
  });
}

export const Daily = {
  d: null as unknown as DailyData,

  load(): void {
    const stored = Store.get<DailyData | null>('coil_daily', null);
    const k = dayKey();
    // Validate shape: old single-mission data + new multi-mission both flow through here.
    const valid =
      stored !== null &&
      stored.date === k &&
      Array.isArray(stored.missions) &&
      stored.missions.length === 3 &&
      stored.missions.every((m) =>
        m && typeof m.idx === 'number' && GOALS[m.idx] !== undefined &&
        typeof m.prog === 'number' && typeof m.done === 'boolean',
      );
    this.d = valid ? (stored as DailyData) : { date: k, missions: rollMissions(k) };
    if (!valid) Store.set('coil_daily', this.d);
  },

  save(): void {
    Store.set('coil_daily', this.d);
  },

  missions(): MissionState[] {
    return this.d.missions;
  },

  goalFor(m: MissionState): Goal {
    return GOALS[m.idx];
  },

  /**
   * Report progress against ALL missions whose goal matches `kind`. Returns
   * the total reward newly granted in this report (sum of every mission that
   * just completed); 0 if nothing changed. The run-loop uses this to surface
   * a "MISSION COMPLETE" toast when at least one mission finished.
   */
  report(kind: string, val: number): number {
    let totalReward = 0;
    for (const m of this.d.missions) {
      if (m.done) continue;
      const g = GOALS[m.idx];
      // Match the metric family. Every goal id is `<kind><tier?>` (e.g. heightE /
      // comboH / runs), so a prefix test is robust — unlike stripping a trailing
      // [EMH], which would mis-match any future id whose metric ends in those letters.
      if (!g.id.startsWith(kind)) continue;
      if (g.kind === 'cum') m.prog += val;
      else m.prog = Math.max(m.prog, val);
      if (m.prog >= g.t) {
        m.done = true;
        Profile.addCoins(g.reward);
        totalReward += g.reward;
      }
    }
    this.save();
    return totalReward;
  },

  /**
   * Whole-day completion ratio for the home-screen progress bar (average across
   * the three missions, weighted equally).
   */
  pct(): number {
    let sum = 0;
    for (const m of this.d.missions) {
      sum += clamp(m.prog / GOALS[m.idx].t, 0, 1);
    }
    return sum / this.d.missions.length;
  },

  allDone(): boolean {
    return this.d.missions.every((m) => m.done);
  },
};

Daily.load();
