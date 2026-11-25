import { TILE_SIZE } from '../core/constants.ts';
import { SeededRng } from '../core/rng.ts';
import type {
  BiomeId,
  EnemyId,
  EnemySpawn,
  InteractivePlacement,
  LightSource,
  PropPlacement,
  Rect,
} from '../core/types.ts';
import { BIOMES } from '../data/biomes.ts';
import { ENEMIES } from '../data/enemies.ts';
import {
  DOOR_FLOOR_ROW,
  getTemplatesByRole,
  ROOM_HEIGHT_TILES,
  type RoomTemplate,
} from './roomTemplates.ts';
import { TileMap } from './tilemap.ts';

const LORE_INSCRIPTIONS: readonly string[] = [
  'Sir Aldric swore an oath upon the Pale Altar before the Citadel fell.',
  'The Blighted Ossuary seals ancient heresy beneath the flooded crypts.',
  'Malakor burned the cathedral archives to harness the Ashen Flame.',
  'Vespera once tended the sick until the blood-moon plague took the town.',
  'Garrick chained the crypt gates so none might wake Malgrim\'s slumber.',
  'Drink sparingly from the Crimson Chalice; every drop demands toll.',
  'A Trinity Scroll bends steel, sorcery, or flesh to the bearer\'s will.',
];

const VANGUARD_IDS = new Set<EnemyId>(['skeleton', 'ghoul', 'dark_knight', 'brute', 'plague_rat']);
const VANTAGE_IDS = new Set<EnemyId>(['crossbowman', 'cultist']);

function snapToSurface(
  room: RoomTemplate,
  x: number,
  startY: number,
): { surfaceRow: number; onPlatform: boolean; spanWidth: number } {
  let floorTileY = startY;
  while (
    floorTileY < ROOM_HEIGHT_TILES - 1 &&
    room.rows[floorTileY + 1]?.[x] !== '#' &&
    room.rows[floorTileY + 1]?.[x] !== '='
  ) {
    floorTileY++;
  }
  const surfaceRow = floorTileY + 1;
  const rowStr = room.rows[surfaceRow] ?? '';
  const onPlatform = rowStr[x] === '=';
  let left = x;
  while (left > 0 && (rowStr[left - 1] === '#' || rowStr[left - 1] === '=')) {
    left--;
  }
  let right = x;
  while (right < rowStr.length - 1 && (rowStr[right + 1] === '#' || rowStr[right + 1] === '=')) {
    right++;
  }
  return { surfaceRow, onPlatform, spanWidth: right - left + 1 };
}

export interface GeneratedDungeon {
  biome: BiomeId;
  seed: number;
  tileMap: TileMap;
  playerSpawn: { x: number; y: number };
  props: PropPlacement[];
  interactives: InteractivePlacement[];
  enemySpawns: EnemySpawn[];
  lights: LightSource[];
  bossArenaBounds?: Rect;
  bossSpawn?: EnemySpawn;
}

export function generateDungeon(
  biomeId: BiomeId,
  seed: number,
  curseTier = 0,
): GeneratedDungeon {
  const rng = new SeededRng(seed);
  const biome = BIOMES[biomeId];

  const startRooms = getTemplatesByRole('start');
  const combatRooms = getTemplatesByRole('combat');
  const shrineRooms = getTemplatesByRole('shrine');
  const scrollRooms = getTemplatesByRole('scroll');
  const merchantRooms = getTemplatesByRole('merchant');
  const endRooms = getTemplatesByRole(biome.bossId ? 'boss' : 'exit');

  const sequence: RoomTemplate[] = [];
  sequence.push(rng.pick(startRooms));

  const middleCount = Math.max(6, biome.roomCount - 2);
  const scrollSlot = 1;
  const shrineSlot = Math.floor(middleCount / 2);
  const merchantSlot = Math.max(2, middleCount - 1);

  for (let i = 0; i < middleCount; i++) {
    if (i === scrollSlot) {
      sequence.push(rng.pick(scrollRooms));
    } else if (i === shrineSlot) {
      sequence.push(rng.pick(shrineRooms));
    } else if (i === merchantSlot) {
      sequence.push(rng.pick(merchantRooms));
    } else {
      sequence.push(rng.pick(combatRooms));
    }
  }
  sequence.push(rng.pick(endRooms));

  // Compute total width
  let totalWidth = 0;
  const roomOffsets: number[] = [];
  for (const room of sequence) {
    roomOffsets.push(totalWidth);
    totalWidth += room.rows[0]!.length;
  }

  const tileMap = new TileMap(totalWidth, ROOM_HEIGHT_TILES);
  const props: PropPlacement[] = [];
  const interactives: InteractivePlacement[] = [];
  const enemySpawns: EnemySpawn[] = [];
  const lights: LightSource[] = [];

  let playerSpawn = {
    x: 5 * TILE_SIZE,
    y: DOOR_FLOOR_ROW * TILE_SIZE,
  };
  let bossArenaBounds: Rect | undefined;
  let bossSpawn: EnemySpawn | undefined;

  const weightedEnemies = biome.enemyWeights.map((w) => ({
    item: w.id,
    weight: w.weight,
  }));

  const pickSmartGroundEnemy = (onPlatform: boolean, spanWidth: number): EnemyId => {
    let candidates = weightedEnemies.filter((e) => !ENEMIES[e.item].isFlying);
    if (onPlatform && spanWidth <= 7) {
      const agile = candidates.filter((e) => e.item !== 'brute' && e.item !== 'plague_rat');
      if (agile.length > 0) candidates = agile;
    }
    if (candidates.length === 0) return 'skeleton';
    return rng.weightedPick(candidates);
  };

  const pickVanguardEnemy = (spanWidth: number): EnemyId => {
    let candidates = weightedEnemies.filter(
      (e) =>
        !ENEMIES[e.item].isFlying &&
        VANGUARD_IDS.has(e.item) &&
        (spanWidth >= 6 || e.item !== 'brute'),
    );
    if (candidates.length === 0) {
      candidates = weightedEnemies.filter((e) => !ENEMIES[e.item].isFlying);
    }
    if (candidates.length === 0) return 'skeleton';
    return rng.weightedPick(candidates);
  };

  const pickVantageEnemy = (): EnemyId => {
    const ranged = weightedEnemies.filter((e) => VANTAGE_IDS.has(e.item));
    if (ranged.length > 0) return rng.weightedPick(ranged);
    return pickSmartGroundEnemy(true, 5);
  };

  const pickFlyingEnemy = (): EnemyId => {
    const candidates = weightedEnemies.filter((e) => ENEMIES[e.item].isFlying);
    if (candidates.length === 0) return 'gargoyle';
    return rng.weightedPick(candidates);
  };

  for (let rIdx = 0; rIdx < sequence.length; rIdx++) {
    const room = sequence[rIdx]!;
    const ox = roomOffsets[rIdx]!;
    const roomW = room.rows[0]!.length;

    if (room.role === 'boss') {
      bossArenaBounds = {
        x: ox * TILE_SIZE,
        y: 0,
        w: roomW * TILE_SIZE,
        h: ROOM_HEIGHT_TILES * TILE_SIZE,
      };
    }

    for (let y = 0; y < ROOM_HEIGHT_TILES; y++) {
      const rowStr = room.rows[y] ?? '';
      for (let x = 0; x < roomW; x++) {
        const ch = rowStr[x] ?? '.';
        const gx = ox + x;
        const wx = gx * TILE_SIZE + TILE_SIZE * 0.5;
        const wy = (y + 1) * TILE_SIZE;

        // Open doorway on outer edge between stitched rooms (avoid trapping player)
        const isLeftSeam = x === 0 && rIdx > 0 && y >= 12 && y < DOOR_FLOOR_ROW;
        const isRightSeam = x === roomW - 1 && rIdx < sequence.length - 1 && y >= 12 && y < DOOR_FLOOR_ROW;
        if (isLeftSeam || isRightSeam) {
          tileMap.setTile(gx, y, 0);
          continue;
        }

        switch (ch) {
          case '#':
            tileMap.setTile(gx, y, 1);
            break;
          case '=':
            tileMap.setTile(gx, y, 2);
            break;
          case '^':
            tileMap.setTile(gx, y, 3);
            break;
          case 'S':
            playerSpawn = { x: wx, y: DOOR_FLOOR_ROW * TILE_SIZE };
            break;
          case 'T':
            props.push({ kind: 'torch', x: wx, y: y * TILE_SIZE + 8, variant: rng.int(0, 3) });
            lights.push({
              x: wx,
              y: y * TILE_SIZE + 4,
              radius: 78,
              color: biome.torchColor,
              intensity: 0.95,
              flicker: 0.1,
            });
            break;
          case 'B':
            props.push({ kind: 'brazier', x: wx, y: DOOR_FLOOR_ROW * TILE_SIZE, variant: 0 });
            lights.push({
              x: wx,
              y: DOOR_FLOOR_ROW * TILE_SIZE - 16,
              radius: 95,
              color: biome.torchColor,
              intensity: 1.0,
              flicker: 0.12,
            });
            break;
          case 'W':
            props.push({ kind: 'rose_window', x: wx, y: y * TILE_SIZE + 16, variant: 0 });
            lights.push({
              x: wx,
              y: y * TILE_SIZE + 20,
              radius: 82,
              color: biome.stoneAccent,
              intensity: 0.65,
              flicker: 0.02,
            });
            break;
          case 'N':
            props.push({ kind: 'banner', x: wx, y: y * TILE_SIZE, variant: 0 });
            break;
          case 'C':
            props.push({ kind: 'chain', x: wx, y: y * TILE_SIZE, variant: 0 });
            break;
          case 'P': {
            const snap = snapToSurface(room, x, y);
            interactives.push({
              kind: rng.chance(0.55) ? 'barrel' : 'crate',
              x: wx,
              y: snap.surfaceRow * TILE_SIZE,
            });
            break;
          }
          case 'L': {
            const snap = snapToSurface(room, x, y);
            const sy = snap.surfaceRow * TILE_SIZE;
            interactives.push({
              kind: 'chest',
              x: wx,
              y: sy,
            });
            lights.push({
              x: wx,
              y: sy - 8,
              radius: 44,
              color: '#ffe082',
              intensity: 0.7,
              flicker: 0.05,
            });
            break;
          }
          case 'R':
            interactives.push({ kind: 'relic_shrine', x: wx, y: DOOR_FLOOR_ROW * TILE_SIZE });
            lights.push({
              x: wx,
              y: DOOR_FLOOR_ROW * TILE_SIZE - 22,
              radius: 90,
              color: '#7ef5eb',
              intensity: 0.95,
              flicker: 0.06,
            });
            break;
          case 'K': {
            const snap = snapToSurface(room, x, y);
            const sy = snap.surfaceRow * TILE_SIZE;
            interactives.push({ kind: 'trinity_scroll', x: wx, y: sy });
            lights.push({
              x: wx,
              y: sy - 22,
              radius: 82,
              color: '#ffd466',
              intensity: 0.9,
              flicker: 0.06,
            });
            break;
          }
          case 'A':
            interactives.push({ kind: 'blood_shrine', x: wx, y: DOOR_FLOOR_ROW * TILE_SIZE });
            lights.push({
              x: wx,
              y: DOOR_FLOOR_ROW * TILE_SIZE - 18,
              radius: 85,
              color: '#ff6b7a',
              intensity: 0.9,
              flicker: 0.08,
            });
            break;
          case 'O':
            interactives.push({ kind: 'waystone', x: wx, y: DOOR_FLOOR_ROW * TILE_SIZE });
            lights.push({
              x: wx,
              y: DOOR_FLOOR_ROW * TILE_SIZE - 20,
              radius: 76,
              color: '#7ef5eb',
              intensity: 0.85,
              flicker: 0.05,
            });
            break;
          case 'I':
            interactives.push({
              kind: 'lore_tablet',
              x: wx,
              y: DOOR_FLOOR_ROW * TILE_SIZE,
              loreText: rng.pick(LORE_INSCRIPTIONS),
            });
            break;
          case 'M':
            interactives.push({ kind: 'merchant', x: wx, y: DOOR_FLOOR_ROW * TILE_SIZE });
            lights.push({
              x: wx,
              y: DOOR_FLOOR_ROW * TILE_SIZE - 18,
              radius: 85,
              color: '#ba82ed',
              intensity: 0.85,
              flicker: 0.05,
            });
            break;
          case 'X':
            interactives.push({
              kind: 'exit_portal',
              x: wx,
              y: DOOR_FLOOR_ROW * TILE_SIZE,
              targetBiome: biome.nextBiome,
            });
            lights.push({
              x: wx,
              y: DOOR_FLOOR_ROW * TILE_SIZE - 24,
              radius: 100,
              color: '#7ef5eb',
              intensity: 1.0,
              flicker: 0.08,
            });
            break;
          case 'Y':
            if (biome.altNextBiome) {
              interactives.push({
                kind: 'exit_portal',
                x: wx,
                y: DOOR_FLOOR_ROW * TILE_SIZE,
                targetBiome: biome.altNextBiome,
              });
              lights.push({
                x: wx,
                y: DOOR_FLOOR_ROW * TILE_SIZE - 24,
                radius: 100,
                color: '#67d487',
                intensity: 1.0,
                flicker: 0.08,
              });
            }
            break;
          case 'U': {
            const snap = snapToSurface(room, x, y);
            enemySpawns.push({
              enemyId: 'mimic',
              x: wx,
              y: snap.surfaceRow * TILE_SIZE,
              isElite: false,
            });
            break;
          }
          case 'G': {
            const snap = snapToSurface(room, x, y);
            const gid = pickVanguardEnemy(snap.spanWidth);
            enemySpawns.push({
              enemyId: gid,
              x: wx,
              y: snap.surfaceRow * TILE_SIZE,
              isElite: rng.chance(0.16 + curseTier * 0.08),
            });
            break;
          }
          case 'V': {
            const snap = snapToSurface(room, x, y);
            const vid = pickVantageEnemy();
            enemySpawns.push({
              enemyId: vid,
              x: wx,
              y: snap.surfaceRow * TILE_SIZE,
              isElite: rng.chance(0.10 + curseTier * 0.06),
            });
            break;
          }
          case 'E': {
            const snap = snapToSurface(room, x, y);
            const eid = pickSmartGroundEnemy(snap.onPlatform, snap.spanWidth);
            enemySpawns.push({
              enemyId: eid,
              x: wx,
              y: snap.surfaceRow * TILE_SIZE,
              isElite: rng.chance(0.12 + curseTier * 0.08),
            });
            break;
          }
          case 'F': {
            const fid = pickFlyingEnemy();
            enemySpawns.push({
              enemyId: fid,
              x: wx,
              y: wy,
              isElite: rng.chance(0.10 + curseTier * 0.06),
            });
            break;
          }
          case 'Z':
            if (biome.bossId) {
              bossSpawn = {
                enemyId: biome.bossId,
                x: wx,
                y: DOOR_FLOOR_ROW * TILE_SIZE,
                isElite: false,
              };
            }
            break;
        }
      }
    }
  }

  tileMap.computeMasks();

  return {
    biome: biomeId,
    seed,
    tileMap,
    playerSpawn,
    props,
    interactives,
    enemySpawns,
    lights,
    bossArenaBounds,
    bossSpawn,
  };
}
