export type Scene = 'home' | 'play' | 'over' | 'shop';

export type NodeType = 'normal' | 'small' | 'bonus' | 'move' | 'spike';

export interface Node {
  wx: number;
  wy: number;
  r: number;
  type: NodeType;
  baseX: number;
  amp?: number;
  ph?: number;
  spd?: number;
  pts?: number;
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
  R: number;           // orbit radius — set from latch distance, clamped [MINR, MAXR]
  ang: number;
  dir: 1 | -1;
  charge: number;      // 0..1, ping-pongs while latched (perfect band is a slice of this)
  chDir: 1 | -1;       // sweep direction
  r: number;
  trail: Array<{ x: number; y: number }>;
  face: number;
  zap: number;
  lastReleased: Node | null;
  lastReleasedT: number;
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
  combo: number;       // pure catch chain (resets only on hit)
  maxCombo: number;
  mult: number;        // perfect multiplier (1..9), resets on a non-perfect release
  perfects: number;
  coins: number;
  releases: number;
  lastNodeY: number;
  dead: boolean;
  deadT: number;
  voidY: number;
  vbase: number;       // base void rise rate (px/s)
  shield: boolean;
  invuln: number;
  beatBest: boolean;
  zone: number;
  nextMilestone: number;
  toast: Toast | null;
  tut: number;
  tutT: number;
  revivedThisRun: boolean;
  dailyRunCounted: boolean;
  banked: BankedHwm;
  player: Player;
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

export interface Goal {
  id: string;
  t: number;
  kind: GoalKind;
  text: (n: number) => string;
  reward: number;
}

export interface DailyData {
  date: string;
  idx: number;
  prog: number;
  done: boolean;
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
}

export type FxLevel = 'high' | 'medium' | 'low';
