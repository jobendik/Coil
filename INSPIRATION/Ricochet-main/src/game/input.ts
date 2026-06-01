// =========================================================================
// Input — mouse, touch, keyboard
// =========================================================================
import { Input, State } from './state.ts';
import { stage, W, H } from './canvas.ts';
import { ensureAudio } from './audio.ts';
import { pauseGame, resumeGame } from './flow.ts';

function stageCoords(clientX: number, clientY: number): { x: number; y: number } {
  const rect   = stage.getBoundingClientRect();
  const scaleX = W / rect.width;
  const scaleY = H / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top)  * scaleY,
  };
}

export function initInput(): void {
  window.addEventListener('mousemove', (e) => {
    const { x, y } = stageCoords(e.clientX, e.clientY);
    Input.mouseX = x;
    Input.mouseY = y;
  });

  window.addEventListener('mousedown', (e) => {
    ensureAudio();
    if (e.button === 0) Input.firing = true;
  });

  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) Input.firing = false;
  });

  window.addEventListener('touchstart', (e) => {
    ensureAudio();
    if (!e.touches.length) return;
    const touch  = e.touches[0];
    const { x, y } = stageCoords(touch.clientX, touch.clientY);
    Input.mouseX = x;
    Input.mouseY = y;
    Input.firing = true;
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (!e.touches.length) return;
    const touch  = e.touches[0];
    const { x, y } = stageCoords(touch.clientX, touch.clientY);
    Input.mouseX = x;
    Input.mouseY = y;
  }, { passive: true });

  window.addEventListener('touchend', () => {
    Input.firing = false;
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (!State.gameActive) return;
      if (State.scene === 'game')  pauseGame();
      else if (State.scene === 'pause') resumeGame();
    }
  });
}
