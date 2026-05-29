export type Scene = 'home' | 'play' | 'over' | 'shop';

export type NodeType = 'normal' | 'small' | 'bonus' | 'move' | 'spike';

export interface Node {
  wx: number;
  wy: number;
  r: number;
  type: NodeType;
  baseX: number;
  next: Node | null;
  amp?: number;
  ph?: number;
  spd?: number;
  pulse?: number;
}

export type SparkKind = 'spark' | 'shield' | 'focus' | 'magnet';

export interface Spark {
  wx: number;
  wy: number;
  got: boolean;
  kind: SparkKind;
}

export interface Player {
  wx: number;
  wy: number;
  vx: number;
  vy: number;
  latched: boolean;
  node: Node;
  ang: number;
  dir: 1 | -1;
  r: number;
  trail: Array<{ x: number; y: number }>;
  face: number;
  zap: number;
  lastReleased: Node | null;
  lastReleasedT: number;
}

export interface SweetZone {
  lo: number;
  hi: number;
  center: number;
  tol: number;
  reachable: boolean;
}

export interface Toast {
  txt: string;
  t: number;
  c: string;
}

/** Run-segment high-water marks. bankRun() awards deltas against these so a
 *  rewarded revive continues the SAME run without ever double-counting. */
export interface BankedHwm {
  h: number;
  perf: number;
  mc: number;
}

export interface GameState {
  t: number;
  cameraY: number;
  nodes: Node[];
  sparks: Spark[];
  maxY: number;
  height: number;
  combo: number;
  maxCombo: number;
  perfects: number;
  coins: number;
  flings: number;
  lastNodeY: number;
  dead: boolean;
  deadT: number;
  voidY: number;
  shield: boolean;
  invuln: number;
  beatBest: boolean;
  zone: number;
  nextMilestone: number;
  toast: Toast | null;
  sweet: SweetZone | null;
  target: Node | null;
  tut: number;
  tutT: number;
  player: Player;
  _sweetTick?: number;
  revivedThisRun: boolean;
  dailyRunCounted: boolean;
  banked: BankedHwm;
  firstFlingPending: boolean;     // guarantees the first fling of a run lands as PERFECT
  savesUsedThisRun: number;       // near-miss snap-rescue counter (1 allowed)
  nearPerfectUsed: boolean;       // near-perfect combo protection spent (1 per run)
  comboTierReached: number;       // highest COMBO_TIERS index already celebrated
  comboFlash: number;             // 0..1 brief screen-tint pulse on milestones
  comboFlashColor: string;        // color of the active milestone flash
  firstRunOfDay: boolean;         // 2× coin bonus active for this run
  coinMult: number;               // current coin multiplier (1 or 2)
  // ---- meta-layer (cosmetic / reward systems on top of the skill loop) ----
  daily: boolean;                 // this run is the seeded Daily Challenge
  zen: boolean;                   // Zen mode: can't die — falling bounces you back up
  focusT: number;                 // FOCUS slow-motion time remaining (s); 0 = inactive
  magnetT: number;                // MAGNET coin-attraction time remaining (s); 0 = inactive
  overdrive: number;              // 0..1 meter; fills with perfects → triggers FRENZY at full
  frenzyT: number;                // FRENZY mode time remaining (s); 0 = inactive
  frenzyMax: number;              // FRENZY duration (s) for the countdown bar
  frenzyBanked: number;           // coins earned during the active FRENZY (for the end-bonus)
  jackpotHit: boolean;            // Star Vault already won this run (once only)
  potWon: number;                 // ★ amount won from the vault this run (for the result screen)
  freezeT: number;                // brief anticipation hold after a huge event
  bestNearShown: boolean;         // honest "so close to your best" toast (once per run)
}

/** An alternate, skill-based unlock route for a cosmetic. When present and met,
 *  the item is earned for free (auto-claimed) instead of bought with coins —
 *  giving the catalogue varied routes (height / combo / streak / achievement)
 *  rather than a pure coin vending machine. Items without a `req` stay coin-buyable. */
export type UnlockKind = 'height' | 'combo' | 'streak' | 'ach';
export interface UnlockReq {
  kind: UnlockKind;
  value: number | string;   // height m / combo x / streak days / achievement id
}

export interface Skin {
  id: string;
  name: string;
  price: number;
  c: string;
  t: string;
  tag?: string;
  req?: UnlockReq;
}

export type TrailStyle = 'line' | 'comet' | 'dots' | 'sparkle' | 'bubbles' | 'rainbow';

export interface Trail {
  id: string;
  name: string;
  price: number;
  style: TrailStyle;
  c: string | null;   // null → inherit the equipped character colour
  t: string | null;
  tag?: string;
  req?: UnlockReq;
}

export interface World {
  id: string;
  name: string;
  price: number;
  bg: [string, string, string];
  alt: [string, string, string];
  void: string;       // void gradient colour
  node: string;       // normal-node accent
  tag?: string;
  req?: UnlockReq;
}

export interface Achievement {
  id: string;
  t: string;          // short title
  d: string;          // description
  test: (r: AchSummary) => boolean;
}

/** Snapshot of a finished run used to evaluate achievement unlocks. */
export interface AchSummary {
  best: number;
  runPerf: number;
  maxCombo: number;
  frenzied: boolean;
  streak: number;
  potWon: boolean;
  daily: boolean;
}

export interface DailyMedal {
  id: string;
  name: string;
  th: number;         // height threshold (m)
  rw: number;         // one-time coin reward
  c: string;
}

export interface Zone {
  name: string;
  from: number;
}

export type GoalKind = 'cum' | 'runmax';
export type GoalTier = 'easy' | 'med' | 'hard';

export interface Goal {
  id: string;
  t: number;
  kind: GoalKind;
  text: (n: number) => string;
  reward: number;
  tier: GoalTier;
}

export interface MissionState {
  idx: number;         // index into GOALS pool
  prog: number;        // current progress
  done: boolean;       // whether reward has been granted
}

export interface DailyData {
  date: string;
  missions: MissionState[];     // exactly 3 — easy/med/hard
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  c: string;
  sz: number;
}

export interface PopText {
  x: number;
  y: number;
  t: string;
  c: string;
  life: number;
}

export interface Button {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
  act: () => void;
}

export interface ResultData {
  h: number;
  mc: number;
  perf: number;
  coins: number;
  newBest: boolean;
  xpGain: number;
  leveledUp: boolean;
  dailyJustDone: boolean;
  dailyReward: number;     // total mission reward granted on this bank (may be 0)
  potWon: number;          // Star Vault coins won this run (0 if none)
  achievements: Achievement[];  // achievements newly unlocked this run
  daily: boolean;          // was this the Daily Challenge route
  zen: boolean;            // was this a Zen (no-fail) session
  dailyMedals: DailyMedal[];    // medals freshly earned on this daily run
  claimedUnlocks: string[];     // names of cosmetics earned for free this run (skill-gated)
}

export type FxLevel = 'high' | 'medium' | 'low';
