class EvacuationState {
  constructor() {
    this.active = false
    this.timeRemaining = 0
    this.evacuationPointFound = false
    this.distanceToExit = 0
  }
  
  activate(steps) {
    this.active = true
    this.timeRemaining = steps * 5
    this.evacuationPointFound = false
    this.distanceToExit = Math.floor(Math.random() * 3) + 1
  }
  
  deactivate() {
    this.active = false
    this.timeRemaining = 0
    this.evacuationPointFound = false
    this.distanceToExit = 0
  }
  
  tick() {
    if (!this.active) return
    
    this.timeRemaining--
    
    if (this.timeRemaining <= 0) {
      this.active = false
    }
  }
  
  moveTowardsExit() {
    if (!this.active) return { success: false, message: '未处于撤离窗口期' }
    
    if (!this.evacuationPointFound) {
      this.evacuationPointFound = true
      return { success: true, message: '找到撤离点！正在向撤离点移动...', found: true }
    }
    
    this.distanceToExit--
    
    if (this.distanceToExit <= 0) {
      return { success: true, message: '成功抵达撤离点！', escaped: true }
    }
    
    return { success: true, message: `距离撤离点还有 ${this.distanceToExit} 步...` }
  }
  
  toJSON() {
    return {
      active: this.active,
      timeRemaining: this.timeRemaining,
      evacuationPointFound: this.evacuationPointFound,
      distanceToExit: this.distanceToExit
    }
  }
  
  static fromJSON(data) {
    const state = new EvacuationState()
    state.active = data.active
    state.timeRemaining = data.timeRemaining
    state.evacuationPointFound = data.evacuationPointFound
    state.distanceToExit = data.distanceToExit
    return state
  }
}

class EvacuationSystem {
  constructor(player) {
    this.player = player
    this.state = new EvacuationState()
  }
  
  checkTrigger(game) {
    if (this.state.active) return false
    
    if (game.backpack.isFull()) {
      this._triggerEvacuation(game)
      return true
    }
    
    if (game.stepsRemaining <= 0) {
      this._triggerEvacuation(game)
      return true
    }
    
    return false
  }
  
  _triggerEvacuation(game) {
    this.state.activate(game.stepsRemaining)
    
    return {
      triggered: true,
      message: '【撤离点刷新】背包已满/步数耗尽！请在窗口期内撤离！',
      timeRemaining: this.state.timeRemaining
    }
  }
  
  attemptEvacuation(game) {
    if (!this.state.active) {
      return { success: false, message: '未处于撤离窗口期' }
    }
    
    const result = this.state.moveTowardsExit()
    
    if (result.escaped) {
      return this._handleSuccessfulEvacuation(game)
    }
    
    return result
  }
  
  _handleSuccessfulEvacuation(game) {
    const warehouse = this.player.warehouse
    const rewards = []
    
    for (const item of game.backpack.items) {
      const addResult = warehouse.addItem(item.name, item.quantity)
      if (addResult.success) {
        rewards.push(`\u7269\u8D44：${item.name} x${item.quantity}`)
      } else {
        rewards.push(`\u65E0\u6CD5\u5B58\u5165：${item.name} x${item.quantity}（仓库已满）`)
      }
    }
    
    for (const pokemon of game.belt.pokemon) {
      if (!pokemon.isInitial) {
        const addResult = warehouse.addPokemon(pokemon)
        if (addResult.success) {
          rewards.push(`\u5B9D\u53EF\u683C\uFF1A${pokemon.name} Lv.${pokemon.level}`)
        } else {
          rewards.push(`\u65E0\u6CD5\u5B58\u5165：${pokemon.name} Lv.${pokemon.level}（仓库已满）`)
        }
      } else {
        const addResult = warehouse.addPokemon(pokemon)
        if (addResult.success) {
          rewards.push(`\u521D\u59CB\u7CBE\u7075\uFF1A${pokemon.name} Lv.${pokemon.level}（已存入仓库）`)
        }
      }
    }
    
    const taskRewards = game.taskSystem.getAllRewards()
    if (taskRewards.money > 0) {
      this.player.addMoney(taskRewards.money)
      rewards.push(`\u4EFB\u52A1\u5956\u52B1：${taskRewards.money} 金币`)
    }
    if (taskRewards.warehouseSlots > 0) {
      warehouse.expand(taskRewards.warehouseSlots)
      rewards.push(`\u4ED3\u5E93\u6269\u5BB9：+${taskRewards.warehouseSlots} 格`)
    }
    
    this.player.successfulMissions++
    this.player.totalMissions++
    
    this.state.deactivate()
    game.endGame()
    
    return {
      success: true,
      escaped: true,
      message: `【撤离成功】\n\n本局收获：\n${rewards.join('\n')}\n\n所有物资已存入个人仓库！`,
      rewards: rewards
    }
  }
  
  handleDefeat(game) {
    const lostItems = game.backpack.items.map(item => `${item.name} x${item.quantity}`)
    const lostPokemon = game.belt.pokemon.map(p => `${p.name} Lv.${p.level}`)
    
    const message = `【撤离失败】\n\n本局损失：\n- 物资：${lostItems.join('、') || '无'}\n- 宝可梦：${lostPokemon.join('、') || '无'}\n\n所有外勤资产已全部清零！`
    
    this.player.totalMissions++
    this.state.deactivate()
    game.status = 'ended'
    
    // 清除所有未解决的遭遇和被击败的训练家
    game.currentEncounter = null
    game.defeatedTrainers = []
    game.weakenedPokemon = null
    
    // 重置玩家状态，返回火箭队基地
    game.player.currentGame = null
    game.player.location = '火箭队基地'
    
    return {
      success: false,
      escaped: false,
      message: message,
      lostItems: lostItems,
      lostPokemon: lostPokemon
    }
  }
  
  toJSON() {
    return {
      state: this.state.toJSON()
    }
  }
  
  static fromJSON(data, player) {
    const es = new EvacuationSystem(player)
    es.state = EvacuationState.fromJSON(data.state)
    return es
  }
}

module.exports = {
  EvacuationSystem,
  EvacuationState
}