import { describe, expect, it } from 'vitest';
import {
  PIXEL_SCALE,
  TILE_PX,
  TILE_SIZE,
  VIEW_H,
  VIEW_W,
  WORLD_VIEW_H,
  WORLD_VIEW_W,
} from '../src/core/constants.ts';
import type { BiomeId } from '../src/core/types.ts';
import { ENEMIES } from '../src/data/enemies.ts';
import { generateDungeon } from '../src/world/dungeonGenerator.ts';
import { DOOR_FLOOR_ROW, ROOM_HEIGHT_TILES, ROOM_TEMPLATES } from '../src/world/roomTemplates.ts';
import { generateSanctuary } from '../src/world/sanctuaryMap.ts';

describe('Dungeon & Sanctuary Generation (V2)', () => {
  const biomes: BiomeId[] = ['crypt', 'catacombs', 'ossuary', 'citadel'];

  it('has uniform row dimensions in all modular room templates', () => {
    for (const room of ROOM_TEMPLATES) {
      expect(room.rows.length).toBe(ROOM_HEIGHT_TILES);
      const expectedW = room.rows[0]!.length;
      expect(expectedW).toBeGreaterThanOrEqual(20);
      for (const row of room.rows) {
        expect(row.length).toBe(expectedW);
      }
    }
  });

  it('generates valid, connected levels for all 4 combat biomes across multiple seeds', () => {
    for (const biome of biomes) {
      for (const seed of [101, 404, 9001]) {
        const lvl = generateDungeon(biome, seed, 1);

        expect(lvl.biome).toBe(biome);
        expect(lvl.tileMap.width).toBeGreaterThan(70);
        expect(lvl.tileMap.height).toBe(ROOM_HEIGHT_TILES);

        const stx = Math.floor(lvl.playerSpawn.x / TILE_SIZE);
        const sty = Math.floor(lvl.playerSpawn.y / TILE_SIZE);
        expect(Number.isFinite(lvl.playerSpawn.x)).toBe(true);
        expect(Number.isFinite(lvl.playerSpawn.y)).toBe(true);
        expect(lvl.tileMap.isSolid(stx, sty)).toBe(true);
        expect(lvl.tileMap.isSolid(stx, sty - 1)).toBe(false);

        const portals = lvl.interactives.filter((i) => i.kind === 'exit_portal');
        expect(portals.length).toBeGreaterThanOrEqual(1);
        expect(lvl.interactives.some((i) => i.kind === 'waystone')).toBe(true);
        expect(lvl.interactives.some((i) => i.kind === 'trinity_scroll')).toBe(true);
        expect(lvl.enemySpawns.length).toBeGreaterThan(4);
        expect(lvl.lights.length).toBeGreaterThan(5);

        if (biome === 'crypt') {
          expect(lvl.bossSpawn?.enemyId).toBe('boss_inquisitor');
          expect(lvl.bossArenaBounds).toBeDefined();
          // Branching portals to both Catacombs & Ossuary
          const dests = portals.map((p) => p.targetBiome);
          expect(dests).toContain('catacombs');
          expect(dests).toContain('ossuary');
        } else if (biome === 'catacombs' || biome === 'ossuary') {
          expect(lvl.bossSpawn?.enemyId).toBe('boss_warden');
          expect(lvl.bossArenaBounds).toBeDefined();
        } else if (biome === 'citadel') {
          expect(lvl.bossSpawn?.enemyId).toBe('boss_sovereign');
          expect(lvl.bossArenaBounds).toBeDefined();
        }
      }
    }
  });

  it('generates the Pale Sanctuary with all 6 V2 permanent stations', () => {
    const sanc = generateSanctuary();
    const kinds = new Set(sanc.interactives.map((i) => i.kind));
    expect(kinds.has('soul_altar')).toBe(true);
    expect(kinds.has('training_dummy')).toBe(true);
    expect(kinds.has('hero_pedestal')).toBe(true);
    expect(kinds.has('deeds_lectern')).toBe(true);
    expect(kinds.has('curse_brazier')).toBe(true);
    expect(kinds.has('dungeon_gate')).toBe(true);
    expect(sanc.enemySpawns.length).toBe(0);
  });

  it('uses Dead Cells Hi-Bit pixel density (640x360 viewport, 24px rendered tiles)', () => {
    expect(VIEW_W).toBe(640);
    expect(VIEW_H).toBe(360);
    expect(TILE_SIZE).toBe(16);
    expect(PIXEL_SCALE).toBe(1.5);
    expect(TILE_PX).toBe(24);
    expect(WORLD_VIEW_W).toBeCloseTo(640 / 1.5, 5);
    expect(WORLD_VIEW_H).toBeCloseTo(360 / 1.5, 5);
  });

  it('enforces logical 3-to-4 tile jump reachability on all room and sanctuary platforms', () => {
    const assertPlatformReachability = (
      gridW: number,
      gridH: number,
      isWalkable: (x: number, y: number) => boolean,
      isPlat: (x: number, y: number) => boolean,
      floorRow: number,
    ): void => {
      for (let py = 0; py < gridH; py++) {
        let px = 0;
        while (px < gridW) {
          if (!isPlat(px, py)) {
            px++;
            continue;
          }
          // Guarantee >= 3 tiles headroom above the main floor
          expect(py).toBeLessThanOrEqual(floorRow - 3);

          const startX = px;
          while (px < gridW && isPlat(px, py)) px++;
          const endX = px - 1;

          // Every platform span must have a stepping-stone surface within 1..4 rows below and +-6 tiles horizontally
          let reachable = false;
          for (let sx = Math.max(0, startX - 6); sx <= Math.min(gridW - 1, endX + 6); sx++) {
            for (let sy = py + 1; sy <= Math.min(gridH - 1, py + 4); sy++) {
              if (isWalkable(sx, sy)) {
                reachable = true;
                break;
              }
            }
            if (reachable) break;
          }
          expect(reachable).toBe(true);
        }
      }
    };

    for (const room of ROOM_TEMPLATES) {
      const h = room.rows.length;
      const w = room.rows[0]!.length;
      assertPlatformReachability(
        w,
        h,
        (x, y) => room.rows[y]?.[x] === '#' || room.rows[y]?.[x] === '=',
        (x, y) => room.rows[y]?.[x] === '=',
        DOOR_FLOOR_ROW,
      );
    }

    const sanc = generateSanctuary();
    assertPlatformReachability(
      sanc.tileMap.width,
      sanc.tileMap.height,
      (x, y) => sanc.tileMap.isSolid(x, y) || sanc.tileMap.isPlatform(x, y),
      (x, y) => sanc.tileMap.isPlatform(x, y),
      17,
    );

    // Ground enemy spawns must rest cleanly atop a solid or platform tile and never on spikes
    for (const biome of biomes) {
      for (const seed of [101, 404, 9001]) {
        const lvl = generateDungeon(biome, seed, 1);
        for (const sp of lvl.enemySpawns) {
          if (ENEMIES[sp.enemyId].isFlying) continue;
          const tx = Math.floor(sp.x / TILE_SIZE);
          const supportTy = Math.round(sp.y / TILE_SIZE);
          expect(
            lvl.tileMap.isSolid(tx, supportTy) || lvl.tileMap.isPlatform(tx, supportTy),
          ).toBe(true);
          expect(lvl.tileMap.isSolid(tx, supportTy - 1)).toBe(false);
          expect(lvl.tileMap.isSpikes(tx, supportTy)).toBe(false);
          expect(lvl.tileMap.isSpikes(tx, supportTy - 1)).toBe(false);
        }
      }
    }
  });
});
