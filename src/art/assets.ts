import type {
  BiomeId,
  CharacterAnimState,
  CharacterId,
  EnemyAnimState,
  EnemyId,
  RelicId,
} from '../core/types.ts';
import { bakeAllBiomeParallax, type BiomeParallaxLayers } from './backgroundArt.ts';
import { bakeAllCharacterSprites } from './characterSprites.ts';
import { bakeAllEnemySprites } from './enemySprites.ts';
import { bakeAllRelicIcons } from './relicIcons.ts';
import { type SpriteSet } from './spriteAtlas.ts';
import { bakeTilesetAssets, type TilesetAssets } from './tilesetArt.ts';

export interface GameAssets {
  characters: Record<CharacterId, SpriteSet<CharacterAnimState>>;
  enemies: Record<EnemyId, SpriteSet<EnemyAnimState>>;
  tileset: TilesetAssets;
  parallax: Record<BiomeId, BiomeParallaxLayers>;
  relicIcons: Record<RelicId, HTMLCanvasElement>;
}

let cachedAssets: GameAssets | null = null;

export function getGameAssets(): GameAssets {
  if (!cachedAssets) {
    cachedAssets = {
      characters: bakeAllCharacterSprites(),
      enemies: bakeAllEnemySprites(),
      tileset: bakeTilesetAssets(),
      parallax: bakeAllBiomeParallax(),
      relicIcons: bakeAllRelicIcons(),
    };
  }
  return cachedAssets;
}
