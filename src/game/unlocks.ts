import type { Accessory, Skin, Trail, World, UnlockReq } from '../types';
import { Profile } from './profile';
import { Achievements } from './achievements';
import { Owned, ownSkin } from './skins';
import { OwnedTrails, OwnedWorlds, ownTrail, ownWorld } from './collection';
import { OwnedAccessories, ownAccessory } from './accessories';
import { SKINS, MILESTONE_SKINS, TRAILS, WORLDS, ACCESSORIES } from '../config';

/* =========================================================================
   UNLOCK ROUTES — items may carry a skill-based `req` (height / combo / streak
   / achievement). When the requirement is met the item is EARNED for free and
   auto-claimed; until then it shows its requirement in the Collection instead
   of a price. Items without a `req` remain coin-buyable as before.

   This keeps the catalogue from being a pure coin vending machine — exactly
   the "varied unlock routes" the design notes call for — without adding any
   new currency.
   ========================================================================= */

/** Is a skill-gated requirement currently satisfied by the player's progress? */
export function reqMet(req: UnlockReq): boolean {
  switch (req.kind) {
    case 'height': return Profile.best >= (req.value as number);
    case 'combo':  return Profile.bestCombo >= (req.value as number);
    case 'streak': return Profile.streak >= (req.value as number);
    case 'constel': return Profile.constellations >= (req.value as number);
    case 'ach':    return !!Achievements.unlocked[req.value as string];
  }
}

/** Human-readable unlock condition for the Collection card. */
export function reqLabel(req: UnlockReq): string {
  switch (req.kind) {
    case 'height': return 'REACH ' + req.value + ' M';
    case 'combo':  return 'CHAIN x' + req.value;
    case 'streak': return req.value + '-DAY STREAK';
    case 'constel': return req.value + ' CONSTELLATIONS';
    case 'ach':    return 'ACHIEVEMENT';
  }
}

/** Short progress string toward a requirement, e.g. "420 / 500 m". */
export function reqProgress(req: UnlockReq): string {
  switch (req.kind) {
    case 'height': return Math.min(Profile.best, req.value as number) + ' / ' + req.value + ' m';
    case 'combo':  return 'x' + Math.min(Profile.bestCombo, req.value as number) + ' / x' + req.value;
    case 'streak': return Math.min(Profile.streak, req.value as number) + ' / ' + req.value + ' days';
    case 'constel': return Math.min(Profile.constellations, req.value as number) + ' / ' + req.value;
    case 'ach':    return 'locked';
  }
}

/** 0..1 progress fraction toward a requirement. */
export function reqFraction(req: UnlockReq): number {
  const v = req.value as number;
  switch (req.kind) {
    case 'height': return Math.min(1, Profile.best / v);
    case 'combo':  return Math.min(1, Profile.bestCombo / v);
    case 'streak': return Math.min(1, Profile.streak / v);
    case 'constel': return Math.min(1, Profile.constellations / v);
    case 'ach':    return reqMet(req) ? 1 : 0;
  }
}

interface Claimed { skins: Skin[]; trails: Trail[]; worlds: World[]; accessories: Accessory[]; }

/**
 * Grant any skill-gated cosmetics whose requirement is now met but which the
 * player doesn't yet own. Returns what was freshly claimed so the caller can
 * celebrate it on the result screen. Safe to call repeatedly (idempotent).
 */
export function claimEarnedUnlocks(): Claimed {
  const out: Claimed = { skins: [], trails: [], worlds: [], accessories: [] };
  for (const s of [...SKINS, ...MILESTONE_SKINS]) {
    if (s.req && !Owned.includes(s.id) && reqMet(s.req)) { ownSkin(s.id); out.skins.push(s); }
  }
  for (const t of TRAILS) {
    if (t.req && !OwnedTrails.includes(t.id) && reqMet(t.req)) { ownTrail(t.id); out.trails.push(t); }
  }
  for (const w of WORLDS) {
    if (w.req && !OwnedWorlds.includes(w.id) && reqMet(w.req)) { ownWorld(w.id); out.worlds.push(w); }
  }
  for (const a of ACCESSORIES) {
    if (a.req && !OwnedAccessories.includes(a.id) && reqMet(a.req)) { ownAccessory(a.id); out.accessories.push(a); }
  }
  return out;
}
