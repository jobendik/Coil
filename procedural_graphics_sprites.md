Are there other graphical elements that could benefit from being a sprite/png instead of procedural generated?

10:23 PM

Inventoried renderable elements and weighed sprite conversion tradeoffs
Inventoried renderable elements and weighed sprite conversion tradeoffs
Good question — and the useful reframe is that "sprite" can mean two different things here, with very different cost profiles:

A downloaded PNG/atlas — costs download budget, can't be recolored cheaply. Best for static, complex, non‑theme‑colored art.
A runtime offscreen‑canvas pre‑render — drawn once at startup (or per skin color) into an offscreen <canvas>, then stamped with drawImage every frame. Zero download, and it's the real win for your codebase because almost everything recolors with the skin/world.
The actual performance villain in COIL isn't "procedural shapes," it's shadowBlur × instance count. Every glowing node, particle, and orb re‑rasterizes its blur every frame. So the highest‑leverage move is pre‑rendering the glow once and stamping it — which matters most for things drawn many times per frame, and barely at all for single‑instance things.

Tier 1 — clear wins (do these):
-----------------------------------
Particles: coins, embers, sparkles, confetti. This is the biggest one. Your spinning coin does multiple ellipses + shadowBlur per coin, up to 140 of them; embers and sparkles are similar. A tiny atlas (coin, spark, ember — a 64–128px PNG, ~10–30 KB, or just offscreen‑rendered) drawn with drawImage is dramatically cheaper and can look more metallic. Coins/embers are fixed‑color so they're trivial; sparkles/confetti need tinting (see below).
Node glow → offscreen cache. Pre‑render a white radial‑glow disc once, stamp it tinted per node, and keep only the animated target rings/chevrons/fracture procedural on top. You have ~15–30 nodes on screen, each currently building a radial gradient + shadowBlur every frame — this kills that.

Tier 2 — visual‑quality wins (little/no perf gain, but they look better):
---------------------------------
The COIL logo — a real rendered chrome/3D PNG will beat my canvas‑faked gradient. It's static, never recolored, drawn once. ~50–150 KB.
The background nebula — covered last turn; also faster than the procedural clouds.
Spikes — fixed red, several can be on screen, currently an 8‑point star path + blur per spike. A small sprite rotated via drawImage is cheaper and can look nastier.


Tier 3 — keep procedural (sprites would be worse):
-------------------------------
Player creature, gate ring, void/lava, trail ribbons — these animate heavily and recolor and are single‑instance (or one ribbon). Baking them loses the recoloring and the expression/squash/wave animation for essentially zero perf gain, since each is drawn once per frame.
Vector UI icons (toggles, mission glyphs) — cheap and state‑colored. Leave them.
The tinting trick (what unblocks sprite‑izing all your colored stuff): keep one white sprite, then cache a tinted copy per needed color in a Map — render the white sprite into a small offscreen canvas, then globalCompositeOperation = 'source-in' + a fill rect. You only have a handful of skin/world colors, so it's a one‑time cost and every stamp afterward is a plain drawImage.

Net for CrazyGames: favor offscreen pre‑rendering (zero download) for the recoloring stuff (nodes, particles), and reserve actual downloaded PNGs for the background and the logo, where a true render genuinely beats canvas. That keeps your initial‑download story intact while removing most of the per‑frame shadowBlur cost that throttles low‑end devices.