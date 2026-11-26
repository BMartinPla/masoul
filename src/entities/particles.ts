import {
  GRAVITY,
  PIXEL_SCALE,
  TILE_SIZE,
  VIEW_H,
  VIEW_W,
  WORLD_VIEW_H,
  WORLD_VIEW_W,
} from '../core/constants.ts';
import type { BiomeId } from '../core/types.ts';
import type { TileMap } from '../world/tilemap.ts';
import { drawPixelText, type PixelFontVariant } from '../art/pixelFont.ts';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  gravity: number;
  sticksOnFloor?: boolean;
  bouncesLeft?: number;
  fade?: boolean;
}

interface ShockwaveRing {
  x: number;
  y: number;
  maxRadius: number;
  color: string;
  life: number;
  maxLife: number;
}

interface SlashSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  len: number;
  color: string;
  life: number;
  maxLife: number;
}

interface Afterimage {
  canvas: HTMLCanvasElement;
  worldX: number;
  worldY: number;
  anchorX: number;
  anchorY: number;
  life: number;
  maxLife: number;
  tintColor?: string;
}

interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  scale: number;
  variant: PixelFontVariant;
  life: number;
  maxLife: number;
}

interface LightningBolt {
  points: Array<{ x: number; y: number }>;
  color: string;
  life: number;
}

interface BloodStain {
  x: number;
  y: number;
  w: number;
  color: string;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private afterimages: Afterimage[] = [];
  private popups: FloatingText[] = [];
  private bolts: LightningBolt[] = [];
  private stains: BloodStain[] = [];
  private shockwaves: ShockwaveRing[] = [];
  private sparks: SlashSpark[] = [];
  private tintCache = new WeakMap<HTMLCanvasElement, Map<string, HTMLCanvasElement>>();
  private motes: Array<{ x: number; y: number; vx: number; vy: number; phase: number }> = [];

  constructor() {
    for (let i = 0; i < 56; i++) {
      this.motes.push({
        x: Math.random() * VIEW_W,
        y: Math.random() * VIEW_H,
        vx: -8 + Math.random() * 16,
        vy: -6 - Math.random() * 10,
        phase: Math.random() * 6.28,
      });
    }
  }

  clear(): void {
    this.particles.length = 0;
    this.afterimages.length = 0;
    this.popups.length = 0;
    this.bolts.length = 0;
    this.stains.length = 0;
    this.shockwaves.length = 0;
    this.sparks.length = 0;
  }

  spawnBurst(
    x: number,
    y: number,
    count: number,
    colors: readonly string[],
    speedMin: number,
    speedMax: number,
    gravity = GRAVITY * 0.55,
    size = 2,
    sticksOnFloor = false,
  ): void {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = speedMin + Math.random() * (speedMax - speedMin);
      const life = 0.25 + Math.random() * 0.38;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 35,
        size: Math.random() < 0.4 ? size : Math.max(1, size - 1),
        color: colors[i % colors.length]!,
        life,
        maxLife: life,
        gravity,
        sticksOnFloor,
        fade: true,
      });
    }
  }

  spawnBlood(x: number, y: number, dirX: number, count = 10): void {
    const colors = ['#991e36', '#d1364e', '#ff6b7a'];
    for (let i = 0; i < count; i++) {
      const life = 0.35 + Math.random() * 0.35;
      this.particles.push({
        x: x + (-3 + Math.random() * 6),
        y: y + (-4 + Math.random() * 8),
        vx: dirX * (45 + Math.random() * 95) + (-35 + Math.random() * 70),
        vy: -40 - Math.random() * 95,
        size: Math.random() < 0.55 ? 2 : 1,
        color: colors[i % colors.length]!,
        life,
        maxLife: life,
        gravity: GRAVITY * 0.72,
        sticksOnFloor: true,
        fade: false,
      });
    }
  }

  spawnSoulWisps(x: number, y: number, count = 8): void {
    const colors = ['#3bc2cf', '#7ef5eb', '#d6fffa'];
    for (let i = 0; i < count; i++) {
      const life = 0.45 + Math.random() * 0.35;
      this.particles.push({
        x: x + (-6 + Math.random() * 12),
        y: y + (-6 + Math.random() * 12),
        vx: -24 + Math.random() * 48,
        vy: -35 - Math.random() * 55,
        size: 2,
        color: colors[i % colors.length]!,
        life,
        maxLife: life,
        gravity: -40,
        fade: true,
      });
    }
  }

  spawnDust(x: number, y: number, count = 5): void {
    this.spawnBurst(x, y, count, ['#747091', '#9a96b8', '#cfc0a9'], 18, 55, 40, 2);
  }

  spawnShockwave(x: number, y: number, maxRadius: number, color: string, life = 0.24): void {
    this.shockwaves.push({ x, y, maxRadius, color, life, maxLife: life });
  }

  spawnSlashSparks(x: number, y: number, dirX: number, count = 7, color = '#ffe082'): void {
    const base = dirX >= 0 ? 0 : Math.PI;
    for (let i = 0; i < count; i++) {
      const ang = base + (-0.85 + Math.random() * 1.7);
      const spd = 110 + Math.random() * 160;
      const life = 0.14 + Math.random() * 0.12;
      this.sparks.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 15,
        len: 4 + Math.random() * 6,
        color: i % 3 === 0 ? '#ffffff' : color,
        life,
        maxLife: life,
      });
    }
  }

  spawnDebris(x: number, y: number, kind: 'wood' | 'bone', count = 7): void {
    const colors =
      kind === 'wood' ? ['#6b4228', '#96613d', '#b57a50'] : ['#cfc0a9', '#e5dac3', '#9a96b8'];
    for (let i = 0; i < count; i++) {
      const life = 0.55 + Math.random() * 0.35;
      this.particles.push({
        x: x + (-4 + Math.random() * 8),
        y: y + (-6 + Math.random() * 6),
        vx: -95 + Math.random() * 190,
        vy: -70 - Math.random() * 110,
        size: 2,
        color: colors[i % colors.length]!,
        life,
        maxLife: life,
        gravity: GRAVITY * 0.85,
        bouncesLeft: 2,
        fade: true,
      });
    }
  }

  spawnTrailMote(
    x: number,
    y: number,
    vx: number,
    vy: number,
    color: string,
    size = 1,
    life = 0.22,
    gravity = 0,
  ): void {
    this.particles.push({
      x,
      y,
      vx,
      vy,
      size,
      color,
      life,
      maxLife: life,
      gravity,
      fade: true,
    });
  }

  addAfterimage(
    canvas: HTMLCanvasElement,
    worldX: number,
    worldY: number,
    anchorX: number,
    anchorY: number,
    life = 0.16,
    tintColor?: string,
  ): void {
    this.afterimages.push({
      canvas,
      worldX,
      worldY,
      anchorX,
      anchorY,
      life,
      maxLife: life,
      tintColor,
    });
  }

  addDamageNumber(x: number, y: number, text: string, color: string, isCrit = false): void {
    this.popups.push({
      x: Math.round(x + (-4 + Math.random() * 8)),
      y: Math.round(y),
      vy: isCrit ? -44 : -30,
      text,
      color,
      scale: 1,
      variant: isCrit ? 'gothic' : 'compact',
      life: isCrit ? 0.78 : 0.60,
      maxLife: isCrit ? 0.78 : 0.60,
    });
  }

  addLightningArc(x0: number, y0: number, x1: number, y1: number, color = '#ffe082'): void {
    const points: Array<{ x: number; y: number }> = [{ x: x0, y: y0 }];
    const segments = 5;
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      points.push({
        x: x0 + (x1 - x0) * t + (-8 + Math.random() * 16),
        y: y0 + (y1 - y0) * t + (-8 + Math.random() * 16),
      });
    }
    points.push({ x: x1, y: y1 });
    this.bolts.push({ points, color, life: 0.16 });
  }

  private weatherTimer = 0;

  update(dt: number, tileMap: TileMap, biomeId: BiomeId = 'sanctuary', camWorldX = 0, camWorldY = 0): void {
    this.weatherTimer -= dt;
    if (this.weatherTimer <= 0) {
      this.weatherTimer = biomeId === 'sanctuary' ? 0.20 : biomeId === 'crypt' ? 0.16 : 0.12;
      const wx = camWorldX + Math.random() * WORLD_VIEW_W;
      if (biomeId === 'sanctuary') {
        // Gentle golden-cyan cathedral dust motes drifting through god-rays
        this.particles.push({
          x: wx,
          y: camWorldY + 18 + Math.random() * (WORLD_VIEW_H * 0.65),
          vx: 6 + Math.random() * 10,
          vy: 5 + Math.random() * 8,
          size: 1,
          color: Math.random() < 0.65 ? '#ffe082' : '#7ef5eb',
          life: 2.2,
          maxLife: 2.2,
          gravity: 0,
          fade: true,
        });
      } else if (biomeId === 'crypt') {
        // Dripping cavern water droplets from ceiling
        this.particles.push({
          x: wx,
          y: camWorldY + 24,
          vx: 0,
          vy: 75 + Math.random() * 45,
          size: 1,
          color: '#7ef5eb',
          life: 1.6,
          maxLife: 1.6,
          gravity: GRAVITY * 0.45,
          sticksOnFloor: true,
          fade: false,
        });
      } else if (biomeId === 'ossuary') {
        // Rising toxic emerald spores
        this.particles.push({
          x: wx,
          y: camWorldY + WORLD_VIEW_H - 16,
          vx: -10 + Math.random() * 20,
          vy: -24 - Math.random() * 24,
          size: Math.random() < 0.4 ? 2 : 1,
          color: '#9be675',
          life: 1.8,
          maxLife: 1.8,
          gravity: -15,
          fade: true,
        });
      } else if (biomeId === 'catacombs') {
        // Floating crimson blood-spores
        this.particles.push({
          x: wx,
          y: camWorldY + Math.random() * WORLD_VIEW_H,
          vx: -12 + Math.random() * 24,
          vy: -12 - Math.random() * 14,
          size: 1,
          color: '#ff6b7a',
          life: 1.5,
          maxLife: 1.5,
          gravity: -8,
          fade: true,
        });
      } else if (biomeId === 'citadel') {
        // Rising molten embers
        this.particles.push({
          x: wx,
          y: camWorldY + WORLD_VIEW_H - 14,
          vx: -14 + Math.random() * 28,
          vy: -38 - Math.random() * 32,
          size: Math.random() < 0.35 ? 2 : 1,
          color: Math.random() < 0.5 ? '#ff9636' : '#ffd466',
          life: 1.4,
          maxLife: 1.4,
          gravity: -25,
          fade: true,
        });
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.sticksOnFloor) {
        const tx = Math.floor(p.x / TILE_SIZE);
        const ty = Math.floor(p.y / TILE_SIZE);
        if (tileMap.isSolid(tx, ty)) {
          if (p.color !== '#7ef5eb' && this.stains.length < 180) {
            this.stains.push({
              x: Math.round(p.x),
              y: ty * TILE_SIZE,
              w: Math.random() < 0.5 ? 3 : 2,
              color: p.color,
            });
          } else if (p.color === '#7ef5eb') {
            // Tiny water splash mist
            this.particles.push({
              x: p.x - 2,
              y: ty * TILE_SIZE - 1,
              vx: -18,
              vy: -24,
              size: 1,
              color: '#d6fffa',
              life: 0.16,
              maxLife: 0.16,
              gravity: 90,
              fade: true,
            });
          }
          this.particles.splice(i, 1);
        }
      } else if (p.bouncesLeft && p.bouncesLeft > 0 && p.vy > 0) {
        const tx = Math.floor(p.x / TILE_SIZE);
        const ty = Math.floor(p.y / TILE_SIZE);
        if (tileMap.isSolid(tx, ty)) {
          p.y = ty * TILE_SIZE - 1;
          p.vy = -p.vy * 0.48;
          p.vx *= 0.65;
          p.bouncesLeft -= 1;
        }
      }
    }

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      this.shockwaves[i]!.life -= dt;
      if (this.shockwaves[i]!.life <= 0) this.shockwaves.splice(i, 1);
    }

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i]!;
      sp.life -= dt;
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.vx *= Math.pow(0.08, dt);
      sp.vy *= Math.pow(0.08, dt);
      if (sp.life <= 0) this.sparks.splice(i, 1);
    }

    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      this.afterimages[i]!.life -= dt;
      if (this.afterimages[i]!.life <= 0) this.afterimages.splice(i, 1);
    }

    for (let i = this.popups.length - 1; i >= 0; i--) {
      const pop = this.popups[i]!;
      pop.life -= dt;
      pop.y += pop.vy * dt;
      pop.vy *= Math.pow(0.25, dt);
      if (pop.life <= 0) this.popups.splice(i, 1);
    }

    for (let i = this.bolts.length - 1; i >= 0; i--) {
      this.bolts[i]!.life -= dt;
      if (this.bolts[i]!.life <= 0) this.bolts.splice(i, 1);
    }

    for (const m of this.motes) {
      m.phase += dt * 2.2;
      m.x += (m.vx + Math.sin(m.phase) * 6) * dt;
      m.y += m.vy * dt;
      if (m.y < -4) m.y = VIEW_H + 4;
      if (m.x < -4) m.x = VIEW_W + 4;
      if (m.x > VIEW_W + 4) m.x = -4;
    }
  }

  renderWorld(ctx: CanvasRenderingContext2D, camPxX: number, camPxY: number): void {
    // Floor blood stains
    for (const s of this.stains) {
      const sx = Math.round(s.x * PIXEL_SCALE) - camPxX;
      const sy = Math.round(s.y * PIXEL_SCALE) - camPxY;
      if (sx < -10 || sx > VIEW_W + 10 || sy < -10 || sy > VIEW_H + 10) continue;
      ctx.fillStyle = s.color;
      ctx.fillRect(sx, sy, Math.max(2, Math.ceil(s.w * PIXEL_SCALE)), 2);
    }

    // Dodge/Shadow Step / Overdrive afterimages
    for (const a of this.afterimages) {
      const sprite = a.tintColor ? this.getTintedSilhouette(a.canvas, a.tintColor) : a.canvas;
      ctx.save();
      ctx.globalAlpha = Math.max(0, (a.life / a.maxLife) * (a.tintColor ? 0.62 : 0.45));
      ctx.drawImage(
        sprite,
        Math.round(a.worldX * PIXEL_SCALE) - camPxX - a.anchorX,
        Math.round(a.worldY * PIXEL_SCALE) - camPxY - a.anchorY,
      );
      ctx.restore();
    }

    // Active particles
    for (const p of this.particles) {
      const px = Math.round(p.x * PIXEL_SCALE) - camPxX;
      const py = Math.round(p.y * PIXEL_SCALE) - camPxY;
      if (px < -12 || px > VIEW_W + 12 || py < -12 || py > VIEW_H + 12) continue;
      if (p.fade) {
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      }
      const sz = Math.max(1, Math.round(p.size * PIXEL_SCALE));
      ctx.fillStyle = p.color;
      ctx.fillRect(px, py, sz, sz);
      ctx.globalAlpha = 1;
    }

    // Storm Brand lightning arcs
    for (const b of this.bolts) {
      ctx.save();
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < b.points.length; i++) {
        const pt = b.points[i]!;
        const sx = Math.round(pt.x * PIXEL_SCALE) - camPxX;
        const sy = Math.round(pt.y * PIXEL_SCALE) - camPxY;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Floating damage / status numbers
    for (const pop of this.popups) {
      const px = Math.round(pop.x * PIXEL_SCALE) - camPxX;
      const py = Math.round(pop.y * PIXEL_SCALE) - camPxY;
      ctx.globalAlpha = Math.min(1, (pop.life / pop.maxLife) * 1.4);
      drawPixelText(ctx, pop.text, px, py, {
        color: pop.color,
        scale: pop.scale,
        variant: pop.variant,
        align: 'center',
      });
      ctx.globalAlpha = 1;
    }

    // Expanding shockwave rings
    for (const sw of this.shockwaves) {
      const progress = 1 - sw.life / sw.maxLife;
      const rx = Math.round(sw.x * PIXEL_SCALE) - camPxX;
      const ry = Math.round(sw.y * PIXEL_SCALE) - camPxY;
      const radius = Math.max(2, sw.maxRadius * progress * PIXEL_SCALE);
      ctx.save();
      ctx.globalAlpha = Math.max(0, (1 - progress) * 0.85);
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = Math.max(1, (1 - progress) * 3);
      ctx.beginPath();
      ctx.arc(rx, ry, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Directional slash sparks
    for (const sp of this.sparks) {
      const sx = Math.round(sp.x * PIXEL_SCALE) - camPxX;
      const sy = Math.round(sp.y * PIXEL_SCALE) - camPxY;
      const mag = Math.hypot(sp.vx, sp.vy) || 1;
      const dx = (sp.vx / mag) * sp.len * PIXEL_SCALE;
      const dy = (sp.vy / mag) * sp.len * PIXEL_SCALE;
      ctx.save();
      ctx.globalAlpha = Math.max(0, sp.life / sp.maxLife);
      ctx.strokeStyle = sp.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - dx, sy - dy);
      ctx.stroke();
      ctx.restore();
    }
  }

  private getTintedSilhouette(src: HTMLCanvasElement, tintColor: string): HTMLCanvasElement {
    let byColor = this.tintCache.get(src);
    if (!byColor) {
      byColor = new Map<string, HTMLCanvasElement>();
      this.tintCache.set(src, byColor);
    }
    const cached = byColor.get(tintColor);
    if (cached) return cached;

    const c = document.createElement('canvas');
    c.width = src.width;
    c.height = src.height;
    const tctx = c.getContext('2d')!;
    tctx.imageSmoothingEnabled = false;
    tctx.drawImage(src, 0, 0);
    tctx.globalCompositeOperation = 'source-atop';
    tctx.globalAlpha = 0.72;
    tctx.fillStyle = tintColor;
    tctx.fillRect(0, 0, c.width, c.height);
    byColor.set(tintColor, c);
    return c;
  }

  renderAmbientMotes(ctx: CanvasRenderingContext2D, color: string): void {
    ctx.fillStyle = color;
    for (let i = 0; i < this.motes.length; i++) {
      const m = this.motes[i]!;
      ctx.globalAlpha = 0.25 + 0.2 * Math.sin(m.phase);
      ctx.fillRect(Math.round(m.x), Math.round(m.y), 1, 1);
    }
    ctx.globalAlpha = 1;
  }
}
