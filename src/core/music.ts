import musicUrl from '../assets/background_music.mp3';
import { settings } from '../settings';
import { ac } from './audio';
import { clamp } from './utils';

/* Looping background-music bed. Streamed via an HTMLAudioElement (kept separate
   from the WebAudio SFX path). Gated by its OWN `musicMuted` setting — fully
   independent of the SFX mute — plus tab visibility, and hard-paused during ads
   via Music.pause() from the loop's pause hook. Volume fades in/out so toggles
   and ad breaks aren't jarring.

   ZEN bed — in the calm mode the catchy track steps aside for a procedural
   ambient pad (soft ocean/wind + a low drone), synthesised with WebAudio so
   it needs no extra asset. Driven by setZen().

   Autoplay policy: browsers block audio until a user gesture, so everything is
   created lazily on the first tap/key (Music.start) — never at module load,
   which also keeps headless/SSR imports safe. */

const BASE_VOL = 0.3;       // unobtrusive under the SFX
const FADE = 1.8;           // volume units per second

let el: HTMLAudioElement | null = null;
let started = false;
let vol = 0;
let zen = false;
let intensity = 0;          // 0..1 combo/FRENZY energy, set by the loop each frame

function ensure(): void {
  if (el) return;
  try {
    el = new Audio(musicUrl);
    el.loop = true;
    el.preload = 'auto';
    el.volume = 0;
  } catch {
    el = null;
  }
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
  /** Begin the bed on the first user gesture (satisfies autoplay policy). */
  start(): void {
    started = true;
    ensure();
  },

  /** Hard-pause immediately — used when an ad starts or the tab is hidden. The
   *  per-frame fade can't run while the loop is paused, so the WebAudio layers
   *  are silenced directly here (otherwise the shimmer would bleed under an ad). */
  pause(): void {
    if (el && !el.paused) el.pause();
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

    if (!started || !el) return;
    // The catchy track plays unless muted, hidden, or we're in the Zen bed.
    const want = allow && !zen;
    const target = want ? BASE_VOL : 0;
    vol += (target - vol) * Math.min(1, dt * FADE);
    vol = clamp(vol, 0, 1);
    el.volume = vol;
    if (want) {
      if (el.paused) void el.play().catch(() => { /* gesture still pending */ });
    } else if (!el.paused && vol < 0.01) {
      el.pause();
    }
  },
};
