import './style.css';

import { initCanvas, resize, view } from './core/canvas';
import { state, resetRun } from './game/state';
import { update, release, requestRevive } from './game/update';
import { P, Pop, shakeState, updateShake } from './core/particles';
import { Result, setReplayHandler, setReviveHandler } from './scenes/result';
import { renderHome, setPlayHandler } from './scenes/home';
import { renderPlay } from './scenes/play';
import { renderShop } from './scenes/shop';
import { ac } from './core/audio';
import { CG } from './core/cg';
import { hitButtons, resetButtons } from './core/ui';
import { fx } from './core/utils';
import { rand, text } from './core/utils';
import { DEBUG } from './config';

initCanvas();
resize();
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 80));

/* ---------- play / replay / revive flow ---------- */
let paused = false;

function startPlay(): void {
  resetRun();
  state.scene = 'play';
  CG.gameplayStart();
}

let replayCount = 0;
function requestReplay(): void {
  replayCount++;
  // Every 3rd replay shows a midgame interstitial. When the SDK is unavailable
  // (off-platform), CG.midgame fires `done` immediately.
  if (CG.ready && replayCount % 3 === 0) CG.midgame(startPlay);
  else startPlay();
}

setPlayHandler(startPlay);
setReplayHandler(requestReplay);
setReviveHandler(requestRevive);

// Ad lifecycle pauses the game loop so updates don't run behind the overlay.
CG.bindPauseHook((p) => {
  paused = p;
  if (!paused) {
    last = performance.now();
    acc = 0;
  }
});

/* ---------- input ---------- */
let inputLock = false;

function pos(e: PointerEvent): { x: number; y: number } {
  const r = view.cv.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function primaryAction(): void {
  // context-sensitive primary action for keyboard play
  if (state.scene === 'play') {
    if (!state.G.dead) release();
  } else if (state.scene === 'over') {
    requestReplay();
  } else if (state.scene === 'home') {
    startPlay();
  } else if (state.scene === 'shop') {
    state.scene = 'home';
  }
}

function onDown(e: PointerEvent): void {
  ac();
  e.preventDefault();
  if (inputLock) return;
  inputLock = true;
  setTimeout(() => { inputLock = false; }, 40);
  const { x, y } = pos(e);
  if (state.scene !== 'play') {
    hitButtons(x, y);
    return;
  }
  if (!state.G.dead) release();
}

view.cv.addEventListener('pointerdown', onDown, { passive: false });
view.cv.addEventListener('pointercancel', () => { inputLock = false; }, { passive: false });
view.cv.addEventListener('contextmenu', (e) => e.preventDefault());

// Desktop keyboard (CrazyGames has heavy desktop traffic): Space / Enter / ArrowUp
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowUp') {
    e.preventDefault();
    ac();
    if (inputLock) return;
    inputLock = true;
    setTimeout(() => { inputLock = false; }, 40);
    primaryAction();
  }
}, { passive: false });

/* ---------- loop ---------- */
const FIXED = 1 / 60;
const MAX_STEPS = 5;

let last = 0;
let loopStarted = false;
let acc = 0;
let fpsT = 0;
let fpsN = 0;
let fps = 0;
let fxCheckT = 0;

function frame(now: number): void {
  requestAnimationFrame(frame);
  if (paused) {
    last = now;
    return;
  }
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.25) dt = 0.25;
  if (dt < 0) dt = 0;

  resetButtons();

  if (state.scene === 'play') {
    acc += dt;
    let steps = 0;
    while (acc >= FIXED && steps < MAX_STEPS) {
      update(FIXED);
      acc -= FIXED;
      steps++;
    }
    if (steps >= MAX_STEPS) acc = 0;
  } else {
    acc = 0;
    if (state.scene === 'over') Result.upd(dt);
  }

  P.upd(dt);
  Pop.upd(dt);
  updateShake(dt);

  const { ctx, W, H } = view;
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  if (shakeState.mag > 0) {
    const s = shakeState.mag;
    ctx.translate(rand(-s, s), rand(-s, s));
  }
  if (state.scene === 'home') renderHome(dt);
  else if (state.scene === 'play') {
    renderPlay();
    P.draw();
  } else if (state.scene === 'over') {
    renderPlay();
    P.draw();
    Result.render();
  } else if (state.scene === 'shop') {
    renderShop();
  }
  ctx.restore();

  fpsT += dt;
  fpsN++;
  if (fpsT >= 1) {
    fps = Math.round(fpsN / fpsT);
    fpsT = 0;
    fpsN = 0;
    fxCheckT += 1;
    if (fxCheckT >= 2) {
      if (fx.level === 'high' && fps < 46) fx.level = 'medium';
      else if (fx.level === 'medium' && fps < 36) fx.level = 'low';
    }
  }
  if (DEBUG) {
    const nLen = state.G?.nodes.length ?? 0;
    text('fps ' + fps + '  fx ' + fx.level + '  p ' + P.a.length + '  n ' + nLen,
      8, H - 12, 11, '#5b6488', 600, 0, 'left');
  }
}

function startLoop(): void {
  if (loopStarted) return;
  loopStarted = true;
  last = performance.now();
  requestAnimationFrame(frame);
}

document.addEventListener('visibilitychange', () => {
  // Don't override the ad-pause hook — only react to tab visibility when no ad is active.
  if (CG.adActive) return;
  paused = document.hidden;
  if (!paused) {
    last = performance.now();
    acc = 0;
  }
});

window.addEventListener('load', () => {
  resize();
  void CG.init();
  startLoop();
});

void CG.init();
startLoop();
