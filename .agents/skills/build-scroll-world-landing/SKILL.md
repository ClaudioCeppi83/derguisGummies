---
name: build-scroll-world-landing
description: Builds high-converting Scroll World landing pages in Astro and Firebase Hosting from product images or keyframes using Google Gemini API (Imagen 3, Veo) and local ffmpeg All-Intra encoding. Use when creating scroll-driven video landing pages, converting static product photos into continuous camera transitions, or deploying Scroll World sites to Firebase.
---
# Build Scroll World Landing

End-to-end workflow and executable toolkit for transforming static product photography or studio keyframes into a 60fps scroll-driven landing page ("Scroll World") built with Astro and deployed on Firebase Hosting.

## Summary

This skill provides a deterministic 3-stage pipeline:
1. **Keyframe Normalization (`scripts/01-generate-keyframes.js`)**: Generates or normalizes 16:9 (`1920x1080`) studio keyframes in `.webp` format using Google Imagen 3 via `@google/genai`.
2. **First-to-Last Frame Video Synthesis (`scripts/02-generate-clips.js`)**: Interpolates smooth camera transitions between consecutive keyframes ($K_i \rightarrow K_{i+1}$) using Google Veo with cost estimation (`--dry-run`) and single-clip testing (`--spike`).
3. **All-Intra Scroll Encoding (`scripts/03-encode-scroll.sh`)**: Converts generated clips into scrub-ready `.mp4` and `.webm` files (`-g 1` keyframe on every frame, stripped audio) and extracts `.webp` frame sequences for zero-stutter reverse scrolling on HTML5 `<canvas>`.

## When to Use

- Building an interactive Scroll World landing page where background video scrubs smoothly with `window.scrollY`.
- Converting product photos or brand assets into a continuous 3D-like camera tour using Google Veo and Imagen 3.
- Optimizing AI-generated video clips with `ffmpeg` so backward scrolling never stutters on desktop or mobile browsers.
- Scaffolding a Single Product DTC Sales Funnel in Astro configured for Firebase Hosting.

## Steps

### Step 1: Inspect Scripts Before Running (Black-Box Rule)

Always run the bundled scripts with `--help` first instead of reading their full source code into the context window:

```bash
node .agents/skills/build-scroll-world-landing/scripts/01-generate-keyframes.js --help
node .agents/skills/build-scroll-world-landing/scripts/02-generate-clips.js --help
bash .agents/skills/build-scroll-world-landing/scripts/03-encode-scroll.sh --help
```

### Step 2: Prepare or Generate 16:9 Studio Keyframes

Ensure `GEMINI_API_KEY` is exported in the terminal environment. Run `01-generate-keyframes.js` to generate or normalize 5 studio keyframes in `public/media/keyframes/`:

```bash
node .agents/skills/build-scroll-world-landing/scripts/01-generate-keyframes.js --out-dir ./public/media/keyframes
```

**Verification:** Confirm that `keyframe-01.webp` through `keyframe-05.webp` exist in `./public/media/keyframes` with 16:9 aspect ratio.

### Step 3: Run Cost Estimation and Spike Test (Mandatory Gate)

Never generate all video clips blindly. First run `--dry-run` to report token/credit costs, then run `--spike 1` to generate only the first transition clip (`clip-01-raw.mp4`):

```bash
node .agents/skills/build-scroll-world-landing/scripts/02-generate-clips.js --dry-run
node .agents/skills/build-scroll-world-landing/scripts/02-generate-clips.js --spike 1 --in-dir ./public/media/keyframes --out-dir ./public/media/raw-clips
```

**Verification:** Ask the user to inspect `public/media/raw-clips/clip-01-raw.mp4` before running `--all`.

### Step 4: Generate Full Clip Batch and Encode for Scroll

Once approved, generate all remaining clips and run the `ffmpeg` scroll encoder:

```bash
node .agents/skills/build-scroll-world-landing/scripts/02-generate-clips.js --all --in-dir ./public/media/keyframes --out-dir ./public/media/raw-clips
bash .agents/skills/build-scroll-world-landing/scripts/03-encode-scroll.sh ./public/media/raw-clips ./public/media/scroll
```

**Verification:** Check that `./public/media/scroll/master-scroll.mp4`, `./public/media/scroll/master-scroll.webm`, and `./public/media/scroll/frames/frame_0001.webp` are created.

### Step 5: Assemble the Astro DTC Funnel and Deploy to Firebase

Copy the Astro component template from `resources/ScrollWorldCanvas-template.md` into `src/components/ScrollWorldCanvas.astro` and build the Astro project:

```bash
npm run build
npx firebase-tools deploy --only hosting
```

## Gotchas

- **Standard MP4s stutter on reverse scroll:** Standard inter-frame video compression (P/B frames) forces the browser decoder to seek backward to the nearest keyframe. Always use `03-encode-scroll.sh` which enforces `-g 1` (All-Intra) and exports a `.webp` frame sequence for `<canvas>` rendering.
- **Aspect ratio mismatch between keyframes:** If consecutive images differ in resolution or framing, video models insert an unwanted crossfade instead of a physical camera movement. Always normalize keyframes to `1920x1080` (16:9) before calling Veo.
- **Text overlays on input photos:** Never feed raw mobile screenshots with UI bars or big promotional text into video interpolation models. Use clean product shots or studio keyframes.
