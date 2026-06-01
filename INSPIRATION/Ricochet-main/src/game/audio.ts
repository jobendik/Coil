// =========================================================================
// Web Audio — procedural SFX
// =========================================================================
import type { SfxType } from '../types/index.ts';

let audioCtx: AudioContext | null = null;

export function ensureAudio(): void {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

interface SfxOpts {
  vol?: number;
  pitch?: number;
}

export function sfx(type: SfxType, opts: SfxOpts = {}): void {
  ensureAudio();
  if (!audioCtx) return;

  const vol   = opts.vol   ?? 0.4;
  const pitch = opts.pitch ?? 1.0;
  const ctx   = audioCtx;
  const t     = ctx.currentTime;

  const gain = ctx.createGain();
  gain.connect(ctx.destination);

  switch (type) {
    case 'pop': {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420 * pitch, t);
      osc.frequency.exponentialRampToValueAtTime(80 * pitch, t + 0.18);
      gain.gain.setValueAtTime(vol * 0.7, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + 0.22);
      break;
    }
    case 'shoot': {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(900 * pitch, t);
      osc.frequency.exponentialRampToValueAtTime(180 * pitch, t + 0.08);
      gain.gain.setValueAtTime(vol * 0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + 0.09);
      break;
    }
    case 'crit': {
      const osc  = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc.type   = 'square';
      osc2.type  = 'square';
      osc.frequency.setValueAtTime(600 * pitch, t);
      osc2.frequency.setValueAtTime(904 * pitch, t);
      gain.gain.setValueAtTime(vol * 0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gain); osc2.connect(gain);
      osc.start(t); osc2.start(t);
      osc.stop(t + 0.35); osc2.stop(t + 0.35);
      break;
    }
    case 'hit': {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.06, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.8;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      gain.gain.setValueAtTime(vol * 0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      src.connect(gain);
      src.start(t);
      break;
    }
    case 'medal': {
      const freqs = [523.25, 659.25, 783.99, 1046.5];
      freqs.forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = f * pitch;
        g.gain.setValueAtTime(0, t + i * 0.12);
        g.gain.linearRampToValueAtTime(vol * 0.4, t + i * 0.12 + 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.4);
        o.connect(g); g.connect(ctx.destination);
        o.start(t + i * 0.12);
        o.stop(t + i * 0.12 + 0.4);
      });
      return;
    }
    case 'powerup': {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220 * pitch, t);
      osc.frequency.exponentialRampToValueAtTime(880 * pitch, t + 0.3);
      gain.gain.setValueAtTime(vol * 0.6, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + 0.35);
      break;
    }
    case 'wave': {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180 * pitch, t);
      osc.frequency.exponentialRampToValueAtTime(440 * pitch, t + 0.5);
      gain.gain.setValueAtTime(vol * 0.55, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + 0.55);
      break;
    }
    case 'life': {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880 * pitch, t);
      osc.frequency.exponentialRampToValueAtTime(110 * pitch, t + 0.4);
      gain.gain.setValueAtTime(vol * 0.6, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + 0.45);
      break;
    }
  }
}
