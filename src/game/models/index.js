const { Player } = require('./Player')
const { Backpack } = require('./Backpack')
const { Belt } = require('./Belt')
const { ITEM_CONFIG, RARITY_COLORS, MEDALS, INITIAL_POKEMON } = require('../config')
const { getPokemonData, getPokemonLevelMoves, getPokemonTMs, getMoveData, getPokemonTypes, getPokemonRarity, getPokemonBaseStats, getPokemonCaptureRate, ensureDbInit } = require('../dataService')
const { pokemonDAL, ensureDbInit: ensureDalDbInit } = require('../database/dal')

ensureDalDbInit().catch(err => console.error('[DB] 初始化失败:', err))

const TYPE_CHART = {
  '一般': { 一般: 1, 火: 1, 水: 1, 电: 1, 草: 1, 冰: 1, 格斗: 1, 毒: 1, 地面: 1, 飞行: 1, 超能力: 1, 虫: 1, 岩石: 0.5, 幽灵: 0, 龙: 1, 恶: 1, 钢: 0.5, 妖精: 1 },
  '火': { 一般: 1, 火: 0.5, 水: 0.5, 电: 1, 草: 2, 冰: 2, 格斗: 1, 毒: 1, 地面: 1, 飞行: 1, 超能力: 1, 虫: 2, 岩石: 0.5, 幽灵: 1, 龙: 0.5, 恶: 1, 钢: 2, 妖精: 1 },
  '水': { 一般: 1, 火: 2, 水: 0.5, 电: 0.5, 草: 0.5, 冰: 1, 格斗: 1, 毒: 1, 地面: 2, 飞行: 1, 超能力: 1, 虫: 1, 岩石: 2, 幽灵: 1, 龙: 0.5, 恶: 1, 钢: 1, 妖精: 1 },
  '电': { 一般: 1, 火: 1, 水: 2, 电: 0.5, 草: 0.5, 冰: 1, 格斗: 1, 毒: 1, 地面: 0, 飞行: 2, 超能力: 1, 虫: 1, 岩石: 1, 幽灵: 1, 龙: 0.5, 恶: 1, 钢: 1, 妖精: 1 },
  '草': { 一般: 1, 火: 0.5, 水: 2, 电: 1, 草: 0.5, 冰: 0.5, 格斗: 1, 毒: 0.5, 地面: 2, 飞行: 0.5, 超能力: 1, 虫: 0.5, 岩石: 2, 幽灵: 1, 龙: 0.5, 恶: 1, 钢: 0.5, 妖精: 1 },
  '冰': { 一般: 1, 火: 0.5, 水: 0.5, 电: 1, 草: 2, 冰: 0.5, 格斗: 1, 毒: 1, 地面: 2, 飞行: 2, 超能力: 1, 虫: 1, 岩石: 1, 幽灵: 1, 龙: 2, 恶: 1, 钢: 0.5, 妖精: 1 },
  '格斗': { 一般: 2, 火: 1, 水: 1, 电: 1, 草: 1, 冰: 2, 格斗: 1, 毒: 0.5, 地面: 1, 飞行: 0.5, 超能力: 0.5, 虫: 1, 岩石: 2, 幽灵: 0, 龙: 1, 恶: 2, 钢: 2, 妖精: 0.5 },
  '毒': { 一般: 1, 火: 1, 水: 1, 电: 1, 草: 2, 冰: 1, 格斗: 1, 毒: 0.5, 地面: 0.5, 飞行: 1, 超能力: 1, 虫: 1, 岩石: 0.5, 幽灵: 1, 龙: 1, 恶: 1, 钢: 0, 妖精: 2 },
  '地面': { 一般: 1, 火: 2, 水: 1, 电: 2, 草: 0.5, 冰: 1, 格斗: 1, 毒: 2, 地面: 1, 飞行: 0, 超能力: 1, 虫: 0.5, 岩石: 2, 幽灵: 1, 龙: 1, 恶: 1, 钢: 2, 妖精: 1 },
  '飞行': { 一般: 1, 火: 1, 水: 1, 电: 0.5, 草: 2, 冰: 0.5, 格斗: 2, 毒: 1, 地面: 2, 飞行: 1, 超能力: 1, 虫: 2, 岩石: 0.5, 幽灵: 1, 龙: 1, 恶: 1, 钢: 0.5, 妖精: 1 },
  '超能力': { 一般: 1, 火: 1, 水: 1, 电: 1, 草: 1, 冰: 1, 格斗: 2, 毒: 2, 地面: 1, 飞行: 1, 超能力: 0.5, 虫: 1, 岩石: 1, 幽灵: 1, 龙: 1, 恶: 0, 钢: 0.5, 妖精: 1 },
  '虫': { 一般: 1, 火: 0.5, 水: 1, 电: 1, 草: 2, 冰: 1, 格斗: 0.5, 毒: 0.5, 地面: 1, 飞行: 0.5, 超能力: 2, 虫: 1, 岩石: 1, 幽灵: 0.5, 龙: 1, 恶: 2, 钢: 0.5, 妖精: 0.5 },
  '岩石': { 一般: 1, 火: 2, 水: 0.5, 电: 1, 草: 0.5, 冰: 2, 格斗: 0.5, 毒: 2, 地面: 0.5, 飞行: 2, 超能力: 1, 虫: 2, 岩石: 1, 幽灵: 1, 龙: 1, 恶: 1, 钢: 0.5, 妖精: 1 },
  '幽灵': { 一般: 0, 火: 1, 水: 1, 电: 1, 草: 1, 冰: 1, 格斗: 1, 毒: 1, 地面: 1, 飞行: 1, 超能力: 2, 虫: 1, 岩石: 1, 幽灵: 2, 龙: 1, 恶: 0.5, 钢: 1, 妖精: 1 },
  '龙': { 一般: 1, 火: 1, 水: 1, 电: 1, 草: 1, 冰: 0.5, 格斗: 1, 毒: 1, 地面: 1, 飞行: 1, 超能力: 1, 虫: 1, 岩石: 1, 幽灵: 1, 龙: 2, 恶: 1, 钢: 0.5, 妖精: 0 },
  '恶': { 一般: 1, 火: 1, 水: 1, 电: 1, 草: 1, 冰: 1, 格斗: 0.5, 毒: 1, 地面: 1, 飞行: 1, 超能力: 2, 虫: 1, 岩石: 1, 幽灵: 2, 龙: 1, 恶: 0.5, 钢: 1, 妖精: 0.5 },
  '钢': { 一般: 1, 火: 0.5, 水: 0.5, 电: 0.5, 草: 1, 冰: 2, 格斗: 1, 毒: 1, 地面: 1, 飞行: 1, 超能力: 1, 虫: 1, 岩石: 2, 幽灵: 1, 龙: 1, 恶: 1, 钢: 0.5, 妖精: 2 },
  '妖精': { 一般: 1, 火: 0.5, 水: 1, 电: 1, 草: 1, 冰: 1, 格斗: 2, 毒: 0.5, 地面: 1, 飞行: 1, 超能力: 1, 虫: 1, 岩石: 1, 幽灵: 1, 龙: 2, 恶: 2, 钢: 0.5, 妖精: 1 }
}

const STATUS_EFFECTS = {
  '中毒': { damage: 0.125, message: '中毒了', skipTurn: false },
  '剧毒': { damage: 0.25, message: '中了剧毒', skipTurn: false, grow: true },
  '灼伤': { damage: 0.125, message: '被灼伤了', skipTurn: false, attackMod: 0.5 },
  '麻痹': { damage: 0, message: '被麻痹了', skipTurn: true, speedMod: 0.5, fullSkipChance: 0.25 },
  '睡眠': { damage: 0, message: '睡着了', skipTurn: true, turns: 3 },
  '冰冻': { damage: 0, message: '被冰冻了', skipTurn: true, thawChance: 0.2 }
}

function getTypeMultiplier(moveType, defenderTypes) {
  let multiplier = 1
  for (const type of defenderTypes) {
    multiplier *= TYPE_CHART[moveType]?.[type] !== undefined ? TYPE_CHART[moveType][type] : 1
  }
  return multiplier
}

function getTypeEffectivenessText(multiplier) {
  if (multiplier === 0) return '没有效果'
  if (multiplier >= 4) return '效果绝佳'
  if (multiplier >= 2) return '效果拔群'
  if (multiplier <= 0.25) return '效果极差'
  if (multiplier <= 0.5) return '效果不佳'
  return ''
}

function generateIVs(isShiny = false) {
  const iv = () => isShiny ? 31 : Math.floor(Math.random() * 32)
  return {
    HP: iv(),
    攻击: iv(),
    防御: iv(),
    特攻: iv(),
    特防: iv(),
    速度: iv()
  }
}

class Pokemon {
  constructor(name, levelOrOptions, options = {}) {
    let level
    if (typeof levelOrOptions === 'object') {
      level = levelOrOptions.level || 5
      options = { ...levelOrOptions }
      delete options.level
    } else {
      level = levelOrOptions
    }
    
    const dbPokemon = pokemonDAL.getPokemonByName(name)
    if (!dbPokemon) {
      throw new Error(`未找到宝可梦数据: ${name}`)
    }
    
    const baseStats = {
      HP: dbPokemon.hpBase || 40,
      攻击: dbPokemon.attackBase || 40,
      防御: dbPokemon.defenseBase || 40,
      特攻: dbPokemon.spAttackBase || 40,
      特防: dbPokemon.spDefenseBase || 40,
      速度: dbPokemon.speedBase || 40
    }
    
    const types = []
    if (dbPokemon.type1) types.push(dbPokemon.type1)
    if (dbPokemon.type2 && dbPokemon.type2 !== dbPokemon.type1) types.push(dbPokemon.type2)
    
    const legendary = dbPokemon.legendaryCategory
    let rarity = 'common'
    if (legendary === 'legendary' || legendary === 'mythical') rarity = 'legendary'
    else if (legendary === 'pseudo_legendary') rarity = 'epic'
    
    this.name = name
    this.level = level
    this.isInitial = options.isInitial || false
    this.isRented = options.isRented || false
    this.rarity = rarity
    
    this.baseData = dbPokemon
    this.types = types.length > 0 ? types : ['一般']
    this.baseStats = baseStats
    this.growthRate = dbPokemon.growthRate || 'medium'
    this.evolution = this._parseEvolutionChain(dbPokemon.evolutionChain)
    this.megaData = null
    
    this.isMega = options.isMega || false
    this.megaStone = options.megaStone || null
    
    this.ivs = options.ivs || generateIVs(options.isShiny)
    
    this.evs = options.evs || {
      HP: 0,
      攻击: 0,
      防御: 0,
      特攻: 0,
      特防: 0,
      速度: 0
    }
    
    this.affection = options.affection !== undefined ? options.affection : 70
    this.friendship = options.friendship !== undefined ? options.friendship : 70
    this.holdingItem = options.holdingItem || null
    
    this.experience = options.experience || this._calculateExpForLevel(level)
    this.experienceToNext = this._calculateExpToNext()
    
    this.stats = this._calculateStats()
    this.maxHp = this.stats.HP
    this.hp = options.hp !== undefined ? options.hp : this.maxHp
    
    this.status = options.status || null
    this.statusTurns = 0
    
    this.moves = options.moves || this._initializeMoves()
    this.maxMoves = 4
    
    this.movePP = options.movePP || this._initializePP()
    
    this.statBoosts = {
      攻击: 0,
      防御: 0,
      特攻: 0,
      特防: 0,
      速度: 0,
      命中: 0,
      闪避: 0
    }
    
    this.hasMegaEvolved = false
    this._maxLevel = options.maxLevel || 100
    
    this.dbId = options.dbId || null
  }
  
  static async fromDatabase(dbId) {
    const database = require('../database/db')
    await database.init()
    
    const pp = database.get(`
      SELECT * FROM personal_pokemon WHERE id = ?
    `, [dbId])
    
    if (!pp) return null
    
    const pokemon = database.get('SELECT * FROM pokemons WHERE id = ?', [pp.pokemon_id])
    if (!pokemon) return null
    
    const options = {
      dbId: pp.id,
      level: pp.level,
      hp: pp.hp,
      status: pp.status,
      holdingItem: pp.holding_item,
      moves: JSON.parse(pp.moves || '[]'),
      movePP: JSON.parse(pp.move_pp || '[]'),
      experience: pp.experience,
      isInitial: pp.is_initial === 1,
      isRented: pp.is_rented === 1,
      isShiny: pp.is_shiny === 1,
      nickname: pp.nickname,
      affection: pp.affection,
      friendship: pp.friendship,
      ivs: {
        HP: pp.iv_hp,
        攻击: pp.iv_attack,
        防御: pp.iv_defense,
        特攻: pp.iv_sp_attack,
        特防: pp.iv_sp_defense,
        速度: pp.iv_speed
      },
      evs: {
        HP: pp.ev_hp,
        攻击: pp.ev_attack,
        防御: pp.ev_defense,
        特攻: pp.ev_sp_attack,
        特防: pp.ev_sp_defense,
        速度: pp.ev_speed
      }
    }
    
    return new Pokemon(pokemon.name, options)
  }
  
  async saveToDatabase(userId = null, npcId = null) {
    const database = require('../database/db')
    await database.init()
    
    const pokemon = database.get('SELECT id FROM pokemons WHERE name = ?', [this.name])
    if (!pokemon) return null
    
    const stats = this.stats
    
    if (this.dbId) {
      database.run(`
        UPDATE personal_pokemon SET
          level = ?,
          iv_hp = ?, iv_attack = ?, iv_defense = ?, iv_sp_attack = ?, iv_sp_defense = ?, iv_speed = ?,
          ev_hp = ?, ev_attack = ?, ev_defense = ?, ev_sp_attack = ?, ev_sp_defense = ?, ev_speed = ?,
          friendship = ?, affection = ?, experience = ?,
          hp = ?, max_hp = ?, attack = ?, defense = ?, sp_attack = ?, sp_defense = ?, speed = ?,
          status = ?, holding_item = ?, moves = ?, move_pp = ?,
          is_shiny = ?, is_initial = ?, is_rented = ?, nickname = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        this.level,
        this.ivs.HP, this.ivs.攻击, this.ivs.防御, this.ivs.特攻, this.ivs.特防, this.ivs.速度,
        this.evs.HP, this.evs.攻击, this.evs.防御, this.evs.特攻, this.evs.特防, this.evs.速度,
        this.friendship, this.affection, this.experience,
        this.hp, stats.HP, stats.攻击, stats.防御, stats.特攻, stats.特防, stats.速度,
        this.status, this.holdingItem,
        JSON.stringify(this.moves), JSON.stringify(this.movePP),
        this.isShiny ? 1 : 0, this.isInitial ? 1 : 0, this.isRented ? 1 : 0, this.nickname,
        this.dbId
      ])
    } else {
      database.run(`
        INSERT INTO personal_pokemon (
          pokemon_id, user_id, npc_id, level,
          iv_hp, iv_attack, iv_defense, iv_sp_attack, iv_sp_defense, iv_speed,
          ev_hp, ev_attack, ev_defense, ev_sp_attack, ev_sp_defense, ev_speed,
          friendship, affection, experience,
          hp, max_hp, attack, defense, sp_attack, sp_defense, speed,
          status, holding_item, moves, move_pp,
          is_shiny, is_initial, is_rented, nickname
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        pokemon.id, userId, npcId, this.level,
        this.ivs.HP, this.ivs.攻击, this.ivs.防御, this.ivs.特攻, this.ivs.特防, this.ivs.速度,
        this.evs.HP, this.evs.攻击, this.evs.防御, this.evs.特攻, this.evs.特防, this.evs.速度,
        this.friendship, this.affection, this.experience,
        this.hp, stats.HP, stats.攻击, stats.防御, stats.特攻, stats.特防, stats.速度,
        this.status, this.holdingItem,
        JSON.stringify(this.moves), JSON.stringify(this.movePP),
        this.isShiny ? 1 : 0, this.isInitial ? 1 : 0, this.isRented ? 1 : 0, this.nickname
      ])
      
      this.dbId = database.get('SELECT last_insert_rowid() as id').id
    }
    
    return this.dbId
  }
  
  getIVTotal() {
    return Object.values(this.ivs).reduce((sum, val) => sum + val, 0)
  }
  
  getIVPercentage() {
    return Math.floor((this.getIVTotal() / 186) * 100)
  }
  
  getEVTotal() {
    return Object.values(this.evs).reduce((sum, val) => sum + val, 0)
  }
  
  _calculateStats() {
    const stats = {}
    const baseStats = this.isMega && this.megaData ? this.megaData.baseStats : this.baseStats
    
    for (const [stat, base] of Object.entries(baseStats)) {
      const iv = this.ivs[stat] || 0
      const ev = this.evs[stat] || 0
      const level = this.level
      
      if (stat === 'HP') {
        stats[stat] = Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + level + 10
      } else {
        stats[stat] = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level / 100) + 5)
      }
    }
    
    return stats
  }
  
  getStat(stat) {
    const baseStat = this.stats[stat] || 0
    const boost = this.statBoosts[stat] || 0
    return this._applyStatBoost(baseStat, boost)
  }
  
  _applyStatBoost(stat, boost) {
    if (boost === 0) return stat
    if (boost > 0) {
      const multiplier = (2 + boost) / 2
      return Math.floor(stat * multiplier)
    } else {
      const multiplier = 2 / (2 + Math.abs(boost))
      return Math.floor(stat * multiplier)
    }
  }
  
  getSpeed() {
    return this.getStat('速度')
  }
  
  getAttack() {
    return this.getStat('攻击')
  }
  
  getDefense() {
    return this.getStat('防御')
  }
  
  getSpecialAttack() {
    return this.getStat('特攻')
  }
  
  getSpecialDefense() {
    return this.getStat('特防')
  }
  
  _calculateExpForLevel(level) {
    return Math.floor(0.8 * Math.pow(level, 3))
  }
  
  _calculateExpToNext() {
    const nextLevelExp = this._calculateExpForLevel(this.level + 1)
    return nextLevelExp - this.experience
  }
  
  addExperience(exp, options = {}) {
    if (exp <= 0) {
      return { leveledUp: false, gained: 0, blocked: false }
    }
    
    const maxAllowedLevel = options.maxLevel !== undefined ? options.maxLevel : this._maxLevel
    
    if (this.level >= maxAllowedLevel) {
      return { leveledUp: false, gained: 0, blocked: true, reason: `宝可梦已达到当前地图的等级上限 ${maxAllowedLevel}，无法继续获得经验` }
    }
    
    this.experience += exp
    const targetLevel = Math.min(maxAllowedLevel, this._getLevelFromExp(this.experience))
    
    if (targetLevel <= this.level) {
      this.experienceToNext = this._calculateExpToNext()
      return { leveledUp: false, gained: exp, blocked: false }
    }
    
    const levelsGained = targetLevel - this.level
    this.level = targetLevel
    this.stats = this._calculateStats()
    this.maxHp = this.stats.HP
    this.hp = Math.min(this.maxHp, this.hp + (this.maxHp * 0.25))
    this.experienceToNext = this._calculateExpToNext()
    this._checkLevelUpMoves()
    
    return {
      leveledUp: true,
      levelsGained,
      gained: exp,
      learnableMoves: this._getNewMovesAtLevel(targetLevel),
      blocked: false
    }
  }
  
  setMaxLevel(maxLevel) {
    this._maxLevel = maxLevel
  }
  
  canLevelUpMore(maxLevel) {
    const limit = maxLevel !== undefined ? maxLevel : this._maxLevel
    return this.level < limit
  }
  
  useRareCandy(targetLevel, mapMaxLevel) {
    if (this.isMega) {
      return { success: false, message: '超级进化的宝可梦无法使用神奇糖果' }
    }
    
    const limit = mapMaxLevel !== undefined ? mapMaxLevel : this._maxLevel
    
    if (this.level >= limit) {
      return {
        success: false,
        message: `宝可梦等级 (${this.level}) 已达到或超过当前地图等级上限 (${limit})，无法使用神奇糖果！需要到更高等级的地图才能继续提升。`
      }
    }
    
    if (targetLevel !== undefined && targetLevel > limit) {
      return {
        success: false,
        message: `目标等级 ${targetLevel} 超过当前地图等级上限 ${limit}，无法使用神奇糖果！`
      }
    }
    
    const newLevel = Math.min(limit, targetLevel !== undefined ? targetLevel : this.level + 1)
    const oldLevel = this.level
    this.level = newLevel
    this.experience = this._calculateExpForLevel(newLevel)
    this.stats = this._calculateStats()
    this.maxHp = this.stats.HP
    this.hp = Math.min(this.maxHp, this.hp)
    this.experienceToNext = this._calculateExpToNext()
    this._checkLevelUpMoves()
    
    return {
      success: true,
      message: `${this.name} 使用了神奇糖果，等级从 ${oldLevel} 提升到 ${newLevel}！`,
      oldLevel,
      newLevel,
      levelsGained: newLevel - oldLevel,
      learnableMoves: this._getNewMovesAtLevel(newLevel)
    }
  }
  
  _getLevelFromExp(exp) {
    let level = 1
    while (level < 100 && this._calculateExpForLevel(level + 1) <= exp) {
      level++
    }
    return level
  }
  
  _checkLevelUpMoves() {
    const allMoves = pokemonDAL.getPokemonLevelMoves(this.baseData.id).filter(m => m.level <= this.level).map(m => m.name)
    const previousMoves = pokemonDAL.getPokemonLevelMoves(this.baseData.id).filter(m => m.level <= this.level - 1).map(m => m.name)
    
    const newMoves = allMoves.filter(m => !previousMoves.includes(m))
    
    if (newMoves.length > 0) {
      for (const moveName of newMoves) {
        this.learnMove(moveName)
      }
    }
  }
  
  _getNewMovesAtLevel(level) {
    const allMoves = pokemonDAL.getPokemonLevelMoves(this.baseData.id).filter(m => m.level <= level).map(m => m.name)
    const previousMoves = pokemonDAL.getPokemonLevelMoves(this.baseData.id).filter(m => m.level <= level - 1).map(m => m.name)
    
    return allMoves.filter(m => !previousMoves.includes(m))
  }
  
  learnMove(moveName) {
    const moveData = pokemonDAL.getMoveByName(moveName)
    if (!moveData) return false
    
    if (this.moves.length < this.maxMoves) {
      this.moves.push(moveName)
      this.movePP[moveName] = moveData.pp || 10
      return true
    }
    
    return { needReplace: true, newMove: moveName }
  }
  
  replaceMove(oldIndex, newMoveName) {
    if (oldIndex < 0 || oldIndex >= this.moves.length) return false
    const moveData = pokemonDAL.getMoveByName(newMoveName)
    if (!moveData) return false
    const oldMove = this.moves[oldIndex]
    if (oldMove) {
      delete this.movePP[oldMove]
    }
    this.moves[oldIndex] = newMoveName
    this.movePP[newMoveName] = moveData.pp || 10
    return true
  }
  
  _parseEvolutionChain(evolutionChain) {
    if (!evolutionChain || !Array.isArray(evolutionChain) || evolutionChain.length === 0) {
      return null
    }
    
    const currentIndex = evolutionChain.findIndex(e => e.name === this.name)
    if (currentIndex === -1 || currentIndex >= evolutionChain.length - 1) {
      return null
    }
    
    const nextStage = evolutionChain[currentIndex + 1]
    const condition = nextStage.condition || ''
    const levelMatch = condition.match(/等级(\d+)以上/)
    const level = levelMatch ? parseInt(levelMatch[1]) : 16
    
    return {
      level: level,
      into: nextStage.name,
      method: levelMatch ? 'level' : 'item',
      item: levelMatch ? null : condition
    }
  }
  
  _initializeMoves() {
    const levelMoves = pokemonDAL.getPokemonLevelMoves(this.baseData.id)
    const available = levelMoves.filter(m => m.level <= this.level).map(m => m.name)
    
    if (available.length === 0) {
      return ['撞击']
    }
    
    return available.slice(-this.maxMoves)
  }
  
  _initializePP() {
    const pp = {}
    for (const moveName of this.moves) {
      const moveData = pokemonDAL.getMoveByName(moveName)
      pp[moveName] = moveData ? moveData.pp : 10
    }
    return pp
  }
  
  getMovePP(moveName) {
    return this.movePP[moveName] || 0
  }
  
  getMoveMaxPP(moveName) {
    const moveData = pokemonDAL.getMoveByName(moveName)
    return moveData ? moveData.pp : 10
  }
  
  useMovePP(moveName) {
    if (this.movePP[moveName] === undefined) {
      const moveData = pokemonDAL.getMoveByName(moveName)
      this.movePP[moveName] = moveData ? moveData.pp : 10
    }
    if (this.movePP[moveName] > 0) {
      this.movePP[moveName]--
      return true
    }
    return false
  }
  
  restoreMovePP(moveName) {
    const moveData = pokemonDAL.getMoveByName(moveName)
    if (moveData) {
      this.movePP[moveName] = moveData.pp
      return true
    }
    return false
  }
  
  restoreAllPP() {
    for (const moveName of this.moves) {
      this.restoreMovePP(moveName)
    }
  }
  
  hasUsableMove() {
    return this.moves.some(m => this.getMovePP(m) > 0)
  }
  
  getRandomUsableMove() {
    const usable = this.moves.filter(m => this.getMovePP(m) > 0)
    if (usable.length === 0) return null
    return usable[Math.floor(Math.random() * usable.length)]
  }
  
  addEVs(evGain) {
    const totalBefore = this.getEVTotal()
    for (const [stat, gain] of Object.entries(evGain)) {
      if (gain > 0) {
        const currentEv = this.evs[stat] || 0
        const newEv = Math.min(252, currentEv + gain)
        this.evs[stat] = newEv
      }
    }
    const totalAfter = this.getEVTotal()
    if (totalAfter > 510) {
      const overflow = totalAfter - 510
      for (const stat of Object.keys(this.evs)) {
        if (this.evs[stat] >= overflow) {
          this.evs[stat] -= overflow
          break
        }
      }
    }
    this.stats = this._calculateStats()
    this.maxHp = this.stats.HP
  }
  
  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount)
  }
  
  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount)
  }
  
  isFainted() {
    return this.hp <= 0
  }
  
  resetStatBoosts() {
    this.statBoosts = {
      攻击: 0,
      防御: 0,
      特攻: 0,
      特防: 0,
      速度: 0,
      命中: 0,
      闪避: 0
    }
  }
  
  applyStatus(status) {
    if (this.status) return false
    this.status = status
    this.statusTurns = 0
    return true
  }
  
  cureStatus() {
    this.status = null
    this.statusTurns = 0
  }
  
  canEvolve() {
    if (!this.evolution) return false
    if (this.isMega) return false
    return this.level >= this.evolution.level
  }
  
  evolve() {
    if (!this.canEvolve()) return false
    
    const oldName = this.name
    const newName = this.evolution.into
    const newBaseData = pokemonDAL.getPokemonByName(newName)
    
    if (!newBaseData) return false
    
    this.name = newName
    this.baseData = newBaseData
    
    this.baseStats = {
      HP: newBaseData.hpBase || newBaseData.baseStats?.HP || 40,
      攻击: newBaseData.attackBase || newBaseData.baseStats?.攻击 || 40,
      防御: newBaseData.defenseBase || newBaseData.baseStats?.防御 || 40,
      特攻: newBaseData.spAttackBase || newBaseData.baseStats?.特攻 || 40,
      特防: newBaseData.spDefenseBase || newBaseData.baseStats?.特防 || 40,
      速度: newBaseData.speedBase || newBaseData.baseStats?.速度 || 40
    }
    
    this.types = []
    if (newBaseData.type1) this.types.push(newBaseData.type1)
    if (newBaseData.type2 && newBaseData.type2 !== newBaseData.type1) this.types.push(newBaseData.type2)
    if (this.types.length === 0) this.types = ['一般']
    
    this.evolution = this._parseEvolutionChain(newBaseData.evolutionChain)
    this.megaData = null
    
    this.stats = this._calculateStats()
    this.maxHp = this.stats.HP
    this.hp = Math.min(this.maxHp, this.hp)
    
    return { success: true, from: oldName, to: this.name }
  }
  
  canMegaEvolve(stoneName) {
    if (this.hasMegaEvolved) return false
    if (this.isMega) return false
    if (!this.megaData) return false
    if (!stoneName) return false
    return this.megaData.stone === stoneName
  }
  
  megaEvolve(stoneName) {
    if (!this.canMegaEvolve(stoneName)) return false
    
    this.isMega = true
    this.hasMegaEvolved = true
    this.megaStone = stoneName
    this.types = this.megaData.types
    this.baseStats = this.megaData.baseStats
    this.stats = this._calculateStats()
    this.maxHp = this.stats.HP
    this.hp = Math.min(this.maxHp, this.hp)
    
    return true
  }
  
  revertMegaEvolution() {
    if (!this.isMega) return false
    
    this.isMega = false
    this.megaStone = null
    this.types = this.baseData.types
    this.baseStats = this.baseData.baseStats
    this.stats = this._calculateStats()
    this.maxHp = this.stats.HP
    this.hp = Math.min(this.maxHp, this.hp)
    
    return true
  }
  
  toDetailedString() {
    const typeStr = this.types.join('/')
    const ivStr = Object.entries(this.ivs).map(([k, v]) => `${k.slice(0, 2)}:${v}`).join(' ')
    const evStr = Object.entries(this.evs).filter(([k, v]) => v > 0).map(([k, v]) => `${k.slice(0, 2)}:${v}`).join(' ')
    const movesStr = this.moves.map(m => `${m}(${this.movePP[m] || 0}/${this.getMoveMaxPP(m)})`).join(', ')
    
    return [
      `【${this.name}】 Lv.${this.level} (${typeStr})${this.isMega ? ' MEGA' : ''}`,
      `HP: ${this.hp}/${this.maxHp}`,
      `能力值: HP:${this.stats.HP} 攻:${this.stats.攻击} 防:${this.stats.防御} 特攻:${this.stats.特攻} 特防:${this.stats.特防} 速:${this.stats.速度}`,
      `个体值(IV): ${ivStr} (总:${this.getIVTotal()}/186 评价:${this.getIVPercentage()}%)`,
      `努力值(EV): ${evStr || '无'} (总:${this.getEVTotal()}/510)`,
      `亲密度: ${this.affection} | 好感度: ${this.friendship}`,
      `携带物: ${this.holdingItem || '无'}`,
      `状态: ${this.status || '正常'}`,
      `技能: ${movesStr}`,
      `经验: ${this.experience}/${this._calculateExpForLevel(this.level + 1)} (距离下一级: ${this.experienceToNext})`
    ].join('\n')
  }
  
  toJSON() {
    return {
      name: this.name,
      level: this.level,
      isInitial: this.isInitial,
      rarity: this.rarity,
      ivs: this.ivs,
      evs: this.evs,
      affection: this.affection,
      friendship: this.friendship,
      holdingItem: this.holdingItem,
      experience: this.experience,
      experienceToNext: this.experienceToNext,
      hp: this.hp,
      maxHp: this.maxHp,
      stats: this.stats,
      status: this.status,
      statusTurns: this.statusTurns,
      moves: this.moves,
      movePP: this.movePP,
      statBoosts: this.statBoosts,
      isMega: this.isMega,
      hasMegaEvolved: this.hasMegaEvolved,
      megaStone: this.megaStone,
      _maxLevel: this._maxLevel
    }
  }
  
  static fromJSON(data) {
    if (!data) return null
    const baseData = getPokemonData(data.name)
    if (!baseData) return null
    
    const pokemon = new Pokemon(data.name, data.level, {
      isInitial: data.isInitial,
      ivs: data.ivs,
      evs: data.evs,
      affection: data.affection,
      friendship: data.friendship,
      holdingItem: data.holdingItem,
      experience: data.experience,
      hp: data.hp,
      moves: data.moves,
      movePP: data.movePP,
      status: data.status,
      isMega: data.isMega,
      megaStone: data.megaStone,
      maxLevel: data._maxLevel
    })
    
    if (data.stats) pokemon.stats = data.stats
    if (data.maxHp) pokemon.maxHp = data.maxHp
    if (data.experienceToNext !== undefined) pokemon.experienceToNext = data.experienceToNext
    if (data.statBoosts) pokemon.statBoosts = data.statBoosts
    if (data.statusTurns !== undefined) pokemon.statusTurns = data.statusTurns
    if (data.hasMegaEvolved !== undefined) pokemon.hasMegaEvolved = data.hasMegaEvolved
    
    return pokemon
  }
}

function calculateCaptureRate(pokemonName, ballType) {
  const baseRate = pokemonBaseData[pokemonName]?.captureRate || 100
  const ballMod = ITEM_CONFIG[ballType]?.captureRate || 1
  return Math.min(100, (baseRate / 255) * 100 * ballMod)
}

module.exports = {
  Pokemon,
  Player,
  Backpack,
  Belt,
  TYPE_CHART,
  STATUS_EFFECTS,
  getTypeMultiplier,
  getTypeEffectivenessText,
  generateIVs,
  calculateCaptureRate,
  ITEM_CONFIG,
  RARITY_COLORS,
  pokemonDAL
}
