import { EVENTS } from '../config';
import type { CoilEvent } from '../config';
import { weekKey } from './weekly';

/* =========================================================================
   WEEKLY EVENT ROTATION (coil-retention-plan.md M8) — one event per week, chosen
   deterministically from the week key so every device agrees and it rotates on a
   real, honest window (it simply ends when the week rolls over). The coin
   multiplier is applied once at bank time, keeping payouts integer-clean.
   ========================================================================= */

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export const Event = {
  /** This week's event — always one of the real (non-'none') entries. */
  current(): CoilEvent {
    const real = EVENTS.filter((e) => e.id !== 'none');
    if (!real.length) return EVENTS[0];
    return real[hashStr('coil_evt_' + weekKey()) % real.length];
  },

  coinMult(): number {
    return this.current().coinMult;
  },
};
