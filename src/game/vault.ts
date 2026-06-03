import { Store } from '../core/store';
import { VAULT_MAX, VAULT_RATE, VAULT_START } from '../config';

/* STAR VAULT — a slowly-growing pot of ★ that persists across sessions. It is
   NOT gambling: it grows passively while you play and is won only by a genuine
   skill feat (catching a bonus node at a high combo). No betting, no paid odds. */
export const Vault = {
  v: Store.num('coil_vault', VAULT_START),

  save(): void {
    Store.set('coil_vault', Math.round(this.v));
  },

  tick(dt: number): void {
    if (this.v < VAULT_MAX) this.v = Math.min(VAULT_MAX, this.v + dt * VAULT_RATE);
  },

  /** Claim the whole vault, resetting it. Returns the (rounded) amount won. */
  win(): number {
    const w = Math.round(this.v);
    this.v = VAULT_START;
    this.save();
    return w;
  },
};
