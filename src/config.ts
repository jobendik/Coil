import type { Skin, Zone, Goal } from './types';

/* =========================================================================
   PHYSICS CONSTANTS (Hybrid: constant launch, forgiving survival)
   ========================================================================= */
export const OMEGA = 2.7;          // orbit angular speed (rad/s) — rhythm of the gate
export const ORBIT = 54;           // fixed orbit radius (predictable timing)
export const LAUNCH = 580;         // CONSTANT fling speed (no charge, no overcharge)
export const G_FALL = 520;         // gravity during flight (floaty arcs)
export const WALL = 0.82;          // side-wall bounce
export const CATCH_PAD = 22;       // generous auto-latch forgiveness (survival)
export const GATE_MARGIN = 6;      // the gate UNDER-promises: it only lights up angles whose closest
                                   // approach is within T.r+pl.r+6, while the real catch is +22. That
                                   // 16px buffer means small sub-step dips (wall bounces, grazes) can
                                   // never make a lit gate lie. Verified: 0 dishonest gates / 24k nodes.
export const PERFECT_TOL0 = 0.36;  // base perfect angular window (radians, narrows w/ height)
export const EARLY_EASE_BOOST = 1.6;     // 0-50m perfect tolerance multiplier (new-player ramp)
export const EARLY_EASE_END = 50;        // height (m) at which the boost decays to 1×
export const NEAR_MISS_RADIUS = 90;      // world-px radius for the one-per-run save rescue
export const DEATH_ANIM = 0.30;          // shortened death animation for snappier restart loop

export const DEBUG = false;

/* ---------- profile titles ---------- */
export const TITLES = [
  'Rookie', 'Operator', 'Specialist', 'Commander',
  'Veteran', 'Elite', 'Mythic', 'Legend',
];

/* ---------- skins (cosmetic only — never pay-to-win) ---------- */
export const SKINS: Skin[] = [
  { id: 'cyan',   name: 'Pulse', price: 0,    c: '#2ff3e0', t: '#9ffff2' },
  { id: 'amber',  name: 'Ember', price: 250,  c: '#ffb020', t: '#ffe39b' },
  { id: 'pink',   name: 'Neon',  price: 550,  c: '#ff4d8d', t: '#ffb0cd' },
  { id: 'lime',   name: 'Acid',  price: 900,  c: '#9be35a', t: '#dcffb0' },
  { id: 'violet', name: 'Void',  price: 1500, c: '#a76bff', t: '#dcc6ff' },
  { id: 'white',  name: 'Prism', price: 2600, c: '#ffffff', t: '#cfe9ff' },
];

/* ---------- daily mission goal pool ----------
   3 missions roll per day from this pool. Each slot picks from a difficulty tier
   so a player always sees one easy + one medium + one hard goal. The 'tier'
   keys are referenced by Daily.load when rolling. */
export const GOALS: Goal[] = [
  // easy (~30s effort)
  { id: 'runs',     t: 3,   kind: 'cum',    text: (n) => `Play ${n} runs`,                  reward: 40,  tier: 'easy' },
  { id: 'coinsE',   t: 60,  kind: 'cum',    text: (n) => `Collect ${n} coins`,               reward: 50,  tier: 'easy' },
  { id: 'heightE',  t: 80,  kind: 'runmax', text: (n) => `Reach ${n} m in one run`,          reward: 50,  tier: 'easy' },
  // medium (~2-3 min effort)
  { id: 'perf',     t: 16,  kind: 'cum',    text: (n) => `Land ${n} perfect flings`,         reward: 90,  tier: 'med' },
  { id: 'heightM',  t: 200, kind: 'runmax', text: (n) => `Reach ${n} m in one run`,          reward: 90,  tier: 'med' },
  { id: 'combo',    t: 5,   kind: 'runmax', text: (n) => `Chain an x${n} combo`,             reward: 90,  tier: 'med' },
  { id: 'coinsM',   t: 220, kind: 'cum',    text: (n) => `Collect ${n} coins`,               reward: 90,  tier: 'med' },
  // hard (~5-8 min skilled effort)
  { id: 'heightH',  t: 400, kind: 'runmax', text: (n) => `Reach ${n} m in one run`,          reward: 150, tier: 'hard' },
  { id: 'comboH',   t: 8,   kind: 'runmax', text: (n) => `Chain an x${n} combo`,             reward: 150, tier: 'hard' },
  { id: 'perfH',    t: 40,  kind: 'cum',    text: (n) => `Land ${n} perfect flings`,         reward: 150, tier: 'hard' },
];

/* ---------- combo milestone fireworks ----------
   Each entry: { at, label, color, payout }. When the combo counter hits `at`
   the run gets a screen flash + big burst + bonus coins + escalating sound. */
export const COMBO_TIERS = [
  { at: 3,  label: 'HOT!',     color: '#ffe39b', payout: 10 },
  { at: 5,  label: 'ON FIRE!', color: '#ff9b50', payout: 30 },
  { at: 8,  label: 'INSANE!',  color: '#ff4d8d', payout: 75 },
  { at: 12, label: 'UNREAL!',  color: '#9be35a', payout: 200 },
];

/* ---------- zones + milestones ---------- */
export const ZONES: Zone[] = [
  { name: 'NEON ORBIT',  from: 0,   bg: ['#160e33', '#0a0720', '#04030a'] },
  { name: 'GLITCH STORM', from: 250, bg: ['#2a0f33', '#160a26', '#06030f'] },
  { name: 'DEEP VOID',   from: 600, bg: ['#0a1430', '#05081c', '#020208'] },
];

export const MILESTONES = [100, 250, 500, 1000, 2000, 4000];

export const MILE_REWARD: Record<number, number> = {
  100: 5, 250: 10, 500: 15, 1000: 25, 2000: 40, 4000: 60,
};
