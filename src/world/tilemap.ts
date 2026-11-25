import { TILE_SIZE } from '../core/constants.ts';
import type { Rect, TileType } from '../core/types.ts';

export interface MoveResult {
  x: number;
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
  hitWallLeft: boolean;
  hitWallRight: boolean;
  hitCeiling: boolean;
  onSpikes: boolean;
}

export class TileMap {
  readonly width: number;
  readonly height: number;
  readonly tiles: Uint8Array;
  readonly variants: Uint8Array;
  readonly masks: Uint8Array;
  readonly explored: Uint8Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    const len = width * height;
    this.tiles = new Uint8Array(len);
    this.variants = new Uint8Array(len);
    this.masks = new Uint8Array(len);
    this.explored = new Uint8Array(len);

    for (let i = 0; i < len; i++) {
      this.variants[i] = ((i * 7 + (i >> 4) * 13) & 0xff) % 3;
    }
  }

  inBounds(tx: number, ty: number): boolean {
    return tx >= 0 && ty >= 0 && tx < this.width && ty < this.height;
  }

  getTile(tx: number, ty: number): TileType {
    if (!this.inBounds(tx, ty)) return 1; // Out-of-bounds is solid boundary
    return this.tiles[ty * this.width + tx] as TileType;
  }

  setTile(tx: number, ty: number, tile: TileType): void {
    if (!this.inBounds(tx, ty)) return;
    this.tiles[ty * this.width + tx] = tile;
  }

  isSolid(tx: number, ty: number): boolean {
    return this.getTile(tx, ty) === 1;
  }

  isPlatform(tx: number, ty: number): boolean {
    return this.getTile(tx, ty) === 2;
  }

  isSpikes(tx: number, ty: number): boolean {
    return this.getTile(tx, ty) === 3;
  }

  computeMasks(): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (!this.isSolid(x, y)) {
          this.masks[y * this.width + x] = 0;
          continue;
        }
        let m = 0;
        if (this.isSolid(x, y - 1)) m |= 1;
        if (this.isSolid(x + 1, y)) m |= 2;
        if (this.isSolid(x, y + 1)) m |= 4;
        if (this.isSolid(x - 1, y)) m |= 8;
        this.masks[y * this.width + x] = m;
      }
    }
  }

  markExploredAround(worldX: number, worldY: number, radiusTiles = 10): void {
    const cx = Math.floor(worldX / TILE_SIZE);
    const cy = Math.floor(worldY / TILE_SIZE);
    const r2 = radiusTiles * radiusTiles;
    const minX = Math.max(0, cx - radiusTiles);
    const maxX = Math.min(this.width - 1, cx + radiusTiles);
    const minY = Math.max(0, cy - radiusTiles);
    const maxY = Math.min(this.height - 1, cy + radiusTiles);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= r2) {
          this.explored[y * this.width + x] = 1;
        }
      }
    }
  }

  hasLineOfSight(x0: number, y0: number, x1: number, y1: number): boolean {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return true;
    const steps = Math.ceil(dist / 6);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const px = x0 + dx * t;
      const py = y0 + dy * t;
      const tx = Math.floor(px / TILE_SIZE);
      const ty = Math.floor(py / TILE_SIZE);
      if (this.isSolid(tx, ty)) return false;
    }
    return true;
  }

  moveAndCollide(
    rect: Rect,
    vx: number,
    vy: number,
    dt: number,
    ignorePlatforms = false,
  ): MoveResult {
    let x = rect.x;
    let y = rect.y;
    let outVx = vx;
    let outVy = vy;
    let onGround = false;
    let hitWallLeft = false;
    let hitWallRight = false;
    let hitCeiling = false;
    let onSpikes = false;

    const eps = 0.01;

    // 1. Horizontal Sweep
    x += outVx * dt;
    const topTileY = Math.floor((y + eps) / TILE_SIZE);
    const botTileY = Math.floor((y + rect.h - eps) / TILE_SIZE);

    if (outVx > 0) {
      const rightTileX = Math.floor((x + rect.w - eps) / TILE_SIZE);
      for (let ty = topTileY; ty <= botTileY; ty++) {
        if (this.isSolid(rightTileX, ty)) {
          x = rightTileX * TILE_SIZE - rect.w;
          outVx = 0;
          hitWallRight = true;
          break;
        }
      }
    } else if (outVx < 0) {
      const leftTileX = Math.floor((x + eps) / TILE_SIZE);
      for (let ty = topTileY; ty <= botTileY; ty++) {
        if (this.isSolid(leftTileX, ty)) {
          x = (leftTileX + 1) * TILE_SIZE;
          outVx = 0;
          hitWallLeft = true;
          break;
        }
      }
    }

    // 2. Vertical Sweep
    const prevBottom = y + rect.h;
    y += outVy * dt;
    const leftTileX = Math.floor((x + eps) / TILE_SIZE);
    const rightTileX = Math.floor((x + rect.w - eps) / TILE_SIZE);

    if (outVy >= 0) {
      const botTile = Math.floor((y + rect.h - eps) / TILE_SIZE);
      for (let tx = leftTileX; tx <= rightTileX; tx++) {
        if (this.isSolid(tx, botTile)) {
          y = botTile * TILE_SIZE - rect.h;
          outVy = 0;
          onGround = true;
          break;
        }
        if (!ignorePlatforms && this.isPlatform(tx, botTile)) {
          const platTop = botTile * TILE_SIZE;
          if (prevBottom <= platTop + 4) {
            y = platTop - rect.h;
            outVy = 0;
            onGround = true;
            break;
          }
        }
      }
    } else if (outVy < 0) {
      const topTile = Math.floor((y + eps) / TILE_SIZE);
      for (let tx = leftTileX; tx <= rightTileX; tx++) {
        if (this.isSolid(tx, topTile)) {
          y = (topTile + 1) * TILE_SIZE;
          outVy = 0;
          hitCeiling = true;
          break;
        }
      }
    }

    // 3. Check spike contact
    const checkMinX = Math.floor((x + 2) / TILE_SIZE);
    const checkMaxX = Math.floor((x + rect.w - 2) / TILE_SIZE);
    const checkMinY = Math.floor((y + rect.h - 8) / TILE_SIZE);
    const checkMaxY = Math.floor((y + rect.h - 1) / TILE_SIZE);
    for (let ty = checkMinY; ty <= checkMaxY; ty++) {
      for (let tx = checkMinX; tx <= checkMaxX; tx++) {
        if (this.isSpikes(tx, ty)) {
          onSpikes = true;
          break;
        }
      }
      if (onSpikes) break;
    }

    return {
      x,
      y,
      vx: outVx,
      vy: outVy,
      onGround,
      hitWallLeft,
      hitWallRight,
      hitCeiling,
      onSpikes,
    };
  }
}
