import type { Button } from '../types';
import { SFX } from './audio';

export const ui = {
  buttons: [] as Button[],
};

export function resetButtons(): void {
  ui.buttons = [];
}

export function btn(key: string, x: number, y: number, w: number, h: number, act: () => void): void {
  ui.buttons.push({ key, x, y, w, h, act });
}

// First registered match wins. The registry is rebuilt each frame in draw order,
// so register SPECIFIC/foreground buttons BEFORE any full-screen/background catch-all
// (e.g. result.ts registers its bottom buttons before the full-screen "tap to replay").
// Modal scenes call resetButtons() before drawing the overlay so nothing underneath leaks.
export function hitButtons(x: number, y: number): boolean {
  for (const b of ui.buttons) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      SFX.click();
      b.act();
      return true;
    }
  }
  return false;
}
