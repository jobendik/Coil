import { Store } from '../core/store';
import type { Achievement, AchSummary } from '../types';

/* Genuine achievements — each tied to a real, earned outcome. Unlocks are
   one-time and surfaced on the result screen the run they fire. */
export const ACH: Achievement[] = [
  { id: 'first100', t: 'CENTURY',       d: 'Reach 100 m',          test: (r) => r.best >= 100 },
  { id: 'first500', t: 'HIGH ORBIT',    d: 'Reach 500 m',          test: (r) => r.best >= 500 },
  { id: 'first1k',  t: 'STRATOSPHERE',  d: 'Reach 1000 m',         test: (r) => r.best >= 1000 },
  { id: 'p20',      t: 'FLAWLESS',      d: '20 perfects in a run', test: (r) => r.runPerf >= 20 },
  { id: 'combo10',  t: 'MEGA CHAIN',    d: 'Chain an x10 combo',   test: (r) => r.maxCombo >= 10 },
  { id: 'frenzy',   t: 'FRENZY!',       d: 'Trigger Frenzy Mode',  test: (r) => r.frenzied },
  { id: 'streak3',  t: 'COMMITTED',     d: '3 day streak',         test: (r) => r.streak >= 3 },
  { id: 'streak7',  t: 'WEEK ONE',      d: '7 day streak',         test: (r) => r.streak >= 7 },
  { id: 'vault',    t: 'VAULT BREAKER', d: 'Win the Star Vault',   test: (r) => r.potWon },
  { id: 'daily',    t: 'DAILY RUNNER',  d: 'Finish a Daily Challenge', test: (r) => r.daily },
  { id: 'constel5', t: 'STARWEAVER',    d: 'Complete 5 constellations',  test: (r) => r.constellations >= 5 },
  { id: 'constel20',t: 'CONSTELLER',    d: 'Complete 20 constellations', test: (r) => r.constellations >= 20 },
];

export const Achievements = {
  unlocked: Store.obj<Record<string, number>>('coil_ach', {}),

  /** Returns the list of achievements newly satisfied by this run summary. */
  check(r: AchSummary): Achievement[] {
    const out: Achievement[] = [];
    for (const a of ACH) {
      if (this.unlocked[a.id]) continue;
      if (a.test(r)) { this.unlocked[a.id] = 1; out.push(a); }
    }
    if (out.length) Store.set('coil_ach', this.unlocked);
    return out;
  },

  count(): number {
    return Object.keys(this.unlocked).length;
  },
};
