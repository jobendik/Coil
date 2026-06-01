// director.ts – dark-pattern simulation layer, ported from dp.html
import { TECHNIQUES, DEMO_GROUP, type DemoGroup, type Technique } from './techniques.ts';
import { Hooks } from '../game/hooks.ts';
import { State } from '../game/state.ts';
import { startGame, quitToMenu } from '../game/flow.ts';

// ---------- State ----------
interface PressureState {
  idx: number;
  seen: Set<string>;
  active: { tech: Technique; reason: string } | null;
  pendingStart: boolean;
  pendingMenu: boolean;
  round: number;
  popCount: number;
  fakeEnergy: number;
  fakeStock: number;
  passProgress: number;
  chestProgress: number;
  streak: number;
  feedTimer: ReturnType<typeof setInterval> | null;
  eventTimers: ReturnType<typeof setInterval>[];
}

const P: PressureState = {
  idx: 0,
  seen: new Set(),
  active: null,
  pendingStart: false,
  pendingMenu: false,
  round: 0,
  popCount: 0,
  fakeEnergy: 9,
  fakeStock: 3,
  passProgress: 91,
  chestProgress: 94,
  streak: 6,
  feedTimer: null,
  eventTimers: [],
};

// ---------- Helpers ----------
function el(id: string): HTMLElement | null { return document.getElementById(id); }
function escapeHTML(str: string): string {
  return String(str).replace(/[&<>"']/g, m =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m] ?? m));
}
function riskClass(r: string): string {
  return r === 'Critical' ? 'critical' : r === 'High' ? 'high' : '';
}
function groupOf(t: Technique): DemoGroup {
  return (DEMO_GROUP[t.demo] as DemoGroup) ?? 'visual';
}
function updateCounter(): void {
  const systemCount = el('systemCount');
  if (systemCount) systemCount.textContent = `${P.seen.size}/${TECHNIQUES.length}`;
}

// ---------- Pick ----------
function pick(predicate?: (t: Technique) => boolean): Technique {
  for (let i = 0; i < TECHNIQUES.length; i++) {
    const t = TECHNIQUES[(P.idx + i) % TECHNIQUES.length];
    if (!P.seen.has(t.name) && (!predicate || predicate(t))) {
      P.idx = (TECHNIQUES.indexOf(t) + 1) % TECHNIQUES.length;
      return t;
    }
  }
  for (let i = 0; i < TECHNIQUES.length; i++) {
    const t = TECHNIQUES[(P.idx + i) % TECHNIQUES.length];
    if (!predicate || predicate(t)) {
      P.idx = (TECHNIQUES.indexOf(t) + 1) % TECHNIQUES.length;
      return t;
    }
  }
  return TECHNIQUES[P.idx++ % TECHNIQUES.length];
}
function techByGroup(groups: DemoGroup | DemoGroup[]): Technique {
  const set = new Set(Array.isArray(groups) ? groups : [groups]);
  return pick(t => set.has(groupOf(t)));
}

// ---------- Feed ----------
function addRiver(name: string, action: string): void {
  const river = el('activity-river');
  if (!river) return;
  const item = document.createElement('div');
  item.className = 'river-item';
  item.innerHTML = `<div class="river-avatar">${escapeHTML(name[0] ?? 'R')}</div><div class="river-copy"><b>${escapeHTML(name)}</b><span>${escapeHTML(action)} · generated simulation</span></div>`;
  river.prepend(item);
  setTimeout(() => item.remove(), 6200);
}
function fakeToast(label: string, text: string): void {
  addRiver(label, text);
}
function startFeed(): void {
  if (P.feedTimer) return;
  const names = ['Mira','Leo','Sarah','Emma','Noah','Kai','Tom','Ivy','Jonas','Luna'];
  const acts = ['bought Diamond VIP','opened Mythic Harpoon','claimed Crimson Bundle','protected a 7-day streak','skipped a 2h timer','unlocked Premium Pass','bought 9,800 gems','invited 10 friends'];
  P.feedTimer = setInterval(() => {
    const n = names[Math.floor(Math.random() * names.length)];
    const a = acts[Math.floor(Math.random() * acts.length)];
    if (n && a) addRiver(n, a);
  }, 5200);
}

// ---------- Modal builders ----------
function primaryLabel(group: DemoGroup): string {
  return ({economy:'Claim best value',scarcity:'Secure before gone',progression:'Protect progress',gacha:'Open again',vip:'Upgrade status',social:'Join momentum',exit:'Keep playing',visual:'Accept recommended',privacy:'Continue recommended',ads:'Open sponsored pick',meta:'Apply optimized offer',battlepass:'Unlock premium track'} as Record<DemoGroup,string>)[group] ?? 'Continue';
}
function secondaryLabel(group: DemoGroup): string {
  return ({economy:'Compare values',scarcity:'Maybe later',progression:'Keep grinding',gacha:'Stop opening',vip:'Stay free',social:'Ignore',exit:'Leave anyway',visual:'Neutral choice',privacy:'Manage options',ads:'Clearly label ad',meta:'Use guardrail',battlepass:'Hide premium track'} as Record<DemoGroup,string>)[group] ?? 'Not now';
}
function tinyLabel(group: DemoGroup): string {
  return ({economy:"No thanks, miss value",scarcity:'Risk missing it',progression:'Let rewards lapse',gacha:'Quit while behind',vip:'Lose VIP benefits',social:'Fall behind',exit:'Abandon progress',visual:'tiny low-contrast refusal',privacy:'Reject all optional',ads:'Close',meta:'Pause personalization',battlepass:'Leave rewards locked'} as Record<DemoGroup,string>)[group] ?? 'Close';
}

function economyHTML(tech: Technique): string {
  const isCheckout = ['checkout','hidden_total_price','sneak_into_basket'].includes(tech.demo);
  if (isCheckout) {
    return `<div class="dp-grid">
      <div class="dp-card hot"><small>Headline price</small><h3>Starter Hyperpack</h3><div class="dp-price">$4.99</div><p>Shown early to anchor the decision.</p></div>
      <div class="dp-card danger"><small>Late checkout reveal</small><div class="dp-row"><span>Gem Pack</span><b>$4.99</b></div><div class="dp-row"><span>Processing</span><b>$2.99</b></div><div class="dp-row"><span>Required boost</span><b>$3.99</b></div><label><input type="checkbox" checked> Monthly booster club $7.99</label><div class="dp-row"><span>Total</span><b>$19.94</b></div></div>
    </div>`;
  }
  return `<div class="dp-grid">
    <div class="dp-card"><small>Wallet fog</small><h3>3 currencies</h3><div class="dp-row"><span>Coins</span><b>12,480 ◆</b></div><div class="dp-row"><span>Gems</span><b>328 ✦</b></div><div class="dp-row"><span>Shards</span><b>74 ※</b></div><p>Real-money value becomes hard to feel once converted.</p></div>
    <div class="dp-card hot"><small>Recommended</small><h3>Ultimate value pack</h3><p><span class="dp-old">$49.99</span></p><div class="dp-price">$4.99</div><p>9,800 ✦ + 17 keys + 9 refills + 240 shards + 2 mystery boosts</p><div class="dp-bar"><div class="dp-fill" style="--w:97%"></div></div><small>97% value claim mixes too many units to audit quickly.</small></div>
  </div>`;
}
function scarcityHTML(tech: Technique): string {
  const wait = tech.demo === 'artificial_wait_skip';
  return `<div class="dp-grid">
    <div class="dp-card ${wait?'warn':'hot'}"><small>${wait?'Crafting timer':'Flash offer'}</small><h3>${wait?'Upgrade locked':'Crimson Ricochet Skin'}</h3><p>${wait?'Upgrade completes in':'Offer expires in'} <span class="dp-timer" data-dp-timer="${wait?7200:38}">${wait?'02:00:00':'00:38'}</span></p><div class="dp-bar"><div class="dp-fill" style="--w:${wait?'12%':'86%'}"></div></div><p>${wait?'Skip the artificial wait with premium currency.':'Stock: '}<span class="dp-stock">${wait?'300 ✦ skip':'Only 3 left'}</span></p></div>
    <div class="dp-card danger"><small>Pressure stack</small><div class="dp-row"><span>Season ends</span><b>72h</b></div><div class="dp-row"><span>Daily deal rotates</span><b>24h</b></div><div class="dp-row"><span>VIP weekend</span><b>Locked</b></div><div class="dp-row"><span>Never returns claim</span><b>Active</b></div></div>
  </div>`;
}
function progressionHTML(tech: Technique): string {
  if (tech.demo === 'streak') {
    return `<div class="dp-card hot"><h3>Day ${P.streak} streak</h3><div class="dp-days">${[1,2,3,4,5,6,7].map(d=>`<div class="dp-day ${d<=6?'hot':'danger'}">${d}</div>`).join('')}</div><p>Missing tomorrow reframes absence as losing a reward.</p></div>`;
  }
  if (tech.demo === 'energy') {
    return `<div class="dp-grid"><div class="dp-card danger"><small>Energy bottleneck</small><h3>Rewards disabled</h3><div class="dp-bar"><div class="dp-fill" style="--w:${P.fakeEnergy}%;background:linear-gradient(90deg,var(--mag),var(--amber))"></div></div><p>Wait <span class="dp-timer" data-dp-timer="2699">44:59</span> or refill now.</p></div><div class="dp-card hot"><small>Relief offer</small><h3>Refill bundle</h3><div class="dp-price">120 ✦</div><p>Payment removes friction created by the system.</p></div></div>`;
  }
  return `<div class="dp-grid"><div class="dp-card hot"><small>Almost complete</small><h3>Chest ${P.chestProgress}%</h3><div class="dp-bar"><div class="dp-fill" style="--w:${P.chestProgress}%"></div></div><p>One more round feels rational because the bar is nearly done.</p></div><div class="dp-card"><small>Stacked goals</small><div class="dp-row"><span>Daily quest</span><b>2/3</b></div><div class="dp-row"><span>Mastery</span><b>96%</b></div><div class="dp-row"><span>Inventory</span><b>49/50</b></div><div class="dp-row"><span>Offline reward</span><b>+480</b></div></div></div>`;
}
function gachaHTML(_tech: Technique): string {
  return `<div class="dp-card hot"><small>Mystery box</small><h3>Mythic chance 0.1%</h3><div class="dp-wheel"><div class="dp-track"><div class="dp-reward">Common</div><div class="dp-reward">Rare</div><div class="dp-reward">Epic</div><div class="dp-reward mythic">Mythic</div><div class="dp-reward">Epic</div><div class="dp-reward">Rare</div><div class="dp-reward mythic">Mythic</div><div class="dp-reward">Epic</div><div class="dp-reward">Common</div></div></div><p><b style="color:var(--mag)">So close to Mythic!</b> The near-miss presentation is the demonstration.</p><div class="dp-row"><span>Pity progress</span><b>87/100</b></div><div class="dp-row"><span>10-pull value</span><b>Better deal</b></div></div>`;
}
function vipHTML(_tech: Technique): string {
  return `<div class="dp-grid"><div class="dp-card"><small>Current profile</small><h3>Gold III</h3><div class="dp-row"><span>Energy regen</span><b>3x</b></div><div class="dp-row"><span>No ads</span><b>Partial</b></div><div class="dp-row"><span>Support title</span><b>Active</b></div></div><div class="dp-card hot"><small>Recommended tier</small><h3>Diamond VIP</h3><div class="dp-price">$49</div><p>Infinite energy · exclusive cosmetics · priority support · whale recognition bonus</p></div></div>`;
}
function socialHTML(_tech: Technique): string {
  return `<div class="dp-grid"><div class="dp-card hot"><small>Activity feed</small><h3>Everyone is moving</h3><div class="dp-feed"><div class="dp-feeditem"><div class="dp-feedavatar">S</div><div><b>Sarah</b><span>bought Diamond VIP · generated demo feed</span></div></div><div class="dp-feeditem"><div class="dp-feedavatar">E</div><div><b>Emma</b><span>opened Mythic Harpoon · generated demo feed</span></div></div><div class="dp-feeditem"><div class="dp-feedavatar">T</div><div><b>Tom</b><span>completed Battle Pass · generated demo feed</span></div></div></div></div><div class="dp-card danger"><small>Comparison</small><div class="dp-row"><span>Sarah</span><b>Level 87</b></div><div class="dp-row"><span>Emma</span><b>Level 23</b></div><div class="dp-row"><span>You</span><b>Level 27</b></div><div class="dp-row"><span>Friend pings</span><b>10 rewards</b></div></div></div>`;
}
function exitHTML(_tech: Technique): string {
  return `<div class="dp-grid"><div class="dp-card danger"><small>Exit interruption</small><h3>Wait — progress at risk</h3><div class="dp-row"><span>Streak</span><b>${P.streak}/7</b></div><div class="dp-row"><span>Chest</span><b>${P.chestProgress}%</b></div><div class="dp-row"><span>Battle pass</span><b>${P.passProgress}%</b></div><div class="dp-row"><span>Session value</span><b>$49.99</b></div></div><div class="dp-card"><small>Obstruction pattern</small><p>Cancellation/deletion/refund flows can repeat offers, ask mandatory survey questions, hide routes or frame leaving as abandonment.</p><textarea placeholder="Required explanation in the obstructive version" style="width:100%;min-height:72px;border-radius:10px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.11);color:white;padding:10px"></textarea></div></div>`;
}
function privacyHTML(tech: Technique): string {
  const forced = ['forced_continuity_hidden','subscription','renewal_ambiguity'].includes(tech.demo);
  if (forced) {
    return `<div class="dp-grid"><div class="dp-card hot"><small>Free trial</small><h3>Try Pro free</h3><div class="dp-price">$0 today</div><p style="font-size:10px;opacity:.55">Renews automatically at $199.99/month after 3 days unless cancelled 24h before renewal.</p></div><div class="dp-card danger"><small>Ambiguity</small><div class="dp-row"><span>Billing type</span><b>unclear</b></div><div class="dp-row"><span>Renewal date</span><b>hidden</b></div><div class="dp-row"><span>Cancellation path</span><b>settings</b></div></div></div>`;
  }
  return `<div class="dp-grid"><div class="dp-card hot"><small>Consent prompt</small><h3>We value your privacy</h3><p>Accept all for the best personalized Ricochet experience.</p><button class="dp-primary" type="button" style="pointer-events:none">Accept all</button><br><button class="dp-tiny" type="button" style="pointer-events:none">Manage 48 partner settings</button></div><div class="dp-card"><small>Preferences</small><label><input type="checkbox" checked> Analytics</label><br><label><input type="checkbox" checked> Personalized ads</label><br><label><input type="checkbox" checked> Share with partners</label><br><label><input type="checkbox" checked> Cross-device tracking</label><br><label><input type="checkbox" checked> Push notifications</label></div></div>`;
}
function adsHTML(tech: Technique): string {
  return `<div class="dp-grid"><div class="dp-card danger"><small>${tech.demo.includes('sponsored')?'Ranking':'Native ad'}</small><h3>${tech.demo === 'fake_close_button' ? 'Fake close button' : tech.demo === 'rewarded_ad_bait_switch' ? 'Watch ad for 500 gems' : 'System update available'}</h3><p>${tech.demo === 'rewarded_ad_bait_switch' ? 'After attention is spent, the reward becomes a chance instead of a guarantee.' : 'The ad imitates trusted UI or blends into recommendations.'}</p><button class="dp-primary" style="pointer-events:none">${tech.demo === 'fake_close_button' ? '× close' : 'Open now'}</button></div><div class="dp-card"><small>Safer ad design</small><p>Label sponsored content clearly, separate it visually from gameplay/system UI, and deliver exactly promised rewarded-ad value.</p></div></div>`;
}
function metaHTML(_tech: Technique): string {
  return `<div class="dp-grid"><div class="dp-card danger"><small>Adaptive director</small><h3>Next best action</h3><div class="dp-row"><span>Segment</span><b>low energy</b></div><div class="dp-row"><span>State</span><b>recent loss</b></div><div class="dp-row"><span>Timing</span><b>late session</b></div><div class="dp-row"><span>Offer</span><b>refill bundle</b></div></div><div class="dp-card"><small>Guardrail version</small><p>Optimization should track regret, refunds, complaints, cooldowns, spending limits and wellbeing — not only conversion.</p></div></div>`;
}
function battlepassHTML(_tech: Technique): string {
  return `<div class="dp-grid"><div class="dp-card"><small>Free track</small><div class="dp-row"><span>Tier 12</span><b>50 coins</b></div><div class="dp-row"><span>Tier 13</span><b>10 shards</b></div><div class="dp-row"><span>Tier 14</span><b>empty</b></div></div><div class="dp-card hot"><small>Premium track</small><h3>Rewards already earned</h3><div class="dp-row"><span>Tier 12</span><b>🔒 Mythic trail</b></div><div class="dp-row"><span>Tier 13</span><b>🔒 400 ✦</b></div><div class="dp-row"><span>Tier 14</span><b>🔒 Elite skin</b></div><div class="dp-bar"><div class="dp-fill" style="--w:${P.passProgress}%"></div></div></div></div>`;
}
function visualHTML(_tech: Technique): string {
  return `<div class="dp-grid"><div class="dp-card hot"><small>Visual hierarchy</small><h3>Recommended choice</h3><button class="dp-primary" style="pointer-events:none">Yes, claim my deal</button><br><button class="dp-tiny" style="pointer-events:none">no thanks, I prefer missing out</button><p>Size, color, placement and copy steer without changing the available choices.</p></div><div class="dp-card danger"><small>Notification pressure</small><div class="dp-row"><span>Inbox badge</span><b>99+</b></div><div class="dp-row"><span>Offer badge</span><b>!</b></div><div class="dp-row"><span>FOMO copy</span><b>active</b></div><div class="dp-row"><span>Dismiss looks disabled</span><b>yes</b></div></div></div>`;
}

function renderByGroup(tech: Technique, group: DemoGroup): string {
  switch (group) {
    case 'economy':    return economyHTML(tech);
    case 'scarcity':   return scarcityHTML(tech);
    case 'progression':return progressionHTML(tech);
    case 'gacha':      return gachaHTML(tech);
    case 'vip':        return vipHTML(tech);
    case 'social':     return socialHTML(tech);
    case 'exit':       return exitHTML(tech);
    case 'privacy':    return privacyHTML(tech);
    case 'ads':        return adsHTML(tech);
    case 'meta':       return metaHTML(tech);
    case 'battlepass': return battlepassHTML(tech);
    case 'visual':
    default:           return visualHTML(tech);
  }
}

function renderModal(tech: Technique, group: DemoGroup, reason: string): string {
  const label = reason ? `<span class="dp-tag sim">${escapeHTML(reason)}</span>` : '';
  return `
    <div class="dp-topline">
      <span class="dp-tag ${riskClass(tech.risk)}">${escapeHTML(tech.risk)}</span>
      <span class="dp-tag">${escapeHTML(tech.category)}</span>
      <span class="dp-tag">${P.seen.size}/166</span>
      ${label}
    </div>
    <h2 class="dp-title" id="pressureTitle">${escapeHTML(tech.name)}</h2>
    <p class="dp-subtitle"><b>In-game behavior:</b> ${escapeHTML(tech.tactic)}</p>
    <div class="dp-content">${renderByGroup(tech, group)}</div>
    <div class="dp-actions">
      <button class="dp-primary" data-pressure-action="primary">${primaryLabel(group)}</button>
      <button class="dp-secondary" data-pressure-action="secondary">${secondaryLabel(group)}</button>
      <button class="dp-tiny" data-pressure-action="tiny">${tinyLabel(group)}</button>
    </div>
    <div class="dp-safety"><b>Simulated/non-production:</b> no payment processor, no ad SDK, no tracking, no storage and no external request is connected. Safer replacement: ${escapeHTML(tech.counter)}</div>
  `;
}

// ---------- Modal dynamics ----------
function clearModalTimers(): void {
  P.eventTimers.forEach(clearInterval);
  P.eventTimers.length = 0;
}
function startModalDynamics(group: DemoGroup, tech: Technique): void {
  const pressureBody = el('pressureBody');
  const pressureLayer = el('pressure-layer');
  if (!pressureBody || !pressureLayer) return;

  pressureBody.querySelectorAll('[data-dp-timer]').forEach(timerEl => {
    let n = Number((timerEl as HTMLElement).getAttribute('data-dp-timer')) || 38;
    const int = setInterval(() => {
      if (!pressureLayer.classList.contains('show')) return;
      n--;
      if (n <= 0) {
        if (tech.demo === 'reset_countdown' || group === 'scarcity') {
          n = Number((timerEl as HTMLElement).getAttribute('data-dp-timer')) || 38;
          fakeToast('Reset detected', 'The timer restarted instead of expiring.');
        } else n = 0;
      }
      const h = Math.floor(n / 3600), m = Math.floor((n % 3600) / 60), s = n % 60;
      timerEl.textContent = h > 0
        ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
        : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }, 1000);
    P.eventTimers.push(int);
  });

  const stock = pressureBody.querySelector('.dp-stock');
  if (stock && group === 'scarcity') {
    let current = 3;
    const int = setInterval(() => {
      if (!pressureLayer.classList.contains('show')) return;
      current = Math.max(1, current - 1);
      stock.textContent = `Only ${current} left`;
    }, 6500);
    P.eventTimers.push(int);
  }
}

// ---------- Show / close ----------
function showTechnique(tech: Technique, reason: string): void {
  const pressureLayer = el('pressure-layer');
  const pressureBody = el('pressureBody');
  if (!pressureLayer || !pressureBody) return;

  P.active = { tech, reason };
  P.seen.add(tech.name);
  updateCounter();
  clearModalTimers();
  const group = groupOf(tech);
  pressureBody.innerHTML = renderModal(tech, group, reason);
  pressureLayer.classList.add('show');
  pressureLayer.setAttribute('aria-hidden', 'false');
  startModalDynamics(group, tech);
}

function startActualGame(): void {
  startGame();
  P.round++;
  P.popCount = 0;
  P.fakeEnergy = Math.max(0, P.fakeEnergy - 2);
  scheduleGamePressure();
}

function closePressure(runAction = false): void {
  const pressureLayer = el('pressure-layer');
  if (!pressureLayer) return;
  clearModalTimers();
  pressureLayer.classList.remove('show');
  pressureLayer.setAttribute('aria-hidden', 'true');
  P.active = null;
  if (runAction && P.pendingStart) {
    P.pendingStart = false;
    startActualGame();
  }
  if (runAction && P.pendingMenu) {
    P.pendingMenu = false;
    quitToMenu();
  }
}

// ---------- Game event hooks ----------
function scheduleGamePressure(): void {
  setTimeout(() => {
    if (State.scene === 'game') showTechnique(techByGroup(['progression','scarcity']), 'Round-start system');
  }, 2300);
  setTimeout(() => {
    if (State.scene === 'game') showTechnique(techByGroup(['social','visual','ads']), 'Mid-round interruption');
  }, 8500);
  setTimeout(() => {
    if (State.scene === 'game') showTechnique(techByGroup(['economy','meta','gacha']), 'Pressure timed to session');
  }, 15000);
}

// ---------- Wire UI ----------
function wireUI(): void {
  const playBtn = el('playBtn');
  if (playBtn) {
    playBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      P.pendingStart = true;
      const first = P.seen.size === 0
        ? techByGroup('privacy')
        : techByGroup(['progression','scarcity','economy']);
      showTechnique(first, 'Pre-play onboarding');
    }, true);
  }

  const goAgainBtn = el('goAgainBtn');
  if (goAgainBtn) {
    goAgainBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      P.pendingStart = true;
      showTechnique(techByGroup(['progression','battlepass','gacha','economy']), 'Post-round one-more-run');
    }, true);
  }

  const quitBtn = el('quitBtn');
  if (quitBtn) {
    quitBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      P.pendingMenu = true;
      showTechnique(techByGroup('exit'), 'Pause quit attempt');
    }, true);
  }

  const goMenuBtn = el('goMenuBtn');
  if (goMenuBtn) {
    goMenuBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      P.pendingMenu = true;
      showTechnique(techByGroup('exit'), 'Results exit attempt');
    }, true);
  }

  const chip = el('system-progress-chip');
  if (chip) chip.addEventListener('click', () => showTechnique(pick(), 'Manual next system'));

  const closeBtn = el('pressureClose');
  if (closeBtn) closeBtn.addEventListener('click', () => closePressure(false));

  const pressureLayer = el('pressure-layer');
  if (pressureLayer) {
    pressureLayer.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target === pressureLayer) {
        const current = P.active?.tech;
        if (current && groupOf(current) !== 'exit') showTechnique(techByGroup('exit'), 'Backdrop exit attempt');
        else closePressure(false);
        return;
      }
      const actionEl = target.closest('[data-pressure-action]') as HTMLElement | null;
      const action = actionEl?.getAttribute('data-pressure-action');
      if (!action) return;
      if (action === 'primary') {
        fakeToast('Simulated action', P.active ? `${P.active.tech.name} accepted; no real transaction occurred.` : 'No real transaction occurred.');
        closePressure(true);
      } else if (action === 'secondary') {
        fakeToast('Safer choice', 'Alternative path selected.');
        closePressure(P.pendingStart || P.pendingMenu);
      } else {
        closePressure(false);
      }
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyT' && !e.repeat) showTechnique(pick(), 'Keyboard next system');
    if (e.code === 'KeyR' && !e.repeat) {
      P.seen.clear(); P.idx = 0; updateCounter();
      fakeToast('Reset', 'Season systems counter reset.');
    }
  });
}

// ---------- Hook into game events ----------
export function initDirector(): void {
  const prevPop = Hooks.onPopBall;
  Hooks.onPopBall = (x, y, color, points) => {
    if (prevPop) prevPop(x, y, color, points);
    P.popCount++;
    P.chestProgress = Math.min(99, P.chestProgress + 1);
    if (P.popCount % 10 === 0) {
      setTimeout(() => {
        if (State.scene === 'game') showTechnique(techByGroup(['progression','gacha','visual']), 'Reward moment');
      }, 120);
    }
  };

  const prevWave = Hooks.onNextWave;
  Hooks.onNextWave = (wave) => {
    if (prevWave) prevWave(wave);
    P.passProgress = Math.min(99, P.passProgress + 2);
    setTimeout(() => {
      if (State.scene === 'game') showTechnique(techByGroup(['battlepass','scarcity','social']), 'Wave-clear reward');
    }, 900);
  };

  const prevGameOver = Hooks.onGameOver;
  Hooks.onGameOver = (score, wave) => {
    if (prevGameOver) prevGameOver(score, wave);
    setTimeout(() => showTechnique(techByGroup(['battlepass','exit','gacha','progression']), 'Results wrapper'), 900);
  };

  const prevLoseLife = Hooks.onLoseLife;
  Hooks.onLoseLife = () => {
    if (prevLoseLife) prevLoseLife();
    setTimeout(() => {
      if (State.scene === 'game') showTechnique(techByGroup(['progression','economy','meta']), 'Loss recovery moment');
    }, 520);
  };

  // Wire UI on next tick so DOM is ready
  setTimeout(() => {
    wireUI();
    updateCounter();
    startFeed();

    // Initial activity feed items
    setTimeout(() => fakeToast('Daily ready', 'Login bonus +100 coins'), 1100);
    setTimeout(() => addRiver('Sarah', 'bought Diamond VIP'), 2700);
    setTimeout(() => addRiver('Emma', 'opened Mythic Harpoon'), 4700);
    // First pressure modal – privacy consent (matches dp.html behaviour)
    setTimeout(() => showTechnique(techByGroup('privacy'), 'First session prompt'), 1300);

    // Expose for browser console inspection
    (window as unknown as Record<string, unknown>)['RicochetSystems'] = {
      total: TECHNIQUES.length,
      showNext: () => showTechnique(pick(), 'Console next system'),
      runAllFast: () => {
        let i = 0;
        const int = setInterval(() => {
          if (i++ >= TECHNIQUES.length) { clearInterval(int); return; }
          showTechnique(pick(), 'Automated 166-system tour');
        }, 950);
      },
    };

    console.info('[RicochetSystems] baked techniques:', TECHNIQUES.length);
  }, 0);
}
