import { Store } from '../core/store';
import { CAREER_MILESTONES } from '../config';
import type { CareerMilestone } from '../config';
import { Profile } from './profile';
import { clamp } from '../core/utils';

/* =========================================================================
   CAREER MILESTONES (coil-retention-plan.md M8) — long-term lifetime goals that
   teach the ceiling and reward the grind. Each is one-time; crossing it grants
   coins + shards. Partial progress is always visible (a return hook).
   ========================================================================= */

export const Career = {
  claimed: Store.get<Record<string, number>>('coil_career', {}),

  valueFor(kind: CareerMilestone['kind']): number {
    if (kind === 'height') return Profile.lifetimeHeight;
    if (kind === 'perf') return Profile.perfectsTotal;
    return Profile.runsPlayed;
  },

  /** Grant any milestones now satisfied but not yet claimed. Returns them. */
  check(): CareerMilestone[] {
    const out: CareerMilestone[] = [];
    for (const m of CAREER_MILESTONES) {
      if (this.claimed[m.id]) continue;
      if (this.valueFor(m.kind) >= m.t) {
        this.claimed[m.id] = 1;
        Profile.addCoins(m.coins);
        Profile.addShards(m.shards);
        out.push(m);
      }
    }
    if (out.length) Store.set('coil_career', this.claimed);
    return out;
  },

  /** The nearest unclaimed milestone (for a "X / Y" return-hook line), or null. */
  nearest(): { m: CareerMilestone; value: number; frac: number } | null {
    let best: { m: CareerMilestone; value: number; frac: number } | null = null;
    for (const m of CAREER_MILESTONES) {
      if (this.claimed[m.id]) continue;
      const value = this.valueFor(m.kind);
      const frac = clamp(value / m.t, 0, 1);
      if (!best || frac > best.frac) best = { m, value, frac };
    }
    return best;
  },

  count(): number {
    return Object.keys(this.claimed).length;
  },
};
