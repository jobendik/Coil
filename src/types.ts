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

export type SparkKind = 'spark' | 'shield';

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
  comboTierReached: number;       // highest COMBO_TIERS index already celebrated
  comboFlash: number;             // 0..1 brief screen-tint pulse on milestones
  comboFlashColor: string;        // color of the active milestone flash
  firstRunOfDay: boolean;         // 2× coin bonus active for this run
  coinMult: number;               // current coin multiplier (1 or 2)
}

export interface Skin {
  id: string;
  name: string;
  price: number;
  c: string;
  t: string;
}

export interface Zone {
  name: string;
  from: number;
  bg: [string, string, string];
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
}

export type FxLevel = 'high' | 'medium' | 'low';
