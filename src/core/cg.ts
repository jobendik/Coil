import { settings, setMuted } from '../settings';
import { Store } from './store';
import { LEADERBOARDS_ENABLED, LEADERBOARD_ID, DAILY_LEADERBOARD_ID } from '../config';

/**
 * Defensive CrazyGames v3 SDK wrapper. Every call is guarded so the game is
 * fully playable off-platform (itch, GitHub Pages, local file). When the SDK
 * is unavailable, callbacks fire on a short timeout so the calling flow
 * (revive, midgame, etc.) always continues.
 */

interface CGAdHandlers {
  adStarted?: () => void;
  adFinished?: () => void;
  adError?: () => void;
}
interface CGGameApi {
  gameplayStart: () => void;
  gameplayStop: () => void;
  happytime: () => void;
}
interface CGAdApi {
  requestAd: (kind: 'midgame' | 'rewarded', handlers: CGAdHandlers) => void;
}
interface CGLeaderboardApi {
  submitScore?: (id: string, score: number) => unknown;
}
interface CGSdk {
  init: () => Promise<void>;
  game: CGGameApi;
  ad: CGAdApi;
  leaderboards?: CGLeaderboardApi;
}
interface CGWindow {
  CrazyGames?: { SDK?: CGSdk };
}

type Hook = (paused: boolean) => void;

const cgw = window as unknown as CGWindow;

class CGState {
  ready = false;
  sdk: CGSdk | null = null;
  adActive = false;
  private wasMuted = false;
  private pauseHook: Hook | null = null;
  private initializing = false;

  bindPauseHook(fn: Hook): void {
    this.pauseHook = fn;
  }

  async init(): Promise<void> {
    // init() is invoked from BOTH module-eval and the window 'load' handler, so
    // guard against re-entry: calling the SDK's init() twice (or hydrating +
    // reloading twice) is undefined behaviour and risks double-registered ad
    // handlers.
    if (this.ready || this.initializing) return;
    this.initializing = true;
    try {
      if (cgw.CrazyGames && cgw.CrazyGames.SDK) {
        await cgw.CrazyGames.SDK.init();
        this.sdk = cgw.CrazyGames.SDK;
        this.ready = true;
        // Cross-device save: if this device is fresh but the player has a cloud
        // save (logged-in, returning on a new device), pull it down and reload
        // so every already-imported state object re-reads real progress.
        if (Store.hydrateFromCloud()) {
          try { location.reload(); } catch { /* non-browser */ }
        }
      }
    } catch {
      this.ready = false;
    } finally {
      this.initializing = false;
    }
  }

  gameplayStart(): void {
    try { this.sdk?.game.gameplayStart(); } catch { /* no-op */ }
  }

  gameplayStop(): void {
    try { this.sdk?.game.gameplayStop(); } catch { /* no-op */ }
  }

  happy(): void {
    try { this.sdk?.game.happytime(); } catch { /* no-op */ }
  }

  /** Submit a height to the (invite-only) weekly leaderboard. Dormant unless
   *  LEADERBOARDS_ENABLED and the SDK actually exposes the API — a safe no-op
   *  everywhere else, so it can ship today and activate the moment we're invited. */
  submitHeight(h: number): void {
    if (!LEADERBOARDS_ENABLED || !this.ready) return;
    try { this.sdk?.leaderboards?.submitScore?.(LEADERBOARD_ID, h); } catch { /* no-op */ }
  }

  /** Submit a Daily Ascent best-of-day to the (invite-only) daily leaderboard.
   *  M7 wire-point: dormant until invited, then the shared-seed board + honest
   *  "Top X%" percentile light up with zero further work. Never faked before
   *  real data exists (coil-retention-plan.md M7 / hard-NO list). */
  submitDaily(h: number): void {
    if (!LEADERBOARDS_ENABLED || !this.ready) return;
    try { this.sdk?.leaderboards?.submitScore?.(DAILY_LEADERBOARD_ID, h); } catch { /* no-op */ }
  }

  private mute(): void {
    this.wasMuted = settings.muted;
    setMuted(true);
    this.adActive = true;
    this.pauseHook?.(true);
  }

  private resume(): void {
    setMuted(this.wasMuted);
    this.adActive = false;
    // If the tab was backgrounded while the ad played, DON'T un-pause into a hidden
    // tab (it'd run the loop/physics/music invisibly). Stay paused; the
    // visibilitychange handler resumes cleanly when the tab is shown again.
    const hidden = typeof document !== 'undefined' && document.hidden;
    this.pauseHook?.(hidden);
  }

  /** midgame interstitial — always continues even with adblock / no SDK. */
  midgame(done: () => void): void {
    if (!this.ready) { done(); return; }
    let fired = false;
    let to: ReturnType<typeof setTimeout> | undefined;
    const fin = (): void => {
      if (fired) return;
      fired = true;
      if (to) clearTimeout(to);
      this.resume();
      done();
    };
    this.mute();
    try {
      this.sdk?.ad.requestAd('midgame', { adStarted: () => { /* no-op */ }, adFinished: fin, adError: fin });
    } catch {
      fin();
    }
    // Safety net for an SDK that never calls back. Generous (interstitials can run
    // ~30 s) so it never fires DURING a legitimate ad — clearTimeout on a real
    // callback means it only ever triggers when the SDK has genuinely gone silent.
    to = setTimeout(fin, 45000);
  }

  /** rewarded — onReward fires ONLY on a genuine finish; failure goes through onFail. */
  rewarded(onReward: () => void, onFail?: () => void): void {
    if (!this.ready) { onFail?.(); return; }
    let done = false;
    let to: ReturnType<typeof setTimeout> | undefined;
    const ok = (): void => {
      if (done) return;
      done = true;
      if (to) clearTimeout(to);
      this.resume();
      onReward();
    };
    const bad = (): void => {
      if (done) return;
      done = true;
      if (to) clearTimeout(to);
      this.resume();
      onFail?.();
    };
    this.mute();
    try {
      this.sdk?.ad.requestAd('rewarded', { adStarted: () => { /* no-op */ }, adFinished: ok, adError: bad });
    } catch {
      bad();
    }
    // Was 12 s — SHORTER than many rewarded ads (15–30 s+), so it fired mid-ad and
    // denied the reward (revive / double-coins) after a full watch. 90 s is safely
    // past any real ad; clearTimeout on the genuine adFinished/adError keeps it a
    // pure "SDK went silent" fallback.
    to = setTimeout(bad, 90000);
  }
}

export const CG = new CGState();
