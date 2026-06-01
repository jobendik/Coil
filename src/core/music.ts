import musicUrl from '../assets/background_music.mp3';
import { settings } from '../settings';
import { ac } from './audio';
import { clamp } from './utils';

/* Looping background-music bed. Streamed via HTMLAudioElement(s) (kept separate
   from the WebAudio SFX path). Gated by its OWN `musicMuted` setting — fully
   independent of the SFX mute — plus tab visibility, and hard-paused during ads
   via Music.pause() from the loop's pause hook. Volume fades in/out so toggles
   and ad breaks aren't jarring.

   MULTI-TRACK — anti-fatigue. The single bundled track is track 0. Any extra
   files dropped into src/assets/music/ (*.mp3) join the rotation automatically;
   Music.cycle() (called at run start) crossfades to a different track so a long
   session doesn't loop one tune for 10 minutes (the playtime window CrazyGames
   measures). Tracks load lazily — an element is only created the first time its
   track is selected — and are cached + reused, so build/first-paint cost is the
   same as today until the player actually adds tracks.

   ZEN bed — in the calm mode the catchy track steps aside for a procedural
   ambient pad (soft ocean/wind + a low drone), synthesised with WebAudio so
   it needs no extra asset. Driven by setZen().

   Autoplay policy: browsers block audio until a user gesture, so everything is
   created lazily on the first tap/key (Music.start) — never at module load,
   which also keeps headless/SSR imports safe. */

const BASE_VOL = 0.3;       // unobtrusive under the SFX
const FADE = 1.8;           // volume units per second

// Extra tracks: dropped into src/assets/music/. import.meta.glob is a Vite
// transform; the try/catch keeps the headless test bundler (esbuild) happy, where
// the call is undefined → no extra tracks → procedural/default path only.
let extraMusic: Record<string, string> = {};
try {
  extraMusic = import.meta.glob('../assets/music/*.{mp3,ogg}', {
    eager: true, query: '?url', import: 'default',
  }) as Record<string, string>;
} catch { /* non-Vite bundler */ }
const TRACKS: string[] = [musicUrl, ...Object.keys(extraMusic).sort().map((k) => extraMusic[k])];

let started = false;
let zen = false;
let intensity = 0;          // 0..1 combo/FRENZY energy, set by the loop each frame

// Lazily-created, cached <audio> elements keyed by track index. cur = the track
// fading toward target volume; prev = the outgoing track during a crossfade.
const elCache: Record<number, HTMLAudioElement> = {};
let curIdx = -1;
let prevIdx = -1;
let curVol = 0;
let prevVol = 0;

function trackEl(i: number): HTMLAudioElement | null {
  if (elCache[i]) return elCache[i];
  try {
    const e = new Audio(TRACKS[i]);
    e.loop = true;
    e.preload = 'auto';
    e.volume = 0;
    elCache[i] = e;
    return e;
  } catch {
    return null;
  }
}

function pickNext(): number {
  if (TRACKS.length <= 1) return 0;
  let i = curIdx;
  while (i === curIdx) i = Math.floor(Math.random() * TRACKS.length);
  return i;
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

/* ---------- procedural INTENSITY layer (anti-fatigue) ----------
   One 4 MB track loops the whole session, so audio goes stale right around the
   10-minute playtime window CrazyGames measures. Rather than a second asset (or
   the playbackRate/volume hacks deliberately removed in 33a19d8), we LAYER a tiny
   WebAudio "energy" bed on top: bright band-passed noise with a tremolo whose gain
   + pulse rate rise with combo/FRENZY. It's purely textural (no pitched content),
   so it can never clash with the track's key — it just makes the bed feel like it
   lifts when you're doing well, and settles when you're not. Driven by
   Music.setIntensity() from the loop; silent in menus and Zen. */
const Intensity = {
  nodes: null as null | {
    master: GainNode;
    src: AudioBufferSourceNode;
    trem: OscillatorNode;
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

      // looping white noise → bandpass (bright "air") → tremolo gain → master
      const len = Math.floor(a.sampleRate * 2);
      const buf = a.createBuffer(1, len, a.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = a.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const bp = a.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 3200;
      bp.Q.value = 0.8;
      const tremGain = a.createGain();
      tremGain.gain.value = 0.55;
      const trem = a.createOscillator();
      trem.type = 'sine';
      trem.frequency.value = 5;
      const tremDepth = a.createGain();
      tremDepth.gain.value = 0.4;
      trem.connect(tremDepth);
      tremDepth.connect(tremGain.gain);
      src.connect(bp); bp.connect(tremGain); tremGain.connect(master);
      src.start();
      trem.start();
      this.nodes = { master, src, trem };
    } catch {
      this.nodes = null;
    }
  },

  upd(dt: number, level: number): void {
    if (level > 0.001) this.ensure();
    if (!this.nodes) { this.vol = 0; return; }
    const target = level * 0.1;               // a subtle topping that stays under the track
    this.vol += (target - this.vol) * Math.min(1, dt * 2.2);
    try {
      this.nodes.master.gain.value = clamp(this.vol, 0, 1);
      this.nodes.trem.frequency.value = 4 + level * 5;   // pulses faster as it builds
    } catch { /* ignore */ }
  },

  silence(): void {
    this.vol = 0;
    try { if (this.nodes) this.nodes.master.gain.value = 0; } catch { /* ignore */ }
  },
};

export const Music = {
  /** Begin the bed on the first user gesture (satisfies autoplay policy). Picks
   *  one starting track and creates ONLY that element, so we never fetch a track
   *  we won't play (the default is 4 MB — don't load it just to cycle away). */
  start(): void {
    started = true;
    if (curIdx < 0) curIdx = TRACKS.length > 1 ? Math.floor(Math.random() * TRACKS.length) : 0;
    trackEl(curIdx);
  },

  /** Crossfade to a different track. Called at run start so a long session gets
   *  variety. No-op with a single track, and on the very first run (the track
   *  start() chose hasn't faded in yet — keep it rather than load a second). */
  cycle(): void {
    if (!started || TRACKS.length < 2) return;
    if (curVol < 0.01 && prevIdx < 0) return;     // first run: don't swap off the fresh pick
    prevIdx = curIdx;
    prevVol = curVol;
    curIdx = pickNext();
    curVol = 0;
    trackEl(curIdx);
  },

  /** Hard-pause immediately — used when an ad starts or the tab is hidden. The
   *  per-frame fade can't run while the loop is paused, so the WebAudio layers
   *  are silenced directly here (otherwise the shimmer would bleed under an ad). */
  pause(): void {
    for (const k in elCache) { const e = elCache[k]; if (e && !e.paused) e.pause(); }
    Intensity.silence();
    Zen.silence();
  },

  /** Toggle the Zen ambient bed (replaces the catchy track in the calm mode). */
  setZen(on: boolean): void {
    zen = on;
  },

  /** Set the combo/FRENZY energy that drives the procedural intensity layer (0..1). */
  setIntensity(x: number): void {
    intensity = clamp(x, 0, 1);
  },

  /** Per-frame fade + play/pause sync against the mute setting + tab visibility. */
  upd(dt: number): void {
    const allow = !settings.musicMuted && !document.hidden;
    // Zen ambient (only while in the Zen bed and music is allowed).
    Zen.upd(dt, allow && zen);
    // Intensity layer — only in real (non-Zen) gameplay; fades to 0 elsewhere.
    Intensity.upd(dt, allow && !zen ? intensity : 0);

    if (!started) return;
    const want = allow && !zen;

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
