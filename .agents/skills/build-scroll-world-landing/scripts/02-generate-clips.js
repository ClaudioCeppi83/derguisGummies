#!/usr/bin/env node
/**
 * 02-generate-clips.js
 * Interpolates 5-second continuous gimbal transitions between consecutive 16:9 keyframes
 * using Google Veo (@google/genai) with --dry-run and --spike support.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: node 02-generate-clips.js [options]

Options:
  --in-dir <path>    Directory containing keyframe-01.webp .. keyframe-05.webp (default: ./public/media/keyframes)
  --out-dir <path>   Output directory for raw MP4 clips (default: ./public/media/raw-clips)
  --dry-run          Print cost breakdown and camera transition prompts without calling Veo
  --spike <index>    Generate ONLY a single transition clip (1 to 4) to validate quality first
  --all              Generate all 4 transition clips sequentially
  --model <name>     Veo model identifier (default: veo-2.0-generate-001)
  --help, -h         Show this help message
`);
  process.exit(0);
}

const inDirIdx = args.indexOf('--in-dir');
const inDir = inDirIdx !== -1 ? args[inDirIdx + 1] : './public/media/keyframes';
const outDirIdx = args.indexOf('--out-dir');
const outDir = outDirIdx !== -1 ? args[outDirIdx + 1] : './public/media/raw-clips';
const modelIdx = args.indexOf('--model');
const modelName = modelIdx !== -1 ? args[modelIdx + 1] : 'veo-2.0-generate-001';
const spikeIdx = args.indexOf('--spike');
const spikeClip = spikeIdx !== -1 ? Number(args[spikeIdx + 1]) : null;
const isDryRun = args.includes('--dry-run');
const runAll = args.includes('--all');

const NEGATIVE_CONSTRAINTS =
  'Negative prompt: crossfade, dissolve, fade to black, cut, jump cut, morphing bottle text, camera shake, flickering lighting, people, hands, watermark, UI overlay.';

const TRANSITIONS = [
  {
    index: 1,
    from: 'keyframe-01.webp',
    to: 'keyframe-02.webp',
    cameraPrompt:
      `Continuous single-take FPV motorized gimbal camera movement. Smoothly dolly forward and tilt down toward the Gummies Funcionales bottle as the cap opens and glossy red berry gummies spill onto the sunlit rose-quartz stone. Maintain consistent warm golden hour lighting and physical geometry. ${NEGATIVE_CONSTRAINTS}`
  },
  {
    index: 2,
    from: 'keyframe-02.webp',
    to: 'keyframe-03.webp',
    cameraPrompt:
      `Continuous single-take macro motorized gimbal push-in. Glide smoothly from the spilled gummies into an extreme macro close-up of two ruby-red gummies as golden collagen micro-spheres and crystalline biotin particles float around them in warm sunlight. ${NEGATIVE_CONSTRAINTS}`
  },
  {
    index: 3,
    from: 'keyframe-03.webp',
    to: 'keyframe-04.webp',
    cameraPrompt:
      `Continuous single-take motorized gimbal pull-back and smooth pan right across the sunlit stone surface, transitioning from the macro gummy close-up to reveal the full Viti Nutrition & Wellness 4-bottle product lineup surrounded by fresh fruit. ${NEGATIVE_CONSTRAINTS}`
  },
  {
    index: 4,
    from: 'keyframe-04.webp',
    to: 'keyframe-05.webp',
    cameraPrompt:
      `Continuous single-take motorized gimbal arc shot. Orbit smoothly around the stone podium to center on the 3-Bottle Routine Pack of Gummies Funcionales Biotina Colageno Vitamina C bathed in golden rim lighting. ${NEGATIVE_CONSTRAINTS}`
  }
];

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  if (isDryRun || (!spikeClip && !runAll)) {
    console.log('=== COST & TRANSITION ESTIMATE (Google Veo 16:9 First-to-Last Frame) ===');
    console.log(`Model: ${modelName}`);
    console.log('Clips to generate: 4 transitions x 5 seconds = 20 seconds total');
    console.log('Estimated API cost: ~$1.75 USD per 5s clip (~$7.00 USD full run | ~$1.75 USD for --spike 1)\n');
    for (const t of TRANSITIONS) {
      console.log(`Clip 0${t.index}: ${t.from} -> ${t.to}`);
      console.log(`  Prompt: ${t.cameraPrompt}\n`);
    }
    if (!spikeClip && !runAll) {
      console.log('Tip: Pass --spike 1 to generate the first test clip, or --all to generate all 4 clips.');
    }
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('ERROR: GEMINI_API_KEY environment variable is not set.');
    process.exit(1);
  }

  await fs.mkdir(outDir, { recursive: true });
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey });

  const targets = spikeClip
    ? TRANSITIONS.filter((t) => t.index === spikeClip)
    : TRANSITIONS;

  for (const t of targets) {
    const startPath = path.join(inDir, t.from);
    const endPath = path.join(inDir, t.to);
    const startBytes = await fs.readFile(startPath);
    const endBytes = await fs.readFile(endPath);

    console.log(`\n[Clip 0${t.index}] Requesting Veo transition: ${t.from} -> ${t.to}...`);
    let operation = await ai.models.generateVideos({
      model: modelName,
      prompt: t.cameraPrompt,
      image: {
        imageBytes: startBytes.toString('base64'),
        mimeType: 'image/webp'
      },
      config: {
        aspectRatio: '16:9',
        numberOfVideos: 1,
        durationSeconds: 5,
        lastFrame: {
          imageBytes: endBytes.toString('base64'),
          mimeType: 'image/webp'
        }
      }
    });

    while (!operation.done) {
      process.stdout.write('.');
      await sleep(10000);
      operation = await ai.operations.getVideosOperation({ operation });
    }
    console.log('\n  -> Generation finished!');

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) {
      throw new Error(`No video URI returned for Clip 0${t.index}`);
    }

    const downloadUrl = videoUri.includes('?')
      ? `${videoUri}&key=${apiKey}`
      : `${videoUri}?key=${apiKey}`;
    const res = await fetch(downloadUrl);
    if (!res.ok) {
      throw new Error(`Failed to download video clip ${t.index}: HTTP ${res.status}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    const outFile = path.join(outDir, `clip-0${t.index}-raw.mp4`);
    await fs.writeFile(outFile, Buffer.from(arrayBuffer));
    console.log(`  -> Saved raw clip: ${outFile}`);
  }
}

main().catch((err) => {
  console.error('Fatal error in 02-generate-clips.js:', err.message);
  process.exit(1);
});
