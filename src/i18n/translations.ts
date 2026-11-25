import type {
  AchievementDef,
  AchievementId,
  BiomeDef,
  BiomeId,
  CharacterDef,
  CharacterId,
  EnemyDef,
  EnemyId,
  Language,
  MetaUpgradeDef,
  MetaUpgradeId,
  RelicDef,
  RelicId,
  RelicRarity,
} from '../core/types.ts';
import type { RelicSynergy } from '../data/relics.ts';

let activeLanguage: Language = 'en';

export function getLanguage(): Language {
  return activeLanguage;
}

export function setActiveLanguage(lang: Language): void {
  activeLanguage = lang;
}

export function tr(en: string, es: string): string {
  return activeLanguage === 'es' ? es : en;
}

const RARITY_ES: Record<RelicRarity, string> = {
  common: 'COMUN',
  rare: 'RARA',
  cursed: 'MALDITA',
  legendary: 'LEGENDARIA',
};

export function locRarity(rarity: RelicRarity): string {
  return activeLanguage === 'es' ? RARITY_ES[rarity] : rarity.toUpperCase();
}

const SKILL_SHORT_ES: Record<string, string> = {
  'Aegis Parry': 'PARRY',
  'Judgement Cleave': 'TAJO',
  'Shadow Step': 'PASO',
  'Venom Fan': 'VENENO',
  'Cinder Pillar': 'PILAR',
  'Soul Nova': 'NOVA',
  Heavensfall: 'CAIDA',
  'Consecrated Banner': 'PENDON',
  'Chain Hook': 'GANCHO',
  'Crimson Whirlwind': 'TORBELL',
  'Reap & Harvest': 'SEGADA',
  'Bone Legion': 'LEGION',
};

export function locShortSkill(name: string, fallbackEn: string): string {
  if (activeLanguage === 'es') {
    return SKILL_SHORT_ES[name] ?? fallbackEn;
  }
  return fallbackEn;
}

const HERO_ES: Record<
  CharacterId,
  {
    title: string;
    archetype: string;
    description: string;
    passiveName: string;
    passiveDesc: string;
    skill1Name: string;
    skill1Desc: string;
    skill2Name: string;
    skill2Desc: string;
  }
> = {
  knight: {
    title: 'El Caballero Juramentado',
    archetype: 'Duelista de Vanguardia',
    description:
      'Centinela acorazado de la orden caída. Domina los bloqueos con escudo y combos amplios de mandoble.',
    passiveName: 'Bastión Firme',
    passiveDesc: 'Bloquear ataques desata una onda aturdidora dorada y potencia +35% el siguiente golpe.',
    skill1Name: 'Parada Égida',
    skill1Desc: 'Alza el broquel 0.7s. Bloquear un golpe contraataca con 2.4x de daño en área y aturde.',
    skill2Name: 'Tajo del Juicio',
    skill2Desc: 'Lanza una onda creciente radiante que atraviesa enemigos y rompe escudos.',
  },
  rogue: {
    title: 'La Hoja de la Plaga',
    archetype: 'Asesina Sombría',
    description:
      'Verduga veloz tras una máscara de plata. Embosca por la espalda con críticos garantizados y veneno.',
    passiveName: 'Emboscada Sombría',
    passiveDesc: 'Atacar por la espalda siempre asesta Crítico y aplica Veneno acumulable.',
    skill1Name: 'Paso Sombrío',
    skill1Desc: 'Teletranspórtate detrás del enemigo cercano dejando veneno y preparando un Crítico.',
    skill2Name: 'Abanico de Veneno',
    skill2Desc: 'Lanza 5 dagas envenenadas perforantes en un amplio abanico.',
  },
  pyromancer: {
    title: 'El Hereje de Ceniza',
    archetype: 'Piromante Arcano',
    description:
      'Erudito exiliado de la catedral que domina hechicería ígnea prohibida y un grimorio levitante.',
    passiveName: 'Alma de Ceniza',
    passiveDesc: 'Todos los ataques queman; los enemigos quemados detonan en llamas al morir.',
    skill1Name: 'Pilar de Brasas',
    skill1Desc: 'Invoca dos columnas de fuego frente a ti que calcinan y elevan a los enemigos.',
    skill2Name: 'Nova de Almas',
    skill2Desc: 'Detona un anillo explosivo de brasas a tu alrededor que empuja a todos los enemigos.',
  },
  templar: {
    title: 'La Templaria del Sol',
    archetype: 'Lancera Radiante',
    description:
      'Paladina de yelmo alado armada con alabarda consagrada y estandartes de guerra sagrados.',
    passiveName: 'Gracia Solar',
    passiveDesc: 'Cada 3.er remate del combo cura 3 PS y vuelve Vulnerables a los enemigos alcanzados.',
    skill1Name: 'Caída Celestial',
    skill1Desc: 'Salta al cielo y desciende con una onda radiante de alabarda que rompe escudos.',
    skill2Name: 'Estandarte Consagrado',
    skill2Desc: 'Planta un estandarte 6s que otorga +30% de daño y +2 PS/s al permanecer cerca.',
  },
  executioner: {
    title: 'El Verdugo',
    archetype: 'Coloso Carmesí',
    description:
      'Imponente ejecutor acorazado cuya hacha colosal destruye escudos y desgarra la carne.',
    passiveName: 'Sed de Sangre',
    passiveDesc: 'Cada baja restaura 4 PS y otorga +25% de daño de Furia durante 4 segundos.',
    skill1Name: 'Gancho Encadenado',
    skill1Desc: 'Lanza un pesado gancho de hierro que atrae enemigos lejanos y los aturde.',
    skill2Name: 'Torbellino Carmesí',
    skill2Desc: 'Gira tu gran hacha en una tempestad brutal que corta y hace sangrar a todos cerca.',
  },
  necromancer: {
    title: 'El Liche de la Tumba',
    archetype: 'Segador Espectral',
    description:
      'Soberano coronado de hueso y fuego esmeralda. Comanda una guadaña espectral y cráneos cazadores.',
    passiveName: 'Cosecha de Almas',
    passiveDesc: 'Abatir enemigos invoca un Cráneo Espectral teledirigido que caza enemigos cercanos.',
    skill1Name: 'Segar y Cosechar',
    skill1Desc: 'Amplio barrido de guadaña espectral que atraviesa escudos y drena 6 PS por impacto.',
    skill2Name: 'Legión Ósea',
    skill2Desc: 'Conjura 3 Cráneos Espectrales que persiguen y detonan sobre enemigos cercanos.',
  },
};

export function locHero(def: CharacterDef): CharacterDef {
  if (activeLanguage !== 'es') return def;
  const es = HERO_ES[def.id];
  return {
    ...def,
    title: es.title,
    archetype: es.archetype,
    description: es.description,
    passiveName: es.passiveName,
    passiveDesc: es.passiveDesc,
    skill1: { ...def.skill1, name: es.skill1Name, description: es.skill1Desc },
    skill2: { ...def.skill2, name: es.skill2Name, description: es.skill2Desc },
  };
}

const ENEMY_ES: Record<EnemyId, { name: string; title?: string; description: string }> = {
  skeleton: {
    name: 'Esqueleto Alzado',
    description: 'Soldado reanimado de la cripta armado con espada oxidada y embestida implacable.',
  },
  crossbowman: {
    name: 'Ballestero Maldito',
    description: 'Tirador no-muerto que mantiene distancia y dispara virotes de hierro veloces.',
  },
  ghoul: {
    name: 'Necrófago Infecto',
    description: 'Acechador rabioso que se agazapa antes de lanzarse con garras sangrantes.',
  },
  plague_rat: {
    name: 'Rata de la Plaga',
    description: 'Alimaña hinchada de veneno que infesta pasillos y estalla en nube tóxica al morir.',
  },
  gargoyle: {
    name: 'Gárgola de la Peste',
    description: 'Demonio alado de piedra que desciende en picada desde las vigas góticas.',
  },
  frost_wraith: {
    name: 'Espectro de Catedral',
    description: 'Espíritu translúcido que atraviesa muros y lanza proyectiles gélidos.',
  },
  dark_knight: {
    name: 'Caballero Oscuro',
    description: 'Centinela acorazado cuyo escudo bloquea golpes frontales ligeros. ¡Rueda detrás!',
  },
  cultist: {
    name: 'Cultista de Sangre',
    description: 'Nigromante levitante que se teletransporta y conjura orbes de sangre perseguidores.',
  },
  brute: {
    name: 'Bruto Quebrantahuesos',
    description: 'Ogro colosal con maza de hierro que provoca ondas de choque en el suelo.',
  },
  mimic: {
    name: 'Mímico Voraz',
    description: 'Cofre traicionero que cobra vida al acercarte, custodiando reliquias y oro.',
  },
  boss_inquisitor: {
    name: 'Garrick',
    title: 'El Inquisidor Encadenado',
    description: 'Carcelero fanático de la Cripta armado con incensario flameante y cadenas de fuego.',
  },
  boss_warden: {
    name: 'El Guardián Hueco',
    title: 'Custodio del Portal Quebrado',
    description: 'Titán espectral coronado que desata ondas de alma, lluvias de filos y embestidas.',
  },
  boss_sovereign: {
    name: 'Malgrim',
    title: 'El Soberano Carmesí',
    description: 'Rey Demonio de la Ciudadela de Obsidiana. Invoca meteoros, tajos y ejecuciones.',
  },
};

export function locEnemy(def: EnemyDef): EnemyDef {
  if (activeLanguage !== 'es') return def;
  const es = ENEMY_ES[def.id];
  return {
    ...def,
    name: es.name,
    title: es.title ?? def.title,
    description: es.description,
  };
}

const UPGRADE_ES: Record<
  MetaUpgradeId,
  { name: string; description: string; bonusPerRankLabel: string }
> = {
  vitality: {
    name: 'Vasija de Vitalidad',
    description: 'Fortalece tu cuerpo mortal con PS Máximos iniciales permanentes.',
    bonusPerRankLabel: '+15 PS Máx. por rango',
  },
  might: {
    name: 'Acero Templado',
    description: 'Canaliza Almas para potenciar el daño base de armas y habilidades.',
    bonusPerRankLabel: '+8% Daño Base por rango',
  },
  swiftness: {
    name: 'Paso Ligero',
    description: 'Aumenta la velocidad de movimiento por los salones malditos.',
    bonusPerRankLabel: '+5% Velocidad por rango',
  },
  alchemist: {
    name: 'Frasco Carmesí',
    description: 'Prepara cargas adicionales de curación antes de descender a la cripta.',
    bonusPerRankLabel: '+1 Carga de Frasco por rango',
  },
  soul_magnet: {
    name: 'Conducto de Almas',
    description: 'Amplía el radio de absorción y cosecha mayor esencia de Almas.',
    bonusPerRankLabel: '+12% Almas obtenidas por rango',
  },
  deaths_bargain: {
    name: 'Pacto con la Muerte',
    description: 'Conserva una mayor fracción de Almas no guardadas si caes en combate.',
    bonusPerRankLabel: '+15% Retención al morir',
  },
  executioners_luck: {
    name: 'Filo Certero',
    description: 'Agudiza tus instintos para asestar golpes críticos letales.',
    bonusPerRankLabel: '+4% Prob. Crítico por rango',
  },
  shadow_grace: {
    name: 'Gracia Sombría',
    description: 'Reduce la reutilización del rodar y de tus habilidades.',
    bonusPerRankLabel: '+6% Recarga de Habilidades por rango',
  },
  scroll_mastery: {
    name: 'Maestría en Pergaminos',
    description: 'Amplifica el poder obtenido de cada Pergamino de la Trinidad.',
    bonusPerRankLabel: '+20% Poder de Pergaminos por rango',
  },
  overdrive_vessel: {
    name: 'Receptáculo de Sobrecarga',
    description: 'Carga la Sobrecarga más rápido e inicia cada incursión con energía acumulada.',
    bonusPerRankLabel: '+15% Carga inicial y +15% Velocidad de carga',
  },
};

export function locUpgrade(def: MetaUpgradeDef): MetaUpgradeDef {
  if (activeLanguage !== 'es') return def;
  const es = UPGRADE_ES[def.id];
  return { ...def, ...es };
}

const RELIC_ES: Record<RelicId, { name: string; shortTag: string; description: string }> = {
  vampiric_fang: {
    name: 'Colmillo Vampírico',
    shortTag: 'ROBO DE VIDA',
    description: 'Los golpes críticos curan 3 PS.',
  },
  ember_brand: {
    name: 'Marca de Brasa',
    shortTag: 'QUEMADURA',
    description: 'Tus golpes aplican Quemadura (daño ígneo prolongado).',
  },
  venom_vial: {
    name: 'Vial de Veneno',
    shortTag: 'VENENO',
    description: 'Todos tus ataques aplican Veneno acumulable.',
  },
  windstrider_boots: {
    name: 'Botas del Viento',
    shortTag: 'MOVILIDAD',
    description: '+18% velocidad de movimiento y +1 salto aéreo adicional.',
  },
  executioners_seal: {
    name: 'Sello del Verdugo',
    shortTag: 'CRÍTICO',
    description: '+15% probabilidad de Crítico y +20% de daño en remates.',
  },
  soul_lantern: {
    name: 'Linterna de Almas',
    shortTag: 'ALMAS',
    description: '+40% Almas obtenidas al derrotar monstruos y jefes.',
  },
  aegis_shard: {
    name: 'Fragmento de Égida',
    shortTag: 'ESCUDO',
    description: 'Otorga +25 de Escudo máximo al inicio de cada bioma.',
  },
  storm_brand: {
    name: 'Marca de Tormenta',
    shortTag: 'RAYO',
    description: 'Los críticos desatan un arco eléctrico hacia un enemigo cercano.',
  },
  blood_chalice: {
    name: 'Cáliz de Sangre',
    shortTag: 'MALDITA',
    description: '+45% de daño total, pero reduce tus PS Máximos en un 25%.',
  },
  twin_echo: {
    name: 'Eco Gemelo',
    shortTag: 'RECARGA',
    description: '+25% velocidad de recarga de habilidades.',
  },
  iron_greaves: {
    name: 'Grebas de Hierro',
    shortTag: 'IMPACTO',
    description: 'El golpe picado aéreo es Crítico garantizado con mayor onda expansiva.',
  },
  glass_crown: {
    name: 'Corona de Cristal',
    shortTag: 'MALDITA',
    description: '+65% de daño total, pero recibes un 35% más de daño.',
  },
  frost_sigil: {
    name: 'Sello de Escarcha',
    shortTag: 'ESCARCHA',
    description: 'Tus ataques hielan a los enemigos, reduciendo su velocidad un 35%.',
  },
  phoenix_ash: {
    name: 'Ceniza de Fénix',
    shortTag: 'RENACER',
    description: 'Una vez por incursión, revive con 50% de PS en una explosión de fuego.',
  },
  cursed_scythe: {
    name: 'Filo de Guadaña Maldita',
    shortTag: 'SANGRADO',
    description: '+30% de daño y los críticos causan Sangrado, pero los frascos curan 25% menos.',
  },
  cinder_crown: {
    name: 'Corona de Ceniza',
    shortTag: 'EXPLOSIÓN',
    description: 'Los golpes críticos desatan una onda de fuego que quema enemigos cercanos.',
  },
  plague_censer: {
    name: 'Incensario de Peste',
    shortTag: 'MIASMA',
    description: 'Los enemigos abatidos liberan una nube tóxica que envenena a los cercanos.',
  },
  mirror_shield: {
    name: 'Escudo Espejo',
    shortTag: 'REFLEJO',
    description: 'Cada 8 segundos, bloquea y refleja automáticamente un proyectil enemigo.',
  },
  assassins_mark: {
    name: 'Marca del Asesino',
    shortTag: 'EMBOSCADA',
    description: 'Inflige +35% de daño extra contra enemigos con PS al máximo.',
  },
  berserker_pauldron: {
    name: 'Hombrera Berserker',
    shortTag: 'FURIA',
    description: 'Inflige +35% de daño extra mientras tengas menos del 50% de PS.',
  },
};

export function locRelic(def: RelicDef): RelicDef {
  if (activeLanguage !== 'es') return def;
  const es = RELIC_ES[def.id];
  return { ...def, ...es };
}

const SYNERGY_ES: Record<RelicSynergy['id'], { name: string; description: string }> = {
  hellfire: {
    name: 'Sinergia: Fuego Infernal',
    description: '2+ Reliquias de Fuego: la Quemadura inflige +50% de daño y dura más.',
  },
  plague_burst: {
    name: 'Sinergia: Pacto de Peste',
    description: '2+ Reliquias de Veneno: el Veneno inflige +50% de daño y se acumula más rápido.',
  },
  precision: {
    name: 'Sinergia: Filo Letal',
    description: '2+ Reliquias de Crítico: los golpes críticos infligen +25% de daño extra.',
  },
  bulwark: {
    name: 'Sinergia: Baluarte de Hierro',
    description: '2+ Reliquias de Defensa: el daño recibido se reduce un 15%.',
  },
};

export function locSynergy(syn: RelicSynergy): RelicSynergy {
  if (activeLanguage !== 'es') return syn;
  return { ...syn, ...SYNERGY_ES[syn.id] };
}

const BIOME_ES: Record<BiomeId, { name: string; subtitle: string }> = {
  sanctuary: { name: 'El Santuario Pálido', subtitle: 'Refugio Seguro de Almas Perdidas' },
  crypt: { name: 'Cripta del Prisionero', subtitle: 'Bioma I - Musgo y Cadenas Rotas' },
  catacombs: { name: 'Catacumbas de Sangre', subtitle: 'Bioma II - Bóvedas Carmesíes' },
  ossuary: { name: 'El Osario Infecto', subtitle: 'Bioma II Alt - Criptas Tóxicas y Espectros' },
  citadel: { name: 'Ciudadela de Obsidiana', subtitle: 'Bioma III - Trono de Malgrim' },
};

export function locBiome(def: BiomeDef): BiomeDef {
  if (activeLanguage !== 'es') return def;
  return { ...def, ...BIOME_ES[def.id] };
}

const ACHIEVEMENT_ES: Record<AchievementId, { name: string; description: string }> = {
  first_blood: {
    name: 'Primera Sangre',
    description: 'Abate a tu primer monstruo maldito en las profundidades.',
  },
  parry_master: {
    name: 'Réplica de Hierro',
    description: 'Realiza 3 paradas de escudo o reflejos en una sola incursión.',
  },
  inquisitor_slain: {
    name: 'Cadenas Rotas',
    description: 'Derrota a Garrick, El Inquisidor Encadenado en la Cripta.',
  },
  warden_slain: {
    name: 'Rompeportales',
    description: 'Derrota al Guardián Hueco que custodia las bóvedas profundas.',
  },
  sovereign_slain: {
    name: 'Matarreyes',
    description: 'Derroca a Malgrim, El Soberano Carmesí.',
  },
  killstreak_15: {
    name: 'Segador Implacable',
    description: 'Alcanza una racha de 15 bajas en una sola incursión.',
  },
  scroll_collector: {
    name: 'Erudito de la Trinidad',
    description: 'Absorbe al menos 4 Pergaminos de la Trinidad en una incursión.',
  },
  relic_synergy: {
    name: 'Confluencia Arcana',
    description: 'Activa una Sinergia emparejando Reliquias compatibles.',
  },
  hero_collector: {
    name: 'Hermandad de Cenizas',
    description: 'Desbloquea 4 o más héroes jugables en el Salón de Héroes.',
  },
  ossuary_survivor: {
    name: 'Caminante del Miasma',
    description: 'Adéntrate en El Osario Infecto por la ruta alterna.',
  },
  overdrive_unleashed: {
    name: 'Sobrecarga de Alma',
    description: 'Desata la Sobrecarga de Alma durante el combate.',
  },
  cursed_victor: {
    name: 'Conquistador Maldito',
    description: 'Derrota a Malgrim con Nivel de Maldición 1 o superior activo.',
  },
};

export function locAchievement(def: AchievementDef): AchievementDef {
  if (activeLanguage !== 'es') return def;
  return { ...def, ...ACHIEVEMENT_ES[def.id] };
}
