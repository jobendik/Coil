import { settings } from '../settings';

export function buzz(ms: number | number[]): void {
  try {
    if (navigator.vibrate && !settings.muted) navigator.vibrate(ms);
  } catch {
    /* no-op */
  }
}
