import type { ResultData } from '../types';
import { view } from '../core/canvas';
import { state, resetRun } from '../game/state';
import { Profile } from '../game/profile';
import { Daily } from '../game/daily';
import { Owned, skin } from '../game/skins';
import { clamp, lerp, rr, text } from '../core/utils';
import { btn } from '../core/ui';
import { dimVoid } from './play';
import { MILESTONES, SKINS } from '../config';

interface ResultBar {
  label: string;
  to: number;
  color: string;
  val: string;
}

function startPlay(): void {
  resetRun();
  state.scene = 'play';
}

export const Result = {
  d: null as unknown as ResultData,
  t: 0,
  bars: [] as ResultBar[],
  anim: [] as number[],

  show(d: ResultData): void {
    this.d = d;
    this.t = 0;
    const lp = Profile.levelProgress();
    this.bars = [
      {
        label: 'LEVEL ' + lp.l + ' — ' + Profile.title(),
        to: lp.cur / lp.need,
        color: '#2ff3e0',
        val: '+' + d.xpGain + ' XP',
      },
      {
        label: 'DAILY MISSION',
        to: Daily.pct(),
        color: Daily.d.done ? '#9be35a' : '#ffb020',
        val: Daily.d.done ? 'COMPLETE ✓' : Math.min(Daily.d.prog, Daily.g.t) + '/' + Daily.g.t,
      },
      {
        label: this.nextSkinLabel(),
        to: this.nextSkinPct(),
        color: '#ff4d8d',
        val: '◎ +' + d.coins,
      },
    ];
    this.anim = this.bars.map(() => 0);
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
    if (d.newBest) return ['NEW BEST!', '#9be35a'];
    if (Profile.best > 0 && d.h >= Profile.best * 0.9) return ['SO CLOSE!', '#ffb020'];
    if (d.mc >= 8) return ['NICE RUN', '#ff4d8d'];
    return ['RUN OVER', '#9fb0e0'];
  },

  nextAction(): string {
    const d = this.d;
    if (!Daily.d.done) {
      const g = Daily.g;
      const left = g.t - Math.min(Daily.d.prog, g.t);
      if (g.kind === 'cum') return `${left} to go for the daily mission`;
      return `Reach ${g.t}${g.id === 'combo' ? ' combo' : ' m'} for the daily mission`;
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
    text(hd[0], W / 2, H * 0.13, 34, hd[1], 800, 18, 'center', "'Unbounded'");
    text(d.h + ' m', W / 2, H * 0.21, 46, '#fff', 800, 16, 'center', "'Unbounded'");
    const sy = H * 0.28;
    this.stat('BEST', Profile.best + ' m', W * 0.27, sy);
    this.stat('PERFECT x', String(d.mc), W * 0.5, sy);
    this.stat('PERFECTS', String(d.perf), W * 0.73, sy);
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
      text('MISSION COMPLETE  ◎+' + Daily.g.reward,
        W / 2, by + (d.leveledUp ? 26 : 4), 14, '#9be35a', 700, 8);
    }
    text(this.nextAction(), W / 2, H * 0.70, 14, '#9fb0e0', 600, 0);
    const pw = W * 0.62;
    const ph = 58;
    const px = W / 2 - pw / 2;
    const py = H * 0.76;
    const sk = skin();
    rr(px, py, pw, ph, 14);
    ctx.fillStyle = sk.c;
    ctx.shadowColor = sk.c;
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.shadowBlur = 0;
    text('PLAY AGAIN', W / 2, py + ph / 2, 20, '#04030a', 800, 0, 'center', "'Unbounded'");
    btn('replay', px, py, pw, ph, () => startPlay());
    const half = (pw - 12) / 2;
    rr(px, py + ph + 12, half, 46, 12);
    ctx.fillStyle = 'rgba(20,16,48,.7)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    text('COLLECTION', px + half / 2, py + ph + 12 + 23, 13, sk.t, 700, 0);
    btn('rshop', px, py + ph + 12, half, 46, () => {
      state.scene = 'shop';
    });
    rr(px + half + 12, py + ph + 12, half, 46, 12);
    ctx.fillStyle = 'rgba(20,16,48,.7)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    text('MENU', px + half + 12 + half / 2, py + ph + 12 + 23, 13, '#9fb0e0', 700, 0);
    btn('rmenu', px + half + 12, py + ph + 12, half, 46, () => {
      state.scene = 'home';
    });
  },

  stat(label: string, val: string, x: number, y: number): void {
    text(val, x, y, 22, '#fff', 800, 0);
    text(label, x, y + 22, 11, '#7e88b5', 600, 0);
  },
};
