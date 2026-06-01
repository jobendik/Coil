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
    // Only latch "done" on a clean copy, so a transient failure (e.g. quota) can
    // retry next session rather than permanently giving up on a partial restore.
    if (failed === 0) { try { sessionStorage.setItem('coil_hydrated', '1'); } catch { /* ignore */ } }
    return copied > 0;
  },
};
