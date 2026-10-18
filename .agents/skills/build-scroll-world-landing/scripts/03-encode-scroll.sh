#!/usr/bin/env bash
# 03-encode-scroll.sh
# Concatenates raw Veo clips and encodes them for ultra-smooth 60fps forward/backward scroll:
# 1. All-Intra MP4 (-g 1, no audio, faststart)
# 2. All-Intra WebM VP9 (-g 1, no audio)
# 3. WebP frame sequence for HTML5 <canvas> zero-latency scrubbing

set -euo pipefail

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  cat <<EOF
Usage: bash 03-encode-scroll.sh <raw_clips_dir> <output_scroll_dir>

Arguments:
  raw_clips_dir      Directory containing clip-01-raw.mp4 .. clip-04-raw.mp4 (default: ./public/media/raw-clips)
  output_scroll_dir  Output directory for scroll-optimized media (default: ./public/media/scroll)
EOF
  exit 0
fi

RAW_DIR="${1:-./public/media/raw-clips}"
OUT_DIR="${2:-./public/media/scroll}"
FRAMES_DIR="${OUT_DIR}/frames"

mkdir -p "${OUT_DIR}" "${FRAMES_DIR}"

CONCAT_LIST="${OUT_DIR}/concat_list.txt"
rm -f "${CONCAT_LIST}"

for f in $(ls "${RAW_DIR}"/clip-*-raw.mp4 2>/dev/null | sort); do
  echo "file '$(realpath "$f")'" >> "${CONCAT_LIST}"
done

if [[ ! -s "${CONCAT_LIST}" ]]; then
  echo "ERROR: No clip-*-raw.mp4 files found in ${RAW_DIR}"
  exit 1
fi

echo "[1/3] Encoding All-Intra MP4 (keyframe every frame -g 1, 1080p, no audio)..."
ffmpeg -y -f concat -safe 0 -i "${CONCAT_LIST}" \
  -an -vf "scale=1920:1080:flags=lanczos,fps=24" \
  -c:v libx264 -preset slow -crf 20 -g 1 -keyint_min 1 -sc_threshold 0 \
  -pix_fmt yuv420p -movflags +faststart \
  "${OUT_DIR}/master-scroll.mp4"

echo "[2/3] Encoding All-Intra WebM (VP9 -g 1, 1080p, no audio)..."
ffmpeg -y -i "${OUT_DIR}/master-scroll.mp4" \
  -an -c:v libvpx-vp9 -b:v 0 -crf 28 -g 1 -keyint_min 1 \
  -row-mt 1 -pix_fmt yuv420p \
  "${OUT_DIR}/master-scroll.webm"

echo "[3/3] Extracting WebP Frame Sequence for HTML5 <canvas> Scroll..."
ffmpeg -y -i "${OUT_DIR}/master-scroll.mp4" \
  -vf "scale=1920:1080:flags=lanczos" -vcodec libwebp -lossless 0 -compression_level 4 -q:v 82 \
  "${FRAMES_DIR}/frame_%04d.webp"

TOTAL_FRAMES=$(ls "${FRAMES_DIR}"/frame_*.webp 2>/dev/null | wc -l)
echo "Done! Generated master-scroll.mp4, master-scroll.webm, and ${TOTAL_FRAMES} WebP frames in ${OUT_DIR}."
