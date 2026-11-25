import { GRAVITY } from '../core/constants.ts';
import type { BiomeId, StationKind } from '../core/types.ts';
import type { TileMap } from '../world/tilemap.ts';

export type PickupKind = 'soul' | 'gold' | 'meat';

export interface PickupEntity {
  kind: PickupKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  value: number;
  age: number;
  collected: boolean;
}

export interface WorldStation {
  kind: StationKind;
  x: number;
  y: number; // bottom anchor y
  w: number;
  h: number;
  label?: string;
  used: boolean;
  hp: number; // used for breakables
  locked?: boolean; // used for exit_portal during boss fights
  activated?: boolean; // used for waystones
  targetBiome?: BiomeId;
  loreText?: string;
}

export function spawnLootBurst(
  pickups: PickupEntity[],
  x: number,
  y: number,
  souls: number,
  gold: number,
  dropMeat = false,
): void {
  const soulOrbs = Math.min(8, Math.max(souls > 0 ? 1 : 0, Math.ceil(souls / 3)));
  let remainingSouls = souls;
  for (let i = 0; i < soulOrbs; i++) {
    const val =
      i === soulOrbs - 1 ? remainingSouls : Math.max(1, Math.floor(remainingSouls / (soulOrbs - i)));
    remainingSouls -= val;
    pickups.push({
      kind: 'soul',
      x,
      y: y - 8,
      vx: -55 + Math.random() * 110,
      vy: -90 - Math.random() * 80,
      value: val,
      age: 0,
      collected: false,
    });
  }

  const coins = Math.min(7, Math.max(gold > 0 ? 1 : 0, Math.ceil(gold / 4)));
  let remainingGold = gold;
  for (let i = 0; i < coins; i++) {
    const val =
      i === coins - 1 ? remainingGold : Math.max(1, Math.floor(remainingGold / (coins - i)));
    remainingGold -= val;
    pickups.push({
      kind: 'gold',
      x,
      y: y - 6,
      vx: -65 + Math.random() * 130,
      vy: -80 - Math.random() * 75,
      value: val,
      age: 0,
      collected: false,
    });
  }

  if (dropMeat) {
    pickups.push({
      kind: 'meat',
      x,
      y: y - 10,
      vx: -30 + Math.random() * 60,
      vy: -115,
      value: 25,
      age: 0,
      collected: false,
    });
  }
}

export function updatePickups(
  pickups: PickupEntity[],
  dt: number,
  tileMap: TileMap,
  playerX: number,
  playerY: number,
  magnetRadius: number,
  onCollect: (p: PickupEntity) => void,
): void {
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i]!;
    p.age += dt;

    const dx = playerX - p.x;
    const dy = playerY - p.y;
    const dist = Math.hypot(dx, dy);

    // Souls and Gold magnetically accelerate toward the player
    if (p.age > 0.28 && p.kind !== 'meat' && dist < magnetRadius) {
      const pull = 280;
      p.vx += (dx / Math.max(1, dist)) * pull * dt * 6;
      p.vy += (dy / Math.max(1, dist)) * pull * dt * 6;
      const maxSpd = 260;
      const spd = Math.hypot(p.vx, p.vy);
      if (spd > maxSpd) {
        p.vx = (p.vx / spd) * maxSpd;
        p.vy = (p.vy / spd) * maxSpd;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    } else {
      p.vy += GRAVITY * 0.65 * dt;
      const res = tileMap.moveAndCollide(
        { x: p.x - 3, y: p.y - 6, w: 6, h: 6 },
        p.vx,
        p.vy,
        dt,
        false,
      );
      p.x = res.x + 3;
      p.y = res.y + 6;
      if (res.onGround) {
        p.vx *= 0.82;
        if (Math.abs(p.vy) > 40) p.vy = -p.vy * 0.35;
        else p.vy = 0;
      } else {
        p.vx = res.vx;
        p.vy = res.vy;
      }
    }

    if (dist < 14 && p.age > 0.16) {
      p.collected = true;
      onCollect(p);
      pickups.splice(i, 1);
    }
  }
}
