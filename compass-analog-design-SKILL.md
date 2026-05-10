---
name: compass-analog-design
description: Analog design language and UX vibe spec for the Torque Coffee Compass App. Use this skill whenever modifying the Compass App's visual design, CSS, animations, transitions, or interactive feel. Also trigger when the user mentions "compass vibe," "analog feel," "puck physics," "compass design," or any styling work on the Compass App. Load this before writing any CSS or animation code for the Compass App.
---

# Compass App — Analog Design Language

## Design Philosophy

The Compass App's interaction — dragging a puck through a 2D space to tune a taste output — is literally what a mixing board does. The design doesn't borrow an analog metaphor; the UX already IS the metaphor. The visual layer's job is to make the surface match what the interaction already feels like.

The guiding principle: **reference the physics, not the appearance.** Never put a picture of a knob on screen. Make the puck behave like it has mass. Never texture a background to look like brushed aluminum. Use the lighting logic of brushed aluminum — where highlights fall, how shadows work.

### The Subliminal Test

After any design change, apply this test: if you removed all content and showed someone just the UI chrome, would they say "that's a music thing"? If yes, you've overshot. They should say "that feels nice to use" without being able to articulate why.

### The Gimmick Checklist — Never Include These

- Visible wood, leather, brushed metal, or carbon fiber textures
- Skeuomorphic knob ridges, screw heads, or stitching
- Retro color palettes (amber CRT, green-on-black, warm sepia)
- Pixel-art or dot-matrix-style text
- Reel-to-reel, cassette tape, turntable, or speaker imagery
- VU meter graphics (the physics of a VU meter is fair game; the picture is not)
- Any sound effects
- Serif fonts trying to look "vintage"
- Anything someone would screenshot saying "look at this cool retro design"

### Heritage Context

Torque Coffee operates from the Rock Palace building in City Heights, San Diego — home to Circle Sound Studios. The analog design cues are location heritage, not borrowed aesthetic. This is provenance, not cosplay.

---

## The Five Core Design Moves

These five changes are the 50% effort that delivers 90% of the analog vibe. They are CSS-only, require zero new assets, zero new JS, and have no measurable performance impact on mobile.

### 1. Puck Physics (Highest Priority)

The puck is the thing users touch. This is where "feels like a website" or "feels like an instrument" gets decided in the first 200ms of interaction.

**What makes it feel physical:**
- Dual-layer box-shadow: one tight (edge definition), one spread (lift off surface)
- Shadow uses warm tone, never pure black — pick up the puck's orange/amber color family
- Inner dimension via subtle radial-gradient (reads as slightly convex, not flat)
- On drag/touch: scale up slightly (1.04-1.06x) with fast transition (~60ms) — "lifting it off the surface"
- Shadow intensifies during drag (it's higher above the surface)
- On release: spring-settle back to resting state using cubic-bezier with slight overshoot (~120-140ms)
- Thin border in a slightly lighter warm tone for machined-edge feel

**CSS pattern:**
```css
/* Resting state */
box-shadow:
  0 1px 3px rgba(180, 120, 40, 0.25),
  0 6px 20px rgba(0, 0, 0, 0.35);
border: 1.5px solid rgba(255, 200, 100, 0.15);

/* Active/dragging state */
transform: scale(1.06);
box-shadow:
  0 1px 2px rgba(180, 120, 40, 0.3),
  0 10px 30px rgba(0, 0, 0, 0.45);
transition: transform 60ms ease-out, box-shadow 60ms ease-out;

/* Release settle */
transition: transform 140ms cubic-bezier(0.34, 1.3, 0.64, 1),
            box-shadow 140ms ease-out;
```

**Do not:** Add gloss/reflection, literal knob textures, or ridges to the puck.

### 2. Compass Surface Materiality

The compass background must not be a flat solid color. Flat color = screen. Material = instrument.

**Noise overlay** — add as a pseudo-element on the compass container:
```css
.compass-container::after {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0.025;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 128px 128px;
  z-index: 1;
  mix-blend-mode: overlay;
}
```

At 2-3% opacity with overlay blend mode, this is invisible to the conscious eye. The brain registers "material, not screen."

**Axis lines:** drop opacity to 0.2-0.25 range. They should be felt more than seen — like etched markings on an instrument face, not diagram lines.

**Do not:** Add visible grain texture, woodgrain, leather, or any named material imitation.

### 3. Spring Easing on Card Transitions

When coffee match postcards appear or update, use spring physics easing:

```css
transition: transform 350ms cubic-bezier(0.34, 1.4, 0.64, 1),
            opacity 250ms ease-out;
```

The 1.4 value creates slight overshoot — the card slides to position, overshoots ~3%, settles back. This is "mechanical object coming to rest."

Cards should enter with a translateY offset (8-12px) combined with opacity fade. Fading alone is screen behavior. Sliding into position is physical behavior.

**Do not:** Use `linear`, plain `ease`, or `ease-in-out` for card transitions. Never use bounce animations (too playful, reads as toy).

### 4. Button Depth

The "Get This Coffee" button (and any tappable elements) needs physical depth:

```css
/* Resting */
background: linear-gradient(to bottom,
  rgba(255, 255, 255, 0.08) 0%,
  rgba(255, 255, 255, 0.02) 100%);
border: 1px solid rgba(255, 255, 255, 0.15);
box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);

/* Pressed */
transform: translateY(1px);
background: linear-gradient(to bottom,
  rgba(255, 255, 255, 0.02) 0%,
  rgba(255, 255, 255, 0.06) 100%);
box-shadow: 0 0px 1px rgba(0, 0, 0, 0.15);
```

The gradient is barely visible — top edge catches slightly more "light" than bottom. Brain reads "surface, not rectangle." Active state reverses gradient and drops 1px with flattened shadow — the button "presses in."

### 5. Label Hierarchy as Instrument Markings

Two typographic layers that mirror how physical instruments label themselves:

**Axis labels** (LIVELY, SYRUPY, CLASSIC, MODERN): These are already uppercase and tracked out — good. They should be the quietest text element. Reduce opacity slightly. These are secondary scale markings.

**Feeling pair labels** (Crisp & Clean, Bright & Fruity, etc.): Warmer, more readable — these are the human-language layer. Optional: very subtle text-shadow matching quadrant color temperature at ~0.15 opacity, creating a "backlit from the surface" cue without looking like a backlit panel.

```css
text-shadow: 0 0 20px rgba([quadrant-color], 0.15);
```

---

## Color and Shadow Rules

These rules apply everywhere in the Compass App:

**Shadows are always warm-toned.** Never use pure black (`rgba(0,0,0,...)`  alone). Either use warm-shifted black (`rgba(20, 10, 0, ...)`) or tint the shadow toward the element's own color family.

**Multiple shadow layers preferred over single heavy shadows.** One tight for edge definition + one larger and diffused for elevation mimics real-world studio lighting.

**Quadrant color transitions must be smooth.** No instant snaps between quadrant colors. Color is signal, not surface — it should feel like light emanating from behind/below, not a flat background fill swapping.

**Border radius is restrained.** 4-8px for cards, 2-4px for smaller UI elements. Not sharp (too digital), not fully rounded (too app-like). The puck can be fully round — it's a knob.

**Borders feel machined.** Where they exist: thin (1px), slightly lighter or darker than adjacent surface, never high-contrast. Think seam line where two panels meet on equipment.

---

## What Was Deliberately Cut (Save for V2)

These add diminishing returns for real complexity cost:

- **Haptic feedback** — `navigator.vibrate()` doesn't work on iOS Safari. Half the audience is iPhone. Skip.
- **Momentum/coast on puck release** — adds JS complexity to drag handler for a cue most won't notice. Spring settle on release (CSS-only) gets 80% of the feel.
- **Quadrant color glow/ambient lighting** — GPU compositing layers can stutter on mid-range phones during drag.
- **Custom fonts** — loading a new font adds 20-80KB and a render-blocking request. Use whatever torque.coffee already uses.
- **Sound** — the moment you add a click or whoosh, it becomes a toy.
- **Noise texture if it causes rendering issues** — test on one device. If any frame drop during puck drag, kill it immediately. Visual subtlety is never worth interaction jank.

---

## Performance Constraints

The Compass App is primarily accessed via QR code scan in-store on customer phones (heavy iPhone mix). Every design decision must pass this filter:

- CSS-only solutions preferred over JS for all visual effects
- No new asset downloads (fonts, images, textures) — all effects must be inline CSS or inline SVG
- Test all transitions during active puck drag — if dragging stutters, the feature is cut regardless of how good it looks statically
- Total new CSS should be under 60 lines for the full analog layer
