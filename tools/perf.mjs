// COIL low-end performance probe. Measures the pure CPU render cost of one
// gameplay frame across FX tiers, under CDP CPU throttling that emulates slow
// mobile SoCs. Pairs with the static hot-path census in the report.
//
//   CALIB_URL=http://localhost:<port>/Coil/ node tools/perf.mjs
//
// NOTE: this captures the main-thread render-submission cost (JS + Canvas2D
// command building), which CPU throttling scales realistically. GPU rasterisation
// of shadowBlur/gradients happens off-thread and is NOT fully reflected here —
// that's the static census's job. 16.6 ms = 60 fps budget, 33.3 ms = 30 fps.
import { chromium } from 'playwright';

const URL = process.env.CALIB_URL || 'http://localhost:5173/Coil/';
const TIERS = ['high', 'medium', 'low'];
const RATES = [1, 4, 6];   // CDP CPU slowdown multipliers (6x ≈ budget Android)

// Hard watchdog so a stray navigation/hang can never wedge the run.
const watchdog = setTimeout(() => { console.error('WATCHDOG: aborting'); process.exit(2); }, 90000);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const client = await ctx.newCDPSession(page);
const FRAMES = 20;
let env = null;

// Fresh page per cell: the headless software-GPU (SwiftShader) builds a raster
// backlog from one heavy bench that wedges the NEXT evaluate, so we reload to
// isolate each measurement. benchRender measures the in-page CPU render-submission
// time, which CDP CPU throttling scales realistically.
async function measure(rate, tier) {
  await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });   // unthrottled setup
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__coil, null, { timeout: 10000 });
  await page.evaluate(() => window.__coil.startPlay());
  await page.waitForTimeout(500);
  await page.evaluate((t) => {
    window.__coil.forceFrenzy(120);
    window.__coil.setCombo(10);
    window.__coil.setOverdrive(0.9);
    window.__coil.setPaused(true);
    window.__coil.setFx(t);
  }, tier);
  if (!env) env = await page.evaluate(() => ({
    dpr: window.devicePixelRatio, cores: navigator.hardwareConcurrency,
    mem: navigator.deviceMemory ?? 'n/a',
    canvas: (() => { const c = document.querySelector('canvas'); return c ? `${c.width}x${c.height}` : '?'; })(),
  }));
  await page.evaluate(() => window.__coil.benchRender(8));            // warm
  await client.send('Emulation.setCPUThrottlingRate', { rate });     // throttle only for the measured bench
  const ms = await page.evaluate((n) => window.__coil.benchRender(n), FRAMES);
  const perFrame = ms / FRAMES;
  return { cpu: rate + 'x', tier, msPerFrame: +perFrame.toFixed(2), fpsCap: Math.round(1000 / perFrame),
    budget: perFrame <= 16.6 ? '60fps ok' : perFrame <= 33.3 ? '~30fps' : 'SLOW' };
}

const rows = [];
for (const rate of RATES) {
  for (const tier of TIERS) {
    const row = await measure(rate, tier);
    rows.push(row);
    console.log('ROW', JSON.stringify(row));
  }
}

console.log('ENV', JSON.stringify(env));
console.table(rows);
await browser.close();
clearTimeout(watchdog);
