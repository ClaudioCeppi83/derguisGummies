# ScrollWorldCanvas.astro Component Template

Copy this code into `src/components/ScrollWorldCanvas.astro`:

```astro
---
interface Props {
  totalFrames?: number;
  framesBasePath?: string;
  fallbackVideoMp4?: string;
  fallbackVideoWebm?: string;
  posterUrl?: string;
}

const {
  totalFrames = 120,
  framesBasePath = '/media/scroll/frames/frame_',
  fallbackVideoMp4 = '/media/scroll/master-scroll.mp4',
  fallbackVideoWebm = '/media/scroll/master-scroll.webm',
  posterUrl = '/media/keyframes/keyframe-01.webp'
} = Astro.props;
---

<div
  id="scroll-world-backdrop"
  class="fixed inset-0 -z-10 w-screen h-screen overflow-hidden bg-[#160b11]"
  data-total-frames={totalFrames}
  data-frames-path={framesBasePath}
>
  <canvas
    id="scroll-world-canvas"
    width="1920"
    height="1080"
    class="w-full h-full object-cover transition-opacity duration-500"
  ></canvas>

  <video
    id="scroll-world-video-fallback"
    muted
    playsinline
    preload="auto"
    poster={posterUrl}
    class="hidden w-full h-full object-cover"
  >
    <source src={fallbackVideoWebm} type="video/webm" />
    <source src={fallbackVideoMp4} type="video/mp4" />
  </video>

  <div class="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#160b11]/65 via-[#160b11]/35 to-[#160b11]/85"></div>
</div>

<script>
  const container = document.getElementById('scroll-world-backdrop');
  const canvas = document.getElementById('scroll-world-canvas') as HTMLCanvasElement | null;
  const videoFallback = document.getElementById('scroll-world-video-fallback') as HTMLVideoElement | null;

  if (container && canvas) {
    const ctx = canvas.getContext('2d');
    const totalFrames = Number(container.dataset.totalFrames || 120);
    const basePath = container.dataset.framesPath || '/media/scroll/frames/frame_';

    const images: HTMLImageElement[] = [];
    let currentFrameIndex = 0;
    let targetFrameIndex = 0;
    let useVideoFallback = false;

    const pad4 = (n: number) => String(n).padStart(4, '0');

    const drawCover = (img: HTMLImageElement) => {
      if (!ctx || !img.complete || img.naturalWidth === 0) return;
      const cw = canvas.width;
      const ch = canvas.height;
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const scale = Math.max(cw / iw, ch / ih);
      const nw = iw * scale;
      const nh = ih * scale;
      const ox = (cw - nw) / 2;
      const oy = (ch - nh) / 2;
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, ox, oy, nw, nh);
    };

    for (let i = 1; i <= totalFrames; i++) {
      const img = new Image();
      img.decoding = 'async';
      img.src = `${basePath}${pad4(i)}.webp`;
      img.onload = () => {
        if (i === 1) drawCover(img);
      };
      img.onerror = () => {
        if (i === 1 && videoFallback) {
          useVideoFallback = true;
          canvas.classList.add('hidden');
          videoFallback.classList.remove('hidden');
        }
      };
      images.push(img);
    }

    const updateScrollTarget = () => {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));

      if (useVideoFallback && videoFallback && videoFallback.duration) {
        videoFallback.currentTime = progress * videoFallback.duration;
      } else {
        targetFrameIndex = Math.min(
          totalFrames - 1,
          Math.max(0, Math.floor(progress * (totalFrames - 1)))
        );
      }
    };

    const tick = () => {
      if (!useVideoFallback) {
        const diff = targetFrameIndex - currentFrameIndex;
        if (Math.abs(diff) > 0.05) {
          currentFrameIndex += diff * 0.22;
          const idx = Math.round(currentFrameIndex);
          const frameImg = images[idx];
          if (frameImg && frameImg.complete && frameImg.naturalWidth > 0) {
            drawCover(frameImg);
          }
        }
      }
      requestAnimationFrame(tick);
    };

    window.addEventListener('scroll', updateScrollTarget, { passive: true });
    window.addEventListener('resize', updateScrollTarget, { passive: true });
    updateScrollTarget();
    requestAnimationFrame(tick);
  }
</script>
```
