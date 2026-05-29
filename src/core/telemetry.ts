import { Store } from './store';
import { fx } from './utils';

/* =========================================================================
   TELEMETRY — privacy-safe, local-first gameplay analytics.

   This records ONLY anonymous gameplay aggregates (counts, heights, timings) so
   the design can be tuned with data instead of guesswork — exactly the signals
   the ideas doc calls for: where players die, first-run length, runs/session,
   perf rate, performance tier. No personal data, no network calls by default.

   Everything is kept compact and capped in localStorage. If a CrazyGames (or
   other) analytics sink is wired in later, `flush()` is the single hook: it
   hands over the event buffer and clears it.
   ========================================================================= */

export interface TelemetryAgg {
  sessions: number;        // app loads
  runs: number;            // runs started
  deaths: number;          // runs ended by death
  firstRunMs: number;      // duration of the very first run this device saw (0 = unset)
  bestHeight: number;      // max height ever observed via telemetry
  sumHeight: number;       // for average height
  sumPerf: number;         // for average perfects/run
  sumFlings: number;       // for perfect-rate (sumPerf / sumFlings)
  deathByVoid: number;
  deathByFall: number;
  deathBySpike: number;
  revives: number;
  shopOpens: number;
  unlocks: number;         // cosmetics unlocked
  reducedMotion: number;   // runs played with reduced motion on
  // coarse death-height histogram (buckets of 100m, index 0 = 0-99m, capped at 10 = 1000m+)
  deathBuckets: number[];
}

const KEY = 'coil_tele_v1';

function fresh(): TelemetryAgg {
  return {
    sessions: 0, runs: 0, deaths: 0, firstRunMs: 0, bestHeight: 0,
    sumHeight: 0, sumPerf: 0, sumFlings: 0,
    deathByVoid: 0, deathByFall: 0, deathBySpike: 0,
    revives: 0, shopOpens: 0, unlocks: 0, reducedMotion: 0,
    deathBuckets: new Array(11).fill(0),
  };
}

// Recent event ring buffer — kept small; the single hook a remote sink reads.
interface Evt { e: string; t: number; [k: string]: unknown; }
const EVT_CAP = 60;

export const Telemetry = {
  agg: ((): TelemetryAgg => {
    const a = Store.get<TelemetryAgg | null>(KEY, null);
    if (!a) return fresh();
    // tolerate older/partial saves
    return { ...fresh(), ...a, deathBuckets: a.deathBuckets ?? new Array(11).fill(0) };
  })(),
  events: [] as Evt[],
  runStartT: 0,

  save(): void { Store.set(KEY, this.agg); },

  push(e: string, data?: Record<string, unknown>): void {
    this.events.push({ e, t: Date.now(), ...data });
    if (this.events.length > EVT_CAP) this.events.splice(0, this.events.length - EVT_CAP);
  },

  session(): void {
    this.agg.sessions++;
    this.push('session', { fx: fx.level });
    this.save();
  },

  runStart(daily: boolean): void {
    this.agg.runs++;
    this.runStartT = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    this.push('run_start', { daily });
    this.save();
  },

  runEnd(height: number, perfects: number, flings: number, reduced: boolean): void {
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const ms = Math.max(0, Math.round(now - this.runStartT));
    if (this.agg.firstRunMs === 0) this.agg.firstRunMs = ms;
    this.agg.sumHeight += height;
    this.agg.sumPerf += perfects;
    this.agg.sumFlings += flings;
    if (height > this.agg.bestHeight) this.agg.bestHeight = height;
    if (reduced) this.agg.reducedMotion++;
    this.push('run_end', { height, perfects, flings, ms });
    this.save();
  },

  death(cause: 'void' | 'fall' | 'spike', height: number): void {
    this.agg.deaths++;
    if (cause === 'void') this.agg.deathByVoid++;
    else if (cause === 'fall') this.agg.deathByFall++;
    else this.agg.deathBySpike++;
    const b = Math.min(10, Math.max(0, Math.floor(height / 100)));
    this.agg.deathBuckets[b]++;
    this.push('death', { cause, height });
    this.save();
  },

  revive(): void { this.agg.revives++; this.push('revive'); this.save(); },
  shopOpen(): void { this.agg.shopOpens++; this.push('shop_open'); this.save(); },
  unlock(id: string): void { this.agg.unlocks++; this.push('unlock', { id }); this.save(); },

  /** Derived helpers (handy for a future in-game stats view). */
  avgHeight(): number { return this.agg.runs ? Math.round(this.agg.sumHeight / this.agg.runs) : 0; },
  perfectRate(): number { return this.agg.sumFlings ? this.agg.sumPerf / this.agg.sumFlings : 0; },

  /** The single hook for a remote analytics sink: returns + clears the buffer. */
  flush(): Evt[] {
    const out = this.events.slice();
    this.events.length = 0;
    return out;
  },
};
