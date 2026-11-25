import { PIXEL_SCALE, VIEW_H, VIEW_W } from '../core/constants.ts';
import type { LightSource } from '../core/types.ts';

// Full-resolution Hi-Bit lightmap (640x360) for smooth Dead Cells dynamic lighting & vignette
const LIGHT_W = VIEW_W;
const LIGHT_H = VIEW_H;

export class DynamicLighting {
  private readonly darkCanvas: HTMLCanvasElement;
  private readonly darkCtx: CanvasRenderingContext2D;
  private readonly glowCanvas: HTMLCanvasElement;
  private readonly glowCtx: CanvasRenderingContext2D;
  private readonly vignetteCanvas: HTMLCanvasElement;

  constructor() {
    this.darkCanvas = document.createElement('canvas');
    this.darkCanvas.width = LIGHT_W;
    this.darkCanvas.height = LIGHT_H;
    this.darkCtx = this.darkCanvas.getContext('2d')!;
    this.darkCtx.imageSmoothingEnabled = false;

    this.glowCanvas = document.createElement('canvas');
    this.glowCanvas.width = LIGHT_W;
    this.glowCanvas.height = LIGHT_H;
    this.glowCtx = this.glowCanvas.getContext('2d')!;
    this.glowCtx.imageSmoothingEnabled = false;

    this.vignetteCanvas = this.bakeVignette();
  }

  private bakeVignette(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = LIGHT_W;
    c.height = LIGHT_H;
    const ctx = c.getContext('2d')!;
    const cx = LIGHT_W * 0.5;
    const cy = LIGHT_H * 0.5;
    const grad = ctx.createRadialGradient(cx, cy, LIGHT_W * 0.28, cx, cy, LIGHT_W * 0.66);
    grad.addColorStop(0, 'rgba(7,6,11,0)');
    grad.addColorStop(0.7, 'rgba(7,6,11,0.16)');
    grad.addColorStop(1, 'rgba(7,6,11,0.52)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, LIGHT_W, LIGHT_H);
    return c;
  }

  render(
    mainCtx: CanvasRenderingContext2D,
    camPxX: number,
    camPxY: number,
    ambientColor: string,
    ambientAlpha: number,
    lights: readonly LightSource[],
    time: number,
    screenFlash?: { color: string; alpha: number } | null,
  ): void {
    const dctx = this.darkCtx;
    const gctx = this.glowCtx;

    // 1. Fill ambient shadow layer
    dctx.globalCompositeOperation = 'source-over';
    dctx.clearRect(0, 0, LIGHT_W, LIGHT_H);
    dctx.fillStyle = ambientColor;
    dctx.globalAlpha = ambientAlpha;
    dctx.fillRect(0, 0, LIGHT_W, LIGHT_H);
    dctx.globalAlpha = 1;

    // 2. Clear colored additive glow pass
    gctx.clearRect(0, 0, LIGHT_W, LIGHT_H);

    // 3. Carve light holes from shadow layer & paint colored bloom halos at 640x360 Hi-Bit res
    for (let i = 0; i < lights.length; i++) {
      const l = lights[i]!;
      const flickerAmt = l.flicker ?? 0.08;
      const flicker =
        1 +
        Math.sin(time * 9.5 + i * 2.1) * flickerAmt +
        Math.cos(time * 16.3 + i * 1.3) * (flickerAmt * 0.5);

      const lx = Math.round(l.x * PIXEL_SCALE) - camPxX;
      const ly = Math.round(l.y * PIXEL_SCALE) - camPxY;
      const r = Math.max(10, Math.round(l.radius * PIXEL_SCALE * flicker));

      if (lx + r < 0 || ly + r < 0 || lx - r > LIGHT_W || ly - r > LIGHT_H) continue;

      // Carve shadow using stepped pixel rings
      dctx.globalCompositeOperation = 'destination-out';
      const grad = dctx.createRadialGradient(lx, ly, r * 0.15, lx, ly, r);
      grad.addColorStop(0, `rgba(0,0,0,${Math.min(1, l.intensity)})`);
      grad.addColorStop(0.55, `rgba(0,0,0,${Math.min(0.7, l.intensity * 0.6)})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      dctx.fillStyle = grad;
      dctx.beginPath();
      dctx.arc(lx, ly, r, 0, Math.PI * 2);
      dctx.fill();

      // Colored warm/spectral bloom
      gctx.globalCompositeOperation = 'lighter';
      const glowGrad = gctx.createRadialGradient(lx, ly, 1, lx, ly, r * 0.9);
      glowGrad.addColorStop(0, hexToRgba(l.color, 0.24 * l.intensity));
      glowGrad.addColorStop(0.5, hexToRgba(l.color, 0.10 * l.intensity));
      glowGrad.addColorStop(1, hexToRgba(l.color, 0));
      gctx.fillStyle = glowGrad;
      gctx.beginPath();
      gctx.arc(lx, ly, r * 0.9, 0, Math.PI * 2);
      gctx.fill();
    }

    // Composite shadow mask, gothic vignette, additive glow & optional impact flash
    mainCtx.save();
    mainCtx.imageSmoothingEnabled = false;
    mainCtx.drawImage(this.darkCanvas, 0, 0, VIEW_W, VIEW_H);
    mainCtx.drawImage(this.vignetteCanvas, 0, 0, VIEW_W, VIEW_H);
    mainCtx.globalCompositeOperation = 'lighter';
    mainCtx.drawImage(this.glowCanvas, 0, 0, VIEW_W, VIEW_H);

    if (screenFlash && screenFlash.alpha > 0.01) {
      mainCtx.globalCompositeOperation = 'source-over';
      mainCtx.globalAlpha = Math.min(0.55, screenFlash.alpha);
      mainCtx.fillStyle = screenFlash.color;
      mainCtx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    mainCtx.restore();
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) || 255;
  const g = parseInt(clean.slice(2, 4), 16) || 200;
  const b = parseInt(clean.slice(4, 6), 16) || 140;
  return `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
}
