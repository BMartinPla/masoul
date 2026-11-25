import type {
  CharacterAnimState,
  CharacterId,
  EnemyAnimState,
  EnemyId,
  GameScreen,
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
  computeDeathSoulRetention,
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
    box.innerHTML = `
      <div class="title-emblem">MASOUL</div>
      <div class="title-subtitle">A Gothic Pixel-Art Action Roguelike</div>
      <p class="title-lore">
        Descend into the cursed cathedrals, master blade and ember, harvest lost Souls, and overthrow the Crimson Sovereign.
      </p>
      <div class="soul-pill">BANKED SOULS: ${this.meta.data.souls} &nbsp;|&nbsp; HERO: ${CHARACTERS[this.meta.data.selectedCharacter].name.toUpperCase()}</div>
      <div class="btn-stack">
        <button class="gothic-btn primary" data-action="sanctuary">Enter the Sanctuary</button>
        <button class="gothic-btn soul" data-action="quick-run">Descend Directly into the Crypt</button>
        <button class="gothic-btn" data-action="codex">Heroes & Bestiary Codex</button>
        <button class="gothic-btn" data-action="deeds">Book of Deeds (${this.meta.data.achievements.length}/${ACHIEVEMENT_LIST.length})</button>
        <button class="gothic-btn" data-action="controls">Controls & Mechanics</button>
      </div>
    `;
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

    panel.innerHTML = `
      <div class="panel-header">
        <div>
          <div class="panel-title">Soul Altar</div>
          <div class="card-sub">Permanent Metaprogression Across Every Run</div>
        </div>
        <div class="soul-pill">BANKED SOULS: ${this.meta.data.souls}</div>
      </div>
      <div class="grid-2" id="upgrade-grid"></div>
      <div style="margin-top:16px; display:flex; justify-content:flex-end; gap:10px;">
        <button class="gothic-btn primary" data-action="close">Return to Sanctuary</button>
      </div>
    `;

    const grid = panel.querySelector('#upgrade-grid')!;
    for (const up of META_UPGRADE_LIST) {
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
          <span class="tag" style="color:var(--text-soul)">RANK ${rank}/${up.maxRank}</span>
        </div>
        <div class="pip-row">${pipsHtml}</div>
        <div class="card-desc">${up.description}</div>
        <div class="stat-row"><span>${up.bonusPerRankLabel}</span></div>
        <button class="gothic-btn soul small" ${canAfford ? '' : 'disabled'}>
          ${maxed ? 'MAXED' : `FORGE (${cost} SOULS)`}
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
          <div class="panel-title">Hall of Heroes</div>
          <div class="card-sub">Choose or Unlock Your Vessel</div>
        </div>
        <div class="soul-pill">BANKED SOULS: ${this.meta.data.souls}</div>
      </div>
      <div class="grid-2" id="hero-grid"></div>
      <div style="margin-top:16px; display:flex; justify-content:flex-end;">
        <button class="gothic-btn primary" data-action="close">Return to Sanctuary</button>
      </div>
    `;

    const assets = getGameAssets();
    const grid = panel.querySelector('#hero-grid')!;

    for (const hero of CHARACTER_LIST) {
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
          <span>HP: ${hero.maxHp}</span>
          <span>DMG: ${hero.baseDamage}</span>
          <span>SPD: ${hero.moveSpeed}</span>
          <span>CRIT: ${Math.round(hero.critChance * 100)}%</span>
        </div>
        <div class="skill-box"><strong>Passive — ${hero.passiveName}:</strong> ${hero.passiveDesc}</div>
        <div class="skill-box"><strong>[Q] ${hero.skill1.name}:</strong> ${hero.skill1.description}</div>
        <div class="skill-box"><strong>[E] ${hero.skill2.name}:</strong> ${hero.skill2.description}</div>
      `;
      card.appendChild(info);

      const btn = document.createElement('button');
      btn.className = `gothic-btn small ${selected ? 'primary' : unlocked ? '' : 'soul'}`;
      if (selected) {
        btn.textContent = 'SELECTED HERO';
      } else if (unlocked) {
        btn.textContent = 'SELECT HERO';
      } else {
        btn.textContent = `UNLOCK (${hero.unlockCost} SOULS)`;
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
          <div class="panel-title">Choose a Relic</div>
          <div class="card-sub">Ancient power bound within the shrine</div>
        </div>
      </div>
      <div class="grid-3" id="relic-grid"></div>
    `;
    const grid = panel.querySelector('#relic-grid')!;
    const relicIcons = getGameAssets().relicIcons;
    choices.forEach((id, idx) => {
      const r = RELICS[id];
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
        <div class="card-sub">${r.rarity} &bull; ${r.shortTag}</div>
        <div class="card-desc" style="flex:1">${r.description}</div>
        <button class="gothic-btn primary small">Claim Relic [${idx + 1}]</button>
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
          <div class="panel-title">Trinity Scroll</div>
          <div class="card-sub">Channel Forbidden Knowledge into Body, Blade, or Sorcery</div>
        </div>
      </div>
      <div class="grid-3" id="scroll-grid"></div>
    `;

    const defs: Array<{
      stat: ScrollStat;
      name: string;
      color: string;
      tag: string;
      desc: string;
    }> = [
      {
        stat: 'brutality',
        name: 'Brutality',
        color: '#ff6b7a',
        tag: `RANK ${cur.brutality} -> ${cur.brutality + 1}`,
        desc: '+15% Weapon & Melee Damage and +12% Max HP (+heal).',
      },
      {
        stat: 'tactics',
        name: 'Tactics',
        color: '#ba82ed',
        tag: `RANK ${cur.tactics} -> ${cur.tactics + 1}`,
        desc: '+15% Skill & Spell Damage, +8% Cooldown Speed, and +10% Max HP (+heal).',
      },
      {
        stat: 'survival',
        name: 'Survival',
        color: '#67d487',
        tag: `RANK ${cur.survival} -> ${cur.survival + 1}`,
        desc: '+18% Max HP (+heal), +12% Parry/Dive Slam Damage, and +5% Flask Potency.',
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
        <button class="gothic-btn small" style="border-color:${d.color}">Absorb ${d.name} [${idx + 1}]</button>
      `;
      card.querySelector('button')?.addEventListener('click', () => this.cb.onSelectScroll(d.stat));
      grid.appendChild(card);
    });
    return panel;
  }

  private buildMerchantModal(gold: number, hp: number, maxHp: number): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'gothic-panel';
    panel.innerHTML = `
      <div class="panel-header">
        <div>
          <div class="panel-title">Hooded Peddler</div>
          <div class="card-sub">"Coin buys steel, pilgrim... and survival."</div>
        </div>
        <div class="gold-pill">GOLD: ${gold}</div>
      </div>
      <div class="grid-3">
        <div class="card">
          <div class="card-title"><span>Blood Draught</span><span class="tag" style="color:var(--text-emerald)">25 GOLD</span></div>
          <div class="card-desc">Restore 60% of your Max HP (${Math.round(hp)}/${maxHp}).</div>
          <button class="gothic-btn small" data-buy="heal" ${gold >= 25 && hp < maxHp ? '' : 'disabled'}>Buy Draught</button>
        </div>
        <div class="card">
          <div class="card-title"><span>Whetstone Rune</span><span class="tag" style="color:var(--text-gold)">45 GOLD</span></div>
          <div class="card-desc">Permanently temper your weapon for +20% damage this run.</div>
          <button class="gothic-btn primary small" data-buy="weapon" ${gold >= 45 ? '' : 'disabled'}>Forge Edge</button>
        </div>
        <div class="card">
          <div class="card-title"><span>Relic Casket</span><span class="tag" style="color:var(--text-soul)">60 GOLD</span></div>
          <div class="card-desc">Unseal a cursed casket containing a choice of 3 Relics.</div>
          <button class="gothic-btn soul small" data-buy="relic" ${gold >= 60 ? '' : 'disabled'}>Open Casket</button>
        </div>
      </div>
      <div style="margin-top:16px; display:flex; justify-content:flex-end;">
        <button class="gothic-btn" data-action="close">Leave Merchant</button>
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

    const relicListHtml =
      relics.length === 0
        ? '<div class="card-desc">No Relics bound in this run yet.</div>'
        : relics
            .map((id) => {
              const r = RELICS[id];
              return `<div class="skill-box" style="border-left-color:${r.iconColor}"><strong style="color:${r.iconColor}">${r.name}</strong> (${r.shortTag}): ${r.description}</div>`;
            })
            .join('');

    const synHtml = synergies
      .map(
        (s) =>
          `<div class="skill-box" style="border-left-color:${s.color}; background:rgba(36,28,58,0.85)"><strong style="color:${s.color}">${s.name}</strong> — ${s.description}</div>`,
      )
      .join('');

    panel.innerHTML = `
      <div class="panel-header">
        <div>
          <div class="panel-title">Game Paused</div>
          <div class="card-sub">Relic Arsenal, Synergies & Audio Controls</div>
        </div>
        <button class="gothic-btn primary small" data-action="resume">Resume</button>
      </div>
      <div class="grid-2" style="margin-bottom:14px;">
        <div class="card">
          <div class="card-title"><span>Audio Mixer</span></div>
          <label class="stat-row"><span>Music Volume</span><span id="mus-val">${Math.round(musicVol * 100)}%</span></label>
          <input type="range" min="0" max="100" value="${Math.round(musicVol * 100)}" id="mus-slider" style="width:100%" />
          <label class="stat-row"><span>SFX Volume</span><span id="sfx-val">${Math.round(sfxVol * 100)}%</span></label>
          <input type="range" min="0" max="100" value="${Math.round(sfxVol * 100)}" id="sfx-slider" style="width:100%" />
        </div>
        <div class="card">
          <div class="card-title"><span>Active Build</span></div>
          <div class="stat-row"><span>Brutality Scrolls</span><span style="color:#ff6b7a">${stats?.scrolls.brutality ?? 0}</span></div>
          <div class="stat-row"><span>Tactics Scrolls</span><span style="color:#ba82ed">${stats?.scrolls.tactics ?? 0}</span></div>
          <div class="stat-row"><span>Survival Scrolls</span><span style="color:#67d487">${stats?.scrolls.survival ?? 0}</span></div>
          <div class="stat-row"><span>Max Killstreak</span><span style="color:var(--text-gold)">${stats?.maxKillstreak ?? 0}</span></div>
        </div>
      </div>
      ${synHtml ? `<div style="display:flex; flex-direction:column; gap:6px; margin-bottom:10px;">${synHtml}</div>` : ''}
      <div style="display:flex; flex-direction:column; gap:6px; max-height:170px; overflow-y:auto; margin-bottom:14px;">
        ${relicListHtml}
      </div>
      <div class="grid-2">
        <button class="gothic-btn small" data-action="controls">Controls</button>
        <button class="gothic-btn small" data-action="codex">Heroes & Bestiary Codex</button>
        <button class="gothic-btn small" data-action="deeds">Book of Deeds</button>
        <button class="gothic-btn soul small" data-action="sanctuary">Return to Sanctuary</button>
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
        ${isVictory ? 'Sovereign Vanquished' : 'Vessel Shattered'}
      </div>
      <div class="card-sub">${
        isVictory
          ? 'The Obsidian Citadel bows before your blade!'
          : "Death's Bargain preserves a spark of your harvested Souls."
      }</div>
      <div class="summary-stats" style="width:100%">
        <div>Monsters Slain:</div><div style="color:var(--text-gold)">${stats?.kills ?? 0}</div>
        <div>Best Killstreak:</div><div style="color:var(--text-gold)">${stats?.maxKillstreak ?? 0}x</div>
        <div>Relics Bound:</div><div style="color:var(--text-gold)">${stats?.relics.length ?? 0}</div>
        <div>Run Time:</div><div>${Math.round(stats?.timeSeconds ?? 0)}s</div>
        <div>Souls Saved:</div><div style="color:var(--text-soul)">+${totalEarned}</div>
        <div>Total Banked:</div><div style="color:var(--text-soul)">${this.meta.data.souls}</div>
      </div>
      <div class="btn-stack">
        <button class="gothic-btn soul" data-action="sanctuary">Return to Sanctuary (Spend Souls)</button>
        <button class="gothic-btn primary" data-action="retry">Descend Again Immediately</button>
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
          <div class="panel-title">Book of Deeds</div>
          <div class="card-sub">Unlocked ${earned.size}/${ACHIEVEMENT_LIST.length} Eternal Feats</div>
        </div>
        <button class="gothic-btn primary small" data-action="back">Back</button>
      </div>
      <div class="grid-2" id="deeds-grid"></div>
    `;

    const grid = panel.querySelector('#deeds-grid')!;
    for (const ach of ACHIEVEMENT_LIST) {
      const done = earned.has(ach.id);
      const card = document.createElement('div');
      card.className = `card ${done ? 'selected' : ''}`;
      card.style.opacity = done ? '1' : '0.68';
      card.innerHTML = `
        <div class="card-title">
          <span style="color:${done ? ach.iconColor : 'var(--text-muted)'}">${ach.name}</span>
          <span class="tag" style="color:${done ? 'var(--text-soul)' : 'var(--text-muted)'}">
            ${done ? 'CLAIMED' : `+${ach.soulReward} SOULS`}
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
          <div class="panel-title">Heroes & Bestiary Codex</div>
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
      for (const r of RELIC_LIST) {
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
          <div class="card-sub">${r.rarity} &bull; ${r.shortTag}</div>
          <div class="card-desc">${r.description}</div>
        `;
        card.querySelector('.card-title')?.prepend(iconCanvas);
        grid.appendChild(card);
      }
    }

    if (this.codexFilter === 'all' || this.codexFilter === 'heroes') {
      for (const h of CHARACTER_LIST) {
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
      for (const e of ENEMY_LIST) {
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
            <span class="tag" style="color:${e.accentColor}">${e.isBoss ? 'BOSS' : 'MONSTER'}</span>
          </div>
          <div class="card-sub">HP ${e.maxHp} &bull; DMG ${e.damage}</div>
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
          <div class="panel-title">Controls & Combat Mechanics</div>
          <div class="card-sub">Keyboard, Mouse & Gamepad Support</div>
        </div>
        <button class="gothic-btn primary small" data-action="back">Back</button>
      </div>
      <div class="controls-grid">
        <div class="control-item"><span>Move Left / Right</span><span class="kbd">A / D or Left Stick</span></div>
        <div class="control-item"><span>Jump / Double Jump / Wall Jump</span><span class="kbd">Space / W / [A]</span></div>
        <div class="control-item"><span>Drop Through Platform</span><span class="kbd">S + Space</span></div>
        <div class="control-item"><span>3-Hit Combo Attack</span><span class="kbd">J / Click / [X]</span></div>
        <div class="control-item"><span>Air Dive Slam</span><span class="kbd">S + Attack (Mid-Air)</span></div>
        <div class="control-item"><span>Dodge Roll (i-frames)</span><span class="kbd">Shift / R-Click / [B]</span></div>
        <div class="control-item"><span>Hero Skill 1</span><span class="kbd">Q / U / [LB]</span></div>
        <div class="control-item"><span>Hero Skill 2</span><span class="kbd">E / I / [Y]</span></div>
        <div class="control-item"><span>Soul Overdrive (at 100%)</span><span class="kbd">V / L / M-Click</span></div>
        <div class="control-item"><span>Drink Healing Flask</span><span class="kbd">R / H / [LT]</span></div>
        <div class="control-item"><span>Interact (Altar / Chest / Portal)</span><span class="kbd">F / Up</span></div>
        <div class="control-item"><span>Waystone Fast-Travel</span><span class="kbd">Tab</span></div>
        <div class="control-item"><span>Pause / Resume</span><span class="kbd">Esc / Start</span></div>
        <div class="control-item"><span>Toggle Audio Mute</span><span class="kbd">M</span></div>
      </div>
      <div style="margin-top:14px;" class="card-desc">
        <strong>V2 Tip:</strong> Pair matching Relics to unlock <em>Relic Synergies</em>, absorb <em>Trinity Scrolls</em> to scale your build, and unleash <strong>Soul Overdrive [V]</strong> when your Soul Surge hits 100%!
      </div>
    `;
    panel.querySelector('[data-action="back"]')?.addEventListener('click', () => this.cb.onResume());
    return panel;
  }
}
