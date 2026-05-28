import { Store } from '../core/store';
import { SKINS } from '../config';
import type { Skin } from '../types';

export const Owned: string[] = Store.get<string[]>('coil_skins', ['cyan']);

export const skinState = {
  equipped: Store.get<string>('coil_skin', 'cyan'),
};

export function skin(): Skin {
  return SKINS.find((s) => s.id === skinState.equipped) || SKINS[0];
}

export function equipSkin(id: string): void {
  skinState.equipped = id;
  Store.set('coil_skin', id);
}

export function ownSkin(id: string): void {
  if (!Owned.includes(id)) {
    Owned.push(id);
    Store.set('coil_skins', Owned);
  }
}
