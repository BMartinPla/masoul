import { TILE_SIZE, VIEW_H, VIEW_W } from '../core/constants.ts';
import type { BiomeId, RunStats } from '../core/types.ts';
import { BIOMES } from '../data/biomes.ts';
import { RELICS } from '../data/relics.ts';
import { getGameAssets } from '../art/assets.ts';
import { HERO_ANCHOR_X, HERO_ANCHOR_Y } from '../art/characterSprites.ts';
import { drawPixelText, measurePixelText } from '../art/pixelFont.ts';
import { locBiome, locEnemy, locShortSkill, tr } from '../i18n/translations.ts';
import type { Enemy } from '../entities/enemy.ts';
import type { WorldStation } from '../entities/pickup.ts';
import type { Player } from '../entities/player.ts';
import type { TileMap } from '../world/tilemap.ts';

const SHORT_SKILL_LABELS: Record<string, string> = {
  'Aegis Parry': 'PARRY',
  'Judgement Cleave': 'CLEAVE',
  'Shadow Step': 'STEP',
  'Venom Fan': 'VENOM',
  'Cinder Pillar': 'PILLAR',
  'Soul Nova': 'NOVA',
  Heavensfall: 'FALL',
  'Consecrated Banner': 'BANNER',
  'Chain Hook': 'HOOK',
  'Crimson Whirlwind': 'WHIRL',
  'Reap & Harvest': 'REAP',
  'Bone Legion': 'LEGION',
};

function shortSkillLabel(name: string): string {
  const en = SHORT_SKILL_LABELS[name] ?? name.slice(0, 6).toUpperCase();
  return locShortSkill(name, en);
}

function drawGothicFrame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  borderColor: string,
  rivetColor = '#c99746',
  bgAlpha = 0.88,
): void {
  ctx.fillStyle = `rgba(11, 10, 18, ${bgAlpha})`;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = 'rgba(255, 243, 214, 0.06)';
  ctx.fillRect(x + 1, y + 1, w - 2, 1);
  // 2x2 gilded corner rivets
  ctx.fillStyle = rivetColor;
  ctx.fillRect(x, y, 2, 2);
  ctx.fillRect(x + w - 2, y, 2, 2);
  ctx.fillRect(x, y + h - 2, 2, 2);
  ctx.fillRect(x + w - 2, y + h - 2, 2, 2);
}

export class HudRenderer {
  render(
    ctx: CanvasRenderingContext2D,
    player: Player,
    runStats: RunStats,
    bankedSouls: number,
    biomeId: BiomeId,
    tileMap: TileMap,
    stations: readonly WorldStation[],
    activeBoss: Enemy | null,
    bannerText: string | null,
    bannerAlpha: number,
    nearbyPrompt: string | null,
    isMuted: boolean,
    killstreak = 0,
    canWarp = false,
    prestigeLevel = 0,
  ): void {
    // 0. Low-HP Heartbeat Crimson Edge Vignette (<= 30% HP)
    if (player.hp > 0 && player.hp / player.maxHp <= 0.3) {
      const pulse = 0.22 + 0.14 * Math.sin(Date.now() * 0.008);
      ctx.save();
      const grad = ctx.createRadialGradient(
        VIEW_W * 0.5,
        VIEW_H * 0.5,
        VIEW_H * 0.28,
        VIEW_W * 0.5,
        VIEW_H * 0.5,
        VIEW_W * 0.62,
      );
      grad.addColorStop(0, 'rgba(180, 20, 42, 0)');
      grad.addColorStop(1, `rgba(180, 20, 42, ${pulse.toFixed(3)})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.restore();
    }

    // 1. Top-left Hero Vitality & Resources Panel (Hi-Bit 640x360 proportions)
    drawGothicFrame(
      ctx,
      8,
      8,
      196,
      46,
      player.overdriveTimer > 0 ? '#7ef5eb' : '#5a5475',
      player.overdriveTimer > 0 ? '#7ef5eb' : '#c99746',
      0.88,
    );

    // Portrait frame featuring live Hi-Bit Hero pixel bust (28x28)
    ctx.fillStyle = '#1b172c';
    ctx.fillRect(12, 12, 28, 28);
    ctx.strokeStyle = player.def.accentColor;
    ctx.strokeRect(12.5, 12.5, 27, 27);
    const heroFrame = getGameAssets().characters[player.id].idle.frames[0];
    if (heroFrame) {
      ctx.drawImage(
        heroFrame,
        HERO_ANCHOR_X - 13,
        HERO_ANCHOR_Y - 46,
        26,
        26,
        13,
        13,
        26,
        26,
      );
    }

    // HP Bar + trailing rally bar + shield bar
    const barX = 46;
    const barY = 12;
    const barW = 150;
    const barH = 11;
    ctx.fillStyle = '#07060b';
    ctx.fillRect(barX, barY, barW, barH);
    const rallyW = Math.round((Math.max(0, player.rallyHp) / player.maxHp) * (barW - 2));
    ctx.fillStyle = '#ffe082';
    ctx.fillRect(barX + 1, barY + 1, rallyW, barH - 2);
    const hpW = Math.round((Math.max(0, player.hp) / player.maxHp) * (barW - 2));
    ctx.fillStyle = player.hp < player.maxHp * 0.28 ? '#ff4d63' : '#c92a42';
    ctx.fillRect(barX + 1, barY + 1, hpW, barH - 2);
    if (hpW > 2) {
      ctx.fillStyle = 'rgba(255, 243, 214, 0.22)';
      ctx.fillRect(barX + 1, barY + 1, hpW, 2);
    }
    ctx.fillStyle = 'rgba(11, 10, 18, 0.55)';
    for (const frac of [0.25, 0.5, 0.75]) {
      ctx.fillRect(barX + Math.round(barW * frac), barY + 1, 1, barH - 2);
    }
    if (player.shieldHp > 0) {
      const shW = Math.min(barW - 2, Math.round((player.shieldHp / player.maxHp) * (barW - 2)));
      ctx.fillStyle = '#7ef5eb';
      ctx.fillRect(barX + 1, barY + barH - 3, shW, 2);
    }
    drawPixelText(ctx, `${Math.ceil(player.hp)}/${player.maxHp}`, barX + barW * 0.5, barY + 3, {
      color: '#fff6e8',
      align: 'center',
      scale: 1,
    });

    // Flask pips + Gold + Souls
    for (let i = 0; i < player.maxFlaskCharges; i++) {
      const fx = 46 + i * 11;
      ctx.fillStyle = i < player.flaskCharges ? '#67d487' : '#262336';
      ctx.fillRect(fx, 28, 7, 9);
      ctx.fillStyle = i < player.flaskCharges ? '#d6fffa' : '#434059';
      ctx.fillRect(fx + 2, 26, 3, 2);
    }
    drawPixelText(ctx, '[R]', 48 + player.maxFlaskCharges * 11, 29, { color: '#9b95b5' });

    if (biomeId !== 'sanctuary') {
      drawPixelText(ctx, `${tr('S', 'A')}:${runStats.runSouls}`, 144, 29, { color: '#7ef5eb' });
      drawPixelText(ctx, `${tr('G', 'O')}:${runStats.gold}`, 144, 40, { color: '#ffe082' });
    } else {
      drawPixelText(ctx, `${tr('SOULS', 'ALMAS')}:${bankedSouls}`, 198, 35, { color: '#7ef5eb', align: 'right' });
    }
    drawPixelText(ctx, player.def.name.toUpperCase(), 12, 44, { color: '#ede6d8' });

    // Trinity Scroll counters (Brutality / Tactics / Survival) when in run
    if (biomeId !== 'sanctuary') {
      ctx.fillStyle = 'rgba(11, 10, 18, 0.8)';
      ctx.fillRect(8, 58, 100, 12);
      ctx.strokeStyle = '#3f3a59';
      ctx.strokeRect(8.5, 58.5, 99, 11);
      drawPixelText(ctx, `B:${player.scrolls.brutality}`, 13, 62, { color: '#ff6b7a' });
      drawPixelText(ctx, `T:${player.scrolls.tactics}`, 45, 62, { color: '#ba82ed' });
      drawPixelText(ctx, `V:${player.scrolls.survival}`, 77, 62, { color: '#67d487' });
    }

    // Active Relics row beneath scrolls (bespoke 24x24 pixel-art Relic Icons)
    const relicRowY = biomeId !== 'sanctuary' ? 74 : 58;
    const relicIcons = getGameAssets().relicIcons;
    for (let i = 0; i < Math.min(8, player.relics.length); i++) {
      const id = player.relics[i]!;
      const relic = RELICS[id];
      const rx = 9 + i * 17;
      ctx.fillStyle = '#0e0c18';
      ctx.fillRect(rx, relicRowY, 15, 15);
      ctx.strokeStyle = relic.iconColor;
      ctx.strokeRect(rx + 0.5, relicRowY + 0.5, 14, 14);
      const icon = relicIcons[id];
      if (icon) {
        ctx.drawImage(icon, rx + 1, relicRowY + 1, 13, 13);
      }
    }

    // 2. Top-Right Biome Title & Fog-of-War Minimap
    const biome = locBiome(BIOMES[biomeId]);
    drawPixelText(ctx, biome.name, VIEW_W - 10, 8, {
      color: '#f5ca71',
      align: 'right',
      variant: 'pixel',
    });
    if (runStats.curseTier > 0) {
      drawPixelText(ctx, `${tr('CURSE', 'MALDICION')} ${runStats.curseTier}`, VIEW_W - 10, 18, {
        color: '#ff6b7a',
        align: 'right',
      });
    } else if (prestigeLevel > 0) {
      drawPixelText(ctx, `${tr('PRESTIGE', 'PRESTIGIO')} ${prestigeLevel}`, VIEW_W - 10, 18, {
        color: '#ffe082',
        align: 'right',
      });
    }

    if (biomeId !== 'sanctuary') {
      this.renderMinimap(ctx, tileMap, player, stations);
      if (killstreak >= 3) {
        drawPixelText(ctx, `${killstreak}X ${tr('STREAK', 'RACHA')}`, VIEW_W - 10, 74, {
          color: killstreak >= 10 ? '#ffe082' : '#ff6b7a',
          align: 'right',
        });
      }
      if (canWarp) {
        drawPixelText(ctx, `[TAB] ${tr('WAYSTONE', 'PIEDRA')}`, VIEW_W - 10, killstreak >= 3 ? 84 : 74, {
          color: '#7ef5eb',
          align: 'right',
        });
      }
    }

    if (isMuted) {
      drawPixelText(ctx, `${tr('MUTED', 'SILENCIO')} [M]`, VIEW_W - 10, VIEW_H - 14, {
        color: '#9b95b5',
        align: 'right',
      });
    }

    // 3. Bottom-Left Skill, Roll & Soul Surge Icons
    const skillIcons = getGameAssets().skillIcons;
    this.renderSkillSlot(
      ctx,
      10,
      VIEW_H - 40,
      'Q',
      shortSkillLabel(player.def.skill1.name),
      player.skill1Cooldown,
      player.def.skill1.cooldown,
      player.def.skill1.iconColor,
      skillIcons[`${player.id}_1`],
    );
    this.renderSkillSlot(
      ctx,
      56,
      VIEW_H - 40,
      'E',
      shortSkillLabel(player.def.skill2.name),
      player.skill2Cooldown,
      player.def.skill2.cooldown,
      player.def.skill2.iconColor,
      skillIcons[`${player.id}_2`],
    );
    this.renderSkillSlot(
      ctx,
      102,
      VIEW_H - 40,
      'SHF',
      tr('ROLL', 'RODAR'),
      player.rollCooldown,
      0.42,
      '#cad5ed',
      skillIcons.roll,
    );
    this.renderSurgeGauge(ctx, 148, VIEW_H - 40, player);

    // 4. Boss Health Bar (Bottom Center)
    if (activeBoss && activeBoss.hp > 0) {
      const bw = 300;
      const bx = Math.round((VIEW_W - bw) * 0.5);
      const by = VIEW_H - 28;
      const bossBorder = activeBoss.phase === 2 ? '#ff6b7a' : '#c99746';
      drawGothicFrame(ctx, bx - 5, by - 18, bw + 10, 34, bossBorder, bossBorder, 0.9);

      const bossName = locEnemy(activeBoss.def).name.toUpperCase();
      const title = `${bossName}${activeBoss.phase === 2 ? ` [${tr('PHASE II', 'FASE II')}]` : ''}`;
      drawPixelText(ctx, title, VIEW_W * 0.5, by - 15, {
        color: activeBoss.phase === 2 ? '#ff6b7a' : '#ffe082',
        align: 'center',
        variant: 'gothic',
      });
      ctx.fillStyle = '#1b1019';
      ctx.fillRect(bx, by, bw, 10);
      const trail = Math.max(0, Math.round((activeBoss.displayHp / activeBoss.maxHp) * bw));
      if (trail > 0) {
        ctx.fillStyle = '#fff3d6';
        ctx.fillRect(bx, by, trail, 10);
      }
      const fill = Math.max(0, Math.round((activeBoss.hp / activeBoss.maxHp) * bw));
      ctx.fillStyle = activeBoss.phase === 2 ? '#ff4d63' : '#b8253d';
      ctx.fillRect(bx, by, fill, 10);
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(bx, by, fill, 2);
      ctx.fillStyle = 'rgba(11, 10, 18, 0.55)';
      ctx.fillRect(bx + Math.round(bw * 0.25), by, 1, 10);
      ctx.fillRect(bx + Math.round(bw * 0.75), by, 1, 10);
      // Central 50% Phase II golden diamond notch
      const midX = bx + Math.round(bw * 0.5);
      ctx.fillStyle = '#ffe082';
      ctx.fillRect(midX - 1, by - 1, 3, 12);
    }

    // 5. Nearby Interaction Prompt (clear of Skill/Surge & Boss HUD)
    if (nearbyPrompt) {
      const pw = Math.max(150, measurePixelText(nearbyPrompt, 1) + 20);
      const px = activeBoss
        ? Math.round((VIEW_W - pw) * 0.5)
        : Math.max(220, VIEW_W - pw - 10);
      const py = activeBoss ? VIEW_H - 64 : VIEW_H - 28;
      ctx.fillStyle = 'rgba(11, 10, 18, 0.88)';
      ctx.fillRect(px, py, pw, 15);
      ctx.strokeStyle = '#c99746';
      ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, 14);
      drawPixelText(ctx, nearbyPrompt, px + pw * 0.5, py + 5, {
        color: '#ffe082',
        align: 'center',
        scale: 1,
      });
    }

    // 6. Top-Center Biome / Relic / Achievement Notification Banner (below Scroll & Minimap)
    if (bannerText && bannerAlpha > 0) {
      const textW = measurePixelText(bannerText, 1, 'gothic');
      const bw = Math.min(VIEW_W - 32, Math.max(280, textW + 32));
      const bx = Math.round(VIEW_W * 0.5 - bw * 0.5);
      ctx.save();
      ctx.globalAlpha = Math.min(1, bannerAlpha);
      drawGothicFrame(ctx, bx, 84, bw, 24, '#c99746', '#ffe082', 0.9);
      drawPixelText(ctx, bannerText, VIEW_W * 0.5, 92, {
        color: '#fff3d6',
        align: 'center',
        variant: 'gothic',
      });
      ctx.restore();
    }
  }

  private renderSkillSlot(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    keyLabel: string,
    shortName: string,
    cd: number,
    maxCd: number,
    color: string,
    icon?: HTMLCanvasElement,
  ): void {
    const ready = cd <= 0.01;
    const slotW = 40;
    const slotH = 32;
    drawGothicFrame(ctx, x, y, slotW, slotH, ready ? color : '#47425e', ready ? color : '#5a5475', 0.88);

    // Subtle backing box + crisp 14x14 pixel-art skill icon
    ctx.fillStyle = ready ? 'rgba(27, 23, 44, 0.9)' : 'rgba(15, 13, 24, 0.7)';
    ctx.fillRect(x + 22, y + 3, 15, 15);
    if (icon) {
      ctx.save();
      if (!ready) ctx.globalAlpha = 0.45;
      ctx.drawImage(icon, x + 23, y + 4);
      ctx.restore();
    } else {
      ctx.fillStyle = ready ? color : '#312c4a';
      ctx.fillRect(x + 25, y + 5, 9, 9);
    }

    if (!ready) {
      const ratio = Math.min(1, cd / Math.max(0.1, maxCd));
      ctx.fillStyle = 'rgba(7, 6, 11, 0.72)';
      ctx.fillRect(x + 1, y + 1, slotW - 2, Math.round((slotH - 2) * ratio));
      drawPixelText(ctx, cd.toFixed(1), x + slotW * 0.5, y + 12, { color: '#fff3d6', align: 'center' });
    }

    drawPixelText(ctx, keyLabel, x + 4, y + 6, { color: '#ffe082' });
    drawPixelText(ctx, shortName, x + slotW * 0.5, y + 22, {
      color: ready ? '#ede6d8' : '#7a7494',
      align: 'center',
    });
  }

  private renderSurgeGauge(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    player: Player,
  ): void {
    const w = 62;
    const h = 32;
    const ready = player.surge >= 100 || player.overdriveTimer > 0;
    const surgeColor = player.overdriveTimer > 0 ? '#ffe082' : ready ? '#7ef5eb' : '#47425e';
    drawGothicFrame(ctx, x, y, w, h, surgeColor, ready ? '#7ef5eb' : '#5a5475', 0.88);

    // Fill bar
    ctx.fillStyle = '#121c24';
    ctx.fillRect(x + 4, y + 15, w - 8, 6);
    const fillW = Math.round(((Math.max(0, Math.min(100, player.surge)) / 100) * (w - 8)));
    ctx.fillStyle = player.overdriveTimer > 0 ? '#ffe082' : ready ? '#7ef5eb' : '#218196';
    ctx.fillRect(x + 4, y + 15, fillW, 6);

    drawPixelText(ctx, 'V', x + 4, y + 5, { color: '#7ef5eb' });
    drawPixelText(
      ctx,
      player.overdriveTimer > 0 ? tr('DRIVE', 'ACTIVO') : ready ? tr('READY', 'LISTO') : `${Math.floor(player.surge)}%`,
      x + w - 4,
      y + 5,
      { color: ready ? '#ffe082' : '#9b95b5', align: 'right' },
    );
    drawPixelText(ctx, tr('SURGE', 'ALMA'), x + w * 0.5, y + 24, {
      color: ready ? '#d6fffa' : '#7a7494',
      align: 'center',
    });
  }

  private renderMinimap(
    ctx: CanvasRenderingContext2D,
    tileMap: TileMap,
    player: Player,
    stations: readonly WorldStation[],
  ): void {
    const cell = 2;
    const viewSpanX = 54;
    const viewSpanY = Math.min(tileMap.height, 22);
    const mw = viewSpanX * cell;
    const mh = viewSpanY * cell;
    const mx = VIEW_W - mw - 10;
    const my = 26;

    ctx.fillStyle = 'rgba(7, 6, 11, 0.82)';
    ctx.fillRect(mx - 1, my - 1, mw + 2, mh + 2);
    ctx.strokeStyle = '#4f4969';
    ctx.strokeRect(mx - 0.5, my - 0.5, mw + 1, mh + 1);

    const ptx = Math.floor(player.x / TILE_SIZE);
    const startTx = Math.max(0, Math.min(tileMap.width - viewSpanX, ptx - Math.floor(viewSpanX * 0.5)));

    for (let y = 0; y < viewSpanY; y++) {
      for (let x = 0; x < Math.min(viewSpanX, tileMap.width); x++) {
        const tx = startTx + x;
        const idx = y * tileMap.width + tx;
        if (!tileMap.explored[idx]) continue;
        const t = tileMap.tiles[idx]!;
        if (t === 1) ctx.fillStyle = '#5a5475';
        else if (t === 2) ctx.fillStyle = '#8a5534';
        else if (t === 3) ctx.fillStyle = '#d1364e';
        else ctx.fillStyle = '#181526';
        ctx.fillRect(mx + x * cell, my + y * cell, cell, cell);
      }
    }

    // Station markers
    for (const s of stations) {
      const stx = Math.floor(s.x / TILE_SIZE) - startTx;
      const sty = Math.floor((s.y - 8) / TILE_SIZE);
      if (stx < 0 || stx >= viewSpanX || sty < 0 || sty >= viewSpanY) continue;
      if (!tileMap.explored[sty * tileMap.width + (startTx + stx)]) continue;
      if (s.kind === 'exit_portal' || s.kind === 'waystone') ctx.fillStyle = '#7ef5eb';
      else if (s.kind === 'relic_shrine' || s.kind === 'chest' || s.kind === 'trinity_scroll') {
        ctx.fillStyle = '#ffe082';
      } else if (s.kind === 'merchant' || s.kind === 'blood_shrine') ctx.fillStyle = '#ff6b7a';
      else continue;
      ctx.fillRect(mx + stx * cell, my + sty * cell, 3, 3);
    }

    // Player marker
    const px = Math.max(0, Math.min(viewSpanX - 1, ptx - startTx));
    const py = Math.max(0, Math.min(viewSpanY - 1, Math.floor((player.y - 12) / TILE_SIZE)));
    ctx.fillStyle = '#fff8d6';
    ctx.fillRect(mx + px * cell, my + py * cell, 3, 3);
  }
}
