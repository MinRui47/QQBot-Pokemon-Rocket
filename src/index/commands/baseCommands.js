/**
 * 火箭队基地指令
 * 只有在基地时才能使用的指令
 */

/**
 * 处理基地指令
 * @param {string} content - 用户输入
 * @param {object} player - 玩家对象
 * @param {object} gameManager - 游戏管理器
 * @param {function} sendFn - 发送消息函数
 * @param {function} namedSend - 发送带名称消息函数
 * @param {function} isAtBase - 检查是否在基地
 * @returns {boolean} - 是否处理了该指令
 */
function handleBaseCommands(content, player, gameManager, sendFn, namedSend, isAtBase) {
  // 签到（仅基地）
  if (content === '签到') {
    if (!isAtBase(player)) {
      sendFn('请先返回火箭队基地后再签到')
      return true
    }
    const result = gameManager.dailySignIn(player)
    sendFn(result.message)
    return true
  }

  // 军衔（仅基地）
  if (content === '军衔' || content === '我的称号' || content === '我的军衔') {
    if (!isAtBase(player)) {
      sendFn('请先返回火箭队基地后再查看军衔')
      return true
    }
    const result = gameManager.getPlayerRank(player)
    if (!result.success) {
      sendFn(result.message)
      return true
    }
    let msg = `【${result.rank}】\n`
    msg += `累计撤离总值：${result.totalEvacuationValue}\n`
    msg += `常驻 Buff：\n`
    const buffs = result.buffs
    if (buffs.sellPriceBonus) msg += `  撤离物资售价 +${(buffs.sellPriceBonus * 100).toFixed(1)}%\n`
    if (buffs.escapeRate) msg += `  对战逃跑成功率 +${(buffs.escapeRate * 100).toFixed(1)}%\n`
    if (buffs.poisonPowerBonus) msg += `  毒系招式威力 +${(buffs.poisonPowerBonus * 100).toFixed(1)}%\n`
    if (buffs.darkPoisonPowerBonus) msg += `  毒、恶招式威力 +${(buffs.darkPoisonPowerBonus * 100).toFixed(1)}%\n`
    if (buffs.triplePowerBonus) msg += `  毒/恶/地面三系威力 +${(buffs.triplePowerBonus * 100).toFixed(1)}%\n`
    if (buffs.shinyRateBonus) msg += `  闪光率 +${(buffs.shinyRateBonus * 100).toFixed(1)}%\n`
    if (buffs.captureRateBonus) msg += `  普通捕捉率 +${(buffs.captureRateBonus * 100).toFixed(1)}%\n`
    if (buffs.allCaptureBonus) msg += `  全捕捉率 +${(buffs.allCaptureBonus * 100).toFixed(1)}%\n`
    if (buffs.rareCaptureBonus) msg += `  稀有捕捉率 +${(buffs.rareCaptureBonus * 100).toFixed(1)}%\n`
    msg += `\n下一阶需累计：${result.nextThreshold}`
    sendFn(msg)
    return true
  }

  // 藏品（仅基地）
  if (content === '藏品') {
    if (!isAtBase(player)) {
      sendFn('请先返回火箭队基地后再查看藏品')
      return true
    }
    const result = gameManager.getPlayerCollections(player)
    if (!result.success || result.items.length === 0) {
      sendFn('尚无藏品')
      return true
    }
    let msg = `【藏品图鉴】\n`
    for (const item of result.items) {
      const rarityLabel = item.info ? item.info.rarity : '未知'
      msg += `${item.name} x${item.quantity}（${rarityLabel}）\n`
    }
    sendFn(msg)
    return true
  }

  // 租借（仅基地）
  if (content.startsWith('租借')) {
    if (!isAtBase(player)) {
      sendFn('请先返回火箭队基地后再租借精灵')
      return true
    }
    const pokemonName = content.slice(2).trim()
    const result = gameManager.rentPokemon(player, pokemonName)
    sendFn(result.message)
    return true
  }

  // 外勤（仅基地）
  if (content.startsWith('外勤')) {
    if (!isAtBase(player)) {
      sendFn('请先返回火箭队基地后再发起外勤')
      return true
    }
    const mapName = content.slice(2).trim() || undefined
    const result = gameManager.dispatch(player, mapName)
    sendFn(result.message)
    return true
  }

  // 地图（仅基地）
  if (content === '地图') {
    if (!isAtBase(player)) {
      sendFn('请先返回火箭队基地后再查看地图')
      return true
    }
    const result = gameManager.getAvailableMaps(player)
    if (!result.success) {
      sendFn(result.message)
      return true
    }
    let msg = `【可用地图】\n`
    for (const mapName of result.maps) {
      const info = gameManager.getMapInfo(mapName)
      msg += `${mapName} - ${info.difficulty} - 步数:${info.steps.min}-${info.steps.max}\n`
    }
    msg += '\n输入"外勤 [地图名]"出击（不输入默认第一个）'
    sendFn(msg)
    return true
  }

  // 全部存入（仅基地）
  if (content === '全部存入' || content === '存入') {
    if (!isAtBase(player)) {
      sendFn('请先返回火箭队基地后再存入仓库')
      return true
    }
    const result = gameManager.storeAll(player)
    namedSend(result.message)
    return true
  }

  // 出售物品（仅基地）
  if (content.startsWith('出售')) {
    if (!isAtBase(player)) {
      sendFn('请先返回火箭队基地后再出售物品')
      return true
    }
    const parts = content.split(' ')
    const itemName = parts[1]
    const quantity = parseInt(parts[2]) || 1
    const result = gameManager.sellDirect(player, itemName, quantity)
    namedSend(result.message)
    return true
  }

  // 上架物品（仅基地）
  if (content.startsWith('上架')) {
    if (!isAtBase(player)) {
      sendFn('请先返回火箭队基地后再上架物品')
      return true
    }
    const parts = content.split(' ')
    const itemType = parts[1] || 'player'
    const itemName = parts[2]
    const quantity = parseInt(parts[3]) || 1
    const price = parseInt(parts[4]) || 100
    const result = gameManager.listItem(player, itemType, itemName, quantity, price)
    namedSend(result.message)
    return true
  }

  // 购买物品（仅基地）
  if (content.startsWith('购买')) {
    if (!isAtBase(player)) {
      sendFn('请先返回火箭队基地后再购买物品')
      return true
    }
    const listingId = parseInt(content.slice(2).trim())
    const result = gameManager.buyItem(player, listingId)
    namedSend(result.message)
    return true
  }

  // 取消上架（仅基地）
  if (content.startsWith('取消上架')) {
    if (!isAtBase(player)) {
      sendFn('请先返回火箭队基地后再操作')
      return true
    }
    const listingId = parseInt(content.slice(4).trim())
    const result = gameManager.cancelListing(player, listingId)
    namedSend(result.message)
    return true
  }

  // 商店（仅基地）
  if (content === '商店') {
    if (!isAtBase(player)) {
      sendFn('请先返回火箭队基地后再查看商店')
      return true
    }
    const listings = gameManager.getListings('player')
    let msg = `【玩家商店】\n`
    if (listings.length === 0) {
      msg += `暂无商品`
    } else {
      for (const listing of listings) {
        msg += `ID:${listing.id} ${listing.itemName} x${listing.quantity} 售价:${listing.price}金币（卖家:${listing.sellerName}）\n`
      }
    }
    namedSend(msg)
    return true
  }

  // 拍卖行（仅基地）
  if (content === '拍卖行') {
    if (!isAtBase(player)) {
      sendFn('请先返回火箭队基地后再查看拍卖行')
      return true
    }
    const listings = gameManager.getListings('auction')
    let msg = `【拍卖行】\n`
    if (listings.length === 0) {
      msg += `暂无拍卖品`
    } else {
      for (const listing of listings) {
        msg += `ID:${listing.id} ${listing.itemName} x${listing.quantity} 起拍价:${listing.price}金币（卖家:${listing.sellerName}）\n`
      }
    }
    namedSend(msg)
    return true
  }

  // 勋章（仅基地）
  if (content === '勋章') {
    if (!isAtBase(player)) {
      sendFn('请先返回火箭队基地后再查看勋章')
      return true
    }
    const medals = gameManager.getMedalInfo(player)
    let msg = `【道馆勋章】\n`
    for (const medal of medals) {
      msg += `${medal.name}: ${medal.owned ? '✓' : '✗'}\n`
    }
    const obedience = gameManager.getObedienceInfo(player)
    msg += `\n听话等级: ${obedience.obedienceLevel}级\n`
    msg += `描述: ${obedience.description}\n`
    namedSend(msg)
    return true
  }

  // 公金（仅基地）
  if (content === '公金') {
    if (!isAtBase(player)) {
      sendFn('请先返回火箭队基地后再查看公共资金')
      return true
    }
    const funds = gameManager.getTeamRocketFunds()
    namedSend(`火箭队公共资金: ${funds} 金币`)
    return true
  }

  // 仓库（仅基地）
  if (content === '仓库') {
    if (!isAtBase(player)) {
      sendFn('请先返回火箭队基地后再查看仓库')
      return true
    }
    const warehouse = gameManager.getPlayerWarehouse(player)
    let msg = `【个人仓库】\n`
    msg += `容量: ${warehouse.usedSlots}/${warehouse.maxSlots}\n`
    
    msg += `\n物品:\n`
    if (warehouse.items.length === 0) {
      msg += `  无\n`
    } else {
      for (const item of warehouse.items) {
        msg += `  ${item.name} x${item.quantity}（${item.basePrice}金币/个）\n`
      }
    }
    
    msg += `\n藏品:\n`
    if (!warehouse.collections || warehouse.collections.length === 0) {
      msg += `  无\n`
    } else {
      for (const col of warehouse.collections) {
        const rarityText = { common: '普通', uncommon: '优秀', rare: '罕见', epic: '史诗', legendary: '金色', mythic: '神话' }
        msg += `  【${col.name}】 ${rarityText[col.rarity] || '普通'} ${col.slots}格 ${col.price}金币\n`
      }
    }
    
    msg += `\n宝可梦:\n`
    if (warehouse.pokemon.length === 0) {
      msg += `  无\n`
    } else {
      for (const p of warehouse.pokemon) {
        msg += `  ${p.name} Lv.${p.level}\n`
      }
    }
    
    msg += `\n勋章:\n`
    if (warehouse.medals.length === 0) {
      msg += `  无\n`
    } else {
      msg += `  ${warehouse.medals.join('、')}\n`
    }
    namedSend(msg)
    return true
  }

  return false
}

module.exports = { handleBaseCommands }
