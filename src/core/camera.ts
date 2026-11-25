import { PIXEL_SCALE, WORLD_VIEW_H, WORLD_VIEW_W } from './constants.ts';

export class Camera {
  x = 0;
  y = 0;
  private targetX = 0;
  private targetY = 0;
  private shakeTrauma = 0;
  private shakeAngle = 0;
  private lookAheadX = 0;

  worldWidth = WORLD_VIEW_W;
  worldHeight = WORLD_VIEW_H;

  setBounds(worldWidth: number, worldHeight: number): void {
    this.worldWidth = Math.max(WORLD_VIEW_W, worldWidth);
    this.worldHeight = Math.max(WORLD_VIEW_H, worldHeight);
  }

  snapTo(focusX: number, focusY: number): void {
    this.x = this.clampX(focusX - WORLD_VIEW_W * 0.5);
    this.y = this.clampY(focusY - WORLD_VIEW_H * 0.55);
    this.targetX = this.x;
    this.targetY = this.y;
  }

  addShake(trauma: number): void {
    this.shakeTrauma = Math.min(1, this.shakeTrauma + trauma);
  }

  update(dt: number, focusX: number, focusY: number, facing: number, velY: number): void {
    const desiredLookAhead = facing * 34;
    this.lookAheadX += (desiredLookAhead - this.lookAheadX) * Math.min(1, dt * 4.5);

    const lookAheadY = Math.max(-18, Math.min(26, velY * 0.05));
    this.targetX = this.clampX(focusX + this.lookAheadX - WORLD_VIEW_W * 0.5);
    this.targetY = this.clampY(focusY + lookAheadY - WORLD_VIEW_H * 0.56);

    const smoothX = 1 - Math.exp(-9.5 * dt);
    const smoothY = 1 - Math.exp(-7.5 * dt);

    this.x += (this.targetX - this.x) * smoothX;
    this.y += (this.targetY - this.y) * smoothY;

    this.x = this.clampX(this.x);
    this.y = this.clampY(this.y);

    if (this.shakeTrauma > 0) {
      this.shakeTrauma = Math.max(0, this.shakeTrauma - dt * 2.4);
      this.shakeAngle += dt * 62;
    }
  }

  private clampX(x: number): number {
    return Math.max(0, Math.min(this.worldWidth - WORLD_VIEW_W, x));
  }

  private clampY(y: number): number {
    return Math.max(0, Math.min(this.worldHeight - WORLD_VIEW_H, y));
  }

  getRenderOffset(): { x: number; y: number } {
    const shakeMag = this.shakeTrauma * this.shakeTrauma * 6.5;
    const ox = shakeMag > 0.1 ? Math.cos(this.shakeAngle * 1.7) * shakeMag : 0;
    const oy = shakeMag > 0.1 ? Math.sin(this.shakeAngle * 2.3) * shakeMag : 0;
    return {
      x: Math.round(this.x + ox),
      y: Math.round(this.y + oy),
    };
  }

  /**
   * Integer screen-pixel camera offset for seamless 24px tile alignment, paired with
   * continuous world coordinates for culling and weather spawns.
   */
  getPixelOffset(): { camPxX: number; camPxY: number; worldX: number; worldY: number } {
    const shakeMag = this.shakeTrauma * this.shakeTrauma * 6.5;
    const ox = shakeMag > 0.1 ? Math.cos(this.shakeAngle * 1.7) * shakeMag : 0;
    const oy = shakeMag > 0.1 ? Math.sin(this.shakeAngle * 2.3) * shakeMag : 0;
    const worldX = this.x + ox;
    const worldY = this.y + oy;
    return {
      camPxX: Math.round(worldX * PIXEL_SCALE),
      camPxY: Math.round(worldY * PIXEL_SCALE),
      worldX,
      worldY,
    };
  }
}
