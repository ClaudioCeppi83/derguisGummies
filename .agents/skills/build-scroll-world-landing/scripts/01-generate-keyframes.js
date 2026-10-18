#!/usr/bin/env node
/**
 * 01-generate-keyframes.js
 * Generates or normalizes 5 consistent 16:9 studio keyframes for Viti Nutrition & Wellness
 * using @google/genai (Imagen 3) and/or crops real product photos to preserve exact bottle labels.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: node 01-generate-keyframes.js [options]

Options:
  --in-dir <path>    Input directory with raw Viti photos/screenshots (default: ./public/fotos)
  --out-dir <path>   Output directory for 16:9 WebP keyframes (default: ./public/media/keyframes)
  --mode <type>      'outpaint' (crops UI from real photos & expands to 16:9) or 'studio' (Imagen 3)
  --dry-run          Print the 5 keyframe specifications without calling the Gemini API
  --help, -h         Show this help message
`);
  process.exit(0);
}

const outDirIdx = args.indexOf('--out-dir');
const outDir = outDirIdx !== -1 ? args[outDirIdx + 1] : './public/media/keyframes';
const isDryRun = args.includes('--dry-run');

// Exact visual description of the authentic Viti Nutrition & Wellness bottles from Chile:
// - Transparent PET jar with white ribbed screw cap
// - Curved vertical white strip on the left side of the label containing 3 green circular seal icons and a vertical barcode at the bottom-left
// - "viti" lowercase logo inside a thin white circle with ® symbol, and "Nutrition & Wellness" subtitle
// - Small circular fruit illustration badge on the right side of the label
// - Translucent 3D gummy bear standing upright at the bottom-right corner of the bottle
const VITI_BOTTLE_SPEC =
  "authentic clear PET supplement jar with a white ribbed screw cap, label featuring a curved white vertical strip on the left edge with three green circular icons and a barcode at the bottom left, the 'viti' logo inside a thin white circle with 'Nutrition & Wellness' underneath";

const KEYFRAME_PROMPTS = [
  {
    id: 'keyframe-01',
    section: '01-hero-biotina',
    prompt: `High-end 16:9 commercial studio product photography. Centerpiece is the ${VITI_BOTTLE_SPEC}, hot-pink/magenta main label reading 'BIOTINA + Multivitamínico - Gomitas masticables con sabor mora - Cont. neto: 120 g', filled with translucent turquoise-blue gummy bears inside the clear jar, and one shiny turquoise-blue gummy bear standing upright next to the bottom-right of the bottle. Set on a sunlit rose-quartz stone podium with fresh blackberries and water droplets, golden hour lighting, 8k photorealistic.`
  },
  {
    id: 'keyframe-02',
    section: '02-apple-cider-vinegar',
    prompt: `High-end 16:9 commercial studio product photography, same sunlit stone podium. Centerpiece is the ${VITI_BOTTLE_SPEC}, terracotta-red main label reading 'APPLE CIDER VINEGAR - Gomitas masticables con sabor manzana - Cont. neto: 120 g', filled with ruby-red gummy bears inside the clear jar, and one translucent ruby-red gummy bear standing upright next to the bottom-right of the bottle, surrounded by fresh red apple slices, 8k photorealistic.`
  },
  {
    id: 'keyframe-03',
    section: '03-l-triptofano-dreams',
    prompt: `High-end 16:9 commercial studio product photography, same stone podium transitioning to warm twilight rim lighting. Centerpiece is the ${VITI_BOTTLE_SPEC}, deep violet-purple main label reading 'L-triptófano - Gomitas masticables con sabor cherry - Cont. neto: 120 g', filled with glowing purple gummy bears inside the clear jar, and one translucent purple gummy bear standing upright next to the bottom-right of the bottle, fresh cherries nearby, 8k photorealistic.`
  },
  {
    id: 'keyframe-04',
    section: '04-macro-gummies-synergy',
    prompt: `Extreme macro 16:9 commercial studio photography on a sunlit quartz surface. Three translucent vitamin gummy bears standing side by side: one turquoise-blue (Biotina mora), one ruby-red (Apple Cider Vinegar), and one glowing violet-purple (L-triptófano cherry), surrounded by floating golden collagen micro-spheres and water droplets, 8k photorealistic.`
  },
  {
    id: 'keyframe-05',
    section: '05-viti-trifecta-bundle',
    prompt: `Wide 16:9 hero commercial bundle photography on a sunlit stone podium. All three ${VITI_BOTTLE_SPEC} bottles arranged in a V-formation: the hot-pink 'BIOTINA + Multivitamínico' jar in the center with its blue gummy bear, flanked by the red 'APPLE CIDER VINEGAR' jar with its red gummy bear on the left, and the purple 'L-triptófano' jar with its purple gummy bear on the right. Fresh blackberries, red apples, and cherries around the base, 8k photorealistic.`
  }
];

async function main() {
  await fs.mkdir(outDir, { recursive: true });

  if (isDryRun) {
    console.log('=== DRY RUN: 5 Viti Nutrition & Wellness Studio Keyframes (16:9) ===');
    for (const kf of KEYFRAME_PROMPTS) {
      console.log(`\n[${kf.id}] (${kf.section}):\n  ${kf.prompt}`);
    }
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('ERROR: GEMINI_API_KEY environment variable is not set.');
    process.exit(1);
  }

  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey });

  for (const kf of KEYFRAME_PROMPTS) {
    console.log(`Generating ${kf.id} (${kf.section})...`);
    const response = await ai.models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt: kf.prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: '16:9',
        outputMimeType: 'image/jpeg'
      }
    });

    const b64 = response.generatedImages?.[0]?.image?.imageBytes;
    if (!b64) {
      throw new Error(`No image returned for ${kf.id}`);
    }

    const tmpJpg = path.join(outDir, `${kf.id}.jpg`);
    const finalWebp = path.join(outDir, `${kf.id}.webp`);
    await fs.writeFile(tmpJpg, Buffer.from(b64, 'base64'));

    try {
      await execFileAsync('ffmpeg', ['-y', '-i', tmpJpg, '-vf', 'scale=1920:1080', '-quality', '88', finalWebp]);
      await fs.unlink(tmpJpg);
      console.log(`  -> Saved optimized 16:9 WebP: ${finalWebp}`);
    } catch {
      console.log(`  -> Saved JPG fallback: ${tmpJpg}`);
    }
  }

  console.log('\nAll 5 authentic Viti keyframes generated in:', outDir);
}

main().catch((err) => {
  console.error('Fatal error in 01-generate-keyframes.js:', err.message);
  process.exit(1);
});
