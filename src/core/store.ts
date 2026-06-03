/* =========================================================================
   PERSISTENCE — localStorage is the synchronous source of truth (read at module
   load, always available, fast). When running on CrazyGames, every write is
   MIRRORED to the platform Data module, which syncs across devices for
   logged-in users (and is localStorage-backed for guests). On a fresh device
   for a returning logged-in player, a one-time cloud→local hydration + reload
   restores their progress. Off-platform this is a pure localStorage store.

   We talk to `window.CrazyGames.SDK.data` directly (not via core/cg) to avoid a
   module cycle; access is fully defensive so it no-ops anywhere the SDK is
   absent or not yet initialised.
   ========================================================================= */
const mem: Record<string, unknown> = {};

interface CGDataApi {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}
function cgData(): CGDataApi | null {
  try {
    const d = (window as unknown as { CrazyGames?: { SDK?: { data?: CGDataApi } } })
      .CrazyGames?.SDK?.data;
    return d && typeof d.setItem === 'function' ? d : null;
  } catch {
    return null;
  }
}

const INDEX = 'coil_keys';
const keys: string[] = (() => {
  try { return JSON.parse(localStorage.getItem(INDEX) || '[]') as string[]; } catch { return []; }
})();

function rememberKey(k: string): void {
  if (k === INDEX || keys.includes(k)) return;
  keys.push(k);
  try { localStorage.setItem(INDEX, JSON.stringify(keys)); } catch { /* private mode */ }
}

export const Store = {
  get<T>(k: string, d: T): T {
    let v: string | null;
    try {
      v = localStorage.getItem(k);
    } catch {
      return (k in mem) ? (mem[k] as T) : d;     // storage disabled (private mode)
    }
    if (v == null) return d;
    try {
      return JSON.parse(v) as T;
    } catch {
      // Corrupted value — drop it so we self-heal (return the default cleanly now,
      // and a later set() can write valid data) instead of failing every load.
      try { localStorage.removeItem(k); } catch { /* ignore */ }
      return d;
    }
  },
  set<T>(k: string, v: T): void {
    const s = JSON.stringify(v);
    try {
      localStorage.setItem(k, s);
    } catch {
      mem[k] = v;
    }
    rememberKey(k);
    // Mirror to the cloud (best-effort; no-op off-platform).
    const d = cgData();
    if (d) {
      try {
        d.setItem(k, s);
        d.setItem(INDEX, JSON.stringify(keys));
      } catch { /* quota / unavailable */ }
    }
  },

  /**
   * Array-typed read. Returns the stored value ONLY if it actually parses to an
   * array, otherwise a fresh copy of the default. This guards the white-screen
   * class of bug: `Store.get` catches *malformed* JSON, but valid-JSON-of-the-
   * wrong-type (e.g. a number or object stored under an array key) sails through
   * — and the cast `as T[]` is erased at runtime, so the consumer's `.includes()`
   * / `.unshift()` then throws at MODULE-LOAD time and the game never starts.
   * Wrong-type data is realistic here: a schema change between builds, or a key
   * collision on the shared crazygames.com localStorage origin (every embedded
   * CrazyGames title sees the same storage).
   */
  arr<T>(k: string, d: T[]): T[] {
    const v = this.get<unknown>(k, null);
    return Array.isArray(v) ? (v as T[]) : d.slice();
  },

  /**
   * Number-typed read. Only a finite number passes; anything else (string, bool,
   * array, object, null, NaN, Infinity) returns the default. Stops a wrong-type
   * value from triggering a string-concat cascade (`[] + 5 === "5"`, then
   * re-persisted as a string forever) or a NaN/Infinity from entering game state.
   */
  num(k: string, d: number): number {
    const v = this.get<unknown>(k, null);
    return typeof v === 'number' && Number.isFinite(v) ? v : d;
  },

  /**
   * Plain-object ("dictionary") read. Returns the stored value only if it's a
   * non-null, non-array object, else a fresh copy of the default. Without this a
   * wrong-type value (e.g. a number under `coil_ach`) makes a later
   * `this.unlocked[id] = …` throw a TypeError in strict-mode ESM (assigning a
   * property on a primitive), breaking the run-end flow.
   */
  obj<T extends object>(k: string, d: T): T {
    const v = this.get<unknown>(k, null);
    return v != null && typeof v === 'object' && !Array.isArray(v) ? (v as T) : { ...d };
  },

  /**
   * Called once after the CrazyGames SDK initialises. If THIS device has no
   * local profile yet but the player's cloud save does (i.e. a returning,
   * logged-in player on a new device), copy the cloud keys into localStorage so
   * every module re-reads real progress. Returns true if it hydrated — the
   * caller should reload so the already-imported state objects pick it up.
   * Guarded by sessionStorage so it can never loop.
   */
  hydrateFromCloud(): boolean {
    const d = cgData();
    if (!d) return false;
    try { if (sessionStorage.getItem('coil_hydrated')) return false; } catch { /* ignore */ }

    let localHasProfile = false;
    try {
      localHasProfile = localStorage.getItem('coil_xp') != null || localStorage.getItem('coil_best') != null;
    } catch { /* ignore */ }

    let cloudKeys: string[] = [];
    try { cloudKeys = JSON.parse(d.getItem(INDEX) || '[]') as string[]; } catch { /* ignore */ }
    const cloudHasProfile = cloudKeys.includes('coil_xp') || cloudKeys.includes('coil_best');

    // Only hydrate the clear "fresh device, returning player" case — never clobber
    // existing local progress (local stays the truth and mirrors upward instead).
    if (localHasProfile || !cloudHasProfile) return false;

    let copied = 0;
    let failed = 0;
    for (const k of cloudKeys) {
      try {
        const v = d.getItem(k);
        if (v != null) { localStorage.setItem(k, v); copied++; }
      } catch { failed++; }
    }
    // Latch UNCONDITIONALLY once we've attempted a copy. sessionStorage survives the
    // reload that follows, so the latch guarantees at most one hydrate→reload per
    // tab — even if some keys failed to copy (quota). Previously the latch was only
    // written on a fully clean copy, so a partial failure on the profile key left
    // localHasProfile=false forever → hydrate returns true → reload → LOOP. Any keys
    // that failed here are re-mirrored to the cloud by the next normal set().
    void failed;
    try { sessionStorage.setItem('coil_hydrated', '1'); } catch { /* ignore */ }
    return copied > 0;
  },
};
