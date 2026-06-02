import bgUrl from '../assets/background.webp';
import { view } from '../core/canvas';

/* Shared menu/meta backdrop (a small WebP). Loaded once and drawn cover-fit
   behind the non-gameplay screens (home, game-over, shop) so they share one
   cohesive look. Callers draw drawBG() first as a fallback for the brief moment
   before the image decodes. */
const img = new Image();
let ready = false;
img.onload = () => { ready = true; };
img.src = bgUrl;

/** Draw the backdrop scaled to COVER the canvas (centred crop, any aspect),
 *  then a dim veil (alpha = `veil`) so foreground UI/text stays legible.
 *  No-op until the image has decoded. */
export function drawMenuBg(veil = 0.42): void {
  const { ctx, W, H } = view;
  if (!ready || !img.width) return;
  const ir = img.width / img.height;
  const cr = W / H;
  let dw: number;
  let dh: number;
  if (cr > ir) { dw = W; dh = W / ir; } else { dh = H; dw = H * ir; }
  ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
  ctx.fillStyle = `rgba(6,4,16,${veil})`;
  ctx.fillRect(0, 0, W, H);
}
