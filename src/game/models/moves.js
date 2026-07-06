const { pokemonDAL } = require('../database/dal')

function getMoveData(name) {
  const move = pokemonDAL.getMoveByName(name)
  if (!move) {
    return {
      name: name,
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
      effect.chance = (move.effectChance || 0) / 100
    } else if (move.effectType === 'flinch') {
      effect.flinch = true
      effect.chance = (move.effectChance || 0) / 100
    } else if (move.effectType === 'heal') {
      effect.heal = move.effectValue / 100
    } else if (move.effectType === 'recoil') {
      effect.recoil = move.effectValue / 100
    } else if (move.effectType === 'drain') {
      effect.drain = move.effectValue / 100
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

function getAllMoves() {
  return pokemonDAL.getAllMoves()
}

function getAllMovesAsMap() {
  return pokemonDAL.getAllMovesAsMap()
}

const MOVE_DATABASE = new Proxy({}, {
  get: function(target, name) {
    if (typeof name === 'string') {
      return getMoveData(name)
    }
    return target[name]
  }
})

module.exports = MOVE_DATABASE
module.exports.getMoveData = getMoveData
module.exports.getAllMoves = getAllMoves
module.exports.getAllMovesAsMap = getAllMovesAsMap