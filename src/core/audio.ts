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
      AC.resume();
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

const SFX_LAST: Record<string, number> = {};
function thr(name: string, ms: number): boolean {
  const t = performance.now();
  if (SFX_LAST[name] && t - SFX_LAST[name] < ms) return false;
  SFX_LAST[name] = t;
  return true;
}

export const SFX = {
  whoosh(ch: number): void {
    if (!thr('whoosh', 50)) return;
    noise(0.16, 0.12 + ch * 0.12, 900 + ch * 1400);
    tone(180 + ch * 260, 0.12, 'sawtooth', 0.1, -120);
  },
  catch(c: number): void {
    if (!thr('catch', 45)) return;
    tone(420 + Math.min(c, 12) * 55, 0.09, 'triangle', 0.16, 120);
  },
  perfect(c: number): void {
    if (!thr('perfect', 60)) return;
    tone(740 + Math.min(c, 10) * 60, 0.1, 'triangle', 0.18, 260);
    setTimeout(() => tone(1110, 0.1, 'sine', 0.14), 55);
  },
  coin(): void {
    if (!thr('coin', 35)) return;
    tone(900, 0.05, 'square', 0.1, 200);
  },
  bonus(): void {
    [784, 988, 1318].forEach((f, i) => setTimeout(() => tone(f, 0.12, 'triangle', 0.16), i * 55));
  },
  shield(): void {
    tone(300, 0.2, 'sine', 0.16, 500);
  },
  milestone(): void {
    [659, 880, 1175].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'triangle', 0.17), i * 70));
  },
  unlock(): void {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.14, 'triangle', 0.16), i * 80));
  },
  death(): void {
    noise(0.35, 0.3, 1200);
    tone(120, 0.35, 'sawtooth', 0.22, -70);
  },
  click(): void {
    tone(520, 0.05, 'square', 0.1, 90);
  },
};
