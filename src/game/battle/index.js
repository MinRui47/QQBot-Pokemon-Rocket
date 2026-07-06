const { Pokemon, calculateCaptureRate, ITEM_CONFIG, RARITY_COLORS } = require('../models')
const { MEDALS } = require('../map')
const { getMoveData, getPokemonTypes, getPokemonBaseStats } = require('../dataService')
const { loadTypeChart, loadStatusEffects } = require('../configCache')

let TYPE_CHART = {}
let STATUS_EFFECTS = {}

async function initBattleConfig() {
  TYPE_CHART = await loadTypeChart()
  STATUS_EFFECTS = await loadStatusEffects()
  console.log('[Battle] 战斗配置已从数据库加载')
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
    
    console.log(`[DEBUG] startWildBattle: playerPokemon=${playerPokemon?.name}, hp=${playerPokemon?.hp}/${playerPokemon?.maxHp}, beltCount=${this.player.currentGame.belt.pokemon.length}`)
    
    if (!playerPokemon) {
      result.message = '没有可用的精灵！战斗失败！'
      return result
    }
    
    const obedienceCheck = this._checkObedience(playerPokemon)
    if (!obedienceCheck.obedient) {
      result.message = obedienceCheck.message
      return result
    }
    
    this.currentBattle = {
      type: 'wild',
      opponent: wild,
      playerPokemon: playerPokemon,
      turn: 1,
      log: [],
      playerTurnState: {},
      opponentTurnState: {}
    }
    
    result.message = `\n【遭遇】野生 ${wild.name} Lv.${wild.level}（${RARITY_COLORS[wild.rarity].color}${RARITY_COLORS[wild.rarity].name}）出现！\n\n${playerPokemon.name} Lv.${playerPokemon.level} HP:${playerPokemon.hp}/${playerPokemon.maxHp}\n${wild.name} Lv.${wild.level} HP:${wild.hp}/${wild.maxHp}\n\nIV评价：${playerPokemon.getIVPercentage()}% | 亲密度：${playerPokemon.affection}`
    
    const battleResult = await this._turnBasedBattle(playerPokemon, wild)
    result.won = battleResult.won
    result.damageReceived = battleResult.damageReceived
    result.turnLog = battleResult.log

    if (battleResult.won) {
      result.message += `\n\n【胜利】${wild.name} 被击败！`
      
      // 追加最近几轮的战报（最多显示最近5轮）
      const totalTurns = battleResult.log.length
      const recentTurns = battleResult.log.slice(-10) // 取最近10条日志≈5轮
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
    } else {
      result.message += `\n\n【失败】${playerPokemon.name} 被击败！${wild.name} 逃走了...`
      // 失败也展示最近战报
      const recentTurns = battleResult.log.slice(-6)
      for (const line of recentTurns) {
        result.message += '\n' + line
      }
    }
    
    return result
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
      const trainerPokemon = new Pokemon(trainer.pokemon[trainerPokemonIndex].name, trainer.pokemon[trainerPokemonIndex].level)
      
      const obedienceCheck = this._checkObedience(currentPlayerPokemon)
      if (!obedienceCheck.obedient) {
        result.message += `\n${obedienceCheck.message}`
        break
      }
      
      result.message += `\n--- 第 ${trainerPokemonIndex + 1} 场 ---\n`
      result.message += `${currentPlayerPokemon.name} Lv.${currentPlayerPokemon.level} HP:${currentPlayerPokemon.hp}/${currentPlayerPokemon.maxHp}\n`
      result.message += `${trainerPokemon.name} Lv.${trainerPokemon.level} HP:${trainerPokemon.hp}/${trainerPokemon.maxHp}\n`
      
      const battleResult = await this._turnBasedBattle(currentPlayerPokemon, trainerPokemon)
      battleLog = battleLog.concat(battleResult.log)
      
      // 更新训练家精灵的HP状态（用于后续抢夺）
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
    
    // 显示完整战斗日志
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
    } else {
      result.message += '\n\n【失败】战斗失败！'
    }
    
    return result
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
  
  async _turnBasedBattle(p1, p2) {
    const result = { won: false, damageReceived: 0, log: [] }
    
    const p1Speed = p1.getSpeed()
    const p2Speed = p2.getSpeed()
    const p1GoesFirst = p1Speed >= p2Speed
    
    let turn = 1
    let p1State = { boosts: {}, status: null, statusTurns: 0, recharging: false, protecting: false }
    let p2State = { boosts: {}, status: null, statusTurns: 0, recharging: false, protecting: false }
    
    // 回合开始时显示双方状态
    result.log.push(`${p1.name} Lv.${p1.level} HP: ${p1.hp}/${p1.maxHp}`)
    result.log.push(`${p2.name} Lv.${p2.level} HP: ${p2.hp}/${p2.maxHp}`)
    
    while (!p1.isFainted() && !p2.isFainted()) {
      // 回合标题
      result.log.push(`\n━━━ 第 ${turn} 回合 ━━━`)
      
      if (p1GoesFirst) {
        p1State = this._processStatusRecovery(p1, p1State, result)
        if (!p1State.recharging && !this._shouldSkipTurn(p1State)) {
          await this._executeTurn(p1, p2, p1State, p2State, result, 'player')
        } else if (p1State.recharging) {
          result.log.push(`${p1.name} 在蓄力中...`)
        } else if (this._shouldSkipTurn(p1State)) {
          const skipStatus = STATUS_EFFECTS[p1State.status]
          result.log.push(`${p1.name} ${skipStatus?.message || '无法行动'}！`)
        }
        
        if (!p2.isFainted()) {
          p2State = this._processStatusRecovery(p2, p2State, result)
          if (!p2State.recharging && !this._shouldSkipTurn(p2State)) {
            await this._executeTurn(p2, p1, p2State, p1State, result, 'opponent')
          } else if (p2State.recharging) {
            result.log.push(`${p2.name} 在蓄力中...`)
          } else if (this._shouldSkipTurn(p2State)) {
            const skipStatus = STATUS_EFFECTS[p2State.status]
            result.log.push(`${p2.name} ${skipStatus?.message || '无法行动'}！`)
          }
        }
      } else {
        p2State = this._processStatusRecovery(p2, p2State, result)
        if (!p2State.recharging && !this._shouldSkipTurn(p2State)) {
          await this._executeTurn(p2, p1, p2State, p1State, result, 'opponent')
        } else if (p2State.recharging) {
          result.log.push(`${p2.name} 在蓄力中...`)
        } else if (this._shouldSkipTurn(p2State)) {
          const skipStatus = STATUS_EFFECTS[p2State.status]
          result.log.push(`${p2.name} ${skipStatus?.message || '无法行动'}！`)
        }
        
        if (!p1.isFainted()) {
          p1State = this._processStatusRecovery(p1, p1State, result)
          if (!p1State.recharging && !this._shouldSkipTurn(p1State)) {
            await this._executeTurn(p1, p2, p1State, p2State, result, 'player')
          } else if (p1State.recharging) {
            result.log.push(`${p1.name} 在蓄力中...`)
          } else if (this._shouldSkipTurn(p1State)) {
            const skipStatus = STATUS_EFFECTS[p1State.status]
            result.log.push(`${p1.name} ${skipStatus?.message || '无法行动'}！`)
          }
        }
      }
      
      p1State = this._applyStatusEffects(p1, p1State, result)
      p2State = this._applyStatusEffects(p2, p2State, result)
      
      // 回合结束时显示HP
      if (!p1.isFainted()) {
        result.log.push(`> ${p1.name} HP: ${p1.hp}/${p1.maxHp}`)
      }
      if (!p2.isFainted()) {
        result.log.push(`> ${p2.name} HP: ${p2.hp}/${p2.maxHp}`)
      }
      
      turn++
      
      if (turn > 50) {
        break
      }
    }
    
    result.won = p2.isFainted()
    
    return result
  }
  
  _shouldSkipTurn(state) {
    if (!state.status) return false
    
    const effect = STATUS_EFFECTS[state.status]
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
    
    const effect = STATUS_EFFECTS[state.status]
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
    
    const effect = STATUS_EFFECTS[state.status]
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
  
  async _executeTurn(attacker, defender, attackerState, defenderState, result, attackerType) {
    if (attacker.isFainted()) return
    
    // 混乱自伤检查
    if (attackerState.status === 'confusion') {
      const confusionChance = STATUS_EFFECTS['confusion'].skipChance || 0.33
      if (Math.random() < confusionChance) {
        const selfDamage = Math.floor(attacker.maxHp * 0.25)
        attacker.hp = Math.max(1, attacker.hp - selfDamage)
        result.log.push(`${attacker.name} 混乱中！对自己造成了 ${selfDamage} 点伤害！`)
        return
      }
    }
    
    let moveName
    
    if (attackerType === 'player') {
      moveName = attacker.moves[0]
      if (!moveName || attacker.getMovePP(moveName) <= 0) {
        moveName = attacker.getRandomUsableMove()
      }
    } else {
      moveName = attacker.getRandomUsableMove()
    }
    
    if (!moveName) {
      result.log.push(`${attacker.name} 没有可用的招式！`)
      return
    }
    
    const moveData = await getMoveData(moveName)
    
    attacker.useMovePP(moveName)
    
    const attackerLabel = attackerType === 'player' ? attacker.name : `${attacker.name}`
    
    result.log.push(`${attackerLabel} 使用了 ${moveName}！`)
    
    if (!this._checkAccuracy(moveData, attacker, defender)) {
      result.log.push(`${attackerLabel} 的 ${moveName} 命中率太低，没有命中！`)
      return
    }
    
    if (moveData.category === 'status' || moveData.power === 0) {
      this._applyStatusMove(attacker, defender, moveData, attackerState, defenderState, result)
      return
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
      return
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
  }
  
  _checkAccuracy(moveData, attacker, defender) {
    if (moveData.alwaysHits) return true
    
    let accuracy = moveData.accuracy || 95
    
    const evasion = defender.stats['闪避'] || 0
    const accuracyStat = attacker.stats['命中'] || 0
    const accuracyModifier = (100 + accuracyStat) / (100 + evasion)
    
    accuracy *= accuracyModifier
    
    return Math.random() * 100 < accuracy
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
      multiplier *= TYPE_CHART[moveType]?.[type] || 1
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
    
    let damage = ((2 * level / 5 + 2) * basePower * attackStat) / (5 * defenseStat) + 2
    
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
  
  _applyStatusMove(attacker, defender, moveData, attackerState, defenderState, result) {
    if (!moveData.effect) return
    
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
      // 检查目标是否已有异常状态
      if (defenderState.status) {
        result.log.push(`但是失败了！`)
        return
      }
      defenderState.status = effect.status
      defenderState.statusTurns = 0
      result.log.push(`${defender.name} 陷入了${STATUS_EFFECTS[effect.status]?.name || effect.status}状态！`)
    }
    
    if (effect.protect) {
      attackerState.protecting = true
      result.log.push(`${attacker.name} 展开了保护！`)
    }
    
    if (effect.rechargeTurn) {
      attackerState.recharging = true
      result.log.push(`${attacker.name} 需要蓄力！`)
    }
  }
  
  _applyMoveEffect(attacker, defender, effect, attackerState, defenderState, result) {
    if (!effect) return
    
    if (effect.chance && Math.random() > effect.chance) return
    
    if (effect.status) {
      // 检查目标是否已有异常状态
      if (defenderState.status) {
        result.log.push(`但是失败了！`)
        return
      }
      defenderState.status = effect.status
      defenderState.statusTurns = 0
      result.log.push(`${defender.name} 陷入了${STATUS_EFFECTS[effect.status]?.name || effect.status}状态！`)
    }
    
    if (effect.flinch) {
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
  TYPE_CHART,
  STATUS_EFFECTS,
  initBattleConfig
}