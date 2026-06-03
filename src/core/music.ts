import musicUrl from '../assets/background_music.mp3';
import { settings } from '../settings';
import { ac } from './audio';
import { clamp } from './utils';

/* Looping background-music bed. Streamed via HTMLAudioElement(s) (kept separate
   from the WebAudio SFX path). Gated by its OWN `musicMuted` setting — fully
   independent of the SFX mute — plus tab visibility, and hard-paused during ads
   via Music.pause() from the loop's pause hook. Volume fades in/out so toggles
   and ad breaks aren't jarring.

   THREE BEDS — a sense of place, driven by setScene():
     • LOBBY  — home / shop. A calm, STABLE menu theme; held the whole time the
                player is browsing (it never shuffles under them).
     • PLAY   — gameplay. A driving track drawn from a shuffled bag. The SAME
                track is kept across a chain of quick replays — it only rotates
                after GP_ROTATE_S of *actual play* — so short runs don't churn
                the music every 30 s, while a long session still gets variety
                (the 10-minute playtime window CrazyGames measures).
     • (hold) — over / ascent / tease. The run's bed keeps playing through the
                comedown; nothing switches until the player returns to the lobby.

   ZEN bed — in the calm mode the catchy track steps aside for a procedural
   ambient pad (soft ocean/wind + a low drone), synthesised with WebAudio so it
   needs no extra asset, plus an optional zen_*.mp3 track if one is supplied.

   TRACK POOLS (filename conventions, matched case-insensitively against files
   dropped into src/assets/music/):
     • "zen"        → Zen-only pool.
     • "menu" / "deep_void" → lobby pool (deep_void is the chosen menu theme).
     • everything else (incl. bundled track 0) → gameplay rotation.
   With no extra files every pool collapses onto track 0, so behaviour degrades
   gracefully to a single, non-churning track everywhere.

   Tracks load lazily — an element is only created the first time its track is
   selected — and are cached + reused, so build/first-paint cost is unchanged
   until the player actually adds tracks.

   Autoplay policy: browsers block audio until a user gesture, so everything is
   created lazily on the first tap/key (Music.start) — never at module load,
   which also keeps headless/SSR imports safe. */

const BASE_VOL = 0.3;       // unobtrusive under the SFX
const FADE = 1.8;           // volume units per second
const GP_ROTATE_S = 180;    // gameplay track rotates only after this much actual play

// Extra tracks: dropped into src/assets/music/. import.meta.glob is a Vite
// transform; the try/catch keeps the headless test bundler (esbuild) happy, where
// the call is undefined → no extra tracks → procedural/default path only.
let extraMusic: Record<string, string> = {};
try {
  extraMusic = import.meta.glob('../assets/music/*.{mp3,ogg}', {
    eager: true, query: '?url', import: 'default',
  }) as Record<string, string>;
} catch { /* non-Vite bundler */ }
const extraKeys = Object.keys(extraMusic).sort();
const TRACKS: string[] = [musicUrl, ...extraKeys.map((k) => extraMusic[k])];
// Track 0 (background_music.mp3) is always a gameplay track. Extra tracks sort
// into pools by filename convention (see header).
const ZEN_IDXS: number[] = [];
const MENU_IDXS: number[] = [];
const GAME_IDXS: number[] = [0];
extraKeys.forEach((k, i) => {
  const key = k.toLowerCase();
  const idx = i + 1;
  if (key.includes('zen')) ZEN_IDXS.push(idx);
  else if (key.includes('menu') || key.includes('deep_void')) MENU_IDXS.push(idx);
  else GAME_IDXS.push(idx);
});
// One stable lobby track for the whole session (falls back to gameplay track 0).
const menuIdx = MENU_IDXS.length ? MENU_IDXS[0] : GAME_IDXS[0];

type Mode = 'lobby' | 'play' | 'hold';
let started = false;
let mode: Mode = 'lobby';
let zen = false;
let gameIdx = -1;           // current gameplay-pool pick (persists across replays)
let zenIdx = -1;            // current zen-pool pick
let gpElapsed = 0;          // seconds of actual gameplay on the current game track

// Lazily-created, cached <audio> elements keyed by track index. cur = the track
// fading toward target volume; prev = the outgoing track during a crossfade.
const elCache: Record<number, HTMLAudioElement> = {};
let curIdx = -1;
let prevIdx = -1;
let curVol = 0;
let prevVol = 0;

function trackEl(i: number): HTMLAudioElement | null {
  if (elCache[i]) return elCache[i];
  const url = TRACKS[i];
  if (!url) return null;   // out-of-range index → never construct `new Audio(undefined)`
  try {
    const e = new Audio(url);
    e.loop = true;
    e.preload = 'auto';
    e.volume = 0;
    elCache[i] = e;
    return e;
  } catch {
    return null;
  }
}

// Crossfade target → make the current track the outgoing one, fade the new in.
function switchTo(i: number): void {
  if (i < 0 || i === curIdx) return;
  if (curVol > 0.01) { prevIdx = curIdx; prevVol = curVol; }
  curIdx = i;
  curVol = 0;
  trackEl(i);
}

// Shuffle bag over the gameplay pool: each track plays once before any repeat.
let bag: number[] = [];
function nextGameTrack(): number {
  if (GAME_IDXS.length <= 1) return GAME_IDXS[0];
  if (bag.length === 0) {
    bag = GAME_IDXS.slice();
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    // Avoid a back-to-back repeat across the bag boundary.
    if (bag[bag.length - 1] === gameIdx) {
      [bag[bag.length - 1], bag[0]] = [bag[0], bag[bag.length - 1]];
    }
  }
  return bag.pop() as number;
}

function nextZenTrack(): number {
  if (ZEN_IDXS.length === 0) return -1;
  if (ZEN_IDXS.length === 1) return ZEN_IDXS[0];
  let i = zenIdx;
  while (i === zenIdx) i = ZEN_IDXS[Math.floor(Math.random() * ZEN_IDXS.length)];
  return i;
}

// Pick & crossfade to the right track for the current bed. Called on mode/zen
// changes (and from start()), never per-frame.
function applyBed(): void {
  if (mode === 'lobby') { switchTo(menuIdx); return; }
  if (mode !== 'play') return;        // 'hold' keeps whatever is playing
  if (zen) {
    zenIdx = nextZenTrack();
    if (zenIdx >= 0) switchTo(zenIdx); // else: no zen track → procedural ambient only
    return;
  }
  // Keep the same gameplay track across quick replays; rotate only once the
  // player has actually been in-run long enough.
  if (gameIdx < 0 || gpElapsed >= GP_ROTATE_S) {
    gameIdx = nextGameTrack();
    gpElapsed = 0;
  }
  switchTo(gameIdx);
}

/* ---------- procedural Zen ambient (WebAudio) ---------- */
const Zen = {
  nodes: null as null | {
    master: GainNode;
    waveGain: GainNode;
    lfo: OscillatorNode;
    osc: OscillatorNode[];
    src: AudioBufferSourceNode;
  },
  vol: 0,

  ensure(): void {
    if (this.nodes) return;
    const a = ac();
    if (!a) return;
    try {
      const master = a.createGain();
      master.gain.value = 0;
      master.connect(a.destination);

      // soft "ocean/wind": looping brown noise → lowpass, swelled by a slow LFO
      const len = Math.floor(a.sampleRate * 3);
      const buf = a.createBuffer(1, len, a.sampleRate);
      const d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const wnoise = Math.random() * 2 - 1;
        last = (last + 0.02 * wnoise) / 1.02;
        d[i] = last * 3.2;
      }
      const src = a.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const lp = a.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 520;
      const waveGain = a.createGain();
      waveGain.gain.value = 0.5;
      const lfo = a.createOscillator();
      lfo.frequency.value = 0.12;            // ~8 s swell
      const lfoGain = a.createGain();
      lfoGain.gain.value = 0.32;
      lfo.connect(lfoGain);
      lfoGain.connect(waveGain.gain);
      src.connect(lp); lp.connect(waveGain); waveGain.connect(master);

      // low drone pad — a quiet, gently detuned perfect fifth
      const osc: OscillatorNode[] = [];
      const padGain = a.createGain();
      padGain.gain.value = 0.05;
      padGain.connect(master);
      for (const f of [110, 164.81, 220.5]) {
        const o = a.createOscillator();
        o.type = 'sine';
        o.frequency.value = f;
        o.connect(padGain);
        o.start();
        osc.push(o);
      }
      src.start();
      lfo.start();
      this.nodes = { master, waveGain, lfo, osc, src };
    } catch {
      this.nodes = null;
    }
  },

  upd(dt: number, want: boolean): void {
    const target = want ? 0.16 : 0;
    if (want) this.ensure();
    if (!this.nodes) { this.vol = 0; return; }
    this.vol += (target - this.vol) * Math.min(1, dt * 1.2);
    try { this.nodes.master.gain.value = clamp(this.vol, 0, 1); } catch { /* ignore */ }
  },

  /** Immediately mute (ad / tab-hide) — per-frame fade can't run while paused. */
  silence(): void {
    this.vol = 0;
    try { if (this.nodes) this.nodes.master.gain.value = 0; } catch { /* ignore */ }
  },
};

export const Music = {
  /** Begin the bed on the first user gesture (satisfies autoplay policy). Honours
   *  whatever scene the loop has already reported (default: lobby) and creates
   *  ONLY that track's element, so we never fetch a track we won't play. */
  start(): void {
    started = true;
    applyBed();
    // Kick the chosen element off SYNCHRONOUSLY, inside this gesture. iOS Safari
    // only honours HTMLAudioElement.play() initiated within the user-gesture
    // callstack; deferring the first play() to the per-frame upd() (which runs in
    // rAF, OUTSIDE the gesture) leaves the music bed permanently blocked on iOS.
    // Volume is 0 here and fades up in upd(), so starting now is silent.
    if (curIdx >= 0) trackEl(curIdx)?.play().catch(() => { /* still gated; upd() retries */ });
  },

  /** Hard-pause immediately — used when an ad starts or the tab is hidden. The
   *  per-frame fade can't run while the loop is paused, so the WebAudio layers
   *  are silenced directly here (otherwise the shimmer would bleed under an ad). */
  pause(): void {
    for (const k in elCache) { const e = elCache[k]; if (e && !e.paused) e.pause(); }
    Zen.silence();
  },

  /** Per-frame scene report from the loop. Idempotent — only crossfades when the
   *  bed actually changes. 'play' selects the gameplay/zen bed; 'lobby' the
   *  stable menu theme; 'hold' (result / ascent / tease) keeps the run's bed
   *  through the comedown. `zenOn` is only meaningful while playing. */
  setScene(next: Mode, zenOn: boolean): void {
    const prevMode = mode;
    const prevZen = zen;
    if (next === 'play') zen = zenOn;
    else if (next === 'lobby') zen = false;
    // 'hold' keeps the prior zen flag so a zen run's bed survives the comedown.
    mode = next;
    if (!started) return;
    if (mode === prevMode && zen === prevZen) return;
    applyBed();
  },

  /** Per-frame fade + play/pause sync against the mute setting + tab visibility. */
  upd(dt: number): void {
    if (mode === 'play' && !zen) gpElapsed += dt;   // count actual gameplay only

    const allow = !settings.musicMuted && !document.hidden;
    // Zen ambient (only while in the Zen bed and music is allowed).
    Zen.upd(dt, allow && zen);

    if (!started) return;
    // In zen mode, only play the track if it's a zen track (zen_drift etc.).
    // With no zen tracks in the pool, zen mode uses only the procedural ambient.
    const isZenTrack = ZEN_IDXS.includes(curIdx);
    const want = allow && (zen ? isZenTrack : !isZenTrack);

    // Outgoing track during a crossfade — fade to silence, then release.
    if (prevIdx >= 0) {
      const pe = elCache[prevIdx];
      prevVol += (0 - prevVol) * Math.min(1, dt * FADE);
      if (pe) {
        pe.volume = clamp(prevVol, 0, 1);
        if (prevVol < 0.01 && !pe.paused) pe.pause();
      }
      if (prevVol < 0.005) prevIdx = -1;
    }

    // Current track — plays unless muted, hidden, or we're in the Zen bed.
    const ce = curIdx >= 0 ? elCache[curIdx] : null;
    if (ce) {
      const target = want ? BASE_VOL : 0;
      curVol += (target - curVol) * Math.min(1, dt * FADE);
      curVol = clamp(curVol, 0, 1);
      ce.volume = curVol;
      if (want) {
        if (ce.paused) void ce.play().catch(() => { /* gesture still pending */ });
      } else if (!ce.paused && curVol < 0.01) {
        ce.pause();
      }
    }
  },
};
