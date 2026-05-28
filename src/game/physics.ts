import { state } from './state';
import { CATCH_PAD } from '../config';
import { clamp, lerp } from '../core/utils';

/** Catch generosity narrows slightly with height for a gentle skill ramp.
 *  Used by both the swept catch test and the trajectory preview. */
export function curCatchPad(): number {
  return lerp(CATCH_PAD, 18, clamp(state.G.height / 700, 0, 1));
}

/** Upper edge of the perfect band (charge value). Narrows with height. */
export function perfectHi(): number {
  return lerp(0.90, 0.78, clamp(state.G.height / 500, 0, 1));
}
