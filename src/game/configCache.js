const db = require('./database/db')

let typeChartCache = null
let statusEffectsCache = null
let rarityConfigCache = null
let rarityProbabilityCache = null
let collectionNamesCache = null
let medalsCache = null
let initialPokemonCache = null

async function loadTypeChart() {
  if (typeChartCache) return typeChartCache
  
  const rows = db.all('SELECT attacker_type, defender_type, multiplier FROM type_chart')
  const chart = {}
  
  for (const row of rows) {
    if (!chart[row.attacker_type]) {
      chart[row.attacker_type] = {}
    }
    chart[row.attacker_type][row.defender_type] = row.multiplier
  }
  
  for (const attacker of Object.keys(chart)) {
    const types = ['一般', '火', '水', '草', '电', '超能力', '冰', '龙', '恶', '妖精', '格斗', '飞行', '毒', '地面', '岩石', '虫', '幽灵', '钢']
    for (const defender of types) {
      if (chart[attacker][defender] === undefined) {
        chart[attacker][defender] = 1.0
      }
    }
  }
  
  typeChartCache = chart
  return chart
}

async function loadStatusEffects() {
  if (statusEffectsCache) return statusEffectsCache
  
  const rows = db.all('SELECT * FROM status_effects')
  const effects = {}
  
  for (const row of rows) {
    effects[row.status_key] = {
      name: row.name,
      damage: row.damage,
      message: row.message,
      lasts: row.lasts,
      attackMod: row.attack_mod,
      speedMod: row.speed_mod,
      skipTurn: row.skip_turn === 1,
      skipChance: row.skip_chance,
      grow: row.grow === 1,
      selfDamage: row.self_damage === 1,
      description: row.description
    }
  }
  
  statusEffectsCache = effects
  return effects
}

async function loadRarityConfig() {
  if (rarityConfigCache) return rarityConfigCache
  
  const rows = db.all('SELECT * FROM rarity_config')
  const config = {}
  
  for (const row of rows) {
    config[row.rarity_key] = {
      color: row.color,
      name: row.name,
      basePrice: row.base_price,
      description: row.description
    }
  }
  
  rarityConfigCache = config
  return config
}

async function loadRarityProbability() {
  if (rarityProbabilityCache) return rarityProbabilityCache
  
  const rows = db.all('SELECT difficulty, rarity_key, probability FROM rarity_probability')
  const config = {}
  
  for (const row of rows) {
    if (!config[row.difficulty]) {
      config[row.difficulty] = {}
    }
    config[row.difficulty][row.rarity_key] = row.probability
  }
  
  rarityProbabilityCache = config
  return config
}

async function loadCollectionNames() {
  if (collectionNamesCache) return collectionNamesCache
  
  const rows = db.all('SELECT rarity_key, name FROM collection_names')
  const names = {}
  
  for (const row of rows) {
    if (!names[row.rarity_key]) {
      names[row.rarity_key] = []
    }
    names[row.rarity_key].push(row.name)
  }
  
  collectionNamesCache = names
  return names
}

async function loadMedals() {
  if (medalsCache) return medalsCache
  
  const rows = db.all('SELECT medal_key, name, description, icon FROM medal_config')
  const medals = {}
  
  for (const row of rows) {
    medals[row.medal_key] = {
      name: row.name,
      description: row.description,
      icon: row.icon
    }
  }
  
  medalsCache = medals
  return medals
}

async function loadInitialPokemon() {
  if (initialPokemonCache) return initialPokemonCache
  
  const rows = db.all('SELECT pokemon_name, sort_order FROM initial_pokemon ORDER BY sort_order ASC')
  initialPokemonCache = rows.map(row => row.pokemon_name)
  return initialPokemonCache
}

async function loadAllConfigs() {
  await Promise.all([
    loadTypeChart(),
    loadStatusEffects(),
    loadRarityConfig(),
    loadRarityProbability(),
    loadCollectionNames(),
    loadMedals(),
    loadInitialPokemon()
  ])
  
  console.log('[ConfigCache] 所有配置已加载到缓存')
}

function clearCache() {
  typeChartCache = null
  statusEffectsCache = null
  rarityConfigCache = null
  rarityProbabilityCache = null
  collectionNamesCache = null
  medalsCache = null
  initialPokemonCache = null
  
  console.log('[ConfigCache] 缓存已清除')
}

module.exports = {
  loadTypeChart,
  loadStatusEffects,
  loadRarityConfig,
  loadRarityProbability,
  loadCollectionNames,
  loadMedals,
  loadInitialPokemon,
  loadAllConfigs,
  clearCache
}