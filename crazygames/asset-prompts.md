# COIL — asset generation prompts

Paste-ready prompts for the **3 thumbnail variants** to A/B-test, plus in-game
screenshots. Works with Midjourney, DALL·E 3, or SDXL (notes per tool at the end).

> **Why 3 variants?** Thumbnail CTR is the #1 driver of CrazyGames traffic and it's
> measurable in the dashboard. Ship all three, watch CTR for a few days, keep the
> winner. Each is a different *bet* (identity / action / cuteness).

---

## 0. Character + world reference (read first)

Keep every image on-model so the store, thumbnail, and game feel like one product.

**The hero — "Pulse," a tiny cosmic creature:**
- A glossy, glowing **orb** (not a planet, not a ball-with-a-logo) in **cyan
  `#2ff3e0`** with a soft outer glow/bloom in the same hue.
- A **simple cute face**: two round white eyes with small dark-navy pupils,
  looking up/forward with determination; a single bright specular highlight
  upper-left. Think "Kirby-meets-neon-spark," friendly and readable at tiny size.
- A **comet ribbon of light** trailing behind it, arcing **upward**.

**The world:**
- **One glowing orbit gate** — a thin neon ring/arc the creature is flinging from,
  with a brighter white segment (the "perfect" window). Singular and elegant.
- Backdrop: deep cosmic **near-black to indigo** (`#04030a → #160e33`) with a few
  soft nebula glows and tiny stars. A vertical sense of *climbing upward*.

**Palette (use 2–3 max per image, high contrast on dark):**
`#2ff3e0` cyan · `#ff4d8d` magenta · `#ffd24a` gold · `#a76bff` violet ·
backdrop `#04030a` / `#160e33`. Optional hot bottom glow `#ff3b5c`.

**Hard rules for ALL thumbnails (CrazyGames grid):**
- **No text, no logos, no UI/HUD** (the platform overlays its own title).
- **High contrast**, punchy glow, reads in ~256 px against a dark grid.
- **Focal point dead-center and crop-safe** — assume a centered square crop on mobile.
- **Differentiate from Sticky Orbit:** show **ONE creature + ONE neon gate + a
  vertical climb** — NOT a cluster of planets and NOT a giant sun.

---

## Variant A — "Identity" (recommended first test)

*Intent: sell the character + the mechanic in one clean, premium hero shot.*

**Prompt:**
```
Mobile game cover art, a single adorable glowing cyan orb creature with two big
shiny eyes and a happy determined face, a glossy specular highlight, wrapped in a
neon energy glow, mid-leap from a thin glowing magenta orbit-gate ring, a bright
comet trail of light arcing upward behind it, deep cosmic background of near-black
to dark indigo with soft purple nebula and tiny sparkling stars, vertical upward
motion, vibrant neon cyan and magenta on black, high contrast, bloom, clean
modern flat-3D vector style, centered composition, crisp, polished, juicy arcade
game key art, 16:9
```
**Negative:** `text, words, logo, watermark, UI, HUD, buttons, multiple planets,
realistic planet, large sun, cluttered, busy background, low contrast, muddy`
**Size:** 1600×900 (16:9 cover) + a 1024×1024 center crop for mobile.

---

## Variant B — "Action / speed"

*Intent: convey the thrilling fling + climb; motion energy for clickers who want a rush.*

**Prompt:**
```
Dynamic mobile arcade key art, a cute glowing cyan orb creature with bright eyes
streaking diagonally upward at high speed, a long luminous gold-and-cyan comet
trail blazing behind it, motion blur and speed lines, launching off a glowing neon
orbit-gate ring that sparks with light, deep dark cosmic backdrop with nebula haze
and stars rushing past, a faint hot magenta glow far below hinting at danger,
strong sense of upward velocity and escape, neon cyan gold and magenta on near-
black, very high contrast, bloom and glow, energetic, polished flat-3D vector
arcade style, centered hero, 16:9
```
**Negative:** `text, words, logo, watermark, UI, HUD, multiple planets, big sun,
realistic, cluttered, dull colors, low contrast`
**Size:** 1600×900 + 1024×1024 center crop.

---

## Variant C — "Cuteness / collection"

*Intent: maximize charm; bet that an irresistibly cute face wins the click and signals "collect me."*

**Prompt:**
```
Close-up mascot key art, an irresistibly cute glowing orb creature face-forward,
big sparkling eyes, tiny happy expression, glossy highlight, radiant cyan neon
aura, a faint glowing orbit-gate ring framing it like a halo, two or three smaller
softly-glowing orb creatures in different neon colors (magenta, gold, violet)
blurred in the background to suggest a collectible cast, deep dark cosmic backdrop
with bokeh nebula and stars, adorable premium mascot branding, neon palette on
near-black, high contrast, bloom, clean flat-3D vector style, centered, 16:9
```
**Negative:** `text, words, logo, watermark, UI, HUD, planets, sun, scary, realistic,
cluttered, low contrast, dull`
**Size:** 1600×900 + 1024×1024 center crop.

> Tip: Variant C's background "cast" telegraphs the Collection — a hook Sticky
> Orbit doesn't have. If it tests well, it doubles as marketing for your meta-game.

---

## Screenshots (3–5 for the gallery)

Real gameplay sells the loop; capture from the actual build, or generate to match.
Lead with the most satisfying frames.

1. **The perfect tap** — creature on the glowing gate, the bright white "perfect"
   segment lit, a combo number popping.
2. **Frenzy / big combo** — screen erupting with light rays + confetti at x8+.
3. **The rising lava** — creature climbing with the churning molten void + embers
   below (tension).
4. **The Collection screen** — the rarity-tiered card grid (shows depth/progression).
5. **Zen mode** — calm, no lava, ambient palette (shows breadth).

**Generation prompt (if not screenshotting):**
```
Vertical mobile arcade game screenshot, a cute glowing cyan orb creature orbiting a
neon gate ring with a bright perfect-timing arc, glowing nodes climbing upward,
light particle bursts and a combo popping, churning magenta lava glow at the
bottom with rising embers, deep cosmic nebula background, neon cyan magenta gold,
high contrast, bloom, polished flat-3D vector arcade style, 9:16
```
**Size:** 1080×1920 (9:16) — matches the portrait play field.

---

## Tool notes
- **Midjourney:** append `--ar 16:9 --style raw --stylize 250`; for the square crop
  use `--ar 1:1`. Add `--no text, planets, sun` for negatives.
- **DALL·E 3 (ChatGPT):** paste the prompt as-is; explicitly add "no text or
  letters anywhere in the image."
- **SDXL / local:** use the prompt + the **Negative** line verbatim; CFG ~6–8,
  a "neon glow / vector" LoRA helps; upscale to the target size.

## Final checklist before upload
- [ ] No text/letters anywhere in any thumbnail.
- [ ] Focal point survives a centered **square** crop (mobile grid).
- [ ] Reads clearly at ~256 px (zoom out to check).
- [ ] Looks **distinct from "planets + sun"** at a glance.
- [ ] On-model: cyan creature with a face + a single neon gate + upward climb.
- [ ] Confirm exact pixel dimensions in the CrazyGames dashboard upload fields.
