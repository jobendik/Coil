import type { Skin, Zone, Goal, Trail, World, DailyMedal } from './types';

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

/* ---------- near-perfect combo protection (anti-rage-quit) ----------
   Once per run, a fling that JUST misses the perfect window while the player
   is on a worthwhile chain is forgiven: the combo is preserved (not broken)
   and the player sees a "NEAR PERFECT" pop. Reduces the "I barely missed and
   lost my whole combo" frustration the ideas doc calls out, without making
   perfects free — it's one save, only on a genuine near-miss, only at x5+. */
export const NEAR_PERFECT_BAND = 1.7;    // miss within tol×this counts as "near"
export const NEAR_PERFECT_MIN_COMBO = 5; // only protect chains worth keeping

export const DEBUG = false;

/* ---------- profile titles ---------- */
export const TITLES = [
  'Rookie', 'Operator', 'Specialist', 'Commander',
  'Veteran', 'Elite', 'Mythic', 'Legend',
];

/* ---------- skins (cosmetic only — never pay-to-win) ----------
   Most are coin-buyable; a couple carry a skill `req` so they're EARNED, not
   bought (see game/unlocks.ts). price is still shown as the fallback. */
export const SKINS: Skin[] = [
  { id: 'cyan',   name: 'Pulse', price: 0,    c: '#2ff3e0', t: '#9ffff2', tag: 'Starter' },
  { id: 'amber',  name: 'Ember', price: 250,  c: '#ffb020', t: '#ffe39b', tag: 'Fast' },
  { id: 'pink',   name: 'Neon',  price: 550,  c: '#ff4d8d', t: '#ffb0cd', tag: 'Cute' },
  { id: 'lime',   name: 'Acid',  price: 900,  c: '#9be35a', t: '#dcffb0', tag: 'Zippy' },
  { id: 'violet', name: 'Void',  price: 1500, c: '#a76bff', t: '#dcc6ff', tag: 'Spooky', req: { kind: 'height', value: 500 } },
  { id: 'white',  name: 'Prism', price: 2600, c: '#ffffff', t: '#cfe9ff', tag: 'Mythic', req: { kind: 'ach', value: 'first1k' } },
];

/* ---------- trails (flight ribbon styles — cosmetic) ---------- */
export const TRAILS: Trail[] = [
  { id: 'line',    name: 'Clean Beam',     price: 0,    style: 'line',    c: null,      t: null,      tag: 'Readable' },
  { id: 'comet',   name: 'Comet Tail',     price: 200,  style: 'comet',   c: '#ffb020', t: '#ffe39b', tag: 'Speed' },
  { id: 'dots',    name: 'Candy Dots',     price: 320,  style: 'dots',    c: '#ff4d8d', t: '#ffb0cd', tag: 'Pop' },
  { id: 'sparkle', name: 'Stardust',       price: 480,  style: 'sparkle', c: '#cfe9ff', t: '#ffffff', tag: 'Magic' },
  { id: 'bubbles', name: 'Nebula Bubbles', price: 640,  style: 'bubbles', c: '#55d6ff', t: '#d5f8ff', tag: 'Soft' },
  { id: 'rainbow', name: 'Prism Ribbon',   price: 1400, style: 'rainbow', c: null,      t: null,      tag: 'Rare', req: { kind: 'combo', value: 9 } },
];

/* ---------- worlds (backdrop + void colour + node accent — cosmetic) ---------- */
export const WORLDS: World[] = [
  { id: 'neon',    name: 'Neon Orbit',   price: 0,    bg: ['#160e33', '#0a0720', '#04030a'], alt: ['#33103f', '#180a2c', '#06030f'], void: '#ff3b5c', node: '#2ff3e0', tag: 'Classic' },
  { id: 'candy',   name: 'Candy Galaxy', price: 600,  bg: ['#4a174b', '#23103d', '#08041a'], alt: ['#71215b', '#341a58', '#100622'], void: '#ff6faf', node: '#ffd24a', tag: 'Sweet' },
  { id: 'crystal', name: 'Crystal Moon', price: 950,  bg: ['#12315d', '#071a36', '#020611'], alt: ['#185372', '#0b294e', '#03101f'], void: '#55d6ff', node: '#cfe9ff', tag: 'Clean' },
  { id: 'sakura',  name: 'Sakura Stars', price: 1300, bg: ['#4c1b38', '#21142d', '#08040f'], alt: ['#693056', '#2c183d', '#120819'], void: '#ff8bc2', node: '#ffd0e4', tag: 'Dream' },
  { id: 'gold',    name: 'Golden Arcade',price: 1800, bg: ['#3b2608', '#171008', '#050302'], alt: ['#5e390a', '#281604', '#090402'], void: '#ffb020', node: '#ffd24a', tag: 'Jackpot' },
  { id: 'aurora',  name: 'Aurora Void',  price: 2400, bg: ['#092c35', '#071d2b', '#02050b'], alt: ['#123c57', '#102048', '#030714'], void: '#2ff3e0', node: '#9be35a', tag: 'Premium', req: { kind: 'streak', value: 7 } },
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

/* ---------- zones + milestones ----------
   Zones are depth *bands*: they drive the zone-name toast and the background's
   depth-blend progress (tt). The actual palette is owned by the equipped WORLD
   (see collection.ts / drawBG), so zones intentionally carry no colours. */
export const ZONES: Zone[] = [
  { name: 'NEON ORBIT',   from: 0 },
  { name: 'GLITCH STORM', from: 250 },
  { name: 'DEEP VOID',    from: 600 },
];

export const MILESTONES = [100, 250, 500, 1000, 2000, 4000];

export const MILE_REWARD: Record<number, number> = {
  100: 5, 250: 10, 500: 15, 1000: 25, 2000: 40, 4000: 60,
};

/* ---------- STAR VAULT (skill-gated jackpot, no betting) ----------
   Grows passively during play, capped. Won by catching a bonus node while on a
   high combo — rare and purely skill-driven, never a paid chance. */
export const VAULT_START = 50;       // reset value after a win
export const VAULT_MAX = 5000;       // hard cap
export const VAULT_RATE = 1;         // ★ per second of active play
export const VAULT_WIN_COMBO = 9;    // combo required to claim on a bonus catch

/* ---------- FRENZY / OVERDRIVE (skill-earned flow state) ---------- */
export const OVERDRIVE_BASE = 0.10;  // meter gain per perfect (before combo bonus)
export const OVERDRIVE_PER_COMBO = 0.018;
export const FRENZY_TIME = 8;        // seconds of 2× coins + disco bloom
export const FRENZY_COIN_MULT = 2;
export const FRENZY_VOID_EASE = 0.55; // void rises slower during FRENZY (flow protection)

/* ---------- DAILY CHALLENGE medals (one-time daily coin rewards) ---------- */
export const DAILY_MEDALS: DailyMedal[] = [
  { id: 'bronze', name: 'BRONZE', th: 150, rw: 30,  c: '#d8975a' },
  { id: 'silver', name: 'SILVER', th: 300, rw: 60,  c: '#cfe0ff' },
  { id: 'gold',   name: 'GOLD',   th: 500, rw: 120, c: '#ffd24a' },
];
