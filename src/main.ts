import './style.css';

import { initCanvas, resize, view } from './core/canvas';
import { state, resetRun, maybeShowStartToast } from './game/state';
import { update, release, requestRevive, endRun } from './game/update';
import { P, Pop, shakeState, updateShake } from './core/particles';
import { Result, setReplayHandler, setReviveHandler } from './scenes/result';
import { renderHome, setPlayHandler, setDailyHandler, setZenHandler } from './scenes/home';
import { renderPlay, setZenExitHandler } from './scenes/play';
import { renderShop } from './scenes/shop';
import { ac } from './core/audio';
import { Music } from './core/music';
import { CG } from './core/cg';
import { fxUpd } from './core/fx';
import { hitButtons, resetButtons } from './core/ui';
import { fx } from './core/utils';
import { clamp, rand, text } from './core/utils';
import { Telemetry } from './core/telemetry';
import { claimEarnedUnlocks } from './game/unlocks';
import { DEBUG, DOOM_TIMESCALE } from './config';

Telemetry.session();
// Grant any skill-gated cosmetics the player already qualifies for (e.g. from
// progress made before this feature shipped, or a met requirement that was
// never banked). Idempotent — only grants what isn't already owned.
claimEarnedUnlocks();

initCanvas();
resize();
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 80));

/* ---------- play / replay / revive flow ---------- */
let paused = false;

function startPlay(daily = false, zen = false): void {
  resetRun(daily, zen);
  maybeShowStartToast();
  Telemetry.runStart(daily);
  state.scene = 'play';
  CG.gameplayStart();
}

// Interstitials are gated by WALL-CLOCK time, not replay count. CrazyGames' ad
// policy expects a minimum gap between interstitials and no interruption of the
// first session — a count-based cadence (every Nth replay) fires far too often
// for a game with 20–60 s runs and risks both a policy flag and churn. We allow
// the first interstitial only after the player has been in the session a while,
// then enforce a minimum gap between them.
const AD_MIN_GAP_MS = 180_000;        // ≥3 min between interstitials
const AD_FIRST_DELAY_MS = 150_000;    // no interstitial in the opening minutes
let lastInterstitialT = performance.now() - (AD_MIN_GAP_MS - AD_FIRST_DELAY_MS);

function requestReplay(daily = false, zen = false): void {
  const now = performance.now();
  // Never gate Zen (the calm mode) with an interstitial — it would break the vibe.
  if (!zen && CG.ready && now - lastInterstitialT >= AD_MIN_GAP_MS) {
    lastInterstitialT = now;
    CG.midgame(() => startPlay(daily, zen));
  } else {
    startPlay(daily, zen);
  }
}

// Home PLAY is the player's first action of a session → never gate with an ad.
setPlayHandler(() => startPlay(false));
// Home DAILY → the seeded Daily Challenge.
setDailyHandler(() => startPlay(true));
// Home ZEN → the unkillable calm mode.
setZenHandler(() => startPlay(false, true));
// Zen DONE (in-play) → bank the session like a normal run end.
setZenExitHandler(() => endRun());
// Result PLAY AGAIN → replay the SAME mode (daily/zen preserved), ad-gated.
setReplayHandler(() => requestReplay(state.G?.daily ?? false, state.G?.zen ?? false));
setReviveHandler(requestRevive);

// Ad lifecycle pauses the game loop so updates don't run behind the overlay.
CG.bindPauseHook((p) => {
  paused = p;
  if (p) {
    Music.pause();          // silence the bed during the ad
  } else {
    last = performance.now();
    acc = 0;                // Music resumes via its per-frame fade
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
    requestReplay(state.G?.daily ?? false);
  } else if (state.scene === 'home') {
    startPlay(false);
  } else if (state.scene === 'shop') {
    state.scene = 'home';
  }
}

function onDown(e: PointerEvent): void {
  ac();
  Music.start();
  e.preventDefault();
  if (inputLock) return;
  inputLock = true;
  setTimeout(() => { inputLock = false; }, 40);
  const { x, y } = pos(e);
  if (state.scene !== 'play') {
    hitButtons(x, y);
    return;
  }
  // Zen mode has no death, so it needs an explicit "end session" button in play.
  // Let that button win the tap; any other tap is a normal release.
  if (state.G.zen && hitButtons(x, y)) return;
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
    Music.start();
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
    // FOCUS power-up = a brief, uniform slow-motion. We feed the fixed-step
    // accumulator a scaled clock so EVERYTHING (orbit, flight, void, animation)
    // slows together; the timer itself counts down in real time so it ends when
    // expected. The fixed timestep is preserved → physics stay deterministic.
    let ts = 1;
    if (state.G && state.G.doomed && !state.G.dead) {
      // Doomed fling: fast-forward the inevitable fall (real physics still run,
      // so wall-bounce luck and the near-miss rescue can still save you — sooner).
      ts = DOOM_TIMESCALE;
    } else if (state.G && state.G.focusT > 0) {
      state.G.focusT = Math.max(0, state.G.focusT - dt);
      ts = 0.55;
    }
    acc += dt * ts;
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
  fxUpd(dt);
  // Adaptive music: swell with combo + Frenzy during play; Zen swaps in the
  // ambient bed. Everything settles outside of play.
  if (state.scene === 'play' && state.G) {
    const G = state.G;
    Music.setIntensity(clamp(G.combo / 12, 0, 1) * 0.6 + (G.frenzyT > 0 ? 0.4 : 0));
    Music.setZen(G.zen);
  } else {
    Music.setIntensity(0);
    Music.setZen(false);
  }
  Music.upd(dt);
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
      // Two-way auto-scaling with hysteresis. A single early GC stutter used to
      // strip effects for the whole session; now the tier recovers once the
      // device proves it can sustain a comfortably higher frame rate. The gap
      // between the down-thresholds (46/36) and up-thresholds (58/52) prevents
      // oscillation around a boundary.
      if (fx.level === 'high' && fps < 46) fx.level = 'medium';
      else if (fx.level === 'medium' && fps < 36) fx.level = 'low';
      else if (fx.level === 'low' && fps >= 52) fx.level = 'medium';
      else if (fx.level === 'medium' && fps >= 58) fx.level = 'high';
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
  if (paused) {
    Music.pause();
    // Tabbing away mid-run pauses gameplay — tell CrazyGames so its ad/engagement
    // timing stays accurate (no-op off-platform, and only while actually playing).
    if (state.scene === 'play') CG.gameplayStop();
  } else {
    last = performance.now();
    acc = 0;          // Music resumes via its per-frame fade
    if (state.scene === 'play') CG.gameplayStart();
  }
});

window.addEventListener('load', () => {
  resize();
  void CG.init();
  startLoop();
});

void CG.init();
startLoop();
