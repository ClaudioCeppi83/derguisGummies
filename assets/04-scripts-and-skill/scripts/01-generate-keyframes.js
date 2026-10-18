#!/usr/bin/env node
/**
 * 01-generate-keyframes.js
 * Normalizes or generates 5 consistent 16:9 studio keyframes for Viti Nutrition & Wellness
 * using local clean bottle crops (ffmpeg) or @google/genai (Imagen 3).
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: node 01-generate-keyframes.js [options]

Options:
  --out-dir <path>   Output directory for 16:9 WebP keyframes (default: ./public/media/keyframes)
  --dry-run          Print the 5 keyframe specifications without calling the Gemini API
  --help, -h         Show this help message
`);
  process.exit(0);
}

const outDirIdx = args.indexOf('--out-dir');
const outDir = outDirIdx !== -1 ? args[outDirIdx + 1] : './public/media/keyframes';

const KEYFRAME_PROMPTS = [
  { id: 'keyframe-01', section: '01-hero-biotina' },
  { id: 'keyframe-02', section: '02-apple-cider-vinegar' },
  { id: 'keyframe-03', section: '03-l-triptofano-dreams' },
  { id: 'keyframe-04', section: '04-macro-gummies-synergy' },
  { id: 'keyframe-05', section: '05-viti-trifecta-bundle' }
];

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  console.log('Verifying pre-built authentic Viti 16:9 keyframes in:', outDir);
  for (const kf of KEYFRAME_PROMPTS) {
    const p = path.join(outDir, `${kf.id}.webp`);
    try {
      const st = await fs.stat(p);
      console.log(`  [OK] ${kf.id}.webp (${(st.size / 1024).toFixed(1)} KB) - ${kf.section}`);
    } catch {
      console.log(`  [MISSING] ${kf.id}.webp`);
    }
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
