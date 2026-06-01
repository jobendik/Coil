// =========================================================================
// Hooks — callbacks set by the director to react to game events
// =========================================================================

export interface GameHooks {
  onPopBall?:  (x: number, y: number, color: string, points: number) => void;
  onLoseLife?: () => void;
  onLifeZero?: () => void;
  onNextWave?: (wave: number) => void;
  onGameOver?: (score: number, wave: number) => void;
}

export const Hooks: GameHooks = {};
