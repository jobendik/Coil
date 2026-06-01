// =========================================================================
// Entry point
// =========================================================================
import '../styles/index.css';
import { initCanvas, fitCanvas, W, H, canvas, ctx } from './canvas.ts';
import { initInput } from './input.ts';
import { State, balls, projectiles, particles, ambient, dust, player, Input } from './state.ts';
import { updateBalls, updateProjectiles, updateParticles, updatePlayer, updateShake, loseLife } from './physics.ts';
import { tickPowerups } from './powerups.ts';
import { draw } from './renderer.ts';
import { startGame, pauseGame, resumeGame, gameOver, quitToMenu, checkWaveClear, showScene, toast, popFX, medal, banner } from './flow.ts';
import { ensureAudio } from './audio.ts';
import { Hooks } from './hooks.ts';
import { rand, fmt } from '../utils/helpers.ts';
import { initDirector } from '../systems/director.ts';

// ---- Wire hooks ---------------------------------------------------------

Hooks.onPopBall = (x, y, color, points) => {
  popFX(x, y, `+${fmt(points)}`, 'score');
  if (State.combo >= 5) popFX(x, y + 20, `x${State.combo}`, 'bonus');
};

Hooks.onLoseLife = () => {
  toast('danger', 'LIFE LOST', `${State.lives} remaining`);
};

Hooks.onLifeZero = () => {
  setTimeout(() => gameOver(), 800);
};

Hooks.onNextWave = (wave) => {
    const waveEl = document.getElementById('waveNum');
  if (waveEl) waveEl.textContent = String(wave).padStart(2, '0');
};

// ---- Init ---------------------------------------------------------------

initCanvas();
fitCanvas();
window.addEventListener('resize', fitCanvas);
initInput();
initDirector();

// ---- Loop ---------------------------------------------------------------

let lastT = performance.now();

function loop(now: number): void {
  const dt = Math.min(50, now - lastT) / 1000; // seconds
  lastT = now;

  if (State.gameActive && State.scene === 'game') {
    updatePlayer();
    updateProjectiles(dt, now);
    updateBalls(dt);
    updateParticles(dt);
    updateShake(dt);
    tickPowerups(now);
    checkWaveClear();

    // Ambient particle spawn
    if (ambient.length < 30 && Math.random() < 0.04) {
      ambient.push({
        x: rand(0, W),
        y: H + 20,
        vy: rand(-0.35, -0.15) * 60,
        r: rand(0.8, 2),
        opacity: rand(0.2, 0.5),
      });
    }
    // Ambient tick
    for (let i = ambient.length - 1; i >= 0; i--) {
      const a = ambient[i];
      a.y += a.vy * dt;
      if (a.y < -10) ambient.splice(i, 1);
    }

    // Combo decay
    if (State.combo > 0) {
      State.comboTimer -= dt * 1000;
      if (State.comboTimer <= 0) {
        State.combo = 0;
        const comboEl = document.getElementById('combo');
        if (comboEl) comboEl.classList.remove('active');
      } else {
        const ringEl = document.getElementById('comboRing');
        if (ringEl) {
          const pct = Math.min(1, State.comboTimer / State.comboWindow);
          (ringEl as unknown as SVGCircleElement).style.strokeDashoffset = String((100 - pct * 100).toFixed(1));
        }
      }
    }
  }

  draw();
  requestAnimationFrame(loop);
}

// ---- Button wiring ------------------------------------------------------

const wire = (id: string, fn: () => void) => {
  document.getElementById(id)?.addEventListener('click', () => { ensureAudio(); fn(); });
};

wire('playBtn',    startGame);
wire('pauseBtn',   pauseGame);
wire('resumeBtn',  resumeGame);
wire('restartBtn', startGame);
wire('quitBtn',    quitToMenu);
wire('goAgainBtn', startGame);
wire('goMenuBtn',  quitToMenu);

// ---- Welcome toasts ----------------------------------------------------

setTimeout(() => {
  if (State.scene === 'menu') toast('success', 'DAILY READY', 'Login bonus +100 coins');
}, 1400);
setTimeout(() => {
  if (State.scene === 'menu') toast('info', 'NEW SEASON', 'Season 04 starts in 6d');
}, 4400);

// ---- Kick off -----------------------------------------------------------

requestAnimationFrame((t) => { lastT = t; loop(t); });
