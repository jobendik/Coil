// =========================================================================
// Canvas setup — live ESM exports so importers see updated values
// =========================================================================

export const W = 1440;
export const H = 810;

export let canvas: HTMLCanvasElement;
export let ctx: CanvasRenderingContext2D;
export let stage: HTMLElement;

export function initCanvas(): void {
  canvas = document.getElementById('game') as HTMLCanvasElement;
  stage  = document.getElementById('stage') as HTMLElement;
  ctx    = canvas.getContext('2d') as CanvasRenderingContext2D;
  canvas.width  = W;
  canvas.height = H;
}

export function fitCanvas(): void {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const scale = Math.min(vw / W, vh / H);
  const w = Math.round(W * scale);
  const h = Math.round(H * scale);
  stage.style.width  = w + 'px';
  stage.style.height = h + 'px';
}
