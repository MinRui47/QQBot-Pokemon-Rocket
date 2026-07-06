const { pokemonDAL } = require('./database/dal')

let movesCache = null
let pokemonCache = null

async function ensureDbInit() {
  const db = require('./database/db')
  await db.init()
}

async function getMovesDatabase() {
  if (movesCache) return movesCache
  
  await ensureDbInit()
  movesCache = pokemonDAL.getAllMovesAsMap()
  return movesCache
}

async function getPokemonDatabase() {
  if (pokemonCache) return pokemonCache
  
  await ensureDbInit()
  const pokemons = pokemonDAL.getAllPokemons()
  pokemonCache = {}
  for (const p of pokemons) {
    pokemonCache[p.name] = p
  }
  return pokemonCache
}

async function getMoveData(moveName) {
  const moves = await getMovesDatabase()
  const move = moves[moveName]
  
  if (!move) {
    return {
      name: moveName,
      power: 40,
      accuracy: 100,
      pp: 35,
      type: '一般',
      category: 'physical',
      effect: null,
      description: '未知技能'
    }
  }
  
  const effect = {}
  if (move.effectType) {
    effect.effectType = move.effectType
    
    if (move.effectType === 'stat_drop') {
      effect.statDrop = move.effectStat
      effect.amount = move.effectValue
    } else if (move.effectType === 'stat_boost') {
      effect.statBoost = move.effectStat
      effect.amount = move.effectValue
    } else if (move.effectType === 'status') {
      effect.status = move.effectStat
      effect.chance = move.effectChance / 100
    } else if (move.effectType === 'flinch') {
      effect.flinch = true
      effect.chance = move.effectChance / 100
    } else if (move.effectType === 'heal') {
      effect.heal = move.effectValue / 100
    } else if (move.effectType === 'recoil') {
      effect.recoil = move.effectValue / 100
    } else if (move.effectType === 'drain') {
      effect.drain = move.effectValue / 100
    } else if (move.effectType === 'damage') {
      effect.power = move.effectValue
    }
  }
  
  if (move.priority !== undefined && move.priority !== 0) {
    effect.priority = move.priority
  }
  
  if (move.hits !== undefined && move.hits !== 0) {
    effect.hits = move.hits
  }
  
  if (move.effectChance && !effect.chance) {
    effect.chance = move.effectChance / 100
  }
  
  const finalEffect = Object.keys(effect).length > 0 ? effect : null
  
  return {
    name: move.name,
    power: move.power || 0,
    accuracy: move.accuracy || 100,
    pp: move.pp || 10,
    type: move.type || '一般',
    category: move.category || 'physical',
    effect: finalEffect,
    description: move.effect || '',
    priority: move.priority || 0,
    hits: move.hits || 0
  }
}

async function getPokemonData(name) {
  const pokemons = await getPokemonDatabase()
  return pokemons[name] || null
}

async function getPokemonLevelMoves(pokemonName, level) {
  await ensureDbInit()
  const pokemon = pokemonDAL.getPokemonByName(pokemonName)
  if (!pokemon) return ['撞击']
  
  const levelMoves = pokemonDAL.getPokemonLevelMoves(pokemon.id)
  const movesAtLevel = levelMoves.filter(m => m.level <= level).map(m => m.name)
  
  if (movesAtLevel.length === 0) {
    movesAtLevel.push('撞击')
  }
  
  return movesAtLevel
}

async function getPokemonTMs(pokemonName) {
  await ensureDbInit()
  const pokemon = pokemonDAL.getPokemonByName(pokemonName)
  if (!pokemon) return []
  
  return pokemonDAL.getPokemonTMs(pokemon.id).map(m => m.name)
}

async function getPokemonTypes(name) {
  const data = await getPokemonData(name)
  if (!data) return ['一般']
  
  const types = []
  if (data.type1) types.push(data.type1)
  if (data.type2 && data.type2 !== data.type1) types.push(data.type2)
  
  return types.length > 0 ? types : ['一般']
}

async function getPokemonRarity(name) {
  const data = await getPokemonData(name)
  if (!data) return 'common'
  
  const legendary = data.legendaryCategory
  if (legendary === 'legendary' || legendary === 'mythical') return 'legendary'
  if (legendary === 'pseudo_legendary') return 'epic'
  
  return 'common'
}

async function getPokemonBaseStats(name) {
  const data = await getPokemonData(name)
  if (!data) return null
  
  return {
    HP: data.baseStats?.HP || data.hpBase || 40,
    攻击: data.baseStats?.攻击 || data.attackBase || 40,
    防御: data.baseStats?.防御 || data.defenseBase || 40,
    特攻: data.baseStats?.特攻 || data.spAttackBase || 40,
    特防: data.baseStats?.特防 || data.spDefenseBase || 40,
    速度: data.baseStats?.速度 || data.speedBase || 40
  }
}

async function getPokemonCaptureRate(name) {
  const data = await getPokemonData(name)
  if (!data) return 100
  return data.captureRate || 100
}

function clearCache() {
  movesCache = null
  pokemonCache = null
}

module.exports = {
  getMovesDatabase,
  getPokemonDatabase,
  getMoveData,
  getPokemonData,
  getPokemonLevelMoves,
  getPokemonTMs,
  getPokemonTypes,
  getPokemonRarity,
  getPokemonBaseStats,
  getPokemonCaptureRate,
  clearCache,
  ensureDbInit
}