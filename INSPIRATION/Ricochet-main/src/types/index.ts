// =========================================================================
// Shared TypeScript types
// =========================================================================

export type PowerupKey = 'rapid' | 'freeze' | 'shield' | 'multi';
export type SfxType = 'pop' | 'shoot' | 'medal' | 'crit' | 'hit' | 'powerup' | 'wave' | 'life';
export type SceneName = 'menu' | 'game' | 'pause' | 'gameover';
export type MedalTier = 'bronze' | 'silver' | 'gold' | 'plat' | 'mythic';
export type ToastKind = 'success' | 'warn' | 'info' | 'danger';
export type FxKind = 'score' | 'xp' | 'crit' | 'bonus' | 'heal' | 'dmg';

export interface Ball {
  x: number;
  y: number;
  r: number;
  vx?: number;
  vy?: number;
  hp: number;
  maxHp: number;
  color: string;
  trail: TrailPoint[];
  bornAt?: number;
  flash?: number;
  popEffect?: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  t: number;
}

export interface Player {
  x: number;
  angle: number;
  fireRate: number;
  lastShot: number;
  power: number;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  r: number;
  color: string;
}

export interface DustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  r: number;
}

export interface AmbientParticle {
  x: number;
  y: number;
  vy: number;
  r: number;
  opacity: number;
}

export interface InputState {
  mouseX: number;
  mouseY: number;
  firing: boolean;
  paused: boolean;
}

export interface PowerupConfig {
  key: PowerupKey;
  label: string;
  icon: string;
  duration: number;
  color: string;
  bg: string;
}

export interface ActivePowerup {
  key: PowerupKey;
  endsAt: number;
  el: HTMLElement | null;
}

export interface GameState {
  scene: SceneName;
  score: number;
  bestScore: number;
  wave: number;
  lives: number;
  maxLives: number;
  ballsPopped: number;
  combo: number;
  comboTimer: number;
  comboWindow: number;
  shake: number;
  shakeDuration: number;
  gameActive: boolean;
  waveActive: boolean;
}
