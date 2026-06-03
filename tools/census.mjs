// Canvas2D operation census for one heavy COIL gameplay frame.
// It instruments the real browser canvas context, forces a stressful visual
// state, renders one frame per FX tier, then reports calls/properties that map
// closely to CPU submission cost and likely mobile GPU pressure.
//
//   CALIB_URL=http://localhost:5173/ node tools/census.mjs
import { chromium } from 'playwright';

const URL = process.env.CALIB_URL || 'http://localhost:5173/';
const TIERS = (process.env.PERF_TIERS || 'high,medium,low').split(',').map((s) => s.trim()).filter(Boolean);

const browser = await chromium.launch();
const rows = [];

async function census(tier) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  try {
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForFunction(() => !!window.__coil, null, { timeout: 10000 });
    await page.evaluate(() => {
      const proto = CanvasRenderingContext2D.prototype;
      if (proto.__coilCensusPatched) return;
      Object.defineProperty(proto, '__coilCensusPatched', { value: true });

      const methods = [
        'arc', 'ellipse', 'fill', 'fillRect', 'stroke', 'beginPath', 'save', 'restore',
        'createLinearGradient', 'createRadialGradient', 'fillText', 'strokeText',
        'translate', 'rotate', 'scale', 'setLineDash', 'drawImage',
      ];
      const props = [
        'shadowBlur', 'shadowColor', 'globalCompositeOperation', 'globalAlpha',
        'fillStyle', 'strokeStyle', 'lineWidth',
      ];

      window.__coilCensus = {};
      const inc = (name) => { window.__coilCensus[name] = (window.__coilCensus[name] || 0) + 1; };

      for (const name of methods) {
        const original = proto[name];
        if (typeof original !== 'function') continue;
        proto[name] = function patched(...args) {
          inc(name);
          return original.apply(this, args);
        };
      }
      for (const name of props) {
        const desc = Object.getOwnPropertyDescriptor(proto, name);
        if (!desc || !desc.set || !desc.get) continue;
      Object.defineProperty(proto, name, {
        get() { return desc.get.call(this); },
        set(v) {
          inc(name + '=');
          if (name === 'shadowBlur' && Number(v) > 0) inc('shadowBlur>0');
          return desc.set.call(this, v);
        },
      });
      }
    });
    await page.evaluate((t) => {
      window.__coil.startPlay();
      window.__coil.stepFrames(4);
      window.__coil.forceFrenzy(120);
      window.__coil.setCombo(10);
      window.__coil.setOverdrive(0.9);
      window.__coil.setPaused(true);
      window.__coil.setFx(t);
    }, tier);
    await page.waitForTimeout(100);
    const result = await page.evaluate(() => {
      window.__coilCensus = {};
      const ms = window.__coil.benchRender(1);
      return {
        ms,
        counts: window.__coilCensus,
        nodes: window.__coil.state.G?.nodes.length || 0,
        collectibles: window.__coil.state.G?.sparks.length || 0,
      };
    });
    return {
      tier,
      ms: +result.ms.toFixed(3),
      nodes: result.nodes,
      collectibles: result.collectibles,
      shadowBlur: result.counts['shadowBlur='] || 0,
      shadowBlurNonZero: result.counts['shadowBlur>0'] || 0,
      gradients: (result.counts.createRadialGradient || 0) + (result.counts.createLinearGradient || 0),
      radialGradients: result.counts.createRadialGradient || 0,
      linearGradients: result.counts.createLinearGradient || 0,
      compositeChanges: result.counts['globalCompositeOperation='] || 0,
      saves: result.counts.save || 0,
      restores: result.counts.restore || 0,
      arcs: result.counts.arc || 0,
      ellipses: result.counts.ellipse || 0,
      fills: result.counts.fill || 0,
      strokes: result.counts.stroke || 0,
      fillRects: result.counts.fillRect || 0,
      fillText: result.counts.fillText || 0,
    };
  } finally {
    await page.close().catch(() => {});
    await ctx.close().catch(() => {});
  }
}

for (const tier of TIERS) {
  const row = await census(tier);
  rows.push(row);
  console.log('ROW', JSON.stringify(row));
}

console.table(rows);
await browser.close();
