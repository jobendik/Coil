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

const root = path.resolve(__dirname, '..');
// Invoke esbuild's JS entry with the current `node` rather than the `.bin`
// shim. The shim is extensionless on POSIX (`esbuild`) but a `.cmd` on Windows,
// and Node 20+ refuses to spawn a `.cmd` via execFileSync without `shell: true`
// (CVE-2024-27980) — so spawning the shim directly fails with ENOENT/EINVAL on
// Windows. Running `node node_modules/esbuild/bin/esbuild …` is fully
// cross-platform, needs no shell, and avoids any argument-escaping pitfalls.
const esbuild = path.join(root, 'node_modules', 'esbuild', 'bin', 'esbuild');
const tests = fs.readdirSync(__dirname).filter((f) => f.endsWith('.test.ts'));

let anyFail = false;
for (const t of tests) {
  const src = path.join(__dirname, t);
  const out = path.join(os.tmpdir(), t.replace(/\.ts$/, '.cjs'));
  execFileSync(process.execPath, [esbuild, src, '--bundle', '--format=cjs', '--platform=node',
    '--loader:.mp3=text', '--loader:.css=text', '--outfile=' + out], { stdio: 'inherit' });
  console.log('\n▶ ' + t);
  try {
    require(out);
  } catch (e) {
    anyFail = true;
    console.error('  test threw:', e && e.message ? e.message : e);
  }
}
if (anyFail) process.exit(1);
