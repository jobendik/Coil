import type { Skin, Zone, Goal, Trail, World, DailyMedal, Accessory } from './types';

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

/* ---------- doomed-flight fast-forward (anti-dead-time) ----------
   A gentle launch means a hopeless fling can float up and drift down for 3–4 s
   before death registers — pure boredom. When a lookahead proves the flight will
   only ever reach the void/bottom with no catch, we run the clock faster so the
   inevitable resolves quickly. Real physics still run, so wall-bounce luck and
   the near-miss rescue still fire — just sooner. */
export const DOOM_TIMESCALE = 2.8;

/* ---------- DECAY GATE (new depth beat — "unstable gate") ----------
   A node that COLLAPSES while you orbit it: latch on and a countdown starts, so
   you must fling away before it shatters (a fall, with shield + the once-per-run
   near-miss rescue still saving you). It introduces TIME pressure / rhythm without
   touching the flight or the honest gate at all — arcMinApproach launches from the
   fixed ORBIT radius + the node centre and never reads a node's radius/decay, and
   as a TARGET a decay gate is full-radius (decay only starts once caught). So the
   gate-honesty invariant is preserved by construction (and re-proven over a corpus
   that includes decay gates in scripts/gate-honesty.test.ts).
   Window is generous: a full orbit revolution is TAU/OMEGA ≈ 2.33 s, so 1.75 s
   leaves most of a lap to choose a release. First appears past the GLITCH STORM. */
export const DECAY_TIME = 1.75;          // seconds before an orbited decay gate collapses
export const DECAY_FROM_M = 280;         // height (m) at which decay gates start spawning
export const LAND_SQUASH = 0.18;         // creature squash-on-catch duration (s)

/* Upward velocity of the shield / Zen bottom bounce. High enough that the player
   clearly launches back up and visibly re-attaches to a gate (was too low). */
export const BOUNCE_VY = 1040;

export const DEBUG = false;

/* CrazyGames leaderboards are invite-only. The submission path is wired and
   defensive but dormant: flip this to true once invited (and the SDK exposes
   `leaderboards`) to light up the weekly-height board with zero further work. */
export const LEADERBOARDS_ENABLED = false;
export const LEADERBOARD_ID = 'weekly_height';

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

/* ---------- milestone evolution characters (height-earned, one per 100 m) ----------
   A dedicated progression TRACK, separate from the coin shop. One new character
   unlocks every 100 m and is auto-claimed when that height is reached (see
   game/unlocks.ts). They are browsed + equipped from the death-screen Evolution
   panel rather than the shop grid (which doesn't scroll). Purely cosmetic — these
   carry a colour identity; accessories add shape variety on top. Hand-tuned neon
   palette so the ladder reads as a premium "evolving creature", not random recolours. */
export const MILESTONE_STEP = 100;
export const MILESTONE_SKINS: Skin[] = [
  { id: 'evo1',  name: 'Sprout',  price: 0, c: '#6bffb0', t: '#d6ffec', tag: 'Evolution', req: { kind: 'height', value: 100 } },
  { id: 'evo2',  name: 'Drift',   price: 0, c: '#45d7ff', t: '#cdf3ff', tag: 'Evolution', req: { kind: 'height', value: 200 } },
  { id: 'evo3',  name: 'Surge',   price: 0, c: '#5b86ff', t: '#cdd8ff', tag: 'Evolution', req: { kind: 'height', value: 300 } },
  { id: 'evo4',  name: 'Bloom',   price: 0, c: '#9b6bff', t: '#e0d3ff', tag: 'Evolution', req: { kind: 'height', value: 400 } },
  { id: 'evo5',  name: 'Lumen',   price: 0, c: '#ff6bd6', t: '#ffd3f2', tag: 'Evolution', req: { kind: 'height', value: 500 } },
  { id: 'evo6',  name: 'Blaze',   price: 0, c: '#ff7a4d', t: '#ffd8c6', tag: 'Evolution', req: { kind: 'height', value: 600 } },
  { id: 'evo7',  name: 'Crest',   price: 0, c: '#ffc24d', t: '#ffeec2', tag: 'Evolution', req: { kind: 'height', value: 700 } },
  { id: 'evo8',  name: 'Helix',   price: 0, c: '#b6ff4d', t: '#e9ffc2', tag: 'Evolution', req: { kind: 'height', value: 800 } },
  { id: 'evo9',  name: 'Quasar',  price: 0, c: '#4dffd0', t: '#c6fff1', tag: 'Evolution', req: { kind: 'height', value: 900 } },
  { id: 'evo10', name: 'Pulsar',  price: 0, c: '#7aa0ff', t: '#d6e2ff', tag: 'Evolution', req: { kind: 'height', value: 1000 } },
  { id: 'evo11', name: 'Nebula',  price: 0, c: '#c77dff', t: '#ecd6ff', tag: 'Evolution', req: { kind: 'height', value: 1100 } },
  { id: 'evo12', name: 'Zenith',  price: 0, c: '#ffffff', t: '#fff6c2', tag: 'Evolution', req: { kind: 'height', value: 1200 } },
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

/* ---------- accessories (worn ON TOP of the character — a 2nd equip slot) ----------
   A mixed set: orbiting satellites, glow auras, and headgear. Some coin-buyable,
   some skill-earned (varied routes). `c: null` inherits the character colour so
   any accessory pairs with any character. Kept ≤ a screen of cards so the shop
   grid (which doesn't scroll) shows them all, like the Worlds tab. */
export const ACCESSORIES: Accessory[] = [
  { id: 'none',     name: 'None',         price: 0,    kind: 'none',  c: null,      t: null,      tag: 'Default' },
  { id: 'moons',    name: 'Moons',        price: 300,  kind: 'orbit', c: null,      t: null,      tag: 'Orbit', count: 3, shape: 'moon' },
  { id: 'stardust', name: 'Stardust Ring',price: 550,  kind: 'orbit', c: '#ffe39b', t: '#fff6c2', tag: 'Orbit', count: 5, shape: 'star' },
  { id: 'halo',     name: 'Halo',         price: 450,  kind: 'aura',  c: '#cfe9ff', t: '#ffffff', tag: 'Aura',  glyph: 'halo' },
  { id: 'nova',     name: 'Nova Aura',    price: 0,    kind: 'aura',  c: '#a9ecff', t: '#d5f8ff', tag: 'Aura',  glyph: 'soft', req: { kind: 'constel', value: 5 } },
  { id: 'crown',    name: 'Crown',        price: 0,    kind: 'crown', c: '#ffd24a', t: '#fff6c2', tag: 'Royal', glyph: 'crown', req: { kind: 'combo', value: 8 } },
  { id: 'visor',    name: 'Visor',        price: 0,    kind: 'crown', c: '#2ff3e0', t: '#9ffff2', tag: 'Tech',  glyph: 'visor', req: { kind: 'height', value: 700 } },
];

/* ---------- worlds (backdrop + void colour + node accent — cosmetic) ---------- */
export const WORLDS: World[] = [
  { id: 'neon',    name: 'Neon Orbit',   price: 0,    bg: ['#160e33', '#0a0720', '#04030a'], alt: ['#33103f', '#180a2c', '#06030f'], void: '#ff3b5c', node: '#2ff3e0', tag: 'Classic' },
  { id: 'candy',   name: 'Candy Galaxy', price: 600,  bg: ['#4a174b', '#23103d', '#08041a'], alt: ['#71215b', '#341a58', '#100622'], void: '#ff6faf', node: '#ffd24a', tag: 'Sweet' },
  { id: 'crystal', name: 'Crystal Moon', price: 950,  bg: ['#12315d', '#071a36', '#020611'], alt: ['#185372', '#0b294e', '#03101f'], void: '#55d6ff', node: '#cfe9ff', tag: 'Clean' },
  { id: 'sakura',  name: 'Sakura Stars', price: 1300, bg: ['#4c1b38', '#21142d', '#08040f'], alt: ['#693056', '#2c183d', '#120819'], void: '#ff8bc2', node: '#ffd0e4', tag: 'Dream' },
  { id: 'gold',    name: 'Golden Arcade',price: 1800, bg: ['#3b2608', '#171008', '#050302'], alt: ['#5e390a', '#281604', '#090402'], void: '#ffb020', node: '#ffd24a', tag: 'Jackpot' },
  { id: 'aurora',  name: 'Aurora Void',  price: 2400, bg: ['#092c35', '#071d2b', '#02050b'], alt: ['#123c57', '#102048', '#030714'], void: '#2ff3e0', node: '#9be35a', tag: 'Premium', req: { kind: 'streak', value: 7 } },
  { id: 'starlace', name: 'Star Lace',   price: 3000, bg: ['#1a1140', '#100a2e', '#040316'], alt: ['#2a1a63', '#160d3d', '#070421'], void: '#cdb4ff', node: '#e6d8ff', tag: 'Constellation', req: { kind: 'constel', value: 10 } },
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
