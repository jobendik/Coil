import type { Skin, Zone, Goal } from './types';

/* =========================================================================
   PHYSICS CONSTANTS (Hybrid: constant launch, perfect band is reward-only)
   ========================================================================= */
export const OMEGA = 3.05;        // orbit angular speed (rad/s)
export const G_FALL = 720;        // gravity during flight (px/s²)
export const LAUNCH = 780;        // CONSTANT fling speed — survival never depends on charge
export const CHARGE_TIME = 0.70;  // seconds for one full sweep of the ping-ponging charge
export const MINR = 28;           // orbit radius lower clamp (close latch = tight orbit)
export const MAXR = 82;           // orbit radius upper clamp
export const CATCH_PAD = 24;      // base catch generosity (narrows with height — see curCatchPad)
export const PERFECT_LO = 0.60;   // start of the perfect band (perfectHi() returns the upper edge)
export const WALL_BOUNCE = 0.82;

export const DEBUG = false;

/* ---------- profile titles ---------- */
export const TITLES = [
  'Rookie', 'Operator', 'Specialist', 'Commander',
  'Veteran', 'Elite', 'Mythic', 'Legend',
];

/* ---------- skins (cosmetic only — never pay-to-win) ---------- */
export const SKINS: Skin[] = [
  { id: 'cyan',   name: 'Pulse', price: 0,    c: '#2ff3e0', t: '#9ffff2' },
  { id: 'amber',  name: 'Ember', price: 300,  c: '#ffb020', t: '#ffe39b' },
  { id: 'pink',   name: 'Neon',  price: 600,  c: '#ff4d8d', t: '#ffb0cd' },
  { id: 'lime',   name: 'Acid',  price: 900,  c: '#9be35a', t: '#dcffb0' },
  { id: 'violet', name: 'Void',  price: 1500, c: '#a76bff', t: '#dcc6ff' },
  { id: 'white',  name: 'Prism', price: 2600, c: '#ffffff', t: '#cfe9ff' },
];

/* ---------- daily mission goal pool ---------- */
export const GOALS: Goal[] = [
  { id: 'height', t: 280, kind: 'runmax', text: (n) => `Reach ${n} m in one run`,    reward: 90 },
  { id: 'perf',   t: 14,  kind: 'cum',    text: (n) => `Land ${n} perfect releases`, reward: 90 },
  { id: 'combo',  t: 9,   kind: 'runmax', text: (n) => `Chain an x${n} combo`,        reward: 100 },
  { id: 'coins',  t: 160, kind: 'cum',    text: (n) => `Collect ${n} coins`,          reward: 80 },
  { id: 'runs',   t: 6,   kind: 'cum',    text: (n) => `Finish ${n} runs`,            reward: 80 },
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
