/* Bundled by tools/layout-preview.cjs. Calls the REAL layout solvers (homeLayout /
   resultLayout) for a set of viewports and returns their geometry as JSON, so the
   preview SVGs reflect exactly what ships — not a re-implementation. */
import { view, computeUiScale, topIconSize } from '../src/core/canvas';
import { homeLayout } from '../src/scenes/home';
import { resultLayout } from '../src/scenes/result';

export interface Dev { name: string; w: number; h: number; st: number; sb: number; }

function apply(d: Dev): void {
  view.W = Math.min(d.w, 540);
  view.H = d.h;
  view.SAFE_TOP = d.st;
  view.SAFE_BOTTOM = d.sb;
  view.S = computeUiScale(view.H, view.SAFE_TOP, view.SAFE_BOTTOM);
}

export function geom(devices: Dev[]): unknown {
  return devices.map((d) => {
    apply(d);
    const W = view.W;
    const isz = topIconSize();
    const igap = Math.round(isz * 0.19);
    const home = homeLayout(false);
    // a couple of representative result configs
    const rFull = resultLayout({ nBars: 4, nExtra: 3, hasTopCTA: true, hasHighlight: true, fast: false });
    const rFast = resultLayout({ nBars: 1, nExtra: 1, hasTopCTA: false, hasHighlight: false, fast: true });
    return {
      name: d.name, W, H: view.H, S: view.S, st: view.SAFE_TOP, sb: view.SAFE_BOTTOM,
      isz, igap,
      home, rFull, rFast,
    };
  });
}
