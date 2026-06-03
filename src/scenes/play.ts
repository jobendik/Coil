import { view, topIconSize } from '../core/canvas';
import { state, sY, fieldLeft, fieldRight } from '../game/state';
import { skin } from '../game/skins';
import { trail, world } from '../game/collection';
import { accessory } from '../game/accessories';
import { Echo } from '../game/echo';
import { Profile } from '../game/profile';
import { Pop } from '../core/particles';
import { fxDrawOverlay, fxDrawWorld } from '../core/fx';
import { TAU, angDiff, clamp, fx, glowFX, hexA, lerp, mixHex, pcount, rand, text } from '../core/utils';
import { btn } from '../core/ui';
import { settings, setAimPreview, setCbGate, setEchoVisible, setMuted, setMusicMuted, setReducedMotion } from '../settings';
import { rr } from '../core/utils';
import { CATCH_PAD, DAILY_MEDALS, DECAY_TIME, G_FALL, LAND_SQUASH, LAUNCH, MILESTONES, ORBIT, WALL, ZONES } from '../config';

// Injected by main.ts so the Zen "DONE" button can bank the run without play.ts
// importing the game-loop module (avoids a scene↔loop import cycle).
let onZenExit: () => void = () => { /* injected by main.ts */ };
export function setZenExitHandler(fn: () => void): void {
  onZenExit = fn;
}

/* ---------- starfield (one per session) ---------- */
const STARS = (() => {
  const arr: Array<{ x: number; y: number; d: number; s: number; a: number }> = [];
  for (let i = 0; i < 82; i++) {
    arr.push({
      x: Math.random(),
      y: Math.random(),
      d: rand(0.08, 0.45),
      s: rand(0.8, 2.2),
      a: rand(0.1, 0.5),
    });
  }
  return arr;
})();

/* ---------- faint climb streaks (one per session) ---------- */
const STREAKS = (() => {
  const arr: Array<{ x: number; y: number; d: number; h: number; a: number }> = [];
  for (let i = 0; i < 18; i++) {
    arr.push({
      x: Math.random(),
      y: Math.random(),
      d: rand(0.12, 0.34),
      h: rand(42, 110),
      a: rand(0.025, 0.075),
    });
  }
  return arr;
})();

/* ---------- parallax nebula clouds (soft depth behind the stars) ---------- */
const NEBULA = (() => {
  const arr: Array<{ x: number; y: number; d: number; r: number; a: number; c: number }> = [];
  for (let i = 0; i < 6; i++) {
    arr.push({
      x: Math.random(),
      y: Math.random(),
      d: rand(0.05, 0.22),      // shallow parallax → reads as far away
      r: rand(120, 260),
      a: rand(0.032, 0.076),
      c: i % 2,                 // alternate between the world's node + void accents
    });
  }
  return arr;
})();

// Cache the two size-only background gradients (centre vignette + edge scrim).
// They depend only on W,H, so rebuilding them every frame just churns allocations
// and GPU uploads — costly on low-end. Rebuilt only when the canvas size changes.
let _bgKey = '';
let _bgShade: CanvasGradient | null = null;
let _bgScrim: CanvasGradient | null = null;
function bgGrads(W: number, H: number): { shade: CanvasGradient; scrim: CanvasGradient } {
  const key = W + 'x' + H;
  if (key !== _bgKey || !_bgShade || !_bgScrim) {
    const { ctx } = view;
    _bgKey = key;
    const shade = ctx.createRadialGradient(W / 2, H * 0.42, H * 0.08, W / 2, H * 0.5, H * 0.8);
    shade.addColorStop(0, 'rgba(0,0,0,0.05)');
    shade.addColorStop(0.58, 'rgba(0,0,0,0.12)');
    shade.addColorStop(1, 'rgba(0,0,0,0.48)');
    _bgShade = shade;
    const scrim = ctx.createLinearGradient(0, 0, 0, H);
    scrim.addColorStop(0, 'rgba(2,1,8,0)');
    scrim.addColorStop(0.5, 'rgba(2,1,8,0.2)');
    scrim.addColorStop(1, 'rgba(2,1,8,0)');
    _bgScrim = scrim;
  }
  return { shade: _bgShade, scrim: _bgScrim };
}

export function drawBG(): void {
  const { ctx, W, H } = view;
  const h = state.G?.height ?? 0;
  // Depth-blend progress within the current zone band (0→1), used to lerp the
  // equipped world's bg → alt palette. Zones carry no colours of their own.
  let tt = 0;
  for (let i = 0; i < ZONES.length; i++) {
    if (h >= ZONES[i].from) {
      const from = ZONES[i].from;
      const to = ZONES[Math.min(i + 1, ZONES.length - 1)].from;
      const span = (to - from) || 1;
      tt = clamp((h - from) / span, 0, 1);
    }
  }
  const mix = (a: string, b: string): string => {
    const pa = parseInt(a.slice(1), 16);
    const pb = parseInt(b.slice(1), 16);
    const r = Math.round(lerp((pa >> 16) & 255, (pb >> 16) & 255, tt));
    const g = Math.round(lerp((pa >> 8) & 255, (pb >> 8) & 255, tt));
    const bl = Math.round(lerp(pa & 255, pb & 255, tt));
    return `rgb(${r},${g},${bl})`;
  };
  // The equipped WORLD owns the palette (bg → alt blended by zone progress tt).
  // Default world == the classic Neon.
  const wld = world();
  const bg0 = wld.bg;
  const bg1 = wld.alt;
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, mix(bg0[0], bg1[0]));
  grad.addColorStop(0.5, mix(bg0[1], bg1[1]));
  grad.addColorStop(1, mix(bg0[2], bg1[2]));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  const cam = state.G?.cameraY ?? 0;
  const bgT = state.G?.t ?? performance.now() * 0.001;

  // Crisp contrast pass: keep the centre readable while letting the edges fall
  // into a deeper arcade-black vignette. (Size-cached — see bgGrads.)
  const { shade, scrim } = bgGrads(W, H);
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, W, H);

  // Parallax nebula clouds — soft additive glow that drifts as you climb, giving
  // the void real depth. Skipped on the lowest FX tier; uses the world accents.
  if (fx.level !== 'low') {
    const span = H * 1.6;
    const cn = wld.node || '#2ff3e0';
    const cv = wld.void || '#ff3b5c';
    const nebulaN = fx.level === 'medium' ? 3 : NEBULA.length;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < nebulaN; i++) {
      const nb = NEBULA[i];
      const yy = (((nb.y * span + cam * nb.d) % span) + span) % span - H * 0.3;
      const cx = nb.x * W;
      const g = ctx.createRadialGradient(cx, yy, 0, cx, yy, nb.r);
      g.addColorStop(0, hexA(nb.c ? cv : cn, nb.a));
      g.addColorStop(1, hexA(nb.c ? cv : cn, 0));
      ctx.fillStyle = g;
      ctx.fillRect(cx - nb.r, yy - nb.r, nb.r * 2, nb.r * 2);
    }
    ctx.restore();
  }

  ctx.fillStyle = '#aab8ff';
  for (const st of STARS) {
    const yy = (((st.y * H + cam * st.d) % H) + H) % H;
    ctx.globalAlpha = st.a;
    ctx.fillRect(st.x * W, yy, st.s, st.s);
  }
  ctx.globalAlpha = 1;

  if (fx.level !== 'low') {
    ctx.save();
    ctx.lineWidth = 1;
    ctx.globalCompositeOperation = 'lighter';
    const streakN = fx.level === 'medium' ? 8 : STREAKS.length;
    for (let i = 0; i < streakN; i++) {
      const st = STREAKS[i];
      const yy = (((st.y * H + cam * st.d + bgT * 20 * st.d) % H) + H) % H;
      const x = st.x * W;
      if (fx.level === 'high') {
        const g = ctx.createLinearGradient(x, yy - st.h, x, yy);
        g.addColorStop(0, 'rgba(47,243,224,0)');
        g.addColorStop(0.52, `rgba(198,216,255,${st.a})`);
        g.addColorStop(1, 'rgba(255,77,141,0)');
        ctx.strokeStyle = g;
      } else {
        ctx.globalAlpha = st.a * 1.6;
        ctx.strokeStyle = '#c6d8ff';
      }
      ctx.beginPath();
      ctx.moveTo(x, yy - st.h);
      ctx.lineTo(x, yy);
      ctx.stroke();
    }
    const cycle = (bgT * 0.08) % 1;
    if (fx.level === 'high' && cycle < 0.16) {
      const p = cycle / 0.16;
      const x = lerp(W * 0.18, W * 0.86, p);
      const y = lerp(H * 0.18, H * 0.42, p);
      ctx.globalAlpha = Math.sin(p * Math.PI) * 0.75;
      ctx.strokeStyle = '#ffffff';
      ctx.shadowColor = '#9ffff2';
      ctx.shadowBlur = glowFX(14);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 58, y - 22);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, W, H);
}

function drawNode(n: import('../types').Node): void {
  const { ctx, H } = view;
  const x = n.wx;
  const y = sY(n.wy);
  const sk = skin();
  if (y < -60 || y > H + 60) return;

  if (n.type === 'spike') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(state.G.t * 1.5);
    ctx.fillStyle = '#ff3b5c';
    if (fx.level !== 'low') {
      ctx.shadowColor = '#ff3b5c';
      ctx.shadowBlur = glowFX(14);
    }
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const rr2 = i % 2 ? n.r : n.r * 0.5;
      ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return;
  }

  // DECAY gate — a fracturing, warm-to-hot unstable gate. Reads as "temporary" even
  // before you catch it (cracks + flicker); once you're orbiting it, a depleting fuse
  // ring + intensifying jitter/cracks make the countdown legible (drains gold→red).
  if (n.type === 'decay') {
    const G = state.G;
    const orbiting = G.player.node === n && G.decayT > 0;
    const frac = orbiting ? clamp(G.decayT / DECAY_TIME, 0, 1) : 1;   // 1 full → 0 collapsing
    const danger = 1 - frac;                                         // 0 calm → 1 about to blow
    const pr = n.r * (1 + Math.sin(state.G.t * 2 + (n.pulse ?? 0)) * 0.06);
    const jit = orbiting ? danger * danger * 2.4 * fx.motion : 0;
    const core = mixHex('#ff9b50', '#ff3b5c', danger);
    ctx.save();
    ctx.translate(x + (jit ? rand(-jit, jit) : 0), y + (jit ? rand(-jit, jit) : 0));
    // flickering body
    ctx.fillStyle = core;
    if (fx.level !== 'low') {
      ctx.shadowColor = core;
      ctx.shadowBlur = glowFX(16 + danger * 14);
    }
    ctx.globalAlpha = 0.82 + Math.sin(state.G.t * 9 + (n.pulse ?? 0)) * 0.14;
    ctx.beginPath();
    ctx.arc(0, 0, pr, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    // radial fracture lines — more + brighter as the fuse burns down
    const cracks = 3 + Math.round(danger * 3);
    ctx.strokeStyle = 'rgba(8,5,16,.85)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < cracks; i++) {
      const a = (i / cracks) * TAU + (n.pulse ?? 0);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * pr * 0.5, Math.sin(a) * pr * 0.5);
      ctx.lineTo(Math.cos(a + 0.32) * pr, Math.sin(a + 0.32) * pr);
      ctx.stroke();
    }
    // depleting fuse ring (only while you're the one orbiting it)
    if (orbiting) {
      const rc = mixHex('#ffe39b', '#ff3b5c', danger);
      ctx.strokeStyle = rc;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      if (fx.level !== 'low') {
        ctx.shadowColor = rc;
        ctx.shadowBlur = glowFX(10);
      }
      ctx.beginPath();
      ctx.arc(0, 0, pr + 7, -Math.PI / 2, -Math.PI / 2 + TAU * frac);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  const G = state.G;
  const bonus = n.type === 'bonus';
  const target = G.target === n;
  const latched = G.player.node === n && G.player.latched;
  const frenzy = G.frenzyT > 0;
  const baseCol = bonus ? '#ffd24a' : n.type === 'small' ? sk.t : (world().node || sk.c);
  const col = target ? (frenzy ? '#ff4d8d' : sk.t) : baseCol;
  const core = bonus ? '#fff6c2' : target ? '#ffffff' : '#ece8ff';
  const pulse = 0.5 + 0.5 * Math.sin(G.t * (target ? 5.2 : 2.3) + (n.pulse ?? 0));
  const pr = n.r * (1 + Math.sin(G.t * 2 + (n.pulse ?? 0)) * (target ? 0.09 : 0.045));

  if (fx.level === 'low') {
    ctx.save();
    if (target) {
      ctx.globalAlpha = 0.34 + pulse * 0.26;
      ctx.strokeStyle = frenzy ? '#ffd24a' : sk.t;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, pr + 9 + pulse * 3, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x, y, pr, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = target ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.48)';
    ctx.lineWidth = target ? 1.8 : 1.1;
    ctx.beginPath();
    ctx.arc(x, y, pr + (latched ? 1.5 : 0), 0, TAU);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.82)';
    ctx.beginPath();
    ctx.ellipse(x - pr * 0.32, y - pr * 0.38, pr * 0.22, pr * 0.13, -0.45, 0, TAU);
    ctx.fill();
    if (bonus || frenzy) {
      ctx.strokeStyle = bonus ? '#fff3b0' : '#ffd24a';
      ctx.globalAlpha = bonus ? 0.82 : 0.55;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, pr * 0.58, G.t * 1.2, G.t * 1.2 + Math.PI * 1.35);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    if (n.type === 'move' && (n.amp ?? 0) > 0) {
      const vel = Math.cos(state.G.t * (n.spd ?? 1) + (n.ph ?? 0));
      const d = vel >= 0 ? 1 : -1;
      const ax = x + d * (pr + 7);
      ctx.save();
      ctx.globalAlpha = 0.35 + Math.abs(vel) * 0.4;
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (let k = 0; k < 2; k++) {
        const cxx = ax + d * k * 5;
        ctx.beginPath();
        ctx.moveTo(cxx - d * 2, y - 4);
        ctx.lineTo(cxx + d * 2, y);
        ctx.lineTo(cxx - d * 2, y + 4);
        ctx.stroke();
      }
      ctx.restore();
    }
    return;
  }

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const auraR = pr * (target ? 3.25 + pulse * 0.45 : bonus ? 2.75 : 2.05);
  const aura = ctx.createRadialGradient(x, y, pr * 0.2, x, y, auraR);
  aura.addColorStop(0, hexA(col, target ? 0.42 : bonus ? 0.32 : 0.2));
  aura.addColorStop(0.42, hexA(col, target ? 0.22 : 0.1));
  aura.addColorStop(1, hexA(col, 0));
  ctx.fillStyle = aura;
  ctx.fillRect(x - auraR, y - auraR, auraR * 2, auraR * 2);
  if (target) {
    ctx.globalAlpha = 0.36 + pulse * 0.32;
    ctx.strokeStyle = frenzy ? '#ffd24a' : sk.t;
    ctx.lineWidth = 2.2;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = glowFX(14);
    ctx.beginPath();
    ctx.arc(x, y, pr + 10 + pulse * 4, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
    for (let i = 0; i < 4; i++) {
      const a = G.t * 1.8 + (i / 4) * TAU + (n.pulse ?? 0);
      const sx = Math.cos(a) * (pr + 16 + pulse * 5);
      const sy = Math.sin(a) * (pr + 16 + pulse * 5);
      ctx.save();
      ctx.translate(x + sx, y + sy);
      ctx.rotate(a + G.t * 2);
      ctx.fillStyle = i % 2 ? '#ffffff' : sk.t;
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = glowFX(8);
      star(4, 2.9, 1.0);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();

  ctx.save();
  ctx.shadowColor = col;
  ctx.shadowBlur = glowFX(target ? 26 : bonus ? 24 : 16);
  const body = ctx.createRadialGradient(x - pr * 0.38, y - pr * 0.42, pr * 0.08, x, y, pr);
  body.addColorStop(0, '#ffffff');
  body.addColorStop(0.28, core);
  body.addColorStop(0.72, col);
  body.addColorStop(1, mixHex(col, '#05030e', 0.22));
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(x, y, pr, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = target ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.42)';
  ctx.lineWidth = target ? 1.8 : 1.1;
  ctx.beginPath();
  ctx.arc(x, y, pr + (latched ? 1.5 : 0), 0, TAU);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.beginPath();
  ctx.ellipse(x - pr * 0.32, y - pr * 0.38, pr * 0.24, pr * 0.15, -0.45, 0, TAU);
  ctx.fill();
  if (bonus || frenzy) {
    ctx.strokeStyle = bonus ? '#fff3b0' : '#ffd24a';
    ctx.globalAlpha = bonus ? 0.88 : 0.55;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, pr * 0.58, G.t * 1.2, G.t * 1.2 + Math.PI * 1.35);
    ctx.stroke();
  }
  ctx.restore();

  // MOVING node: small drift chevrons pointing the way it's currently sliding,
  // so the "this one moves" grammar reads instantly without being noisy.
  if (n.type === 'move' && (n.amp ?? 0) > 0) {
    const vel = Math.cos(state.G.t * (n.spd ?? 1) + (n.ph ?? 0)); // sign = drift dir
    const d = vel >= 0 ? 1 : -1;
    const ax = x + d * (pr + 7);
    ctx.save();
    ctx.globalAlpha = 0.35 + Math.abs(vel) * 0.4;
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (let k = 0; k < 2; k++) {
      const cxx = ax + d * k * 5;
      ctx.beginPath();
      ctx.moveTo(cxx - d * 2, y - 4);
      ctx.lineTo(cxx + d * 2, y);
      ctx.lineTo(cxx - d * 2, y + 4);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/* small N-point star glyph at the current origin */
function star(pts: number, rOuter: number, rInner: number): void {
  const { ctx } = view;
  ctx.beginPath();
  for (let i = 0; i < pts * 2; i++) {
    const a = (i / (pts * 2)) * TAU - Math.PI / 2;
    const r = i % 2 ? rInner : rOuter;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
}

/* CONSTELLATION CHAINS — dotted links + star markers over the 3 marked gates,
   brightening as the chain is completed in order. The signature in-run objective. */
function drawConstellations(): void {
  const { ctx, H } = view;
  const G = state.G;
  for (const n of G.nodes) {
    if (n.constel == null) continue;
    const y = sY(n.wy);
    if (y < -40 || y > H + 40) continue;
    const active = G.constelActive === n.constel;
    const captured = active && (n.cidx ?? 0) < G.constelProg;
    const col = captured ? '#ffffff' : active ? '#e6d8ff' : '#a76bff';
    const nx = n.next;
    if (nx && nx.constel === n.constel) {
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 5]);
      ctx.shadowColor = col;
      ctx.shadowBlur = glowFX(6);
      ctx.beginPath();
      ctx.moveTo(n.wx, y);
      ctx.lineTo(nx.wx, sY(nx.wy));
      ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    ctx.translate(n.wx, y - n.r - 11);
    ctx.globalAlpha = captured ? 1 : 0.9;
    ctx.fillStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur = glowFX(captured ? 12 : 7);
    const s = 4.6 + (active ? Math.sin(G.t * 6 + (n.cidx ?? 0)) * 0.8 : 0);
    star(5, s, s * 0.45);
    ctx.fill();
    ctx.restore();
  }
}

/* the glowing gate: safe band (dim) + perfect band (bright), drawn on the orbit */
function drawGate(): void {
  const { ctx } = view;
  const pl = state.G.player;
  const sw = state.G.sweet;
  if (!pl.latched || !sw || !sw.reachable) return;
  const n = pl.node;
  const cx = n.wx;
  const cy = sY(n.wy);
  const sk = skin();
  const cb = settings.cbGate;
  const inPerfect = angDiff(pl.ang, sw.center) <= sw.tol;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, ORBIT, 0, TAU);
  ctx.stroke();
  // safe release band — neutral grey in colour-blind mode so the perfect cue isn't hue-only
  ctx.strokeStyle = cb ? 'rgba(198,208,235,0.9)' : sk.c;
  ctx.globalAlpha = cb ? 0.26 : 0.34;
  ctx.lineWidth = 7;
  ctx.shadowColor = cb ? '#c6d0eb' : sk.c;
  ctx.shadowBlur = glowFX(8);
  ctx.beginPath();
  ctx.arc(cx, cy, ORBIT, sw.lo, sw.hi);
  ctx.stroke();
  // perfect band
  ctx.globalAlpha = inPerfect ? 0.34 : 0.18;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = inPerfect ? 15 : 11;
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = glowFX(inPerfect ? 22 : 10);
  ctx.beginPath();
  ctx.arc(cx, cy, ORBIT, sw.center - sw.tol, sw.center + sw.tol);
  ctx.stroke();
  ctx.globalAlpha = inPerfect ? 1 : 0.85;
  ctx.strokeStyle = (cb || inPerfect) ? '#ffffff' : sk.t;
  ctx.lineWidth = inPerfect ? 8 : 6;
  ctx.shadowColor = (cb || inPerfect) ? '#fff' : sk.t;
  ctx.shadowBlur = glowFX(inPerfect ? 16 : 8);
  ctx.beginPath();
  ctx.arc(cx, cy, ORBIT, sw.center - sw.tol, sw.center + sw.tol);
  ctx.stroke();
  // COLOUR-BLIND aid: delineate the perfect window by SHAPE — white ticks crossing
  // the ring at both edges + centre — so it reads without relying on hue at all.
  if (cb) {
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = glowFX(6);
    for (const a of [sw.center - sw.tol, sw.center, sw.center + sw.tol]) {
      const c = Math.cos(a);
      const s = Math.sin(a);
      ctx.beginPath();
      ctx.moveTo(cx + c * (ORBIT - 9), cy + s * (ORBIT - 9));
      ctx.lineTo(cx + c * (ORBIT + 9), cy + s * (ORBIT + 9));
      ctx.stroke();
    }
  }
  if (inPerfect) {
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = glowFX(12);
    for (const a of [sw.center - sw.tol * 0.55, sw.center, sw.center + sw.tol * 0.55]) {
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * ORBIT, cy + Math.sin(a) * ORBIT, 2.4, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

/* Always-on "next gate" guide. Highlights the node you should aim for next and
   is re-drawn ON TOP of the celebratory FX, so a confetti/coin burst can never
   hide where to go — the core "I can't see the path" complaint. Subtle during
   calm play (a thin pulsing ring); if the target is above the top of the screen
   it becomes a chevron at the top edge pointing the way. */
function drawTargetBeacon(): void {
  const { ctx, W, H } = view;
  const G = state.G;
  const tgt = G.target;
  if (!tgt || G.dead) return;
  const sk = skin();
  const x = tgt.wx;
  const y = sY(tgt.wy);
  const pulse = 0.5 + 0.5 * Math.sin(G.t * 4);
  if (y < 44) {
    // target is off the top of the screen — point to it from the top edge
    const cxv = clamp(x, 28, W - 28);
    ctx.save();
    ctx.globalAlpha = 0.55 + pulse * 0.35;
    ctx.fillStyle = sk.t;
    ctx.shadowColor = sk.t;
    ctx.shadowBlur = glowFX(10);
    ctx.beginPath();
    ctx.moveTo(cxv, 20);
    ctx.lineTo(cxv - 8, 34);
    ctx.lineTo(cxv + 8, 34);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return;
  }
  if (y > H + 40) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.18 + pulse * 0.18;
  ctx.strokeStyle = G.frenzyT > 0 ? '#ffd24a' : sk.t;
  ctx.lineWidth = 8;
  ctx.shadowColor = ctx.strokeStyle;
  ctx.shadowBlur = glowFX(18);
  ctx.beginPath();
  ctx.arc(x, y, tgt.r + 12 + pulse * 5, 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = 0.58 + pulse * 0.32;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, tgt.r + 7 + pulse * 3, 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 1.4;
  ctx.setLineDash([3, 9]);
  ctx.beginPath();
  ctx.arc(x, y, tgt.r + 18 + pulse * 2, G.t * 1.1, G.t * 1.1 + TAU * 0.72);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 0.82;
  ctx.lineWidth = 2;
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * TAU + G.t * 0.65;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * (tgt.r + 20), y + Math.sin(a) * (tgt.r + 20));
    ctx.lineTo(x + Math.cos(a) * (tgt.r + 26), y + Math.sin(a) * (tgt.r + 26));
    ctx.stroke();
  }
  ctx.restore();
}

/* Accessory render — the worn cosmetic slot, drawn around the player in screen
   space (animated on `time`, not rotated with the orb's facing). Deliberately
   small and modest-alpha so it never competes with the gate for attention.
   Exported so the home-screen orbit preview can reuse the exact same look. */
export function drawAccessoryAt(cx: number, cy: number, r: number, time: number): void {
  const acc = accessory();
  if (acc.kind === 'none') return;
  const { ctx } = view;
  const G = { t: time };
  const sk = skin();
  const c = acc.c || sk.c;
  const tcol = acc.t || sk.t;
  ctx.save();
  ctx.translate(cx, cy);
  if (acc.kind === 'orbit') {
    const n = acc.count || 3;
    const rad = r + 11;
    for (let i = 0; i < n; i++) {
      const a = G.t * 2.1 + (i / n) * TAU;
      ctx.save();
      ctx.translate(Math.cos(a) * rad, Math.sin(a) * rad * 0.66);
      ctx.fillStyle = c;
      ctx.strokeStyle = c;
      ctx.shadowColor = c;
      ctx.shadowBlur = glowFX(8);
      if (acc.shape === 'star') {
        ctx.rotate(G.t * 3 + i);
        ctx.beginPath();
        for (let k = 0; k < 4; k++) {
          const sa = (k / 4) * TAU;
          ctx.lineTo(Math.cos(sa) * 3.2, Math.sin(sa) * 3.2);
          ctx.lineTo(Math.cos(sa + 0.39) * 1.3, Math.sin(sa + 0.39) * 1.3);
        }
        ctx.closePath();
        ctx.fill();
      } else if (acc.shape === 'ring') {
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, TAU); ctx.stroke();
      } else if (acc.shape === 'moon') {
        ctx.beginPath(); ctx.arc(0, 0, 2.8, 0, TAU); ctx.fill();
        ctx.fillStyle = tcol;
        ctx.beginPath(); ctx.arc(-0.9, -0.9, 1.1, 0, TAU); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
  } else if (acc.kind === 'aura') {
    const pulse = 0.5 + 0.5 * Math.sin(G.t * 3);
    if (acc.glyph === 'halo') {
      ctx.translate(0, -r - 6);
      ctx.strokeStyle = tcol;
      ctx.shadowColor = c;
      ctx.shadowBlur = glowFX(10);
      ctx.lineWidth = 2.4;
      ctx.globalAlpha = 0.8 + pulse * 0.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.95, r * 0.34, 0, 0, TAU);
      ctx.stroke();
    } else {
      ctx.globalAlpha = 0.16 + pulse * 0.14;
      ctx.strokeStyle = c;
      ctx.shadowColor = c;
      ctx.shadowBlur = glowFX(14);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, r + 6 + pulse * 3, 0, TAU);
      ctx.stroke();
    }
  } else if (acc.kind === 'crown') {
    ctx.fillStyle = c;
    ctx.strokeStyle = c;
    ctx.shadowColor = c;
    ctx.shadowBlur = glowFX(8);
    if (acc.glyph === 'visor') {
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.78, Math.PI * 1.16, Math.PI * 1.84);
      ctx.stroke();
    } else {
      // crown above the head
      ctx.translate(0, -r - 1);
      ctx.beginPath();
      ctx.moveTo(-7, 2);
      ctx.lineTo(-7, -3);
      ctx.lineTo(-3, 0);
      ctx.lineTo(0, -6);
      ctx.lineTo(3, 0);
      ctx.lineTo(7, -3);
      ctx.lineTo(7, 2);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawPlayer(): void {
  const { ctx } = view;
  const G = state.G;
  const pl = G.player;
  const x = pl.wx;
  const y = sY(pl.wy);
  const sk = skin();
  const frenzy = G.frenzyT > 0;
  // Visual-only scale. The creature is the game's identity/mascot, so it's drawn
  // ~15% larger than its physics radius — note this keys off a render multiplier,
  // NOT pl.r (the collision radius the honest-gate proof depends on, which must not
  // change). Everything below (face, aura, eyes, accessory) derives from visualR, so
  // this single constant scales the whole creature coherently and keeps it legible.
  const visualR = pl.r * (frenzy ? 1.62 : 1.52);

  if (!pl.latched && pl.trail.length > 1) {
    // per-equipped-trail flight ribbon — gives each unlock a real visual identity
    const tr = trail();
    const style = tr.style;
    const tc = frenzy ? '#ffd24a' : tr.c || sk.c;
    const tt2 = frenzy ? '#2ff3e0' : tr.t || sk.t;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'lighter';
    if (style === 'line' || style === 'comet') {
      ctx.shadowColor = tc;
      ctx.shadowBlur = glowFX(frenzy || style === 'comet' ? 16 : 9);
      for (let i = 1; i < pl.trail.length; i++) {
        const a = i / pl.trail.length;
        ctx.strokeStyle = hexA(tc, a * (frenzy ? 0.82 : style === 'comet' ? 0.72 : 0.52));
        ctx.globalAlpha = 1;
        ctx.lineWidth = a * visualR * (frenzy ? 2.35 : style === 'comet' ? 1.85 : 1.45);
        ctx.beginPath();
        ctx.moveTo(pl.trail[i - 1].x, sY(pl.trail[i - 1].y));
        ctx.lineTo(pl.trail[i].x, sY(pl.trail[i].y));
        ctx.stroke();
      }
      ctx.shadowBlur = glowFX(5);
      for (let i = Math.max(1, pl.trail.length - 9); i < pl.trail.length; i++) {
        const a = i / pl.trail.length;
        ctx.strokeStyle = hexA(tt2, a * 0.62);
        ctx.lineWidth = Math.max(1, a * visualR * 0.45);
        ctx.beginPath();
        ctx.moveTo(pl.trail[i - 1].x, sY(pl.trail[i - 1].y));
        ctx.lineTo(pl.trail[i].x, sY(pl.trail[i].y));
        ctx.stroke();
      }
    } else if (style === 'dots') {
      ctx.fillStyle = tc; ctx.shadowColor = tc; ctx.shadowBlur = glowFX(6);
      for (let i = 0; i < pl.trail.length; i++) {
        const a = (i + 1) / pl.trail.length;
        ctx.globalAlpha = a * 0.7;
        ctx.beginPath();
        ctx.arc(pl.trail[i].x, sY(pl.trail[i].y), a * visualR * 0.5 + 1, 0, TAU);
        ctx.fill();
      }
    } else if (style === 'sparkle') {
      ctx.fillStyle = tt2; ctx.shadowColor = tt2; ctx.shadowBlur = glowFX(8);
      for (let i = 0; i < pl.trail.length; i++) {
        const a = (i + 1) / pl.trail.length;
        ctx.globalAlpha = a * 0.8;
        const sz = a * 5 + 1;
        ctx.save();
        ctx.translate(pl.trail[i].x, sY(pl.trail[i].y));
        ctx.rotate(G.t * 4 + i);
        ctx.beginPath();
        for (let k = 0; k < 4; k++) {
          const ang = (k / 4) * TAU;
          ctx.lineTo(Math.cos(ang) * sz, Math.sin(ang) * sz);
          ctx.lineTo(Math.cos(ang + Math.PI / 4) * sz * 0.35, Math.sin(ang + Math.PI / 4) * sz * 0.35);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    } else if (style === 'bubbles') {
      ctx.strokeStyle = tt2; ctx.shadowColor = tc; ctx.shadowBlur = glowFX(7); ctx.lineWidth = 1.2;
      for (let i = 0; i < pl.trail.length; i++) {
        const a = (i + 1) / pl.trail.length;
        ctx.globalAlpha = a * 0.55;
        ctx.beginPath();
        ctx.arc(pl.trail[i].x, sY(pl.trail[i].y), 2 + a * 4, 0, TAU);
        ctx.stroke();
      }
    } else if (style === 'rainbow') {
      for (let i = 1; i < pl.trail.length; i++) {
        const a = i / pl.trail.length;
        ctx.strokeStyle = `hsl(${(G.t * 120 + i * 18) % 360},90%,65%)`;
        ctx.globalAlpha = a * 0.6;
        ctx.lineWidth = a * visualR * 1.4;
        ctx.beginPath();
        ctx.moveTo(pl.trail[i - 1].x, sY(pl.trail[i - 1].y));
        ctx.lineTo(pl.trail[i].x, sY(pl.trail[i].y));
        ctx.stroke();
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // tether
  if (pl.latched) {
    const n = pl.node;
    ctx.save();
    ctx.strokeStyle = sk.c;
    ctx.globalAlpha = 0.34;
    ctx.lineWidth = 2;
    ctx.shadowColor = sk.c;
    ctx.shadowBlur = glowFX(7);
    ctx.beginPath();
    ctx.moveTo(n.wx, sY(n.wy));
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.restore();
  }

  // shield bubble
  if (G.shield) {
    ctx.save();
    ctx.strokeStyle = '#9ffff2';
    ctx.globalAlpha = 0.6 + Math.sin(G.t * 6) * 0.2;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#9ffff2';
    ctx.shadowBlur = glowFX(12);
    ctx.beginPath();
    ctx.arc(x, y, visualR + 8, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  // FRENZY-readiness shimmer — a gold pre-charge ring while OVERDRIVE is nearly
  // full, so the player can SEE the reward about to land (anticipation telegraph
  // that pairs with the riser cue + the charging meter).
  if (G.overdrive >= 0.7 && !frenzy && !G.dead && fx.level !== 'low') {
    const near = clamp((G.overdrive - 0.7) / 0.3, 0, 1);   // matches the meter's charge ramp
    const p = 0.5 + 0.5 * Math.sin(G.t * (7 + near * 6));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = '#ffd24a';
    ctx.shadowColor = '#ffd24a';
    ctx.shadowBlur = glowFX(10 + near * 8);
    ctx.globalAlpha = (0.25 + near * 0.4) * (0.5 + p * 0.5);
    ctx.lineWidth = 2 + near * 1.5;
    ctx.beginPath();
    ctx.arc(x, y, visualR + 6 + p * (3 + near * 4), 0, TAU);
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  const sw = G.sweet;
  const inPerfect = pl.latched && !!sw && sw.reachable && angDiff(pl.ang, sw.center) <= sw.tol;

  if (!(G.invuln > 0 && Math.sin(G.t * 40) < 0)) {
    if (pl.zap > 0) {
      ctx.save();
      ctx.translate(x, y);
      ctx.strokeStyle = '#fff';
      ctx.globalAlpha = clamp(pl.zap / 0.25, 0, 1);
      ctx.lineWidth = 2;
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 12;
      const z = lerp(visualR + 4, visualR + 18, 1 - pl.zap / 0.25);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + G.t;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (visualR + 2), Math.sin(a) * (visualR + 2));
        ctx.lineTo(Math.cos(a) * z, Math.sin(a) * z);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (glowFX(10) > 3) {
      ctx.save();
      ctx.translate(x, y);
      ctx.globalCompositeOperation = 'lighter';
      const orbitR = visualR + 6 + Math.sin(G.t * 4) * 1.4;
      const orbitCol = frenzy ? '#ffd24a' : sk.t;
      ctx.fillStyle = orbitCol;
      ctx.shadowColor = orbitCol;
      ctx.shadowBlur = glowFX(7);
      for (let k = 0; k < 4; k++) {
        const a = G.t * (pl.latched ? 1.35 : 0.7) + (k / 4) * TAU;
        const tw = 0.55 + 0.45 * Math.sin(G.t * 6 + k * 1.5);
        ctx.globalAlpha = tw * (frenzy ? 0.95 : 0.7);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * orbitR, Math.sin(a) * orbitR, 1.4 + tw * 0.9, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
    const sp = pl.latched ? 0 : Math.hypot(pl.vx, pl.vy);
    const stretch = clamp(sp / 1400, 0, 0.5);
    // ---- expressive reactions (pure canvas, zero weight) ----
    // FEAR: the rising void right beneath us. JOY: FRENZY or a fresh combo pop —
    // it overrides fear (we're winning). LAND: squash that eases out after a catch.
    const fear = clamp(1 - (pl.wy - G.voidY) / 200, 0, 1);
    const joy = clamp(Math.max(G.frenzyT > 0 ? 1 : 0, G.comboFlash), 0, 1);
    const scared = joy < 0.2 && fear > 0.45 ? fear : 0;          // cowering only when not winning
    const happy = joy > 0.2;
    const land = pl.land > 0 ? pl.land / LAND_SQUASH : 0;        // 1 just-caught → 0
    const joyPulse = joy * Math.sin(G.t * 13) * 0.06;            // excited throb
    const base = (inPerfect || happy) ? 1.08 : 1;
    const sclX = base * (1 + stretch + land * 0.38 + joyPulse - scared * 0.05);
    const sclY = base * (1 - stretch * 0.6 - land * 0.34 + joyPulse - scared * 0.16);
    // Idle glow lifted (24→30) so the resting creature carries a touch more cyan
    // presence and reads as the focal mascot, not just another white orb. Single
    // instance per frame, so the extra blur is perf-negligible (glowFX still caps it
    // on low/medium). Perfect/joy stay where they were — already strong.
    const glow = happy ? 38 : inPerfect ? 34 : 30;
    ctx.save();
    ctx.translate(x, y);
    if (fx.level !== 'low') {
      ctx.globalCompositeOperation = 'lighter';
      const auraR = visualR * (frenzy ? 4.1 : happy ? 3.3 : inPerfect ? 3.0 : 2.35);
      const aura = ctx.createRadialGradient(0, 0, visualR * 0.5, 0, 0, auraR);
      aura.addColorStop(0, hexA(frenzy ? '#ffd24a' : sk.c, frenzy ? 0.38 : 0.26));
      aura.addColorStop(0.42, hexA(frenzy ? sk.c : sk.t, frenzy ? 0.18 : 0.12));
      aura.addColorStop(1, hexA(sk.c, 0));
      ctx.fillStyle = aura;
      ctx.fillRect(-auraR, -auraR, auraR * 2, auraR * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.rotate(pl.face);
    if (fx.level !== 'low') {
      ctx.shadowColor = sk.c;
      ctx.shadowBlur = glowFX(glow);
      const body = ctx.createRadialGradient(-visualR * 0.42, -visualR * 0.45, visualR * 0.08, 0, 0, visualR * 1.12);
      body.addColorStop(0, '#ffffff');
      body.addColorStop(0.22, sk.t);
      body.addColorStop(0.72, sk.c);
      body.addColorStop(1, mixHex(sk.c, '#05030e', 0.28));
      ctx.fillStyle = body;
    } else {
      ctx.fillStyle = happy || inPerfect ? sk.t : sk.c;
    }
    ctx.beginPath();
    ctx.ellipse(0, 0, visualR * sclX, visualR * sclY, 0, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,.62)';
    ctx.lineWidth = Math.max(1.3, visualR * 0.12);   // proportional rim — stays crisp at the larger body
    ctx.beginPath();
    ctx.ellipse(0, 0, visualR * sclX + 0.5, visualR * sclY + 0.5, 0, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.58)';
    ctx.beginPath();
    ctx.ellipse(-visualR * 0.32, -visualR * 0.38, visualR * 0.25, visualR * 0.14, -0.55, 0, TAU);
    ctx.fill();
    ctx.rotate(-pl.face);
    const ex = Math.cos(pl.face);
    const ey = Math.sin(pl.face);
    // blink on an irregular two-cadence schedule; suppressed while scared (eyes stay wide)
    const bt = G.t * 0.9;
    const blink = scared ? 0 : (((bt % 3.1) < 0.09 || (bt % 4.7) < 0.08) ? 1 : 0);
    const eyeR = visualR * ((happy || inPerfect) ? 0.29 : 0.25 + scared * 0.08);     // wide eyes when scared
    const pupR = visualR * (happy ? 0.12 : 0.105 - scared * 0.03);                    // pinprick pupils when scared
    const lidH = blink ? 0.16 : 1;                                   // closed lid → thin slit
    const lookDown = scared * visualR * 0.16;                         // eyes dart toward the void below
    const sideX = ey;
    const sideY = -ex;
    // GAZE: while orbiting, the pupils track the next gate — charm plus a subtle
    // readability nudge toward where the launch is aimed. Default is a forward
    // glance; the scared look-down (below) still overrides it.
    let gx = ex * visualR * 0.12;
    let gy = ey * visualR * 0.12;
    if (pl.latched && G.target && scared < 0.2) {
      const tdx = G.target.wx - x;
      const tdy = sY(G.target.wy) - y;
      const tl = Math.hypot(tdx, tdy) || 1;
      gx = (tdx / tl) * visualR * 0.13;
      gy = (tdy / tl) * visualR * 0.13;
    }
    for (const o of [-1, 1]) {
      const px = sideX * o * visualR * 0.34;
      const py = sideY * o * visualR * 0.34;
      const ewx = px + ex * visualR * 0.18;        // eye-white centre
      const ewy = py + ey * visualR * 0.18;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(ewx, ewy, eyeR, eyeR * lidH, 0, 0, TAU);
      ctx.fill();
      if (!blink) {
        ctx.fillStyle = '#0a0720';
        ctx.beginPath();
        ctx.arc(ewx + gx, ewy + gy + lookDown, pupR, 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.8)';
        ctx.beginPath();
        ctx.arc(ewx + gx * 0.5 - sideX * visualR * 0.04, ewy + gy * 0.5 - sideY * visualR * 0.04, Math.max(0.9, pupR * 0.38), 0, TAU);
        ctx.fill();
      }
    }
    const mx = ex * visualR * 0.35;
    const my = ey * visualR * 0.35 + scared * visualR * 0.12;
    ctx.strokeStyle = 'rgba(3,7,20,.86)';
    ctx.fillStyle = 'rgba(3,7,20,.82)';
    ctx.lineWidth = Math.max(1.4, visualR * 0.14);
    ctx.lineCap = 'round';
    if (scared > 0.25) {
      ctx.beginPath();
      ctx.ellipse(mx, my, visualR * 0.13, visualR * 0.2, pl.face, 0, TAU);
      ctx.fill();
    } else {
      const smile = happy ? visualR * 0.24 : inPerfect ? visualR * 0.16 : visualR * 0.04;
      const mw = visualR * (happy || inPerfect ? 0.28 : 0.18);
      ctx.beginPath();
      ctx.moveTo(mx - sideX * mw, my - sideY * mw);
      ctx.quadraticCurveTo(mx + ex * smile, my + ey * smile, mx + sideX * mw, my + sideY * mw);
      ctx.stroke();
    }
    ctx.restore();
    drawAccessoryAt(x, y, visualR * base * 0.92, G.t);
  }
}

function drawTrajectory(): void {
  const { ctx } = view;
  const G = state.G;
  const pl = G.player;
  if (!settings.aimPreview || !pl.latched || G.dead) return;
  const sk = skin();
  const tx = -Math.sin(pl.ang) * pl.dir;
  const ty = Math.cos(pl.ang) * pl.dir;
  let x = pl.wx;
  let y = pl.wy;
  let vx = tx * LAUNCH;
  let vy = ty * LAUNCH;
  const h = 1 / 60;
  // Mirror the real flight's wall bounces against the active playfield edges so
  // the preview matches actual flight (the Daily Challenge runs in a fixed field).
  const fl = fieldLeft();
  const fr = fieldRight();
  // A short HINT of the arc, not a whip across the screen: fewer steps and a
  // quicker alpha falloff so it suggests the launch direction and fades out.
  const steps = 26;
  ctx.save();
  ctx.fillStyle = sk.c;
  for (let i = 0; i < steps; i++) {
    vy -= G_FALL * h;
    x += vx * h;
    y += vy * h;
    if (x < fl + pl.r) { x = fl + pl.r; vx = Math.abs(vx) * WALL; }
    if (x > fr - pl.r) { x = fr - pl.r; vx = -Math.abs(vx) * WALL; }
    let hitN = false;
    for (const n of G.nodes) {
      if (n.type === 'spike') continue;     // spikes kill; don't terminate the preview on them
      if (n === pl.node) continue;
      if (Math.hypot(x - n.wx, y - n.wy) < n.r + pl.r + CATCH_PAD) { hitN = true; break; }
    }
    if (i % 2 === 0) {
      // fade fast (squared falloff) and shrink the dots along the arc
      const f = clamp(1 - i / steps, 0, 1);
      ctx.globalAlpha = f * f * 0.55;
      ctx.beginPath();
      ctx.arc(x, sY(y), 1.4 + f * 1.4, 0, TAU);
      ctx.fill();
    }
    if ((hitN && i > 2) || y < G.voidY) break;
  }
  ctx.restore();
}

/* The rising "lava" void: a churning, wavy molten surface with a hot glowing
   crest and rising embers, instead of a flat line. Animated off G.t; ember count
   + churn scale down with the FX level so low-end stays smooth. */
function drawVoid(): void {
  const { ctx, W, H } = view;
  const G = state.G;
  const vy = sY(G.voidY);
  const vc = world().void || '#ff3b5c';
  const t = G.t;
  const danger = clamp(1 - (G.player.wy - G.voidY) / 240, 0, 1);
  const warmGlow = Math.max(clamp(1 - (vy - H) / 260, 0, 0.34), danger * 0.18);
  if (warmGlow > 0.01) {
    const bottom = ctx.createLinearGradient(0, H - 190, 0, H);
    bottom.addColorStop(0, hexA(vc, 0));
    bottom.addColorStop(0.58, hexA(vc, warmGlow * 0.34));
    bottom.addColorStop(1, hexA(vc, warmGlow));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = bottom;
    ctx.fillRect(0, H - 190, W, 190);
    ctx.restore();
  }
  if (vy >= H + 40) return;
  // wavy surface y at a given x
  const surf = (x: number): number =>
    vy + Math.sin(x * 0.021 + t * 1.6) * (6 + danger * 3)
      + Math.sin(x * 0.052 - t * 2.4) * (3.2 + danger * 2.2);

  // molten body — filled under the wave with a depth gradient
  const grad = ctx.createLinearGradient(0, vy - 54, 0, H);
  grad.addColorStop(0, hexA(vc, 0));
  grad.addColorStop(0.35, hexA(vc, 0.28));
  grad.addColorStop(1, hexA(vc, 0.92));
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.lineTo(0, surf(0));
  for (let x = 0; x <= W; x += 14) ctx.lineTo(x, surf(x));
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Slow molten bubbles and hairline cracks keep the void threatening without
  // raising a solid wall over the playfield.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const bubbleN = pcount(5 + Math.round(danger * 8));
  for (let i = 0; i < bubbleN; i++) {
    const ex = (i * 91.7 + Math.sin(t + i) * 18) % W;
    const ph = (t * (0.16 + (i % 4) * 0.035) + i * 0.23) % 1;
    const ey = surf(ex) + 20 + ph * Math.max(42, H - surf(ex) - 12);
    const br = 3 + Math.sin(t * 2 + i) * 1.2 + (i % 3);
    ctx.globalAlpha = 0.2 + danger * 0.16;
    ctx.strokeStyle = '#ffd9a0';
    ctx.shadowColor = vc;
    ctx.shadowBlur = glowFX(8);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(ex, ey, br, 0, TAU);
    ctx.stroke();
  }
  const crackN = pcount(4 + Math.round(danger * 5));
  for (let i = 0; i < crackN; i++) {
    const ex = (i * 123.3 + t * 18) % W;
    const ey = surf(ex) + 28 + ((i * 47) % Math.max(32, H - surf(ex) - 40));
    ctx.globalAlpha = 0.12 + danger * 0.16;
    ctx.strokeStyle = '#ffe39b';
    ctx.lineWidth = 1.2;
    ctx.shadowColor = '#ffd24a';
    ctx.shadowBlur = glowFX(7);
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex + Math.sin(i) * 18, ey + 8);
    ctx.lineTo(ex + Math.cos(i * 1.7) * 26, ey + 17);
    ctx.stroke();
  }
  ctx.restore();

  // hot crest — a bright molten line riding the wave
  ctx.beginPath();
  ctx.moveTo(0, surf(0));
  for (let x = 0; x <= W; x += 14) ctx.lineTo(x, surf(x));
  ctx.strokeStyle = vc;
  ctx.lineWidth = 3;
  ctx.shadowColor = vc;
  ctx.shadowBlur = glowFX(20);
  ctx.stroke();
  // crisp white-hot highlight: the readable threat boundary.
  ctx.globalAlpha = 0.68 + danger * 0.18;
  ctx.strokeStyle = '#fff8f0';
  ctx.lineWidth = 1.8;
  ctx.shadowColor = vc;
  ctx.shadowBlur = glowFX(14);
  ctx.stroke();
  ctx.globalAlpha = 0.72;
  ctx.strokeStyle = vc;
  ctx.lineWidth = 1.1;
  ctx.shadowBlur = glowFX(7);
  ctx.beginPath();
  ctx.moveTo(0, surf(0) + 4);
  for (let x = 0; x <= W; x += 14) ctx.lineTo(x, surf(x) + 4);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.restore();

  // rising embers — procedural (no pool); skipped on the lowest FX tier
  const emberN = pcount(16 + Math.round(danger * 16));
  if (emberN > 0 && glowFX(10) > 3) {
    ctx.save();
    ctx.fillStyle = '#ffd9a0';
    ctx.shadowColor = vc;
    ctx.shadowBlur = glowFX(8);
    for (let i = 0; i < emberN; i++) {
      const ex = ((i * 137.5) % W);
      const ph = (t * (0.4 + (i % 5) * 0.05) + i * 0.37) % 1;
      const ey = surf(ex) - ph * (70 + danger * 80);
      const a = (1 - ph) * 0.7;
      if (a <= 0.02) continue;
      ctx.globalAlpha = a;
      const r = (1 - ph) * 2.2 + 0.6;
      ctx.beginPath();
      ctx.arc(ex + Math.sin(t * 2 + i) * 4, ey, r, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

const TUT_LINES = [
  'TAP TO RELEASE',
  'FLY UP, ONE GATE AT A TIME',
  'HIT THE BRIGHT CENTER FOR PERFECT',
];

/* Animated tutorial finger: a pulsing dot that hovers near the player while
   attached, fading in only during the first tutorial stage. Reads as "tap
   here" without obscuring the gate. */
function drawTutorialHand(): void {
  const { ctx } = view;
  const G = state.G;
  const pl = G.player;
  if (G.tut !== 0 || !pl.latched) return;
  const x = pl.wx + 22;
  const y = sY(pl.wy) + 22;
  const t = G.t;
  const pulse = 0.5 + 0.5 * Math.sin(t * 6);
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#fff';
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#fff';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(0, 0, 12 + pulse * 6, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/* Brief screen-tinted vignette when a combo milestone fires. Color flashes
   in the tier's hue and fades over ~0.4s — gives every "ON FIRE!" the right
   visceral pop without becoming noise on repeat hits. */
function drawComboFlash(): void {
  const G = state.G;
  if (G.comboFlash <= 0 || fx.motion <= 0) return;
  const { ctx, W, H } = view;
  const a = G.comboFlash * fx.motion;
  ctx.save();
  const grd = ctx.createRadialGradient(W / 2, H / 2, H * 0.15, W / 2, H / 2, H * 0.85);
  grd.addColorStop(0, 'rgba(0,0,0,0)');
  grd.addColorStop(1, G.comboFlashColor + (a > 0.7 ? '88' : a > 0.4 ? '55' : '22'));
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function drawIconBtn(x: number, y: number, s: number, icon: 'sound' | 'mute' | 'music' | 'musicOff' | 'aim' | 'motion' | 'motionOff' | 'cb' | 'echo' | 'echoOff', col: string): void {
  const { ctx } = view;
  ctx.save();
  rr(x, y, s, s, 10);
  ctx.fillStyle = 'rgba(20,16,48,.7)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.08)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  const cx = x + s / 2;
  const cy = y + s / 2;
  if (icon === 'sound') {
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy - 3); ctx.lineTo(cx - 3, cy - 3); ctx.lineTo(cx + 1, cy - 7);
    ctx.lineTo(cx + 1, cy + 7); ctx.lineTo(cx - 3, cy + 3); ctx.lineTo(cx - 7, cy + 3);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 3, cy, 4, -0.6, 0.6);
    ctx.stroke();
  } else if (icon === 'mute') {
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy - 3); ctx.lineTo(cx - 3, cy - 3); ctx.lineTo(cx + 1, cy - 7);
    ctx.lineTo(cx + 1, cy + 7); ctx.lineTo(cx - 3, cy + 3); ctx.lineTo(cx - 7, cy + 3);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 3, cy - 4); ctx.lineTo(cx + 9, cy + 4);
    ctx.moveTo(cx + 9, cy - 4); ctx.lineTo(cx + 3, cy + 4);
    ctx.stroke();
  } else if (icon === 'music' || icon === 'musicOff') {
    // eighth-note glyph
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy + 7);
    ctx.lineTo(cx - 5, cy - 7);
    ctx.lineTo(cx + 7, cy - 10);
    ctx.lineTo(cx + 7, cy + 3);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(cx - 8, cy + 7, 3.2, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 4, cy + 3, 3.2, 0, TAU); ctx.fill();
    if (icon === 'musicOff') {
      // slash to read as "off"
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy + 10);
      ctx.lineTo(cx + 10, cy - 10);
      ctx.stroke();
    }
  } else if (icon === 'aim') {
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy - 9); ctx.lineTo(cx, cy - 3);
    ctx.moveTo(cx, cy + 3); ctx.lineTo(cx, cy + 9);
    ctx.moveTo(cx - 9, cy); ctx.lineTo(cx - 3, cy);
    ctx.moveTo(cx + 3, cy); ctx.lineTo(cx + 9, cy);
    ctx.stroke();
  } else if (icon === 'motion' || icon === 'motionOff') {
    // concentric "ripple" rings = motion; slash = reduced
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 7, -0.9, 0.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 7, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke();
    if (icon === 'motionOff') {
      ctx.beginPath();
      ctx.moveTo(cx - 9, cy + 9);
      ctx.lineTo(cx + 9, cy - 9);
      ctx.stroke();
    }
  } else if (icon === 'cb') {
    // gate ring with edge + centre ticks = the colour-blind gate aid, in miniature
    ctx.beginPath(); ctx.arc(cx, cy, 6.5, -1.05, 1.05); ctx.stroke();
    for (const a of [-0.9, 0, 0.9]) {
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 4, cy + Math.sin(a) * 4);
      ctx.lineTo(cx + Math.cos(a) * 9, cy + Math.sin(a) * 9);
      ctx.stroke();
    }
  } else if (icon === 'echo' || icon === 'echoOff') {
    // two trailing orbs = "race your ghost"; slash = off
    ctx.beginPath(); ctx.arc(cx + 3, cy, 4, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.45;
    ctx.beginPath(); ctx.arc(cx - 5, cy + 1, 3, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    if (icon === 'echoOff') {
      ctx.beginPath();
      ctx.moveTo(cx - 9, cy + 9);
      ctx.lineTo(cx + 9, cy - 9);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function drawTopToggles(): void {
  const { SAFE_TOP } = view;
  // Shared corner-icon size (42px on ≥375-wide screens; shrinks on narrower phones
  // so the left toggle row and the home reward cluster can't collide on a 320 px
  // device). The inter-icon gap tracks the size.
  const s = topIconSize();
  const gap = Math.round(s * 0.19);
  const step = s + gap;
  const pad = 12;
  const top = pad + SAFE_TOP;
  // SFX mute
  btn('mute', pad, top, s, s, () => setMuted(!settings.muted));
  drawIconBtn(pad, top, s, settings.muted ? 'mute' : 'sound', settings.muted ? '#5b6488' : '#2ff3e0');
  // music mute (independent of SFX)
  const xMusic = pad + step;
  btn('music', xMusic, top, s, s, () => setMusicMuted(!settings.musicMuted));
  drawIconBtn(xMusic, top, s, settings.musicMuted ? 'musicOff' : 'music', settings.musicMuted ? '#5b6488' : '#ffd24a');
  // QA toggle: trajectory preview on/off (the glowing gate always stays on)
  const x2 = pad + 2 * step;
  btn('aim', x2, top, s, s, () => setAimPreview(!settings.aimPreview));
  drawIconBtn(x2, top, s, 'aim', settings.aimPreview ? '#2ff3e0' : '#5b6488');
  // Reduced Motion toggle — comfort + accessibility (softens shake/flash/vignette)
  const x3 = pad + 3 * step;
  btn('motion', x3, top, s, s, () => setReducedMotion(!settings.reducedMotion));
  drawIconBtn(x3, top, s, settings.reducedMotion ? 'motionOff' : 'motion',
    settings.reducedMotion ? '#5b6488' : '#a76bff');
  // Home-only accessibility/preference toggles (colour-blind gate + Echo ghost).
  // They live on a SECOND row at the left so they never collide with the centred
  // height HUD in-play, nor with the top-right reward cluster on home.
  if (state.scene === 'home') {
    const row2 = top + step;
    btn('cbgate', pad, row2, s, s, () => setCbGate(!settings.cbGate));
    drawIconBtn(pad, row2, s, 'cb', settings.cbGate ? '#9be35a' : '#5b6488');
    // Echo ghost toggle — the doc requires an opt-out for players who find the
    // racing ghost distracting (M5).
    const ex = pad + step;
    btn('echo', ex, row2, s, s, () => setEchoVisible(!settings.echoVisible));
    drawIconBtn(ex, row2, s, settings.echoVisible ? 'echo' : 'echoOff',
      settings.echoVisible ? '#2ff3e0' : '#5b6488');
  }
}

/* ECHO GHOST (M5) — a faint replay of the player's best run, racing in real time.
   Drawn behind the nodes so it never obscures the gate. Normal mode only, and
   only while the Echo toggle is on. */
function drawEcho(): void {
  const G = state.G;
  if (G.daily || G.zen || !settings.echoVisible || !Echo.has()) return;
  const p = Echo.at(G.t);
  if (!p) return;
  const { ctx, H } = view;
  const y = sY(p.y);
  if (y < -24 || y > H + 24) return;
  const sk = skin();
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = sk.c;
  ctx.shadowColor = sk.c;
  ctx.shadowBlur = glowFX(10);
  ctx.beginPath();
  ctx.arc(p.x, y, 7, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = '#dfe7ff';
  ctx.font = "800 8px 'Sora', sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('BEST', p.x, y - 13);
  ctx.restore();
}

/* In-world "ghost goal" markers — a line you climb toward. Normal mode shows
   your all-time BEST + the next milestone; Daily mode shows the medal lines.
   Turns a bare number into a journey ("one more run"). */
function drawGoalMarkers(): void {
  const { ctx, W, H } = view;
  const G = state.G;
  const line = (h: number, label: string, c: string): void => {
    if (h <= 0) return;
    const y = sY(h * 12 - 90);
    if (y < 46 || y > H - 30) return;
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = c;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 9]);
    ctx.shadowColor = c;
    ctx.shadowBlur = glowFX(6);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.92;
    ctx.font = "800 10px 'Unbounded', sans-serif";
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = c;
    ctx.shadowBlur = glowFX(8);
    ctx.fillText(label, W - 12, y - 9);
    ctx.restore();
    ctx.globalAlpha = 1;
  };
  if (G.daily) {
    for (const m of DAILY_MEDALS) if (G.height < m.th) line(m.th, m.name + ' · ' + m.th + 'm', m.c);
  } else {
    if (Profile.best > 0 && !G.beatBest) line(Profile.best, 'BEST · ' + Profile.best + 'm', '#ffd24a');
    const nm = MILESTONES.find((m) => m > G.height);
    if (nm) line(nm, nm + ' m', '#9fb0e0');
  }
}

/* FRENZY backdrop — a disco colour wash + rotating light beams to signal the
   earned flow state. Gated by FX level. */
function drawFrenzyBloom(): void {
  const G = state.G;
  if (G.frenzyT <= 0) return;
  const { ctx, W, H } = view;
  const cols = ['#ffd24a', '#ff4d8d', '#2ff3e0'];
  const elapsed = G.frenzyMax - G.frenzyT;
  const intro = clamp(1 - elapsed / 0.75, 0, 1) * fx.motion;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.13 + Math.sin(G.t * 12) * 0.045;
  ctx.fillStyle = cols[(G.t * 4 | 0) % cols.length];
  ctx.fillRect(0, 0, W, H);
  const cx = W / 2;
  const cy = H * 0.42;
  const burst = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * (0.42 + intro * 0.32));
  burst.addColorStop(0, hexA('#ffffff', 0.12 + intro * 0.34));
  burst.addColorStop(0.28, hexA('#ffd24a', 0.1 + intro * 0.2));
  burst.addColorStop(0.62, hexA('#ff4d8d', 0.06 + intro * 0.16));
  burst.addColorStop(1, hexA('#2ff3e0', 0));
  ctx.fillStyle = burst;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  if (glowFX(10) <= 3) { ctx.globalAlpha = 1; return; }   // skip beams on low FX
  const R = Math.hypot(W, H);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(G.t * 0.6);
  ctx.globalCompositeOperation = 'lighter';
  const beams = fx.level === 'medium' ? 5 : 9;
  for (let i = 0; i < beams; i++) {
    const c = cols[i % cols.length];
    ctx.save();
    ctx.rotate((i / beams) * TAU);
    const grad = ctx.createLinearGradient(0, 0, R, 0);
    grad.addColorStop(0, hexA(c, 0.16));
    grad.addColorStop(1, hexA(c, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(0.13) * R, Math.sin(0.13) * R);
    ctx.lineTo(Math.cos(-0.13) * R, Math.sin(-0.13) * R);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  const rainN = fx.level === 'medium' ? 8 : 18;
  for (let i = 0; i < rainN; i++) {
    const p = (G.t * (0.42 + (i % 4) * 0.08) + i * 0.071) % 1;
    const x = ((i * 73.3) % W) + Math.sin(i) * 18;
    const y = lerp(-80, H + 80, p);
    const c = cols[i % cols.length];
    ctx.globalAlpha = (1 - p) * 0.28;
    ctx.strokeStyle = c;
    if (fx.level === 'high') {
      ctx.shadowColor = c;
      ctx.shadowBlur = glowFX(9);
    }
    ctx.lineWidth = 1.2 + (i % 3) * 0.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 18, y + 82);
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

/* OVERDRIVE meter (fills with perfects) or, once full and active, the FRENZY
   countdown banner. Sits just under the height readout. */
function drawMeters(): void {
  const { ctx, W, SAFE_TOP } = view;
  const G = state.G;
  if (G.frenzyT <= 0) {
    const mw = 120;
    const mx = W / 2 - mw / 2;
    const my = 96 + SAFE_TOP;
    rr(mx, my, mw, 5, 3);
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    ctx.fill();
    const od = G.overdrive;
    // Anticipation ramp: the meter only starts "charging" visually past 70%, then
    // pulses faster/brighter the closer it is to triggering FRENZY.
    const near = clamp((od - 0.7) / 0.3, 0, 1);
    const pulse = near > 0 ? 0.5 + 0.5 * Math.sin(G.t * (6 + near * 18)) : 0;
    if (od > 0) {
      rr(mx, my, mw * od, 5, 3);
      const grd = ctx.createLinearGradient(mx, 0, mx + mw, 0);
      grd.addColorStop(0, '#ff4d8d');
      grd.addColorStop(1, '#ffd24a');
      ctx.fillStyle = grd;
      ctx.shadowColor = '#ffd24a';
      ctx.shadowBlur = glowFX(10 + near * 16 * (0.6 + pulse * 0.4));
      ctx.fill();
      ctx.shadowBlur = 0;
      if (near > 0) {
        // bright charge spark riding the leading edge — intensifies toward full
        ctx.save();
        ctx.globalAlpha = 0.4 + near * 0.6 * (0.5 + pulse * 0.5);
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#ffd24a';
        ctx.shadowBlur = glowFX(8 + near * 10);
        ctx.beginPath();
        ctx.arc(mx + mw * od, my + 2.5, 2 + near * 2, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = "700 9px 'Unbounded', sans-serif";
    ctx.fillStyle = od >= 0.82 ? '#ffd24a' : od >= 0.5 ? mixHex('#7e88b5', '#ffd24a', near) : '#7e88b5';
    if (od >= 0.82) { ctx.shadowColor = '#ffd24a'; ctx.shadowBlur = glowFX(6 + pulse * 6); }
    ctx.fillText(od >= 0.82 ? '⚡ OVERDRIVE ⚡' : 'OVERDRIVE', W / 2, my + 12);
    ctx.restore();
  } else {
    const fp = clamp(G.frenzyT / G.frenzyMax, 0, 1);
    const fw = 170;
    const fx2 = W / 2 - fw / 2;
    const fy = 90 + SAFE_TOP;
    const fb = 1 + Math.sin(G.t * 16) * 0.04;
    ctx.save();
    ctx.translate(W / 2, fy + 10);
    ctx.scale(fb, fb);
    ctx.translate(-W / 2, -(fy + 10));
    rr(fx2, fy, fw, 22, 11);
    ctx.fillStyle = 'rgba(20,10,2,.85)';
    ctx.fill();
    ctx.strokeStyle = '#ffd24a';
    ctx.shadowColor = '#ffd24a';
    ctx.shadowBlur = glowFX(14);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffd24a';
    ctx.font = "800 12px 'Unbounded', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★ FRENZY 2× ★', W / 2, fy + 11);
    ctx.restore();
    rr(fx2 + 2, fy + 24, fw - 4, 3, 2);
    ctx.fillStyle = 'rgba(255,210,74,.2)';
    ctx.fill();
    rr(fx2 + 2, fy + 24, (fw - 4) * fp, 3, 2);
    ctx.fillStyle = '#ffd24a';
    ctx.fill();
  }
}

export function renderPlay(): void {
  const { ctx, W, H, SAFE_TOP } = view;
  const G = state.G;
  drawBG();
  drawVoid();
  drawGoalMarkers();
  drawEcho();
  drawFrenzyBloom();
  for (const n of G.nodes) drawNode(n);
  drawConstellations();
  for (const s of G.sparks) {
    if (s.got) continue;
    const y = sY(s.wy);
    if (y < -20 || y > H + 20) continue;
    const col = s.kind === 'shield' ? '#9ffff2'
      : s.kind === 'focus' ? '#cdb4ff'
      : s.kind === 'magnet' ? '#a9ecff'
      : '#ffe39b';
    ctx.save();
    ctx.fillStyle = col;
    ctx.strokeStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur = glowFX(12);
    ctx.translate(s.wx, y);
    if (s.kind === 'shield') {
      ctx.rotate(G.t * 3);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 3, 0, TAU); ctx.fill();
    } else if (s.kind === 'focus') {
      // crosshair-in-ring — "precision / slow time"
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.stroke();
      const p = 0.5 + 0.5 * Math.sin(G.t * 5);
      ctx.beginPath(); ctx.arc(0, 0, 2.2 + p * 1.5, 0, TAU); ctx.fill();
    } else if (s.kind === 'magnet') {
      // horseshoe magnet glyph
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, 0, 6, Math.PI * 0.15, Math.PI * 0.85, true); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-5.4, 2.6); ctx.lineTo(-5.4, 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(5.4, 2.6); ctx.lineTo(5.4, 6); ctx.stroke();
    } else {
      ctx.rotate(G.t * 3);
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU;
        ctx.lineTo(Math.cos(a) * 6, Math.sin(a) * 6);
        ctx.lineTo(Math.cos(a + 0.4) * 2.5, Math.sin(a + 0.4) * 2.5);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  drawTrajectory();
  // MAGNET aura — a faint pulsing ring + reach indicator while active.
  if (G.magnetT > 0) {
    const px = G.player.wx;
    const py = sY(G.player.wy);
    const pulse = 0.5 + 0.5 * Math.sin(G.t * 5);
    ctx.save();
    ctx.globalAlpha = (0.12 + pulse * 0.12) * (G.magnetT < 1 ? G.magnetT : 1);
    ctx.strokeStyle = '#a9ecff';
    ctx.shadowColor = '#a9ecff';
    ctx.shadowBlur = glowFX(10);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, 34 + pulse * 8, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
  drawTutorialHand();
  Pop.draw();
  fxDrawWorld();
  // The interactive layer (beacon + gate + player) is drawn ONCE here, ABOVE the
  // celebratory FX, so a confetti/coin/shock burst can never bury where to go or
  // where you are. (It used to also be drawn before the FX, but that pass was fully
  // overwritten by this one — wasting a draw and double-compositing the player's
  // semi-transparent trail/tether/shield to a higher opacity than intended.)
  drawTargetBeacon();
  drawGate();
  drawPlayer();
  drawComboFlash();

  // FOCUS — a calm slow-motion wash so the slowdown reads clearly.
  if (G.focusT > 0) {
    const a = clamp(G.focusT, 0, 1) * 0.5;
    ctx.save();
    const grad = ctx.createRadialGradient(W / 2, H / 2, H * 0.18, W / 2, H / 2, H * 0.8);
    grad.addColorStop(0, 'rgba(167,107,255,0)');
    grad.addColorStop(1, hexA('#a76bff', a * 0.55 * fx.motion));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  const closeness = clamp(1 - (G.player.wy - G.voidY) / 240, 0, 1);
  if (closeness > 0.05) {
    ctx.save();
    const a = closeness * 0.6 * (0.7 + Math.sin(G.t * 8) * 0.3);
    const vc = world().void || '#ff3b5c';
    const grad = ctx.createRadialGradient(
      W / 2, H * 0.5, Math.min(W, H) * 0.32,
      W / 2, H * 0.5, Math.max(W, H) * 0.72,
    );
    grad.addColorStop(0, hexA(vc, 0));
    grad.addColorStop(0.6, hexA(vc, 0));
    grad.addColorStop(1, hexA(vc, a));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // HUD
  text(G.height + ' m', W / 2, 40 + SAFE_TOP, 30, '#fff', 800, 16, 'center', "'Unbounded'");
  if (G.combo > 1) text('PERFECT x' + G.combo, W / 2, 72 + SAFE_TOP, 15, '#ffb020', 700, 8);
  if (G.constelProg > 0) {
    const dots = '✦'.repeat(G.constelProg) + '◦'.repeat(3 - G.constelProg);
    text('CONSTELLATION  ' + dots, W / 2, 88 + SAFE_TOP, 11, '#cdb4ff', 800, 6);
  }
  // coin balance — animated count-up with a scale punch as it rolls (casino juice)
  {
    const coinStr = '◎ ' + Math.round(G.coinDisp);
    const cpx = W - 16;
    const cpy = 28 + SAFE_TOP;
    if (G.coinPunch > 0.01) {
      ctx.save();
      const s = 1 + G.coinPunch * 0.32;
      ctx.translate(cpx, cpy);
      ctx.scale(s, s);
      ctx.translate(-cpx, -cpy);
      text(coinStr, cpx, cpy, 14, mixHex('#ffe39b', '#ffffff', G.coinPunch * 0.6), 700, 6 + G.coinPunch * 8, 'right');
      ctx.restore();
    } else {
      text(coinStr, cpx, cpy, 14, '#ffe39b', 700, 6, 'right');
    }
  }
  drawMeters();

  // active power-up timers (left edge, under the toggles' space)
  let puY = 92 + SAFE_TOP;
  const puBar = (label: string, t: number, max: number, c: string): void => {
    const w = 70;
    const x = 12;
    text(label, x, puY, 9, c, 800, 0, 'left', "'Unbounded'");
    rr(x, puY + 6, w, 4, 2); ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fill();
    rr(x, puY + 6, w * clamp(t / max, 0, 1), 4, 2); ctx.fillStyle = c; ctx.fill();
    puY += 18;
  };
  if (G.focusT > 0) puBar('FOCUS', G.focusT, 3.2, '#cdb4ff');
  if (G.magnetT > 0) puBar('MAGNET', G.magnetT, 6.5, '#a9ecff');

  // ZEN: no death, so offer an explicit "DONE" button to bank the session.
  if (G.zen) {
    const bw = 78;
    const bh = 30;
    const bx = W - bw - 12;
    const by = 50 + SAFE_TOP;
    rr(bx, by, bw, bh, 9);
    ctx.fillStyle = 'rgba(20,16,48,.78)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(149,227,90,.5)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    text('✦ DONE', bx + bw / 2, by + bh / 2, 12, '#9be35a', 800, 0, 'center', "'Unbounded'");
    btn('zenexit', bx, by, bw, bh, () => onZenExit());
  }

  if (G.tut >= 0) {
    ctx.globalAlpha = clamp(1 - (G.tutT - 3) / 1.5, 0, 1);
    text(TUT_LINES[G.tut], W / 2, H * 0.72, 18, '#fff', 700, 10);
    ctx.globalAlpha = 1;
  }
  if (G.toast) {
    const a = clamp(G.toast.t, 0, 1);
    ctx.globalAlpha = a;
    text(G.toast.txt, W / 2, H * 0.42, 30, G.toast.c, 800, 18, 'center', "'Unbounded'");
    ctx.globalAlpha = 1;
  }
  // big arcade callouts + screen flash sit on top of the HUD
  fxDrawOverlay();
}

export function dimVoid(a: number): void {
  const { ctx, W, H } = view;
  ctx.fillStyle = `rgba(6,4,16,${a})`;
  ctx.fillRect(0, 0, W, H);
}
