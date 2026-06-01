// =========================================================================
// Powerups
// =========================================================================
import type { PowerupKey, PowerupConfig, ActivePowerup } from '../types/index.ts';
import { player } from './state.ts';
import { sfx } from './audio.ts';

export const POWERUPS: Record<PowerupKey, PowerupConfig> = {
  rapid: {
    key: 'rapid', label: 'Rapid Fire', icon: '⚡',
    duration: 8000,
    color: '#c6ff00', bg: 'rgba(198,255,0,0.15)',
  },
  freeze: {
    key: 'freeze', label: 'Freeze', icon: '❄',
    duration: 6000,
    color: '#7fd3ff', bg: 'rgba(127,211,255,0.15)',
  },
  shield: {
    key: 'shield', label: 'Shield', icon: '🛡',
    duration: 10000,
    color: '#a78bfa', bg: 'rgba(167,139,250,0.15)',
  },
  multi: {
    key: 'multi', label: 'Multi-shot', icon: '✦',
    duration: 7000,
    color: '#ffb836', bg: 'rgba(255,184,54,0.15)',
  },
};

export const activePowerups = new Map<PowerupKey, ActivePowerup>();

const BASE_FIRE_RATE = 140;

export function triggerPowerup(key: PowerupKey): void {
  const cfg  = POWERUPS[key];
  const now  = performance.now();
  const prev = activePowerups.get(key);
  const endsAt = now + cfg.duration + (prev ? Math.max(0, prev.endsAt - now) : 0);

  let el = prev?.el ?? null;
  if (!el) {
    el = document.createElement('div');
    el.className = 'powerup';
    el.style.setProperty('--pu-color', cfg.color);
    el.style.setProperty('--pu-bg', cfg.bg);
    el.innerHTML = `
      <div class="pu-bar" style="width:100%;transition:width ${cfg.duration}ms linear"></div>
      <div class="pu-icon">${cfg.icon}</div>
      <div class="pu-info">
        <div class="pu-name">${cfg.label}</div>
        <div class="pu-time" id="pu-time-${key}">${(cfg.duration / 1000).toFixed(1)}s</div>
      </div>
    `;
    document.getElementById('powerups')?.appendChild(el);
    requestAnimationFrame(() => {
      const bar = el!.querySelector<HTMLElement>('.pu-bar');
      if (bar) bar.style.width = '0%';
    });
  } else {
    // Reset bar animation
    const bar = el.querySelector<HTMLElement>('.pu-bar');
    if (bar) {
      bar.style.transition = 'none';
      bar.style.width = '100%';
      requestAnimationFrame(() => {
        bar.style.transition = `width ${cfg.duration}ms linear`;
        requestAnimationFrame(() => { bar.style.width = '0%'; });
      });
    }
  }

  activePowerups.set(key, { key, endsAt, el });
  sfx('powerup');

  // Side effects
  if (key === 'rapid') player.fireRate = BASE_FIRE_RATE * 0.35;
}

export function tickPowerups(now: number): void {
  for (const [key, pu] of activePowerups) {
    if (now >= pu.endsAt) {
      // Remove
      pu.el?.remove();
      activePowerups.delete(key);

      // Restore side effects
      if (key === 'rapid') player.fireRate = BASE_FIRE_RATE;
    } else {
      const remaining = (pu.endsAt - now) / 1000;
      const timeEl = pu.el?.querySelector<HTMLElement>(`#pu-time-${key}`);
      if (timeEl) timeEl.textContent = remaining.toFixed(1) + 's';
    }
  }
}

export function clearPowerups(): void {
  for (const pu of activePowerups.values()) pu.el?.remove();
  activePowerups.clear();
  player.fireRate = BASE_FIRE_RATE;
}
