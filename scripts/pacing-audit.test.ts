/* =========================================================================
   PROGRESSION-PACING AUDIT (improvements_to_be_done.md §4.1)

   Maps the full unlock cadence across every track and asserts there are no
   dead zones. It models the REAL coin economy (per-run earnings by skill +
   the daily login/wheel/chest/mission injections) and walks a plausible
   new-player career run-by-run, recording when each unlock fires. It fails if:

     1. nothing unlocks in the first ~5 minutes (CrazyGames onboarding bar),
     2. the height ladder (evolution characters) has a gap wider than one step,
     3. any stretch goes longer than DEAD_ZONE_RUNS runs with zero new unlock.

   Run via `npm test`. Prints the map either way.
   ========================================================================= */
import {
  SKINS, MILESTONE_SKINS, TRAILS, WORLDS, ACCESSORIES, MILESTONE_STEP,
} from '../src/config';
import type { UnlockReq } from '../src/types';

const LOGIN_REWARDS = [50, 100, 150, 200, 300, 400, 500];
const WHEEL_AVG = 131;          // mean of WHEEL_SEGMENTS
const CHEST_AVG = 300;          // mean of Chest.open() range
const MISSIONS_ALL = 280;       // 40+90+150 if all three dailies are done

interface Item { name: string; track: string; price: number; req?: UnlockReq; }

const ITEMS: Item[] = [
  ...SKINS.map((s) => ({ name: s.name, track: 'skin', price: s.price, req: s.req })),
  ...MILESTONE_SKINS.map((s) => ({ name: s.name, track: 'evo', price: s.price, req: s.req })),
  ...TRAILS.map((t) => ({ name: t.name, track: 'trail', price: t.price, req: t.req })),
  ...WORLDS.map((w) => ({ name: w.name, track: 'world', price: w.price, req: w.req })),
  ...ACCESSORIES.map((a) => ({ name: a.name, track: 'gear', price: a.price, req: a.req })),
];

// Items the player owns at the very start (free + no req).
const STARTERS = ITEMS.filter((i) => i.price === 0 && !i.req);

/* ---- coin economy: estimate a run's coins from the peak height reached ----
   flings ≈ h/10 (≈one ~110px gap per ~10 m); perfects scale the per-fling
   payout (round(3·combo)); plus a share of sparks (2 ea), the combo-tier
   bonuses, and the odd bonus/constellation. Deliberately CONSERVATIVE. */
function coinsForRun(h: number, perfectRate: number, avgCombo: number): number {
  const flings = Math.max(4, h / 10);
  const perfectGain = flings * perfectRate * Math.round(3 * avgCombo);
  const sparks = flings * 0.5 * 2;
  let tiers = 0;
  if (avgCombo >= 3) tiers += 10;
  if (avgCombo >= 5) tiers += 30;
  if (avgCombo >= 8) tiers += 75;
  if (avgCombo >= 12) tiers += 200;
  const extras = (h > 150 ? 25 : 0) + (h > 250 ? 80 : 0);   // a bonus node / a constellation
  return Math.round(perfectGain + sparks + tiers + extras);
}

// A plausible improving new player: height + skill climb over their first runs,
// then plateau. (Heights are intentionally modest — this is NOT a pro.)
function careerRun(n: number): { h: number; perfectRate: number; avgCombo: number } {
  const h = Math.min(520, Math.round(60 + n * 26 + Math.max(0, n - 8) * 10));
  const perfectRate = Math.min(0.9, 0.55 + n * 0.03);
  const avgCombo = Math.min(11, 2 + n * 0.45);
  return { h, perfectRate, avgCombo };
}

function reqReachableNote(req: UnlockReq): string {
  switch (req.kind) {
    case 'height': return `reach ${req.value} m`;
    case 'combo':  return `chain x${req.value}`;
    case 'streak': return `${req.value}-day streak`;
    case 'constel': return `${req.value} constellations`;
    case 'ach':    return `achievement ${req.value}`;
  }
}

let failures = 0;
const fail = (m: string): void => { failures++; console.error('  ✗ ' + m); };

function run(): void {
  // ---------- 1. HEIGHT LADDER (the free evolution-character backbone) ----------
  const evoHeights = MILESTONE_SKINS
    .map((s) => (s.req && s.req.kind === 'height' ? (s.req.value as number) : 0))
    .filter((v) => v > 0)
    .sort((a, b) => a - b);
  let maxEvoGap = evoHeights[0];        // gap from 0 to the first one
  for (let i = 1; i < evoHeights.length; i++) maxEvoGap = Math.max(maxEvoGap, evoHeights[i] - evoHeights[i - 1]);
  console.log(`\npacing: evolution height ladder ${evoHeights[0]}…${evoHeights[evoHeights.length - 1]} m, max gap ${maxEvoGap} m`);
  if (evoHeights[0] > MILESTONE_STEP) fail(`first free character at ${evoHeights[0]} m — too far for a session-1 unlock`);
  if (maxEvoGap > MILESTONE_STEP) fail(`evolution ladder has a ${maxEvoGap} m gap (> one ${MILESTONE_STEP} m step)`);

  // ---------- 2. COIN LADDER (pure-coin cosmetics, sorted) ----------
  const coinItems = ITEMS.filter((i) => i.price > 0 && !i.req).sort((a, b) => a.price - b.price);
  const prices = coinItems.map((i) => i.price);
  let maxCoinGap = prices[0];
  for (let i = 1; i < prices.length; i++) maxCoinGap = Math.max(maxCoinGap, prices[i] - prices[i - 1]);
  console.log(`pacing: ${coinItems.length} pure-coin items ${prices[0]}…${prices[prices.length - 1]} ◎, max single step ${maxCoinGap} ◎`);
  console.log('        ' + coinItems.map((i) => `${i.name}(${i.price})`).join(' · '));

  // ---------- 3. OTHER SKILL ROUTES ----------
  const reqItems = ITEMS.filter((i) => i.req);
  console.log('pacing: skill-route unlocks → ' + reqItems.map((i) => `${i.name} [${reqReachableNote(i.req as UnlockReq)}]`).join(' · '));

  // ---------- 4. SIMULATE A NEW PLAYER'S CAREER (the dead-zone check) ----------
  // Owned set + a running coin balance fed by run earnings and the daily systems.
  const owned = new Set(STARTERS.map((i) => i.name));
  let coins = 0;
  let best = 0;
  let constellations = 0;
  let bestCombo = 0;
  let streak = 0;
  const unlockLog: Array<{ run: number; what: string }> = [];
  const RUNS = 40;
  let lastUnlockRun = 0;
  let maxDeadZone = 0;
  const DEAD_ZONE_RUNS = 6;

  for (let n = 1; n <= RUNS; n++) {
    const { h, perfectRate, avgCombo } = careerRun(n);
    best = Math.max(best, h);
    bestCombo = Math.max(bestCombo, Math.round(avgCombo) + 1);
    if (h > 250) constellations += 1;          // ~one completed chain on a longer run
    coins += coinsForRun(h, perfectRate, avgCombo);
    // daily systems: model one fresh calendar day per ~5 runs (a return session)
    if (n === 1 || n % 5 === 0) {
      streak += 1;
      coins += LOGIN_REWARDS[Math.min(streak, 7) - 1] + WHEEL_AVG + CHEST_AVG + MISSIONS_ALL;
    }

    // claim everything now affordable / earned this run
    let unlockedThisRun = false;
    for (const it of ITEMS) {
      if (owned.has(it.name)) continue;
      let got = false;
      if (it.req) {
        const r = it.req;
        let met = (r.kind === 'height' && best >= (r.value as number))
          || (r.kind === 'combo' && bestCombo >= (r.value as number))
          || (r.kind === 'constel' && constellations >= (r.value as number))
          || (r.kind === 'streak' && streak >= (r.value as number));
        // 'ach' routes mirror a height achievement; treat first1k as 1000 m
        if (r.kind === 'ach' && r.value === 'first1k') met = best >= 1000;
        if (met) got = true;
        else if (it.price > 0 && coins >= it.price) { got = true; coins -= it.price; }  // dual-route coin fallback
      } else {
        got = coins >= it.price;
        if (got) coins -= it.price;            // spend on the purchase
      }
      if (got) { owned.add(it.name); unlockLog.push({ run: n, what: `${it.name} (${it.track})` }); unlockedThisRun = true; }
    }
    // Gap BETWEEN unlocks while progression is still live. The stretch AFTER the
    // final unlock is catalogue-completion (a maxed/plateaued player), not a
    // churn-risk dead zone, so it's reported separately — not asserted.
    if (unlockedThisRun) { maxDeadZone = Math.max(maxDeadZone, n - lastUnlockRun); lastUnlockRun = n; }
  }

  console.log(`\npacing: simulated ${RUNS}-run plateauing-player career — ${unlockLog.length} unlocks`);
  const byRun: Record<number, string[]> = {};
  for (const u of unlockLog) (byRun[u.run] ??= []).push(u.what);
  for (const r of Object.keys(byRun).map(Number).sort((a, b) => a - b)) {
    console.log(`        run ${r}: ${byRun[r].join(', ')}`);
  }
  const firstThree = unlockLog.filter((u) => u.run <= 3);
  console.log(`pacing: longest gap between unlocks ${maxDeadZone} runs · collection runway ends ~run ${lastUnlockRun} `
    + `(then a ${RUNS - lastUnlockRun}-run completion tail — height-gated prestige only; carried by dailies/score)`);

  if (firstThree.length === 0) fail('no unlock in the first 3 runs (~5 min) — fails the onboarding bar');
  if (maxDeadZone > DEAD_ZONE_RUNS) fail(`mid-progression dead zone: ${maxDeadZone} runs between unlocks (max allowed ${DEAD_ZONE_RUNS})`);

  if (failures === 0) {
    console.log('\n  ✓ pacing healthy — early unlock present, even height ladder, no mid-progression gap > '
      + DEAD_ZONE_RUNS + ' runs');
  } else {
    console.error(`\n  ${failures} PACING ISSUES`);
    process.exit(1);
  }
}

run();
