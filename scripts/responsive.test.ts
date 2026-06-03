/* =========================================================================
   RESPONSIVE LAYOUT TEST

   COIL renders 100% to a single <canvas>, so its "responsive" behaviour lives in
   the per-scene layout maths (not CSS). This test exercises homeLayout() and
   resultLayout() — the pure layout solvers for the two stat-heavy meta screens —
   across every supported viewport, from a 320×568 iPhone SE 1st-gen up to a
   540-wide tablet column, and asserts the invariants the old fixed-pixel layouts
   violated on short screens:

     • every element stays within the safe-area band [SAFE_TOP, H − SAFE_BOTTOM];
     • no two stacked blocks overlap (the bug: mission panel ↔ NEXT/PLAY on home;
       progress bars ↔ CTA cluster, and bottom nav ↔ "TAP TO PLAY AGAIN", on the
       result screen);
     • blocks keep a sane reading order and a usable minimum size.

   Heights are tested both at full device height AND at a Safari-toolbar-reduced
   height (the real iPhone 6 case), because that's when things were breaking.
   ========================================================================= */
import { view, computeUiScale } from '../src/core/canvas';
import { homeLayout } from '../src/scenes/home';
import { resultLayout } from '../src/scenes/result';

let failures = 0;
const EPS = 0.6;   // sub-pixel rounding tolerance
const check = (cond: boolean, msg: string): void => {
  if (!cond) { failures++; console.error('  ✗ ' + msg); }
};
const le = (a: number, b: number, msg: string): void => check(a <= b + EPS, `${msg}  (${a.toFixed(1)} ≤ ${b.toFixed(1)})`);

// Frame is capped at max-width:540 in CSS, so the canvas width is min(device, 540).
const FRAME_MAX_W = 540;

interface Dev { name: string; w: number; h: number; st: number; sb: number; }

// st/sb model the safe-area insets the canvas sees (SAFE_TOP = inset + 6).
const DEVICES: Dev[] = [
  { name: 'iPhone SE 1st-gen 320×568',         w: 320, h: 568, st: 6,  sb: 0 },
  { name: 'iPhone SE Safari (toolbar) 320×460', w: 320, h: 460, st: 6,  sb: 0 },
  { name: 'small Android 360×640',             w: 360, h: 640, st: 6,  sb: 0 },
  { name: 'small Android Safari 360×560',      w: 360, h: 560, st: 6,  sb: 0 },
  { name: 'iPhone 6/7/8 375×667',              w: 375, h: 667, st: 6,  sb: 0 },
  { name: 'iPhone 6/7/8 Safari 375×559',       w: 375, h: 559, st: 6,  sb: 0 },  // the reported case
  { name: 'iPhone 12/13/14 390×844',           w: 390, h: 844, st: 53, sb: 34 },
  { name: 'iPhone 12 Safari 390×740',          w: 390, h: 740, st: 53, sb: 34 },
  { name: 'iPhone XR/11 414×896',              w: 414, h: 896, st: 54, sb: 34 },
  { name: 'tablet column 540×1024',            w: 540, h: 1024, st: 6, sb: 0 },
  { name: 'tablet landscape-ish 540×720',      w: 540, h: 720, st: 6, sb: 0 },
];

function applyDevice(d: Dev): void {
  view.W = Math.min(d.w, FRAME_MAX_W);
  view.H = d.h;
  view.SAFE_TOP = d.st;
  view.SAFE_BOTTOM = d.sb;
  view.S = computeUiScale(view.H, view.SAFE_TOP, view.SAFE_BOTTOM);
}

/* ----------------------------- HOME ----------------------------- */
function testHome(d: Dev, firstSession: boolean): void {
  applyDevice(d);
  const top = view.SAFE_TOP;
  const bottom = view.H - view.SAFE_BOTTOM;
  const L = homeLayout(firstSession);
  const tag = `HOME ${firstSession ? '(first run) ' : ''}· ${d.name}`;

  // logo wordmark clears the corner icon rows (the screenshot's "COIL behind toggles").
  check(L.logoCY - L.logoSize * 0.5 >= L.iconRowBottom - EPS, `${tag}: logo clears icon rows`);

  if (firstSession) {
    // hero above the onboarding PLAY; PLAY fully on-screen.
    le(L.heroCY + L.heroR, L.firstPlay.y, `${tag}: hero above PLAY`);
    le(L.firstPlay.y + L.firstPlay.h, bottom, `${tag}: PLAY within bottom safe edge`);
    check(L.firstPlay.y >= top, `${tag}: PLAY below top safe edge`);
    return;
  }

  // reading order, top → bottom, no overlaps.
  le(L.heroCY + L.heroR, L.stat.y, `${tag}: hero orbit above stat card`);
  le(L.stat.y + L.stat.h, L.season.y, `${tag}: stat card above season banner`);
  le(L.season.y + L.season.h, L.missions.y, `${tag}: season banner above missions panel`);
  le(L.missions.y + L.missions.h, L.nextY - 2, `${tag}: missions panel above NEXT line (NO overlap)`);
  le(L.nextY, L.play.y, `${tag}: NEXT line above PLAY button`);
  le(L.play.y + L.play.h, L.sec.y, `${tag}: PLAY above DAILY/ZEN/SHOP row`);
  le(L.sec.y + L.sec.h, bottom, `${tag}: bottom row within bottom safe edge`);
  check(L.stat.y >= L.iconRowBottom - EPS, `${tag}: stat card below icon rows`);

  // the missions panel must stay usable (header + 3 readable rows). Scaled floor.
  check(L.missions.h >= 70 * view.S, `${tag}: missions panel tall enough to be readable (${L.missions.h.toFixed(0)}px, S=${view.S.toFixed(2)})`);

  // horizontal sanity
  check(L.stat.x >= 0 && L.stat.x + L.stat.w <= view.W + EPS, `${tag}: stat card within width`);
}

/* ----------------------------- RESULT ----------------------------- */
interface RCase { label: string; nBars: number; nExtra: number; hasTopCTA: boolean; hasHighlight: boolean; fast: boolean; }
const RCASES: RCase[] = [
  { label: 'full stack + revive + 4 status', nBars: 4, nExtra: 4, hasTopCTA: true,  hasHighlight: true,  fast: false },
  { label: 'full stack no-CTA',              nBars: 4, nExtra: 1, hasTopCTA: false, hasHighlight: true,  fast: false },
  { label: 'zen 3 bars',                     nBars: 3, nExtra: 2, hasTopCTA: false, hasHighlight: false, fast: false },
  { label: 'fast 1 bar + double',            nBars: 1, nExtra: 3, hasTopCTA: true,  hasHighlight: false, fast: true  },
  { label: 'fast 1 bar minimal',             nBars: 1, nExtra: 0, hasTopCTA: false, hasHighlight: false, fast: true  },
];

function testResult(d: Dev, c: RCase): void {
  applyDevice(d);
  const top = view.SAFE_TOP;
  const bottom = view.H - view.SAFE_BOTTOM;
  const S = view.S;
  const L = resultLayout(c);
  const tag = `RESULT [${c.label}] · ${d.name}`;

  // top cluster ordering
  le(L.headerY, L.heightY, `${tag}: header above height`);
  le(L.heightY, L.statY, `${tag}: height above stat row`);
  le(L.statY, L.highlightY, `${tag}: stat row above highlight`);

  // bars + status all sit ABOVE the action cluster (the core overlap bug).
  const lastBarBottom = L.barTop + (c.nBars - 1) * L.barStep + 11 * S + 9 * S;
  const lastStatusY = c.nExtra > 0 ? L.extraTop + (c.nExtra - 1) * L.extraStep : -Infinity;
  const barsBottom = Math.max(lastBarBottom, lastStatusY);
  le(barsBottom, L.nextActionY - 2, `${tag}: bars + status above NEXT-ACTION (NO overlap)`);
  check(L.barStep > 14 * S, `${tag}: bar pitch stays legible (${L.barStep.toFixed(1)}px)`);

  // action cluster: nextAction → [CTA] → replay → bottom row, each below the last.
  let prevBottom = L.nextActionY;
  if (L.cta) {
    check(L.cta.y >= prevBottom - EPS, `${tag}: CTA below next-action`);
    prevBottom = L.cta.y + L.cta.h;
  }
  check(L.replay.y >= prevBottom - EPS, `${tag}: PLAY-AGAIN below CTA/next-action`);
  le(L.replay.y + L.replay.h, L.bottomRow.y, `${tag}: PLAY-AGAIN above bottom nav`);
  le(L.bottomRow.y + L.bottomRow.h, L.tapHintY, `${tag}: bottom nav above TAP-TO-PLAY hint (NO overlap)`);
  le(L.tapHintY, bottom, `${tag}: TAP hint within bottom safe edge`);
  check(L.headerY >= top - EPS, `${tag}: header below top safe edge`);
}

for (const d of DEVICES) {
  testHome(d, false);
  testHome(d, true);
  for (const c of RCASES) testResult(d, c);
}

if (failures === 0) {
  console.log(`responsive: ✓ home + result layouts fit & never overlap across ${DEVICES.length} viewports (320×460 → 540×1024)`);
} else {
  console.error(`  ${failures} responsive layout failures`);
  process.exit(1);
}
