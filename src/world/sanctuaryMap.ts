import { TILE_SIZE } from '../core/constants.ts';
import type { InteractivePlacement, LightSource, PropPlacement } from '../core/types.ts';
import type { GeneratedDungeon } from './dungeonGenerator.ts';
import { TileMap } from './tilemap.ts';

const SANCTUARY_ROWS: readonly string[] = [
  '########################################################',
  '########################################################',
  '#...C.......W..............W..............W..........C.#',
  '#......................................................#',
  '#.....N..............N..............N..............N...#',
  '#......................................................#',
  '#...T..................T...................T...........#',
  '#......................................................#',
  '#.....................============.....................#',
  '#......................................................#',
  '#......................................................#',
  '#...............========================...............#',
  '#......................................................#',
  '#......................................................#',
  '#.........=======......................=======.........#',
  '#......................................................#',
  '#..B.....S...........................................B.#',
  '########################################################',
  '########################################################',
  '########################################################',
];

export function generateSanctuary(): GeneratedDungeon {
  const h = SANCTUARY_ROWS.length;
  const w = SANCTUARY_ROWS[0]!.length;
  const tileMap = new TileMap(w, h);
  const props: PropPlacement[] = [];
  const interactives: InteractivePlacement[] = [];
  const lights: LightSource[] = [];

  const floorY = 17 * TILE_SIZE;
  let playerSpawn = { x: 8 * TILE_SIZE, y: floorY };

  for (let y = 0; y < h; y++) {
    const row = SANCTUARY_ROWS[y]!;
    for (let x = 0; x < w; x++) {
      const ch = row[x]!;
      const wx = x * TILE_SIZE + TILE_SIZE * 0.5;
      if (ch === '#') tileMap.setTile(x, y, 1);
      else if (ch === '=') tileMap.setTile(x, y, 2);
      else if (ch === 'S') playerSpawn = { x: wx, y: floorY };
      else if (ch === 'T') {
        props.push({ kind: 'torch', x: wx, y: y * TILE_SIZE + 8, variant: x % 4 });
        lights.push({ x: wx, y: y * TILE_SIZE + 4, radius: 95, color: '#ffd466', intensity: 1, flicker: 0.08 });
      } else if (ch === 'B') {
        props.push({ kind: 'brazier', x: wx, y: floorY, variant: 0 });
        lights.push({ x: wx, y: floorY - 16, radius: 110, color: '#ffd466', intensity: 1, flicker: 0.1 });
      } else if (ch === 'W') {
        props.push({ kind: 'rose_window', x: wx, y: y * TILE_SIZE + 18, variant: 0 });
        lights.push({ x: wx, y: y * TILE_SIZE + 24, radius: 110, color: '#7ef5eb', intensity: 0.72, flicker: 0.02 });
      } else if (ch === 'N') {
        props.push({ kind: 'banner', x: wx, y: y * TILE_SIZE, variant: 0 });
      } else if (ch === 'C') {
        props.push({ kind: 'chain', x: wx, y: y * TILE_SIZE, variant: 0 });
      }
    }
  }

  // Decorative gothic pillars & statues along Sanctuary hall
  for (const px of [6, 20.5, 33.8, 47.5]) {
    props.push({ kind: 'pillar', x: px * TILE_SIZE, y: floorY, variant: 0 });
  }
  for (const sx of [16.2, 44.8]) {
    props.push({ kind: 'statue', x: sx * TILE_SIZE, y: floorY, variant: 0 });
  }

  // Interactive Sanctuary Stations
  interactives.push({ kind: 'soul_altar', x: 13 * TILE_SIZE, y: floorY, id: 'Soul Altar [F]' });
  lights.push({ x: 13 * TILE_SIZE, y: floorY - 26, radius: 105, color: '#7ef5eb', intensity: 1.0, flicker: 0.06 });

  interactives.push({ kind: 'training_dummy', x: 19 * TILE_SIZE, y: floorY, id: 'Combat Training Dummy' });

  interactives.push({ kind: 'hero_pedestal', x: 27 * TILE_SIZE, y: floorY, id: 'Hall of Heroes [F]' });
  lights.push({ x: 27 * TILE_SIZE, y: floorY - 22, radius: 100, color: '#ffe082', intensity: 0.9, flicker: 0.05 });

  interactives.push({ kind: 'deeds_lectern', x: 36.5 * TILE_SIZE, y: floorY, id: 'Book of Deeds [F]' });
  lights.push({ x: 36.5 * TILE_SIZE, y: floorY - 18, radius: 75, color: '#ffe082', intensity: 0.85, flicker: 0.04 });

  interactives.push({ kind: 'curse_brazier', x: 42 * TILE_SIZE, y: floorY, id: 'Curse Brazier [F]' });
  lights.push({ x: 42 * TILE_SIZE, y: floorY - 20, radius: 85, color: '#ff6b7a', intensity: 0.85, flicker: 0.1 });

  interactives.push({ kind: 'dungeon_gate', x: 50 * TILE_SIZE, y: floorY, id: 'Enter Crypt [F]' });
  lights.push({ x: 50 * TILE_SIZE, y: floorY - 26, radius: 120, color: '#7ef5eb', intensity: 1.0, flicker: 0.07 });

  tileMap.computeMasks();

  return {
    biome: 'sanctuary',
    seed: 1,
    tileMap,
    playerSpawn,
    props,
    interactives,
    enemySpawns: [],
    lights,
  };
}
