// COIL low-end performance probe. Measures the CPU render-submission cost of
// one gameplay frame across FX tiers under CDP CPU throttling.
//
//   CALIB_URL=http://localhost:5173/ node tools/perf.mjs
//
// Optional env:
//   PERF_RATES=1,4,6
//   PERF_TIERS=high,medium,low
//   PERF_FRAMES=8
//
// 16.6 ms = 60 fps budget, 33.3 ms = 30 fps budget. GPU raster work from
// shadowBlur/gradients is better represented by tools/census.mjs and real
// device testing.
import { chromium } from 'playwright';

const URL = process.env.CALIB_URL || 'http://localhost:5173/';
const TIERS = (process.env.PERF_TIERS || 'high,medium,low').split(',').map((s) => s.trim()).filter(Boolean);
const RATES = (process.env.PERF_RATES || '1,4,6').split(',').map(Number).filter((n) => Number.isFinite(n) && n > 0);
const FRAMES = Number(process.env.PERF_FRAMES || 8);

const watchdog = setTimeout(() => {
  console.error('WATCHDOG: aborting');
  process.exit(2);
}, 180000);

const browser = await chromium.launch();
let env = null;

async function measure(rate, tier) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const client = await ctx.newCDPSession(page);
  try {
    await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForFunction(() => !!window.__coil, null, { timeout: 10000 });
    await page.evaluate(() => window.__coil.startPlay());
    await page.waitForTimeout(250);
    await page.evaluate((t) => {
      window.__coil.stepFrames(4);
      window.__coil.forceFrenzy(120);
      window.__coil.setCombo(10);
      window.__coil.setOverdrive(0.9);
      window.__coil.setPaused(true);
      window.__coil.setFx(t);
    }, tier);
    if (!env) {
      env = await page.evaluate(() => ({
        dpr: window.devicePixelRatio,
        cores: navigator.hardwareConcurrency,
        mem: navigator.deviceMemory ?? 'n/a',
        canvas: (() => {
          const c = document.querySelector('canvas');
          return c ? `${c.width}x${c.height}` : '?';
        })(),
        nodes: window.__coil.state.G?.nodes.length || 0,
      }));
    }
    await page.evaluate(() => window.__coil.benchRender(4));
    await client.send('Emulation.setCPUThrottlingRate', { rate });
    const ms = await page.evaluate((n) => window.__coil.benchRender(n), FRAMES);
    if (ms < 0) throw new Error('benchRender unavailable: play state was not ready');
    const perFrame = ms / FRAMES;
    return {
      cpu: rate + 'x',
      tier,
      msPerFrame: +perFrame.toFixed(2),
      fpsCap: Math.round(1000 / perFrame),
      budget: perFrame <= 16.6 ? '60fps ok' : perFrame <= 33.3 ? '~30fps' : 'SLOW',
    };
  } finally {
    await client.send('Emulation.setCPUThrottlingRate', { rate: 1 }).catch(() => {});
    await page.close().catch(() => {});
    await ctx.close().catch(() => {});
  }
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
