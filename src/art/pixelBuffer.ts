import { PAL } from './palette.ts';

export class PixelBuffer {
  readonly width: number;
  readonly height: number;
  readonly scale: number;
  private readonly pixels: (string | null)[];

  constructor(logicalWidth: number, logicalHeight: number, scale = 1) {
    this.scale = scale;
    this.width = Math.max(1, Math.round(logicalWidth * scale));
    this.height = Math.max(1, Math.round(logicalHeight * scale));
    this.pixels = new Array<string | null>(this.width * this.height).fill(null);
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  setRaw(ix: number, iy: number, color: string | null): void {
    const rx = Math.round(ix);
    const ry = Math.round(iy);
    if (!this.inBounds(rx, ry)) return;
    this.pixels[ry * this.width + rx] = color;
  }

  getRaw(ix: number, iy: number): string | null {
    const rx = Math.round(ix);
    const ry = Math.round(iy);
    if (!this.inBounds(rx, ry)) return null;
    return this.pixels[ry * this.width + rx] ?? null;
  }

  set(x: number, y: number, color: string | null): void {
    const ix = Math.round(x * this.scale);
    const iy = Math.round(y * this.scale);
    if (this.scale <= 1 || color === null) {
      this.setRaw(ix, iy, color);
      return;
    }
    this.setRaw(ix, iy, color);
    this.setRaw(ix + 1, iy, color);
  }

  get(x: number, y: number): string | null {
    return this.getRaw(Math.round(x * this.scale), Math.round(y * this.scale));
  }

  rect(x: number, y: number, w: number, h: number, color: string | null): void {
    if (w <= 0 || h <= 0) return;
    const x0 = Math.round(x * this.scale);
    const y0 = Math.round(y * this.scale);
    const x1 = Math.max(x0 + 1, Math.round((x + w) * this.scale));
    const y1 = Math.max(y0 + 1, Math.round((y + h) * this.scale));
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        this.setRaw(px, py, color);
      }
    }
  }

  ditherRect(
    x: number,
    y: number,
    w: number,
    h: number,
    colorA: string,
    colorB: string | null,
  ): void {
    if (w <= 0 || h <= 0) return;
    const x0 = Math.round(x * this.scale);
    const y0 = Math.round(y * this.scale);
    const x1 = Math.max(x0 + 1, Math.round((x + w) * this.scale));
    const y1 = Math.max(y0 + 1, Math.round((y + h) * this.scale));
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        const useA = ((px + py) & 1) === 0;
        if (useA) this.setRaw(px, py, colorA);
        else if (colorB !== null) this.setRaw(px, py, colorB);
      }
    }
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, color: string): void {
    const icx = cx * this.scale;
    const icy = cy * this.scale;
    const irx = Math.max(0.5, rx * this.scale);
    const iry = Math.max(0.5, ry * this.scale);
    const minX = Math.floor(icx - irx);
    const maxX = Math.ceil(icx + irx);
    const minY = Math.floor(icy - iry);
    const maxY = Math.ceil(icy + iry);

    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const dx = (px - icx) / irx;
        const dy = (py - icy) / iry;
        if (dx * dx + dy * dy <= 1.0) {
          this.setRaw(px, py, color);
        }
      }
    }
  }

  shadedEllipse(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    shadow: string,
    mid: string,
    highlight: string,
  ): void {
    const icx = cx * this.scale;
    const icy = cy * this.scale;
    const irx = Math.max(0.5, rx * this.scale);
    const iry = Math.max(0.5, ry * this.scale);
    const minX = Math.floor(icx - irx);
    const maxX = Math.ceil(icx + irx);
    const minY = Math.floor(icy - iry);
    const maxY = Math.ceil(icy + iry);

    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const dx = (px - icx) / irx;
        const dy = (py - icy) / iry;
        const r2 = dx * dx + dy * dy;
        if (r2 <= 1.0) {
          const nz = Math.sqrt(Math.max(0, 1 - r2));
          const light = -dx * 0.48 - dy * 0.62 + nz * 0.58;
          const bayer = ((((px & 1) << 1) | (py & 1)) * 0.25 - 0.375) * 0.16;
          const score = light + bayer;
          if (score > 0.56) this.setRaw(px, py, highlight);
          else if (score > 0.08) this.setRaw(px, py, mid);
          else this.setRaw(px, py, shadow);
        }
      }
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, color: string, thickness = 1): void {
    let ix0 = Math.round(x0 * this.scale);
    let iy0 = Math.round(y0 * this.scale);
    const ix1 = Math.round(x1 * this.scale);
    const iy1 = Math.round(y1 * this.scale);
    const dx = Math.abs(ix1 - ix0);
    const dy = Math.abs(iy1 - iy0);
    const sx = ix0 < ix1 ? 1 : -1;
    const sy = iy0 < iy1 ? 1 : -1;
    let err = dx - dy;

    const physThick =
      thickness <= 1 ? 1 : Math.max(2, Math.round(thickness * this.scale));

    const plot = (px: number, py: number): void => {
      if (physThick <= 1) {
        this.setRaw(px, py, color);
      } else {
        const r = Math.floor(physThick / 2);
        for (let oy = 0; oy < physThick; oy++) {
          for (let ox = 0; ox < physThick; ox++) {
            this.setRaw(px - r + ox, py - r + oy, color);
          }
        }
      }
    };

    while (true) {
      plot(ix0, iy0);
      if (ix0 === ix1 && iy0 === iy1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        ix0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        iy0 += sy;
      }
    }
  }

  poly(points: ReadonlyArray<readonly [number, number]>, color: string): void {
    if (points.length < 3) return;
    const scaled = points.map(([px, py]) => [px * this.scale, py * this.scale] as const);
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [, py] of scaled) {
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    }
    const yStart = Math.floor(minY);
    const yEnd = Math.ceil(maxY);

    for (let y = yStart; y <= yEnd; y++) {
      const nodes: number[] = [];
      let j = scaled.length - 1;
      for (let i = 0; i < scaled.length; i++) {
        const [xi, yi] = scaled[i]!;
        const [xj, yj] = scaled[j]!;
        if ((yi < y && yj >= y) || (yj < y && yi >= y)) {
          nodes.push(xi + ((y - yi) / (yj - yi)) * (xj - xi));
        }
        j = i;
      }
      nodes.sort((a, b) => a - b);
      for (let k = 0; k < nodes.length - 1; k += 2) {
        const xStart = Math.round(nodes[k]!);
        const xEnd = Math.round(nodes[k + 1]!);
        for (let x = xStart; x <= xEnd; x++) {
          this.setRaw(x, y, color);
        }
      }
    }
  }

  drawArticulatedLimb(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    thickness: number,
    shadowColor: string,
    highlightColor: string,
  ): void {
    this.line(x0, y0, x1, y1, shadowColor, thickness);
    this.line(
      x0 - 0.35,
      y0 - 0.5,
      x1 - 0.35,
      y1 - 0.5,
      highlightColor,
      this.scale > 1 ? 1 : Math.max(1, thickness - 1),
    );
  }

  /** Draws a billowing cloth cape or scarf behind/around a character */
  drawCape(
    shoulderX: number,
    shoulderY: number,
    tailX: number,
    tailY: number,
    widthTop: number,
    widthBottom: number,
    wavePhase: number,
    darkColor: string,
    midColor: string,
    edgeHighlight: string,
  ): void {
    const s = this.scale;
    const steps = Math.max(16, Math.ceil(18 * s));
    const sx = shoulderX * s;
    const sy = shoulderY * s;
    const tx = tailX * s;
    const ty = tailY * s;
    const wt = widthTop * s;
    const wb = widthBottom * s;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const sway = Math.sin(wavePhase + t * 3.1) * (1.5 + t * 2.5) * s;
      const cx = sx + (tx - sx) * t + sway;
      const cy = Math.round(sy + (ty - sy) * t);
      const w = Math.max(1, Math.round(wt + (wb - wt) * t));
      const xStart = Math.round(cx - w * 0.5);
      for (let dx = 0; dx < w; dx++) {
        // Subtle 1px tattered hem teeth along the bottom edge
        if (i >= steps - 1 && dx % 3 === 1) continue;
        const px = xStart + dx;
        if (dx === 0) this.setRaw(px, cy, edgeHighlight);
        else if (dx > w * 0.65 || (t > 0.68 && ((px + cy) & 1) === 1)) {
          this.setRaw(px, cy, darkColor);
        } else {
          this.setRaw(px, cy, midColor);
        }
      }
    }
  }

  /** Draws an expressive motion-smear crescent slash arc */
  drawSlashArc(
    cx: number,
    cy: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    thickness: number,
    outerColor: string,
    midColor: string,
    coreColor: string,
  ): void {
    const s = this.scale;
    const samples = Math.max(48, Math.ceil(56 * s));
    const pcx = cx * s;
    const pcy = cy * s;
    const prad = radius * s;
    const pthick = Math.max(1, thickness * s);

    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const angle = startAngle + (endAngle - startAngle) * t;
      // Taper thickness at tail and sharp 1px tip
      const taper = Math.sin(t * Math.PI);
      const localThick = Math.max(1, Math.round(pthick * (0.25 + 0.85 * taper)));
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      for (let rOff = -localThick; rOff <= 1; rOff++) {
        const r = prad + rOff;
        const px = Math.round(pcx + cos * r);
        const py = Math.round(pcy + sin * r);
        if (t > 0.65 && rOff >= 0) {
          this.setRaw(px, py, coreColor);
        } else if (rOff >= -Math.max(1, Math.round(s))) {
          this.setRaw(px, py, midColor);
        } else if (t > 0.25 || ((px + py) & 1) === 0) {
          this.setRaw(px, py, outerColor);
        }
      }
    }
  }

  /** Adds a crisp 1px dark silhouette outline around all opaque pixels */
  applyOutline(outlineColor: string = PAL.outline): void {
    const snapshot = this.pixels.slice();
    const dirs: ReadonlyArray<readonly [number, number]> = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = y * this.width + x;
        if (snapshot[idx] !== null) continue;
        let touchesOpaque = false;
        for (const [dx, dy] of dirs) {
          const nx = x + dx;
          const ny = y + dy;
          if (this.inBounds(nx, ny) && snapshot[ny * this.width + nx] !== null) {
            touchesOpaque = true;
            break;
          }
        }
        if (touchesOpaque) {
          this.pixels[idx] = outlineColor;
        }
      }
    }
  }

  /** Adds subtle directional top-left rim highlights to exposed top edges */
  applyTopRim(rimColor: string, excludeColors: ReadonlySet<string> = new Set()): void {
    const snapshot = this.pixels.slice();
    for (let y = 1; y < this.height; y++) {
      for (let x = 1; x < this.width; x++) {
        const idx = y * this.width + x;
        const cur = snapshot[idx];
        if (!cur || cur === PAL.outline || excludeColors.has(cur)) continue;
        const above = snapshot[(y - 1) * this.width + x];
        if (above === null || above === PAL.outline) {
          this.pixels[idx] = rimColor;
        }
      }
    }
  }

  private createCanvas(
    flipX: boolean,
    solidColorOverride: string | null = null,
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    const ctx = canvas.getContext('2d')!;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const color = this.pixels[y * this.width + x];
        if (!color) continue;
        ctx.fillStyle = solidColorOverride ?? color;
        const drawX = flipX ? this.width - 1 - x : x;
        ctx.fillRect(drawX, y, 1, 1);
      }
    }
    return canvas;
  }

  toCanvas(): HTMLCanvasElement {
    return this.createCanvas(false, null);
  }

  toFlippedCanvas(): HTMLCanvasElement {
    return this.createCanvas(true, null);
  }

  toFlashCanvas(flashColor = '#ffffff', flipX = false): HTMLCanvasElement {
    return this.createCanvas(flipX, flashColor);
  }
}
