import { settings } from '../settings';

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

let AC: AudioContext | null = null;

export function ac(): AudioContext | null {
  if (!AC) {
    try {
      const Ctor = window.AudioContext || (window as WebkitWindow).webkitAudioContext;
      if (Ctor) AC = new Ctor();
    } catch {
      /* unsupported */
    }
  }
  if (AC && AC.state === 'suspended') {
    try {
      // resume() returns a Promise on modern engines; it REJECTS when called
      // outside a user gesture (Chrome/iOS), and ac() is reached from rAF and
      // setTimeout callbacks too. Swallow the rejection so it isn't an uncaught
      // rejection every frame while suspended. (Old Safari returns void — guard.)
      const p = AC.resume();
      if (p && typeof p.then === 'function') p.catch(() => { /* gesture still pending */ });
    } catch {
      /* ignored */
    }
  }
  return AC;
}

export function tone(
  f: number,
  d = 0.08,
  type: OscillatorType = 'sine',
  vol = 0.16,
  slide = 0,
): void {
  if (settings.muted) return;
  const a = ac();
  if (!a) return;
  const t = a.currentTime;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), t + d);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g);
  g.connect(a.destination);
  o.start(t);
  o.stop(t + d + 0.02);
}

export function noise(d = 0.18, vol = 0.22, lp = 1600): void {
  if (settings.muted) return;
  const a = ac();
  if (!a) return;
  const n = Math.floor(a.sampleRate * d);
  const b = a.createBuffer(1, n, a.sampleRate);
  const dd = b.getChannelData(0);
  for (let i = 0; i < n; i++) dd[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = a.createBufferSource();
  s.buffer = b;
  const g = a.createGain();
  g.gain.value = vol;
  const f = a.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = lp;
  s.connect(f);
  f.connect(g);
  g.connect(a.destination);
  s.start();
}

/* swelling band-passed noise — a "crowd cheer / applause" texture for big wins */
export function cheerSwell(d = 0.55, vol = 0.16): void {
  if (Samples.play('cheer', 0.6)) return;
  if (settings.muted) return;
  const a = ac();
  if (!a) return;
  const n = Math.floor(a.sampleRate * d);
  const b = a.createBuffer(1, n, a.sampleRate);
  const dd = b.getChannelData(0);
  for (let i = 0; i < n; i++) dd[i] = Math.random() * 2 - 1;
  const s = a.createBufferSource();
  s.buffer = b;
  const g = a.createGain();
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 2400;
  f.Q.value = 0.6;
  const t = a.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + d * 0.45);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(f);
  f.connect(g);
  g.connect(a.destination);
  s.start();
}

/* bright noise cymbal swell for fanfares */
export function cymbal(d = 0.4): void {
  if (Samples.play('cymbal', 0.45)) return;
  if (settings.muted) return;
  const a = ac();
  if (!a) return;
  const n = Math.floor(a.sampleRate * d);
  const b = a.createBuffer(1, n, a.sampleRate);
  const dd = b.getChannelData(0);
  for (let i = 0; i < n; i++) dd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 1.5);
  const s = a.createBufferSource();
  s.buffer = b;
  const g = a.createGain();
  g.gain.value = 0.18;
  const f = a.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = 4500;
  s.connect(f);
  f.connect(g);
  g.connect(a.destination);
  s.start();
}

/* layered big-win cue: sparkle shimmer + major-triad chord + low thump (per casino spec) */
export function bigWinAudio(intensity: number): void {
  if (Samples.play('bigwin', Math.min(1, 0.7 + intensity * 0.12))) return;
  if (settings.muted) return;
  const a = ac();
  if (!a) return;
  const spk = Math.round(3 + intensity * 5);
  for (let i = 0; i < spk; i++) {
    setTimeout(() => tone(1700 + i * 120 + Math.random() * 500, 0.08, 'triangle', 0.1), i * 16);
  }
  const root = 523 * (1 + intensity * 0.05);
  [root, root * 1.26, root * 1.5].forEach((f, i) => setTimeout(() => tone(f, 0.34, 'sawtooth', 0.07 - i * 0.012), i * 4));
  const t = a.currentTime;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(120, t);
  o.frequency.exponentialRampToValueAtTime(50, t + 0.18);
  g.gain.setValueAtTime(0.32, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  o.connect(g);
  g.connect(a.destination);
  o.start(t);
  o.stop(t + 0.24);
}

/* ---------- sampled-SFX layer (every event ships a sample) ----------
   The shipped build provides a real audio file in src/assets/sfx/ for EVERY event,
   so no synthesized tone is ever heard — the Web-Audio code above/below remains
   ONLY as a never-triggered safety net (e.g. a decode failure on a hostile network).
   Files are named after the event keys and are lazily fetched + decoded after the
   first user gesture (so first paint stays fast):
     perfect · combo · coin · bonus · catch · fling · unlock · death ·
     shield · click · tick · deposit · chaching · cascade · jackpot · riser ·
     cheer · cymbal · bigwin   (.mp3 | .ogg | .wav)
   Each event independently uses its sample if present, else the procedural tone, so
   deleting a file cleanly reverts that one event. import.meta.glob is a Vite
   transform; the try/catch keeps the headless test bundler happy (where it's
   undefined → no samples → procedural path). */
let sfxFiles: Record<string, string> = {};
try {
  sfxFiles = import.meta.glob('../assets/sfx/*.{mp3,ogg,wav}', {
    eager: true, query: '?url', import: 'default',
  }) as Record<string, string>;
} catch { /* non-Vite bundler */ }
// Map each file to an event key, supporting MULTIPLE variants per event: a
// trailing number is stripped so `click1.mp3`, `click2.mp3`, `click3.mp3` all
// group under `click` and one is chosen at random per play (kills repetition
// fatigue on frequent UI sounds). A plain `coin.mp3` → key `coin` (one variant).
const sampleUrls: Record<string, string[]> = {};
for (const path in sfxFiles) {
  const file = (path.split('/').pop() ?? '').replace(/\.(mp3|ogg|wav)$/i, '');
  if (!file) continue;
  const key = file.replace(/[ _-]?\d+$/, '') || file;   // drop a trailing variant number
  (sampleUrls[key] || (sampleUrls[key] = [])).push(sfxFiles[path]);
}

const Samples = {
  buf: {} as Record<string, AudioBuffer[]>,
  done: false,

  /** Lazily fetch + decode every dropped-in sample (call after the first gesture). */
  load(): void {
    if (this.done) return;
    this.done = true;
    const a = ac();
    if (!a) return;
    for (const name in sampleUrls) {
      for (const url of sampleUrls[name]) {
        fetch(url)
          .then((r) => r.arrayBuffer())
          // Callback form, wrapped in a Promise: the promise-returning overload of
          // decodeAudioData only exists from Safari 14.1+; older iOS (13/14, which
          // can't update further) returns undefined from it, so `.then(b => …)`
          // would push an undefined buffer and every SFX would silently fall back
          // to procedural synthesis. The callback form works on every engine.
          .then((ab) => new Promise<AudioBuffer>((res, rej) => a.decodeAudioData(ab, res, rej)))
          .then((b) => { (this.buf[name] || (this.buf[name] = [])).push(b); })
          .catch(() => { /* keep the procedural fallback for this event */ });
      }
    }
  },

  /** Play a sample if one is loaded for `name` (a random variant when several
   *  exist). Returns true if the event was handled (sample fired, or we're muted)
   *  so the caller skips the procedural fallback. `rate` > 1 brightens playback
   *  (mirrors the combo pitch ramps). */
  play(name: string, vol = 0.9, rate = 1): boolean {
    if (settings.muted) return true;
    const arr = this.buf[name];
    if (!arr || !arr.length) return false;
    const a = ac();
    if (!a) return false;
    try {
      const b = arr.length === 1 ? arr[0] : arr[(Math.random() * arr.length) | 0];
      const s = a.createBufferSource();
      s.buffer = b;
      s.playbackRate.value = rate;
      const g = a.createGain();
      g.gain.value = vol;
      s.connect(g);
      g.connect(a.destination);
      s.start();
      return true;
    } catch {
      return false;
    }
  },
};

/** Kick off sample loading — call once after the first user gesture, like music. */
export function loadSamples(): void {
  Samples.load();
}

const SFX_LAST: Record<string, number> = {};
function thr(name: string, ms: number): boolean {
  const t = performance.now();
  if (SFX_LAST[name] && t - SFX_LAST[name] < ms) return false;
  SFX_LAST[name] = t;
  return true;
}

export const SFX = {
  fling(): void {
    if (!thr('fling', 40)) return;
    if (Samples.play('fling', 0.7)) return;
    noise(0.1, 0.08, 1400);
    tone(300, 0.1, 'sawtooth', 0.07, 180);
  },
  catch(c: number): void {
    if (!thr('catch', 40)) return;
    if (Samples.play('catch', 0.85, 1 + Math.min(c, 12) * 0.02)) return;
    tone(440 + Math.min(c, 12) * 40, 0.08, 'triangle', 0.14, 90);
  },
  perfect(c: number): void {
    if (!thr('perfect', 50)) return;
    if (Samples.play('perfect', 0.9, 1 + Math.min(c, 12) * 0.025)) return;
    tone(720 + Math.min(c, 12) * 55, 0.1, 'triangle', 0.18, 240);
    setTimeout(() => tone(1180, 0.09, 'sine', 0.13), 50);
  },
  coin(): void {
    if (!thr('coin', 35)) return;
    if (Samples.play('coin', 0.8)) return;
    tone(900, 0.05, 'square', 0.1, 200);
  },
  bonus(): void {
    if (Samples.play('bonus', 0.9)) return;
    [784, 988, 1318].forEach((f, i) => setTimeout(() => tone(f, 0.12, 'triangle', 0.16), i * 55));
  },
  shield(): void {
    if (Samples.play('shield', 0.85)) return;
    tone(300, 0.2, 'sine', 0.16, 500);
  },
  milestone(): void {
    if (Samples.play('combo', 0.95)) return;
    [659, 880, 1175].forEach((f, i) => setTimeout(() => tone(f, 0.15, 'triangle', 0.17), i * 65));
  },
  unlock(): void {
    if (Samples.play('unlock', 0.95)) return;
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.14, 'triangle', 0.16), i * 80));
  },
  death(): void {
    if (Samples.play('death', 0.95)) return;
    noise(0.35, 0.3, 1200);
    tone(120, 0.35, 'sawtooth', 0.22, -70);
  },
  click(): void {
    if (Samples.play('click', 0.55)) return;
    tone(520, 0.05, 'square', 0.1, 90);
  },
  /* a short bright "tick" used by count-up rolls */
  tick(): void {
    if (!thr('tick', 24)) return;
    if (Samples.play('tick', 0.5)) return;
    tone(1500, 0.03, 'square', 0.05, 80);
  },
  /* coin lands in the bank — bright plink */
  deposit(): void {
    if (!thr('deposit', 22)) return;
    if (Samples.play('deposit', 0.7)) return;
    tone(1240, 0.04, 'square', 0.08, 300);
    setTimeout(() => tone(1860, 0.05, 'triangle', 0.05), 28);
  },
  /* cash-register ka-ching */
  chaching(): void {
    if (!thr('chaching', 60)) return;
    if (Samples.play('chaching', 0.9)) return;
    tone(880, 0.05, 'square', 0.12, 300);
    setTimeout(() => tone(1320, 0.07, 'square', 0.12, 180), 55);
    setTimeout(() => tone(1860, 0.13, 'triangle', 0.13), 115);
  },
  /* a tumble of coins into the tray */
  coinCascade(n = 6): void {
    if (Samples.play('cascade', 0.8)) return;
    if (settings.muted) return;
    n = Math.min(n, 12);
    for (let i = 0; i < n; i++) setTimeout(() => tone(720 + i * 85, 0.05, 'square', 0.07, 140), i * 32);
  },
  /* full fanfare for jackpot / vault wins */
  jackpot(): void {
    if (Samples.play('jackpot', 0.95)) return;
    [523, 659, 784, 1046, 1318, 1568, 2093].forEach((f, i) => setTimeout(() => tone(f, 0.14, 'triangle', 0.16), i * 52));
    setTimeout(() => cheerSwell(0.6, 0.16), 120);
  },
  /* ascending anticipation riser before a payout reveal */
  riser(dur = 0.7): void {
    if (Samples.play('riser', 0.8)) return;
    if (settings.muted) return;
    const a = ac();
    if (!a) return;
    const t = a.currentTime;
    const o = a.createOscillator();
    const g = a.createGain();
    const f = a.createBiquadFilter();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(280, t);
    o.frequency.exponentialRampToValueAtTime(1600, t + dur);
    f.type = 'bandpass';
    f.frequency.setValueAtTime(420, t);
    f.frequency.exponentialRampToValueAtTime(2400, t + dur);
    f.Q.value = 1.1;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.11, t + dur * 0.82);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f);
    f.connect(g);
    g.connect(a.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  },
};
