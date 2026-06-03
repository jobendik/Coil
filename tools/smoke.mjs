// Quick runtime smoke test for the retention milestones. Drives scenes via
// window.__coil and fails if any console/page error fires. Dev-only.
import { chromium } from 'playwright';

const URL = process.env.CALIB_URL || 'http://localhost:5178/Coil/';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__coil, null, { timeout: 10000 });
const ev = (fn, arg) => page.evaluate(fn, arg);
const wait = (ms) => page.waitForTimeout(ms);
const scene = () => ev(() => window.__coil.getScene());

async function playAndEnd(daily, zen, label) {
  await ev(([d, z]) => window.__coil.startPlay(d, z), [daily, zen]);
  await wait(150);
  // fling a handful of times to accrue perfects/coins/height
  for (let i = 0; i < 6; i++) { await ev(() => window.__coil.fling()); await ev(() => window.__coil.stepFrames(20)); }
  await ev(() => window.__coil.forceEnd());
  await wait(200);
  console.log(label, '→ scene', await scene());
}

// 1. home (may auto-open the daily login overlay)
await wait(400);
console.log('home scene', await scene());

// 2. ordinary normal run → fast result
await ev(() => window.__coil.setBest(99999));   // ensure NOT a new best → fast/instant-retry path
await playAndEnd(false, false, 'normal(fast)');

// 3. notable run (new best) → ascent tease
await ev(() => window.__coil.setBest(0));
await ev(() => window.__coil.startPlay(false, false));
await wait(150);
for (let i = 0; i < 6; i++) { await ev(() => window.__coil.fling()); await ev(() => window.__coil.stepFrames(20)); }
await ev(() => { window.__coil.setHeight(800); });
await ev(() => window.__coil.forceEnd());
await wait(200);
console.log('normal(notable) → scene', await scene());

// 4. daily run → result (+ daily medals / leaderboard wire)
await playAndEnd(true, false, 'daily');

// 5. zen run → result
await playAndEnd(false, true, 'zen');

// 6. season scene
await ev(() => { window.__coil.state.scene = 'season'; });
await wait(300);
console.log('season scene', await scene());

// 7. shop scene
await ev(() => { window.__coil.state.scene = 'shop'; });
await wait(300);
console.log('shop scene', await scene());

// 8. back home, let a few frames run
await ev(() => { window.__coil.state.scene = 'home'; });
await wait(400);

await browser.close();
if (errors.length) {
  console.error('\n❌ ERRORS:\n' + errors.join('\n'));
  process.exit(1);
}
console.log('\n✅ no runtime errors across scenes');
