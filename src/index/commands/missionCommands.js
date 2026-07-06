/**
 * 外勤任务指令
 * 只有在外勤时才能使用的指令
 */

/**
 * 处理外勤指令
 * @param {string} content - 用户输入
 * @param {object} player - 玩家对象
 * @param {object} gameManager - 游戏管理器
 * @param {function} sendFn - 发送消息函数
 * @param {function} namedSend - 发送带名称消息函数
 * @param {function} isOnMission - 检查是否在外勤
 * @param {function} withHints - 添加提示函数
 * @param {function} addHint - 添加单条提示函数
 * @returns {boolean} - 是否处理了该指令
 */
async function handleMissionCommands(content, player, gameManager, sendFn, namedSend, isOnMission, withHints, addHint) {
  // 移动（仅外勤）
  if (content.startsWith('移动')) {
    if (!isOnMission(player)) {
      sendFn('请先发起外勤任务')
      return true
    }
    const direction = content.slice(2).trim()
    const result = gameManager.move(player, direction)
    let msg = result.message || ''
    if (result.stepsTaken !== undefined && result.maxSteps !== undefined) {
      msg += `\n已走步数: ${result.stepsTaken}/${result.maxSteps}`
    }
    if (result.availableDirections && result.availableDirections.length > 0) {
      msg += `\n可用方向: ${result.availableDirections.map(d => `${d.direction}(${d.location})`).join('、')}`
      msg += '\n输入"移动 [方向]"可以进行移动'
    }
    if (result.encounter) {
      if (result.encounter.type === 'wild') {
        msg += `\n遭遇野生 ${result.encounter.pokemon.name} Lv.${result.encounter.pokemon.level}！`
      } else {
        msg += `\n遭遇 ${result.encounter.trainer.name}！`
      }
    }
    if (result.evacuation) {
      msg += '\n⚠️ 背包已满！请撤离！'
    }
    msg = withHints(msg, result)
    if (!result.encounter && !result.evacuation) {
      // 根据当前位置是否有可探索内容显示不同提示
      const features = player.currentGame.map.getAvailableFeatures()
      const hasUnexplored = features.some(f => !f.isExplored)
      if (hasUnexplored) {
        msg += '\n输入"查看周围"查看可探索地点'
      } else {
        msg += '\n输入"移动 [方向]"继续前进'
      }
    }
    namedSend(msg)
    return true
  }

  // 抢夺（仅外勤）
  if (content === '抢夺') {
    if (!isOnMission(player)) {
      sendFn('请先发起外勤任务')
      return true
    }
    const trainer = gameManager.searchTrainer(player)
    if (trainer.success) {
      namedSend(trainer.message)
      return true
    }
    namedSend('没有可抢夺的训练家！请先击败训练家')
    return true
  }

  // 抢夺精灵（仅外勤）
  if (content.startsWith('抢夺精灵')) {
    if (!isOnMission(player)) {
      sendFn('请先发起外勤任务')
      return true
    }
    const parts = content.split(' ')
    const index = parseInt(parts[2]) - 1
    const result = gameManager.lootTrainerPokemon(player, index)
    namedSend(result.message)
    return true
  }

  // 抢夺物品（仅外勤）
  if (content.startsWith('抢夺物品')) {
    if (!isOnMission(player)) {
      sendFn('请先发起外勤任务')
      return true
    }
    const parts = content.split(' ')
    const itemName = parts[1]
    const quantity = parseInt(parts[2]) || 1
    const result = gameManager.lootTrainerItem(player, itemName, quantity)
    namedSend(result.message)
    return true
  }

  // 抢夺背包（仅外勤）
  if (content === '抢夺背包') {
    if (!isOnMission(player)) {
      sendFn('请先发起外勤任务')
      return true
    }
    const result = gameManager.lootTrainerBackpack(player)
    namedSend(result.message)
    return true
  }

  // 搜刮（仅外勤）
  if (content === '搜刮') {
    if (!isOnMission(player)) {
      sendFn('请先发起外勤任务')
      return true
    }
    const result = gameManager.search(player)
    let msg = withHints(result.message, result)
    if (!msg.includes('输入"')) {
      msg += '\n输入"移动 [方向]"继续探索'
    }
    namedSend(msg)
    return true
  }

  // 上楼（仅外勤）
  if (content === '上楼') {
    if (!isOnMission(player)) {
      sendFn('请先发起外勤任务')
      return true
    }
    const result = gameManager.goToFloor(player, player.currentGame?.map.currentFloor + 1)
    namedSend(result.message)
    return true
  }

  // 下楼（仅外勤）
  if (content === '下楼') {
    if (!isOnMission(player)) {
      sendFn('请先发起外勤任务')
      return true
    }
    const result = gameManager.goToFloor(player, player.currentGame?.map.currentFloor - 1)
    namedSend(result.message)
    return true
  }

  // 离开建筑（仅外勤）
  if (content === '离开') {
    if (!isOnMission(player)) {
      sendFn('请先发起外勤任务')
      return true
    }
    const result = gameManager.leaveBuilding(player)
    namedSend(result.message)
    return true
  }

  // 查看周围（仅外勤）
  if (content === '查看周围' || content === '环顾') {
    if (!isOnMission(player)) {
      sendFn('请先发起外勤任务')
      return true
    }
    // 检查是否在建筑内
    const game = player.currentGame
    if (game && game.map && game.map.currentBuilding) {
      // 在建筑内，显示建筑内部情况
      const result = gameManager.getBuildingStatus(player)
      namedSend(result.message)
      return true
    }
    
    // 不在建筑内，显示地图特征
    const result = gameManager.getLocationFeatures(player)
    if (!result.success) {
      namedSend(result.message)
      return true
    }
    let msg = `【当前位置】${result.location}\n`
    if (result.locationInfo) {
      msg += `${result.locationInfo.description || ''}\n`
    }
    if (result.features && result.features.length > 0) {
      msg += `\n可探索地点:\n`
      const searchableFeatures = []
      const enterableFeatures = []
      const healFeatures = []
      const shopFeatures = []
      for (const f of result.features) {
        let tags = []
        if (f.canSearch) {
          tags.push(f.isExplored ? '【已搜索】' : '【可搜索】')
          if (!f.isExplored) searchableFeatures.push(f.name)
        }
        if (f.canEnter) {
          tags.push(f.isExplored ? '【已探索】' : '【可进入】')
          if (!f.isExplored) enterableFeatures.push(f.name)
        }
        if (f.canHeal) {
          tags.push('【可治疗】')
          healFeatures.push(f.name)
        }
        if (f.canShop) {
          tags.push('【可购物】')
          shopFeatures.push(f.name)
        }
        msg += `  ${f.name} ${tags.join('')} - ${f.description}\n`
      }
      // 根据实际可执行的指令动态生成提示
      const hints = []
      if (searchableFeatures.length > 0) {
        hints.push(`输入"搜索 ${searchableFeatures[0]}"搜刮物资`)
      }
      if (enterableFeatures.length > 0) {
        hints.push(`输入"进入 ${enterableFeatures[0]}"进入探索`)
      }
      if (healFeatures.length > 0) {
        hints.push(`输入"进入 ${healFeatures[0]}"治疗精灵`)
      }
      if (shopFeatures.length > 0) {
        hints.push(`输入"进入 ${shopFeatures[0]}"购买物品`)
      }
      if (hints.length > 0) {
        msg += `\n${hints.join('，或')}`
      }
    } else {
      msg += `\n这里没有可探索的地点，输入"移动 [方向]"前往其他地点`
    }
    namedSend(msg)
    return true
  }

  // 搜索（仅外勤）
  if (content.startsWith('搜索') || content.startsWith('搜寻')) {
    if (!isOnMission(player)) {
      sendFn('请先发起外勤任务')
      return true
    }
    const parts = content.split(' ')
    const featureName = parts[1]
    if (!featureName) {
      // 显示当前可搜索的地点
      const features = player.currentGame.map.getAvailableFeatures()
      const searchable = features.filter(f => f.canSearch && !f.isExplored)
      if (searchable.length === 0) {
        sendFn('当前位置没有可搜索的地点，输入"查看周围"查看情况')
      } else {
        sendFn(`请输入要搜索的地点名称，例如：搜索 ${searchable[0].name}\n可搜索地点：${searchable.map(f => f.name).join('、')}`)
      }
      return true
    }
    const result = gameManager.searchFeature(player, featureName)
    const msg = withHints(result.message, result)
    namedSend(msg)
    return true
  }

  // 进入（仅外勤）
  if (content.startsWith('进入')) {
    if (!isOnMission(player)) {
      sendFn('请先发起外勤任务')
      return true
    }
    const featureName = content.slice(2).trim()
    if (!featureName) {
      // 显示当前可进入的地点
      const features = player.currentGame.map.getAvailableFeatures()
      const enterable = features.filter(f => (f.canEnter || f.canHeal || f.canShop) && !f.isExplored)
      if (enterable.length === 0) {
        sendFn('当前位置没有可进入的地点，输入"查看周围"查看情况')
      } else {
        sendFn(`请输入要进入的地点名称，例如：进入 ${enterable[0].name}\n可进入地点：${enterable.map(f => f.name).join('、')}`)
      }
      return true
    }
    const result = gameManager.enterFeature(player, featureName)
    const msg = withHints(result.message, result)
    namedSend(msg)
    return true
  }

  // 战斗（仅外勤）
  if (content === '战斗') {
    if (!isOnMission(player)) {
      sendFn('请先发起外勤任务')
      return true
    }
    const result = await gameManager.battle(player)
    let msg = result.message
    if (result.won && !msg.includes('撤离') && !msg.includes('输入"')) {
      msg += '\n输入"移动 [方向]"继续探索'
    }
    namedSend(msg)
    return true
  }

  // 捕捉（仅外勤）
  if (content === '精灵球' || content === '普通精灵球' || content === '超级精灵球' || 
      content === '超级球' || content === '高级球' || content === '大师球') {
    if (!isOnMission(player)) {
      sendFn('请先发起外勤任务')
      return true
    }
    const result = gameManager.capturePokemon(player, content)
    let msg = result.message
    if (result.captured) {
      msg += '\n输入"移动 [方向]"继续探索，或"查看周围"查看地点'
    } else if (result.ranAway) {
      msg += '\n输入"移动 [方向]"继续探索'
    } else {
      msg += '\n输入"精灵球"再次尝试捕捉，或"逃跑"让它逃走'
    }
    namedSend(msg)
    return true
  }

  // 逃跑（仅外勤）
  if (content === '逃跑') {
    if (!isOnMission(player)) {
      sendFn('请先发起外勤任务')
      return true
    }
    const result = gameManager.runAway(player)
    if (result.success) {
      namedSend(result.message + '\n输入"移动 [方向]"继续探索')
    } else {
      namedSend(result.message)
    }
    return true
  }

  // 使用道具（仅外勤）
  if (content.startsWith('使用')) {
    if (!isOnMission(player)) {
      sendFn('请先发起外勤任务')
      return true
    }
    const parts = content.split(' ')
    const itemName = parts[1]
    const targetIndex = parts[2] ? parseInt(parts[2]) : 0
    const result = gameManager.useItem(player, itemName, targetIndex)
    let msg = addHint(result.message)
    namedSend(msg)
    return true
  }

  // 丢弃物品（仅外勤）
  if (content.startsWith('丢弃')) {
    if (!isOnMission(player)) {
      sendFn('请先发起外勤任务')
      return true
    }
    const parts = content.split(' ')
    const itemName = parts[1]
    const quantity = parseInt(parts[2]) || 1
    const result = gameManager.dropItem(player, itemName, quantity)
    let msg = addHint(result.message)
    namedSend(msg)
    return true
  }

  // 撤离（仅外勤）
  if (content === '撤离') {
    if (!isOnMission(player)) {
      sendFn('请先发起外勤任务')
      return true
    }
    const result = gameManager.evacuate(player)
    namedSend(result.message)
    return true
  }

  // 待拾取（仅外勤）
  if (content === '待拾取' || content === '地上物品') {
    if (!isOnMission(player)) {
      sendFn('请先发起外勤任务')
      return true
    }
    const pendingItems = player.currentGame.getPendingItems()
    if (pendingItems.length === 0) {
      namedSend('地上没有可拾取的道具')
      return true
    }
    
    let msg = `【地上物品】\n`
    for (const item of pendingItems) {
      msg += `  ${item}\n`
    }
    msg += `\n输入"拾取 [物品名]"拾取道具`
    namedSend(msg)
    return true
  }

  // 拾取道具（仅外勤）
  if (content.startsWith('拾取')) {
    if (!isOnMission(player)) {
      sendFn('请先发起外勤任务')
      return true
    }
    const parts = content.split(' ')
    const itemName = parts.slice(1).join(' ')
    const result = gameManager.pickupItem(player, itemName)
    namedSend(result.message)
    return true
  }

  return false
}

module.exports = { handleMissionCommands }
