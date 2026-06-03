import { Store } from '../core/store';
import { MASTERY_PER_LEVEL, MASTERY_MAX_LEVEL, masteryReward, ZONES } from '../config';
import { Profile } from './profile';

/* =========================================================================
   ZONE MASTERY (coil-retention-plan.md M8) — level the zones the player engages
   with, not just the account. Each zone banks the perfect snaps landed there;
   every MASTERY_PER_LEVEL perfects is a level (coins + occasional shards). This
   multiplies long-term goals without new content and gives per-zone identity.
   ========================================================================= */

export const Mastery = {
  xp: Store.obj<Record<number, number>>('coil_mastery', {}),

  perfects(zone: number): number {
    return this.xp[zone] ?? 0;
  },

  level(zone: number): number {
    return Math.min(MASTERY_MAX_LEVEL, Math.floor(this.perfects(zone) / MASTERY_PER_LEVEL));
  },

  /** 0..1 progress within the current level of a zone. */
  progress(zone: number): number {
    if (this.level(zone) >= MASTERY_MAX_LEVEL) return 1;
    return (this.perfects(zone) % MASTERY_PER_LEVEL) / MASTERY_PER_LEVEL;
  },

  /**
   * Bank perfect snaps into a zone's mastery, granting the reward for any levels
   * crossed. Returns the number of levels gained (0 if none) for a toast.
   */
  add(zone: number, perfects: number): number {
    if (perfects <= 0 || zone < 0 || zone >= ZONES.length) return 0;
    const before = this.level(zone);
    this.xp[zone] = this.perfects(zone) + perfects;
    Store.set('coil_mastery', this.xp);
    const after = this.level(zone);
    let gained = 0;
    for (let lv = before + 1; lv <= after; lv++) {
      const rw = masteryReward(lv);
      Profile.addCoins(rw.coins);
      Profile.addShards(rw.shards);
      gained++;
    }
    return gained;
  },

  /** Total mastery levels across all zones (a tidy "depth" stat). */
  totalLevels(): number {
    let n = 0;
    for (let z = 0; z < ZONES.length; z++) n += this.level(z);
    return n;
  },
};
