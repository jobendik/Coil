/* Headless test runner: stubs the browser globals the game core touches, then
   bundles + executes the TS test files with esbuild. Used by `npm test`. */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

// ---- minimal DOM/window stubs (canvas is only used for sizing here) ----
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
  createElement: () => fakeCanvas(), hidden: false };
global.window = { devicePixelRatio: 2, screen: { width: W, height: H }, addEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
  // No AudioContext → ac() returns null and all SFX become no-ops in tests.
  AudioContext: undefined, performance: { now: () => 0 } };
const _ls = {};
global.localStorage = { getItem: (k) => (k in _ls ? _ls[k] : null),
  setItem: (k, v) => { _ls[k] = String(v); }, removeItem: (k) => { delete _ls[k]; } };
global.performance = { now: () => 0 };
global.requestAnimationFrame = () => 0;
global.navigator = { vibrate() {}, userAgent: 'node' };
global.Audio = function () { return { play() {}, pause() {}, addEventListener() {} }; };
// Image: the menu backdrop (scenes/menubg.ts) instantiates one at module load.
// Stub it so importing that chain in a test is a no-op (it never decodes; drawMenuBg
// short-circuits on !ready).
global.Image = function () { return { onload: null, onerror: null, width: 0, height: 0, set src(_v) { /* never decodes in node */ } }; };

const root = path.resolve(__dirname, '..');
// Call the esbuild native binary directly. In esbuild 0.17+ the file at
// node_modules/esbuild/bin/esbuild is the native platform binary (ELF on
// Linux, Mach-O on macOS, PE on Windows) — passing it as an argument to
// `node` fails with "SyntaxError: Invalid or unexpected token".
// Calling it as the executable works cross-platform and needs no shell.
const esbuild = path.join(root, 'node_modules', 'esbuild', 'bin', 'esbuild');
const tests = fs.readdirSync(__dirname).filter((f) => f.endsWith('.test.ts'));

let anyFail = false;
for (const t of tests) {
  const src = path.join(__dirname, t);
  const out = path.join(os.tmpdir(), t.replace(/\.ts$/, '.cjs'));
  execFileSync(esbuild, [src, '--bundle', '--format=cjs', '--platform=node',
    '--loader:.mp3=text', '--loader:.css=text', '--loader:.webp=text', '--outfile=' + out], { stdio: 'inherit' });
  console.log('\n▶ ' + t);
  try {
    require(out);
  } catch (e) {
    anyFail = true;
    console.error('  test threw:', e && e.message ? e.message : e);
  }
}
if (anyFail) process.exit(1);
