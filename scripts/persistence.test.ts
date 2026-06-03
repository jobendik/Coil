/* =========================================================================
   PERSISTENCE HARDENING TEST

   Guards the crash class found in the pre-launch audit: localStorage holding
   valid-JSON-of-the-WRONG-TYPE (from a schema change between builds, or a key
   collision on the shared crazygames.com storage origin). `Store.get` only
   catches malformed JSON; a wrong-type value sails through and the `as T` cast is
   erased at runtime, so a consumer's `.includes()` / `.push()` / `obj[k]=…` throws
   — at MODULE-LOAD time for the cosmetics arrays (→ white screen), or mid-run for
   the rest. The typed readers (Store.arr / num / obj) + the level-loop guard are
   what make those paths safe; this locks the behaviour in.
   ========================================================================= */
import { Store } from '../src/core/store';
import { Profile } from '../src/game/profile';

let failures = 0;
const check = (c: boolean, m: string): void => { if (!c) { failures++; console.error('  ✗ ' + m); } };

// ---- Store.arr: wrong-type-but-valid-JSON must yield the default, never crash a consumer ----
localStorage.setItem('t_arr_num', '42');
localStorage.setItem('t_arr_obj', '{"a":1}');
localStorage.setItem('t_arr_str', '"cyan"');
localStorage.setItem('t_arr_ok', '["a","b"]');
check(Store.arr('t_arr_num', ['x']).length === 1, 'arr: number → fresh default');
check(Array.isArray(Store.arr('t_arr_obj', ['x'])), 'arr: object → array default');
check(Store.arr('t_arr_str', ['x'])[0] === 'x', 'arr: bare string → default (not a char array)');
check(Store.arr('t_arr_ok', ['x']).join() === 'a,b', 'arr: valid array passes through');
// the exact consumer pattern from skins.ts / collection.ts must never throw:
let threw = false;
try {
  const owned = Store.arr<string>('t_arr_num', ['cyan']);
  if (!owned.includes('cyan')) owned.unshift('cyan');
} catch { threw = true; }
check(!threw, 'arr consumer (.includes/.unshift) never throws on wrong-type data (white-screen guard)');

// ---- Store.num: only finite numbers pass; no string-concat / NaN cascade ----
localStorage.setItem('t_num_str', '"100"');
localStorage.setItem('t_num_arr', '[]');
localStorage.setItem('t_num_ok', '250');
check(Store.num('t_num_str', 0) === 0, 'num: string → default (blocks "100"+5 concat)');
check(Store.num('t_num_arr', 0) === 0, 'num: array → default');
check(Store.num('t_num_ok', 5) === 250, 'num: valid number passes');
check(Store.num('t_missing', 7) === 7, 'num: missing key → default');

// ---- Store.obj: only plain objects pass ----
localStorage.setItem('t_obj_num', '5');
localStorage.setItem('t_obj_arr', '[1,2]');
localStorage.setItem('t_obj_ok', '{"x":1}');
check(Object.keys(Store.obj('t_obj_num', {})).length === 0, 'obj: number → default');
check(!Array.isArray(Store.obj('t_obj_arr', {})), 'obj: array → plain-object default');
check(Store.obj<Record<string, number>>('t_obj_ok', {}).x === 1, 'obj: valid object passes');

// ---- Store.get still self-heals malformed JSON ----
localStorage.setItem('t_corrupt', '{not valid json');
check(Store.get('t_corrupt', 'def') === 'def', 'get: malformed JSON → default');
check(localStorage.getItem('t_corrupt') === null, 'get: malformed value removed (self-heal)');

// ---- Profile.levelProgress runs EVERY FRAME on home/result — must never hang ----
const realXp = Profile.xp;
for (const [val, label] of [[Infinity, 'Infinity'], [NaN, 'NaN'], [1e15, 'huge finite']] as Array<[number, string]>) {
  Profile.xp = val;
  const t0 = Date.now();
  const lp = Profile.levelProgress();
  check(Date.now() - t0 < 100, `levelProgress: ${label} xp returns promptly (no spin)`);
  check(Number.isFinite(lp.l) && lp.l >= 1 && lp.l <= 1000, `levelProgress: ${label} xp → bounded finite level`);
}
Profile.xp = realXp;

if (failures === 0) {
  console.log('persistence: ✓ Store type-guards + level-loop guard hold (no white-screen / no hang on wrong-type or non-finite data)');
} else {
  console.error(`  ${failures} persistence hardening failures`);
  process.exit(1);
}
