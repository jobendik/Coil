import { view } from '../core/canvas';
import { state } from '../game/state';
import { Season, seasonDaysLeft } from '../game/season';
import { Mastery } from '../game/mastery';
import { Career } from '../game/career';
import { SEASON_TIERS, seasonReward, eliteReward, CAREER_MILESTONES } from '../config';
import { clamp, glowFX, hexA, lerp, rr, text, TAU } from '../core/utils';
import { btn } from '../core/ui';
import { drawBG, dimVoid } from './play';

/* =========================================================================
   SEASON — the free 30-tier reward track (coil-retention-plan.md M6).

   A scrollable vertical list of all SEASON_TIERS tiers. Claimed tiers are
   checked, the current (in-progress) tier shows its fill bar, locked tiers show
   their reward. Rewards auto-grant on tier-up (Season.addXP), so this screen is a
   transparent ledger — never a "claim" wall. Honest season countdown; no
   permanent-lockout copy. Drag to scroll. Reached from home + the result screen.
   ========================================================================= */

const ROW_H = 52;
const scroll = { y: 0, target: 0, max: 0, dragging: false, lastPY: 0, moved: 0 };
let t = 0;
let from: 'home' | 'over' = 'home';

function trackTop(): number { return view.SAFE_TOP + 116; }
function trackBottom(): number { return view.H - 78 - view.SAFE_BOTTOM; }

export function openSeason(origin: 'home' | 'over' = 'home'): void {
  Season.sync();
  t = 0;
  from = origin;
  const viewH = trackBottom() - trackTop();
  scroll.max = Math.max(0, SEASON_TIERS * ROW_H - viewH);
  // Frame the current tier so the player lands on "where I am".
  scroll.target = clamp((Season.d.tier - 1) * ROW_H - viewH * 0.3, 0, scroll.max);
  scroll.y = scroll.target;
  scroll.dragging = false;
  scroll.moved = 0;
}

/* ---- input hooks (wired from main.ts; active only while scene === 'season') ---- */
export function seasonDown(y: number): void {
  scroll.dragging = true;
  scroll.lastPY = y;
  scroll.moved = 0;
}
export function seasonMove(y: number): void {
  if (!scroll.dragging) return;
  const dy = y - scroll.lastPY;
  scroll.lastPY = y;
  scroll.moved += Math.abs(dy);
  scroll.y = clamp(scroll.y - dy, 0, scroll.max);
  scroll.target = scroll.y;
}
export function seasonUp(): boolean {
  const wasTap = scroll.moved < 8;
  scroll.dragging = false;
  return wasTap;
}

function rewardLabel(tier: number): string {
  const r = seasonReward(tier);
  const parts: string[] = ['◎ ' + r.coins];
  if (r.chest) parts.push(r.chest + '× chest');
  return parts.join('  ·  ');
}

export function renderSeason(dt: number): void {
  const { ctx, W, H, SAFE_TOP, SAFE_BOTTOM } = view;
  t += dt;
  Season.sync();
  drawBG();
  dimVoid(0.8);
  if (!scroll.dragging) scroll.y = lerp(scroll.y, scroll.target, Math.min(1, dt * 8));

  const tier = Season.d.tier;
  const prog = Season.tierProgress();

  // ---- header ----
  text('SEASON ' + Season.d.id, W / 2, 38 + SAFE_TOP, 22, '#fff', 800, 12, 'center', "'Unbounded'");
  text('TIER ' + tier + ' / ' + SEASON_TIERS + '  ·  ' + seasonDaysLeft() + 'd left'
    + (Season.d.eliteUnlocked ? '  ·  ★ ELITE' : ''),
    W / 2, 64 + SAFE_TOP, 11, '#9fb0e0', 700, 0);
  // current-tier fill
  const hbW = W * 0.7;
  const hbX = W / 2 - hbW / 2;
  const hbY = 82 + SAFE_TOP;
  rr(hbX, hbY, hbW, 7, 4);
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  ctx.fill();
  rr(hbX, hbY, hbW * (tier >= SEASON_TIERS ? 1 : prog), 7, 4);
  ctx.fillStyle = '#a76bff';
  ctx.shadowColor = '#a76bff';
  ctx.shadowBlur = glowFX(8);
  ctx.fill();
  ctx.shadowBlur = 0;

  const top = trackTop();
  const bot = trackBottom();
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, top, W, bot - top);
  ctx.clip();

  const lx = W * 0.12;
  const lw = W * 0.76;
  for (let i = 1; i <= SEASON_TIERS; i++) {
    const ry = top + (i - 1) * ROW_H - scroll.y;
    if (ry < top - ROW_H || ry > bot + ROW_H) continue;
    const claimed = i <= tier;
    const current = i === tier + 1;
    const accent = claimed ? '#9be35a' : current ? '#a76bff' : '#5b6488';
    // tier number badge
    rr(lx, ry + 8, 34, 34, 9);
    ctx.fillStyle = hexA(accent, claimed || current ? 0.18 : 0.08);
    ctx.fill();
    rr(lx, ry + 8, 34, 34, 9);
    ctx.strokeStyle = hexA(accent, 0.5);
    ctx.lineWidth = 1.2;
    if (current) { ctx.shadowColor = accent; ctx.shadowBlur = glowFX(8); }
    ctx.stroke();
    ctx.shadowBlur = 0;
    text(String(i), lx + 17, ry + 25, 14, claimed || current ? '#fff' : '#9fb0e0', 800, 0, 'center', "'Unbounded'");
    // reward + state (+ the richer Elite reward when the track is unlocked)
    const elite = Season.d.eliteUnlocked ? '   ★ +' + eliteReward(i).coins : '';
    text(rewardLabel(i) + elite, lx + 46, ry + 19, 12, claimed ? '#dcffb0' : current ? '#e0d3ff' : '#aeb7d8', 700, 0, 'left');
    if (claimed) {
      text('CLAIMED ✓', lx + lw, ry + 19, 10.5, '#9be35a', 800, 0, 'right');
    } else if (current) {
      text(Math.round(prog * 100) + '%', lx + lw, ry + 19, 11, '#e0d3ff', 800, 0, 'right');
      rr(lx + 46, ry + 30, lw - 46, 4, 2);
      ctx.fillStyle = 'rgba(255,255,255,.08)';
      ctx.fill();
      rr(lx + 46, ry + 30, (lw - 46) * prog, 4, 2);
      ctx.fillStyle = accent;
      ctx.fill();
    } else {
      text('LOCKED', lx + lw, ry + 19, 10, '#7e88b5', 700, 0, 'right');
    }
    // divider
    ctx.strokeStyle = 'rgba(255,255,255,.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(lx, ry + ROW_H);
    ctx.lineTo(lx + lw, ry + ROW_H);
    ctx.stroke();
  }
  ctx.restore();

  // scroll affordance
  if (scroll.max > 1) {
    const p = scroll.y / scroll.max;
    const trackH = (bot - top) * 0.5;
    const sxr = W - 8;
    rr(sxr - 3, top + (bot - top - trackH) / 2, 4, trackH, 2);
    ctx.fillStyle = 'rgba(255,255,255,.07)';
    ctx.fill();
    rr(sxr - 3, top + (bot - top - trackH) / 2 + (trackH - 34) * p, 4, 34, 2);
    ctx.fillStyle = 'rgba(255,255,255,.32)';
    ctx.fill();
  }

  // ---- Mastery + Career summary (the depth systems' visible home, M8) ----
  text('ZONE MASTERY  Lv ' + Mastery.totalLevels()
    + '     ·     CAREER  ' + Career.count() + '/' + CAREER_MILESTONES.length,
    W / 2, bot + 22, 10.5, '#9fb0e0', 700, 0);
  const cn = Career.nearest();
  if (cn) {
    text('Next: ' + cn.value.toLocaleString() + ' / ' + cn.m.t.toLocaleString() + ' · ' + cn.m.label,
      W / 2, bot + 40, 9.5, '#cdb4ff', 700, 0);
  }

  // ---- BACK ----
  const bw = W * 0.5;
  const bx = W / 2 - bw / 2;
  const by = H - 60 - SAFE_BOTTOM;
  rr(bx, by, bw, 46, 13);
  ctx.fillStyle = 'rgba(20,16,48,.85)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.18)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text('BACK', W / 2, by + 23, 15, '#eaf6ff', 800, 0, 'center', "'Unbounded'");
  btn('seasonback', bx, by, bw, 46, () => { state.scene = from; });
  void TAU;
}
