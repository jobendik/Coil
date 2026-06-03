import { Store } from '../core/store';
import { settings } from '../settings';

/* =========================================================================
   ECHO GHOST (coil-retention-plan.md M5) — a translucent replay of the player's
   best NORMAL run, racing alongside them in real time. It is the most motivating
   opponent that exists: yesterday's you.

   Implementation: a low-rate (~20 Hz) sample of the orb's WORLD position, keyed
   by run-elapsed time. Both the recorded run and the replay start at t=0, so
   playing the ghost at the current G.t races the two climbs head-to-head. No
   servers, no input-replay determinism worries — just a position stream.
   Position-sampled (not input-replayed) so it survives physics tuning, and
   rounded to ints to keep the persisted blob tiny (~a few KB).
   ========================================================================= */

interface Sample { t: number; x: number; y: number; }

const SAMPLE_DT = 0.05;       // 20 Hz
const MAX_SAMPLES = 1600;     // ~80 s cap — plenty for any run

export const Echo = {
  best: Store.get<Sample[]>('coil_echo', []),   // persisted best-run path
  rec: [] as Sample[],                           // current run recording
  acc: 0,
  play: [] as Sample[],                          // path being replayed this run (may be empty)
  _i: 0,                                         // playback cursor (t is monotonic within a run)

  /** Begin recording a fresh run, and arm playback of the stored best (when the
   *  mode is eligible and the Echo toggle is on). */
  start(playback: boolean): void {
    this.rec = [];
    this.acc = 0;
    this.play = playback && settings.echoVisible ? this.best : [];
    this._i = 0;
  },

  /** Sample the live orb position (call each play step while alive). */
  sample(t: number, x: number, y: number, dt: number): void {
    this.acc += dt;
    if (this.acc < SAMPLE_DT) return;
    this.acc = 0;
    if (this.rec.length < MAX_SAMPLES) {
      this.rec.push({ t: Math.round(t * 100) / 100, x: Math.round(x), y: Math.round(y) });
    }
  },

  /** Persist the just-finished run as the new best-run ghost. */
  commit(): void {
    if (this.rec.length < 2) return;
    this.best = this.rec.slice();
    Store.set('coil_echo', this.best);
  },

  has(): boolean {
    return this.play.length > 1;
  },

  /** Interpolated ghost position at run-time `t`, or null once the past self has
   *  finished its climb (so the ghost vanishes when it "died"). */
  at(t: number): { x: number; y: number } | null {
    const a = this.play;
    if (a.length < 2) return null;
    while (this._i < a.length - 1 && a[this._i + 1].t <= t) this._i++;
    if (this._i >= a.length - 1) {
      const last = a[a.length - 1];
      return t <= last.t + 0.25 ? { x: last.x, y: last.y } : null;
    }
    const s0 = a[this._i];
    const s1 = a[this._i + 1];
    const f = (t - s0.t) / Math.max(1e-3, s1.t - s0.t);
    return { x: s0.x + (s1.x - s0.x) * f, y: s0.y + (s1.y - s0.y) * f };
  },
};
