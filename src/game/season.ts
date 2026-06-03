import { Store } from '../core/store';
import { Profile } from './profile';
import { Chest } from './rewards';
import {
  SEASON_EPOCH_MS, SEASON_LEN_DAYS, SEASON_TIERS, SEASON_XP_PER_TIER, seasonReward, eliteReward,
} from '../config';

/* =========================================================================
   FREE SEASON TRACK (coil-retention-plan.md M6) — a rotating, 100%-free,
   30-tier reward track. Season XP accrues from every real run; crossing a tier
   auto-grants that tier's reward (coins / chests). Seasons rotate on a fixed
   N-day cadence derived from a UTC epoch, so every device computes the same
   season id with no server. Old progress resets cleanly when the id rolls over.

   No real money, no lockout copy (see config seasonReward) — purely additive.
   ========================================================================= */

interface SeasonData {
  id: string;
  xp: number;
  tier: number;          // highest tier whose reward has been granted
  eliteUnlocked: boolean; // M8 — gated behind the week's Weekly Missions
}

/** Deterministic season id from the UTC epoch — `S<periodIndex>`, advancing
 *  every SEASON_LEN_DAYS. Same on every device for the same calendar day. */
export function currentSeasonId(): string {
  const period = SEASON_LEN_DAYS * 86_400_000;
  const idx = Math.max(0, Math.floor((Date.now() - SEASON_EPOCH_MS) / period));
  return 'S' + idx;
}

/** Days remaining in the current season (for the honest countdown). */
export function seasonDaysLeft(): number {
  const period = SEASON_LEN_DAYS * 86_400_000;
  const sinceEpoch = Date.now() - SEASON_EPOCH_MS;
  const intoPeriod = ((sinceEpoch % period) + period) % period;
  return Math.ceil((period - intoPeriod) / 86_400_000);
}

export const Season = {
  d: ((): SeasonData => {
    const stored = Store.get<SeasonData | null>('coil_season', null);
    const id = currentSeasonId();
    if (!stored || stored.id !== id) {
      const fresh: SeasonData = { id, xp: 0, tier: 0, eliteUnlocked: false };
      Store.set('coil_season', fresh);
      return fresh;
    }
    return stored;
  })(),

  save(): void {
    Store.set('coil_season', this.d);
  },

  /** Lazily roll the season over if the calendar advanced (e.g. mid-session). */
  sync(): void {
    const id = currentSeasonId();
    if (this.d.id !== id) { this.d = { id, xp: 0, tier: 0, eliteUnlocked: false }; this.save(); }
  },

  /** Tier index (0..SEASON_TIERS) implied by the current XP total. */
  tierFor(xp: number): number {
    return Math.min(SEASON_TIERS, Math.floor(xp / SEASON_XP_PER_TIER));
  },

  /** 0..1 progress of the CURRENT (in-progress) tier toward the next. */
  tierProgress(): number {
    if (this.d.tier >= SEASON_TIERS) return 1;
    return (this.d.xp % SEASON_XP_PER_TIER) / SEASON_XP_PER_TIER;
  },

  /**
   * Add season XP, auto-granting the reward for every tier newly crossed.
   * Returns the XP gained and how many tiers were crossed (for the result screen).
   */
  addXP(n: number): { gain: number; tierUp: number } {
    if (n <= 0) return { gain: 0, tierUp: 0 };
    // Roll the season over lazily if the calendar advanced mid-session.
    const id = currentSeasonId();
    if (this.d.id !== id) { this.d = { id, xp: 0, tier: 0, eliteUnlocked: false }; }
    this.d.xp += n;
    const newTier = this.tierFor(this.d.xp);
    let tierUp = 0;
    while (this.d.tier < newTier) {
      this.d.tier++;
      tierUp++;
      const rw = seasonReward(this.d.tier);
      if (rw.coins) Profile.addCoins(rw.coins);
      if (rw.chest) Chest.grant(rw.chest);
      if (rw.shards) Profile.addShards(rw.shards);
      // If the Elite Track is already unlocked this season, each new tier also
      // pays its (richer) Elite reward (M8).
      if (this.d.eliteUnlocked) {
        const e = eliteReward(this.d.tier);
        Profile.addCoins(e.coins);
        Profile.addShards(e.shards);
      }
    }
    this.save();
    return { gain: n, tierUp };
  },

  /** M8 Elite Track — unlocked by completing the week's Weekly Orders. Grants all
   *  Elite rewards up to the current tier RETROACTIVELY (the "it was building in
   *  the background" payoff), then future tiers pay Elite on top via addXP. */
  unlockElite(): void {
    if (this.d.eliteUnlocked) return;
    this.d.eliteUnlocked = true;
    for (let tier = 1; tier <= this.d.tier; tier++) {
      const e = eliteReward(tier);
      Profile.addCoins(e.coins);
      Profile.addShards(e.shards);
    }
    this.save();
  },
};
