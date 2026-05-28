import musicUrl from '../assets/background_music.mp3';
import { settings } from '../settings';
import { clamp } from './utils';

/* Looping background-music bed. Streamed via an HTMLAudioElement (kept separate
   from the WebAudio SFX path). Gated by its OWN `musicMuted` setting — fully
   independent of the SFX mute — plus tab visibility, and hard-paused during ads
   via Music.pause() from the loop's pause hook. Volume fades in/out so toggles
   and ad breaks aren't jarring.

   Autoplay policy: browsers block audio until a user gesture, so the element is
   created lazily on the first tap/key (Music.start) — never at module load,
   which also keeps headless/SSR imports safe. */

const BASE_VOL = 0.3;       // unobtrusive under the SFX
const FADE = 1.8;           // volume units per second

let el: HTMLAudioElement | null = null;
let started = false;
let vol = 0;

function ensure(): void {
  if (el) return;
  try {
    el = new Audio(musicUrl);
    el.loop = true;
    el.preload = 'auto';
    el.volume = 0;
  } catch {
    el = null;
  }
}

export const Music = {
  /** Begin the bed on the first user gesture (satisfies autoplay policy). */
  start(): void {
    started = true;
    ensure();
  },

  /** Hard-pause immediately — used when an ad starts or the tab is hidden. */
  pause(): void {
    if (el && !el.paused) el.pause();
  },

  /** Per-frame fade + play/pause sync against the mute setting + tab visibility. */
  upd(dt: number): void {
    if (!started || !el) return;
    const want = !settings.musicMuted && !document.hidden;
    const target = want ? BASE_VOL : 0;
    vol += (target - vol) * Math.min(1, dt * FADE);
    vol = clamp(vol, 0, 1);
    el.volume = vol;
    if (want) {
      if (el.paused) void el.play().catch(() => { /* gesture still pending */ });
    } else if (!el.paused && vol < 0.01) {
      el.pause();
    }
  },
};
