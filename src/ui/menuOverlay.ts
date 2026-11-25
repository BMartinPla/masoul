import type {
  CharacterAnimState,
  CharacterId,
  EnemyAnimState,
  EnemyId,
  GameScreen,
  Language,
  MetaUpgradeId,
  RelicId,
  RunStats,
  ScrollStat,
} from '../core/types.ts';
import { ACHIEVEMENT_LIST } from '../data/achievements.ts';
import { CHARACTER_LIST, CHARACTERS } from '../data/characters.ts';
import { ENEMY_LIST } from '../data/enemies.ts';
import { META_UPGRADE_LIST } from '../data/metaUpgrades.ts';
import { getActiveSynergies, RELIC_LIST, RELICS } from '../data/relics.ts';
import { getGameAssets } from '../art/assets.ts';
import { getAnimationFrame, type SpriteAnimation } from '../art/spriteAtlas.ts';
import {
  locAchievement,
  locEnemy,
  locHero,
  locRarity,
  locRelic,
  locSynergy,
  locUpgrade,
  tr,
} from '../i18n/translations.ts';
import {
  computeDeathSoulRetention,
  countMaxedUpgrades,
  getUpgradeCost,
  type MetaProgressionManager,
} from '../systems/metaprogression.ts';

export interface OverlayCallbacks {
  onStartSanctuary: () => void;
  onStartRun: () => void;
  onResume: () => void;
  onOpenScreen: (screen: GameScreen) => void;
  onSelectRelic: (id: RelicId) => void;
  onSelectScroll: (stat: ScrollStat) => void;
  onBuyMerchant: (choice: 'heal' | 'weapon' | 'relic') => void;
  onBuyUpgrade: (id: MetaUpgradeId) => void;
  onPrestige: () => void;
  onSelectLanguage: (lang: Language) => void;
  onSelectOrUnlockHero: (id: CharacterId) => void;
  onReturnSanctuary: () => void;
  onQuickRetry: () => void;
  onVolumeChange: (kind: 'sfx' | 'music', value: number) => void;
}

interface LivePreviewEntry {
  canvas: HTMLCanvasElement;
  anim: SpriteAnimation;
  scale: number;
}

export class MenuOverlay {
  private previews: LivePreviewEntry[] = [];
  private previewTime = 0;
  private codexFilter: 'all' | 'heroes' | 'monsters' | 'relics' = 'all';
  private codexAnimMode: 'idle' | 'move' | 'air_jump' | 'telegraph' | 'attack' | 'dive_slam' | 'death' = 'idle';

  constructor(
    private readonly root: HTMLElement,
    private readonly meta: MetaProgressionManager,
    private readonly cb: OverlayCallbacks,
  ) {}

  updatePreviews(dt: number): void {
    if (this.previews.length === 0) return;
    this.previewTime += dt;
    for (const p of this.previews) {
      const ctx = p.canvas.getContext('2d');
      if (!ctx) continue;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, p.canvas.width, p.canvas.height);
      const frame = getAnimationFrame(p.anim, this.previewTime, 1, false);
      const dw = frame.width * p.scale;
      const dh = frame.height * p.scale;
      const dx = Math.round((p.canvas.width - dw) * 0.5);
      const dy = Math.round(p.canvas.height - dh - 4);
      ctx.drawImage(frame, dx, dy, dw, dh);
    }
  }

  renderScreen(
    screen: GameScreen,
    context?: {
      relicChoices?: RelicId[];
      runStats?: RunStats;
      playerGold?: number;
      playerHp?: number;
      playerMaxHp?: number;
      sfxVolume?: number;
      musicVolume?: number;
    },
  ): void {
    this.previews = [];
    this.root.innerHTML = '';

    if (screen === 'playing' || screen === 'sanctuary') {
      this.root.classList.remove('interactive');
      return;
    }

    this.root.classList.add('interactive');
    const backdrop = document.createElement('div');
    backdrop.className =
      screen === 'title' ? 'gothic-backdrop title-backdrop' : 'gothic-backdrop';

    if (screen === 'title') {
      backdrop.appendChild(this.buildTitleScreen());
    } else if (screen === 'soul_altar') {
      backdrop.appendChild(this.buildSoulAltar());
    } else if (screen === 'hero_select') {
      backdrop.appendChild(this.buildHeroSelect());
    } else if (screen === 'relic_select') {
      backdrop.appendChild(this.buildRelicSelect(context?.relicChoices ?? []));
    } else if (screen === 'scroll_select') {
      backdrop.appendChild(this.buildScrollSelect(context?.runStats));
    } else if (screen === 'merchant') {
      backdrop.appendChild(
        this.buildMerchantModal(
          context?.playerGold ?? 0,
          context?.playerHp ?? 100,
          context?.playerMaxHp ?? 100,
        ),
      );
    } else if (screen === 'paused') {
      backdrop.appendChild(
        this.buildPauseModal(
          context?.runStats,
          context?.sfxVolume ?? 0.85,
          context?.musicVolume ?? 0.65,
        ),
      );
    } else if (screen === 'dead' || screen === 'victory') {
      backdrop.appendChild(this.buildEndModal(screen === 'victory', context?.runStats));
    } else if (screen === 'codex') {
      backdrop.appendChild(this.buildCodexGallery());
    } else if (screen === 'deeds') {
      backdrop.appendChild(this.buildDeedsModal());
    } else if (screen === 'controls') {
      backdrop.appendChild(this.buildControlsModal());
    }

    this.root.appendChild(backdrop);
  }

  private buildTitleScreen(): HTMLElement {
    const box = document.createElement('div');
    box.className = 'title-container';
    const lang = this.meta.data.language;
    const prestige = this.meta.data.prestigeLevel ?? 0;
    const prestigeTag =
      prestige > 0
        ? ` &nbsp;|&nbsp; ${tr('PRESTIGE', 'PRESTIGIO')} ${prestige} (+${prestige * 20}%)`
        : '';

    box.innerHTML = `
      <div class="title-emblem">MASOUL</div>
      <div class="title-subtitle">${tr('A Gothic Pixel-Art Action Roguelike', 'Un Roguelike de Acción Gótico Pixel-Art')}</div>
      <p class="title-lore">
        ${tr(
          'Descend into the cursed cathedrals, master blade and ember, harvest lost Souls, and overthrow the Crimson Sovereign.',
          'Desciende a las catedrales malditas, domina el acero y la brasa, cosecha Almas perdidas y derroca al Soberano Carmesí.',
        )}
      </p>
      <div class="soul-pill">${tr('BANKED SOULS', 'ALMAS GUARDADAS')}: ${this.meta.data.souls} &nbsp;|&nbsp; ${tr('HERO', 'HÉROE')}: ${CHARACTERS[this.meta.data.selectedCharacter].name.toUpperCase()}${prestigeTag}</div>
      <div style="display:flex; gap:8px; justify-content:center;">
        <button class="gothic-btn small ${lang === 'en' ? 'active-tab' : ''}" data-lang="en">English</button>
        <button class="gothic-btn small ${lang === 'es' ? 'active-tab' : ''}" data-lang="es">Español</button>
      </div>
      <div class="btn-stack">
        <button class="gothic-btn primary" data-action="sanctuary">${tr('Enter the Sanctuary', 'Entrar al Santuario')}</button>
        <button class="gothic-btn soul" data-action="quick-run">${tr('Descend Directly into the Crypt', 'Descender Directo a la Cripta')}</button>
        <button class="gothic-btn" data-action="codex">${tr('Heroes & Bestiary Codex', 'Códice de Héroes y Bestiario')}</button>
        <button class="gothic-btn" data-action="deeds">${tr('Book of Deeds', 'Libro de Hazañas')} (${this.meta.data.achievements.length}/${ACHIEVEMENT_LIST.length})</button>
        <button class="gothic-btn" data-action="controls">${tr('Controls & Mechanics', 'Controles y Mecánicas')}</button>
      </div>
    `;
    box.querySelectorAll('[data-lang]').forEach((btn) =>
      btn.addEventListener('click', () =>
        this.cb.onSelectLanguage((btn as HTMLElement).dataset.lang as Language),
      ),
    );
    box.querySelector('[data-action="sanctuary"]')?.addEventListener('click', () => this.cb.onStartSanctuary());
    box.querySelector('[data-action="quick-run"]')?.addEventListener('click', () => this.cb.onStartRun());
    box.querySelector('[data-action="codex"]')?.addEventListener('click', () => this.cb.onOpenScreen('codex'));
    box.querySelector('[data-action="deeds"]')?.addEventListener('click', () => this.cb.onOpenScreen('deeds'));
    box.querySelector('[data-action="controls"]')?.addEventListener('click', () => this.cb.onOpenScreen('controls'));
    return box;
  }

  private buildSoulAltar(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'gothic-panel';
    const prestige = this.meta.data.prestigeLevel ?? 0;
    const canPrestige = this.meta.canPrestige();
    const maxedCount = countMaxedUpgrades(this.meta.data);
    const totalUpgrades = META_UPGRADE_LIST.length;

    panel.innerHTML = `
      <div class="panel-header">
        <div>
          <div class="panel-title">${tr('Soul Altar', 'Altar de Almas')}</div>
          <div class="card-sub">${tr('Permanent Metaprogression Across Every Run', 'Metaprogresión Permanente Entre Incursiones')}</div>
        </div>
        <div class="soul-pill">${tr('BANKED SOULS', 'ALMAS GUARDADAS')}: ${this.meta.data.souls}</div>
      </div>
      <div class="card ${canPrestige ? 'selected' : ''}" style="margin-bottom:14px; border-color:var(--border-gold);">
        <div class="card-title">
          <span style="color:var(--text-gold)">${tr('Prestige Ascension', 'Ascensión de Prestigio')} &bull; ${tr('Rank', 'Rango')} ${prestige}</span>
          <span class="tag" style="color:var(--text-soul)">+${prestige * 20}% ${tr('TOTAL STATS', 'ESTADÍSTICAS TOTALES')}</span>
        </div>
        <div class="card-desc">
          ${tr(
            'Max every Soul Altar upgrade to ascend. Ascending resets upgrade ranks to 0 and permanently grants +20% to all hero stats (HP, Damage, Speed, Crit, Cooldowns, Souls & Surge) per Prestige.',
            'Lleva todas las mejoras del Altar al rango máximo para ascender. Al ascender, las mejoras vuelven a rango 0 y obtienes +20% permanente a todas las estadísticas totales por cada Prestigio.',
          )}
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
          <span class="card-sub">${tr('Maxed Upgrades', 'Mejoras al máximo')}: ${maxedCount}/${totalUpgrades}</span>
          <button class="gothic-btn primary small" data-action="prestige" ${canPrestige ? '' : 'disabled'}>
            ${
              canPrestige
                ? tr(`Ascend to Prestige ${prestige + 1} (+20% Stats)`, `Ascender a Prestigio ${prestige + 1} (+20% Estadísticas)`)
                : tr('Max All Upgrades to Prestige', 'Maximiza Todas las Mejoras para Prestigiar')
            }
          </button>
        </div>
      </div>
      <div class="grid-2" id="upgrade-grid"></div>
      <div style="margin-top:16px; display:flex; justify-content:flex-end; gap:10px;">
        <button class="gothic-btn primary" data-action="close">${tr('Return to Sanctuary', 'Volver al Santuario')}</button>
      </div>
    `;

    panel.querySelector('[data-action="prestige"]')?.addEventListener('click', () => this.cb.onPrestige());

    const grid = panel.querySelector('#upgrade-grid')!;
    for (const rawUp of META_UPGRADE_LIST) {
      const up = locUpgrade(rawUp);
      const rank = this.meta.data.upgrades[up.id] ?? 0;
      const maxed = rank >= up.maxRank;
      const cost = getUpgradeCost(up.id, rank);
      const canAfford = !maxed && this.meta.data.souls >= cost;

      const card = document.createElement('div');
      card.className = 'card';

      let pipsHtml = '';
      for (let i = 0; i < up.maxRank; i++) {
        pipsHtml += `<span class="pip ${i < rank ? 'filled' : ''}"></span>`;
      }

      card.innerHTML = `
        <div class="card-title">
          <span>${up.name}</span>
          <span class="tag" style="color:var(--text-soul)">${tr('RANK', 'RANGO')} ${rank}/${up.maxRank}</span>
        </div>
        <div class="pip-row">${pipsHtml}</div>
        <div class="card-desc">${up.description}</div>
        <div class="stat-row"><span>${up.bonusPerRankLabel}</span></div>
        <button class="gothic-btn soul small" ${canAfford ? '' : 'disabled'}>
          ${maxed ? tr('MAXED', 'AL MÁXIMO') : `${tr('FORGE', 'FORJAR')} (${cost} ${tr('SOULS', 'ALMAS')})`}
        </button>
      `;
      card.querySelector('button')?.addEventListener('click', () => this.cb.onBuyUpgrade(up.id));
      grid.appendChild(card);
    }

    panel.querySelector('[data-action="close"]')?.addEventListener('click', () => this.cb.onResume());
    return panel;
  }

  private buildHeroSelect(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'gothic-panel';
    panel.innerHTML = `
      <div class="panel-header">
        <div>
          <div class="panel-title">${tr('Hall of Heroes', 'Salón de Héroes')}</div>
          <div class="card-sub">${tr('Choose or Unlock Your Vessel', 'Elige o Desbloquea tu Recipiente')}</div>
        </div>
        <div class="soul-pill">${tr('BANKED SOULS', 'ALMAS GUARDADAS')}: ${this.meta.data.souls}</div>
      </div>
      <div class="grid-2" id="hero-grid"></div>
      <div style="margin-top:16px; display:flex; justify-content:flex-end;">
        <button class="gothic-btn primary" data-action="close">${tr('Return to Sanctuary', 'Volver al Santuario')}</button>
      </div>
    `;

    const assets = getGameAssets();
    const grid = panel.querySelector('#hero-grid')!;

    for (const rawHero of CHARACTER_LIST) {
      const hero = locHero(rawHero);
      const unlocked = this.meta.isCharacterUnlocked(hero.id);
      const selected = this.meta.data.selectedCharacter === hero.id;
      const canUnlock = !unlocked && this.meta.data.souls >= hero.unlockCost;

      const card = document.createElement('div');
      card.className = `card ${selected ? 'selected' : ''}`;

      const previewBox = document.createElement('div');
      previewBox.className = 'pixel-preview-box';
      const canvas = document.createElement('canvas');
      canvas.width = 140;
      canvas.height = 96;
      canvas.className = 'pixel-preview-canvas';
      previewBox.appendChild(canvas);
      this.previews.push({
        canvas,
        anim: assets.characters[hero.id][selected ? 'attack3' : 'idle'],
        scale: 2,
      });

      card.innerHTML = `
        <div class="card-title">
          <span>${hero.name}</span>
          <span class="tag" style="color:${hero.accentColor}">${hero.archetype}</span>
        </div>
        <div class="card-sub">${hero.title}</div>
      `;
      card.appendChild(previewBox);

      const info = document.createElement('div');
      info.style.display = 'flex';
      info.style.flexDirection = 'column';
      info.style.gap = '6px';
      info.innerHTML = `
        <div class="card-desc">${hero.description}</div>
        <div class="stat-row">
          <span>${tr('HP', 'PS')}: ${hero.maxHp}</span>
          <span>${tr('DMG', 'DAÑO')}: ${hero.baseDamage}</span>
          <span>${tr('SPD', 'VEL')}: ${hero.moveSpeed}</span>
          <span>${tr('CRIT', 'CRÍT')}: ${Math.round(hero.critChance * 100)}%</span>
        </div>
        <div class="skill-box"><strong>${tr('Passive', 'Pasiva')} — ${hero.passiveName}:</strong> ${hero.passiveDesc}</div>
        <div class="skill-box"><strong>[Q] ${hero.skill1.name}:</strong> ${hero.skill1.description}</div>
        <div class="skill-box"><strong>[E] ${hero.skill2.name}:</strong> ${hero.skill2.description}</div>
      `;
      card.appendChild(info);

      const btn = document.createElement('button');
      btn.className = `gothic-btn small ${selected ? 'primary' : unlocked ? '' : 'soul'}`;
      if (selected) {
        btn.textContent = tr('SELECTED HERO', 'HÉROE SELECCIONADO');
      } else if (unlocked) {
        btn.textContent = tr('SELECT HERO', 'SELECCIONAR');
      } else {
        btn.textContent = `${tr('UNLOCK', 'DESBLOQUEAR')} (${hero.unlockCost} ${tr('SOULS', 'ALMAS')})`;
        btn.disabled = !canUnlock;
      }
      btn.addEventListener('click', () => this.cb.onSelectOrUnlockHero(hero.id));
      card.appendChild(btn);

      grid.appendChild(card);
    }

    panel.querySelector('[data-action="close"]')?.addEventListener('click', () => this.cb.onResume());
    return panel;
  }

  private buildRelicSelect(choices: RelicId[]): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'gothic-panel';
    panel.innerHTML = `
      <div class="panel-header">
        <div>
          <div class="panel-title">${tr('Choose a Relic', 'Elige una Reliquia')}</div>
          <div class="card-sub">${tr('Ancient power bound within the shrine', 'Poder ancestral sellado en el sagrario')}</div>
        </div>
      </div>
      <div class="grid-3" id="relic-grid"></div>
    `;
    const grid = panel.querySelector('#relic-grid')!;
    const relicIcons = getGameAssets().relicIcons;
    choices.forEach((id, idx) => {
      const r = locRelic(RELICS[id]);
      const card = document.createElement('div');
      card.className = `card rarity-${r.rarity}`;
      const iconCanvas = document.createElement('canvas');
      iconCanvas.width = 24;
      iconCanvas.height = 24;
      iconCanvas.className = 'relic-icon';
      iconCanvas.getContext('2d')?.drawImage(relicIcons[id], 0, 0);
      card.innerHTML = `
        <div class="card-title" style="gap:8px; justify-content:flex-start;">
          <span style="color:${r.iconColor}; flex:1">${r.name}</span>
          <span class="kbd">[${idx + 1}]</span>
        </div>
        <div class="card-sub">${locRarity(r.rarity)} &bull; ${r.shortTag}</div>
        <div class="card-desc" style="flex:1">${r.description}</div>
        <button class="gothic-btn primary small">${tr('Claim Relic', 'Reclamar Reliquia')} [${idx + 1}]</button>
      `;
      card.querySelector('.card-title')?.prepend(iconCanvas);
      card.querySelector('button')?.addEventListener('click', () => this.cb.onSelectRelic(id));
      grid.appendChild(card);
    });
    return panel;
  }

  private buildScrollSelect(stats?: RunStats): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'gothic-panel';
    const cur = stats?.scrolls ?? { brutality: 0, tactics: 0, survival: 0 };

    panel.innerHTML = `
      <div class="panel-header">
        <div>
          <div class="panel-title">${tr('Trinity Scroll', 'Pergamino de la Trinidad')}</div>
          <div class="card-sub">${tr('Channel Forbidden Knowledge into Body, Blade, or Sorcery', 'Canaliza el Conocimiento Prohibido en Cuerpo, Acero o Hechicería')}</div>
        </div>
      </div>
      <div class="grid-3" id="scroll-grid"></div>
    `;

    const rankWord = tr('RANK', 'RANGO');
    const defs: Array<{
      stat: ScrollStat;
      name: string;
      color: string;
      tag: string;
      desc: string;
    }> = [
      {
        stat: 'brutality',
        name: tr('Brutality', 'Brutalidad'),
        color: '#ff6b7a',
        tag: `${rankWord} ${cur.brutality} -> ${cur.brutality + 1}`,
        desc: tr(
          '+15% Weapon & Melee Damage and +12% Max HP (+heal).',
          '+15% Daño de Arma y Cuerpo a Cuerpo, y +12% PS Máx. (+curación).',
        ),
      },
      {
        stat: 'tactics',
        name: tr('Tactics', 'Táctica'),
        color: '#ba82ed',
        tag: `${rankWord} ${cur.tactics} -> ${cur.tactics + 1}`,
        desc: tr(
          '+15% Skill & Spell Damage, +8% Cooldown Speed, and +10% Max HP (+heal).',
          '+15% Daño de Habilidades, +8% Recarga y +10% PS Máx. (+curación).',
        ),
      },
      {
        stat: 'survival',
        name: tr('Survival', 'Supervivencia'),
        color: '#67d487',
        tag: `${rankWord} ${cur.survival} -> ${cur.survival + 1}`,
        desc: tr(
          '+18% Max HP (+heal), +12% Parry/Dive Slam Damage, and +5% Flask Potency.',
          '+18% PS Máx. (+curación), +12% Daño de Parada/Golpe Picado y +5% Potencia de Frasco.',
        ),
      },
    ];

    const grid = panel.querySelector('#scroll-grid')!;
    defs.forEach((d, idx) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.borderColor = d.color;
      card.innerHTML = `
        <div class="card-title">
          <span style="color:${d.color}">${d.name}</span>
          <span class="kbd">[${idx + 1}]</span>
        </div>
        <div class="card-sub" style="color:${d.color}">${d.tag}</div>
        <div class="card-desc" style="flex:1">${d.desc}</div>
        <button class="gothic-btn small" style="border-color:${d.color}">${tr('Absorb', 'Absorber')} ${d.name} [${idx + 1}]</button>
      `;
      card.querySelector('button')?.addEventListener('click', () => this.cb.onSelectScroll(d.stat));
      grid.appendChild(card);
    });
    return panel;
  }

  private buildMerchantModal(gold: number, hp: number, maxHp: number): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'gothic-panel';
    const goldWord = tr('GOLD', 'ORO');
    panel.innerHTML = `
      <div class="panel-header">
        <div>
          <div class="panel-title">${tr('Hooded Peddler', 'Mercader Encapuchado')}</div>
          <div class="card-sub">${tr('"Coin buys steel, pilgrim... and survival."', '"El oro compra acero, peregrino... y supervivencia."')}</div>
        </div>
        <div class="gold-pill">${goldWord}: ${gold}</div>
      </div>
      <div class="grid-3">
        <div class="card">
          <div class="card-title"><span>${tr('Blood Draught', 'Brebaje de Sangre')}</span><span class="tag" style="color:var(--text-emerald)">25 ${goldWord}</span></div>
          <div class="card-desc">${tr('Restore 60% of your Max HP', 'Restaura el 60% de tus PS Máx.')} (${Math.round(hp)}/${maxHp}).</div>
          <button class="gothic-btn small" data-buy="heal" ${gold >= 25 && hp < maxHp ? '' : 'disabled'}>${tr('Buy Draught', 'Comprar Brebaje')}</button>
        </div>
        <div class="card">
          <div class="card-title"><span>${tr('Whetstone Rune', 'Runa de Afilar')}</span><span class="tag" style="color:var(--text-gold)">45 ${goldWord}</span></div>
          <div class="card-desc">${tr('Permanently temper your weapon for +20% damage this run.', 'Templa tu arma para +20% de daño durante esta incursión.')}</div>
          <button class="gothic-btn primary small" data-buy="weapon" ${gold >= 45 ? '' : 'disabled'}>${tr('Forge Edge', 'Templar Filo')}</button>
        </div>
        <div class="card">
          <div class="card-title"><span>${tr('Relic Casket', 'Cofre de Reliquia')}</span><span class="tag" style="color:var(--text-soul)">60 ${goldWord}</span></div>
          <div class="card-desc">${tr('Unseal a cursed casket containing a choice of 3 Relics.', 'Abre un cofre maldito con una elección de 3 Reliquias.')}</div>
          <button class="gothic-btn soul small" data-buy="relic" ${gold >= 60 ? '' : 'disabled'}>${tr('Open Casket', 'Abrir Cofre')}</button>
        </div>
      </div>
      <div style="margin-top:16px; display:flex; justify-content:flex-end;">
        <button class="gothic-btn" data-action="close">${tr('Leave Merchant', 'Salir')}</button>
      </div>
    `;
    panel.querySelector('[data-buy="heal"]')?.addEventListener('click', () => this.cb.onBuyMerchant('heal'));
    panel.querySelector('[data-buy="weapon"]')?.addEventListener('click', () => this.cb.onBuyMerchant('weapon'));
    panel.querySelector('[data-buy="relic"]')?.addEventListener('click', () => this.cb.onBuyMerchant('relic'));
    panel.querySelector('[data-action="close"]')?.addEventListener('click', () => this.cb.onResume());
    return panel;
  }

  private buildPauseModal(
    stats: RunStats | undefined,
    sfxVol: number,
    musicVol: number,
  ): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'gothic-panel';
    panel.style.maxWidth = '680px';

    const relics = stats?.relics ?? [];
    const synergies = getActiveSynergies(relics);
    const lang = this.meta.data.language;

    const relicListHtml =
      relics.length === 0
        ? `<div class="card-desc">${tr('No Relics bound in this run yet.', 'Aún no hay Reliquias equipadas en esta incursión.')}</div>`
        : relics
            .map((id) => {
              const r = locRelic(RELICS[id]);
              return `<div class="skill-box" style="border-left-color:${r.iconColor}"><strong style="color:${r.iconColor}">${r.name}</strong> (${r.shortTag}): ${r.description}</div>`;
            })
            .join('');

    const synHtml = synergies
      .map((rawSyn) => {
        const s = locSynergy(rawSyn);
        return `<div class="skill-box" style="border-left-color:${s.color}; background:rgba(36,28,58,0.85)"><strong style="color:${s.color}">${s.name}</strong> — ${s.description}</div>`;
      })
      .join('');

    panel.innerHTML = `
      <div class="panel-header">
        <div>
          <div class="panel-title">${tr('Game Paused', 'Juego en Pausa')}</div>
          <div class="card-sub">${tr('Relic Arsenal, Synergies & Audio Controls', 'Arsenal de Reliquias, Sinergias, Idioma y Audio')}</div>
        </div>
        <button class="gothic-btn primary small" data-action="resume">${tr('Resume', 'Reanudar')}</button>
      </div>
      <div class="grid-2" style="margin-bottom:14px;">
        <div class="card">
          <div class="card-title"><span>${tr('Audio & Language', 'Audio e Idioma')}</span></div>
          <label class="stat-row"><span>${tr('Music Volume', 'Volumen Música')}</span><span id="mus-val">${Math.round(musicVol * 100)}%</span></label>
          <input type="range" min="0" max="100" value="${Math.round(musicVol * 100)}" id="mus-slider" style="width:100%" />
          <label class="stat-row"><span>${tr('SFX Volume', 'Volumen Efectos')}</span><span id="sfx-val">${Math.round(sfxVol * 100)}%</span></label>
          <input type="range" min="0" max="100" value="${Math.round(sfxVol * 100)}" id="sfx-slider" style="width:100%" />
          <div style="display:flex; gap:8px; margin-top:4px;">
            <button class="gothic-btn small ${lang === 'en' ? 'active-tab' : ''}" data-lang="en">English</button>
            <button class="gothic-btn small ${lang === 'es' ? 'active-tab' : ''}" data-lang="es">Español</button>
          </div>
        </div>
        <div class="card">
          <div class="card-title"><span>${tr('Active Build', 'Configuración Actual')}</span></div>
          <div class="stat-row"><span>${tr('Brutality Scrolls', 'Pergaminos Brutalidad')}</span><span style="color:#ff6b7a">${stats?.scrolls.brutality ?? 0}</span></div>
          <div class="stat-row"><span>${tr('Tactics Scrolls', 'Pergaminos Táctica')}</span><span style="color:#ba82ed">${stats?.scrolls.tactics ?? 0}</span></div>
          <div class="stat-row"><span>${tr('Survival Scrolls', 'Pergaminos Supervivencia')}</span><span style="color:#67d487">${stats?.scrolls.survival ?? 0}</span></div>
          <div class="stat-row"><span>${tr('Max Killstreak', 'Racha Máxima')}</span><span style="color:var(--text-gold)">${stats?.maxKillstreak ?? 0}</span></div>
        </div>
      </div>
      ${synHtml ? `<div style="display:flex; flex-direction:column; gap:6px; margin-bottom:10px;">${synHtml}</div>` : ''}
      <div style="display:flex; flex-direction:column; gap:6px; max-height:170px; overflow-y:auto; margin-bottom:14px;">
        ${relicListHtml}
      </div>
      <div class="grid-2">
        <button class="gothic-btn small" data-action="controls">${tr('Controls', 'Controles')}</button>
        <button class="gothic-btn small" data-action="codex">${tr('Heroes & Bestiary Codex', 'Códice y Bestiario')}</button>
        <button class="gothic-btn small" data-action="deeds">${tr('Book of Deeds', 'Libro de Hazañas')}</button>
        <button class="gothic-btn soul small" data-action="sanctuary">${tr('Return to Sanctuary', 'Volver al Santuario')}</button>
      </div>
    `;

    const musSlider = panel.querySelector('#mus-slider') as HTMLInputElement | null;
    const sfxSlider = panel.querySelector('#sfx-slider') as HTMLInputElement | null;
    musSlider?.addEventListener('input', () => {
      const val = Number(musSlider.value) / 100;
      const lbl = panel.querySelector('#mus-val');
      if (lbl) lbl.textContent = `${musSlider.value}%`;
      this.cb.onVolumeChange('music', val);
    });
    sfxSlider?.addEventListener('input', () => {
      const val = Number(sfxSlider.value) / 100;
      const lbl = panel.querySelector('#sfx-val');
      if (lbl) lbl.textContent = `${sfxSlider.value}%`;
      this.cb.onVolumeChange('sfx', val);
    });

    panel.querySelectorAll('[data-lang]').forEach((btn) =>
      btn.addEventListener('click', () =>
        this.cb.onSelectLanguage((btn as HTMLElement).dataset.lang as Language),
      ),
    );
    panel.querySelector('[data-action="resume"]')?.addEventListener('click', () => this.cb.onResume());
    panel.querySelector('[data-action="controls"]')?.addEventListener('click', () => this.cb.onOpenScreen('controls'));
    panel.querySelector('[data-action="codex"]')?.addEventListener('click', () => this.cb.onOpenScreen('codex'));
    panel.querySelector('[data-action="deeds"]')?.addEventListener('click', () => this.cb.onOpenScreen('deeds'));
    panel.querySelector('[data-action="sanctuary"]')?.addEventListener('click', () => this.cb.onReturnSanctuary());
    return panel;
  }

  private buildEndModal(isVictory: boolean, stats?: RunStats): HTMLElement {
    const box = document.createElement('div');
    box.className = 'title-container';
    const unbanked = stats?.runSouls ?? 0;
    const retained = isVictory ? unbanked : computeDeathSoulRetention(unbanked, this.meta.data);
    const totalEarned = (stats?.bankedSoulsThisRun ?? 0) + retained;

    box.innerHTML = `
      <div class="panel-title" style="color:${isVictory ? 'var(--text-gold)' : 'var(--text-crimson)'}">
        ${isVictory ? tr('Sovereign Vanquished', 'Soberano Derrotado') : tr('Vessel Shattered', 'Recipiente Quebrado')}
      </div>
      <div class="card-sub">${
        isVictory
          ? tr('The Obsidian Citadel bows before your blade!', '¡La Ciudadela de Obsidiana se inclina ante tu filo!')
          : tr("Death's Bargain preserves a spark of your harvested Souls.", 'El Pacto con la Muerte preserva una chispa de tus Almas cosechadas.')
      }</div>
      <div class="summary-stats" style="width:100%">
        <div>${tr('Monsters Slain', 'Monstruos Abatidos')}:</div><div style="color:var(--text-gold)">${stats?.kills ?? 0}</div>
        <div>${tr('Best Killstreak', 'Mejor Racha')}:</div><div style="color:var(--text-gold)">${stats?.maxKillstreak ?? 0}x</div>
        <div>${tr('Relics Bound', 'Reliquias')}:</div><div style="color:var(--text-gold)">${stats?.relics.length ?? 0}</div>
        <div>${tr('Run Time', 'Tiempo')}:</div><div>${Math.round(stats?.timeSeconds ?? 0)}s</div>
        <div>${tr('Souls Saved', 'Almas Salvadas')}:</div><div style="color:var(--text-soul)">+${totalEarned}</div>
        <div>${tr('Total Banked', 'Total Guardado')}:</div><div style="color:var(--text-soul)">${this.meta.data.souls}</div>
      </div>
      <div class="btn-stack">
        <button class="gothic-btn soul" data-action="sanctuary">${tr('Return to Sanctuary (Spend Souls)', 'Volver al Santuario (Gastar Almas)')}</button>
        <button class="gothic-btn primary" data-action="retry">${tr('Descend Again Immediately', 'Descender de Nuevo')}</button>
      </div>
    `;
    box.querySelector('[data-action="sanctuary"]')?.addEventListener('click', () => this.cb.onReturnSanctuary());
    box.querySelector('[data-action="retry"]')?.addEventListener('click', () => this.cb.onQuickRetry());
    return box;
  }

  private buildDeedsModal(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'gothic-panel';
    const earned = new Set(this.meta.data.achievements);

    panel.innerHTML = `
      <div class="panel-header">
        <div>
          <div class="panel-title">${tr('Book of Deeds', 'Libro de Hazañas')}</div>
          <div class="card-sub">${tr('Unlocked', 'Desbloqueadas')} ${earned.size}/${ACHIEVEMENT_LIST.length} ${tr('Eternal Feats', 'Hazañas Eternas')}</div>
        </div>
        <button class="gothic-btn primary small" data-action="back">${tr('Back', 'Volver')}</button>
      </div>
      <div class="grid-2" id="deeds-grid"></div>
    `;

    const grid = panel.querySelector('#deeds-grid')!;
    for (const rawAch of ACHIEVEMENT_LIST) {
      const ach = locAchievement(rawAch);
      const done = earned.has(ach.id);
      const card = document.createElement('div');
      card.className = `card ${done ? 'selected' : ''}`;
      card.style.opacity = done ? '1' : '0.68';
      card.innerHTML = `
        <div class="card-title">
          <span style="color:${done ? ach.iconColor : 'var(--text-muted)'}">${ach.name}</span>
          <span class="tag" style="color:${done ? 'var(--text-soul)' : 'var(--text-muted)'}">
            ${done ? tr('CLAIMED', 'RECLAMADA') : `+${ach.soulReward} ${tr('SOULS', 'ALMAS')}`}
          </span>
        </div>
        <div class="card-desc">${ach.description}</div>
      `;
      grid.appendChild(card);
    }

    panel.querySelector('[data-action="back"]')?.addEventListener('click', () => this.cb.onResume());
    return panel;
  }

  private buildCodexGallery(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'gothic-panel';
    panel.innerHTML = `
      <div class="panel-header">
        <div>
          <div class="panel-title">${tr('Heroes & Bestiary Codex', 'Códice de Héroes y Bestiario')}</div>
          <div class="card-sub">Live Pixel-Art Animation Showcase (6 Heroes &bull; 13 Monsters & Bosses &bull; 20 Relics)</div>
        </div>
        <button class="gothic-btn small primary" data-action="back">Back</button>
      </div>
      <div class="toolbar">
        <button class="gothic-btn small ${this.codexFilter === 'all' ? 'active-tab' : ''}" data-filter="all">All Entities (19)</button>
        <button class="gothic-btn small ${this.codexFilter === 'heroes' ? 'active-tab' : ''}" data-filter="heroes">Heroes (6)</button>
        <button class="gothic-btn small ${this.codexFilter === 'monsters' ? 'active-tab' : ''}" data-filter="monsters">Monsters & Bosses (13)</button>
        <button class="gothic-btn small ${this.codexFilter === 'relics' ? 'active-tab' : ''}" data-filter="relics">Relics (20)</button>
        <span style="flex-basis:100%; height:2px;"></span>
        <span style="font-size:0.86rem; color:var(--text-muted)">ANIMATION:</span>
        <button class="gothic-btn small ${this.codexAnimMode === 'idle' ? 'active-tab' : ''}" data-anim="idle">Idle</button>
        <button class="gothic-btn small ${this.codexAnimMode === 'move' ? 'active-tab' : ''}" data-anim="move">Move</button>
        <button class="gothic-btn small ${this.codexAnimMode === 'air_jump' ? 'active-tab' : ''}" data-anim="air_jump">Air Jump</button>
        <button class="gothic-btn small ${this.codexAnimMode === 'telegraph' ? 'active-tab' : ''}" data-anim="telegraph">Windup/Skill</button>
        <button class="gothic-btn small ${this.codexAnimMode === 'attack' ? 'active-tab' : ''}" data-anim="attack">Attack</button>
        <button class="gothic-btn small ${this.codexAnimMode === 'dive_slam' ? 'active-tab' : ''}" data-anim="dive_slam">Dive Slam</button>
        <button class="gothic-btn small ${this.codexAnimMode === 'death' ? 'active-tab' : ''}" data-anim="death">Death</button>
      </div>
      <div class="grid-gallery" id="codex-grid"></div>
    `;

    const assets = getGameAssets();
    const grid = panel.querySelector('#codex-grid')!;

    if (this.codexFilter === 'relics') {
      for (const rawRelic of RELIC_LIST) {
        const r = locRelic(rawRelic);
        const card = document.createElement('div');
        card.className = `card rarity-${r.rarity}`;
        const iconCanvas = document.createElement('canvas');
        iconCanvas.width = 24;
        iconCanvas.height = 24;
        iconCanvas.className = 'relic-icon';
        iconCanvas.getContext('2d')?.drawImage(assets.relicIcons[r.id], 0, 0);
        const tagPills = r.tags
          .map((t) => `<span class="tag" style="color:${r.iconColor}">${t.toUpperCase()}</span>`)
          .join(' ');
        card.innerHTML = `
          <div class="card-title" style="gap:8px; justify-content:flex-start;">
            <span style="color:${r.iconColor}; flex:1">${r.name}</span>${tagPills}
          </div>
          <div class="card-sub">${locRarity(r.rarity)} &bull; ${r.shortTag}</div>
          <div class="card-desc">${r.description}</div>
        `;
        card.querySelector('.card-title')?.prepend(iconCanvas);
        grid.appendChild(card);
      }
    }

    if (this.codexFilter === 'all' || this.codexFilter === 'heroes') {
      for (const rawH of CHARACTER_LIST) {
        const h = locHero(rawH);
        const heroState: CharacterAnimState =
          this.codexAnimMode === 'move'
            ? 'run'
            : this.codexAnimMode === 'air_jump'
              ? 'air_jump'
              : this.codexAnimMode === 'telegraph'
                ? 'skill2'
                : this.codexAnimMode === 'attack'
                  ? 'attack3'
                  : this.codexAnimMode === 'dive_slam'
                    ? 'dive_slam'
                    : this.codexAnimMode === 'death'
                      ? 'death'
                      : 'idle';

        const card = document.createElement('div');
        card.className = 'card';
        const box = document.createElement('div');
        box.className = 'pixel-preview-box';
        const c = document.createElement('canvas');
        c.width = 104;
        c.height = 80;
        c.className = 'pixel-preview-canvas';
        c.style.height = '104px';
        box.appendChild(c);
        this.previews.push({ canvas: c, anim: assets.characters[h.id][heroState], scale: 1 });

        card.innerHTML = `
          <div class="card-title"><span>${h.name}</span><span class="tag" style="color:${h.accentColor}">HERO</span></div>
          <div class="card-sub">${h.archetype}</div>
        `;
        card.appendChild(box);
        const desc = document.createElement('div');
        desc.className = 'card-desc';
        desc.textContent = `${h.skill1.name} • ${h.skill2.name}`;
        card.appendChild(desc);
        grid.appendChild(card);
      }
    }

    if (this.codexFilter === 'all' || this.codexFilter === 'monsters') {
      for (const rawE of ENEMY_LIST) {
        const e = locEnemy(rawE);
        const enemyState: EnemyAnimState =
          this.codexAnimMode === 'dive_slam'
            ? 'attack'
            : this.codexAnimMode === 'air_jump'
              ? 'move'
              : this.codexAnimMode;
        const card = document.createElement('div');
        card.className = 'card';
        const box = document.createElement('div');
        box.className = 'pixel-preview-box';
        const c = document.createElement('canvas');
        c.width = e.isBoss ? 164 : 112;
        c.height = e.isBoss ? 142 : 96;
        c.className = 'pixel-preview-canvas';
        c.style.height = '112px';
        box.appendChild(c);
        this.previews.push({ canvas: c, anim: assets.enemies[e.id as EnemyId][enemyState], scale: 1 });

        card.innerHTML = `
          <div class="card-title">
            <span>${e.name}</span>
            <span class="tag" style="color:${e.accentColor}">${e.isBoss ? tr('BOSS', 'JEFE') : tr('MONSTER', 'MONSTRUO')}</span>
          </div>
          <div class="card-sub">${tr('HP', 'PS')} ${e.maxHp} &bull; ${tr('DMG', 'DAÑO')} ${e.damage}</div>
        `;
        card.appendChild(box);
        const desc = document.createElement('div');
        desc.className = 'card-desc';
        desc.textContent = e.description;
        card.appendChild(desc);
        grid.appendChild(card);
      }
    }

    panel.querySelector('[data-action="back"]')?.addEventListener('click', () => this.cb.onResume());
    panel.querySelectorAll('[data-filter]').forEach((btn) =>
      btn.addEventListener('click', () => {
        this.codexFilter = (btn as HTMLElement).dataset.filter as typeof this.codexFilter;
        this.renderScreen('codex');
      }),
    );
    panel.querySelectorAll('[data-anim]').forEach((btn) =>
      btn.addEventListener('click', () => {
        this.codexAnimMode = (btn as HTMLElement).dataset.anim as typeof this.codexAnimMode;
        this.renderScreen('codex');
      }),
    );
    return panel;
  }

  private buildControlsModal(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'gothic-panel';
    panel.innerHTML = `
      <div class="panel-header">
        <div>
          <div class="panel-title">${tr('Controls & Combat Mechanics', 'Controles y Mecánicas de Combate')}</div>
          <div class="card-sub">${tr('Keyboard, Mouse & Gamepad Support', 'Soporte de Teclado, Ratón y Mando')}</div>
        </div>
        <button class="gothic-btn primary small" data-action="back">${tr('Back', 'Volver')}</button>
      </div>
      <div class="controls-grid">
        <div class="control-item"><span>${tr('Move Left / Right', 'Mover Izquierda / Derecha')}</span><span class="kbd">A / D</span></div>
        <div class="control-item"><span>${tr('Jump / Double Jump / Wall Jump', 'Salto / Doble Salto / Salto en Pared')}</span><span class="kbd">Space / W</span></div>
        <div class="control-item"><span>${tr('Drop Through Platform', 'Bajar de Plataforma')}</span><span class="kbd">S</span></div>
        <div class="control-item"><span>${tr('3-Hit Combo Attack', 'Combo de 3 Golpes')}</span><span class="kbd">J / Click</span></div>
        <div class="control-item"><span>${tr('Air Dive Slam', 'Golpe Picado Aéreo')}</span><span class="kbd">S + J</span></div>
        <div class="control-item"><span>${tr('Dodge Roll (with air gravity)', 'Rodar / Esquivar (con gravedad aérea)')}</span><span class="kbd">Shift / R-Click</span></div>
        <div class="control-item"><span>${tr('Hero Skill 1', 'Habilidad 1')}</span><span class="kbd">Q / U</span></div>
        <div class="control-item"><span>${tr('Hero Skill 2', 'Habilidad 2')}</span><span class="kbd">E / I</span></div>
        <div class="control-item"><span>${tr('Soul Overdrive (at 100%)', 'Sobrecarga de Alma (al 100%)')}</span><span class="kbd">V / L</span></div>
        <div class="control-item"><span>${tr('Drink Healing Flask', 'Beber Frasco Curativo')}</span><span class="kbd">R / H</span></div>
        <div class="control-item"><span>${tr('Interact (Altar / Chest / Portal)', 'Interactuar (Altar / Cofre / Portal)')}</span><span class="kbd">F / Up</span></div>
        <div class="control-item"><span>${tr('Waystone Fast-Travel', 'Viaje Rápido Piedra Guía')}</span><span class="kbd">Tab</span></div>
        <div class="control-item"><span>${tr('Pause / Resume', 'Pausa / Reanudar')}</span><span class="kbd">Esc</span></div>
        <div class="control-item"><span>${tr('Toggle Audio Mute', 'Silenciar Audio')}</span><span class="kbd">M</span></div>
      </div>
    `;
    panel.querySelector('[data-action="back"]')?.addEventListener('click', () => this.cb.onResume());
    return panel;
  }
}
