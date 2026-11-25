import {
  COYOTE_TIME,
  DROP_THROUGH_TIME,
  GRAVITY,
  MAX_FALL_SPEED,
  PIXEL_SCALE,
  RALLY_DECAY_RATE,
  TILE_SIZE,
  WALL_SLIDE_SPEED,
} from '../core/constants.ts';
import type { InputManager } from '../core/input.ts';
import type {
  CharacterAnimState,
  CharacterDef,
  CharacterId,
  Rect,
  RelicId,
  ScrollStat,
  StatusEffect,
  StatusType,
} from '../core/types.ts';
import type { SoundEngine } from '../audio/soundEngine.ts';
import { CHARACTERS } from '../data/characters.ts';
import type { EffectiveHeroStats } from '../systems/metaprogression.ts';
import { getAnimationFrame } from '../art/spriteAtlas.ts';
import type { GameAssets } from '../art/assets.ts';
import { HERO_ANCHOR_X, HERO_ANCHOR_Y } from '../art/characterSprites.ts';
import type { TileMap } from '../world/tilemap.ts';
import type { ParticleSystem } from './particles.ts';
import type { Projectile } from './projectile.ts';

export interface ActivePlayerAttack {
  hitbox: Rect;
  damage: number;
  knockbackX: number;
  knockbackY: number;
  forceCrit: boolean;
  piercesShield: boolean;
  applyStatus?: StatusType;
  lifeDrain?: number;
  alreadyHitIds: Set<number>;
}

export class Player {
  readonly id: CharacterId;
  readonly def: CharacterDef;

  // World position is bottom-center of collision box
  x: number;
  y: number;
  readonly w = 14;
  readonly h = 28;
  vx = 0;
  vy = 0;
  facing = 1;

  onGround = false;
  wallSlideDir = 0; // -1 left wall, 1 right wall, 0 none
  coyoteTimer = 0;
  jumpsUsed = 0;
  dropThroughTimer = 0;

  // Health & resources
  maxHp: number;
  hp: number;
  rallyHp: number;
  rallyDelay = 0;
  shieldHp = 0;
  flaskCharges: number;
  maxFlaskCharges: number;
  phoenixUsed = false;

  // Multipliers from meta + scrolls + relics + upgrades
  damageMult: number;
  moveSpeedMult: number;
  critChance: number;
  cooldownRecovery: number;
  scrollMasteryMult: number;
  overdriveChargeMult: number;
  weaponUpgrades = 0;
  relics: RelicId[] = [];
  scrolls: Record<ScrollStat, number> = { brutality: 0, tactics: 0, survival: 0 };

  // Soul Overdrive & Relic Timers
  surge = 0; // 0..100
  overdriveTimer = 0;
  mirrorWardCooldown = 0;
  bannerPos: { x: number; y: number; timer: number; regenAccum: number } | null = null;

  // Buffs & states
  invulnTimer = 0;
  hurtTimer = 0;
  flashTimer = 0;
  dead = false;
  deathAnimTimer = 0;

  // Roll & Mid-Air Jump
  rollTimer = 0;
  rollCooldown = 0;
  afterimageTimer = 0;
  airJumpAnimTimer = 0;
  visualScaleX = 1;
  visualScaleY = 1;

  // Combo & Dive Slam
  comboStep = 0;
  attackTimer = 0;
  attackTotal = 0;
  comboResetTimer = 0;
  activeAttack: ActivePlayerAttack | null = null;
  attackHitIds = new Set<number>();
  rangedShotFired = false;
  isDiving = false;

  // Skills
  skill1Cooldown = 0;
  skill2Cooldown = 0;
  skillAnimTimer = 0;
  skillAnimWhich: 1 | 2 = 1;
  parryTimer = 0;
  parryEmpowered = false;
  guaranteedNextCrit = false;
  furyTimer = 0;
  whirlwindTimer = 0;
  whirlwindTick = 0;

  // Animation
  animState: CharacterAnimState = 'idle';
  animTime = 0;
  statuses: StatusEffect[] = [];

  constructor(
    charId: CharacterId,
    spawnX: number,
    spawnY: number,
    metaStats: EffectiveHeroStats,
  ) {
    this.id = charId;
    this.def = CHARACTERS[charId];
    this.x = spawnX;
    this.y = spawnY;

    this.maxHp = Math.round((this.def.maxHp + metaStats.maxHp) * metaStats.prestigeStatMult);
    this.hp = this.maxHp;
    this.rallyHp = this.maxHp;
    this.flaskCharges = metaStats.flaskCharges;
    this.maxFlaskCharges = metaStats.flaskCharges;
    this.damageMult = metaStats.damageMult;
    this.moveSpeedMult = metaStats.moveSpeedMult;
    this.critChance = Math.min(
      0.95,
      (this.def.critChance + metaStats.critChanceBonus) * metaStats.prestigeStatMult,
    );
    this.cooldownRecovery = metaStats.cooldownRecoveryMult;
    this.scrollMasteryMult = metaStats.scrollMasteryMult;
    this.overdriveChargeMult = metaStats.overdriveChargeMult;
    this.surge = Math.min(100, metaStats.overdriveStartSurge);
  }

  getRect(): Rect {
    return {
      x: this.x - this.w * 0.5,
      y: this.y - this.h,
      w: this.w,
      h: this.h,
    };
  }

  getCenter(): { x: number; y: number } {
    return { x: this.x, y: this.y - this.h * 0.5 };
  }

  hasRelic(r: RelicId): boolean {
    return this.relics.includes(r);
  }

  addRelic(r: RelicId): void {
    if (this.relics.includes(r) && r !== 'blood_chalice') {
      this.weaponUpgrades += 1;
      this.heal(25);
      return;
    }
    this.relics.push(r);
    if (r === 'blood_chalice') {
      this.maxHp = Math.max(30, Math.round(this.maxHp * 0.75));
      this.hp = Math.min(this.hp, this.maxHp);
      this.rallyHp = Math.min(this.rallyHp, this.maxHp);
    } else if (r === 'aegis_shard') {
      this.shieldHp = Math.max(this.shieldHp, 20);
    }
  }

  applyScroll(stat: ScrollStat): void {
    this.scrolls[stat] += 1;
    const hpGainMult =
      stat === 'survival' ? 0.18 : stat === 'brutality' ? 0.12 : 0.10;
    const oldMax = this.maxHp;
    this.maxHp = Math.round(oldMax * (1 + hpGainMult * this.scrollMasteryMult));
    const delta = Math.max(8, this.maxHp - oldMax);
    this.heal(delta + Math.round(this.maxHp * 0.1));
  }

  addSurge(amount: number): void {
    if (this.overdriveTimer > 0) return;
    this.surge = Math.min(100, this.surge + amount * this.overdriveChargeMult);
  }

  isInsideConsecratedBanner(): boolean {
    if (!this.bannerPos || this.bannerPos.timer <= 0) return false;
    return Math.hypot(this.x - this.bannerPos.x, this.y - this.bannerPos.y) <= 78;
  }

  getTotalDamage(mult = 1, kind: 'melee' | 'skill' = 'melee'): number {
    const brutScale = 1 + this.scrolls.brutality * 0.15 * this.scrollMasteryMult;
    const tactScale = 1 + this.scrolls.tactics * 0.15 * this.scrollMasteryMult;
    const survScale = 1 + this.scrolls.survival * 0.06 * this.scrollMasteryMult;
    const scrollDmg =
      kind === 'skill'
        ? tactScale * (1 + this.scrolls.brutality * 0.04)
        : brutScale * survScale;

    let total =
      this.def.baseDamage *
      this.damageMult *
      scrollDmg *
      (1 + this.weaponUpgrades * 0.2) *
      mult;
    if (this.parryEmpowered) total *= 1.35;
    if (this.furyTimer > 0) total *= 1.25;
    if (this.overdriveTimer > 0) total *= 1.3;
    if (this.isInsideConsecratedBanner()) total *= 1.3;
    return total;
  }

  heal(amount: number): void {
    if (this.dead) return;
    this.hp = Math.min(this.maxHp, Math.round(this.hp + amount));
    this.rallyHp = Math.max(this.rallyHp, this.hp);
  }

  onEnterNewRoom(): void {
    if (this.hasRelic('aegis_shard')) {
      this.shieldHp = 20;
    }
  }

  triggerParrySuccess(particles: ParticleSystem, sound: SoundEngine): void {
    this.parryTimer = 0;
    this.invulnTimer = Math.max(this.invulnTimer, 0.45);
    this.parryEmpowered = true;
    this.addSurge(16);
    sound.playParry();
    particles.spawnBurst(
      this.x + this.facing * 8,
      this.y - 16,
      16,
      ['#ffe082', '#fff6cc', '#7ef5eb'],
      60,
      190,
      80,
      3,
    );
    particles.addDamageNumber(this.x, this.y - 36, 'PARRY!', '#ffe082', true);
  }

  onKillEnemy(particles: ParticleSystem, projectiles?: Projectile[]): void {
    this.addSurge(14);
    if (this.id === 'executioner') {
      this.furyTimer = 4.0;
      this.heal(4);
      particles.addDamageNumber(this.x, this.y - 34, 'FURY!', '#ff6b7a', false);
    }
    if (this.id === 'necromancer' && projectiles) {
      projectiles.push({
        owner: 'player',
        kind: 'soul_skull',
        x: this.x,
        y: this.y - 22,
        vx: this.facing * 150,
        vy: -55,
        radius: 5,
        damage: this.getTotalDamage(0.95, 'skill'),
        life: 2.4,
        maxLife: 2.4,
        piercing: false,
        homingStrength: 290,
        color: '#67d487',
        coreColor: '#d6fffa',
        hitIds: new Set<number>(),
      });
    }
    if (this.hasRelic('vampiric_fang')) {
      this.heal(5);
    }
  }

  update(
    dt: number,
    input: InputManager,
    tileMap: TileMap,
    projectiles: Projectile[],
    particles: ParticleSystem,
    sound: SoundEngine,
    assets: GameAssets,
    enemiesForTargeting: ReadonlyArray<{ x: number; y: number; hp: number }>,
    allowCombat = true,
    onOverdriveTriggered?: () => void,
  ): void {
    this.animTime += dt;

    if (this.dead) {
      this.deathAnimTimer += dt;
      this.setAnimState('death');
      this.vy = Math.min(MAX_FALL_SPEED, this.vy + GRAVITY * dt);
      const res = tileMap.moveAndCollide(this.getRect(), 0, this.vy, dt, false);
      this.x = res.x + this.w * 0.5;
      this.y = res.y + this.h;
      this.vy = res.vy;
      return;
    }

    // Cooldowns & timers
    const tacticsCdr = 1 + this.scrolls.tactics * 0.08 * this.scrollMasteryMult;
    const cdr =
      this.cooldownRecovery * tacticsCdr * (this.hasRelic('twin_echo') ? 1.3 : 1);
    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    if (this.hurtTimer > 0) this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    if (this.flashTimer > 0) this.flashTimer = Math.max(0, this.flashTimer - dt);
    if (this.dropThroughTimer > 0) this.dropThroughTimer = Math.max(0, this.dropThroughTimer - dt);
    if (this.rollCooldown > 0) this.rollCooldown = Math.max(0, this.rollCooldown - dt);
    if (this.airJumpAnimTimer > 0) this.airJumpAnimTimer = Math.max(0, this.airJumpAnimTimer - dt);
    if (this.skill1Cooldown > 0) this.skill1Cooldown = Math.max(0, this.skill1Cooldown - dt * cdr);
    if (this.skill2Cooldown > 0) this.skill2Cooldown = Math.max(0, this.skill2Cooldown - dt * cdr);
    if (this.skillAnimTimer > 0) this.skillAnimTimer = Math.max(0, this.skillAnimTimer - dt);
    if (this.parryTimer > 0) this.parryTimer = Math.max(0, this.parryTimer - dt);
    if (this.furyTimer > 0) this.furyTimer = Math.max(0, this.furyTimer - dt);
    if (this.mirrorWardCooldown > 0) {
      this.mirrorWardCooldown = Math.max(0, this.mirrorWardCooldown - dt);
    }
    if (this.comboResetTimer > 0) {
      this.comboResetTimer -= dt;
      if (this.comboResetTimer <= 0) this.comboStep = 0;
    }

    // Consecrated Banner totem tick
    if (this.bannerPos) {
      this.bannerPos.timer -= dt;
      if (this.isInsideConsecratedBanner()) {
        this.bannerPos.regenAccum += dt * 2.4;
        if (this.bannerPos.regenAccum >= 1) {
          this.bannerPos.regenAccum -= 1;
          this.heal(1);
        }
      }
      if (this.bannerPos.timer <= 0) this.bannerPos = null;
    }

    // Soul Overdrive active state & ghost trail
    if (this.overdriveTimer > 0) {
      this.overdriveTimer = Math.max(0, this.overdriveTimer - dt);
      this.surge = (this.overdriveTimer / 6.0) * 100;
      this.afterimageTimer -= dt;
      if (this.afterimageTimer <= 0 && this.rollTimer <= 0) {
        this.afterimageTimer = 0.08;
        const anim = assets.characters[this.id][this.animState];
        const frame = getAnimationFrame(anim, this.animTime, this.facing);
        particles.addAfterimage(frame, this.x, this.y, HERO_ANCHOR_X, HERO_ANCHOR_Y, 0.14);
      }
    } else if (allowCombat && input.wasPressed('overdrive') && this.surge >= 100) {
      this.surge = 100;
      this.overdriveTimer = 6.0;
      this.invulnTimer = Math.max(this.invulnTimer, 0.6);
      sound.playOverdrive();
      particles.spawnBurst(
        this.x,
        this.y - 16,
        24,
        ['#7ef5eb', '#ffe082', '#d6fffa'],
        80,
        220,
        20,
        3,
      );
      particles.addDamageNumber(this.x, this.y - 40, 'OVERDRIVE!', '#7ef5eb', true);
      if (onOverdriveTriggered) onOverdriveTriggered();
    }

    // Trailing rally HP bar
    if (this.rallyDelay > 0) {
      this.rallyDelay -= dt;
    } else if (this.rallyHp > this.hp) {
      this.rallyHp = Math.max(this.hp, this.rallyHp - RALLY_DECAY_RATE * dt);
    }

    // Heal Flask
    if (allowCombat && input.wasPressed('heal') && this.flaskCharges > 0 && this.hp < this.maxHp) {
      this.flaskCharges -= 1;
      let healRatio = 0.45 + this.scrolls.survival * 0.05;
      if (this.hasRelic('cursed_scythe')) healRatio *= 0.75;
      this.heal(Math.round(this.maxHp * healRatio));
      sound.playHeal();
      particles.spawnBurst(this.x, this.y - 14, 14, ['#67d487', '#9be675', '#fff6cc'], 30, 110, -40, 2);
      particles.addDamageNumber(this.x, this.y - 34, '+HEAL', '#67d487', false);
    }

    const scaleDecay = Math.min(1, dt * 16);
    this.visualScaleX += (1 - this.visualScaleX) * scaleDecay;
    this.visualScaleY += (1 - this.visualScaleY) * scaleDecay;

    const moveX = input.getMoveAxisX();
    const overdriveSpeedMult = this.overdriveTimer > 0 ? 1.25 : 1;
    const speedMult =
      this.moveSpeedMult *
      overdriveSpeedMult *
      (this.hasRelic('windstrider_boots') ? 1.18 : 1);
    const maxRunSpeed = this.def.moveSpeed * speedMult;
    const maxJumps = this.hasRelic('windstrider_boots') ? 3 : 2;

    // Roll initiation
    if (allowCombat && input.hasBufferedRoll() && this.rollCooldown <= 0 && this.rollTimer <= 0) {
      input.consumeRollBuffer();
      if (moveX !== 0) this.facing = moveX;
      this.rollTimer = this.def.rollDuration;
      this.rollCooldown = 0.42 / cdr;
      this.invulnTimer = Math.max(this.invulnTimer, this.def.rollDuration + 0.04);
      this.attackTimer = 0;
      this.activeAttack = null;
      this.whirlwindTimer = 0;
      this.vx = this.facing * this.def.rollSpeed;
      if (this.onGround) {
        this.vy = 0;
      } else if (this.vy < 35) {
        this.vy = 35;
      }
      this.visualScaleX = 1.22;
      this.visualScaleY = 0.80;
      sound.playRoll();
      particles.spawnDust(this.x, this.y, 6);
    }

    // Skill 1 & Skill 2
    if (allowCombat && this.rollTimer <= 0 && this.whirlwindTimer <= 0) {
      if (input.wasPressed('skill1') && this.skill1Cooldown <= 0) {
        this.executeSkill1(moveX, projectiles, particles, sound, enemiesForTargeting);
      } else if (input.wasPressed('skill2') && this.skill2Cooldown <= 0) {
        this.executeSkill2(projectiles, particles, sound);
      }
    }

    // Crimson Whirlwind active spinning attack
    if (this.whirlwindTimer > 0) {
      this.whirlwindTimer -= dt;
      this.whirlwindTick -= dt;
      this.vx = moveX * maxRunSpeed * 0.9;
      if (this.whirlwindTick <= 0) {
        this.whirlwindTick = 0.2;
        this.attackHitIds.clear();
        this.activeAttack = {
          hitbox: { x: this.x - 32, y: this.y - 34, w: 64, h: 34 },
          damage: this.getTotalDamage(0.85, 'skill'),
          knockbackX: 85,
          knockbackY: -35,
          forceCrit: false,
          piercesShield: true,
          applyStatus: 'bleed',
          alreadyHitIds: this.attackHitIds,
        };
        sound.playHeavySlash();
      }
    } else if (this.rollTimer > 0) {
      this.rollTimer -= dt;
      this.vx = this.facing * this.def.rollSpeed;
      this.afterimageTimer -= dt;
      if (this.afterimageTimer <= 0) {
        this.afterimageTimer = 0.045;
        const frame = getAnimationFrame(assets.characters[this.id].roll, this.animTime, this.facing);
        particles.addAfterimage(frame, this.x, this.y, HERO_ANCHOR_X, HERO_ANCHOR_Y, 0.16);
      }
    } else {
      // Normal Attack / Dive Slam
      if (allowCombat && input.hasBufferedAttack() && this.attackTimer <= 0) {
        input.consumeAttackBuffer();
        if (!this.onGround && input.isHeld('down')) {
          this.isDiving = true;
          this.vy = 415;
          this.vx = moveX * 60;
          sound.playHeavySlash();
        } else {
          this.startComboAttack(moveX, sound);
        }
      }

      if (this.attackTimer > 0) {
        const atkSpeedMult = this.overdriveTimer > 0 ? 1.32 : 1.0;
        this.attackTimer -= dt * atkSpeedMult;
        const step = this.def.combo[this.comboStep]!;
        const elapsed = this.attackTotal - this.attackTimer;
        if (elapsed >= step.activeStart && elapsed <= step.activeEnd) {
          if (step.rangedBolt && !this.rangedShotFired) {
            this.rangedShotFired = true;
            this.fireMalakorBolt(projectiles, sound, step.damageMult);
          }
          const reachX = step.rangeX;
          const reachY = step.rangeY;
          const isTemplarFinisher = this.id === 'templar' && this.comboStep === 2;
          this.activeAttack = {
            hitbox: {
              x: this.facing >= 0 ? this.x - 4 : this.x - reachX + 4,
              y: this.y - reachY - 2,
              w: reachX,
              h: reachY,
            },
            damage: this.getTotalDamage(step.damageMult, 'melee'),
            knockbackX: this.facing * step.knockbackX,
            knockbackY: step.knockbackY,
            forceCrit: Boolean(step.canCrit) || this.guaranteedNextCrit,
            piercesShield: this.comboStep === 2 || this.id === 'executioner' || this.id === 'necromancer',
            applyStatus: isTemplarFinisher ? 'vulnerable' : undefined,
            alreadyHitIds: this.attackHitIds,
          };
          if (isTemplarFinisher && !this.rangedShotFired) {
            this.rangedShotFired = true;
            this.heal(3);
            particles.spawnBurst(this.x + this.facing * 14, this.y - 14, 6, ['#ffe082', '#fff6cc'], 25, 80, -30, 2);
          }
        } else {
          this.activeAttack = null;
        }
        this.vx *= Math.pow(0.02, dt);
        if (this.attackTimer <= 0) {
          this.activeAttack = null;
          this.comboStep = (this.comboStep + 1) % 3;
          this.comboResetTimer = 0.55;
        }
      } else {
        const accel = this.onGround ? 1450 : 980;
        const targetVx = moveX * maxRunSpeed;
        if (moveX !== 0) {
          this.facing = moveX;
          this.vx += Math.sign(targetVx - this.vx) * Math.min(Math.abs(targetVx - this.vx), accel * dt);
        } else {
          const decel = this.onGround ? 1650 : 520;
          if (Math.abs(this.vx) <= decel * dt) this.vx = 0;
          else this.vx -= Math.sign(this.vx) * decel * dt;
        }
      }

      // Drop through one-way platform: Down (S) or Down + Jump
      if (
        this.onGround &&
        tileMap.isStandingOnPlatform(this.getRect()) &&
        (input.wasPressed('down') || (input.isHeld('down') && input.hasBufferedJump()))
      ) {
        if (input.hasBufferedJump()) input.consumeJumpBuffer();
        this.dropThroughTimer = DROP_THROUGH_TIME;
        this.onGround = false;
        this.coyoteTimer = 0;
        this.y += 4;
        this.vy = Math.max(this.vy, 65);
      } else if (input.hasBufferedJump()) {
        if (this.wallSlideDir !== 0 && !this.onGround) {
          input.consumeJumpBuffer();
          this.vy = -this.def.jumpForce * 0.94;
          this.vx = -this.wallSlideDir * (maxRunSpeed * 1.15);
          this.facing = -this.wallSlideDir;
          this.jumpsUsed = 1;
          this.visualScaleX = 0.84;
          this.visualScaleY = 1.22;
          sound.playJump();
          particles.spawnDust(this.x + this.wallSlideDir * 6, this.y - 14, 5);
        } else if (this.onGround || this.coyoteTimer > 0) {
          input.consumeJumpBuffer();
          this.vy = -this.def.jumpForce;
          this.onGround = false;
          this.coyoteTimer = 0;
          this.jumpsUsed = 1;
          this.visualScaleX = 0.84;
          this.visualScaleY = 1.22;
          sound.playJump();
          particles.spawnDust(this.x, this.y, 5);
        } else if (this.jumpsUsed < maxJumps) {
          input.consumeJumpBuffer();
          this.vy = -this.def.jumpForce * 0.9;
          this.jumpsUsed += 1;
          this.isDiving = false;
          this.airJumpAnimTimer = 0.27;
          this.animState = 'air_jump';
          this.animTime = 0;
          this.visualScaleX = 0.86;
          this.visualScaleY = 1.18;
          sound.playJump();
          particles.spawnBurst(
            this.x,
            this.y - 2,
            10,
            ['#d6fffa', '#7ef5eb', this.def.accentColor],
            45,
            115,
            -15,
            2,
          );
        }
      }
    }

    // Gravity & Wall Slide (gravity always applies, including mid-air roll/dash)
    this.vy = Math.min(MAX_FALL_SPEED, this.vy + GRAVITY * dt);
    if (this.rollTimer <= 0 && this.wallSlideDir !== 0 && this.vy > WALL_SLIDE_SPEED && moveX === this.wallSlideDir) {
      this.vy = WALL_SLIDE_SPEED;
    }

    // Tile Collision Step
    const res = tileMap.moveAndCollide(
      this.getRect(),
      this.vx,
      this.vy,
      dt,
      this.dropThroughTimer > 0,
    );

    const wasOnGround = this.onGround;
    this.x = res.x + this.w * 0.5;
    this.y = res.y + this.h;
    this.vx = res.vx;
    this.vy = res.vy;
    this.onGround = res.onGround;

    if (!this.onGround && (res.hitWallLeft || res.hitWallRight)) {
      const wallDir = res.hitWallRight ? 1 : -1;
      const aheadX = this.x + wallDir * (this.w * 0.5 + 3);
      const aheadTx = Math.floor(aheadX / TILE_SIZE);
      const footTy = Math.floor((this.y - 2) / TILE_SIZE);
      // Dead Cells style Auto Ledge-Mantle / Vault over 1-tile lips
      if (
        (moveX === wallDir || this.vy > -80) &&
        !this.isDiving &&
        tileMap.isSolid(aheadTx, footTy) &&
        !tileMap.isSolid(aheadTx, footTy - 1) &&
        !tileMap.isSolid(aheadTx, footTy - 2)
      ) {
        this.y = footTy * TILE_SIZE;
        this.x += wallDir * 6;
        this.vy = -45;
        this.wallSlideDir = 0;
        this.visualScaleX = 0.88;
        this.visualScaleY = 1.15;
        particles.spawnDust(this.x, this.y, 4);
      } else if (this.vy > 0) {
        this.wallSlideDir = wallDir;
        this.airJumpAnimTimer = 0;
      } else {
        this.wallSlideDir = 0;
      }
    } else {
      this.wallSlideDir = 0;
    }

    // Landing & Dive Slam shockwave
    if (this.onGround) {
      this.coyoteTimer = COYOTE_TIME;
      this.jumpsUsed = 0;
      this.airJumpAnimTimer = 0;
      if (!wasOnGround) {
        if (this.isDiving) {
          this.visualScaleX = 1.38;
          this.visualScaleY = 0.66;
          this.isDiving = false;
          const survSlamBonus = 1 + this.scrolls.survival * 0.12 * this.scrollMasteryMult;
          const slamRadius = this.hasRelic('iron_greaves') ? 54 : 38;
          const slamMult = (this.hasRelic('iron_greaves') ? 2.6 : 1.5) * survSlamBonus;
          this.attackHitIds.clear();
          this.activeAttack = {
            hitbox: { x: this.x - slamRadius, y: this.y - 28, w: slamRadius * 2, h: 32 },
            damage: this.getTotalDamage(slamMult, 'melee'),
            knockbackX: 120,
            knockbackY: -130,
            forceCrit: this.hasRelic('iron_greaves') || this.id === 'templar',
            piercesShield: true,
            alreadyHitIds: this.attackHitIds,
          };
          this.attackTimer = 0.12;
          this.attackTotal = 0.12;
          sound.playSlam();
          particles.spawnBurst(
            this.x,
            this.y - 2,
            16,
            ['#cad5ed', '#ff9636', '#ffe082'],
            70,
            195,
            160,
            3,
          );
        } else {
          this.visualScaleX = 1.24;
          this.visualScaleY = 0.78;
          particles.spawnDust(this.x, this.y, 4);
        }
      }
    } else if (this.coyoteTimer > 0) {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    this.updateAnimationState();
  }

  private startComboAttack(moveX: number, sound: SoundEngine): void {
    if (moveX !== 0) this.facing = moveX;
    const step = this.def.combo[this.comboStep]!;
    this.attackTotal = step.duration;
    this.attackTimer = step.duration;
    this.attackHitIds.clear();
    this.rangedShotFired = false;
    this.vx = this.facing * step.lungeSpeed;

    if (this.id === 'rogue') sound.playDagger();
    else if (this.id === 'executioner' || this.comboStep === 2) sound.playHeavySlash();
    else if (this.id === 'pyromancer') sound.playFireball();
    else sound.playSlash();
  }

  private fireMalakorBolt(projectiles: Projectile[], sound: SoundEngine, mult: number): void {
    sound.playFireball();
    projectiles.push({
      owner: 'player',
      kind: 'fireball',
      x: this.x + this.facing * 12,
      y: this.y - 16,
      vx: this.facing * 265,
      vy: 0,
      radius: this.comboStep === 2 ? 7 : 5,
      damage: this.getTotalDamage(mult * 0.95, 'skill'),
      life: 0.72,
      maxLife: 0.72,
      piercing: this.comboStep === 2,
      piercesShield: this.comboStep === 2,
      applyStatus: 'burn',
      color: '#ff9636',
      coreColor: '#fff8d6',
      hitIds: new Set<number>(),
    });
  }

  private executeSkill1(
    moveX: number,
    projectiles: Projectile[],
    particles: ParticleSystem,
    sound: SoundEngine,
    enemies: ReadonlyArray<{ x: number; y: number; hp: number }>,
  ): void {
    if (moveX !== 0) this.facing = moveX;
    this.skill1Cooldown = this.def.skill1.cooldown;
    this.skillAnimWhich = 1;
    this.skillAnimTimer = 0.28;

    if (this.id === 'knight') {
      this.parryTimer = 0.7;
      sound.playBlock();
      particles.spawnBurst(this.x + this.facing * 8, this.y - 14, 6, ['#ffe082', '#cad5ed'], 20, 60, 0, 2);
    } else if (this.id === 'rogue') {
      let best: { x: number; y: number; hp: number } | null = null;
      let bestDist = 145;
      for (const e of enemies) {
        if (e.hp <= 0) continue;
        const dx = e.x - this.x;
        const dy = Math.abs(e.y - this.y);
        if (dx * this.facing > -12 && dy < 48) {
          const d = Math.hypot(dx, dy);
          if (d < bestDist) {
            bestDist = d;
            best = e;
          }
        }
      }
      particles.spawnBurst(this.x, this.y - 14, 10, ['#7ef5eb', '#3bc2cf'], 35, 110, 0, 2);
      if (best) {
        this.x = best.x + this.facing * 20;
        this.y = best.y;
        this.facing = -this.facing;
      } else {
        this.vx = this.facing * 360;
      }
      this.invulnTimer = Math.max(this.invulnTimer, 0.3);
      this.guaranteedNextCrit = true;
      sound.playRoll();
      particles.spawnBurst(this.x, this.y - 14, 10, ['#7ef5eb', '#d6fffa'], 45, 120, 0, 2);
    } else if (this.id === 'pyromancer') {
      sound.playFireball();
      for (const dist of [42, 78]) {
        projectiles.push({
          owner: 'player',
          kind: 'cinder_pillar',
          x: this.x + this.facing * dist,
          y: this.y - 24,
          vx: 0,
          vy: 0,
          radius: 16,
          damage: this.getTotalDamage(1.65, 'skill'),
          life: 0.45,
          maxLife: 0.45,
          piercing: true,
          piercesShield: true,
          applyStatus: 'burn',
          color: '#ff9636',
          coreColor: '#fff8d6',
          hitIds: new Set<number>(),
        });
      }
    } else if (this.id === 'templar') {
      // Heavensfall: leap upward & slam forward diagonally
      this.vy = -215;
      this.vx = this.facing * 185;
      this.isDiving = true;
      this.invulnTimer = Math.max(this.invulnTimer, 0.25);
      sound.playJump();
      particles.spawnBurst(this.x, this.y - 10, 12, ['#ffe082', '#fff6cc'], 45, 135, 30, 2);
    } else if (this.id === 'necromancer') {
      // Reap & Harvest: wide life-stealing scythe sweep
      sound.playHeavySlash();
      this.attackHitIds.clear();
      this.activeAttack = {
        hitbox: {
          x: this.facing >= 0 ? this.x - 10 : this.x - 52,
          y: this.y - 36,
          w: 62,
          h: 38,
        },
        damage: this.getTotalDamage(1.7, 'skill'),
        knockbackX: this.facing * 140,
        knockbackY: -60,
        forceCrit: false,
        piercesShield: true,
        lifeDrain: 6,
        alreadyHitIds: this.attackHitIds,
      };
      this.attackTimer = 0.22;
      this.attackTotal = 0.22;
      particles.spawnBurst(this.x + this.facing * 18, this.y - 16, 12, ['#67d487', '#7ef5eb'], 45, 130, 0, 2);
    } else {
      // Executioner Chain Hook
      sound.playHeavySlash();
      projectiles.push({
        owner: 'player',
        kind: 'chain_hook',
        x: this.x + this.facing * 12,
        y: this.y - 16,
        vx: this.facing * 360,
        vy: 0,
        radius: 9,
        damage: this.getTotalDamage(0.95, 'skill'),
        life: 0.42,
        maxLife: 0.42,
        piercing: false,
        piercesShield: true,
        applyStatus: 'stun',
        color: '#8b8fa8',
        coreColor: '#f2f6ff',
        hitIds: new Set<number>(),
        originX: this.x,
        originY: this.y - 16,
        pullTarget: true,
      });
    }
  }

  private executeSkill2(
    projectiles: Projectile[],
    particles: ParticleSystem,
    sound: SoundEngine,
  ): void {
    this.skill2Cooldown = this.def.skill2.cooldown;
    this.skillAnimWhich = 2;
    this.skillAnimTimer = 0.34;

    if (this.id === 'knight') {
      sound.playCrit();
      projectiles.push({
        owner: 'player',
        kind: 'judgement_wave',
        x: this.x + this.facing * 14,
        y: this.y - 16,
        vx: this.facing * 240,
        vy: 0,
        radius: 14,
        damage: this.getTotalDamage(2.1, 'skill'),
        life: 0.85,
        maxLife: 0.85,
        piercing: true,
        piercesShield: true,
        applyStatus: 'vulnerable',
        color: '#ffe082',
        coreColor: '#fff6cc',
        hitIds: new Set<number>(),
      });
    } else if (this.id === 'rogue') {
      sound.playDagger();
      const angles = [-0.32, -0.16, 0, 0.16, 0.32];
      for (const a of angles) {
        const baseAng = this.facing >= 0 ? a : Math.PI - a;
        projectiles.push({
          owner: 'player',
          kind: 'dagger',
          x: this.x + this.facing * 10,
          y: this.y - 16,
          vx: Math.cos(baseAng) * 320,
          vy: Math.sin(baseAng) * 320,
          radius: 5,
          damage: this.getTotalDamage(0.85, 'skill'),
          life: 0.55,
          maxLife: 0.55,
          piercing: false,
          applyStatus: 'poison',
          color: '#9be675',
          coreColor: '#f2f6ff',
          hitIds: new Set<number>(),
        });
      }
    } else if (this.id === 'pyromancer') {
      sound.playSlam();
      this.attackHitIds.clear();
      this.activeAttack = {
        hitbox: { x: this.x - 56, y: this.y - 46, w: 112, h: 52 },
        damage: this.getTotalDamage(2.35, 'skill'),
        knockbackX: 210,
        knockbackY: -120,
        forceCrit: true,
        piercesShield: true,
        applyStatus: 'burn',
        alreadyHitIds: this.attackHitIds,
      };
      this.attackTimer = 0.14;
      this.attackTotal = 0.14;
      particles.spawnBurst(this.x, this.y - 14, 24, ['#ff9636', '#ffd466', '#ff6b7a'], 80, 220, 20, 3);
    } else if (this.id === 'templar') {
      // Consecrated Banner planted at feet
      this.bannerPos = { x: this.x, y: this.y, timer: 6.0, regenAccum: 0 };
      sound.playBannerPlant();
      particles.spawnBurst(this.x, this.y - 16, 18, ['#ffe082', '#fff6cc'], 45, 145, -20, 2);
      particles.addDamageNumber(this.x, this.y - 38, 'BANNER!', '#ffe082', true);
    } else if (this.id === 'necromancer') {
      // Bone Legion: 3 homing emerald Soul Skulls
      sound.playSoulPickup();
      for (let i = -1; i <= 1; i++) {
        projectiles.push({
          owner: 'player',
          kind: 'soul_skull',
          x: this.x + this.facing * 8,
          y: this.y - 20 + i * 7,
          vx: this.facing * 145,
          vy: i * 48,
          radius: 5,
          damage: this.getTotalDamage(1.0, 'skill'),
          life: 2.6,
          maxLife: 2.6,
          piercing: false,
          homingStrength: 310,
          color: '#67d487',
          coreColor: '#d6fffa',
          hitIds: new Set<number>(),
        });
      }
    } else {
      // Crimson Whirlwind
      this.whirlwindTimer = 0.95;
      this.whirlwindTick = 0;
      this.invulnTimer = Math.max(this.invulnTimer, 0.35);
      sound.playHeavySlash();
    }
  }

  private updateAnimationState(): void {
    if (this.dead) {
      this.setAnimState('death');
    } else if (this.hurtTimer > 0) {
      this.setAnimState('hurt');
    } else if (this.rollTimer > 0) {
      this.airJumpAnimTimer = 0;
      this.setAnimState('roll');
    } else if (this.isDiving) {
      this.airJumpAnimTimer = 0;
      this.setAnimState('dive_slam');
    } else if (this.whirlwindTimer > 0) {
      this.setAnimState('skill2');
    } else if (this.skillAnimTimer > 0) {
      this.setAnimState(this.skillAnimWhich === 1 ? 'skill1' : 'skill2');
    } else if (this.attackTimer > 0) {
      const states: CharacterAnimState[] = ['attack1', 'attack2', 'attack3'];
      this.setAnimState(states[this.comboStep]!);
    } else if (this.wallSlideDir !== 0 && !this.onGround) {
      this.setAnimState('wall_slide');
    } else if (!this.onGround) {
      if (this.airJumpAnimTimer > 0) {
        this.setAnimState('air_jump');
      } else {
        this.setAnimState(this.vy < 0 ? 'jump' : 'fall');
      }
    } else if (Math.abs(this.vx) > 12) {
      this.setAnimState('run');
    } else {
      this.setAnimState('idle');
    }
  }

  private setAnimState(next: CharacterAnimState): void {
    if (this.animState !== next) {
      this.animState = next;
      this.animTime = 0;
    }
  }

  render(ctx: CanvasRenderingContext2D, assets: GameAssets, camPxX: number, camPxY: number): void {
    const sx = Math.round(this.x * PIXEL_SCALE) - camPxX;
    const sy = Math.round(this.y * PIXEL_SCALE) - camPxY;

    // Render Seraphina's planted Consecrated Banner behind hero
    if (this.bannerPos && this.bannerPos.timer > 0) {
      const bx = Math.round(this.bannerPos.x * PIXEL_SCALE) - camPxX;
      const by = Math.round(this.bannerPos.y * PIXEL_SCALE) - camPxY;
      const bannerImg = assets.tileset.consecratedBanner;
      ctx.save();
      ctx.strokeStyle = '#ffe082';
      ctx.globalAlpha = 0.25 + 0.1 * Math.sin(this.animTime * 6);
      ctx.beginPath();
      ctx.arc(bx, by - 12, Math.round(72 * PIXEL_SCALE), Math.PI, 0);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.drawImage(bannerImg, bx - Math.floor(bannerImg.width * 0.5), by - bannerImg.height);
      ctx.restore();
    }

    if (this.invulnTimer > 0 && this.rollTimer <= 0 && Math.floor(this.invulnTimer * 24) % 2 === 1) {
      ctx.globalAlpha = 0.55;
    }
    const anim = assets.characters[this.id][this.animState];
    const frame = getAnimationFrame(anim, this.animTime, this.facing, this.flashTimer > 0);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(this.visualScaleX, this.visualScaleY);
    ctx.drawImage(frame, -HERO_ANCHOR_X, -HERO_ANCHOR_Y);
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.globalAlpha = 1;

    if (this.overdriveTimer > 0) {
      ctx.save();
      ctx.strokeStyle = '#7ef5eb';
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.arc(sx, sy - 22, 25, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (this.parryTimer > 0) {
      ctx.save();
      ctx.strokeStyle = '#ffe082';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx + this.facing * 9, sy - 21, 21, -1.2, 1.2);
      ctx.stroke();
      ctx.restore();
    }
  }
}
