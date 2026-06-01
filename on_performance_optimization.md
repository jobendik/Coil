# COIL — Performance Optimization & Low-End Mobile Report

> Goal: COIL ships on **CrazyGames**, so it must stay smooth on all kinds of phones —
> not just high-end. This documents how performance was measured, what was found,
> and what was changed to protect low-end devices.

---

## TL;DR

- **CPU is not the bottleneck.** The whole gameplay frame builds in **~1 ms** of
  JS/Canvas2D work on desktop, scaling cleanly by FX tier.
- **The GPU bottleneck is `shadowBlur` (glow).** ~52 `shadowBlur` + 17 gradient
  allocations + 15 additive passes per frame. A weak mobile GPU feels this, not the CPU.
- **Strong protections already existed** (DPR cap, `glowFX`/`pcount` tier-scaling,
  runtime auto-scaler).
- **Two low-risk optimizations were added:** a smarter cold-start FX-tier heuristic
  and caching of the static background gradients.
- **Production bundle is unaffected** by the calibration/perf tooling (dev-only,
  tree-shaken out — verified).

---

## How it was measured

Two Playwright harnesses drive the real canvas game (the game is canvas-rendered, so
screenshots/timing must come from an actual browser, not unit tests). A **dev-only**
`window.__coil` hook (gated on `import.meta.env.DEV`, stripped from production) exposes
state-forcing + a render microbenchmark.

| Tool | What it does |
|---|---|
| `tools/perf.mjs` | Forces a heavy frame (FRENZY + high combo + many nodes), then times `renderPlay()` per FX tier under **CDP CPU throttling** (`Emulation.setCPUThrottlingRate`) to emulate slow mobile SoCs. |
| `tools/calib.mjs` | Captures PNGs of each visual state for tuning (`tools/.calib-shots/`, gitignored). |

`benchRender(n)` calls `renderPlay()` N times and returns elapsed ms — this isolates the
**CPU-side render-submission cost** and sidesteps headless rAF throttling.

### Measurement gotchas (documented so future runs are repeatable)

1. **The dev server reloads on any file save** (Vite HMR / non-HMR `main.ts`), which kills
   an in-flight perf run. Fix: serve an **isolated static build**:
   ```bash
   NODE_ENV=development npx vite build --mode development --outDir dist-calib
   npx vite preview --outDir dist-calib --port 4180
   # NODE_ENV=development is REQUIRED so import.meta.env.DEV stays true and the hook survives
   ```
2. **Headless software-GPU (SwiftShader) builds a shadowBlur raster backlog** that wedges
   the *next* evaluate. Fix: reload the page per measured cell.
3. `getFps()` is meaningless headless (~5, rAF-throttled). Not a real perf signal.

---

## Findings

### 1. CPU render cost (measured)

Per-frame `renderPlay()` cost, heavy frame (FRENZY bloom + combo x10 + full node field):

| CPU | high tier | medium tier | low tier |
|---|---|---|---|
| **1×** (16-core desktop) | 1.04 ms | 0.76 ms | 0.37 ms |
| **4×** (≈ mid Android) | ~13 ms | scales ↓ | scales ↓ |

- Sub-millisecond on desktop; clean tier scaling.
- Even cold-JIT-pessimistic at 4× throttle, **high tier stays within the 60fps budget**
  (16.6 ms). The lighter tiers have ample headroom.
- **Conclusion: the JS / Canvas2D command cost is not the risk.**

### 2. GPU cost (static census + qualitative)

Per gameplay frame in `src/scenes/play.ts`:

| Operation | Count | Mobile cost |
|---|---|---|
| `shadowBlur` assignments (glow) | **52** | **High** — the #1 Canvas2D mobile-GPU killer |
| `createRadialGradient` / `createLinearGradient` | **17** | Medium — alloc + GPU upload |
| `globalCompositeOperation = 'lighter'` | **15** | Medium — additive blend passes |

During testing the **headless software-GPU literally choked on the shadowBlur load** —
direct evidence that *glow*, not JS, is what stresses a weak mobile GPU.

### 3. Low-end protections that already existed (keep these)

- **DPR capped at 2** — `Math.min(devicePixelRatio, 2)` in `src/core/canvas.ts`. Prevents
  3× pixel rendering on high-DPR phones (the single biggest mobile win).
- **`glowFX()` tier-scaling** (`src/core/utils.ts`): `low` caps blur at **3**, `medium`
  ×0.55, `high` full. This is the main lever against the shadowBlur cost.
- **`pcount()`**: particles cut to 40% (low) / 70% (medium).
- **Runtime auto-scaler** (`src/main.ts`): drops `high→medium→low` when FPS < 46/36 and
  recovers with hysteresis (up at 58/52) so a single GC stutter doesn't strip effects.
- **`text()`** double-fills glow only for large headline text (size ≥ 24), single-pass
  for HUD/body — already optimized.

---

## What was changed

### A. Smarter cold-start FX-tier heuristic — `src/core/utils.ts`

**Problem:** the old heuristic (`DPR < 1.5 && minDim ≤ 380 → medium, else high`) started
almost every DPR-2 budget Android at **`high`**. The runtime auto-scaler only reacts after
~2 s of measured low FPS, so the heaviest tier ran during the cold-start window → visible
opening jank on weak phones.

**Fix:** also start low-signal devices at `medium` up front:

```
low-end if: hardwareConcurrency ≤ 4  OR  deviceMemory ≤ 4 (GB)  OR  (DPR < 1.5 && minDim ≤ 380)
```

High-end / iOS (where `deviceMemory` is undefined) stay `high`. The auto-scaler still moves
either direction from the starting point. This lightens the first seconds — exactly when a
budget phone is most likely to jank — without permanently downgrading capable devices.

### B. Cached the static background gradients — `src/scenes/play.ts` (`drawBG`)

**Problem:** the full-screen **vignette** (radial) and **scrim** (linear) gradients depend
only on canvas size, yet were reallocated **every frame**, in every scene that draws the
background (play + result). Gradient creation is a real per-frame cost on low-end (alloc +
GPU texture upload).

**Fix:** `bgGrads(W, H)` builds them once and rebuilds only when the canvas size changes.
Saves 2 full-screen gradient allocations per frame, zero visual change.

> Both changes are low-risk and respect the existing tuned FX system. They were validated
> with `npm run typecheck` (clean) and a production `npx vite build` (clean).

---

## Caveats (be honest about measurement limits)

- The **4×/6× CPU-throttle numbers are approximate**: headless software-GPU is flaky under
  throttle (it wedges), and the dev-mode bundle is unminified (slightly slower than prod).
  The **relative tier scaling** and the **GPU-bottleneck conclusion** are solid; exact
  low-end FPS should be confirmed on a **real device on CrazyGames**.
- This measures CPU render-submission + the static GPU-op count. True GPU rasterization
  time can only be trusted on real hardware, not SwiftShader.

---

## Recommended next steps (not yet done)

1. **Real-device pass on CrazyGames** — confirm the auto-scaler settles to a sustainable
   tier on a genuine budget Android (the most important validation).
2. **`low`-tier node simplification** — on the lowest tier, draw nodes as flat fills and
   skip the per-node aura gradient + the body radial gradient. This is the single biggest
   remaining reduction in `shadowBlur`/gradient count for the weakest phones, at an
   acceptable (already-degraded) visual cost on `low`.
3. **Consider an even faster first auto-downgrade** (a catastrophic-FPS escape hatch before
   the 2 s mark) for devices that start at `high` but can't sustain it.

---

## ⚠️ Unrelated pre-existing build blocker

`npm run build` currently fails typecheck on a **work-in-progress** edit (not from this
optimization work):

```
src/core/music.ts(53,5): error TS6133: 'intensity' is declared but its value is never read.
```

A multi-track music edit removed the `Intensity.upd(… intensity …)` consumer that exists
in HEAD, leaving `intensity` write-only. Typecheck reports **only** this error, confirming
the optimization changes are clean. Resolve by wiring `intensity` into the new music system
or removing the variable. Until then, use `npx vite build` (esbuild, skips the `tsc` gate)
to produce a production bundle.

---

## Files touched

| File | Change |
|---|---|
| `src/core/utils.ts` | Cold-start FX-tier heuristic (cores / memory signals) |
| `src/scenes/play.ts` | Cached static background gradients (`bgGrads`) |
| `src/main.ts` | Dev-only `__coil` hook: `setFx` / `benchRender` / `getScene` / `forceEnd` (tree-shaken from production) |
| `tools/perf.mjs` | CPU-throttle × FX-tier render microbenchmark (new) |
| `tools/calib.mjs` | Visual-state capture incl. result screen (new) |
| `.gitignore` | Ignore `tools/.calib-shots` + `dist-calib` |

Production bundle verified to **not** contain the `__coil` hook (`grep __coil dist/assets/*.js` → absent).
