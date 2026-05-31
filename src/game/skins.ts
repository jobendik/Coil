import { Store } from '../core/store';
import { SKINS, MILESTONE_SKINS } from '../config';
import type { Skin } from '../types';

export const Owned: string[] = Store.get<string[]>('coil_skins', ['cyan']);

export const skinState = {
  equipped: Store.get<string>('coil_skin', 'cyan'),
};

/* Every selectable character: the coin-shop skins plus the height-earned
   milestone evolution track. Both pools share the same Owned list + equipped id,
   so equip/resolve works identically regardless of where a skin came from. */
const ALL_SKINS: Skin[] = [...SKINS, ...MILESTONE_SKINS];

export function skin(): Skin {
  return ALL_SKINS.find((s) => s.id === skinState.equipped) || SKINS[0];
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
