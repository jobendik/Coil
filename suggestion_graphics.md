Graphics / Design Improvement Suggestion for Coil

The current game has a clean and readable minimalist arcade style, but visually it still feels a little too quiet and prototype-like in normal gameplay. The core loop is good: a small cyan character swings/jumps between glowing orbs while lava slowly rises below. The main improvement should be to make the game feel more premium, more juicy, and more emotionally engaging, while preserving clarity and performance.

The goal is not to redesign the whole game into a complex illustrated world. The goal is to make the existing style feel more polished, more high-contrast, and more satisfying.

1. Make the player character more visible and lovable

The player character is the emotional anchor of the game. Right now it is cute, but too small and too subtle during gameplay.

Improve it by making the character visually larger without necessarily changing the gameplay hitbox.

Recommended changes:

Increase the rendered size of the player by around 20–35%.
Keep the collision radius unchanged or only slightly adjusted.
Make the eyes larger and higher contrast.
Add a stronger cyan outer glow.
Add a glossy highlight on the top-left of the body.
Add a more expressive face:
normal focused expression during play
happy expression after perfect hits
excited expression during Frenzy
worried/panic expression when lava is close
Make the trail brighter, smoother, and more comet-like.

The player should read clearly even on a small mobile screen. The user should immediately recognize it as a character, not just a glowing dot.

2. Improve the target orbs

The gameplay depends on the player understanding where to go next. The orbs are readable now, but visually they are a bit plain.

Improve the orbs by giving them more visual hierarchy.

Recommended changes:

Give normal orbs a soft white/lavender core with a stronger outer glow.
Make the next active orb more visually important:
brighter glow
subtle pulsing ring
small sparkle particles
faint magnetic/target aura
Use color to communicate state:
normal orb: soft white/lavender
active/next orb: cyan or pink glow
perfect timing zone: bright white arc
combo/frenzy orb: gold or magenta accent
Add a tiny glossy highlight to each orb so they feel less flat.
Make orbs pulse gently over time.

The targets should feel magical and satisfying, but not become cluttered.

3. Increase overall contrast

The current game has a dark background and glowing elements, which is good, but the contrast can be pushed further.

Recommended changes:

Darken the background slightly, especially behind the player and orbs.
Increase the glow intensity on gameplay-critical objects.
Make the player, target orbs, and perfect arc stand out more clearly from the background.
Avoid making the entire screen equally bright. Use hierarchy:
Player
Current/next orb
Lava threat
Coins/particles
Background

The screen should instantly tell the player where to look.

4. Make the lava feel more threatening

Since lava is a real gameplay threat, it should be more visually present and emotionally important.

Recommended changes:

Add a warm orange/red glow from the bottom of the screen.
Add rising embers and heat particles.
Add subtle smoke or heat distortion near the lava line.
When the lava gets close, increase:
red screen-edge glow
ember density
low-frequency screen shake
warning pulse
Make the lava feel alive: slow waves, bubbling, molten cracks, sparks.

The lava should not cover too much of the play area, but the player should always feel that it is coming.

5. Make Frenzy the visual highlight of the game

The Frenzy screenshot is already the strongest-looking part of the game. Lean into that. Frenzy should feel like a reward explosion.

Recommended changes:

Add a strong radial burst when Frenzy starts.
Add short slow-motion or freeze-frame impact when activated.
Add more satisfying coin spirals.
Add stronger confetti bursts.
Give the player a temporary super-aura.
Make the trail gold/cyan during Frenzy.
Add speed lines and subtle screen shake.
Make the background shift slightly brighter or more saturated during Frenzy.

Frenzy should feel like the moment players want to screenshot.

6. Improve the background without adding clutter

The background should stay dark and readable, but it can feel more premium.

Recommended changes:

Add subtle purple/cyan nebula gradients.
Add parallax star layers.
Add occasional shooting stars.
Add faint vertical streaks to reinforce upward movement.
Add very soft atmospheric glow behind the path of orbs.
Avoid heavy detail behind the center gameplay column.

The background should make the game feel cosmic and polished, but gameplay readability must remain the priority.

7. Keep procedural graphics, but consider a hybrid player sprite

Do not replace the entire game with sprites. Procedural graphics are a good fit for this game because the game is built around circles, glow, trails, particles, orbs, and timing feedback.

However, the player character could benefit from being a hybrid asset.

Recommended approach:

Use procedural rendering for:

orbs
trails
particles
lava
stars
coins
combo effects
shockwaves
UI feedback

Consider using a small high-quality sprite or pre-rendered image for:

the player’s face
the player orb body
different facial expressions

Best solution: hybrid rendering.
Use a polished sprite-like player character, then draw procedural glow, trail, particles, and effects around it.

This gives the game more character without losing flexibility.

8. Add more “juice” to every successful action

Every successful tap or perfect hit should feel rewarding.

Recommended changes:

On normal hit:

small shockwave from orb
short glow pulse
tiny particle burst
soft sound/visual sync
trail brightens briefly

On perfect hit:

stronger white flash arc
bigger shockwave
“perfect” particle sparkle
tiny camera punch
brighter trail
combo text pop

On near miss:

smaller, less rewarding feedback

On failure:

lava flare
player dissolve/pop effect
short dramatic screen shake

The game should feel physically responsive and emotionally satisfying.

9. Make the UI feel more integrated

The current UI is readable, but it can feel more like part of the game world.

Recommended changes:

Keep the distance number large and clear.
Add subtle glow to important text.
Make combo and Frenzy text animate with more impact.
Use consistent neon colors:
cyan for normal success
gold for Frenzy/reward
magenta/red for danger
Avoid too much permanent UI clutter.

The UI should support the arcade feel without covering the clean playfield.

10. Final visual direction

The target visual identity should be:

A cute cosmic one-tap climbing arcade game with glowing orbs, satisfying perfect chains, rising lava danger, and explosive Frenzy rewards.

The game should not look like a generic space background with circles. It should feel like a polished mobile arcade product with a clear mascot, strong contrast, juicy feedback, and a readable upward flow.

The most important improvements are:

Make the player character larger and more expressive.
Increase contrast and glow hierarchy.
Make target orbs more premium and state-based.
Make lava more threatening.
Make Frenzy much more spectacular.
Keep procedural effects, but consider a hybrid sprite/procedural player character.

The core gameplay can stay the same. The biggest opportunity is to make the game feel more alive, more rewarding, and more emotionally attractive.