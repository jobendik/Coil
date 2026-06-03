/* Schematic layout preview. Bundles tools/_preview-entry.ts (which calls the real
   homeLayout/resultLayout solvers) under the same DOM stubs the test runner uses,
   then renders each viewport's element boxes to an SVG so the responsive fit is
   visually verifiable without a browser.
     node tools/layout-preview.cjs   → writes tools/.layout-preview/*.svg  */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

// ---- minimal DOM/window stubs (mirror scripts/run-tests.cjs) ----
const W = 390, H = 740;
function fakeCanvas() {
  return {
    width: W, height: H,
    getBoundingClientRect: () => ({ width: W, height: H, left: 0, top: 0, right: W, bottom: H }),
    getContext: () => ({ setTransform() {}, save() {}, restore() {}, fillRect() {},
      beginPath() {}, arc() {}, fill() {}, stroke() {}, moveTo() {}, lineTo() {},
      createLinearGradient: () => ({ addColorStop() {} }), measureText: () => ({ width: 10 }),
      fillText() {}, clip() {}, translate() {}, rotate() {}, scale() {}, ellipse() {},
      arcTo() {}, closePath() {}, quadraticCurveTo() {}, setLineDash() {},
      createRadialGradient: () => ({ addColorStop() {} }) }),
  };
}
const elements = { cv: fakeCanvas(), sat: { getBoundingClientRect: () => ({ height: 0 }) } };
global.document = { getElementById: (id) => elements[id] || null, addEventListener() {},
  createElement: () => fakeCanvas(), hidden: false, documentElement: { style: { setProperty() {} } } };
global.window = { devicePixelRatio: 2, screen: { width: W, height: H }, addEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
  AudioContext: undefined, performance: { now: () => 0 } };
const _ls = {};
global.localStorage = { getItem: (k) => (k in _ls ? _ls[k] : null),
  setItem: (k, v) => { _ls[k] = String(v); }, removeItem: (k) => { delete _ls[k]; } };
global.performance = { now: () => 0 };
global.requestAnimationFrame = () => 0;
global.navigator = { vibrate() {}, userAgent: 'node' };
global.Audio = function () { return { play() {}, pause() {}, addEventListener() {} }; };
global.Image = function () { return { onload: null, onerror: null, width: 0, height: 0, set src(_v) {} }; };

const root = path.resolve(__dirname, '..');
const esbuild = path.join(root, 'node_modules', 'esbuild', 'bin', 'esbuild');
const out = path.join(os.tmpdir(), '_preview-entry.cjs');
execFileSync(esbuild, [path.join(__dirname, '_preview-entry.ts'), '--bundle', '--format=cjs',
  '--platform=node', '--loader:.mp3=text', '--loader:.css=text', '--loader:.webp=text', '--outfile=' + out],
  { stdio: 'inherit' });
const { geom } = require(out);

const DEVICES = [
  { name: 'iPhone 6-7-8 Safari 375x559', w: 375, h: 559, st: 6, sb: 0 },
  { name: 'iPhone SE1 Safari 320x460', w: 320, h: 460, st: 6, sb: 0 },
  { name: 'iPhone 12 390x844', w: 390, h: 844, st: 53, sb: 34 },
  { name: 'iPhone 11 414x896', w: 414, h: 896, st: 54, sb: 34 },
  { name: 'tablet column 540x1024', w: 540, h: 1024, st: 6, sb: 0 },
];

const data = geom(DEVICES);
const OUT = path.join(__dirname, '.layout-preview');
fs.mkdirSync(OUT, { recursive: true });

const SC = 0.62;              // px scale for the SVG
const PADX = 18, PADY = 40, COLGAP = 26;

function boxesHome(g) {
  const b = [];
  // icon rows (schematic): left 2 rows + right cluster
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
    if (r === 1 && c > 1) continue;
    b.push({ x: 12 + c * (g.isz + g.igap), y: 6 + 12 + r * (g.isz + g.igap), w: g.isz, h: g.isz, c: '#3a3460', t: '' });
  }
  for (let c = 0; c < 3; c++) b.push({ x: g.W - 12 - (c + 1) * g.isz - c * g.igap, y: 6 + 12, w: g.isz, h: g.isz, c: '#4a3a60', t: '' });
  // logo + hero (as ovals via rects here)
  b.push({ x: g.W * 0.25, y: g.home.logoCY - g.home.logoSize * 0.5, w: g.W * 0.5, h: g.home.logoSize, c: '#2a3550', t: 'COIL' });
  b.push({ x: g.W / 2 - g.home.heroR, y: g.home.heroCY - g.home.heroR, w: g.home.heroR * 2, h: g.home.heroR * 2, c: '#163b3a', t: 'hero', round: true });
  b.push({ ...g.home.stat, c: '#241e4a', t: 'STAR VAULT | BEST' });
  b.push({ ...g.home.season, c: '#2a1f50', t: 'SEASON' });
  b.push({ ...g.home.missions, c: '#1a2740', t: 'DAILY MISSIONS (panel)' });
  b.push({ x: g.W * 0.1, y: g.home.nextY - 8, w: g.W * 0.8, h: 16, c: '#403418', t: 'NEXT ·' });
  b.push({ ...g.home.play, c: '#0f5a52', t: 'PLAY' });
  b.push({ x: g.home.sec.x, y: g.home.sec.y, w: g.home.sec.third, h: g.home.sec.h, c: '#2a2440', t: 'DAILY' });
  b.push({ x: g.home.sec.x + g.home.sec.third + g.home.sec.gap, y: g.home.sec.y, w: g.home.sec.third, h: g.home.sec.h, c: '#2a2440', t: 'ZEN' });
  b.push({ x: g.home.sec.x + 2 * (g.home.sec.third + g.home.sec.gap), y: g.home.sec.y, w: g.home.sec.third, h: g.home.sec.h, c: '#2a2440', t: 'SHOP' });
  return b;
}

function boxesResult(g, r, bars, extras) {
  const b = [];
  b.push({ x: g.W * 0.2, y: r.headerY - 16, w: g.W * 0.6, h: 30, c: '#2a3550', t: 'HEADER' });
  b.push({ x: g.W * 0.3, y: r.heightY - 20, w: g.W * 0.4, h: 38, c: '#1a2740', t: 'NNN m' });
  b.push({ x: g.W * 0.12, y: r.statY - 14, w: g.W * 0.76, h: 34, c: '#241e4a', t: 'BEST · PERFECTx · PERFECTS' });
  for (let i = 0; i < bars; i++) b.push({ x: g.W * 0.12, y: r.barTop + i * r.barStep - 7, w: g.W * 0.76, h: r.barStep - 6, c: '#163b3a', t: 'bar ' + (i + 1) });
  for (let i = 0; i < extras; i++) b.push({ x: g.W * 0.25, y: r.extraTop + i * r.extraStep - 7, w: g.W * 0.5, h: 14, c: '#403418', t: 'status' });
  b.push({ x: g.W * 0.2, y: r.nextActionY - 8, w: g.W * 0.6, h: 16, c: '#2a2440', t: 'next action' });
  if (r.cta) b.push({ ...r.cta, c: '#5a4a10', t: 'REVIVE/2x' });
  b.push({ ...r.replay, c: '#0f5a52', t: 'PLAY AGAIN' });
  b.push({ x: r.bottomRow.x, y: r.bottomRow.y, w: r.bottomRow.third, h: r.bottomRow.h, c: '#2a2440', t: 'ASCENT' });
  b.push({ x: r.bottomRow.x + r.bottomRow.third + r.bottomRow.gap, y: r.bottomRow.y, w: r.bottomRow.third, h: r.bottomRow.h, c: '#2a2440', t: 'SHOP' });
  b.push({ x: r.bottomRow.x + 2 * (r.bottomRow.third + r.bottomRow.gap), y: r.bottomRow.y, w: r.bottomRow.third, h: r.bottomRow.h, c: '#2a2440', t: 'MENU' });
  b.push({ x: g.W * 0.25, y: r.tapHintY - 7, w: g.W * 0.5, h: 14, c: '#33304a', t: 'TAP TO PLAY AGAIN' });
  return b;
}

function panel(ox, g, title, boxes) {
  const w = g.W * SC, h = g.H * SC;
  let s = `<g transform="translate(${ox},${PADY})">`;
  s += `<text x="${w / 2}" y="-8" fill="#cdd8ff" font-size="12" text-anchor="middle" font-family="sans-serif">${title}</text>`;
  s += `<rect x="0" y="0" width="${w}" height="${h}" fill="#0a0720" stroke="#3a3560"/>`;
  // safe-area band
  s += `<rect x="0" y="${g.st * SC}" width="${w}" height="${(g.H - g.st - g.sb) * SC}" fill="none" stroke="#1f6b4a" stroke-dasharray="3 3"/>`;
  for (const bx of boxes) {
    const rx = bx.round ? (bx.w * SC) / 2 : 4;
    s += `<rect x="${bx.x * SC}" y="${bx.y * SC}" width="${Math.max(0, bx.w) * SC}" height="${Math.max(0, bx.h) * SC}" rx="${rx}" fill="${bx.c}" stroke="#6a7ab0" stroke-width="0.6"/>`;
    if (bx.t) s += `<text x="${(bx.x + bx.w / 2) * SC}" y="${(bx.y + bx.h / 2) * SC + 3}" fill="#dfe7ff" font-size="8" text-anchor="middle" font-family="sans-serif">${bx.t}</text>`;
  }
  s += `</g>`;
  return { svg: s, w };
}

for (const g of data) {
  const cols = [
    { title: `HOME · ${g.name} · S=${g.S.toFixed(2)}`, boxes: boxesHome(g) },
    { title: `RESULT (full+revive) · ${g.name}`, boxes: boxesResult(g, g.rFull, 4, 3) },
    { title: `RESULT (fast) · ${g.name}`, boxes: boxesResult(g, g.rFast, 1, 1) },
  ];
  let x = PADX, inner = '';
  let maxH = 0;
  for (const c of cols) {
    const p = panel(x, g, c.title, c.boxes);
    inner += p.svg;
    x += p.w + COLGAP;
    maxH = Math.max(maxH, g.H * SC);
  }
  const totalW = x - COLGAP + PADX;
  const totalH = maxH + PADY + 16;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(totalW)}" height="${Math.round(totalH)}" viewBox="0 0 ${Math.round(totalW)} ${Math.round(totalH)}"><rect width="100%" height="100%" fill="#04030a"/>${inner}</svg>`;
  const file = path.join(OUT, g.name.replace(/[^a-z0-9]+/gi, '-') + '.svg');
  fs.writeFileSync(file, svg);
  console.log('wrote', path.relative(root, file));
}
console.log('done');
