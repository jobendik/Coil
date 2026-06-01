// COIL visual-calibration harness. Drives the canvas game into specific states
// via the dev-only window.__coil hook and captures PNGs for tuning. Dev-only.
//   node tools/calib.mjs            → captures to tools/.calib-shots/
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dir, '.calib-shots');
mkdirSync(OUT, { recursive: true });

const URL = process.env.CALIB_URL || 'http://localhost:5173/Coil/';

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },   // iPhone-12-class portrait
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__coil, null, { timeout: 10000 });

const shot = async (name) => {
  await page.screenshot({ path: join(OUT, name + '.png') });
  console.log('shot', name);
};
const wait = (ms) => page.waitForTimeout(ms);
const call = (fn, ...args) => page.evaluate(([f, a]) => window.__coil[f](...a), [fn, args]);
// tight crop centred on the player so the mascot/eyes/shimmer are inspectable
const crop = async (name, box = 130) => {
  const p = await page.evaluate(() => window.__coil.getPlayer());
  if (!p) return;
  await page.screenshot({
    path: join(OUT, name + '.png'),
    clip: { x: Math.max(0, p.x - box), y: Math.max(0, p.y - box), width: box * 2, height: box * 2 },
  });
  console.log('crop', name);
};

// 1. HOME
await wait(500);
await shot('01-home');

// 2. PLAY base (player latched + orbiting, gate visible)
await call('startPlay');
await wait(800);
await shot('02-play-base');
await crop('02c-player');

// 3. Mid combo (HUD: PERFECT x5)
await call('setCombo', 5);
await call('setOverdrive', 0.5);
await wait(200);
await shot('03-combo5-od50');

// 4. OVERDRIVE near full → escalating meter + gold player shimmer
await call('setOverdrive', 0.74);
await wait(220);
await crop('04a-shimmer-074');
await call('setOverdrive', 0.92);
await wait(220);
await shot('04-overdrive-near');
await crop('04c-shimmer-092');

// 5. REAL FRENZY: prime overdrive, then fling (first fling of a run is always
// perfect) so the genuine trigger burst + hit-stop fire — not just the bloom.
await call('startPlay');
await wait(500);
await call('setOverdrive', 0.95);
await call('fling');
await wait(140);
await shot('05a-frenzy-burst');
await wait(450);
await shot('05b-frenzy-sustained');

// 6. Coin count-up: fresh run, drop a big payout, capture mid-roll + settled
await call('startPlay');
await wait(500);
await call('addCoins', 600);
await wait(70);
await shot('06a-coinroll-mid');
await wait(800);
await shot('06b-coinroll-settled');

// 7. Void close → danger vignette + scared face. Freeze the loop so the void
// can't rise into the player before the crop is taken.
await call('startPlay');
await wait(500);
await call('setVoidGap', 96);
await wait(160);
await call('setPaused', true);
await shot('07-void-close');
await crop('07c-player-scared');
await call('setPaused', false);

// 8. RESULT screen + coin count-up. Bank a payout, then end the run so the
// result screen rolls a non-zero coin tally.
await call('startPlay');
await wait(400);
await call('setCombo', 8);
await call('addCoins', 480);
await call('forceEnd');
await page.waitForFunction(() => window.__coil.getScene() === 'over', null, { timeout: 5000 });
await wait(1300);          // bars reveal; coin bar starts its roll ~1.2 s in
await shot('08a-result-rolling');
await wait(1400);
await shot('08b-result-settled');

// FPS sample over a short active window
const fps = await page.evaluate(async () => {
  const s = performance.now();
  while (performance.now() - s < 1500) { await new Promise((r) => requestAnimationFrame(r)); }
  return window.__coil.getFps();
});

console.log('FPS≈', fps);
console.log('CONSOLE ERRORS:', errors.length ? errors : 'none');
await browser.close();
