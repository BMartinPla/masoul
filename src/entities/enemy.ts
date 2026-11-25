import { GRAVITY, MAX_FALL_SPEED, PIXEL_SCALE, TILE_SIZE } from '../core/constants.ts';
import type {
  BiomeId,
  EnemyAnimState,
  EnemyDef,
  EnemyId,
  Rect,
  StatusEffect,
} from '../core/types.ts';
import type { SoundEngine } from '../audio/soundEngine.ts';
import { ENEMIES } from '../data/enemies.ts';
import type { GameAssets } from '../art/assets.ts';
import { ENEMY_METRICS } from '../art/enemySprites.ts';
import { getAnimationFrame } from '../art/spriteAtlas.ts';
import { drawPixelText } from '../art/pixelFont.ts';
import { hasStatus, tickStatusEffects } from '../systems/combat.ts';
import type { TileMap } from '../world/tilemap.ts';
import type { ParticleSystem } from './particles.ts';
import type { Projectile } from './projectile.ts';

export type EnemyAIState = 'patrol' | 'chase' | 'telegraph' | 'attack' | 'recover' | 'dead';

let nextEnemyUid = 1;

export interface ActiveEnemyStrike {
  hitbox: Rect;
  damage: number;
  knockbackX: number;
  knockbackY: number;
}

export class Enemy {
  readonly uid: number;
  readonly id: EnemyId;
  readonly def: EnemyDef;
  readonly isElite: boolean;

  x: number;
  y: number;
  vx = 0;
  vy = 0;
  facing = -1;
  onGround = false;

  maxHp: number;
  hp: number;
  displayHp: number;
  damage: number;
  speed: number;

  aiState: EnemyAIState = 'patrol';
  stateTimer = 0;
  cooldownTimer = 0;
  patrolDir = 1;
  hurtTimer = 0;
  flashTimer = 0;
  invulnTimer = 0;
  deathTimer = 0;
  removed = false;

  // Boss specific
  phase = 1;
  patternIndex = 0;
  phaseTransitionTimer = 0;
  attackFired = false;
  activeStrike: ActiveEnemyStrike | null = null;
  hitPlayerThisAttack = false;

  animState: EnemyAnimState = 'idle';
  animTime = 0;
  statuses: StatusEffect[] = [];

  constructor(
    id: EnemyId,
    spawnX: number,
    spawnY: number,
    biome: BiomeId,
    curseTier: number,
    isElite = false,
  ) {
    this.uid = nextEnemyUid++;
    this.id = id;
    this.def = ENEMIES[id];
    this.isElite = isElite && !this.def.isBoss;
    this.x = spawnX;
    this.y = spawnY;

    const biomeMult = biome === 'citadel' ? 1.45 : biome === 'catacombs' ? 1.22 : 1.0;
    const curseMult = 1 + curseTier * 0.25;
    const eliteHpMult = this.isElite ? 1.65 : 1.0;
    const eliteDmgMult = this.isElite ? 1.25 : 1.0;

    this.maxHp = Math.round(this.def.maxHp * biomeMult * curseMult * eliteHpMult);
    this.hp = this.maxHp;
    this.displayHp = this.maxHp;
    this.damage = Math.round(this.def.damage * biomeMult * (1 + curseTier * 0.18) * eliteDmgMult);
    this.speed = this.def.speed * (this.isElite ? 1.12 : 1.0);
  }

  getRect(): Rect {
    return {
      x: this.x - this.def.width * 0.5,
      y: this.y - this.def.height,
      w: this.def.width,
      h: this.def.height,
    };
  }

  getCenter(): { x: number; y: number } {
    return { x: this.x, y: this.y - this.def.height * 0.5 };
  }

  update(
    dt: number,
    tileMap: TileMap,
    playerX: number,
    playerY: number,
    projectiles: Projectile[],
    particles: ParticleSystem,
    sound: SoundEngine,
    onEnemyDied: (enemy: Enemy) => void,
  ): void {
    this.animTime += dt;

    if (this.aiState === 'dead') {
      this.deathTimer += dt;
      this.setAnimState('death');
      if (!this.def.isFlying) {
        this.vy = Math.min(MAX_FALL_SPEED, this.vy + GRAVITY * dt);
        const res = tileMap.moveAndCollide(this.getRect(), this.vx * 0.88, this.vy, dt, false);
        this.x = res.x + this.def.width * 0.5;
        this.y = res.y + this.def.height;
        this.vx = res.vx;
        this.vy = res.vy;
      }
      if (this.deathTimer >= 0.72) {
        this.removed = true;
      }
      return;
    }

    // Status ticks (Burn / Poison / Bleed)
    tickStatusEffects(this.statuses, dt, (type, dmg) => {
      this.hp = Math.max(0, this.hp - dmg);
      const color =
        type === 'burn' ? '#ff9636' : type === 'poison' ? '#9be675' : '#ff6b7a';
      particles.addDamageNumber(this.x, this.y - this.def.height - 4, `${dmg}`, color, false);
      if (this.hp <= 0) {
        this.triggerDeath(onEnemyDied);
      }
    });
    if (this.hp <= 0) return;

    if (this.hurtTimer > 0) this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    if (this.flashTimer > 0) this.flashTimer = Math.max(0, this.flashTimer - dt);
    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    if (this.cooldownTimer > 0) this.cooldownTimer = Math.max(0, this.cooldownTimer - dt);

    if (this.displayHp > this.hp) {
      this.displayHp = Math.max(this.hp, this.displayHp - Math.max(12, this.maxHp * 0.65) * dt);
    } else {
      this.displayHp = this.hp;
    }

    // Ambient elemental status particles
    if (this.statuses.length > 0 && Math.random() < dt * 7) {
      if (hasStatus(this.statuses, 'burn')) {
        particles.spawnBurst(this.x, this.y - this.def.height * 0.6, 1, ['#ff9636', '#ffd466'], 8, 28, -50, 2);
      } else if (hasStatus(this.statuses, 'poison')) {
        particles.spawnBurst(this.x, this.y - this.def.height * 0.6, 1, ['#67d487', '#9be675'], 6, 22, 30, 2);
      } else if (hasStatus(this.statuses, 'frost')) {
        particles.spawnBurst(this.x, this.y - this.def.height * 0.6, 1, ['#7ef5eb', '#d6fffa'], 6, 20, 10, 2);
      }
    }

    // Boss Phase 2 transition at 50% HP
    if (this.def.isBoss && this.phase === 1 && this.hp <= this.maxHp * 0.5) {
      this.phase = 2;
      this.phaseTransitionTimer = 0.85;
      this.invulnTimer = 0.85;
      this.activeStrike = null;
      sound.playBossRoar();
      particles.spawnBurst(
        this.x,
        this.y - 26,
        28,
        [this.def.accentColor, '#ffe082', '#ffffff'],
        90,
        240,
        20,
        3,
      );
      particles.addDamageNumber(this.x, this.y - this.def.height - 14, 'PHASE II!', this.def.accentColor, true);
    }

    if (this.phaseTransitionTimer > 0) {
      this.phaseTransitionTimer -= dt;
      this.setAnimState('telegraph');
      return;
    }

    const stunned = hasStatus(this.statuses, 'stun');
    const frostSlow = hasStatus(this.statuses, 'frost') ? 0.65 : 1.0;
    const bossSpeedMult = this.def.isBoss && this.phase === 2 ? 1.25 : 1.0;
    const effSpeed = this.speed * frostSlow * bossSpeedMult;

    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.hypot(dx, dy);

    if (stunned) {
      this.vx *= 0.82;
      this.activeStrike = null;
      this.setAnimState('hurt');
    } else if (this.aiState === 'telegraph') {
      this.vx *= 0.8;
      this.stateTimer -= dt * frostSlow;
      this.setAnimState('telegraph');
      if (this.stateTimer <= 0) {
        this.beginAttack(dx, dy, sound);
      }
    } else if (this.aiState === 'attack') {
      this.stateTimer -= dt;
      this.setAnimState('attack');
      this.executeAttackFrame(dx, dy, projectiles, particles, sound);
      if (this.stateTimer <= 0) {
        this.activeStrike = null;
        this.aiState = 'recover';
        this.stateTimer = 0.25;
        this.cooldownTimer =
          this.def.attackCooldown * (this.def.isBoss && this.phase === 2 ? 0.68 : 1.0);
      }
    } else if (this.aiState === 'recover') {
      this.vx *= 0.82;
      this.stateTimer -= dt;
      this.setAnimState('idle');
      if (this.stateTimer <= 0) {
        this.aiState = 'chase';
      }
    } else {
      // Patrol or Chase
      const hasSight =
        dist <= this.def.detectRange &&
        (this.def.isBoss || tileMap.hasLineOfSight(this.x, this.y - 14, playerX, playerY - 14));

      // Mimic stays disguised completely motionless until approached closely
      if (this.id === 'mimic' && this.aiState === 'patrol') {
        this.vx = 0;
        this.setAnimState('idle');
        if (hasSight) {
          this.aiState = 'chase';
          sound.playBossRoar();
          particles.spawnBurst(this.x, this.y - 10, 12, ['#ffe082', '#ff6b7a'], 45, 130, 60, 2);
        }
      } else if (!hasSight && this.aiState === 'patrol') {
        this.vx = this.patrolDir * effSpeed * 0.55;
        this.facing = this.patrolDir;
        this.setAnimState('move');
        // Turn at ledges & spike hazards
        if (!this.def.isFlying && this.onGround && !this.hasSafeGroundAhead(tileMap, this.patrolDir)) {
          this.patrolDir *= -1;
        }
      } else {
        this.aiState = 'chase';
        if (Math.abs(dx) > 4) this.facing = dx >= 0 ? 1 : -1;

        if (this.id === 'crossbowman' || this.id === 'cultist' || this.id === 'frost_wraith') {
          // Ranged kiting behavior
          if (dist < 72 && this.cooldownTimer <= 0 && this.id === 'cultist') {
            const blinkX = this.x - this.facing * 92;
            const btx = Math.floor(blinkX / TILE_SIZE);
            const bty = Math.floor((this.y - 16) / TILE_SIZE);
            const floorTy = Math.floor((this.y + 4) / TILE_SIZE);
            if (
              !tileMap.isSolid(btx, bty) &&
              (tileMap.isSolid(btx, floorTy) || tileMap.isPlatform(btx, floorTy)) &&
              !tileMap.isSpikes(btx, floorTy) &&
              !tileMap.isSpikes(btx, floorTy - 1)
            ) {
              particles.spawnBurst(this.x, this.y - 16, 10, ['#d1364e', '#ba82ed'], 30, 90, 0, 2);
              this.x = blinkX;
              particles.spawnBurst(this.x, this.y - 16, 10, ['#ff6b7a', '#ba82ed'], 30, 90, 0, 2);
            }
          }
          if (this.id === 'frost_wraith') {
            const desiredY = playerY - 30;
            this.vy = Math.sign(desiredY - this.y) * effSpeed * 0.7;
          }
          const isGroundRanged = this.id !== 'frost_wraith';
          if (dist < 65) {
            const retreatDir = -this.facing;
            if (!isGroundRanged || !this.onGround || this.hasSafeGroundAhead(tileMap, retreatDir)) {
              this.vx = retreatDir * effSpeed * 0.75;
              this.setAnimState('move');
            } else {
              this.vx = 0;
              this.setAnimState('idle');
            }
          } else if (dist > this.def.attackRange * 0.88) {
            if (!isGroundRanged || !this.onGround || this.hasSafeGroundAhead(tileMap, this.facing)) {
              this.vx = this.facing * effSpeed;
              this.setAnimState('move');
            } else {
              this.vx = 0;
              this.setAnimState('idle');
            }
          } else {
            this.vx *= 0.75;
            this.setAnimState('idle');
          }

          if (dist <= this.def.attackRange && this.cooldownTimer <= 0 && Math.abs(dy) < 96) {
            this.enterTelegraph(sound);
          }
        } else if (this.def.isFlying) {
          // Gargoyle swoop / hover pursuit
          const desiredY = playerY - 38;
          this.vx = Math.sign(dx) * effSpeed;
          this.vy = Math.sign(desiredY - this.y) * effSpeed * 0.85;
          this.setAnimState('move');
          if (dist <= this.def.attackRange && this.cooldownTimer <= 0) {
            this.enterTelegraph(sound);
          }
        } else {
          // Melee ground chasers + Bosses
          if (Math.abs(dx) > this.def.attackRange * 0.78) {
            const curTx = Math.floor(this.x / TILE_SIZE);
            const floorY = Math.floor((this.y + 4) / TILE_SIZE);
            const aheadTx = Math.floor((this.x + this.facing * 14) / TILE_SIZE);
            const safeAhead = this.hasSafeGroundAhead(tileMap, this.facing);
            const canDropDown =
              tileMap.isPlatform(curTx, floorY) &&
              dy > 24 &&
              !tileMap.isSpikes(aheadTx, floorY + 3);
            if (!this.onGround || safeAhead || canDropDown) {
              this.vx = this.facing * effSpeed;
              this.setAnimState('move');
            } else {
              this.vx = 0;
              this.setAnimState('idle');
            }
          } else {
            this.vx = 0;
            this.setAnimState('idle');
          }

          const triggerDist = this.def.isBoss ? 220 : this.def.attackRange;
          if (dist <= triggerDist && Math.abs(dy) < (this.def.isBoss ? 140 : 44) && this.cooldownTimer <= 0) {
            this.enterTelegraph(sound);
          }
        }
      }
    }

    // Physics integration
    if (!this.def.isFlying) {
      this.vy = Math.min(MAX_FALL_SPEED, this.vy + GRAVITY * dt);
    }

    const res = tileMap.moveAndCollide(this.getRect(), this.vx, this.vy, dt, false);
    this.x = res.x + this.def.width * 0.5;
    this.y = res.y + this.def.height;
    this.vx = res.vx;
    this.vy = res.vy;
    this.onGround = res.onGround;

    if (res.hitWallLeft || res.hitWallRight) {
      if (this.aiState === 'patrol') this.patrolDir *= -1;
    }
  }

  private enterTelegraph(sound: SoundEngine): void {
    this.aiState = 'telegraph';
    this.stateTimer =
      this.def.telegraphDuration * (this.def.isBoss && this.phase === 2 ? 0.78 : 1.0);
    this.attackFired = false;
    this.hitPlayerThisAttack = false;
    if (!this.def.isBoss) sound.playTelegraph();
  }

  private beginAttack(dx: number, _dy: number, sound: SoundEngine): void {
    this.aiState = 'attack';
    this.stateTimer = this.def.attackDuration;
    this.facing = dx >= 0 ? 1 : -1;
    this.attackFired = false;
    this.hitPlayerThisAttack = false;

    if (this.def.isBoss) {
      this.patternIndex = (this.patternIndex + 1) % 3;
      sound.playHeavySlash();
    } else if (this.id === 'ghoul' || this.id === 'plague_rat' || this.id === 'mimic') {
      this.vx = this.facing * (this.id === 'plague_rat' ? 210 : 235);
      this.vy = -125;
      sound.playSlash();
    } else if (this.id === 'gargoyle') {
      this.vx = this.facing * 210;
      this.vy = 110;
      sound.playSlash();
    } else if (this.id === 'skeleton' || this.id === 'dark_knight' || this.id === 'brute') {
      this.vx = this.facing * 95;
      sound.playSlash();
    }
  }

  private executeAttackFrame(
    dx: number,
    dy: number,
    projectiles: Projectile[],
    particles: ParticleSystem,
    sound: SoundEngine,
  ): void {
    if (this.id === 'frost_wraith') {
      if (!this.attackFired) {
        this.attackFired = true;
        sound.playFireball();
        const len = Math.max(1, Math.hypot(dx, dy));
        projectiles.push({
          owner: 'enemy',
          kind: 'frost_bolt',
          x: this.x + this.facing * 10,
          y: this.y - 18,
          vx: (dx / len) * 185,
          vy: (dy / len) * 185,
          radius: 5,
          damage: this.damage,
          life: 1.9,
          maxLife: 1.9,
          piercing: false,
          applyStatus: 'frost',
          color: '#7ef5eb',
          coreColor: '#ffffff',
          hitIds: new Set<number>(),
        });
      }
      return;
    }

    if (this.id === 'crossbowman') {
      if (!this.attackFired) {
        this.attackFired = true;
        sound.playArrow();
        const len = Math.max(1, Math.hypot(dx, dy));
        projectiles.push({
          owner: 'enemy',
          kind: 'bolt',
          x: this.x + this.facing * 10,
          y: this.y - 15,
          vx: (dx / len) * 240,
          vy: (dy / len) * 240,
          radius: 4,
          damage: this.damage,
          life: 1.6,
          maxLife: 1.6,
          piercing: false,
          color: '#ffd466',
          coreColor: '#ffffff',
          hitIds: new Set<number>(),
        });
      }
      return;
    }

    if (this.id === 'cultist') {
      if (!this.attackFired) {
        this.attackFired = true;
        sound.playFireball();
        const len = Math.max(1, Math.hypot(dx, dy));
        projectiles.push({
          owner: 'enemy',
          kind: 'blood_orb',
          x: this.x + this.facing * 10,
          y: this.y - 18,
          vx: (dx / len) * 125,
          vy: (dy / len) * 125,
          radius: 6,
          damage: this.damage,
          life: 2.8,
          maxLife: 2.8,
          piercing: false,
          homingStrength: 135,
          color: '#d1364e',
          coreColor: '#ffb8bf',
          hitIds: new Set<number>(),
        });
      }
      return;
    }

    if (this.def.isBoss) {
      this.executeBossAttack(dx, projectiles, particles, sound);
      return;
    }

    // Melee hit window
    if (this.stateTimer > 0.08 && this.stateTimer < this.def.attackDuration - 0.04) {
      const reach = this.id === 'brute' ? 42 : this.id === 'dark_knight' ? 36 : 26;
      this.activeStrike = {
        hitbox: {
          x: this.facing >= 0 ? this.x - 4 : this.x - reach + 4,
          y: this.y - this.def.height - 2,
          w: reach,
          h: this.def.height + 2,
        },
        damage: this.damage,
        knockbackX: this.facing * 150,
        knockbackY: -95,
      };
      if (this.id === 'brute' && !this.attackFired) {
        this.attackFired = true;
        sound.playSlam();
        particles.spawnBurst(this.x + this.facing * 20, this.y - 2, 12, ['#ff9636', '#cfc0a9'], 50, 150, 120, 3);
      }
    } else {
      this.activeStrike = null;
    }
  }

  private executeBossAttack(
    dx: number,
    projectiles: Projectile[],
    particles: ParticleSystem,
    sound: SoundEngine,
  ): void {
    const isInquisitor = this.id === 'boss_inquisitor';
    const isWarden = this.id === 'boss_warden';
    const color = isWarden ? '#3bc2cf' : isInquisitor ? '#ff9636' : '#ff6b7a';
    const core = isWarden ? '#d6fffa' : isInquisitor ? '#fff8d6' : '#ffd466';

    if (this.patternIndex === 0) {
      // Pattern 0: Fierce Dash Cleave / Blazing Flail Sweep
      this.vx = this.facing * (this.phase === 2 ? 250 : 200);
      this.activeStrike = {
        hitbox: {
          x: this.facing >= 0 ? this.x - 6 : this.x - 48,
          y: this.y - 54,
          w: 54,
          h: 54,
        },
        damage: this.damage,
        knockbackX: this.facing * 210,
        knockbackY: -120,
      };
    } else if (this.patternIndex === 1) {
      // Pattern 1: Fire-Chains (Inquisitor) or Soul / Flame Waves
      if (!this.attackFired) {
        this.attackFired = true;
        sound.playFireball();
        const count = this.phase === 2 ? (isInquisitor ? 3 : 4) : 2;
        for (let i = 0; i < count; i++) {
          const spreadY = (i - (count - 1) * 0.5) * 38;
          projectiles.push({
            owner: 'enemy',
            kind: isInquisitor ? 'fire_chain' : 'soul_wave',
            x: this.x + this.facing * 18,
            y: this.y - 24,
            vx: this.facing * (isInquisitor ? 210 : 185),
            vy: spreadY,
            radius: isInquisitor ? 7 : 9,
            damage: Math.round(this.damage * 0.85),
            life: 2.1,
            maxLife: 2.1,
            piercing: false,
            applyStatus: isInquisitor ? 'burn' : undefined,
            color,
            coreColor: core,
            hitIds: new Set<number>(),
          });
        }
      }
    } else {
      // Pattern 2: Erupting Cinder Pillars (Inquisitor) or Spectral Blades / Abyssal Meteors
      if (!this.attackFired) {
        this.attackFired = true;
        sound.playBossRoar();
        if (isInquisitor) {
          const cols = this.phase === 2 ? 4 : 2;
          const baseOff = Math.sign(dx || this.facing) * 65;
          for (let i = 0; i < cols; i++) {
            const ox = this.x + baseOff + (i - (cols - 1) * 0.5) * 44;
            projectiles.push({
              owner: 'enemy',
              kind: 'cinder_pillar',
              x: ox,
              y: this.y - 22,
              vx: 0,
              vy: 0,
              radius: 14,
              damage: Math.round(this.damage * 0.9),
              life: 0.65,
              maxLife: 0.65,
              piercing: true,
              warnDelay: 0.42,
              applyStatus: 'burn',
              color,
              coreColor: core,
              hitIds: new Set<number>(),
            });
          }
        } else {
          const drops = this.phase === 2 ? 5 : 3;
          const playerApproxX = this.x + dx;
          for (let i = 0; i < drops; i++) {
            const ox = playerApproxX + (i - Math.floor(drops / 2)) * 42;
            projectiles.push({
              owner: 'enemy',
              kind: isWarden ? 'spectral_blade' : 'meteor',
              x: ox,
              y: this.y - 165,
              vx: 0,
              vy: isWarden ? 240 : 215,
              radius: 9,
              damage: Math.round(this.damage * 0.9),
              life: 1.5,
              maxLife: 1.5,
              piercing: false,
              warnDelay: 0.45 + i * 0.08,
              color,
              coreColor: core,
              hitIds: new Set<number>(),
            });
          }
        }
        particles.spawnBurst(this.x, this.y - 30, 14, [color, core], 50, 140, 0, 3);
      }
    }
  }

  triggerDeath(onEnemyDied: (enemy: Enemy) => void): void {
    if (this.aiState === 'dead') return;
    this.aiState = 'dead';
    this.activeStrike = null;
    this.deathTimer = 0;
    onEnemyDied(this);
  }

  private hasSafeGroundAhead(tileMap: TileMap, dir: number): boolean {
    const aheadX = Math.floor((this.x + dir * 14) / TILE_SIZE);
    const floorY = Math.floor((this.y + 4) / TILE_SIZE);
    return (
      (tileMap.isSolid(aheadX, floorY) || tileMap.isPlatform(aheadX, floorY)) &&
      tileMap.getTile(aheadX, floorY - 1) !== 3 &&
      tileMap.getTile(aheadX, floorY) !== 3
    );
  }

  private setAnimState(next: EnemyAnimState): void {
    if (this.animState !== next) {
      this.animState = next;
      this.animTime = 0;
    }
  }

  render(ctx: CanvasRenderingContext2D, assets: GameAssets, camPxX: number, camPxY: number): void {
    const m = ENEMY_METRICS[this.id];
    const anim = assets.enemies[this.id][this.animState];
    const frame = getAnimationFrame(anim, this.animTime, this.facing, this.flashTimer > 0);
    const sx = Math.round(this.x * PIXEL_SCALE) - camPxX;
    const sy = Math.round(this.y * PIXEL_SCALE) - camPxY;
    const drawX = sx - m.anchorX;
    const drawY = sy - m.anchorY;
    const headOffsetPx = Math.round(this.def.height * PIXEL_SCALE);

    if (this.aiState === 'dead') {
      ctx.globalAlpha = Math.max(0.2, 1 - this.deathTimer / 0.75);
    } else {
      if (!this.def.isFlying) {
        ctx.fillStyle = 'rgba(7, 6, 11, 0.45)';
        ctx.beginPath();
        ctx.ellipse(sx, sy - 1, Math.round(this.def.width * 0.55), 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      if (this.id === 'frost_wraith') {
        ctx.globalAlpha = this.animState === 'move' ? 0.68 : 0.9;
      }
    }
    ctx.drawImage(frame, drawX, drawY);
    ctx.globalAlpha = 1;

    if (this.aiState === 'dead') return;

    // Boss ground danger zone warning stripe during telegraph
    if (this.def.isBoss && this.aiState === 'telegraph') {
      const reach = Math.round((this.def.attackRange + 14) * PIXEL_SCALE);
      const zx = this.facing >= 0 ? sx : sx - reach;
      ctx.save();
      ctx.globalAlpha = 0.28 + 0.14 * Math.sin(this.animTime * 28);
      ctx.fillStyle = '#ff4d63';
      ctx.fillRect(zx, sy - 6, reach, 5);
      ctx.restore();
    }

    // Bright unmistakable '!' telegraph warning sign
    if (this.aiState === 'telegraph') {
      drawPixelText(ctx, '!', sx, sy - headOffsetPx - 18, {
        color: '#ff6b7a',
        scale: 2,
        align: 'center',
      });
    } else if (hasStatus(this.statuses, 'stun')) {
      drawPixelText(ctx, 'STUN', sx, sy - headOffsetPx - 14, {
        color: '#ffe082',
        scale: 1,
        align: 'center',
      });
    }

    // Crisp Hi-Bit overhead HP bar with trailing damage indicator
    if (!this.def.isBoss && (this.hp < this.maxHp || this.isElite)) {
      const barW = this.isElite ? 40 : 32;
      const bx = Math.round(sx - barW * 0.5);
      const by = sy - headOffsetPx - 8;
      ctx.fillStyle = '#0b0a12';
      ctx.fillRect(bx - 1, by - 1, barW + 2, 5);
      ctx.fillStyle = '#291724';
      ctx.fillRect(bx, by, barW, 3);
      const trail = Math.max(0, Math.round((this.displayHp / this.maxHp) * barW));
      if (trail > 0) {
        ctx.fillStyle = '#fff3d6';
        ctx.fillRect(bx, by, trail, 3);
      }
      const fill = Math.max(1, Math.round((this.hp / this.maxHp) * barW));
      ctx.fillStyle = this.isElite ? '#ffe082' : '#d1364e';
      ctx.fillRect(bx, by, fill, 3);
    }
  }
}
