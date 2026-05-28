import { Store } from './core/store';

export const settings = {
  muted: Store.get<boolean>('coil_muted', false),
  aimPreview: Store.get<boolean>('coil_aim', true),
  seenTut: Store.get<boolean>('coil_seen_tut_h', false),
};

export function setMuted(v: boolean): void {
  settings.muted = v;
  Store.set('coil_muted', v);
}

export function setAimPreview(v: boolean): void {
  settings.aimPreview = v;
  Store.set('coil_aim', v);
}

export function setSeenTut(v: boolean): void {
  settings.seenTut = v;
  Store.set('coil_seen_tut_h', v);
}
