import { Store } from '../core/store';
import { TRAILS, WORLDS } from '../config';
import type { Trail, World } from '../types';

/* Trails + Worlds are cosmetic collections that sit alongside character skins.
   Each mirrors the skins.ts pattern: an Owned list + an equipped id, both
   persisted. Trails restyle the flight ribbon; worlds restyle the backdrop,
   void colour, and node accent. Neither changes physics. */

export const OwnedTrails: string[] = Store.get<string[]>('coil_trails', ['line']);
if (!OwnedTrails.includes('line')) OwnedTrails.unshift('line');

export const OwnedWorlds: string[] = Store.get<string[]>('coil_worlds', ['neon']);
if (!OwnedWorlds.includes('neon')) OwnedWorlds.unshift('neon');

export const collectionState = {
  trail: Store.get<string>('coil_trail', 'line'),
  world: Store.get<string>('coil_world', 'neon'),
};

export function trail(): Trail {
  return TRAILS.find((t) => t.id === collectionState.trail) || TRAILS[0];
}

export function world(): World {
  return WORLDS.find((w) => w.id === collectionState.world) || WORLDS[0];
}

export function equipTrail(id: string): void {
  collectionState.trail = id;
  Store.set('coil_trail', id);
}

export function equipWorld(id: string): void {
  collectionState.world = id;
  Store.set('coil_world', id);
}

export function ownTrail(id: string): void {
  if (!OwnedTrails.includes(id)) {
    OwnedTrails.push(id);
    Store.set('coil_trails', OwnedTrails);
  }
}

export function ownWorld(id: string): void {
  if (!OwnedWorlds.includes(id)) {
    OwnedWorlds.push(id);
    Store.set('coil_worlds', OwnedWorlds);
  }
}
