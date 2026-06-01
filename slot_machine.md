The "Tiny Mythic Rate" Animated Horizontal Panel — Explained
This is a fake slot-machine reel built entirely in HTML/CSS/JS. Here's every layer of it.

1. What it does visually
A horizontal container acts as a viewport with overflow: hidden. Inside it, a row of reward tiles (Common, Rare, Epic, Mythic) slides from right to left using a CSS @keyframes animation. The animation decelerates at the end so that it stops with a non-Mythic tile under the glowing center-line — Mythic is visible just past the line, creating a near-miss effect.

2. The HTML (from src/systems/director.ts, gachaHTML())
HTML
<div class="dp-card hot">
  <small>Mystery box</small>
  <h3>Mythic chance 0.1%</h3>

  <!-- THE ANIMATED PANEL -->
  <div class="dp-wheel">
    <div class="dp-track">
      <div class="dp-reward">Common</div>
      <div class="dp-reward">Rare</div>
      <div class="dp-reward">Epic</div>
      <div class="dp-reward mythic">Mythic</div>  <!-- glowing pink tile -->
      <div class="dp-reward">Epic</div>
      <div class="dp-reward">Rare</div>
      <div class="dp-reward mythic">Mythic</div>
      <div class="dp-reward">Epic</div>
      <div class="dp-reward">Common</div>
    </div>
  </div>

  <p><b style="color:var(--mag)">So close to Mythic!</b> The near-miss presentation is the demonstration.</p>

  <!-- PITY COUNTER -->
  <div class="dp-row"><span>Pity progress</span><b>87/100</b></div>
  <div class="dp-row"><span>10-pull value</span><b>Better deal</b></div>
</div>
Key choices in the tile sequence: Mythic appears at index 3 (position ~4), so after sliding -610px, the animation naturally stops at Epic/Common — Mythic just slipped past. This is intentional to produce the near-miss.

3. The CSS (from src/styles/sim.css)
CSS
/* The viewport — clips everything outside it */
.dp-wheel {
  height: 104px;
  border: 1px solid rgba(255,255,255,.09);
  border-radius: 15px;
  display: flex;
  align-items: center;
  overflow: hidden;           /* ← hides tiles outside the window */
  background: rgba(0,0,0,.18);
  position: relative;
}

/* The glowing green center-line indicator */
.dp-wheel::before {
  content: "";
  position: absolute;
  left: 50%;
  top: 0; bottom: 0;
  width: 2px;
  background: var(--lime);          /* bright green */
  box-shadow: 0 0 16px var(--lime); /* glow */
  z-index: 1;
}

/* The scrolling row of tiles — this is what animates */
.dp-track {
  display: flex;
  gap: 8px;
  animation: dpSpin 2.6s cubic-bezier(.12,.82,.16,1) forwards;
  /*                ↑ duration  ↑ easing (fast out, slow stop)  ↑ freeze at end */
}

/* Each individual reward tile */
.dp-reward {
  min-width: 105px;
  height: 72px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.09);
  display: grid;
  place-items: center;
  font-family: 'Antonio', sans-serif;
  text-transform: uppercase;
  background: rgba(255,255,255,.04);
}

/* Special Mythic tile styling */
.dp-reward.mythic {
  color: #ffd6e2;
  border-color: rgba(255,45,117,.42);
  background: rgba(255,45,117,.15);
  box-shadow: 0 0 22px rgba(255,45,117,.18); /* pink glow */
}

/* The keyframe: starts slightly right (+30px), ends far left (-610px) */
@keyframes dpSpin {
  0%   { transform: translateX(30px); }
  100% { transform: translateX(-610px); }
}
The easing curve cubic-bezier(.12,.82,.16,1) is the key: it starts fast (feels like a real spin) then decelerates sharply at the end — like a physical reel slowing to a stop. This makes the near-miss feel earned and dramatic rather than instant.

4. The pity counter (separate, static)
Below the reel, the "pity" row shows current progress toward a guaranteed win:

HTML
<div class="dp-row"><span>Pity progress</span><b>87/100</b></div>
The .dp-row CSS is just display: flex; justify-content: space-between. This number is hardcoded in the demo but in a real game would be driven by state (e.g., pulls % 100).

5. Summary for your GPT
Tell the GPT to build this pattern:

Horizontal animated progress panel — a fixed-width container with overflow: hidden and a centered indicator line (CSS ::before pseudo-element). Inside it, a display: flex row of item tiles animates using CSS @keyframes from a positive translateX (e.g. +30px) to a large negative translateX (e.g. -610px), using a decelerating cubic-bezier easing over ~2.5s with animation-fill-mode: forwards so it freezes at the final frame. The tile width (~105px) plus gap (~8px) means each tile takes ~113px, so the ending translateX determines which tile lands under the center line. Special tiles (like Mythic/legendary) get a glowing border and tinted background. A separate <div> row below shows the pity/progress counter as a plain label + value pair.

The minimal parameters to give the GPT for your game:

Tile size (width × height)
Tile labels/icons (your item names/rarities)
Special tile class (your equivalent of .mythic — which tile should glow)
Which tile should land under the center line (controls the end translateX value — calculate as: (index × (tileWidth + gap)) - (containerWidth / 2 - tileWidth / 2))
Progress counter labels (e.g., "Streak progress", "15/20")
Now I have everything I need. Here's the full explanation:

The "Tiny Mythic Rate" Animated Horizontal Panel — Explained
This is a fake slot-machine reel built entirely in HTML/CSS/JS. Here's every layer of it.

1. What it does visually
A horizontal container acts as a viewport with overflow: hidden. Inside it, a row of reward tiles (Common, Rare, Epic, Mythic) slides from right to left using a CSS @keyframes animation. The animation decelerates at the end so that it stops with a non-Mythic tile under the glowing center-line — Mythic is visible just past the line, creating a near-miss effect.

2. The HTML (from src/systems/director.ts, gachaHTML())
HTML
<div class="dp-card hot">
  <small>Mystery box</small>
  <h3>Mythic chance 0.1%</h3>

  <!-- THE ANIMATED PANEL -->
  <div class="dp-wheel">
    <div class="dp-track">
      <div class="dp-reward">Common</div>
      <div class="dp-reward">Rare</div>
      <div class="dp-reward">Epic</div>
      <div class="dp-reward mythic">Mythic</div>  <!-- glowing pink tile -->
      <div class="dp-reward">Epic</div>
      <div class="dp-reward">Rare</div>
      <div class="dp-reward mythic">Mythic</div>
      <div class="dp-reward">Epic</div>
      <div class="dp-reward">Common</div>
    </div>
  </div>

  <p><b style="color:var(--mag)">So close to Mythic!</b> The near-miss presentation is the demonstration.</p>

  <!-- PITY COUNTER -->
  <div class="dp-row"><span>Pity progress</span><b>87/100</b></div>
  <div class="dp-row"><span>10-pull value</span><b>Better deal</b></div>
</div>
Key choices in the tile sequence: Mythic appears at index 3 (position ~4), so after sliding -610px, the animation naturally stops at Epic/Common — Mythic just slipped past. This is intentional to produce the near-miss.

3. The CSS (from src/styles/sim.css)
CSS
/* The viewport — clips everything outside it */
.dp-wheel {
  height: 104px;
  border: 1px solid rgba(255,255,255,.09);
  border-radius: 15px;
  display: flex;
  align-items: center;
  overflow: hidden;           /* ← hides tiles outside the window */
  background: rgba(0,0,0,.18);
  position: relative;
}

/* The glowing green center-line indicator */
.dp-wheel::before {
  content: "";
  position: absolute;
  left: 50%;
  top: 0; bottom: 0;
  width: 2px;
  background: var(--lime);          /* bright green */
  box-shadow: 0 0 16px var(--lime); /* glow */
  z-index: 1;
}

/* The scrolling row of tiles — this is what animates */
.dp-track {
  display: flex;
  gap: 8px;
  animation: dpSpin 2.6s cubic-bezier(.12,.82,.16,1) forwards;
  /*                ↑ duration  ↑ easing (fast out, slow stop)  ↑ freeze at end */
}

/* Each individual reward tile */
.dp-reward {
  min-width: 105px;
  height: 72px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.09);
  display: grid;
  place-items: center;
  font-family: 'Antonio', sans-serif;
  text-transform: uppercase;
  background: rgba(255,255,255,.04);
}

/* Special Mythic tile styling */
.dp-reward.mythic {
  color: #ffd6e2;
  border-color: rgba(255,45,117,.42);
  background: rgba(255,45,117,.15);
  box-shadow: 0 0 22px rgba(255,45,117,.18); /* pink glow */
}

/* The keyframe: starts slightly right (+30px), ends far left (-610px) */
@keyframes dpSpin {
  0%   { transform: translateX(30px); }
  100% { transform: translateX(-610px); }
}
The easing curve cubic-bezier(.12,.82,.16,1) is the key: it starts fast (feels like a real spin) then decelerates sharply at the end — like a physical reel slowing to a stop. This makes the near-miss feel earned and dramatic rather than instant.

4. The pity counter (separate, static)
Below the reel, the "pity" row shows current progress toward a guaranteed win:

HTML
<div class="dp-row"><span>Pity progress</span><b>87/100</b></div>
The .dp-row CSS is just display: flex; justify-content: space-between. This number is hardcoded in the demo but in a real game would be driven by state (e.g., pulls % 100).

5. Summary for your GPT
Tell the GPT to build this pattern:

Horizontal animated progress panel — a fixed-width container with overflow: hidden and a centered indicator line (CSS ::before pseudo-element). Inside it, a display: flex row of item tiles animates using CSS @keyframes from a positive translateX (e.g. +30px) to a large negative translateX (e.g. -610px), using a decelerating cubic-bezier easing over ~2.5s with animation-fill-mode: forwards so it freezes at the final frame. The tile width (~105px) plus gap (~8px) means each tile takes ~113px, so the ending translateX determines which tile lands under the center line. Special tiles (like Mythic/legendary) get a glowing border and tinted background. A separate <div> row below shows the pity/progress counter as a plain label + value pair.

The minimal parameters to give the GPT for your game:

Tile size (width × height)
Tile labels/icons (your item names/rarities)
Special tile class (your equivalent of .mythic — which tile should glow)
Which tile should land under the center line (controls the end translateX value — calculate as: (index × (tileWidth + gap)) - (containerWidth / 2 - tileWidth / 2))
Progress counter labels (e.g., "Streak progress", "15/20")