export const view = {
  cv: null as unknown as HTMLCanvasElement,
  ctx: null as unknown as CanvasRenderingContext2D,
  W: 0,
  H: 0,
  DPR: 1,
  SAFE_TOP: 8,
  SAFE_BOTTOM: 0,
  // Global UI scale. The canvas scenes are laid out against a reference *usable*
  // height (DESIGN_USABLE_H); on shorter viewports (iPhone 6/SE, small Android,
  // Safari with its toolbar showing) the whole UI scales down uniformly so panels,
  // type and buttons stay proportional and never overlap. We never scale ABOVE 1 —
  // tall screens keep the design size and absorb the surplus as breathing room
  // (a taller mission panel / wider result gaps), so large phones & tablets are
  // unchanged. Recomputed every resize(). 1 until the first resize lands.
  S: 1,
};

// Reference USABLE height (CSS px, viewport minus the safe-area insets) the home /
// result / overlay layouts are tuned for. At/above this they render 1:1.
const DESIGN_USABLE_H = 720;
// Floor so body text stays legible on the very smallest supported phones
// (iPhone SE 1st-gen ≈ 320×568). 375×667 lands around 0.78–0.93 depending on the
// browser chrome, comfortably above this.
const UI_SCALE_MIN = 0.66;

/** Pure UI-scale calc — exported so the responsive layout test can exercise every
 *  target resolution without a real DOM. */
export function computeUiScale(H: number, safeTop: number, safeBottom: number): number {
  const usable = H - safeTop - safeBottom;
  const s = usable / DESIGN_USABLE_H;
  return s < UI_SCALE_MIN ? UI_SCALE_MIN : s > 1 ? 1 : s;
}

/** Size of the square corner-icon buttons (top toggles + home reward cluster).
 *  Held at 42px (a comfortable touch target) on every screen ≥372 CSS px wide —
 *  which covers the supported floor of 375 — and shrunk only on narrower phones
 *  (e.g. the 320-wide iPhone SE 1st-gen) so the left toggle row and the right
 *  reward cluster can't collide in the middle. */
export function topIconSize(): number {
  return view.W >= 372 ? 42 : Math.max(33, (view.W / 372) * 42);
}

export function initCanvas(canvasId = 'cv'): void {
  const cv = document.getElementById(canvasId) as HTMLCanvasElement | null;
  if (!cv) throw new Error(`Canvas #${canvasId} not found`);
  const ctx = cv.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D rendering context');
  view.cv = cv;
  view.ctx = ctx;
  // Mobile GPUs (especially low-RAM Android, which is much of the CrazyGames
  // audience) can REVOKE the 2D context when the tab is backgrounded under memory
  // pressure. Without recovery the context is never reacquired: every draw call
  // silently no-ops and the canvas stays permanently BLANK (the rAF loop keeps
  // running invisibly) until a manual reload. Reacquire + reapply the DPR
  // transform on restore. preventDefault on 'contextlost' is required for the
  // browser to fire 'contextrestored'. (No-op on engines that never emit these.)
  cv.addEventListener('contextlost', (e) => { e.preventDefault(); });
  cv.addEventListener('contextrestored', () => {
    const c = cv.getContext('2d');
    if (c) { view.ctx = c; resize(); }
  });
}

export function resize(): void {
  if (!view.cv) return;   // resize can fire (orientation/load) before initCanvas — no-op until ready
  view.DPR = Math.min(window.devicePixelRatio || 1, 2);
  const r = view.cv.getBoundingClientRect();
  view.W = Math.round(r.width) || 360;
  view.H = Math.round(r.height) || 640;
  view.cv.width = Math.round(view.W * view.DPR);
  view.cv.height = Math.round(view.H * view.DPR);
  view.ctx.setTransform(view.DPR, 0, 0, view.DPR, 0, 0);
  let inset = 0;
  const sat = document.getElementById('sat');
  if (sat) inset = sat.getBoundingClientRect().height || 0;
  view.SAFE_TOP = Math.round(inset) + 6;
  let insetB = 0;
  const sab = document.getElementById('sab');
  if (sab) insetB = sab.getBoundingClientRect().height || 0;
  view.SAFE_BOTTOM = Math.round(insetB);
  view.S = computeUiScale(view.H, view.SAFE_TOP, view.SAFE_BOTTOM);
}
