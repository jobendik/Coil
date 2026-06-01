// =========================================================================
// Game state
// =========================================================================
import type { GameState, Player, Ball, Projectile, Particle, DustParticle, AmbientParticle, InputState } from '../types/index.ts';

export const State: GameState = {
  scene:        'menu',
  score:        0,
  bestScore:    0,
  wave:         0,
  lives:        3,
  maxLives:     3,
  ballsPopped:  0,
  combo:        0,
  comboTimer:   0,
  comboWindow:  3000,
  shake:        0,
  shakeDuration:0,
  gameActive:   false,
  waveActive:   false,
};

export const player: Player = {
  x:        720,
  angle:    0,
  fireRate: 140,
  lastShot: 0,
  power:    1,
};

export const balls:        Ball[]             = [];
export const projectiles:  Projectile[]       = [];
export const particles:    Particle[]         = [];
export const ambient:      AmbientParticle[]  = [];
export const dust:         DustParticle[]     = [];

export const Input: InputState = {
  mouseX:  720,
  mouseY:  400,
  firing:  false,
  paused:  false,
};
