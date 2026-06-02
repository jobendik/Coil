import type { ResultData } from '../types';
import { view } from '../core/canvas';
import { state } from '../game/state';
import { Profile } from '../game/profile';
import { Daily } from '../game/daily';
import { DailyRun } from '../game/dailyrun';
import { Owned, skin } from '../game/skins';
import { OwnedTrails, OwnedWorlds } from '../game/collection';
import { reqMet } from '../game/unlocks';
import { CG } from '../core/cg';
import { SFX, cheerSwell, cymbal } from '../core/audio';
import { Coins, Confetti, FlyCoins, bankXY } from '../core/fx';
import { buzz } from '../core/haptics';
import { clamp, lerp, rr, text } from '../core/utils';
import { btn } from '../core/ui';
import { Telemetry } from '../core/telemetry';
import { drawBG } from './play';
import { drawMenuBg } from './menubg';
import { openAscent } from './ascent';
import { MILESTONES, MILESTONE_SKINS, SKINS, TRAILS, WORLDS } from '../config';

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
  coinRoll: 0,        // animated count-up of the run's coin payoff (the ◎ bar)
  doubled: false,
  busyAd: false,

  show(d: ResultData): void {
    this.d = d;
    this.t = 0;
    this.coinRoll = 0;
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
        label: this.nextUnlockLabel(),
        to: this.nextUnlockPct(),
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
    // Earning a skill-gated cosmetic is a peak moment — give it its own fanfare.
    if (d.claimedUnlocks.length) { Confetti.rain(60); setTimeout(() => { SFX.unlock(); cymbal(0.45); buzz([20, 40, 20, 40]); }, 500); }
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

  /** The cheapest unowned, COIN-buyable cosmetic across all three categories.
   *  Skill-gated items (with a `req`) are earned, not saved-for, so they're
   *  excluded here — they surface via the claimed-unlock celebration instead. */
  nextUnlock(): { name: string; kind: string; price: number } | null {
    const pool: Array<{ name: string; kind: string; price: number; owned: boolean; req: boolean }> = [
      ...SKINS.map((s) => ({ name: s.name, kind: 'CHARACTER', price: s.price, owned: Owned.includes(s.id), req: !!s.req })),
      ...TRAILS.map((t) => ({ name: t.name, kind: 'TRAIL', price: t.price, owned: OwnedTrails.includes(t.id), req: !!t.req })),
      ...WORLDS.map((w) => ({ name: w.name, kind: 'WORLD', price: w.price, owned: OwnedWorlds.includes(w.id), req: !!w.req })),
    ];
    let best: { name: string; kind: string; price: number } | null = null;
    for (const it of pool) {
      if (it.owned || it.req || it.price <= 0) continue;
      if (!best || it.price < best.price) best = { name: it.name, kind: it.kind, price: it.price };
    }
    return best;
  },
  nextUnlockLabel(): string {
    const u = this.nextUnlock();
    return u ? 'NEXT ' + u.kind + ': ' + u.name : 'COLLECTION COMPLETE';
  },
  nextUnlockPct(): number {
    const u = this.nextUnlock();
    return u ? clamp(Profile.coins / u.price, 0, 1) : 1;
  },

  /** The next still-locked milestone evolution form — the height-earned reward
   *  that drives the bottom ASCENT button's "↑ Xm" tease and glow.
   *  Returns null only when every form is already evolved. */
  nextForm(): { name: string; c: string; t: string; h: number; frac: number; gap: number } | null {
    for (const s of MILESTONE_SKINS) {
      if (Owned.includes(s.id)) continue;
      const h = (s.req?.value as number) ?? 0;
      return {
        name: s.name, c: s.c, t: s.t, h,
        frac: clamp(Profile.best / h, 0, 1),
        gap: Math.max(0, h - Profile.best),
      };
    }
    return null;
  },

  /** Closest-to-earned, still-locked skill-gated cosmetic, as a one-line carrot.
   *  Returns null if none remain or none are close enough to be motivating. */
  nearestSkillUnlock(): string | null {
    const items: Array<{ name: string; req: import('../types').UnlockReq; owned: boolean }> = [
      ...SKINS.filter((s) => s.req).map((s) => ({ name: s.name, req: s.req!, owned: Owned.includes(s.id) })),
      ...TRAILS.filter((t) => t.req).map((t) => ({ name: t.name, req: t.req!, owned: OwnedTrails.includes(t.id) })),
      ...WORLDS.filter((w) => w.req).map((w) => ({ name: w.name, req: w.req!, owned: OwnedWorlds.includes(w.id) })),
    ];
    let bestFrac = -1;
    let bestTxt: string | null = null;
    for (const it of items) {
      if (it.owned || reqMet(it.req)) continue;
      const r = it.req;
      let frac = 0;
      let phrase = '';
      if (r.kind === 'height') {
        frac = clamp(Profile.best / (r.value as number), 0, 1);
        phrase = `Reach ${r.value} m to unlock ${it.name}`;
      } else if (r.kind === 'combo') {
        frac = clamp(Profile.bestCombo / (r.value as number), 0, 1);
        phrase = `Chain an x${r.value} combo to unlock ${it.name}`;
      } else if (r.kind === 'streak') {
        frac = clamp(Profile.streak / (r.value as number), 0, 1);
        phrase = `Keep a ${r.value}-day streak to unlock ${it.name}`;
      } else if (r.kind === 'constel') {
        frac = clamp(Profile.constellations / (r.value as number), 0, 1);
        phrase = `Complete ${r.value} constellations to unlock ${it.name}`;
      } else {
        frac = 0.3;
        phrase = `Earn an achievement to unlock ${it.name}`;
      }
      if (frac > bestFrac) { bestFrac = frac; bestTxt = phrase; }
    }
    // Only surface it when the player is at least a third of the way — otherwise
    // it's a distant goal, not a "one more run" hook.
    return bestFrac >= 0.34 ? bestTxt : null;
  },

  header(): [string, string] {
    const d = this.d;
    if (d.zen) return ['ZEN SESSION', '#9be35a'];
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
    // Closest skill-gated cosmetic still locked — a "one more run" carrot that
    // isn't about coins (e.g. "Reach 500 m to unlock Void").
    const sg = this.nearestSkillUnlock();
    if (sg) return sg;
    const u = this.nextUnlock();
    if (u) {
      const left = Math.max(0, u.price - Profile.coins);
      if (left > 0) return `Save ${left} ◎ to unlock ${u.name}`;
      return `You can afford ${u.name} — check the collection`;
    }
    return `Beat your best: ${Profile.best} m`;
  },

  /** Build the "✦ UNLOCKED · …" line so it fits the screen width, trimming the
   *  list to "+N more" when too many cosmetics were earned in one run. */
  fitUnlocks(names: string[]): string {
    const { ctx, W } = view;
    const prefix = '✦ UNLOCKED · ';
    const maxW = W * 0.9;
    ctx.save();
    ctx.font = "800 13px 'Sora', sans-serif";
    let shown = names.length;
    let str = prefix + names.join(' + ');
    while (shown > 1 && ctx.measureText(str).width > maxW) {
      shown--;
      str = prefix + names.slice(0, shown).join(' + ') + '  +' + (names.length - shown) + ' more';
    }
    ctx.restore();
    return str;
  },

  /** The single most exciting one-liner to surface under the stat row. */
  highlightLine(): [string, string] | null {
    const d = this.d;
    // A freshly-earned cosmetic outranks most things — it's the rarest payoff.
    // A big run can unlock many cosmetics at once, so fit the names to the screen
    // width and collapse the overflow into "+N more" instead of bleeding off-edge.
    if (d.claimedUnlocks.length) return [this.fitUnlocks(d.claimedUnlocks), '#9be35a'];
    if (d.potWon > 0) return ['★ +' + d.potWon + ' STAR VAULT', '#ffd24a'];
    if (d.dailyMedals.length) return [d.dailyMedals.map((m) => m.name).join(' + ') + ' MEDAL', '#ffd24a'];
    if (d.constellations > 0) return ['✦ ' + d.constellations + ' CONSTELLATION' + (d.constellations > 1 ? 'S' : ''), '#cdb4ff'];
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
    // Count-up the coin payoff in step with its bar revealing — a casino-style
    // roll with the short 'tick' (internally throttled). Re-targets automatically
    // if DOUBLE COINS raises d.coins mid-roll.
    const coinStart = 0.3 + 2 * 0.45;
    if (this.t > coinStart) {
      if (this.coinRoll < this.d.coins) {
        const step = Math.max(1, Math.ceil((this.d.coins - this.coinRoll) * Math.min(1, dt * 4.5)));
        this.coinRoll = Math.min(this.d.coins, this.coinRoll + step);
        SFX.tick();
      } else if (this.coinRoll > this.d.coins) {
        this.coinRoll = this.d.coins;
      }
    }
  },

  render(): void {
    const { ctx, W, H } = view;
    const d = this.d;
    const hd = this.header();
    // The game-over screen is a meta screen, so it shares the menu backdrop
    // (drawBG is the fallback base until the image decodes). The veil is a touch
    // stronger than the menu's for text contrast over the stat-heavy layout.
    drawBG();
    drawMenuBg(0.58);
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
    // Shared Ascent state: the next still-locked form (drives the bottom button's
    // tease), any form earned THIS run, and the closure used to expand into the
    // full climb tower (tapping the always-visible edge rail or the button).
    const nf = this.nextForm();
    const justForm = d.claimedUnlocks.find((nm) => MILESTONE_SKINS.some((s) => s.name === nm)) ?? null;
    const openTower = (): void => { openAscent(d.h, justForm); state.scene = 'ascent'; };
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
      // the coin payoff bar (i===2) shows the live count-up; it glows + scales
      // briefly while the number is still climbing, then settles.
      if (i === 2) {
        const rolling = this.coinRoll < d.coins;
        ctx.save();
        if (rolling) {
          ctx.shadowColor = b.color;
          ctx.shadowBlur = 10;
          const s = 1.12;
          ctx.translate(W * 0.88, by);
          ctx.scale(s, s);
          ctx.translate(-W * 0.88, -by);
        }
        ctx.fillText('◎ +' + Math.round(this.coinRoll), W * 0.88, by);
        ctx.restore();
      } else {
        ctx.fillText(b.val, W * 0.88, by);
      }
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
    // Zen has no death, so there's nothing to revive from — only offer DOUBLE COINS.
    // Guard state.G (every other scene does): if there's somehow no run, don't offer revive.
    const canRevive = !!state.G && !state.G.revivedThisRun && !d.zen;
    // After revive is used, the prominent rewarded slot offers DOUBLE COINS instead.
    const canDouble = !canRevive && !this.doubled && d.coins > 0;
    const hasTopCTA = canRevive || canDouble;
    const sk = skin();
    const pw = W * 0.62;
    const px = W / 2 - pw / 2;

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
      text(d.zen ? 'ZEN AGAIN' : d.daily ? 'DAILY AGAIN' : 'PLAY AGAIN', W / 2, py + ph / 2,
        hasTopCTA ? 17 : 20, hasTopCTA ? '#eaf6ff' : '#04030a', 800, 0, 'center', "'Unbounded'");
      btn('replay', px, py, pw, ph, () => onReplayRequested());
      py += ph + 12;
    }

    // Bottom row: ASCENT · SHOP · MENU. The Ascent button opens the climb tower
    // (how far you came + what waits above). It glows green when a new form was
    // earned this run, and pulses amber as a near-miss tease when the run ended
    // close to the next still-locked form — driving the "one more run" tap.
    const g3 = 9;
    const third = (pw - g3 * 2) / 3;
    const newEvo = !!justForm;
    const closeToForm = !newEvo && !!nf && nf.gap > 0 && nf.gap <= 120;
    rr(px, py, third, 46, 12);
    ctx.fillStyle = 'rgba(20,16,48,.7)';
    ctx.fill();
    if (newEvo) {
      ctx.strokeStyle = '#9be35a';
      ctx.shadowColor = '#9be35a';
      ctx.shadowBlur = 12 + Math.sin(this.t * 5) * 6;
    } else if (closeToForm) {
      ctx.strokeStyle = '#ffe39b';
      ctx.shadowColor = '#ffd24a';
      ctx.shadowBlur = 10 + Math.sin(this.t * 5) * 5;
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,.12)';
    }
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.shadowBlur = 0;
    text('ASCENT', px + third / 2, py + 17, 11,
      newEvo ? '#9be35a' : closeToForm ? '#ffe39b' : '#cdb4ff', 800, (newEvo || closeToForm) ? 4 : 0);
    text(closeToForm ? '↑ ' + nf!.gap + ' m' : nf ? 'next form ↑' : 'MAXED',
      px + third / 2, py + 32, 9.5, closeToForm ? '#ffe39b' : '#9fb0e0', 700, 0);
    btn('revo', px, py, third, 46, openTower);

    const cx2 = px + third + g3;
    rr(cx2, py, third, 46, 12);
    ctx.fillStyle = 'rgba(20,16,48,.7)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    text('SHOP', cx2 + third / 2, py + 23, 12, sk.t, 700, 0);
    btn('rshop', cx2, py, third, 46, () => {
      Telemetry.shopOpen();
      state.scene = 'shop';
    });

    const mx2 = px + (third + g3) * 2;
    rr(mx2, py, third, 46, 12);
    ctx.fillStyle = 'rgba(20,16,48,.7)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    text('MENU', mx2 + third / 2, py + 23, 12, '#9fb0e0', 700, 0);
    btn('rmenu', mx2, py, third, 46, () => {
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
