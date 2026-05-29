export const view = {
  cv: null as unknown as HTMLCanvasElement,
  ctx: null as unknown as CanvasRenderingContext2D,
  W: 0,
  H: 0,
  DPR: 1,
  SAFE_TOP: 8,
  SAFE_BOTTOM: 0,
};

export function initCanvas(canvasId = 'cv'): void {
  const cv = document.getElementById(canvasId) as HTMLCanvasElement | null;
  if (!cv) throw new Error(`Canvas #${canvasId} not found`);
  const ctx = cv.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D rendering context');
  view.cv = cv;
  view.ctx = ctx;
}

export function resize(): void {
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
}
