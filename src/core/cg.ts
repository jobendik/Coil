import { settings, setMuted } from '../settings';

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
interface CGSdk {
  init: () => Promise<void>;
  game: CGGameApi;
  ad: CGAdApi;
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

  bindPauseHook(fn: Hook): void {
    this.pauseHook = fn;
  }

  async init(): Promise<void> {
    try {
      if (cgw.CrazyGames && cgw.CrazyGames.SDK) {
        await cgw.CrazyGames.SDK.init();
        this.sdk = cgw.CrazyGames.SDK;
        this.ready = true;
      }
    } catch {
      this.ready = false;
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

  private mute(): void {
    this.wasMuted = settings.muted;
    setMuted(true);
    this.adActive = true;
    this.pauseHook?.(true);
  }

  private resume(): void {
    setMuted(this.wasMuted);
    this.adActive = false;
    this.pauseHook?.(false);
  }

  /** midgame interstitial — always continues even with adblock / no SDK. */
  midgame(done: () => void): void {
    if (!this.ready) { done(); return; }
    let fired = false;
    const fin = (): void => {
      if (fired) return;
      fired = true;
      this.resume();
      done();
    };
    this.mute();
    try {
      this.sdk?.ad.requestAd('midgame', { adStarted: () => { /* no-op */ }, adFinished: fin, adError: fin });
    } catch {
      fin();
    }
    setTimeout(fin, 9000);
  }

  /** rewarded — onReward fires ONLY on a genuine finish; failure goes through onFail. */
  rewarded(onReward: () => void, onFail?: () => void): void {
    if (!this.ready) { onFail?.(); return; }
    let done = false;
    const ok = (): void => {
      if (done) return;
      done = true;
      this.resume();
      onReward();
    };
    const bad = (): void => {
      if (done) return;
      done = true;
      this.resume();
      onFail?.();
    };
    this.mute();
    try {
      this.sdk?.ad.requestAd('rewarded', { adStarted: () => { /* no-op */ }, adFinished: ok, adError: bad });
    } catch {
      bad();
    }
    setTimeout(bad, 12000);
  }
}

export const CG = new CGState();
