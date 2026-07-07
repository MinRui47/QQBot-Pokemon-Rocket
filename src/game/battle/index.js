const { Pokemon, calculateCaptureRate, ITEM_CONFIG, RARITY_COLORS } = require('../models')
const { MEDALS } = require('../map')
const { getMoveData, getPokemonTypes, getPokemonBaseStats } = require('../dataService')
const { loadTypeChart, loadStatusEffects, loadAbilities } = require('../configCache')
const { mapStateDAL } = require('../database/dal')

const BattleConfig = {
  TYPE_CHART: {},
  STATUS_EFFECTS: {},
  ABILITIES: {}
}

async function initBattleConfig() {
  Object.assign(BattleConfig.TYPE_CHART, await loadTypeChart())
  Object.assign(BattleConfig.STATUS_EFFECTS, await loadStatusEffects())
  Object.assign(BattleConfig.ABILITIES, await loadAbilities())
  console.log('[Battle] 战斗配置已从数据库加载')
  console.log(`  属性克制表: ${Object.keys(BattleConfig.TYPE_CHART).length} 种属性`)
  console.log(`  状态效果: ${Object.keys(BattleConfig.STATUS_EFFECTS).length} 种`)
  console.log(`  特性: ${Object.keys(BattleConfig.ABILITIES).length} 种`)
}

module.exports.initBattleConfig = initBattleConfig

class BattleResult {
  constructor() {
    this.won = false
    this.captured = false
    this.rewards = []
    this.damageReceived = 0
    this.message = ''
    this.turnLog = []
    this.battleEnded = false
    this.battleState = null
  }
}

class BattleState {
  constructor() {
    this.turn = 1
    this.playerPokemon = null
    this.opponentPokemon = null
    this.playerState = { boosts: {}, status: null, statusTurns: 0, recharging: false, protecting: false, flinching: false }
    this.opponentState = { boosts: {}, status: null, statusTurns: 0, recharging: false, protecting: false, flinching: false }
    this.weather = null
    this.weatherTurns = 0
    this.log = []
    this.playerAction = null
    this.opponentAction = null
    this.battleEnded = false
    this.won = false
  }
}

class BattleSystem {
  constructor(player) {
    this.player = player
    this.currentBattle = null
  }
  
  async startWildBattle(wildPokemon) {
    const result = new BattleResult()
    const wild = new Pokemon(wildPokemon.name, wildPokemon.level)
    const playerPokemon = this.player.currentGame.belt.getActivePokemon()
    
    if (!playerPokemon) {
      result.message = '没有可用的精灵！战斗失败！'
      return result
    }
    
    const obedienceCheck = this._checkObedience(playerPokemon)
    if (!obedienceCheck.obedient) {
      result.message = obedienceCheck.message
      return result
    }
    
    const battleState = new BattleState()
    battleState.playerPokemon = playerPokemon
    battleState.opponentPokemon = wild
    battleState.playerState = { boosts: {}, status: null, statusTurns: 0, recharging: false, protecting: false, flinching: false }
    battleState.opponentState = { boosts: {}, status: null, statusTurns: 0, recharging: false, protecting: false, flinching: false }
    
    this._activateAbility(playerPokemon, battleState, 'player', 'start')
    this._activateAbility(wild, battleState, 'opponent', 'start')
    
    this.currentBattle = {
      type: 'wild',
      opponent: wild,
      playerPokemon: playerPokemon,
      state: battleState,
      log: []
    }
    
    result.message = `\n【遭遇】野生 ${wild.name} Lv.${wild.level}（${RARITY_COLORS[wild.rarity].color}${RARITY_COLORS[wild.rarity].name}）出现！\n\n${playerPokemon.name} Lv.${playerPokemon.level} HP:${playerPokemon.hp}/${playerPokemon.maxHp}\n${wild.name} Lv.${wild.level} HP:${wild.hp}/${wild.maxHp}\n\nIV评价：${playerPokemon.getIVPercentage()}% | 亲密度：${playerPokemon.affection}`
    
    const battleResult = await this._turnBasedBattle(battleState)
    result.won = battleResult.won
    result.damageReceived = battleResult.damageReceived
    result.turnLog = battleResult.log

    if (battleResult.won) {
      result.message += `\n\n【胜利】${wild.name} 被击败！`
      
      const totalTurns = battleResult.log.length
      const recentTurns = battleResult.log.slice(-10)
      if (totalTurns > 10) {
        result.message += `\n\n━━━━━━━━━━━━━━━━━━━━
以下为最近战报：`
      }
      for (const line of recentTurns) {
        result.message += '\n' + line
      }
      
      const searchRewards = this._getWildSearchRewards(wild)
      result.rewards = searchRewards
      
      const expGain = Math.floor(wild.level * 15)
      const mapMaxLevel = this._getMapMaxLevel()
      const expResult = playerPokemon.addExperience(expGain, { maxLevel: mapMaxLevel })
      
      const evGain = this._getEVGain(wild)
      playerPokemon.addEVs(evGain)
      
      result.message += `\n获得经验：${expGain} | 等级：${playerPokemon.level}`
      if (expResult.blocked) {
        result.message += `\n⚠️ ${expResult.reason}`
      } else if (expResult.leveledUp) {
        result.message += ` (升级了${expResult.levelsGained}级)`
      }
      result.message += `\n获得努力值：${Object.entries(evGain).filter(([k, v]) => v > 0).map(([k, v]) => k + '+' + v).join(' ')}`
      
      if (searchRewards.length > 0) {
        result.message += `\n搜刮到：${searchRewards.map(r => r.type === 'item' ? `${r.name} x${r.quantity}` : `${r.amount} 金币`).join('、')}`
      }
      
      this._updateWildEncounterState(wild.name, true)
    } else {
      result.message += `\n\n【失败】${playerPokemon.name} 被击败！${wild.name} 逃走了...`
      const recentTurns = battleResult.log.slice(-6)
      for (const line of recentTurns) {
        result.message += '\n' + line
      }
      
      this._updateWildEncounterState(wild.name, false)
    }
    
    return result
  }
  
  _updateWildEncounterState(pokemonName, defeated) {
    if (!this.player.currentGame || !this.player.currentGame.map) return
    const map = this.player.currentGame.map
    if (!map.instanceId) return
    
    if (defeated) {
      mapStateDAL.defeatWildEncounter(map.instanceId, map.currentLocation, pokemonName)
    } else {
      mapStateDAL.fleeWildEncounter(map.instanceId, map.currentLocation, pokemonName)
    }
  }
  
  async startTrainerBattle(trainer) {
    const result = new BattleResult()
    const playerBelt = this.player.currentGame.belt
    
    if (!playerBelt.hasAlivePokemon()) {
      result.message = '没有可用的精灵！战斗失败！'
      return result
    }
    
    result.message = `\n【遭遇】训练家 ${trainer.name}！\n对方精灵：${trainer.pokemon.map(p => `${p.name} Lv.${p.level}`).join('、')}\n`
    
    let currentPlayerPokemon = playerBelt.getActivePokemon()
    let trainerPokemonIndex = 0
    let totalExpGain = 0
    let battleLog = []
    
    while (trainerPokemonIndex < trainer.pokemon.length && currentPlayerPokemon) {
      const trainerPokemon = new Pokemon(trainer.pokemon[trainerPokemonIndex].name, trainer.pokemon[trainerPokemonIndex].level, { isInitial: true })
      
      const obedienceCheck = this._checkObedience(currentPlayerPokemon)
      if (!obedienceCheck.obedient) {
        result.message += `\n${obedienceCheck.message}`
        break
      }
      
      const battleState = new BattleState()
      battleState.playerPokemon = currentPlayerPokemon
      battleState.opponentPokemon = trainerPokemon
      battleState.playerState = { boosts: {}, status: null, statusTurns: 0, recharging: false, protecting: false, flinching: false }
      battleState.opponentState = { boosts: {}, status: null, statusTurns: 0, recharging: false, protecting: false, flinching: false }
      
      this._activateAbility(currentPlayerPokemon, battleState, 'player', 'start')
      this._activateAbility(trainerPokemon, battleState, 'opponent', 'start')
      
      result.message += `\n--- 第 ${trainerPokemonIndex + 1} 场 ---\n`
      result.message += `${currentPlayerPokemon.name} Lv.${currentPlayerPokemon.level} HP:${currentPlayerPokemon.hp}/${currentPlayerPokemon.maxHp}\n`
      result.message += `${trainerPokemon.name} Lv.${trainerPokemon.level} HP:${trainerPokemon.hp}/${trainerPokemon.maxHp}\n`
      
      const battleResult = await this._turnBasedBattle(battleState)
      battleLog = battleLog.concat(battleResult.log)
      
      trainer.pokemon[trainerPokemonIndex].hp = trainerPokemon.hp
      trainer.pokemon[trainerPokemonIndex].maxHp = trainerPokemon.maxHp
      
      if (battleResult.won) {
        result.message += `\n${trainerPokemon.name} 倒下了！`
        totalExpGain += Math.floor(trainerPokemon.level * 20)
        currentPlayerPokemon.addEVs(this._getEVGain(trainerPokemon))
        trainerPokemonIndex++
      } else {
        result.message += `\n${currentPlayerPokemon.name} 被击败！`
        currentPlayerPokemon = playerBelt.getActivePokemon()
        
        if (!currentPlayerPokemon) {
          result.message += '\n所有精灵都已倒下！'
          break
        }
        
        result.message += `\n派出 ${currentPlayerPokemon.name}！`
      }
    }
    
    if (battleLog.length > 0) {
      result.message += `\n\n━━━━━━━━━━━━━━━━━━━━
【战斗回放】`
      for (const line of battleLog) {
        result.message += '\n' + line
      }
    }
    
    result.won = trainerPokemonIndex >= trainer.pokemon.length
    
    if (result.won) {
      currentPlayerPokemon = playerBelt.getActivePokemon()
      if (currentPlayerPokemon) {
        const mapMaxLevel = this._getMapMaxLevel()
        const expResult = currentPlayerPokemon.addExperience(totalExpGain, { maxLevel: mapMaxLevel })
        
        result.message += '\n\n【胜利】击败训练家！'
        
        result.message += `\n获得经验：${totalExpGain}`
        if (currentPlayerPokemon) {
          result.message += ` | 当前等级：${currentPlayerPokemon.level}`
        }
        
        if (expResult.blocked) {
          result.message += `\n⚠️ ${expResult.reason}`
        } else if (expResult.leveledUp) {
          result.message += ` (升级了${expResult.levelsGained}级)`
        }
        
        result.message += `\n\n输入"抢夺"查看训练家的装备，可获取其腰带精灵、背包物品或更换背包`
      }
      
      this._updateTrainerState(trainer.name, true)
    } else {
      result.message += '\n\n【失败】战斗失败！'
    }
    
    return result
  }
  
  _updateTrainerState(trainerName, defeated) {
    if (!this.player.currentGame || !this.player.currentGame.map) return
    const map = this.player.currentGame.map
    if (!map.instanceId) return
    
    if (defeated) {
      mapStateDAL.defeatTrainer(map.instanceId, map.currentLocation, trainerName)
    }
  }
  
  getBattleOptions() {
    if (!this.currentBattle) {
      return null
    }
    
    const playerPokemon = this.currentBattle.playerPokemon
    const moves = []
    
    for (const moveName of playerPokemon.moves) {
      const pp = playerPokemon.getMovePP(moveName)
      const maxPP = playerPokemon.getMoveMaxPP(moveName)
      moves.push({ name: moveName, pp, maxPP })
    }
    
    const belt = this.player.currentGame.belt
    const switchablePokemon = belt.pokemon.filter(p => p !== playerPokemon && !p.isFainted())
    
    return {
      moves,
      canSwitch: switchablePokemon.length > 0,
      switchablePokemon: switchablePokemon.map(p => ({
        name: p.name,
        level: p.level,
        hp: p.hp,
        maxHp: p.maxHp
      })),
      canUseItem: true,
      canRun: this.currentBattle.type === 'wild'
    }
  }
  
  async executePlayerAction(action, data = {}) {
    if (!this.currentBattle) {
      return { success: false, message: '没有进行中的战斗' }
    }
    
    const battleState = this.currentBattle.state
    
    switch (action) {
      case 'useMove':
        return await this._executeMoveAction(battleState, data.moveName)
      case 'switch':
        return await this._executeSwitchAction(battleState, data.pokemonIndex)
      case 'useItem':
        return await this._executeItemAction(battleState, data.itemName, data.targetIndex)
      case 'run':
        return await this._executeRunAction(battleState)
      default:
        return { success: false, message: '无效的行动' }
    }
  }
  
  async _executeMoveAction(battleState, moveName) {
    const playerPokemon = battleState.playerPokemon
    
    if (!playerPokemon.moves.includes(moveName)) {
      return { success: false, message: `${playerPokemon.name} 没有这个招式！` }
    }
    
    if (playerPokemon.getMovePP(moveName) <= 0) {
      return { success: false, message: `${moveName} 的PP已用尽！` }
    }
    
    battleState.playerAction = { type: 'move', moveName }
    return await this._processTurn(battleState)
  }
  
  async _executeSwitchAction(battleState, pokemonIndex) {
    const belt = this.player.currentGame.belt
    const allPokemon = belt.pokemon
    
    if (pokemonIndex < 0 || pokemonIndex >= allPokemon.length) {
      return { success: false, message: '无效的精灵序号！' }
    }
    
    const newPokemon = allPokemon[pokemonIndex]
    if (newPokemon.isFainted()) {
      return { success: false, message: `${newPokemon.name} 已经倒下了！` }
    }
    
    if (newPokemon === battleState.playerPokemon) {
      return { success: false, message: '不能切换到当前精灵！' }
    }
    
    battleState.playerAction = { type: 'switch', pokemon: newPokemon }
    return await this._processTurn(battleState)
  }
  
  async _executeItemAction(battleState, itemName, targetIndex) {
    const backpack = this.player.currentGame.backpack
    const item = backpack.findItem(itemName)
    
    if (!item || item.quantity < 1) {
      return { success: false, message: `没有 ${itemName}！` }
    }
    
    if (item.type !== 'heal') {
      return { success: false, message: '战斗中只能使用治疗道具！' }
    }
    
    const belt = this.player.currentGame.belt
    if (targetIndex < 0 || targetIndex >= belt.pokemon.length) {
      return { success: false, message: '无效的目标序号！' }
    }
    
    battleState.playerAction = { type: 'item', itemName, targetIndex }
    return await this._processTurn(battleState)
  }
  
  async _executeRunAction(battleState) {
    if (this.currentBattle.type !== 'wild') {
      return { success: false, message: '与训练家战斗时无法逃跑！' }
    }
    
    battleState.playerAction = { type: 'run' }
    return await this._processTurn(battleState)
  }
  
  async _turnBasedBattle(battleState) {
    const result = { won: false, damageReceived: 0, log: [] }
    
    const p1 = battleState.playerPokemon
    const p2 = battleState.opponentPokemon
    
    result.log.push(`${p1.name} Lv.${p1.level} HP: ${p1.hp}/${p1.maxHp}`)
    result.log.push(`${p2.name} Lv.${p2.level} HP: ${p2.hp}/${p2.maxHp}`)
    
    while (!p1.isFainted() && !p2.isFainted() && battleState.turn <= 50) {
      result.log.push(`\n━━━ 第 ${battleState.turn} 回合 ━━━`)
      
      battleState.playerAction = null
      battleState.opponentAction = null
      
      const opponentMove = p2.getRandomUsableMove()
      battleState.opponentAction = { type: 'move', moveName: opponentMove }
      
      const playerMove = p1.moves[0] && p1.getMovePP(p1.moves[0]) > 0 ? p1.moves[0] : p1.getRandomUsableMove()
      battleState.playerAction = { type: 'move', moveName: playerMove }
      
      await this._processTurn(battleState, result)
      
      if (!p1.isFainted()) {
        result.log.push(`> ${p1.name} HP: ${p1.hp}/${p1.maxHp}`)
      }
      if (!p2.isFainted()) {
        result.log.push(`> ${p2.name} HP: ${p2.hp}/${p2.maxHp}`)
      }
      
      battleState.turn++
    }
    
    result.won = p2.isFainted()
    
    return result
  }
  
  async _processTurn(battleState, result = { log: [] }) {
    const p1 = battleState.playerPokemon
    const p2 = battleState.opponentPokemon
    let p1State = battleState.playerState
    let p2State = battleState.opponentState
    
    if (battleState.weather) {
      result.log.push(`【天气】${this._getWeatherName(battleState.weather)}`)
    }
    
    p1State = this._processStatusRecovery(p1, p1State, result)
    p2State = this._processStatusRecovery(p2, p2State, result)
    
    const p1Speed = p1.getSpeed() + (p1State.boosts['速度'] || 0) * 10
    const p2Speed = p2.getSpeed() + (p2State.boosts['速度'] || 0) * 10
    const p1GoesFirst = p1Speed >= p2Speed
    
    if (p1GoesFirst) {
      p1State = await this._executePlayerTurn(p1, p2, p1State, p2State, battleState, result)
      
      if (!p2.isFainted()) {
        p2State = await this._executeOpponentTurn(p2, p1, p2State, p1State, battleState, result)
      }
    } else {
      p2State = await this._executeOpponentTurn(p2, p1, p2State, p1State, battleState, result)
      
      if (!p1.isFainted()) {
        p1State = await this._executePlayerTurn(p1, p2, p1State, p2State, battleState, result)
      }
    }
    
    p1State = this._applyStatusEffects(p1, p1State, result)
    p2State = this._applyStatusEffects(p2, p2State, result)
    
    battleState.playerState = p1State
    battleState.opponentState = p2State
    
    if (battleState.weather && battleState.weatherTurns > 0) {
      battleState.weatherTurns--
      if (battleState.weatherTurns <= 0) {
        battleState.weather = null
        result.log.push('天气恢复了！')
      }
    }
    
    return result
  }
  
  async _executePlayerTurn(attacker, defender, attackerState, defenderState, battleState, result) {
    if (attacker.isFainted()) return attackerState
    
    if (attackerState.status === 'confusion') {
      const confusionChance = BattleConfig.STATUS_EFFECTS['confusion']?.skipChance || 0.33
      if (Math.random() < confusionChance) {
        const selfDamage = Math.floor(attacker.maxHp * 0.25)
        attacker.hp = Math.max(1, attacker.hp - selfDamage)
        result.log.push(`${attacker.name} 混乱中！对自己造成了 ${selfDamage} 点伤害！`)
        return attackerState
      }
    }
    
    if (attackerState.flinching) {
      result.log.push(`${attacker.name} 畏缩了！`)
      attackerState.flinching = false
      return attackerState
    }
    
    if (attackerState.recharging) {
      result.log.push(`${attacker.name} 在蓄力中...`)
      attackerState.recharging = false
      return attackerState
    }
    
    if (this._shouldSkipTurn(attackerState)) {
      const skipStatus = BattleConfig.STATUS_EFFECTS[attackerState.status]
      result.log.push(`${attacker.name} ${skipStatus?.message || '无法行动'}！`)
      return attackerState
    }
    
    const action = battleState.playerAction
    
    if (!action) {
      result.log.push(`${attacker.name} 没有行动！`)
      return attackerState
    }
    
    switch (action.type) {
      case 'move':
        return await this._executeMove(attacker, defender, action.moveName, attackerState, defenderState, result, 'player', battleState)
      case 'switch':
        result.log.push(`派出 ${action.pokemon.name}！`)
        battleState.playerPokemon = action.pokemon
        this._activateAbility(action.pokemon, battleState, 'player', 'switch')
        return { boosts: {}, status: null, statusTurns: 0, recharging: false, protecting: false, flinching: false }
      case 'item':
        const item = this.player.currentGame.backpack.findItem(action.itemName)
        if (item && item.quantity > 0) {
          const target = this.player.currentGame.belt.pokemon[action.targetIndex]
          if (target) {
            target.heal(item.healAmount)
            this.player.currentGame.backpack.removeItem(action.itemName, 1)
            result.log.push(`使用 ${action.itemName}，${target.name} 恢复了 ${item.healAmount} HP！`)
          }
        }
        return attackerState
      case 'run':
        const runChance = attacker.getSpeed() / (attacker.getSpeed() + defender.getSpeed())
        if (Math.random() < runChance) {
          result.log.push(`${attacker.name} 逃跑成功！`)
          battleState.battleEnded = true
          battleState.won = false
        } else {
          result.log.push(`${attacker.name} 逃跑失败！`)
        }
        return attackerState
      default:
        result.log.push(`${attacker.name} 没有行动！`)
        return attackerState
    }
  }
  
  async _executeOpponentTurn(attacker, defender, attackerState, defenderState, battleState, result) {
    if (attacker.isFainted()) return attackerState
    
    if (attackerState.status === 'confusion') {
      const confusionChance = BattleConfig.STATUS_EFFECTS['confusion']?.skipChance || 0.33
      if (Math.random() < confusionChance) {
        const selfDamage = Math.floor(attacker.maxHp * 0.25)
        attacker.hp = Math.max(1, attacker.hp - selfDamage)
        result.log.push(`${attacker.name} 混乱中！对自己造成了 ${selfDamage} 点伤害！`)
        return attackerState
      }
    }
    
    if (attackerState.flinching) {
      result.log.push(`${attacker.name} 畏缩了！`)
      attackerState.flinching = false
      return attackerState
    }
    
    if (attackerState.recharging) {
      result.log.push(`${attacker.name} 在蓄力中...`)
      attackerState.recharging = false
      return attackerState
    }
    
    if (this._shouldSkipTurn(attackerState)) {
      const skipStatus = BattleConfig.STATUS_EFFECTS[attackerState.status]
      result.log.push(`${attacker.name} ${skipStatus?.message || '无法行动'}！`)
      return attackerState
    }
    
    const action = battleState.opponentAction
    
    if (!action || action.type !== 'move') {
      const moveName = attacker.getRandomUsableMove()
      return await this._executeMove(attacker, defender, moveName, attackerState, defenderState, result, 'opponent', battleState)
    }
    
    return await this._executeMove(attacker, defender, action.moveName, attackerState, defenderState, result, 'opponent', battleState)
  }
  
  async _executeMove(attacker, defender, moveName, attackerState, defenderState, result, attackerType, battleState) {
    if (!moveName || attacker.getMovePP(moveName) <= 0) {
      moveName = attacker.getRandomUsableMove()
    }
    
    if (!moveName) {
      result.log.push(`${attacker.name} 没有可用的招式！`)
      return attackerState
    }
    
    const moveData = await getMoveData(moveName)
    
    attacker.useMovePP(moveName)
    
    result.log.push(`${attacker.name} 使用了 ${moveName}！`)
    
    if (!this._checkAccuracy(moveData, attacker, defender, attackerState, defenderState)) {
      result.log.push(`${attacker.name} 的 ${moveName} 没有命中！`)
      return attackerState
    }
    
    if (moveData.category === 'status' || moveData.power === 0) {
      return this._applyStatusMove(attacker, defender, moveData, attackerState, defenderState, result, battleState)
    }
    
    const isCritical = this._checkCriticalHit(moveData)
    const typeMultiplier = this._getTypeMultiplier(moveData.type, defender)
    const damage = this._calculateDamage(attacker, defender, moveData, attackerState, defenderState, isCritical)
    
    let finalDamage = Math.floor(damage * typeMultiplier)
    
    let effectMsg = ''
    if (isCritical) {
      effectMsg += '会心一击！ '
    }
    if (typeMultiplier > 1) {
      effectMsg += '效果拔群！ '
    } else if (typeMultiplier < 1 && typeMultiplier > 0) {
      effectMsg += '效果不佳... '
    } else if (typeMultiplier === 0) {
      result.log.push(`${defender.name} 完全没有受到伤害！`)
      return attackerState
    }
    
    defender.takeDamage(finalDamage)
    
    if (attackerType === 'player') {
      result.damageReceived += finalDamage
    }
    
    result.log.push(`${defender.name} 受到了 ${finalDamage} 点伤害！${effectMsg}`)
    
    if (moveData.effect) {
      this._applyMoveEffect(attacker, defender, moveData.effect, attackerState, defenderState, result)
    }
    
    if (defender.isFainted()) {
      result.log.push(`${defender.name} 倒下了！`)
    }
    
    return attackerState
  }
  
  _activateAbility(pokemon, battleState, side, trigger) {
    const abilityName = pokemon.ability
    if (!abilityName) return
    
    const abilityData = BattleConfig.ABILITIES[abilityName]
    if (!abilityData) return
    
    switch (abilityName) {
      case '降雨':
        battleState.weather = 'rain'
        battleState.weatherTurns = 5
        battleState.log.push(`${pokemon.name} 的特性降雨发动！下起了大雨！`)
        break
      case '日照':
        battleState.weather = 'sunny'
        battleState.weatherTurns = 5
        battleState.log.push(`${pokemon.name} 的特性日照发动！太阳变得猛烈！`)
        break
      case '扬沙':
        battleState.weather = 'sandstorm'
        battleState.weatherTurns = 5
        battleState.log.push(`${pokemon.name} 的特性扬沙发动！刮起了沙尘暴！`)
        break
      case '降雪':
        battleState.weather = 'snow'
        battleState.weatherTurns = 5
        battleState.log.push(`${pokemon.name} 的特性降雪发动！开始下雪了！`)
        break
      case '威吓':
        if (trigger === 'start' && side === 'player') {
          battleState.opponentState.boosts['攻击'] = (battleState.opponentState.boosts['攻击'] || 0) - 1
          battleState.log.push(`${pokemon.name} 的特性威吓发动！对手退缩了！`)
        }
        break
      case '避雷针':
        if (trigger === 'move' && battleState.playerAction?.moveName) {
          const moveData = { type: '电' }
          if (moveData.type === '电') {
            battleState.playerState.boosts['特攻'] = (battleState.playerState.boosts['特攻'] || 0) + 1
            battleState.log.push(`${pokemon.name} 的特性避雷针发动！吸引了电系招式！`)
          }
        }
        break
      case '引火':
        if (trigger === 'move') {
          const moveData = { type: '火' }
          if (moveData.type === '火') {
            battleState.playerState.boosts['特攻'] = (battleState.playerState.boosts['特攻'] || 0) + 1
            battleState.log.push(`${pokemon.name} 的特性引火发动！吸收了火系招式！`)
          }
        }
        break
      case '蓄电':
        if (trigger === 'move') {
          const moveData = { type: '电' }
          if (moveData.type === '电') {
            battleState.log.push(`${pokemon.name} 的特性蓄电发动！吸收了电系招式！`)
          }
        }
        break
      case '储水':
        if (trigger === 'move') {
          const moveData = { type: '水' }
          if (moveData.type === '水') {
            battleState.log.push(`${pokemon.name} 的特性储水发动！吸收了水系招式！`)
          }
        }
        break
      case '自然回复':
        if (trigger === 'switch') {
          battleState.playerState.status = null
          battleState.playerState.statusTurns = 0
          battleState.log.push(`${pokemon.name} 的特性自然回复发动！状态恢复了！`)
        }
        break
    }
  }
  
  _getWeatherName(weather) {
    const names = {
      rain: '大雨',
      sunny: '烈日',
      sandstorm: '沙尘暴',
      snow: '暴雪'
    }
    return names[weather] || weather
  }
  
  _shouldSkipTurn(state) {
    if (!state.status) return false
    
    const effect = BattleConfig.STATUS_EFFECTS[state.status]
    if (!effect || !effect.skipTurn) return false
    
    if (state.status === 'paralysis') {
      return Math.random() < (effect.skipChance || 0.25)
    }
    
    if (state.status === 'freeze') {
      if (Math.random() < (effect.thawChance || 0.2)) {
        state.status = null
        state.statusTurns = 0
        return false
      }
      return true
    }
    
    if (state.status === 'sleep') {
      if (state.statusTurns >= (effect.lasts || 3)) {
        state.status = null
        state.statusTurns = 0
        return false
      }
      return true
    }
    
    return false
  }
  
  _processStatusRecovery(pokemon, state, result) {
    if (!state.status) return state
    
    const effect = BattleConfig.STATUS_EFFECTS[state.status]
    if (!effect) return state
    
    if (effect.lasts > 0) {
      state.statusTurns++
      if (state.statusTurns >= effect.lasts) {
        result.log.push(`${pokemon.name} 的状态恢复了！`)
        state.status = null
        state.statusTurns = 0
      } else {
        result.log.push(`${pokemon.name} ${effect.message}！`)
      }
    }
    
    return state
  }
  
  _applyStatusEffects(pokemon, state, result) {
    if (!state.status) return state
    
    const effect = BattleConfig.STATUS_EFFECTS[state.status]
    if (!effect) return state
    
    if (effect.damage > 0) {
      let damageMultiplier = effect.damage
      if (effect.grow && state.statusTurns > 0) {
        damageMultiplier = effect.damage * (state.statusTurns + 1)
      }
      const damage = Math.floor(pokemon.maxHp * damageMultiplier)
      pokemon.takeDamage(damage)
      result.log.push(`${pokemon.name} 受到 ${damage} 点伤害！`)
    }
    
    return state
  }
  
  _checkAccuracy(moveData, attacker, defender, attackerState, defenderState) {
    if (moveData.alwaysHits) return true
    
    let accuracy = moveData.accuracy || 95
    
    const evasion = defender.stats['闪避'] || 0
    const accuracyStat = attacker.stats['命中'] || 0
    const accuracyModifier = (100 + accuracyStat) / (100 + evasion)
    
    accuracy *= accuracyModifier
    
    if (attackerState.boosts['命中'] !== undefined) {
      accuracy *= this._getBoostMultiplier(attackerState.boosts['命中'])
    }
    if (defenderState.boosts['闪避'] !== undefined) {
      accuracy /= this._getBoostMultiplier(defenderState.boosts['闪避'])
    }
    
    return Math.random() * 100 < accuracy
  }
  
  _getBoostMultiplier(boostLevel) {
    const multipliers = {
      '-6': 0.25, '-5': 0.2857, '-4': 0.3333, '-3': 0.4, '-2': 0.5, '-1': 0.6667,
      '0': 1, '1': 1.5, '2': 2, '3': 2.5, '4': 3, '5': 3.5, '6': 4
    }
    return multipliers[boostLevel] || 1
  }
  
  _checkCriticalHit(moveData) {
    const criticalRate = moveData.criticalRate || 0
    const baseRate = 6.25
    
    const rates = [6.25, 12.5, 25, 33.3]
    const rate = rates[criticalRate] || baseRate
    
    return Math.random() * 100 < rate
  }
  
  _getTypeMultiplier(moveType, defender) {
    const defenderTypes = defender.baseData.types || ['一般']
    let multiplier = 1
    
    for (const type of defenderTypes) {
      multiplier *= BattleConfig.TYPE_CHART[moveType]?.[type] || 1
    }
    
    return multiplier
  }
  
  _calculateDamage(attacker, defender, moveData, attackerState, defenderState, isCritical) {
    const level = attacker.level
    const basePower = moveData.power
    
    if (basePower === 0) return 0
    
    let attackStat, defenseStat
    
    if (moveData.category === 'special') {
      attackStat = attacker.getSpecialAttack()
      defenseStat = defender.getSpecialDefense()
    } else {
      attackStat = attacker.getAttack()
      defenseStat = defender.getDefense()
    }
    
    const attackerBoost = moveData.category === 'special' 
      ? attackerState.boosts['特攻'] || 0
      : attackerState.boosts['攻击'] || 0
    const defenderBoost = moveData.category === 'special'
      ? defenderState.boosts['特防'] || 0
      : defenderState.boosts['防御'] || 0
    
    attackStat = this._applyStatBoosts(attackStat, attackerBoost)
    defenseStat = this._applyStatBoosts(defenseStat, defenderBoost)
    
    let damage = ((2 * level / 5 + 2) * basePower * attackStat) / (50 * defenseStat) + 2
    
    if (isCritical) {
      damage *= 1.5
    }
    
    const randomFactor = 0.85 + (Math.random() * 0.15)
    damage *= randomFactor
    
    return Math.floor(damage)
  }
  
  _applyStatBoosts(stat, boostLevel) {
    const boostMultipliers = {
      '-6': 0.25, '-5': 0.2857, '-4': 0.3333, '-3': 0.4, '-2': 0.5, '-1': 0.6667,
      '0': 1, '1': 1.5, '2': 2, '3': 2.5, '4': 3, '5': 3.5, '6': 4
    }
    
    return Math.floor(stat * (boostMultipliers[boostLevel] || 1))
  }
  
  _applyStatusMove(attacker, defender, moveData, attackerState, defenderState, result, battleState) {
    if (!moveData.effect) return attackerState
    
    const effect = moveData.effect
    
    if (effect.statBoost) {
      const stat = effect.statBoost
      const amount = effect.amount || 1
      attackerState.boosts[stat] = (attackerState.boosts[stat] || 0) + amount
      attackerState.boosts[stat] = Math.max(-6, Math.min(6, attackerState.boosts[stat]))
      result.log.push(`${attacker.name} 的${stat}提升了！`)
    }
    
    if (effect.statDrop) {
      const stat = effect.statDrop
      const amount = effect.amount || 1
      defenderState.boosts[stat] = (defenderState.boosts[stat] || 0) - amount
      defenderState.boosts[stat] = Math.max(-6, Math.min(6, defenderState.boosts[stat]))
      result.log.push(`${defender.name} 的${stat}下降了！`)
    }
    
    if (effect.heal) {
      const healAmount = Math.floor(attacker.maxHp * effect.heal)
      attacker.heal(healAmount)
      result.log.push(`${attacker.name} 恢复了 ${healAmount} HP！`)
    }
    
    if (effect.status && Math.random() < (effect.chance || 1)) {
      if (defenderState.status) {
        result.log.push(`但是失败了！`)
        return attackerState
      }
      defenderState.status = effect.status
      defenderState.statusTurns = 0
      result.log.push(`${defender.name} 陷入了${BattleConfig.STATUS_EFFECTS[effect.status]?.name || effect.status}状态！`)
    }
    
    if (effect.protect) {
      attackerState.protecting = true
      result.log.push(`${attacker.name} 展开了保护！`)
    }
    
    if (effect.rechargeTurn) {
      attackerState.recharging = true
      result.log.push(`${attacker.name} 需要蓄力！`)
    }
    
    return attackerState
  }
  
  _applyMoveEffect(attacker, defender, effect, attackerState, defenderState, result) {
    if (!effect) return
    
    if (effect.chance && Math.random() > effect.chance) return
    
    if (effect.status) {
      if (defenderState.status) {
        result.log.push(`但是失败了！`)
        return
      }
      defenderState.status = effect.status
      defenderState.statusTurns = 0
      result.log.push(`${defender.name} 陷入了${BattleConfig.STATUS_EFFECTS[effect.status]?.name || effect.status}状态！`)
    }
    
    if (effect.flinch) {
      defenderState.flinching = true
      result.log.push(`${defender.name} 畏缩了！`)
    }
    
    if (effect.statDrop) {
      defenderState.boosts[effect.statDrop] = (defenderState.boosts[effect.statDrop] || 0) - (effect.amount || 1)
      result.log.push(`${defender.name} 的${effect.statDrop}下降了！`)
    }
    
    if (effect.statBoost) {
      attackerState.boosts[effect.statBoost] = (attackerState.boosts[effect.statBoost] || 0) + (effect.amount || 1)
      result.log.push(`${attacker.name} 的${effect.statBoost}提升了！`)
    }
    
    if (effect.recoil) {
      const recoilDamage = Math.floor(attacker.maxHp * effect.recoil)
      attacker.takeDamage(recoilDamage)
      result.log.push(`${attacker.name} 受到了 ${recoilDamage} 点反伤！`)
    }
    
    if (effect.drain) {
      const drainAmount = Math.floor(attacker.maxHp * effect.drain)
      attacker.heal(drainAmount)
      result.log.push(`${attacker.name} 吸取了 ${drainAmount} HP！`)
    }
  }
  
  async tryCapture(wildPokemon, ballType) {
    const result = new BattleResult()
    
    if (!this.player.currentGame.belt.hasFreeSlots()) {
      result.message = '精灵腰带已满！无法捕捉！'
      return result
    }
    
    const captureRate = calculateCaptureRate(wildPokemon.name, ballType)
    const success = Math.random() * 100 < captureRate
    
    if (success) {
      const pokemon = new Pokemon(wildPokemon.name, wildPokemon.level)
      const addResult = this.player.currentGame.belt.addPokemon(pokemon)
      
      if (addResult.success) {
        result.captured = true
        result.won = true
        result.message = `\u6210\u529F\u6355\u83B7 ${pokemon.name} Lv.${pokemon.level}！（捕获率：${captureRate}%）\nIV评价：${pokemon.getIVPercentage()}%`
        result.rewards = [{ type: 'pokemon', name: pokemon.name, level: pokemon.level, ivPercentage: pokemon.getIVPercentage() }]
      } else {
        result.message = addResult.message
      }
    } else {
      result.message = `捕捉失败！${wildPokemon.name} 挣脱了！（捕获率：${captureRate}%）`
    }
    
    return result
  }
  
  _getEVGain(pokemon) {
    const evMap = {
      'HP': ['吉利蛋', '幸福蛋', '袋兽', '卡比兽'],
      '攻击': ['小火龙', '火恐龙', '喷火龙', '杰尼龟', '卡咪龟', '水箭龟', '妙蛙种子', '妙蛙草', '妙蛙花', '皮卡丘', '雷丘', '走路草', '臭臭花', '霸王花', '派拉斯', '派拉斯特', '毛球', '摩鲁蛾', '地鼠', '三地鼠', '喵喵', '猫老大', '可达鸭', '哥达鸭', '猴怪', '火爆猴', '嘟嘟', '嘟嘟利', '烈雀', '大嘴雀', '阿柏蛇', '阿柏怪', '穿山鼠', '穿山王', '尼多兰', '尼多娜', '尼多后', '尼多朗', '尼多力诺', '尼多王', '皮皮', '皮可西', '六尾', '九尾', '胖丁', '胖可丁', '超音蝠', '大嘴蝠'],
      '防御': ['小拳石', '隆隆石', '隆隆岩', '大岩蛇', '铁甲蛹', '巴大蝶', '铁甲贝', '菊石兽', '多刺菊石兽', '化石盔', '镰刀盔', '凯罗斯', '飞天螳螂'],
      '特攻': ['蚊香蝌蚪', '蚊香君', '蚊香泳士', '玛瑙水母', '毒刺水母', '呆呆兽', '呆壳兽', '小磁怪', '三合一磁怪', '鬼斯', '鬼斯通', '耿鬼'],
      '特防': ['毒贝比', '四颚针龙', '花疗环环', '好啦鱿', '乌贼王', '黏黏宝', '黏美儿', '黏美龙'],
      '速度': ['超音蝠', '大嘴蝠', '绿毛虫', '铁甲蛹', '巴大蝶', '独角虫', '铁壳蛹', '大针蜂', '波波', '比比鸟', '比雕', '鲤鱼王', '暴鲤龙', '喵喵', '猫老大', '小火马', '烈焰马', '伊布', '水伊布', '雷伊布', '火伊布']
    }
    
    const result = { HP: 0, 攻击: 0, 防御: 0, 特攻: 0, 特防: 0, 速度: 0 }
    
    for (const [stat, pokemonList] of Object.entries(evMap)) {
      if (pokemonList.includes(pokemon.name)) {
        result[stat] = 2
      }
    }
    
    if (result.HP === 0 && result.攻击 === 0 && result.防御 === 0 && result.特攻 === 0 && result.特防 === 0 && result.速度 === 0) {
      const randomStat = ['HP', '攻击', '防御', '特攻', '特防', '速度'][Math.floor(Math.random() * 6)]
      result[randomStat] = 1
    }
    
    return result
  }
  
  _checkObedience(pokemon) {
    return { obedient: true, message: '' }
  }
  
  _getMapMaxLevel() {
    if (!this.player.currentGame || !this.player.currentGame.map) {
      return 100
    }
    const config = this.player.currentGame.map.config
    if (!config || !config.levelRange) {
      return 100
    }
    return config.levelRange.max
  }
  
  _getWildSearchRewards(wildPokemon) {
    const rewards = []
    const rand = Math.random()
    
    if (rand < 0.4) {
      const items = ['普通精灵球', '伤药']
      const item = items[Math.floor(Math.random() * items.length)]
      rewards.push({ type: 'item', name: item, quantity: Math.floor(Math.random() * 2) + 1 })
    }
    
    if (rand < 0.2) {
      rewards.push({ type: 'money', amount: Math.floor(Math.random() * 30) + 10 })
    }
    
    return rewards
  }
  
  _getTrainerLoot(trainer) {
    const rewards = []
    
    if (trainer.items && trainer.items.length > 0) {
      for (const item of trainer.items) {
        rewards.push({ type: 'item', name: item.name, quantity: item.quantity })
      }
    } else {
      const rand = Math.random()
      if (rand < 0.5) {
        const itemPool = ['普通精灵球', '超级球', '伤药', '好伤药']
        const item = itemPool[Math.floor(Math.random() * itemPool.length)]
        const quantity = Math.floor(Math.random() * 3) + 1
        rewards.push({ type: 'item', name: item, quantity })
      }
    }
    
    const moneyAmount = Math.floor(Math.random() * 100 * trainer.rewardMultiplier) + 50
    rewards.push({ type: 'money', amount: moneyAmount })
    
    if (trainer.hasMedal && Math.random() < 0.3) {
      const medal = MEDALS[Math.floor(Math.random() * MEDALS.length)]
      rewards.push({ type: 'medal', name: medal })
    }
    
    if (trainer.pokemon && trainer.pokemon.length > 0) {
      const lootablePokemon = trainer.pokemon.filter(() => Math.random() < 0.3)
      for (const p of lootablePokemon) {
        rewards.push({ type: 'pokemon', name: p.name, level: p.level, rarity: p.rarity })
      }
    }
    
    return rewards
  }
}

module.exports = {
  BattleSystem,
  BattleResult,
  BattleState,
  TYPE_CHART: BattleConfig.TYPE_CHART,
  STATUS_EFFECTS: BattleConfig.STATUS_EFFECTS,
  ABILITIES: BattleConfig.ABILITIES,
  initBattleConfig
}