import {
  CRIT_HITSTOP,
  DEFAULT_HITSTOP,
  FIXED_DT,
  PARRY_HITSTOP,
  PIXEL_SCALE,
  TILE_PX,
  TILE_SIZE,
  VIEW_H,
  VIEW_W,
  WORLD_VIEW_H,
  WORLD_VIEW_W,
} from './core/constants.ts';
import { Camera } from './core/camera.ts';
import { InputManager } from './core/input.ts';
import type {
  BiomeId,
  CharacterId,
  GameScreen,
  LightSource,
  MetaUpgradeId,
  PropPlacement,
  Rect,
  RelicId,
  RunStats,
  ScrollStat,
  StatusType,
} from './core/types.ts';
import { SoundEngine } from './audio/soundEngine.ts';
import { getGameAssets, type GameAssets } from './art/assets.ts';
import { DynamicLighting } from './art/lighting.ts';
import { getAnimationFrame } from './art/spriteAtlas.ts';
import { drawPixelText } from './art/pixelFont.ts';
import { ACHIEVEMENTS, evaluateNewlyEarnedAchievements } from './data/achievements.ts';
import { BIOMES } from './data/biomes.ts';
import { CHARACTER_LIST } from './data/characters.ts';
import { getActiveSynergies, RELIC_LIST, RELICS } from './data/relics.ts';
import { locBiome, tr } from './i18n/translations.ts';
import { Enemy } from './entities/enemy.ts';
import { ParticleSystem } from './entities/particles.ts';
import {
  spawnLootBurst,
  updatePickups,
  type PickupEntity,
  type WorldStation,
} from './entities/pickup.ts';
import { Player } from './entities/player.ts';
import { updateProjectiles, type Projectile } from './entities/projectile.ts';
import { applyStatusEffect, resolveHitOnTarget } from './systems/combat.ts';
import {
  computeDeathSoulRetention,
  computeEffectiveStats,
  MetaProgressionManager,
} from './systems/metaprogression.ts';
import { HudRenderer } from './ui/hudRenderer.ts';
import { MenuOverlay } from './ui/menuOverlay.ts';
import { generateDungeon, type GeneratedDungeon } from './world/dungeonGenerator.ts';
import { generateSanctuary } from './world/sanctuaryMap.ts';
import { HERO_ANCHOR_X, HERO_ANCHOR_Y } from './art/characterSprites.ts';

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export class MasoulGame {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly assets: GameAssets;
  private readonly input: InputManager;
  private readonly camera: Camera;
  private readonly lighting: DynamicLighting;
  private readonly particles: ParticleSystem;
  private readonly sound: SoundEngine;
  private readonly meta: MetaProgressionManager;
  private readonly hud: HudRenderer;
  private readonly overlay: MenuOverlay;

  private screen: GameScreen = 'title';
  private returnScreen: GameScreen = 'title';
  private level!: GeneratedDungeon;
  private player!: Player;
  private enemies: Enemy[] = [];
  private pickups: PickupEntity[] = [];
  private projectiles: Projectile[] = [];
  private stations: WorldStation[] = [];
  private props: PropPlacement[] = [];
  private staticLights: LightSource[] = [];

  private runStats!: RunStats;
  private relicChoices: RelicId[] = [];
  private nearbyStation: WorldStation | null = null;
  private activeBoss: Enemy | null = null;
  private bossArenaLocked = false;

  private worldTime = 0;
  private hitstopTimer = 0;
  private spikeCooldown = 0;
  private killstreak = 0;
  private killstreakTimer = 0;
  private dummyFlashTimer = 0;
  private dummyHitCooldown = new Set<number>();
  private screenFlash: { color: string; alpha: number } | null = null;
  private lightningCooldown = 6;
  private bannerText: string | null = null;
  private bannerTimer = 0;
  private lastTimestamp = 0;
  private accumulator = 0;
  private rafId = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    uiRoot: HTMLElement,
  ) {
    this.canvas.width = VIEW_W;
    this.canvas.height = VIEW_H;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D Canvas context unavailable');
    ctx.imageSmoothingEnabled = false;
    this.ctx = ctx;

    this.assets = getGameAssets();
    this.input = new InputManager(this.canvas);
    this.camera = new Camera();
    this.lighting = new DynamicLighting();
    this.particles = new ParticleSystem();
    this.sound = new SoundEngine();
    this.meta = new MetaProgressionManager();
    this.hud = new HudRenderer();
    this.overlay = new MenuOverlay(uiRoot, this.meta, {
      onStartSanctuary: () => this.enterSanctuary(),
      onStartRun: () => this.startNewRun(),
      onResume: () => this.resumeFromModal(),
      onOpenScreen: (s) => this.openScreen(s),
      onSelectRelic: (id) => this.applyRelicChoice(id),
      onSelectScroll: (stat) => this.applyScrollChoice(stat),
      onBuyMerchant: (choice) => this.handleMerchantPurchase(choice),
      onBuyUpgrade: (id) => this.handleBuyUpgrade(id),
      onPrestige: () => this.handlePrestige(),
      onSelectLanguage: (lang) => {
        this.meta.setLanguage(lang);
        this.openScreen(this.screen);
      },
      onSelectOrUnlockHero: (id) => this.handleSelectHero(id),
      onReturnSanctuary: () => this.enterSanctuary(),
      onQuickRetry: () => this.startNewRun(),
      onVolumeChange: (kind, val) => {
        if (kind === 'sfx') this.sound.setSfxVolume(val);
        else this.sound.setMusicVolume(val);
      },
    });

    window.addEventListener('pointerdown', () => this.sound.unlock(), { once: true });
    window.addEventListener('keydown', () => this.sound.unlock(), { once: true });
    window.addEventListener('keydown', this.handleModalKeyDown);

    this.loadSanctuaryWorld();

    const params = new URLSearchParams(window.location.search);
    if (params.get('gallery') === '1') {
      this.openScreen('codex');
    } else {
      this.openScreen('title');
    }
  }

  start(): void {
    this.lastTimestamp = performance.now();
    const loop = (now: number): void => {
      const elapsed = Math.min(0.1, (now - this.lastTimestamp) / 1000);
      this.lastTimestamp = now;
      this.tick(elapsed);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private readonly handleModalKeyDown = (e: KeyboardEvent): void => {
    if (this.screen === 'relic_select') {
      if (e.code === 'Digit1' && this.relicChoices[0]) this.applyRelicChoice(this.relicChoices[0]);
      else if (e.code === 'Digit2' && this.relicChoices[1]) this.applyRelicChoice(this.relicChoices[1]);
      else if (e.code === 'Digit3' && this.relicChoices[2]) this.applyRelicChoice(this.relicChoices[2]);
    } else if (this.screen === 'scroll_select') {
      if (e.code === 'Digit1') this.applyScrollChoice('brutality');
      else if (e.code === 'Digit2') this.applyScrollChoice('tactics');
      else if (e.code === 'Digit3') this.applyScrollChoice('survival');
    }
  };

  destroy(): void {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('keydown', this.handleModalKeyDown);
    this.input.destroy();
  }

  private tick(elapsed: number): void {
    this.accumulator += elapsed;
    while (this.accumulator >= FIXED_DT) {
      this.fixedUpdate(FIXED_DT);
      this.accumulator -= FIXED_DT;
    }
    this.overlay.updatePreviews(elapsed);
    this.render();
  }

  private fixedUpdate(dt: number): void {
    this.worldTime += dt;
    this.sound.update(dt);
    this.input.update(dt);

    if (this.screenFlash) {
      this.screenFlash.alpha = Math.max(0, this.screenFlash.alpha - dt * 2.6);
      if (this.screenFlash.alpha <= 0) this.screenFlash = null;
    }

    if (this.input.wasPressed('mute')) {
      this.sound.toggleMute();
    }

    if (this.input.wasPressed('pause')) {
      if (this.screen === 'playing' || this.screen === 'sanctuary') {
        this.returnScreen = this.screen;
        this.openScreen('paused');
      } else if (
        this.screen === 'paused' ||
        this.screen === 'soul_altar' ||
        this.screen === 'hero_select' ||
        this.screen === 'merchant' ||
        this.screen === 'controls' ||
        this.screen === 'codex' ||
        this.screen === 'deeds'
      ) {
        this.resumeFromModal();
      }
    }

    if (this.bannerTimer > 0) {
      this.bannerTimer = Math.max(0, this.bannerTimer - dt);
    }

    if (this.screen === 'title') {
      this.player.animTime += dt;
      this.camera.update(dt, 280 + Math.sin(this.worldTime * 0.28) * 140, 210, 1, 0);
      this.particles.update(dt, this.level.tileMap, this.level.biome, this.camera.x, this.camera.y);
      this.input.endFrame();
      return;
    }

    if (this.screen !== 'playing' && this.screen !== 'sanctuary') {
      this.input.endFrame();
      return;
    }

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.camera.update(dt, this.player.x, this.player.y - 16, this.player.facing, this.player.vy);
      this.input.endFrame();
      return;
    }

    if (this.spikeCooldown > 0) this.spikeCooldown = Math.max(0, this.spikeCooldown - dt);
    if (this.dummyFlashTimer > 0) this.dummyFlashTimer = Math.max(0, this.dummyFlashTimer - dt);
    if (this.killstreakTimer > 0) {
      this.killstreakTimer -= dt;
      if (this.killstreakTimer <= 0) this.killstreak = 0;
    }

    // Periodic dramatic Citadel lightning flash
    if (this.level.biome === 'citadel') {
      this.lightningCooldown -= dt;
      if (this.lightningCooldown <= 0) {
        this.lightningCooldown = 7 + Math.random() * 7;
        this.screenFlash = { color: '#ff9636', alpha: 0.22 };
      }
    }

    if (this.screen === 'playing' && !this.player.dead) {
      this.runStats.timeSeconds += dt;
    }

    // Allow full combat drills in Sanctuary (for the Training Dummy!) as well as in dungeons
    const allowCombat = this.screen === 'playing' || this.screen === 'sanctuary';
    this.player.update(
      dt,
      this.input,
      this.level.tileMap,
      this.projectiles,
      this.particles,
      this.sound,
      this.assets,
      this.enemies,
      allowCombat,
      () => {
        this.runStats.overdrivesUsed += 1;
        this.screenFlash = { color: '#7ef5eb', alpha: 0.34 };
        this.camera.addShake(0.35);
        this.checkAchievements();
      },
    );

    if (!this.player.activeAttack) {
      this.dummyHitCooldown.clear();
    }

    this.level.tileMap.markExploredAround(this.player.x, this.player.y - 12, 11);

    // Activate nearby Waystones automatically
    for (const st of this.stations) {
      if (st.kind === 'waystone' && !st.activated && Math.hypot(st.x - this.player.x, st.y - this.player.y) < 44) {
        st.activated = true;
        this.sound.playSoulPickup();
        this.particles.spawnSoulWisps(st.x, st.y - 20, 8);
        this.showBanner(tr('WAYSTONE ATTUNED [TAB TO WARP]', 'PIEDRA GUIA SINTONIZADA [TAB PARA VIAJAR]'));
      }
    }

    // Fast-travel between activated Waystones via [Tab]
    if (this.screen === 'playing' && this.input.wasPressed('warp')) {
      this.tryWaystoneWarp();
    }

    // Floor spike hazard
    const pRect = this.player.getRect();
    const footTx = Math.floor(this.player.x / TILE_SIZE);
    const footTy = Math.floor((this.player.y - 2) / TILE_SIZE);
    if (this.screen === 'playing' && !this.player.dead && this.spikeCooldown <= 0 && this.level.tileMap.isSpikes(footTx, footTy)) {
      this.spikeCooldown = 0.75;
      this.damagePlayer(14, this.player.x, -180);
    }

    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i]!;
      e.update(
        dt,
        this.level.tileMap,
        this.player.x,
        this.player.y,
        this.projectiles,
        this.particles,
        this.sound,
        (deadEnemy) => this.handleEnemyDeath(deadEnemy),
      );
      if (e.removed) {
        this.enemies.splice(i, 1);
      }
    }

    // Boss arena entrance lock & Boss tracking
    if (this.level.bossArenaBounds && this.activeBoss && this.activeBoss.hp > 0) {
      const b = this.level.bossArenaBounds;
      if (!this.bossArenaLocked && this.player.x > b.x + 28) {
        this.bossArenaLocked = true;
        this.sound.setMood('boss');
        this.sound.playBossRoar();
        this.showBanner(`${this.activeBoss.def.name} - ${this.activeBoss.def.title ?? ''}`);
      }
      if (this.bossArenaLocked && this.player.x < b.x + 14) {
        this.player.x = b.x + 14;
        if (this.player.vx < 0) this.player.vx = 0;
      }
    }

    // Homing target for player soul_skull projectiles vs enemy projectiles
    const camOff = this.camera.getRenderOffset();
    this.updateAllProjectiles(dt);
    this.resolveCombatInteractions(pRect);

    // Update pickups
    const magnetRadius = computeEffectiveStats(this.meta.data).soulMagnetRadius;
    updatePickups(
      this.pickups,
      dt,
      this.level.tileMap,
      this.player.x,
      this.player.y - 12,
      magnetRadius,
      (item) => {
        if (item.kind === 'soul') {
          this.runStats.runSouls += item.value;
          this.sound.playSoulPickup();
          this.particles.addDamageNumber(item.x, item.y - 12, `+${item.value} SOUL`, '#7ef5eb');
        } else if (item.kind === 'gold') {
          this.runStats.gold += item.value;
          this.sound.playCoinPickup();
          this.particles.addDamageNumber(item.x, item.y - 12, `+${item.value}G`, '#ffe082');
        } else {
          this.player.heal(item.value);
          this.sound.playHeal();
          this.particles.addDamageNumber(item.x, item.y - 12, `+${item.value} HP`, '#67d487');
        }
      },
    );

    // Nearby interactive station check
    this.nearbyStation = null;
    let bestDist = 32;
    for (const st of this.stations) {
      if (st.kind === 'barrel' || st.kind === 'crate' || st.kind === 'training_dummy' || st.kind === 'waystone' || st.used) continue;
      const dist = Math.hypot(st.x - this.player.x, st.y - this.player.y);
      if (dist < bestDist) {
        bestDist = dist;
        this.nearbyStation = st;
      }
    }

    if (this.nearbyStation && this.input.wasPressed('interact')) {
      this.interactWithStation(this.nearbyStation);
    }

    if (this.player.dead && this.player.deathAnimTimer >= 1.1 && this.screen === 'playing') {
      this.handlePlayerRunDeath();
    }

    this.particles.update(dt, this.level.tileMap, this.level.biome, camOff.x, camOff.y);
    this.camera.update(dt, this.player.x, this.player.y - 16, this.player.facing, this.player.vy);
    this.input.endFrame();
  }

  private updateAllProjectiles(dt: number): void {
    // Player soul_skulls home toward nearest live enemy, while enemy orbs home toward player
    const playerTargetX = this.player.x;
    const playerTargetY = this.player.y - 14;
    for (const p of this.projectiles) {
      if (p.owner === 'player' && p.kind === 'soul_skull') {
        let bestE: Enemy | null = null;
        let bestD = 260;
        for (const e of this.enemies) {
          if (e.aiState === 'dead') continue;
          const d = Math.hypot(e.x - p.x, e.y - 14 - p.y);
          if (d < bestD) {
            bestD = d;
            bestE = e;
          }
        }
        if (bestE) {
          const dx = bestE.x - p.x;
          const dy = bestE.y - 14 - p.y;
          const dist = Math.max(1, Math.hypot(dx, dy));
          const spd = Math.max(120, Math.hypot(p.vx, p.vy));
          p.vx += (dx / dist) * (p.homingStrength ?? 260) * dt;
          p.vy += (dy / dist) * (p.homingStrength ?? 260) * dt;
          const nSpd = Math.max(1, Math.hypot(p.vx, p.vy));
          p.vx = (p.vx / nSpd) * spd;
          p.vy = (p.vy / nSpd) * spd;
        }
      }
    }

    // Separate homing override already applied for player skulls; skip enemy homing on player skulls
    const savedHomings = this.projectiles.map((p) => p.homingStrength);
    for (const p of this.projectiles) {
      if (p.owner === 'player') p.homingStrength = 0;
    }
    updateProjectiles(
      this.projectiles,
      dt,
      this.level.tileMap,
      playerTargetX,
      playerTargetY,
      (proj) => {
        this.particles.spawnBurst(proj.x, proj.y, 5, [proj.color, proj.coreColor], 25, 85, 60, 2);
      },
    );
    for (let i = 0; i < this.projectiles.length; i++) {
      if (savedHomings[i] !== undefined) {
        this.projectiles[i]!.homingStrength = savedHomings[i];
      }
    }
  }

  private tryWaystoneWarp(): void {
    const waystones = this.stations.filter((s) => s.kind === 'waystone' && s.activated);
    if (waystones.length < 2) {
      this.showBanner('ATTUNE AT LEAST 2 WAYSTONES TO FAST-TRAVEL');
      return;
    }
    if (this.bossArenaLocked) {
      this.showBanner('CANNOT WARP DURING BOSS ENCOUNTER');
      return;
    }
    const threatNearby = this.enemies.some(
      (e) => e.aiState !== 'dead' && Math.hypot(e.x - this.player.x, e.y - this.player.y) < 88,
    );
    if (threatNearby) {
      this.showBanner('ENEMIES TOO CLOSE TO WARP');
      return;
    }
    let currentIdx = 0;
    let bestD = Infinity;
    waystones.forEach((ws, idx) => {
      const d = Math.hypot(ws.x - this.player.x, ws.y - this.player.y);
      if (d < bestD) {
        bestD = d;
        currentIdx = idx;
      }
    });
    const dest = waystones[(currentIdx + 1) % waystones.length]!;
    this.particles.spawnSoulWisps(this.player.x, this.player.y - 16, 12);
    this.player.x = dest.x;
    this.player.y = dest.y;
    this.player.vx = 0;
    this.player.vy = 0;
    this.sound.playWarp();
    this.particles.spawnSoulWisps(dest.x, dest.y - 16, 12);
    this.screenFlash = { color: '#7ef5eb', alpha: 0.2 };
  }

  private resolveCombatInteractions(pRect: Rect): void {
    // 1. Player Melee / Skill Active Hitbox vs Enemies, Destructibles & Sanctuary Training Dummy
    if (this.player.activeAttack) {
      const atk = this.player.activeAttack;

      // Sanctuary Training Dummy
      for (const st of this.stations) {
        if (st.kind !== 'training_dummy' || this.dummyHitCooldown.has(1)) continue;
        const box: Rect = { x: st.x - 10, y: st.y - 36, w: 20, h: 36 };
        if (rectsOverlap(atk.hitbox, box)) {
          this.dummyHitCooldown.add(1);
          this.hitTrainingDummy(atk.damage, atk.forceCrit);
        }
      }

      // Breakable Barrels & Crates
      for (let i = this.stations.length - 1; i >= 0; i--) {
        const st = this.stations[i]!;
        if (st.kind !== 'barrel' && st.kind !== 'crate') continue;
        const box: Rect = { x: st.x - 8, y: st.y - 16, w: 16, h: 16 };
        if (rectsOverlap(atk.hitbox, box)) {
          this.sound.playHitEnemy();
          this.particles.spawnBurst(st.x, st.y - 8, 10, ['#8a5534', '#633a24', '#ffe082'], 40, 140, 180, 2);
          spawnLootBurst(this.pickups, st.x, st.y, 1, 5, Math.random() < 0.2);
          this.stations.splice(i, 1);
        }
      }

      // Enemies
      for (const e of this.enemies) {
        if (e.aiState === 'dead' || atk.alreadyHitIds.has(e.uid)) continue;
        if (rectsOverlap(atk.hitbox, e.getRect())) {
          atk.alreadyHitIds.add(e.uid);
          if (atk.lifeDrain) this.player.heal(atk.lifeDrain);
          this.applyHitToEnemy(
            e,
            atk.damage,
            this.player.x,
            atk.forceCrit,
            atk.piercesShield,
            atk.knockbackX,
            atk.knockbackY,
            atk.applyStatus,
          );
          this.player.guaranteedNextCrit = false;
          this.player.parryEmpowered = false;
        }
      }
    }

    // 2. Projectiles vs Enemies, Dummy & Player
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]!;
      if (p.warnDelay !== undefined && p.warnDelay > 0) continue;
      const pBox: Rect = {
        x: p.x - p.radius,
        y: p.y - p.radius,
        w: p.radius * 2,
        h: p.radius * 2,
      };

      if (p.owner === 'player') {
        let consumed = false;

        // Check Sanctuary Dummy
        for (const st of this.stations) {
          if (st.kind !== 'training_dummy' || p.hitIds.has(9999)) continue;
          const box: Rect = { x: st.x - 10, y: st.y - 36, w: 20, h: 36 };
          if (rectsOverlap(pBox, box)) {
            p.hitIds.add(9999);
            this.hitTrainingDummy(p.damage, false);
            if (!p.piercing) consumed = true;
          }
        }

        if (!consumed) {
          for (const e of this.enemies) {
            if (e.aiState === 'dead' || p.hitIds.has(e.uid)) continue;
            if (rectsOverlap(pBox, e.getRect())) {
              p.hitIds.add(e.uid);
              this.applyHitToEnemy(
                e,
                p.damage,
                this.player.x,
                false,
                Boolean(p.piercesShield),
                Math.sign(p.vx) * 85,
                -45,
                p.applyStatus,
              );
              if (p.pullTarget && !e.def.isBoss) {
                e.x = this.player.x + this.player.facing * 24;
                e.y = this.player.y;
                e.vx = 0;
                this.particles.spawnBurst(e.x, e.y - 16, 8, ['#cad5ed', '#ff6b7a'], 30, 100, 50, 2);
              }
              if (!p.piercing) {
                consumed = true;
                break;
              }
            }
          }
        }
        if (consumed) this.projectiles.splice(i, 1);
      } else {
        // Enemy projectile vs Player
        if (!this.player.dead && rectsOverlap(pBox, pRect)) {
          const mirrorReflect =
            this.player.hasRelic('mirror_shield') && this.player.mirrorWardCooldown <= 0;
          if (this.player.parryTimer > 0 || mirrorReflect) {
            if (mirrorReflect && this.player.parryTimer <= 0) {
              this.player.mirrorWardCooldown = 8.0;
              this.sound.playParry();
              this.particles.addDamageNumber(this.player.x, this.player.y - 36, 'MIRROR!', '#cad5ed', true);
            } else {
              this.player.triggerParrySuccess(this.particles, this.sound);
            }
            this.runStats.parries += 1;
            this.screenFlash = { color: '#ffe082', alpha: 0.25 };
            p.owner = 'player';
            p.vx = -p.vx * 1.45;
            p.vy = -p.vy * 1.45;
            p.damage *= 2.2;
            p.color = '#ffe082';
            p.hitIds.clear();
            this.hitstopTimer = PARRY_HITSTOP;
            this.checkAchievements();
          } else {
            this.damagePlayer(p.damage, p.x, Math.sign(p.vx || (this.player.x - p.x)) * 120);
            if (p.applyStatus) {
              applyStatusEffect(this.player.statuses, p.applyStatus, 2.0, 2);
            }
            this.projectiles.splice(i, 1);
          }
        }
      }
    }

    // 3. Enemy Melee Strikes vs Player
    for (const e of this.enemies) {
      if (e.aiState === 'dead' || !e.activeStrike || e.hitPlayerThisAttack) continue;
      if (!this.player.dead && rectsOverlap(e.activeStrike.hitbox, pRect)) {
        e.hitPlayerThisAttack = true;
        if (this.player.parryTimer > 0) {
          this.player.triggerParrySuccess(this.particles, this.sound);
          this.runStats.parries += 1;
          this.screenFlash = { color: '#ffe082', alpha: 0.25 };
          this.hitstopTimer = PARRY_HITSTOP;
          this.camera.addShake(0.45);
          this.particles.spawnShockwave(this.player.x, this.player.y - 16, 42, '#ffe082', 0.26);
          this.particles.spawnSlashSparks(this.player.x, this.player.y - 16, this.player.facing, 10, '#ffe082');
          this.applyHitToEnemy(
            e,
            this.player.getTotalDamage(2.4, 'melee'),
            this.player.x,
            true,
            true,
            this.player.facing * 180,
            -100,
            'stun',
          );
          this.checkAchievements();
        } else {
          this.damagePlayer(e.activeStrike.damage, e.x, e.activeStrike.knockbackX);
        }
      }
    }
  }

  private hitTrainingDummy(rawDamage: number, forceCrit: boolean): void {
    const dummy = this.stations.find((s) => s.kind === 'training_dummy');
    if (!dummy) return;
    const res = resolveHitOnTarget(
      {
        hp: 9999,
        maxHp: 9999,
        x: dummy.x,
        facing: -1,
        invulnTimer: 0,
        shieldedFront: false,
        isParrying: false,
        statuses: [],
      },
      {
        rawDamage,
        attackerX: this.player.x,
        attackerCharacter: this.player.id,
        attackerHpRatio: this.player.hp / this.player.maxHp,
        critChance: this.player.critChance,
        forceCrit,
        piercesShield: true,
        attackerRelics: this.player.relics,
        rngRoll: Math.random(),
      },
    );
    this.dummyFlashTimer = 0.08;
    this.player.addSurge(10);
    if (res.isCrit) {
      this.sound.playCrit();
      this.hitstopTimer = CRIT_HITSTOP;
      this.camera.addShake(0.24);
      this.particles.addDamageNumber(dummy.x, dummy.y - 42, `${res.amount}!`, '#ffe082', true);
    } else {
      this.sound.playHitEnemy();
      this.hitstopTimer = DEFAULT_HITSTOP;
      this.camera.addShake(0.12);
      this.particles.addDamageNumber(dummy.x, dummy.y - 38, `${res.amount}`, '#fff6e8', false);
    }
    this.particles.spawnBurst(dummy.x, dummy.y - 20, 7, ['#cad5ed', '#b57a50', '#ffe082'], 40, 120, 140, 2);
  }

  private applyHitToEnemy(
    e: Enemy,
    rawDamage: number,
    attackerX: number,
    forceCrit: boolean,
    piercesShield: boolean,
    knockX: number,
    knockY: number,
    applyStatus?: StatusType,
  ): void {
    const res = resolveHitOnTarget(
      {
        hp: e.hp,
        maxHp: e.maxHp,
        x: e.x,
        facing: e.facing,
        invulnTimer: e.invulnTimer,
        shieldedFront: e.def.shieldedFront,
        isParrying: false,
        statuses: e.statuses,
      },
      {
        rawDamage,
        attackerX,
        attackerCharacter: this.player.id,
        attackerHpRatio: this.player.hp / this.player.maxHp,
        critChance: this.player.critChance,
        forceCrit,
        piercesShield,
        attackerRelics: this.player.relics,
        applyStatus,
        rngRoll: Math.random(),
      },
    );

    if (res.amount <= 0 && !res.wasBlocked) return;

    e.hp = Math.max(0, e.hp - res.amount);
    this.runStats.damageDealt += res.amount;
    e.flashTimer = 0.08;

    if (res.wasBlocked) {
      this.sound.playBlock();
      this.particles.spawnBurst(e.x + e.facing * 6, e.y - 16, 7, ['#cad5ed', '#ffe082'], 40, 120, 120, 2);
      this.particles.addDamageNumber(e.x, e.y - e.def.height - 8, `${res.amount} BLK`, '#95a1c2', false);
    } else {
      this.player.addSurge(res.isCrit ? 11 : 7);
      if (this.player.overdriveTimer > 0) {
        this.player.heal(2);
      }

      if (res.isCrit) {
        this.sound.playCrit();
        this.hitstopTimer = Math.max(this.hitstopTimer, CRIT_HITSTOP);
        this.camera.addShake(0.32);
        this.particles.spawnSlashSparks(e.x, e.y - 16, Math.sign(e.x - attackerX) || 1, 9, '#ffe082');
        this.particles.spawnShockwave(e.x, e.y - 16, 26, '#ffe082', 0.2);
        this.particles.addDamageNumber(e.x, e.y - e.def.height - 10, `${res.amount}!`, '#ffe082', true);

        // Storm Brand Chain Lightning on Crit
        if (this.player.hasRelic('storm_brand')) {
          for (const other of this.enemies) {
            if (other.uid !== e.uid && other.aiState !== 'dead' && Math.hypot(other.x - e.x, other.y - e.y) < 120) {
              const arcDmg = Math.max(4, Math.round(res.amount * 0.5));
              other.hp = Math.max(0, other.hp - arcDmg);
              other.flashTimer = 0.08;
              this.particles.addLightningArc(e.x, e.y - 16, other.x, other.y - 16, '#ffe082');
              this.particles.addDamageNumber(other.x, other.y - other.def.height - 6, `${arcDmg}`, '#ffe082', false);
              if (other.hp <= 0) other.triggerDeath((dead) => this.handleEnemyDeath(dead));
              break;
            }
          }
        }

        // Cinder Crown Fire Blast on Crit
        if (this.player.hasRelic('cinder_crown')) {
          this.particles.spawnBurst(e.x, e.y - 14, 10, ['#ff9636', '#ffd466'], 40, 140, 20, 2);
          for (const other of this.enemies) {
            if (other.aiState !== 'dead' && Math.hypot(other.x - e.x, other.y - e.y) < 56) {
              applyStatusEffect(other.statuses, 'burn', 3.0, 5);
            }
          }
        }
      } else {
        this.sound.playHitEnemy();
        this.hitstopTimer = Math.max(this.hitstopTimer, DEFAULT_HITSTOP);
        this.camera.addShake(0.16);
        this.particles.spawnSlashSparks(e.x, e.y - 16, Math.sign(e.x - attackerX) || 1, 5, '#cad5ed');
        this.particles.addDamageNumber(e.x, e.y - e.def.height - 6, `${res.amount}`, '#fff6e8', false);
      }

      this.particles.spawnBlood(e.x, e.y - e.def.height * 0.5, Math.sign(e.x - attackerX) || 1, res.isCrit ? 14 : 8);

      if (!e.def.isBoss && e.aiState !== 'attack') {
        e.vx = knockX;
        e.vy = knockY;
        e.hurtTimer = 0.14;
      }
    }

    if (e.hp <= 0) {
      e.triggerDeath((dead) => this.handleEnemyDeath(dead));
    }
  }

  private handleEnemyDeath(e: Enemy): void {
    this.runStats.kills += 1;
    if (e.isElite) this.runStats.elitesKilled += 1;

    this.killstreak += 1;
    this.killstreakTimer = 4.2;
    if (this.killstreak > this.runStats.maxKillstreak) {
      this.runStats.maxKillstreak = this.killstreak;
    }
    if (this.killstreak > 0 && this.killstreak % 5 === 0) {
      this.sound.playKillstreak();
      this.particles.addDamageNumber(this.player.x, this.player.y - 42, `${this.killstreak}X STREAK!`, '#ffe082', true);
    }

    this.player.onKillEnemy(this.particles, this.projectiles);

    const metaStats = computeEffectiveStats(this.meta.data);
    const soulMult =
      metaStats.soulDropMult *
      (this.player.hasRelic('soul_lantern') ? 1.4 : 1.0) *
      (1 + this.runStats.curseTier * 0.25);

    const souls = Math.max(1, Math.round(e.def.soulDrop * soulMult * (e.isElite ? 2 : 1)));
    const gold = Math.round(e.def.goldDrop * (e.isElite ? 2 : 1));
    spawnLootBurst(this.pickups, e.x, e.y, souls, gold, e.isElite || Math.random() < 0.12);
    this.particles.spawnSoulWisps(e.x, e.y - 16, e.def.isBoss ? 24 : 8);
    this.particles.spawnDebris(e.x, e.y - 12, 'bone', e.def.isBoss ? 12 : 5);

    // Ravenous Mimic guaranteed Relic Reward
    if (e.id === 'mimic') {
      this.showBanner('MIMIC VANQUISHED! CLAIM ITS HOARD!');
      setTimeout(() => {
        if (this.screen === 'playing') this.presentRelicChoices();
      }, 320);
    }

    // Plague Rat & Plague Censer toxic death cloud
    if (e.id === 'plague_rat' || this.player.hasRelic('plague_censer')) {
      this.particles.spawnBurst(e.x, e.y - 10, 12, ['#67d487', '#9be675'], 30, 110, -20, 2);
      for (const other of this.enemies) {
        if (other.uid !== e.uid && other.aiState !== 'dead' && Math.hypot(other.x - e.x, other.y - e.y) < 62) {
          applyStatusEffect(other.statuses, 'poison', 3.5, 4);
        }
      }
    }

    // Malakor's Ashen Soul passive: burning enemies detonate on death
    if (this.player.id === 'pyromancer' && e.statuses.some((s) => s.type === 'burn')) {
      this.particles.spawnBurst(e.x, e.y - 16, 16, ['#ff9636', '#ffd466', '#ff6b7a'], 60, 175, 40, 3);
      for (const other of this.enemies) {
        if (other.uid !== e.uid && other.aiState !== 'dead' && Math.hypot(other.x - e.x, other.y - e.y) < 62) {
          const blast = Math.round(this.player.getTotalDamage(1.1, 'skill'));
          other.hp = Math.max(0, other.hp - blast);
          this.particles.addDamageNumber(other.x, other.y - 24, `${blast}`, '#ff9636', false);
          if (other.hp <= 0) other.triggerDeath((d) => this.handleEnemyDeath(d));
        }
      }
    }

    this.checkAchievements(e.def.isBoss ? e.id : undefined);

    if (e.def.isBoss) {
      this.runStats.bossesKilled += 1;
      this.bossArenaLocked = false;
      this.activeBoss = null;
      this.sound.setBiomeMood(this.level.biome);
      this.camera.addShake(0.6);
      this.screenFlash = { color: '#ffe082', alpha: 0.35 };
      this.particles.spawnShockwave(e.x, e.y - 24, 68, '#ffe082', 0.35);
      this.particles.spawnBurst(e.x, e.y - 24, 34, ['#ffe082', '#7ef5eb', '#ff6b7a'], 80, 250, 90, 3);

      for (const st of this.stations) {
        if (st.kind === 'exit_portal') st.locked = false;
      }

      if (e.id === 'boss_sovereign') {
        const bonus = 40 + this.runStats.curseTier * 25;
        this.runStats.runSouls += bonus;
        const totalBankedNow = this.runStats.runSouls;
        this.meta.addSouls(totalBankedNow);
        this.runStats.bankedSoulsThisRun += totalBankedNow;
        this.runStats.runSouls = 0;
        this.meta.recordVictory(this.runStats.timeSeconds, this.runStats.kills);
        this.sound.playChest();
        setTimeout(() => this.openScreen('victory'), 900);
      } else {
        this.showBanner(`${e.def.name.toUpperCase()} VANQUISHED! PORTALS UNSEALED!`);
      }
    }
  }

  private damagePlayer(rawDmg: number, sourceX: number, knockX: number): void {
    if (this.player.invulnTimer > 0 || this.player.dead) return;
    const synergies = getActiveSynergies(this.player.relics);
    const hasBulwark = synergies.some((s) => s.id === 'bulwark');
    let dmg = Math.round(
      rawDmg *
        (this.player.hasRelic('glass_crown') ? 1.2 : 1.0) *
        (hasBulwark ? 0.85 : 1.0),
    );

    if (this.player.shieldHp > 0) {
      const absorbed = Math.min(this.player.shieldHp, dmg);
      this.player.shieldHp -= absorbed;
      dmg -= absorbed;
      this.particles.spawnBurst(this.player.x, this.player.y - 16, 8, ['#7ef5eb', '#d6fffa'], 40, 110, 60, 2);
    }

    if (dmg > 0) {
      this.player.hp = Math.max(0, this.player.hp - dmg);
      this.player.rallyDelay = 0.85;
      this.player.hurtTimer = 0.2;
      this.player.flashTimer = 0.1;
      this.player.invulnTimer = 0.85;
      this.player.vx = knockX || (this.player.x >= sourceX ? 120 : -120);
      this.player.vy = -125;
      this.sound.playHitPlayer();
      this.camera.addShake(0.42);
      this.screenFlash = { color: '#ff4d63', alpha: 0.25 };
      this.particles.spawnBlood(this.player.x, this.player.y - 14, Math.sign(this.player.x - sourceX) || 1, 10);
      this.particles.addDamageNumber(this.player.x, this.player.y - 32, `-${dmg}`, '#ff6b7a', false);
    }

    if (this.player.hp <= 0) {
      if (this.player.hasRelic('phoenix_ash') && !this.player.phoenixUsed) {
        this.player.phoenixUsed = true;
        this.player.hp = Math.round(this.player.maxHp * 0.5);
        this.player.rallyHp = this.player.hp;
        this.player.invulnTimer = 1.6;
        this.sound.playBossRoar();
        this.screenFlash = { color: '#ffd466', alpha: 0.45 };
        this.particles.spawnBurst(this.player.x, this.player.y - 14, 26, ['#ffd466', '#ff9636', '#ffffff'], 80, 220, 20, 3);
        this.showBanner('PHOENIX ASH REKINDLED YOUR SOUL!');
      } else {
        this.player.dead = true;
        this.player.deathAnimTimer = 0;
        this.sound.playBossRoar();
      }
    }
  }

  private interactWithStation(st: WorldStation): void {
    if (st.kind === 'soul_altar') {
      this.returnScreen = 'sanctuary';
      this.openScreen('soul_altar');
    } else if (st.kind === 'hero_pedestal') {
      this.returnScreen = 'sanctuary';
      this.openScreen('hero_select');
    } else if (st.kind === 'deeds_lectern') {
      this.returnScreen = 'sanctuary';
      this.openScreen('deeds');
    } else if (st.kind === 'curse_brazier') {
      if (this.meta.data.highestCurseUnlocked <= 0) {
        this.showBanner('DEFEAT MALGRIM TO UNLOCK CURSE TIERS');
      } else {
        const tier = this.meta.cycleCurseTier();
        this.sound.playUpgrade();
        this.showBanner(tier === 0 ? 'CURSE EXTINGUISHED (TIER 0)' : `CURSE TIER ${tier} IGNITED!`);
      }
    } else if (st.kind === 'dungeon_gate') {
      this.startNewRun();
    } else if (st.kind === 'chest') {
      st.used = true;
      this.sound.playChest();
      spawnLootBurst(this.pickups, st.x, st.y, 12, 24, true);
      this.particles.spawnBurst(st.x, st.y - 10, 16, ['#ffe082', '#fff6cc'], 50, 150, 80, 2);
      if (Math.random() < 0.45) {
        this.presentRelicChoices();
      }
    } else if (st.kind === 'relic_shrine') {
      st.used = true;
      this.sound.playChest();
      this.presentRelicChoices();
    } else if (st.kind === 'trinity_scroll') {
      st.used = true;
      this.sound.playScrollPickup();
      this.returnScreen = 'playing';
      this.openScreen('scroll_select');
    } else if (st.kind === 'blood_shrine') {
      st.used = true;
      const cost = Math.max(1, Math.min(this.player.hp - 1, Math.round(this.player.maxHp * 0.2)));
      this.player.hp = Math.max(1, this.player.hp - cost);
      this.runStats.runSouls += 25;
      this.runStats.gold += 35;
      this.sound.playUpgrade();
      this.screenFlash = { color: '#d1364e', alpha: 0.28 };
      this.particles.spawnBlood(this.player.x, this.player.y - 14, 1, 14);
      this.showBanner(`BLOOD PACT: -${cost} HP FOR +25 SOULS & RELIC`);
      this.presentRelicChoices();
    } else if (st.kind === 'lore_tablet') {
      st.used = true;
      this.runStats.runSouls += 2;
      this.sound.playSoulPickup();
      this.showBanner(st.loreText ?? 'ANCIENT STONES REMEMBER THE FALLEN.');
    } else if (st.kind === 'merchant') {
      this.returnScreen = 'playing';
      this.openScreen('merchant');
    } else if (st.kind === 'exit_portal') {
      if (st.locked) {
        this.showBanner('SLAY THE BOSS TO UNSEAL THE PORTALS!');
        return;
      }
      this.advanceToNextBiome(st.targetBiome);
    }
  }

  private presentRelicChoices(): void {
    const pool = RELIC_LIST.filter((r) => !this.player.hasRelic(r.id));
    const source = pool.length >= 3 ? pool : RELIC_LIST;
    const shuffled = [...source].sort(() => Math.random() - 0.5);
    this.relicChoices = shuffled.slice(0, 3).map((r) => r.id);
    this.returnScreen = 'playing';
    this.openScreen('relic_select');
  }

  private applyRelicChoice(id: RelicId): void {
    this.player.addRelic(id);
    this.runStats.relics.push(id);
    this.sound.playUpgrade();
    this.showBanner(`RELIC BOUND: ${RELICS[id].name.toUpperCase()}`);
    this.checkAchievements();
    this.resumeFromModal();
  }

  private applyScrollChoice(stat: ScrollStat): void {
    this.player.applyScroll(stat);
    this.runStats.scrolls[stat] += 1;
    this.sound.playScrollPickup();
    this.showBanner(`ABSORBED SCROLL OF ${stat.toUpperCase()}`);
    this.checkAchievements();
    this.resumeFromModal();
  }

  private checkAchievements(justKilledBossId?: string): void {
    const earned = evaluateNewlyEarnedAchievements(this.meta.data, this.runStats, justKilledBossId);
    for (const id of earned) {
      if (this.meta.unlockAchievement(id)) {
        this.sound.playAchievement();
        const def = ACHIEVEMENTS[id];
        this.showBanner(`DEED UNLOCKED: ${def.name.toUpperCase()} (+${def.soulReward} SOULS)`);
      }
    }
  }

  private handleMerchantPurchase(choice: 'heal' | 'weapon' | 'relic'): void {
    if (choice === 'heal' && this.runStats.gold >= 25 && this.player.hp < this.player.maxHp) {
      this.runStats.gold -= 25;
      this.player.heal(Math.round(this.player.maxHp * 0.6));
      this.sound.playHeal();
      this.openScreen('merchant');
    } else if (choice === 'weapon' && this.runStats.gold >= 45) {
      this.runStats.gold -= 45;
      this.player.weaponUpgrades += 1;
      this.runStats.weaponUpgrades += 1;
      this.sound.playUpgrade();
      this.showBanner('WEAPON TEMPERED (+20% DMG)');
      this.openScreen('merchant');
    } else if (choice === 'relic' && this.runStats.gold >= 60) {
      this.runStats.gold -= 60;
      this.presentRelicChoices();
    }
  }

  private handleBuyUpgrade(id: MetaUpgradeId): void {
    if (this.meta.buyUpgrade(id)) {
      this.sound.playUpgrade();
      const prevHpRatio = this.player.hp / this.player.maxHp;
      this.player = new Player(
        this.meta.data.selectedCharacter,
        this.player.x,
        this.player.y,
        computeEffectiveStats(this.meta.data),
      );
      this.player.hp = Math.round(this.player.maxHp * prevHpRatio);
      this.openScreen('soul_altar');
    }
  }

  private handlePrestige(): void {
    if (this.meta.ascendPrestige()) {
      this.sound.playOverdrive();
      this.player = new Player(
        this.meta.data.selectedCharacter,
        this.player.x,
        this.player.y,
        computeEffectiveStats(this.meta.data),
      );
      const p = this.meta.data.prestigeLevel;
      this.showBanner(tr(`PRESTIGE ${p} ASCENDED (+${p * 20}% TOTAL STATS)`, `PRESTIGIO ${p} ALCANZADO (+${p * 20}% ESTADISTICAS)`));
      this.openScreen('soul_altar');
    }
  }

  private handleSelectHero(id: CharacterId): void {
    const ok = this.meta.isCharacterUnlocked(id)
      ? this.meta.selectCharacter(id)
      : this.meta.unlockCharacter(id);
    if (ok) {
      this.sound.playUpgrade();
      this.player = new Player(
        this.meta.data.selectedCharacter,
        this.player.x,
        this.player.y,
        computeEffectiveStats(this.meta.data),
      );
      this.checkAchievements();
      this.openScreen('hero_select');
    }
  }

  private loadSanctuaryWorld(): void {
    this.level = generateSanctuary();
    this.applyLoadedLevel(true);
  }

  private enterSanctuary(): void {
    this.loadSanctuaryWorld();
    this.sound.setBiomeMood('sanctuary');
    this.screen = 'sanctuary';
    this.input.setGameplayEnabled(true);
    this.overlay.renderScreen('sanctuary');
    this.showBanner(tr('THE PALE SANCTUARY', 'EL SANTUARIO PALIDO'));
  }

  private startNewRun(): void {
    this.runStats = {
      biome: 'crypt',
      kills: 0,
      elitesKilled: 0,
      gold: 0,
      runSouls: 0,
      bankedSoulsThisRun: 0,
      damageDealt: 0,
      timeSeconds: 0,
      relics: [],
      scrolls: { brutality: 0, tactics: 0, survival: 0 },
      weaponUpgrades: 0,
      curseTier: this.meta.data.activeCurseTier,
      maxKillstreak: 0,
      parries: 0,
      bossesKilled: 0,
      overdrivesUsed: 0,
    };
    this.killstreak = 0;
    this.killstreakTimer = 0;

    const metaStats = computeEffectiveStats(this.meta.data);
    this.player = new Player(this.meta.data.selectedCharacter, 0, 0, metaStats);
    this.loadBiomeLevel('crypt');
    this.screen = 'playing';
    this.input.setGameplayEnabled(true);
    this.overlay.renderScreen('playing');
    this.sound.setBiomeMood('crypt');
  }

  private advanceToNextBiome(chosenBiome?: BiomeId): void {
    if (this.runStats.runSouls > 0) {
      this.meta.addSouls(this.runStats.runSouls);
      this.runStats.bankedSoulsThisRun += this.runStats.runSouls;
      this.runStats.runSouls = 0;
    }

    const next = chosenBiome ?? BIOMES[this.level.biome].nextBiome;
    if (!next) return;
    this.runStats.biome = next;
    this.player.heal(Math.round(this.player.maxHp * 0.35));
    this.player.flaskCharges = Math.min(this.player.maxFlaskCharges, this.player.flaskCharges + 1);
    this.sound.playChest();
    this.sound.setBiomeMood(next);
    this.loadBiomeLevel(next);
    this.checkAchievements();
  }

  private loadBiomeLevel(biomeId: BiomeId): void {
    const seed = Math.floor(Math.random() * 1_000_000_000);
    this.level = generateDungeon(biomeId, seed, this.runStats.curseTier);
    this.applyLoadedLevel(false);
    this.player.onEnterNewRoom();
    const locB = locBiome(BIOMES[biomeId]);
    this.showBanner(`${locB.name.toUpperCase()} - ${locB.subtitle.toUpperCase()}`);
  }

  private applyLoadedLevel(isSanctuary: boolean): void {
    this.particles.clear();
    this.projectiles = [];
    this.pickups = [];
    this.enemies = [];
    this.activeBoss = null;
    this.bossArenaLocked = false;
    this.props = this.level.props;
    this.staticLights = this.level.lights;

    this.stations = this.level.interactives.map((it) => ({
      kind: it.kind,
      x: it.x,
      y: it.y,
      w: 24,
      h: 28,
      label: it.id,
      used: false,
      hp: 1,
      locked: it.kind === 'exit_portal' && Boolean(this.level.bossSpawn),
      activated: false,
      targetBiome: it.targetBiome,
      loreText: it.loreText,
    }));

    const metaStats = computeEffectiveStats(this.meta.data);
    if (isSanctuary || !this.player) {
      this.player = new Player(
        this.meta.data.selectedCharacter,
        this.level.playerSpawn.x,
        this.level.playerSpawn.y,
        metaStats,
      );
      this.runStats = {
        biome: 'sanctuary',
        kills: 0,
        elitesKilled: 0,
        gold: 0,
        runSouls: 0,
        bankedSoulsThisRun: 0,
        damageDealt: 0,
        timeSeconds: 0,
        relics: [],
        scrolls: { brutality: 0, tactics: 0, survival: 0 },
        weaponUpgrades: 0,
        curseTier: this.meta.data.activeCurseTier,
        maxKillstreak: 0,
        parries: 0,
        bossesKilled: 0,
        overdrivesUsed: 0,
      };
    } else {
      this.player.x = this.level.playerSpawn.x;
      this.player.y = this.level.playerSpawn.y;
      this.player.vx = 0;
      this.player.vy = 0;
      this.player.bannerPos = null;
    }

    for (const sp of this.level.enemySpawns) {
      this.enemies.push(
        new Enemy(sp.enemyId, sp.x, sp.y, this.level.biome, this.runStats.curseTier, sp.isElite),
      );
    }

    if (this.level.bossSpawn) {
      const bs = this.level.bossSpawn;
      const boss = new Enemy(bs.enemyId, bs.x, bs.y, this.level.biome, this.runStats.curseTier, false);
      this.enemies.push(boss);
      this.activeBoss = boss;
    }

    this.camera.setBounds(
      this.level.tileMap.width * TILE_SIZE,
      this.level.tileMap.height * TILE_SIZE,
    );
    this.camera.snapTo(this.player.x, this.player.y - 16);
  }

  private handlePlayerRunDeath(): void {
    const retained = computeDeathSoulRetention(this.runStats.runSouls, this.meta.data);
    if (retained > 0) this.meta.addSouls(retained);
    this.meta.recordRunEnd(this.runStats.kills);
    this.sound.setBiomeMood('sanctuary');
    this.openScreen('dead');
  }

  private openScreen(screen: GameScreen): void {
    if (screen === 'codex' || screen === 'controls' || screen === 'deeds') {
      if (this.screen !== 'codex' && this.screen !== 'controls' && this.screen !== 'deeds') {
        this.returnScreen = this.screen;
      }
    }
    this.screen = screen;
    const isWorldPlay = screen === 'playing' || screen === 'sanctuary';
    this.input.setGameplayEnabled(isWorldPlay);
    this.overlay.renderScreen(screen, {
      relicChoices: this.relicChoices,
      runStats: this.runStats,
      playerGold: this.runStats.gold,
      playerHp: this.player.hp,
      playerMaxHp: this.player.maxHp,
      sfxVolume: this.sound.getSfxVolume(),
      musicVolume: this.sound.getMusicVolume(),
    });
  }

  private resumeFromModal(): void {
    const target =
      this.returnScreen === 'playing' ||
      this.returnScreen === 'sanctuary' ||
      this.returnScreen === 'title'
        ? this.returnScreen
        : this.level.biome === 'sanctuary'
          ? 'sanctuary'
          : 'title';
    this.openScreen(target);
  }

  private showBanner(text: string): void {
    this.bannerText = text;
    this.bannerTimer = 3.2;
  }

  private render(): void {
    const ctx = this.ctx;
    const { camPxX, camPxY, worldX: camWorldX, worldY: camWorldY } = this.camera.getPixelOffset();
    const biomeId = this.level.biome;
    const parallax = this.assets.parallax[biomeId];
    const ts = this.assets.tileset;

    const drawBottomCenter = (img: HTMLCanvasElement, x: number, y: number): void => {
      ctx.drawImage(img, x - Math.floor(img.width * 0.5), y - img.height);
    };

    // 1. Multi-layer Gothic Parallax (native 640x360)
    ctx.drawImage(parallax.sky, 0, 0);
    this.drawTiledLayer(ctx, parallax.farSpires, camPxX * 0.14);
    this.drawTiledLayer(ctx, parallax.midCastle, camPxX * 0.32);
    this.drawTiledLayer(ctx, parallax.nearVaults, camPxX * 0.56);

    // 2. Background Decorative Props & Volumetric Rose Window Sunbeams
    const tm = this.level.tileMap;
    for (const p of this.props) {
      const px = Math.round(p.x * PIXEL_SCALE) - camPxX;
      const py = Math.round(p.y * PIXEL_SCALE) - camPxY;
      if (px < -100 || px > VIEW_W + 100 || py < -135 || py > VIEW_H + 135) continue;

      if (p.kind === 'rose_window') {
        const win = ts.roseWindow[biomeId];
        ctx.drawImage(win, px - Math.floor(win.width * 0.5), py - Math.floor(win.height * 0.5));
        ctx.save();
        ctx.fillStyle = BIOMES[biomeId].stoneAccent;
        ctx.globalAlpha = 0.08;
        ctx.beginPath();
        ctx.moveTo(px - 21, py + 18);
        ctx.lineTo(px + 21, py + 18);
        ctx.lineTo(px + 98, py + 202);
        ctx.lineTo(px + 27, py + 202);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (p.kind === 'banner') {
        // Anchor banner to the nearest solid ceiling above with twin dark-iron suspension rods
        const btx = Math.floor(p.x / TILE_SIZE);
        let bty = Math.floor(p.y / TILE_SIZE);
        while (bty > 0 && !tm.isSolid(btx, bty - 1)) bty--;
        const ceilPxY = bty * TILE_PX - camPxY;
        if (py > ceilPxY) {
          ctx.fillStyle = '#191922';
          ctx.fillRect(px - 9, ceilPxY, 2, py - ceilPxY + 3);
          ctx.fillRect(px + 7, ceilPxY, 2, py - ceilPxY + 3);
        }
        const frame = getAnimationFrame(ts.bannerAnim[biomeId], this.worldTime + p.variant, 1);
        ctx.drawImage(frame, px - Math.floor(frame.width * 0.5), py);
      } else if (p.kind === 'chain') {
        const ctxTileX = Math.floor(p.x / TILE_SIZE);
        let cty = Math.floor(p.y / TILE_SIZE);
        while (cty > 0 && !tm.isSolid(ctxTileX, cty - 1)) cty--;
        const topY = cty * TILE_PX - camPxY;
        const cx = px - Math.floor(ts.chain.width * 0.5);
        ctx.drawImage(ts.chain, cx, topY);
        ctx.drawImage(ts.chain, cx, topY + ts.chain.height);
        ctx.fillStyle = '#434457';
        ctx.fillRect(px - 3, topY + ts.chain.height * 2, 6, 4);
      } else if (p.kind === 'torch') {
        const frame = getAnimationFrame(ts.torchAnim, this.worldTime + p.variant * 0.25, 1);
        ctx.drawImage(frame, px - Math.floor(frame.width * 0.5), py - Math.floor(frame.height * 0.5));
      } else if (p.kind === 'brazier') {
        const frame = getAnimationFrame(ts.brazierAnim, this.worldTime, 1);
        drawBottomCenter(frame, px, py);
      } else if (p.kind === 'pillar') {
        const pil = ts.pillar[biomeId];
        const ptx = Math.floor(p.x / TILE_SIZE);
        let pty = Math.floor((p.y - 4) / TILE_SIZE);
        while (pty > 0 && !tm.isSolid(ptx, pty - 1) && !tm.isPlatform(ptx, pty - 1)) {
          pty--;
        }
        const topSurfacePxY = pty * TILE_PX - camPxY;
        const span = py - topSurfacePxY;
        if (span >= 72) {
          const pxLeft = px - Math.floor(pil.width * 0.5);
          const capH = 14;
          const baseH = 18;
          const shaftSrcY = 14;
          const shaftSrcH = pil.height - capH - baseH;
          // Base plinth
          ctx.drawImage(pil, 0, pil.height - baseH, pil.width, baseH, pxLeft, py - baseH, pil.width, baseH);
          // Tiled fluted shaft up to capital
          let curY = py - baseH;
          const stopY = topSurfacePxY + capH;
          while (curY > stopY) {
            const segH = Math.min(shaftSrcH, curY - stopY);
            ctx.drawImage(pil, 0, shaftSrcY, pil.width, segH, pxLeft, curY - segH, pil.width, segH);
            curY -= segH;
          }
          // Flared gothic capital flush against ceiling/platform
          ctx.drawImage(pil, 0, 0, pil.width, capH, pxLeft, topSurfacePxY, pil.width, capH);
        } else {
          drawBottomCenter(pil, px, py);
        }
      } else if (p.kind === 'statue') {
        drawBottomCenter(ts.statue[biomeId], px, py);
      }
    }

    // 3. Structural Support Stanchions / Ceiling Chains + Auto-Tiled 24x24px Stonework & 3-Slice Platforms
    const minTx = Math.max(0, Math.floor(camWorldX / TILE_SIZE));
    const maxTx = Math.min(tm.width - 1, Math.ceil((camWorldX + WORLD_VIEW_W) / TILE_SIZE));
    const minTy = Math.max(0, Math.floor(camWorldY / TILE_SIZE));
    const maxTy = Math.min(tm.height - 1, Math.ceil((camWorldY + WORLD_VIEW_H) / TILE_SIZE));

    // Pass 3a: Structural stanchions down to nearby floors or iron chains up to ceiling vaults (zero air gaps)
    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        if (tm.getTile(tx, ty) !== 2) continue;
        const isLeftEnd = !tm.isPlatform(tx - 1, ty) && !tm.isSolid(tx - 1, ty);
        const isRightEnd = !tm.isPlatform(tx + 1, ty) && !tm.isSolid(tx + 1, ty);
        if (!isLeftEnd && !isRightEnd) continue;

        const sx = tx * TILE_PX - camPxX;
        let supportDist = -1;
        for (let d = 1; d <= 6; d++) {
          const below = tm.getTile(tx, ty + d);
          if (below === 1 || below === 2) {
            supportDist = d;
            break;
          }
          if (below === 3) break;
        }

        if (supportDist >= 1) {
          const beam = ts.supportBeam[biomeId];
          const startY = ty * TILE_PX + 8 - camPxY;
          const endY = (ty + supportDist) * TILE_PX - camPxY;
          for (let cy = startY; cy < endY; cy += beam.height) {
            const drawH = Math.min(beam.height, endY - cy);
            ctx.drawImage(beam, 0, 0, beam.width, drawH, sx, cy, beam.width, drawH);
          }
        } else {
          let ceilDist = -1;
          for (let u = 1; u <= 20; u++) {
            if (ty - u < 0) break;
            const above = tm.getTile(tx, ty - u);
            if (above === 1) {
              ceilDist = u;
              break;
            }
            if (above === 2) break;
          }
          if (ceilDist >= 2) {
            const startY = (ty - ceilDist + 1) * TILE_PX - camPxY;
            const endY = ty * TILE_PX + 2 - camPxY;
            const cx = sx + Math.floor((TILE_PX - ts.chain.width) * 0.5);
            for (let cy = startY; cy < endY; cy += ts.chain.height) {
              const drawH = Math.min(ts.chain.height, endY - cy);
              ctx.drawImage(ts.chain, 0, 0, ts.chain.width, drawH, cx, cy, ts.chain.width, drawH);
            }
          }
        }
      }
    }

    // Pass 3b: Solid Stonework, Connected 3-Slice Platforms & Spikes
    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        const idx = ty * tm.width + tx;
        const t = tm.tiles[idx]!;
        if (t === 0) continue;
        const sx = tx * TILE_PX - camPxX;
        const sy = ty * TILE_PX - camPxY;
        if (t === 1) {
          const mask = tm.masks[idx]!;
          const v = tm.variants[idx]!;
          ctx.drawImage(ts.solidTiles[biomeId][mask]![v]!, sx, sy);
          // Micro floor clutter on exposed stone tops
          if ((mask & 1) === 0 && ((tx * 73 + ty * 37) & 7) === 0) {
            const clutter = ts.floorClutter[biomeId][(tx + ty) % 3]!;
            ctx.drawImage(clutter, sx + ((tx * 5) % 4), sy - clutter.height + 1);
          }
        } else if (t === 2) {
          const hasL = tm.isPlatform(tx - 1, ty);
          const hasR = tm.isPlatform(tx + 1, ty);
          const variant = !hasL && !hasR ? 0 : !hasL ? 1 : !hasR ? 3 : 2;
          ctx.drawImage(ts.platformTiles[biomeId][variant], sx, sy);
        } else if (t === 3) {
          ctx.drawImage(ts.spikesTile, sx, sy);
        }
      }
    }

    // 4. Sanctuary Sibling Hero Showcase (honor guard flanking Hall of Heroes monument)
    if (biomeId === 'sanctuary') {
      const others = CHARACTER_LIST.filter((c) => c.id !== this.player.id);
      const slots: Array<{ tx: number; facing: 1 | -1 }> = [
        { tx: 22.8, facing: 1 },
        { tx: 24.1, facing: 1 },
        { tx: 29.9, facing: -1 },
        { tx: 31.2, facing: -1 },
        { tx: 32.5, facing: -1 },
      ];
      others.forEach((hero, i) => {
        const slot = slots[i] ?? { tx: 22.8 + i * 1.4, facing: -1 };
        const hx = Math.round(slot.tx * TILE_SIZE);
        const hy = 17 * TILE_SIZE;
        const frame = getAnimationFrame(this.assets.characters[hero.id].idle, this.worldTime + i, slot.facing);
        ctx.drawImage(
          frame,
          Math.round(hx * PIXEL_SCALE) - camPxX - HERO_ANCHOR_X,
          Math.round(hy * PIXEL_SCALE) - camPxY - HERO_ANCHOR_Y,
        );
      });
    }

    // 5. Interactive Stations & Destructible Props
    for (const st of this.stations) {
      const sx = Math.round(st.x * PIXEL_SCALE) - camPxX;
      const sy = Math.round(st.y * PIXEL_SCALE) - camPxY;
      if (sx < -90 || sx > VIEW_W + 90) continue;

      if (st.kind === 'soul_altar') drawBottomCenter(ts.soulAltar, sx, sy);
      else if (st.kind === 'hero_pedestal') {
        drawBottomCenter(ts.heroPedestal, sx, sy);
        drawPixelText(ctx, tr('HALL OF HEROES', 'SALON DE HEROES'), sx, sy - 92, {
          color: '#ffe082',
          align: 'center',
          variant: 'gothic',
        });
      } else if (st.kind === 'deeds_lectern') {
        drawBottomCenter(ts.deedsLectern, sx, sy);
      } else if (st.kind === 'training_dummy') {
        const shakeX = this.dummyFlashTimer > 0 ? Math.round(Math.sin(this.worldTime * 90) * 3) : 0;
        drawBottomCenter(ts.trainingDummy, sx + shakeX, sy);
      } else if (st.kind === 'curse_brazier') {
        drawBottomCenter(ts.curseBrazier, sx, sy);
      } else if (st.kind === 'dungeon_gate' || st.kind === 'exit_portal') {
        const portal = getAnimationFrame(ts.portalAnim, this.worldTime, 1);
        drawBottomCenter(portal, sx, sy);
        if (st.locked) {
          drawPixelText(ctx, 'SEALED', sx, sy - portal.height - 8, { color: '#ff6b7a', align: 'center' });
        } else if (st.targetBiome) {
          drawPixelText(ctx, BIOMES[st.targetBiome].name.toUpperCase(), sx, sy - portal.height - 8, {
            color: st.targetBiome === 'ossuary' ? '#67d487' : '#7ef5eb',
            align: 'center',
          });
        }
      } else if (st.kind === 'chest') {
        drawBottomCenter(st.used ? ts.chestOpen : ts.chestClosed, sx, sy);
      } else if (st.kind === 'relic_shrine') {
        drawBottomCenter(ts.relicShrine, sx, sy);
      } else if (st.kind === 'trinity_scroll') {
        const floatY = Math.round(Math.sin(this.worldTime * 3.5) * 3);
        drawBottomCenter(ts.trinityScrollPedestal, sx, sy + floatY);
      } else if (st.kind === 'blood_shrine') {
        drawBottomCenter(ts.bloodShrine, sx, sy);
      } else if (st.kind === 'waystone') {
        const frame = getAnimationFrame(ts.waystoneAnim, st.activated ? this.worldTime : 0, 1);
        drawBottomCenter(frame, sx, sy);
      } else if (st.kind === 'lore_tablet') {
        drawBottomCenter(ts.loreTablet, sx, sy);
      } else if (st.kind === 'merchant') {
        drawBottomCenter(ts.merchantStand, sx, sy);
      } else if (st.kind === 'barrel') {
        drawBottomCenter(ts.barrel, sx, sy);
      } else if (st.kind === 'crate') {
        drawBottomCenter(ts.crate, sx, sy);
      }
    }

    // 6. Pickups (Souls, Gold, Meat) at native 1px Hi-Bit density
    for (const pk of this.pickups) {
      const px = Math.round(pk.x * PIXEL_SCALE) - camPxX;
      const py = Math.round((pk.y - 3 + Math.sin(this.worldTime * 5 + pk.x) * 1.5) * PIXEL_SCALE) - camPxY;
      if (pk.kind === 'soul') {
        ctx.fillStyle = '#0b0a12';
        ctx.fillRect(px - 5, py - 5, 10, 10);
        ctx.fillStyle = '#218196';
        ctx.fillRect(px - 4, py - 4, 8, 8);
        ctx.fillStyle = '#d6fffa';
        ctx.fillRect(px - 2, py - 2, 4, 4);
      } else if (pk.kind === 'gold') {
        ctx.fillStyle = '#0b0a12';
        ctx.fillRect(px - 4, py - 4, 9, 9);
        ctx.fillStyle = '#b5792b';
        ctx.fillRect(px - 3, py - 3, 7, 7);
        ctx.fillStyle = '#fff6cc';
        ctx.fillRect(px - 2, py - 2, 3, 3);
      } else {
        ctx.fillStyle = '#0b0a12';
        ctx.fillRect(px - 6, py - 5, 12, 9);
        ctx.fillStyle = '#991e36';
        ctx.fillRect(px - 5, py - 4, 10, 7);
        ctx.fillStyle = '#f0e6d2';
        ctx.fillRect(px + 2, py - 3, 4, 3);
      }
    }

    // 7. Enemies & Player (with grounded contact shadow & floating [F] indicator)
    for (const e of this.enemies) {
      e.render(ctx, this.assets, camPxX, camPxY);
    }
    if (!this.player.dead && this.player.onGround) {
      const psx = Math.round(this.player.x * PIXEL_SCALE) - camPxX;
      const psy = Math.round(this.player.y * PIXEL_SCALE) - camPxY;
      ctx.fillStyle = 'rgba(7, 6, 11, 0.48)';
      ctx.beginPath();
      ctx.ellipse(psx, psy - 1, 9, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    this.player.render(ctx, this.assets, camPxX, camPxY);

    if (this.nearbyStation && !this.nearbyStation.used) {
      const stx = Math.round(this.nearbyStation.x * PIXEL_SCALE) - camPxX;
      const sty =
        Math.round(this.nearbyStation.y * PIXEL_SCALE) -
        camPxY -
        44 +
        Math.round(Math.sin(this.worldTime * 5) * 3);
      ctx.fillStyle = 'rgba(11, 10, 18, 0.88)';
      ctx.fillRect(stx - 11, sty - 7, 22, 13);
      ctx.strokeStyle = '#c99746';
      ctx.strokeRect(stx - 10.5, sty - 6.5, 21, 12);
      drawPixelText(ctx, '[F]', stx, sty - 3, { color: '#ffe082', align: 'center' });
    }

    // 8. Projectiles & Warning Markers
    this.renderProjectiles(ctx, camPxX, camPxY);

    // 9. World Particles, Weather, Blood, Arcs, Damage Popups
    this.particles.renderWorld(ctx, camPxX, camPxY);

    // 9b. Subtle Foreground Silhouette Parallax Layer (1.24x camera speed)
    if (biomeId !== 'sanctuary') {
      this.drawTiledLayer(ctx, parallax.fgSilhouettes, camPxX * 1.24);
    }

    // 10. Full-Res 640x360 Dynamic Lighting + Vignette + Impact Flash Pass
    const dynamicLights: LightSource[] = [
      ...this.staticLights,
      {
        x: this.player.x,
        y: this.player.y - 16,
        radius: this.player.overdriveTimer > 0 ? 115 : 92,
        color: this.player.overdriveTimer > 0 ? '#7ef5eb' : this.player.def.glowColor,
        intensity: 0.95,
        flicker: 0.04,
      },
    ];
    for (const pr of this.projectiles) {
      dynamicLights.push({
        x: pr.x,
        y: pr.y,
        radius: 42,
        color: pr.color,
        intensity: 0.85,
        flicker: 0.05,
      });
    }
    if (this.activeBoss && this.activeBoss.hp > 0) {
      dynamicLights.push({
        x: this.activeBoss.x,
        y: this.activeBoss.y - 32,
        radius: 120,
        color: this.activeBoss.def.accentColor,
        intensity: 1.0,
        flicker: 0.09,
      });
    }

    const biomeDef = BIOMES[biomeId];
    this.lighting.render(
      ctx,
      camPxX,
      camPxY,
      biomeDef.ambientColor,
      biomeDef.ambientAlpha,
      dynamicLights,
      this.worldTime,
      this.screenFlash,
    );

    this.particles.renderAmbientMotes(ctx, biomeDef.torchColor);

    // 11. In-Game Pixel HUD
    if (this.screen === 'playing' || this.screen === 'sanctuary') {
      const promptText = this.getStationPrompt(this.nearbyStation);
      const canWarp =
        this.stations.filter((s) => s.kind === 'waystone' && s.activated).length >= 2;
      this.hud.render(
        ctx,
        this.player,
        this.runStats,
        this.meta.data.souls,
        biomeId,
        tm,
        this.stations,
        this.bossArenaLocked ? this.activeBoss : null,
        this.bannerText,
        this.bannerTimer,
        promptText,
        this.sound.isMuted(),
        this.killstreak,
        canWarp,
        this.meta.data.prestigeLevel,
      );
    }
  }

  private getStationPrompt(st: WorldStation | null): string | null {
    if (!st) return null;
    switch (st.kind) {
      case 'soul_altar':
        return tr('[F] SOUL ALTAR (PERMANENT UPGRADES)', '[F] ALTAR DE ALMAS (MEJORAS PERMANENTES)');
      case 'hero_pedestal':
        return tr('[F] HALL OF HEROES (SWITCH / UNLOCK)', '[F] SALON DE HEROES (CAMBIAR / DESBLOQUEAR)');
      case 'deeds_lectern':
        return tr('[F] BOOK OF DEEDS (ACHIEVEMENTS)', '[F] LIBRO DE HAZANAS (LOGROS)');
      case 'curse_brazier':
        return tr('[F] CURSE BRAZIER', '[F] BRASERO DE MALDICION');
      case 'dungeon_gate':
        return tr('[F] ENTER THE CRYPT', '[F] ENTRAR A LA CRIPTA');
      case 'chest':
        return tr('[F] OPEN CHEST', '[F] ABRIR COFRE');
      case 'relic_shrine':
        return tr('[F] COMMUNE WITH RELIC SHRINE', '[F] COMULGAR CON EL SAGRARIO');
      case 'trinity_scroll':
        return tr('[F] ABSORB TRINITY SCROLL', '[F] ABSORBER PERGAMINO');
      case 'blood_shrine':
        return tr('[F] OFFER BLOOD TO SHRINE (-20% HP)', '[F] OFRENDAR SANGRE (-20% PS)');
      case 'lore_tablet':
        return tr('[F] READ ANCIENT INSCRIPTION', '[F] LEER INSCRIPCION ANTIGUA');
      case 'merchant':
        return tr('[F] SPEAK WITH PEDDLER', '[F] HABLAR CON EL MERCADER');
      case 'exit_portal':
        if (st.locked) return tr('PORTAL SEALED BY BOSS', 'PORTAL SELLADO POR EL JEFE');
        return st.targetBiome
          ? `[F] ${tr('ENTER', 'ENTRAR A')} ${locBiome(BIOMES[st.targetBiome]).name.toUpperCase()}`
          : tr('[F] DESCEND TO NEXT BIOME', '[F] DESCENDER AL SIGUIENTE BIOMA');
      default:
        return null;
    }
  }

  private drawTiledLayer(
    ctx: CanvasRenderingContext2D,
    layer: HTMLCanvasElement,
    scrollX: number,
  ): void {
    const w = layer.width;
    const ox = -(((Math.round(scrollX) % w) + w) % w);
    ctx.drawImage(layer, ox, 0);
    if (ox + w < VIEW_W) {
      ctx.drawImage(layer, ox + w, 0);
    }
  }

  private renderProjectiles(ctx: CanvasRenderingContext2D, camPxX: number, camPxY: number): void {
    for (const p of this.projectiles) {
      const px = Math.round(p.x * PIXEL_SCALE) - camPxX;
      const py = Math.round(p.y * PIXEL_SCALE) - camPxY;

      if (p.warnDelay !== undefined && p.warnDelay > 0) {
        ctx.save();
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = 0.55;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px, py + 255);
        ctx.stroke();
        ctx.restore();
        drawPixelText(ctx, '!', px, py + 36, { color: p.color, scale: 2, align: 'center' });
        continue;
      }

      if (p.kind === 'chain_hook' && p.originX !== undefined && p.originY !== undefined) {
        ctx.strokeStyle = '#95a1c2';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(
          Math.round(p.originX * PIXEL_SCALE) - camPxX,
          Math.round(p.originY * PIXEL_SCALE) - camPxY,
        );
        ctx.lineTo(px, py);
        ctx.stroke();
      }

      if (p.kind === 'cinder_pillar') {
        const h = 64;
        ctx.fillStyle = p.color;
        ctx.fillRect(px - 12, py - h / 2, 24, h);
        ctx.fillStyle = p.coreColor;
        ctx.fillRect(px - 6, py - h / 2 + 6, 12, h - 12);
      } else if (p.kind === 'judgement_wave' || p.kind === 'soul_wave') {
        const dir = p.vx >= 0 ? 1 : -1;
        const slices: ReadonlyArray<readonly [number, number, number, number]> = [
          [-22, -7, 8, 5],
          [-18, -3, 9, 6],
          [-12, 1, 10, 24],
          [12, -3, 9, 6],
          [18, -7, 8, 5],
        ];
        for (const [dy, xOff, w, h] of slices) {
          const sx = dir > 0 ? px + xOff : px - xOff - w;
          ctx.fillStyle = p.color;
          ctx.fillRect(sx, py + dy, w, h);
        }
        ctx.fillStyle = p.coreColor;
        ctx.fillRect(dir > 0 ? px + 4 : px - 9, py - 14, 5, 28);
        ctx.fillRect(dir > 0 ? px + 1 : px - 6, py - 18, 5, 6);
        ctx.fillRect(dir > 0 ? px + 1 : px - 6, py + 12, 5, 6);
      } else if (p.kind === 'soul_skull') {
        ctx.fillStyle = '#0b0a12';
        ctx.fillRect(px - 7, py - 6, 14, 12);
        ctx.fillStyle = p.color;
        ctx.fillRect(px - 6, py - 5, 12, 10);
        ctx.fillStyle = '#f0e6d2';
        ctx.fillRect(px - 4, py - 4, 8, 7);
        ctx.fillStyle = '#0b0a12';
        ctx.fillRect(px - 3, py - 2, 2, 3);
        ctx.fillRect(px + 1, py - 2, 2, 3);
      } else {
        const pr = Math.max(3, Math.round(p.radius * PIXEL_SCALE));
        ctx.fillStyle = '#0b0a12';
        ctx.fillRect(px - pr - 1, py - pr - 1, pr * 2 + 2, pr * 2 + 2);
        ctx.fillStyle = p.color;
        ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
        ctx.fillStyle = p.coreColor;
        ctx.fillRect(
          px - Math.max(1, Math.floor(pr * 0.5)),
          py - Math.max(1, Math.floor(pr * 0.5)),
          Math.max(3, pr),
          Math.max(3, pr),
        );
      }
    }
  }
}
