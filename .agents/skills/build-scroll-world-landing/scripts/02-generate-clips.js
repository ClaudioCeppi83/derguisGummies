#!/usr/bin/env node
/**
 * 02-generate-clips.js
 * Interpolates continuous gimbal transitions between the 5 authentic Viti 16:9 keyframes
 * using Google Veo (@google/genai) OR local cinematic ffmpeg synthesis (--local-ffmpeg).
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const DEFAULT_MODEL = process.env.VEO_MODEL || 'veo-3.1-generate-preview';

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: node 02-generate-clips.js [options]

Options:
  --in-dir <path>    Directory containing keyframe-01.webp .. keyframe-05.webp (default: ./public/media/keyframes)
  --out-dir <path>   Output directory for raw MP4 clips (default: ./public/media/raw-clips)
  --dry-run          Print cost breakdown and camera transition prompts without calling Veo
  --spike <index>    Generate ONLY a single transition clip (1 to 4) to validate quality first
  --all              Generate all 4 transition clips sequentially via Google Veo
  --local-ffmpeg     Synthesize all 4 5s 1080p@24fps transition clips locally with ffmpeg ($0 cost)
  --model <name>     Veo model identifier (default: ${DEFAULT_MODEL})
  --help, -h         Show this help message
`);
  process.exit(0);
}

const inDirIdx = args.indexOf('--in-dir');
const inDir = inDirIdx !== -1 ? args[inDirIdx + 1] : './public/media/keyframes';
const outDirIdx = args.indexOf('--out-dir');
const outDir = outDirIdx !== -1 ? args[outDirIdx + 1] : './public/media/raw-clips';
const modelIdx = args.indexOf('--model');
const modelName = modelIdx !== -1 ? args[modelIdx + 1] : DEFAULT_MODEL;
const spikeIdx = args.indexOf('--spike');
const spikeClip = spikeIdx !== -1 ? Number(args[spikeIdx + 1]) : null;
const isDryRun = args.includes('--dry-run');
const runAll = args.includes('--all');
const isLocalFfmpeg = args.includes('--local-ffmpeg');

const NEGATIVE_CONSTRAINTS =
  'Negative prompt: crossfade, dissolve, fade to black, jump cut, distorted label text, camera shake, flickering, people, hands, mobile UI.';

const TRANSITIONS = [
  {
    index: 1,
    from: 'keyframe-01.webp',
    to: 'keyframe-02.webp',
    xfade: 'smoothleft',
    targetState:
      'Final frame settles cleanly on the red Viti APPLE CIDER VINEGAR 120g bottle with its translucent red gummy bear standing beside it on the white cyclorama studio floor.',
    cameraPrompt:
      `Continuous single-take motorized studio gimbal camera movement across a clean white cyclorama studio floor. Smoothly orbit and pan from the pink Viti BIOTINA + Multivitamínico jar with its blue gummy bear to reveal the red Viti APPLE CIDER VINEGAR jar with its red gummy bear. Preserve exact bottle geometry and label typography. ${NEGATIVE_CONSTRAINTS}`
  },
  {
    index: 2,
    from: 'keyframe-02.webp',
    to: 'keyframe-03.webp',
    xfade: 'smoothright',
    targetState:
      'Final frame settles cleanly on the purple Viti L-triptófano 120g bottle with its translucent purple gummy bear standing beside it on the white cyclorama studio floor.',
    cameraPrompt:
      `Continuous single-take motorized studio gimbal pan across a clean white studio cyclorama. Glide smoothly from the red Viti APPLE CIDER VINEGAR jar with its red gummy bear to the purple Viti L-triptófano jar with its purple gummy bear. Preserve exact bottle geometry and label typography. ${NEGATIVE_CONSTRAINTS}`
  },
  {
    index: 3,
    from: 'keyframe-03.webp',
    to: 'keyframe-04.webp',
    xfade: 'circleopen',
    targetState:
      'Final frame settles on an extreme macro close-up of the three translucent gummy bears (red, turquoise-blue, and purple) standing side by side on the white studio surface.',
    cameraPrompt:
      `Continuous single-take macro motorized gimbal push-in. Move smoothly from the purple Viti L-triptófano bottle down toward the studio floor to frame a macro close-up of the three translucent gummy bears (red, turquoise-blue, and purple) standing side by side. ${NEGATIVE_CONSTRAINTS}`
  },
  {
    index: 4,
    from: 'keyframe-04.webp',
    to: 'keyframe-05.webp',
    xfade: 'smoothup',
    targetState:
      'Final frame settles on a wide hero shot of the complete 3-bottle Viti Nutrition & Wellness family pack (Apple Cider Vinegar, Biotina + Multivitamínico, and L-triptófano) standing in formation with their gummy bears.',
    cameraPrompt:
      `Continuous single-take motorized gimbal pull-back reveal. Smoothly dolly backward from the three macro gummy bears to reveal the complete 3-bottle Viti Nutrition & Wellness family pack (Apple Cider Vinegar, Biotina + Multivitamínico, and L-triptófano) standing in formation. ${NEGATIVE_CONSTRAINTS}`
  }
];

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateLocalFfmpegClips(targets) {
  await fs.mkdir(outDir, { recursive: true });
  console.log('=== LOCAL CINEMATIC FFMPEG PIPELINE (1920x1080 @ 24fps, 5.0s per clip) ===');

  for (const t of targets) {
    const startPath = path.join(inDir, t.from);
    const endPath = path.join(inDir, t.to);
    const outFile = path.join(outDir, `clip-0${t.index}-raw.mp4`);

    // Ensure exact boundary continuity:
    // - Stream 0 (120 frames, 5.0s) starts at exact z=1.0 on frame 0 and gently pushes to z=1.06
    // - Stream 1 (102 frames, 4.25s) starts at offset 0.75s with z=1.06 and settles to exact z=1.0 on its final frame (t=5.0s)
    // - xfade transition (duration 3.5s, offset 0.75s) blends from 0.75s to 4.25s, leaving 0.0..0.75s pure start and 4.25..5.0s pure end settling at 1:1
    const filterComplex = [
      `[0:v]scale=3840:2160:flags=lanczos,zoompan=z='1+0.06*(on/119)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=120:s=1920x1080:fps=24,format=yuv420p[v0]`,
      `[1:v]scale=3840:2160:flags=lanczos,zoompan=z='1+0.06*(1-on/101)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=102:s=1920x1080:fps=24,format=yuv420p[v1]`,
      `[v0][v1]xfade=transition=${t.xfade}:duration=3.5:offset=0.75,format=yuv420p[outv]`
    ].join(';');

    console.log(`[Clip 0${t.index}] Synthesizing 5s 1080p@24fps (${t.xfade} + dolly): ${t.from} -> ${t.to}...`);
    await execFileAsync('ffmpeg', [
      '-y',
      '-i', startPath,
      '-i', endPath,
      '-filter_complex', filterComplex,
      '-map', '[outv]',
      '-an',
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '18',
      '-r', '24',
      '-pix_fmt', 'yuv420p',
      outFile
    ]);

    const stat = await fs.stat(outFile);
    console.log(`  -> Saved: ${outFile} (${(stat.size / 1024).toFixed(1)} KB)`);
  }
}

async function requestVeoWithFallback(ai, model, t, startImage, endImage) {
  const attempts = [
    {
      label: 'image + lastFrame + aspectRatio(16:9)',
      payload: {
        model,
        prompt: t.cameraPrompt,
        image: startImage,
        config: {
          aspectRatio: '16:9',
          lastFrame: endImage
        }
      }
    },
    {
      label: 'image + prompt-guided target end state + aspectRatio(16:9) (v1beta fallback without lastFrame)',
      payload: {
        model,
        prompt: `${t.cameraPrompt} ${t.targetState}`,
        image: startImage,
        config: {
          aspectRatio: '16:9'
        }
      }
    }
  ];

  let lastError = null;
  for (const attempt of attempts) {
    try {
      console.log(`  -> Trying config: [${attempt.label}]`);
      const op = await ai.models.generateVideos(attempt.payload);
      console.log(`  -> Accepted config: [${attempt.label}]`);
      return op;
    } catch (err) {
      lastError = err;
      const msg = err?.message || String(err);
      console.warn(`  [!] Config rejected (${attempt.label}): ${msg}`);
      if (/429|RESOURCE_EXHAUSTED|quota|billing|PERMISSION_DENIED/i.test(msg)) {
        throw err;
      }
    }
  }
  throw lastError;
}

async function main() {
  const targets = spikeClip
    ? TRANSITIONS.filter((t) => t.index === spikeClip)
    : TRANSITIONS;

  if (isLocalFfmpeg) {
    await generateLocalFfmpegClips(targets);
    return;
  }

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
      console.log('Tip: Pass --spike 1, --all, or --local-ffmpeg to generate the transition clips.');
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

  for (const t of targets) {
    const startPath = path.join(inDir, t.from);
    const endPath = path.join(inDir, t.to);
    const startBytes = await fs.readFile(startPath);
    const endBytes = await fs.readFile(endPath);

    const startImage = {
      imageBytes: startBytes.toString('base64'),
      mimeType: 'image/webp'
    };
    const endImage = {
      imageBytes: endBytes.toString('base64'),
      mimeType: 'image/webp'
    };

    console.log(`\n[Clip 0${t.index}] Requesting Veo (${modelName}) transition: ${t.from} -> ${t.to}...`);
    let operation = await requestVeoWithFallback(ai, modelName, t, startImage, endImage);

    while (!operation.done) {
      process.stdout.write('.');
      await sleep(10000);
      operation = await ai.operations.getVideosOperation({ operation });
    }
    console.log('\n  -> Generation finished!');

    if (operation.error) {
      throw new Error(`Veo operation error: ${JSON.stringify(operation.error)}`);
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) {
      throw new Error(`No video URI returned for Clip 0${t.index}: ${JSON.stringify(operation.response)}`);
    }

    const downloadUrl = videoUri.includes('?')
      ? `${videoUri}&key=${apiKey}`
      : `${videoUri}?key=${apiKey}`;
    const res = await fetch(downloadUrl, {
      headers: { 'x-goog-api-key': apiKey },
      redirect: 'follow'
    });
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
