// =========================================================================
// Game flow — scene transitions, wave management, start/restart/gameover
// =========================================================================
import { State, balls, projectiles, particles, dust, ambient, player } from './state.ts';
import { sfx } from './audio.ts';
import { Hooks } from './hooks.ts';
import { clearPowerups } from './powerups.ts';
import { spawnBall } from './physics.ts';
import { rand, fmt } from '../utils/helpers.ts';
import { W, H } from './canvas.ts';

// ---- Scene visibility ---------------------------------------------------

export function showScene(name: string): void {
  State.scene = name as typeof State.scene;
  const ids = ['menu', 'hud', 'pause', 'gameover'] as const;
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const show = (name === 'game' && id === 'hud') || id === name;
    el.classList.toggle('hidden',  !show);
    el.classList.toggle('active',  show);
  });
  if (name === 'pause' || name === 'gameover') {
    document.getElementById('hud')?.classList.remove('hidden');
  }
}

// ---- Banner / toast / medal helpers ------------------------------------

export function banner(main: string, pre?: string, sub?: string): void {
  const layer = document.getElementById('banner-layer');
  if (!layer) return;
  layer.innerHTML = '';
  const div = document.createElement('div');
  div.className = 'banner';
  div.innerHTML = `
    ${pre ? `<div class="banner-pretitle">${pre}</div>` : ''}
    <div class="banner-main">${main}</div>
    ${sub ? `<div class="banner-sub">${sub}</div>` : ''}
  `;
  layer.appendChild(div);
  setTimeout(() => div.remove(), 2400);
}

export function toast(kind: string, label: string, text: string): void {
  const layer = document.getElementById('toasts-layer');
  if (!layer) return;
  const icon: Record<string, string> = { success: '✓', warn: '!', info: 'i', danger: '×' };
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.innerHTML = `<div class="t-icon">${icon[kind] ?? '·'}</div><div class="t-text"><b>${label}</b> ${text}</div>`;
  layer.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

export function medal(title: string, sub: string, tier: string, reward: string): void {
  medalQueue.push({ title, sub, tier, reward });
  pumpMedals();
}

const medalQueue: { title: string; sub: string; tier: string; reward: string }[] = [];
let medalActive = 0;

function pumpMedals(): void {
  if (medalActive >= 3) return;
  const m = medalQueue.shift();
  if (!m) return;
  medalActive++;
  const icons: Record<string, string> = { bronze: '◆', silver: '◆', gold: '★', plat: '✦', mythic: '✪' };
  const el = document.createElement('div');
  el.className = `medal ${m.tier}`;
  el.innerHTML = `
    <div class="m-icon">${icons[m.tier] ?? '★'}</div>
    <div class="m-info">
      <div class="m-tier">${m.tier}</div>
      <div class="m-title">${m.title}</div>
      <div class="m-sub">${m.sub}</div>
    </div>
    <div class="m-reward">${m.reward}</div>
  `;
  document.getElementById('medals-layer')?.appendChild(el);
  sfx('medal');
  setTimeout(() => {
    el.remove();
    medalActive--;
    pumpMedals();
  }, 3200);
  if (medalQueue.length) setTimeout(pumpMedals, 240);
}

export function popFX(x: number, y: number, text: string, kind: string): void {
  const stage = document.getElementById('stage');
  const layer = document.getElementById('fx-layer');
  if (!layer || !stage) return;
  const rect  = stage.getBoundingClientRect();
  const sx    = (x / W) * rect.width;
  const sy    = (y / H) * rect.height;
  const el    = document.createElement('div');
  el.className = `fx-pop ${kind}`;
  el.textContent = text;
  el.style.left = `${sx}px`;
  el.style.top  = `${sy}px`;
  layer.appendChild(el);
  setTimeout(() => el.remove(), kind === 'crit' ? 1450 : 1150);
}

// ---- Wave management ----------------------------------------------------

const MAX_WAVE = 12;

function startWave(num: number): void {
  balls.length = 0;
  projectiles.length = 0;
  const count = Math.min(2 + Math.floor(num / 2), 6);
  for (let i = 0; i < count; i++) {
    spawnBall();
  }
  State.waveActive = true;
  banner(`WAVE ${String(num).padStart(2, '0')}`, num === 1 ? 'BEGIN' : 'CONTINUE');
  sfx('wave');
  Hooks.onNextWave?.(num);
}

export function checkWaveClear(): void {
  if (!State.gameActive || !State.waveActive || balls.length > 0) return;
  State.waveActive = false;
  State.wave++;

  if (State.wave > MAX_WAVE) {
    toast('success', 'COMPLETE', 'All waves cleared');
    setTimeout(() => gameOver(), 1200);
    return;
  }

  const waveEl = document.getElementById('waveNum');
  if (waveEl) waveEl.textContent = String(State.wave).padStart(2, '0');

  setTimeout(() => {
    startWave(State.wave);
    if (State.wave % 3 === 0) {
      medal('WAVE CHAMPION', `Cleared wave ${State.wave - 1}`, 'gold', '+2,500 XP');
    } else {
      toast('success', 'WAVE CLEAR', `Bonus +${500 * State.wave}`);
      State.score += 500 * State.wave;
    }
  }, 700);
}

// ---- Combo helpers (for external use by physics) ------------------------

export { toast as showToast };

// ---- Start / pause / resume / gameover ----------------------------------

export function startGame(): void {
  State.score        = 0;
  State.wave         = 1;
  State.lives        = State.maxLives;
  State.ballsPopped  = 0;
  State.combo        = 0;
  State.comboTimer   = 0;
  State.gameActive   = true;
  State.waveActive   = false;

  balls.length       = 0;
  projectiles.length = 0;
  particles.length   = 0;
  dust.length        = 0;
  ambient.length     = 0;

  clearPowerups();

  // Reset HUD
  const scoreEl = document.getElementById('scoreVal');
  if (scoreEl) scoreEl.textContent = '00000000';
  const waveEl = document.getElementById('waveNum');
  if (waveEl) waveEl.textContent = '01';
  document.querySelectorAll<HTMLElement>('.life-dot').forEach(d => d.classList.remove('empty'));

  showScene('game');
  startWave(State.wave);
  setTimeout(() => toast('info', 'TIP', 'Don\'t let balls hit the floor!'), 1800);
}

export function pauseGame(): void {
  if (State.scene !== 'game') return;
  showScene('pause');
}

export function resumeGame(): void {
  showScene('game');
}

export function gameOver(): void {
  State.gameActive = false;
  if (State.score > State.bestScore) State.bestScore = State.score;

  showScene('gameover');

  const finalScore = document.getElementById('finalScore');
  const finalWave  = document.getElementById('finalWave');
  const finalCombo = document.getElementById('finalCombo');
  const finalXP    = document.getElementById('finalXP');

  if (finalScore) finalScore.textContent = fmt(State.score);
  if (finalWave)  finalWave.textContent  = String(State.wave);
  if (finalCombo) finalCombo.textContent = 'x' + State.combo;
  if (finalXP)    finalXP.textContent    = '+' + fmt(State.ballsPopped * 10);

  const stars = document.querySelectorAll<HTMLElement>('#gameover .star');
  stars.forEach(s => s.classList.remove('earned'));
  let earned = 1;
  if (State.score > 5000)  earned = 2;
  if (State.score > 20000) earned = 3;
  setTimeout(() => {
    for (let i = 0; i < earned; i++) {
      setTimeout(() => stars[i]?.classList.add('earned'), i * 200);
    }
  }, 350);

  Hooks.onGameOver?.(State.score, State.wave);
}

export function quitToMenu(): void {
  State.gameActive = false;
  balls.length       = 0;
  projectiles.length = 0;
  particles.length   = 0;
  showScene('menu');
}
