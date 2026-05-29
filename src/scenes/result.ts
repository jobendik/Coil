import type { ResultData } from '../types';
import { view } from '../core/canvas';
import { state } from '../game/state';
import { Profile } from '../game/profile';
import { Daily } from '../game/daily';
import { DailyRun } from '../game/dailyrun';
import { Owned, skin } from '../game/skins';
import { CG } from '../core/cg';
import { SFX, cheerSwell, cymbal } from '../core/audio';
import { Coins, Confetti, FlyCoins, bankXY } from '../core/fx';
import { buzz } from '../core/haptics';
import { clamp, lerp, rr, text } from '../core/utils';
import { btn } from '../core/ui';
import { Telemetry } from '../core/telemetry';
import { dimVoid } from './play';
import { MILESTONES, SKINS } from '../config';

interface ResultBar {
  label: string;
  to: number;
  color: string;
  val: string;
}

// How long after death the result screen must be visible before the
// "tap anywhere to play again" zone activates. Just long enough for the player
// to register the new stats — short enough that the loop stays addictive.
const REPLAY_ZONE_DELAY = 0.55;

/**
 * `requestReplay` and `requestRevive` are injected by main.ts so the result
 * screen can drive midgame interstitials / rewarded ads without importing
 * the game loop module.
 */
let onReplayRequested: () => void = () => { /* injected by main.ts */ };
export function setReplayHandler(fn: () => void): void {
  onReplayRequested = fn;
}

let onReviveRequested: () => void = () => { /* injected by main.ts */ };
export function setReviveHandler(fn: () => void): void {
  onReviveRequested = fn;
}

export const Result = {
  d: null as unknown as ResultData,
  t: 0,
  bars: [] as ResultBar[],
  anim: [] as number[],
  doubled: false,
  busyAd: false,

  show(d: ResultData): void {
    this.d = d;
    this.t = 0;
    this.doubled = false;
    this.busyAd = false;
    const lp = Profile.levelProgress();
    this.bars = [
      {
        label: 'LEVEL ' + lp.l + ' — ' + Profile.title(),
        to: lp.cur / lp.need,
        color: '#2ff3e0',
        val: '+' + d.xpGain + ' XP',
      },
      {
        label: Daily.allDone() ? 'DAILIES COMPLETE' : 'DAILY MISSIONS',
        to: Daily.pct(),
        color: Daily.allDone() ? '#9be35a' : '#ffb020',
        val: this.dailyValLabel(),
      },
      {
        label: this.nextSkinLabel(),
        to: this.nextSkinPct(),
        color: '#ff4d8d',
        val: '◎ +' + d.coins,
      },
    ];
    this.anim = this.bars.map(() => 0);
    // celebratory bursts (drawn on top of the dim in render)
    if (d.potWon > 0) { Confetti.rain(70); cymbal(0.6); }
    if (d.newBest) Confetti.rain(40);
    if (d.dailyMedals.length) { Confetti.rain(50); setTimeout(() => { SFX.jackpot(); }, 400); }
    if (d.achievements.length) setTimeout(() => { SFX.unlock(); cymbal(0.3); buzz([30, 50, 30]); }, 600);
  },

  /** rewarded DOUBLE COINS — pure upside, opt-in, once per result. */
  doubleCoins(): void {
    if (this.doubled || this.busyAd || this.d.coins <= 0) return;
    this.busyAd = true;
    const add = this.d.coins;
    CG.rewarded(
      () => {
        this.busyAd = false;
        this.doubled = true;
        Profile.addCoins(add);
        this.d.coins = add * 2;
        SFX.chaching();
        cymbal(0.4);
        cheerSwell(0.5, 0.14);
        Confetti.rain(44);
        buzz([20, 40, 20]);
        const b = bankXY();
        FlyCoins.send(view.W / 2, view.H * 0.5, 12, b.x, b.y);
      },
      () => { this.busyAd = false; },
    );
  },

  dailyValLabel(): string {
    const ms = Daily.missions();
    const done = ms.filter((m) => m.done).length;
    return `${done}/${ms.length}`;
  },

  nextSkin() {
    return SKINS.find((s) => !Owned.includes(s.id));
  },
  nextSkinLabel(): string {
    const s = this.nextSkin();
    return s ? 'NEXT SKIN: ' + s.name : 'ALL SKINS UNLOCKED';
  },
  nextSkinPct(): number {
    const s = this.nextSkin();
    return s ? clamp(Profile.coins / s.price, 0, 1) : 1;
  },

  header(): [string, string] {
    const d = this.d;
    if (d.potWon > 0) return ['VAULT WON!', '#ffd24a'];
    if (d.daily) {
      if (d.dailyMedals.length) return [d.dailyMedals[d.dailyMedals.length - 1].name + ' MEDAL!', '#ffd24a'];
      if (d.newBest) return ['NEW DAILY BEST', '#9be35a'];
      return ['DAILY DONE', '#ffd24a'];
    }
    if (d.newBest) return ['NEW BEST!', '#9be35a'];
    if (Profile.best > 0 && d.h >= Profile.best * 0.9) return ['SO CLOSE!', '#ffb020'];
    if (d.mc >= 8) return ['NICE RUN', '#ff4d8d'];
    return ['RUN OVER', '#9fb0e0'];
  },

  nextAction(): string {
    const d = this.d;
    if (d.daily) {
      const nm = DailyRun.nextMedal();
      if (nm) return `Reach ${nm.th} m for the ${nm.name} medal`;
      return 'All daily medals earned — back tomorrow!';
    }
    // Pick the closest-to-done unfinished mission so the player sees the most
    // attainable carrot, not the hardest one.
    const ms = Daily.missions();
    let bestPct = -1;
    let bestM: import('../types').MissionState | null = null;
    for (const m of ms) {
      if (m.done) continue;
      const g = Daily.goalFor(m);
      const pct = clamp(m.prog / g.t, 0, 1);
      if (pct > bestPct) { bestPct = pct; bestM = m; }
    }
    if (bestM) {
      const g = Daily.goalFor(bestM);
      const left = g.t - Math.min(bestM.prog, g.t);
      if (g.kind === 'cum') return `${left} to go: ${g.text(g.t).toLowerCase()}`;
      return g.text(g.t);
    }
    const nm = MILESTONES.find((m) => m > d.h);
    if (nm && d.h >= nm * 0.7) return `Just ${nm - d.h} m to the ${nm} m milestone`;
    const ns = this.nextSkin();
    if (ns) {
      const left = Math.max(0, ns.price - Profile.coins);
      if (left > 0) return `Save ${left} ◎ to unlock ${ns.name}`;
      return `You can afford ${ns.name} — check the collection`;
    }
    return `Beat your best: ${Profile.best} m`;
  },

  /** The single most exciting one-liner to surface under the stat row. */
  highlightLine(): [string, string] | null {
    const d = this.d;
    if (d.potWon > 0) return ['★ +' + d.potWon + ' STAR VAULT', '#ffd24a'];
    if (d.dailyMedals.length) return [d.dailyMedals.map((m) => m.name).join(' + ') + ' MEDAL', '#ffd24a'];
    if (d.achievements.length) {
      const extra = d.achievements.length > 1 ? '  +' + (d.achievements.length - 1) : '';
      return ['★ ' + d.achievements[0].t + extra, '#ffd24a'];
    }
    return null;
  },

  upd(dt: number): void {
    this.t += dt;
    for (let i = 0; i < this.bars.length; i++) {
      if (this.t > 0.3 + i * 0.45) {
        this.anim[i] = lerp(this.anim[i], this.bars[i].to, Math.min(1, dt * 5));
      }
    }
  },

  render(): void {
    const { ctx, W, H } = view;
    const d = this.d;
    const hd = this.header();
    dimVoid(0.82);
    // celebratory FX render ON TOP of the dim so they stay visible
    Confetti.draw();
    Coins.draw();
    FlyCoins.draw();
    text(hd[0], W / 2, H * 0.13, 34, hd[1], 800, 18, 'center', "'Unbounded'");
    text(d.h + ' m', W / 2, H * 0.21, 46, '#fff', 800, 16, 'center', "'Unbounded'");
    const sy = H * 0.28;
    this.stat('BEST', Profile.best + ' m', W * 0.27, sy);
    this.stat('PERFECT x', String(d.mc), W * 0.5, sy);
    this.stat('PERFECTS', String(d.perf), W * 0.73, sy);
    // one compact highlight line (vault > medals > achievement)
    const hl = this.highlightLine();
    if (hl) text(hl[0], W / 2, H * 0.315, 13, hl[1], 800, 6);
    let by = H * 0.36;
    for (let i = 0; i < this.bars.length; i++) {
      const b = this.bars[i];
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = "600 12px 'Sora'";
      ctx.fillStyle = '#c5cef0';
      ctx.fillText(b.label, W * 0.12, by);
      ctx.textAlign = 'right';
      ctx.fillStyle = b.color;
      ctx.fillText(b.val, W * 0.88, by);
      rr(W * 0.12, by + 12, W * 0.76, 9, 4);
      ctx.fillStyle = 'rgba(255,255,255,.08)';
      ctx.fill();
      rr(W * 0.12, by + 12, W * 0.76 * clamp(this.anim[i], 0, 1), 9, 4);
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
      by += 46;
    }
    if (d.leveledUp) text('LEVEL UP!', W / 2, by + 4, 16, '#2ff3e0', 800, 10);
    if (d.dailyJustDone) {
      text('MISSION COMPLETE  ◎+' + d.dailyReward,
        W / 2, by + (d.leveledUp ? 26 : 4), 14, '#9be35a', 700, 8);
    }
    const G = state.G;
    const canRevive = !G.revivedThisRun;
    // After revive is used, the prominent rewarded slot offers DOUBLE COINS instead.
    const canDouble = !canRevive && !this.doubled && d.coins > 0;
    const hasTopCTA = canRevive || canDouble;
    const sk = skin();
    const pw = W * 0.62;
    const px = W / 2 - pw / 2;
    const half = (pw - 12) / 2;

    text(this.nextAction(), W / 2, hasTopCTA ? H * 0.60 : H * 0.70, 14, '#9fb0e0', 600, 0);

    let py = hasTopCTA ? H * 0.635 : H * 0.76;

    if (hasTopCTA) {
      const ch = 54;
      rr(px, py, pw, ch, 14);
      if (canRevive) {
        ctx.fillStyle = '#9be35a';
        ctx.shadowColor = '#9be35a';
        ctx.shadowBlur = 22;
        ctx.fill();
        ctx.shadowBlur = 0;
        text('CONTINUE', W / 2, py + ch / 2 - 7, 18, '#04130a', 800, 0, 'center', "'Unbounded'");
        text(CG.ready ? 'WATCH AD TO REVIVE' : 'ONE FREE CONTINUE',
          W / 2, py + ch / 2 + 12, 9.5, '#06200c', 700, 0);
        btn('revive', px, py, pw, ch, () => onReviveRequested());
      } else {
        ctx.fillStyle = '#ffd24a';
        ctx.shadowColor = '#ffd24a';
        ctx.shadowBlur = 22;
        ctx.fill();
        ctx.shadowBlur = 0;
        text(this.busyAd ? 'LOADING…' : 'DOUBLE COINS', W / 2, py + ch / 2 - 7, 18, '#3a2400', 800, 0, 'center', "'Unbounded'");
        if (!this.busyAd) {
          text(CG.ready ? `WATCH AD · ◎ ${d.coins} → ${d.coins * 2}` : `FREE · ◎ ×2`,
            W / 2, py + ch / 2 + 12, 9.5, '#4a3200', 700, 0);
          btn('double', px, py, pw, ch, () => this.doubleCoins());
        }
      }
      py += ch + 9;
    }

    {
      const ph = hasTopCTA ? 48 : 58;
      rr(px, py, pw, ph, 14);
      if (hasTopCTA) {
        ctx.fillStyle = 'rgba(20,16,48,.85)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.18)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        ctx.fillStyle = sk.c;
        ctx.shadowColor = sk.c;
        ctx.shadowBlur = 20;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      text(d.daily ? 'DAILY AGAIN' : 'PLAY AGAIN', W / 2, py + ph / 2,
        hasTopCTA ? 17 : 20, hasTopCTA ? '#eaf6ff' : '#04030a', 800, 0, 'center', "'Unbounded'");
      btn('replay', px, py, pw, ph, () => onReplayRequested());
      py += ph + 12;
    }

    rr(px, py, half, 46, 12);
    ctx.fillStyle = 'rgba(20,16,48,.7)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    text('COLLECTION', px + half / 2, py + 23, 13, sk.t, 700, 0);
    btn('rshop', px, py, half, 46, () => {
      Telemetry.shopOpen();
      state.scene = 'shop';
    });
    rr(px + half + 12, py, half, 46, 12);
    ctx.fillStyle = 'rgba(20,16,48,.7)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    text('MENU', px + half + 12 + half / 2, py + 23, 13, '#9fb0e0', 700, 0);
    btn('rmenu', px + half + 12, py, half, 46, () => {
      state.scene = 'home';
    });

    // "Tap anywhere to play again" — registered LAST so specific buttons win
    // their bounds. After a short delay (long enough to read the new stats)
    // any empty-area tap restarts the run instantly.
    if (this.t > REPLAY_ZONE_DELAY) {
      const hintAlpha = clamp((this.t - REPLAY_ZONE_DELAY) * 1.4, 0, 0.55);
      ctx.save();
      ctx.globalAlpha = hintAlpha;
      text('TAP TO PLAY AGAIN', W / 2, H * 0.95, 11, '#9fb0e0', 700, 0);
      ctx.restore();
      btn('rtap', 0, 0, W, H, () => onReplayRequested());
    }
  },

  stat(label: string, val: string, x: number, y: number): void {
    text(val, x, y, 22, '#fff', 800, 0);
    text(label, x, y + 22, 11, '#7e88b5', 600, 0);
  },
};
