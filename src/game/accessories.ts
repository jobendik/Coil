import { Store } from '../core/store';
import { ACCESSORIES } from '../config';
import type { Accessory } from '../types';

/* Accessories are a second cosmetic slot worn on top of the character. Mirrors
   the skins/collection pattern: an Owned list + an equipped id, both persisted
   and cloud-synced via Store. 'none' is always owned so the slot can be cleared. */

export const OwnedAccessories: string[] = Store.arr<string>('coil_accs', ['none']);
if (!OwnedAccessories.includes('none')) OwnedAccessories.unshift('none');

export const accessoryState = {
  equipped: Store.get<string>('coil_acc', 'none'),
};

export function accessory(): Accessory {
  return ACCESSORIES.find((a) => a.id === accessoryState.equipped) || ACCESSORIES[0];
}

export function equipAccessory(id: string): void {
  accessoryState.equipped = id;
  Store.set('coil_acc', id);
}

export function ownAccessory(id: string): void {
  if (!OwnedAccessories.includes(id)) {
    OwnedAccessories.push(id);
    Store.set('coil_accs', OwnedAccessories);
  }
}
