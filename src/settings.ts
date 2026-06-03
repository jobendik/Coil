import { Store } from './core/store';
import { fx } from './core/utils';

// Default Reduced Motion to the OS preference the first time, so players who
// have already asked their device for less motion get a comfortable experience
// without touching a single toggle.
const prefersReduced = typeof window !== 'undefined' && window.matchMedia
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false;

export const settings = {
  muted: Store.get<boolean>('coil_muted', false),            // SFX mute
  musicMuted: Store.get<boolean>('coil_music_muted', false), // music bed mute (independent)
  aimPreview: Store.get<boolean>('coil_aim', true),
  seenTut: Store.get<boolean>('coil_seen_tut_h', false),
  reducedMotion: Store.get<boolean>('coil_reduced_motion', prefersReduced),
  cbGate: Store.get<boolean>('coil_cb_gate', false),       // colour-blind-safe gate (shape, not hue)
  echoVisible: Store.get<boolean>('coil_echo_on', true),   // race-your-best ghost (M5)
};

/** Push the Reduced Motion setting into the render layer's global motion scale.
 *  0.35 keeps a hint of feedback (so hits still register) while removing the
 *  jarring full-strength shake/flash. */
export function applyMotion(): void {
  fx.motion = settings.reducedMotion ? 0.35 : 1;
}
applyMotion();

export function setMuted(v: boolean): void {
  settings.muted = v;
  Store.set('coil_muted', v);
}

export function setMusicMuted(v: boolean): void {
  settings.musicMuted = v;
  Store.set('coil_music_muted', v);
}

export function setAimPreview(v: boolean): void {
  settings.aimPreview = v;
  Store.set('coil_aim', v);
}

export function setSeenTut(v: boolean): void {
  settings.seenTut = v;
  Store.set('coil_seen_tut_h', v);
}

export function setReducedMotion(v: boolean): void {
  settings.reducedMotion = v;
  Store.set('coil_reduced_motion', v);
  applyMotion();
}

export function setCbGate(v: boolean): void {
  settings.cbGate = v;
  Store.set('coil_cb_gate', v);
}

export function setEchoVisible(v: boolean): void {
  settings.echoVisible = v;
  Store.set('coil_echo_on', v);
}
