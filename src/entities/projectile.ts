import type { StatusType } from '../core/types.ts';
import type { TileMap } from '../world/tilemap.ts';

export type ProjectileKind =
  | 'fireball'
  | 'dagger'
  | 'judgement_wave'
  | 'cinder_pillar'
  | 'chain_hook'
  | 'soul_skull'
  | 'holy_lance'
  | 'bolt'
  | 'blood_orb'
  | 'frost_bolt'
  | 'fire_chain'
  | 'soul_wave'
  | 'spectral_blade'
  | 'meteor';

export interface Projectile {
  owner: 'player' | 'enemy';
  kind: ProjectileKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  life: number;
  maxLife: number;
  piercing: boolean;
  piercesShield?: boolean;
  homingStrength?: number;
  applyStatus?: StatusType;
  color: string;
  coreColor: string;
  hitIds: Set<number>;
  originX?: number;
  originY?: number;
  pullTarget?: boolean;
  warnDelay?: number; // for ceiling blades / meteors
  orbitAngle?: number;
}

export function updateProjectiles(
  projectiles: Projectile[],
  dt: number,
  tileMap: TileMap,
  targetX: number,
  targetY: number,
  onWallHit?: (p: Projectile) => void,
): void {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i]!;
    p.life -= dt;
    if (p.life <= 0) {
      projectiles.splice(i, 1);
      continue;
    }

    if (p.warnDelay !== undefined && p.warnDelay > 0) {
      p.warnDelay -= dt;
      continue;
    }

    if (p.homingStrength && p.homingStrength > 0) {
      const dx = targetX - p.x;
      const dy = targetY - p.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      const spd = Math.hypot(p.vx, p.vy);
      p.vx += (dx / dist) * p.homingStrength * dt;
      p.vy += (dy / dist) * p.homingStrength * dt;
      const nSpd = Math.max(1, Math.hypot(p.vx, p.vy));
      p.vx = (p.vx / nSpd) * spd;
      p.vy = (p.vy / nSpd) * spd;
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // Grounded / piercing wave projectiles skip solid tile destruction
    if (
      p.kind !== 'cinder_pillar' &&
      p.kind !== 'judgement_wave' &&
      p.kind !== 'soul_skull'
    ) {
      const tx = Math.floor(p.x / 16);
      const ty = Math.floor(p.y / 16);
      if (tileMap.isSolid(tx, ty)) {
        if (onWallHit) onWallHit(p);
        projectiles.splice(i, 1);
      }
    }
  }
}
