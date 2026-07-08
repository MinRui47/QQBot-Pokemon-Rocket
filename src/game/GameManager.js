const fs = require('fs')
const path = require('path')
const { Player, Pokemon, Backpack, Belt, ITEM_CONFIG, RARITY_COLORS } = require('./models')
const { INITIAL_POKEMON: getInitialPokemon } = require('./config')
const { GameMap, getAvailableMaps, getMapInfo, MEDALS } = require('./map')
const { BattleSystem } = require('./battle')
const { TradingSystem } = require('./trading')
const { TaskSystem, MedalSystem } = require('./task')
const { EvacuationSystem } = require('./evacuation')
const { getRankInfo } = require('./rankSystem')
const { BACKPACK_TYPES } = require('./backpackTypes')
const { getCollectionInfo, getRarityValue } = require('./collectionSystem')
const { database, playerDAL, gameStateDAL, listingDAL, mapStateDAL } = require('./database/dal')
const { syncLoadFromDatabase } = require('./data/pokemonData')

class GameInstance {
  constructor(player, mapTier) {
    this.player = player
    this.mapTier = mapTier
    this.map = new GameMap(mapTier, player.userId)
    this.backpack = new Backpack(player.getBackpackCapacity())
    this.belt = new Belt()
    this.taskSystem = new TaskSystem()
    this.battleSystem = new BattleSystem(player)
    this.evacuationSystem = new EvacuationSystem(player)
    this.maxSteps = this._generateSteps()
    this.stepsTaken = 0
    this.initialPokemon = null
    this.status = 'preparing'
    this.currentEncounter = null
    this.turnCount = 0
    this.defeatedTrainer = null  // 击败的训练家信息，可搜刮
    this.weakenedPokemon = null  // 体力低下的野生宝可梦，可捕捉
    this.collections = []       // 收集的藏品
    this.pendingItems = []      // 待拾取的道具（包括物品和藏品）
  }
  
  // 统一的道具获得方法
  addItemToBackpack(itemData) {
    const { type, name, quantity, slots, rarity, price, location, skipDbDrop = false } = itemData
    
    // 计算需要的格数
    let requiredSlots = 0
    if (type === 'item') {
      // 普通物品：检查是否已有该物品（可堆叠）
      const existingItem = this.backpack.items.find(i => i.name === name)
      if (existingItem) {
        const stackLimit = ITEM_CONFIG[name]?.stackLimit || 10
        const canStack = Math.min(quantity, stackLimit - existingItem.quantity)
        if (canStack > 0) {
          // 可以堆叠，不需要新格子
          existingItem.quantity += canStack
          return { success: true, message: `获得 ${name} x${canStack}`, stacked: true }
        }
        // 已达堆叠上限，需要新格子
        requiredSlots = 1
      } else {
        requiredSlots = 1
      }
    } else if (type === 'collection') {
      requiredSlots = slots
    }
    
    // 检查背包空间
    const currentUsed = this.backpack.getUsedSlots()
    const maxSlots = this.backpack.maxSlots
    
    if (currentUsed + requiredSlots > maxSlots) {
      // 背包空间不足，道具留在原地
      if (!skipDbDrop) {
        const defaultLocation = this.map.currentBuilding ? `${this.map.currentBuilding}_${this.map.currentFloor}` : `${this.map.currentLocation}_${this.map.currentFloor}`
        const dropLocation = location || defaultLocation
        const itemData = {
          type,
          slots: slots || 1,
          rarity: rarity || 'common',
          price: price || 0,
          timestamp: Date.now()
        }
        
        if (this.map.instanceId) {
          mapStateDAL.dropItem(this.map.instanceId, dropLocation, name, quantity || 1, itemData)
        } else {
          this.pendingItems.push({
            type,
            name,
            quantity: quantity || 1,
            slots: slots || 1,
            rarity: rarity || 'common',
            price: price || 0,
            location: dropLocation,
            timestamp: Date.now()
          })
        }
      }
      
      const itemText = type === 'collection' ? `藏品【${name}】` : `${name} x${quantity}`
      return {
        success: false,
        message: `背包空间不足！${itemText}留在原地，整理背包后可再次拾取`,
        pending: true,
        requiredSlots,
        availableSlots: maxSlots - currentUsed
      }
    }
    
    // 有足够空间，添加到背包
    if (type === 'item') {
      const stackLimit = ITEM_CONFIG[name]?.stackLimit || 10
      this.backpack.items.push({
        name,
        quantity: Math.min(quantity, stackLimit),
        ...ITEM_CONFIG[name]
      })
      return { success: true, message: `获得 ${name} x${Math.min(quantity, stackLimit)}` }
    } else if (type === 'collection') {
      this.backpack.collections.push({ name, slots, rarity, price })
      return { success: true, message: `获得藏品【${name}】` }
    }
    
    return { success: false, message: '道具类型错误' }
  }
  
  // 统一的道具丢弃方法
  dropItemFromBackpack(itemName, quantity = 1, isCollection = false) {
    const dropLocation = this.map.currentBuilding ? `${this.map.currentBuilding}_${this.map.currentFloor}` : `${this.map.currentLocation}_${this.map.currentFloor}`
    
    if (isCollection) {
      // 丢弃藏品
      const index = this.backpack.collections.findIndex(c => c.name === itemName)
      if (index === -1) {
        return { success: false, message: `背包中没有藏品【${itemName}】` }
      }
      
      const collection = this.backpack.collections[index]
      this.backpack.collections.splice(index, 1)
      
      const itemData = {
        type: 'collection',
        slots: collection.slots,
        rarity: collection.rarity,
        price: collection.price,
        timestamp: Date.now()
      }
      
      if (this.map.instanceId) {
        mapStateDAL.dropItem(this.map.instanceId, dropLocation, itemName, 1, itemData)
      } else {
        this.pendingItems.push({
          type: 'collection',
          name: collection.name,
          slots: collection.slots,
          rarity: collection.rarity,
          price: collection.price,
          location: dropLocation,
          timestamp: Date.now()
        })
      }
      
      return { success: true, message: `丢弃了藏品【${itemName}】，留在原地可再次拾取` }
    } else {
      // 丢弃普通物品
      const item = this.backpack.items.find(i => i.name === itemName)
      if (!item) {
        return { success: false, message: `背包中没有 ${itemName}` }
      }
      
      const dropQuantity = Math.min(quantity, item.quantity)
      item.quantity -= dropQuantity
      
      if (item.quantity <= 0) {
        this.backpack.items = this.backpack.items.filter(i => i.name !== itemName)
      }
      
      const itemData = {
        type: 'item',
        timestamp: Date.now()
      }
      
      if (this.map.instanceId) {
        mapStateDAL.dropItem(this.map.instanceId, dropLocation, itemName, dropQuantity, itemData)
      } else {
        this.pendingItems.push({
          type: 'item',
          name: itemName,
          quantity: dropQuantity,
          location: dropLocation,
          timestamp: Date.now()
        })
      }
      
      return { success: true, message: `丢弃了 ${itemName} x${dropQuantity}，留在原地可再次拾取` }
    }
  }
  
  // 拾取待拾取的道具
  pickupItem(itemName) {
    let pendingItem = this.pendingItems.find(i => i.name === itemName)
    
    if (!pendingItem && this.map.instanceId) {
      const currentLocation = this.map.currentBuilding ? `${this.map.currentBuilding}_${this.map.currentFloor}` : `${this.map.currentLocation}_${this.map.currentFloor}`
      const droppedItems = mapStateDAL.getDroppedItems(this.map.instanceId, currentLocation)
      pendingItem = droppedItems.find(i => i.itemName === itemName)
      if (pendingItem) {
        pendingItem = {
          type: pendingItem.itemData?.type || 'item',
          name: pendingItem.itemName,
          quantity: pendingItem.quantity,
          slots: pendingItem.itemData?.slots,
          rarity: pendingItem.itemData?.rarity,
          price: pendingItem.itemData?.price,
          location: pendingItem.locationName,
          dbId: pendingItem.id
        }
      }
    }
    
    if (!pendingItem) {
      return { success: false, message: `没有找到道具 ${itemName}` }
    }
    
    // 尝试添加到背包
    const result = this.addItemToBackpack({
      type: pendingItem.type,
      name: pendingItem.name,
      quantity: pendingItem.quantity,
      slots: pendingItem.slots,
      rarity: pendingItem.rarity,
      price: pendingItem.price,
      location: pendingItem.location,
      skipDbDrop: true
    })
    
    if (result.success) {
      // 成功拾取，从待拾取列表移除
      this.pendingItems = this.pendingItems.filter(i => i.name !== itemName)
      
      // 从数据库标记为已拾取
      if (this.map.instanceId && pendingItem.dbId) {
        mapStateDAL.pickItem(pendingItem.dbId)
      }
      
      return { success: true, message: `拾取了${pendingItem.type === 'collection' ? '藏品' : ''}【${itemName}】` }
    }
    
    return result
  }
  
  // 查看待拾取道具列表
  getPendingItems() {
    const items = [...this.pendingItems]
    
    if (this.map.instanceId) {
      const currentLocation = this.map.currentBuilding ? `${this.map.currentBuilding}_${this.map.currentFloor}` : `${this.map.currentLocation}_${this.map.currentFloor}`
      const droppedItems = mapStateDAL.getDroppedItems(this.map.instanceId, currentLocation)
      for (const dropped of droppedItems) {
        const itemData = dropped.itemData || {}
        const existing = items.find(i => i.name === dropped.itemName)
        if (!existing) {
          items.push({
            type: itemData.type || 'item',
            name: dropped.itemName,
            quantity: dropped.quantity,
            slots: itemData.slots,
            rarity: itemData.rarity,
            price: itemData.price
          })
        }
      }
    }
    
    return items.map(item => {
      if (item.type === 'collection') {
        const rarityText = { common: '普通', uncommon: '优秀', rare: '罕见', epic: '史诗', legendary: '金色', mythic: '神话' }
        return `【${item.name}】 ${rarityText[item.rarity]} ${item.slots}格 ${item.price}金币`
      } else {
        return `${item.name} x${item.quantity}`
      }
    })
  }

  get stepsRemaining() {
    return this.maxSteps - this.stepsTaken
  }

  _generateSteps() {
    const config = getMapInfo(this.mapTier)
    return Math.floor(Math.random() * (config.steps.max - config.steps.min + 1)) + config.steps.min
  }
  
  selectInitialPokemon(pokemonName) {
    const initialPokemon = require('./config').INITIAL_POKEMON || ['阿柏蛇', '瓦斯弹', '超音蝠']
    if (!initialPokemon.includes(pokemonName)) {
      return { success: false, message: '请选择：阿柏蛇/瓦斯弹/超音蝠' }
    }
    
    const pokemon = new Pokemon(pokemonName, 5, { isInitial: true })
    const result = this.belt.addPokemon(pokemon)
    
    if (result.success) {
      this.initialPokemon = pokemon
      this.status = 'playing'
      this.stepsTaken = 0
      this.taskSystem.generateTasks(Math.floor(Math.random() * 2) + 1)
      return { success: true, message: `选择成功！${pokemon.name} Lv.${pokemon.level} 加入队伍！` }
    }
    
    return { success: false, message: '精灵带已满' }
  }
  
  move(direction) {
    if (this.status !== 'playing') {
      return { success: false, message: '请先选择初始精灵' }
    }
    
    if (this.stepsTaken >= this.maxSteps) {
      return { success: false, message: '步数已耗尽！' }
    }
    
    if (!direction) {
      return { success: false, message: '请指定移动方向！可用方向: ' + this.getAvailableDirections().map(d => d.direction).join('、') }
    }
    
    this.stepsTaken++
    this.turnCount++
    
    const moveResult = this.map.move(direction)
    
    if (!moveResult.moved) {
      return { success: false, message: moveResult.message }
    }
    
    if (moveResult.foundPoint) {
      const rewards = moveResult.foundPoint.getReward()
      const rewardMsgs = []
      for (const reward of rewards) {
        if (reward.type === 'item') {
          const addResult = this.backpack.addItem({ name: reward.name }, reward.quantity)
          if (!addResult.success) {
            this.evacuationSystem.checkTrigger(this)
          } else {
            rewardMsgs.push(addResult.message)
          }
        } else if (reward.type === 'medal') {
          this.player.addMedal(reward.name)
          rewardMsgs.push(`获得勋章「${reward.name}」`)
        }
      }
      if (rewardMsgs.length > 0) {
        moveResult.message += '\n' + rewardMsgs.join('\n')
      }
      this.taskSystem.updateTasks('EXPLORE', 1)
    }
    
    const encounter = this.map.checkEncounter()
    if (encounter) {
      this.currentEncounter = encounter
      moveResult.encounter = encounter
    }
    
    const evacuationTriggered = this.evacuationSystem.checkTrigger(this)
    if (evacuationTriggered) {
      moveResult.evacuation = true
    }
    
    return {
      success: true,
      ...moveResult,
      stepsTaken: this.stepsTaken,
      maxSteps: this.maxSteps,
      turnCount: this.turnCount,
      availableDirections: this.getAvailableDirections()
    }
  }
  
  getAvailableDirections() {
    return this.map.getAvailableDirections()
  }
  
  search() {
    if (this.status !== 'playing') {
      return { success: false, message: '请先选择初始精灵' }
    }
    
    const rewards = this.map.search()
    const messages = []
    
    for (const reward of rewards) {
      if (reward.type === 'item') {
        const addResult = this.addItemToBackpack({
          type: 'item',
          name: reward.name,
          quantity: reward.quantity
        })
        messages.push(addResult.message)
        if (!addResult.success) {
          this.evacuationSystem.checkTrigger(this)
        }
        this.taskSystem.updateTasks('SCOUT', reward.quantity)
      } else if (reward.type === 'money') {
        this.player.addMoney(reward.amount)
        messages.push(`获得 ${reward.amount} 金币`)
      } else if (reward.type === 'collection') {
        const addResult = this.addItemToBackpack({
          type: 'collection',
          name: reward.name,
          slots: reward.slots,
          rarity: reward.rarity,
          price: reward.price
        })
        messages.push(addResult.message)
        if (!addResult.success) {
          this.evacuationSystem.checkTrigger(this)
        }
      }
    }
    
    if (messages.length === 0) {
      messages.push('什么也没找到...')
    }
    
    return {
      success: true,
      message: messages.join('\n'),
      rewards: rewards
    }
  }
  
  searchFeature(featureName) {
    if (this.status !== 'playing') {
      return { success: false, message: '请先选择初始精灵' }
    }
    
    const result = this.map.searchFeature(featureName)
    
    if (!result.success) {
      return result
    }
    
    const messages = [result.message]
    
    for (const reward of result.rewards) {
      if (reward.type === 'item') {
        const addResult = this.addItemToBackpack({
          type: 'item',
          name: reward.name,
          quantity: reward.quantity
        })
        messages.push(addResult.message)
        if (!addResult.success) {
          this.evacuationSystem.checkTrigger(this)
        }
      } else if (reward.type === 'collection') {
        const addResult = this.addItemToBackpack({
          type: 'collection',
          name: reward.name,
          slots: reward.slots,
          rarity: reward.rarity,
          price: reward.price
        })
        messages.push(addResult.message)
        if (!addResult.success) {
          this.evacuationSystem.checkTrigger(this)
        }
      }
    }
    
    if (result.encounter) {
      this.currentEncounter = result.encounter
    }
    
    return {
      success: true,
      message: messages.join('\n'),
      rewards: result.rewards,
      encounter: result.encounter
    }
  }
  
  addCollection(name, slots, rarity, price) {
    if (!this.collections) {
      this.collections = []
    }
    
    this.collections.push({ name, slots, rarity, price })
    
    return { success: true }
  }
  
  enterFeature(featureName) {
    if (this.status !== 'playing') {
      return { success: false, message: '请先选择初始精灵' }
    }
    
    const result = this.map.enterFeature(featureName)
    
    if (!result.success) {
      return result
    }
    
    if (result.encounter) {
      this.currentEncounter = result.encounter
      
      // 如果是道馆挑战，显示训练家信息
      if (result.encounter.type === 'trainer' && result.encounter.trainer) {
        const trainer = result.encounter.trainer
        const trainerInfo = `\n\n【道馆挑战】\n馆主：${trainer.title || trainer.name}\n对手精灵：${trainer.pokemon.map(p => `${p.name} Lv.${p.level}`).join('、')}\n\n输入"战斗"开始对战！`
        result.message += trainerInfo
      }
    }
    
    return {
      success: true,
      message: result.message,
      building: result.building,
      floor: result.floor,
      encounter: result.encounter
    }
  }
  
  leaveBuilding() {
    if (this.status !== 'playing') {
      return { success: false, message: '请先选择初始精灵' }
    }
    
    return this.map.leaveBuilding()
  }
  
  getBuildingStatus() {
    if (this.status !== 'playing') {
      return { success: false, message: '请先选择初始精灵' }
    }
    
    if (!this.map.currentBuilding) {
      return { success: false, message: '你不在建筑内' }
    }
    
    const config = this.map.getCurrentBuildingConfig()
    if (!config) {
      return { success: false, message: '建筑配置不存在' }
    }
    
    const buildingName = this.map.currentBuilding
    const floor = this.map.currentFloor
    const floorItems = this.map._getFloorItems(buildingName, floor)
    
    let message = `【${buildingName} - ${floor}楼】\n`
    
    if (floorItems && floorItems.length > 0) {
      message += '\n【可搜索物品】\n'
      for (const item of floorItems) {
        const searchedKey = `${buildingName}_${floor}_${item.description}`
        const isSearched = this.exploredFeatures.has(searchedKey)
        if (isSearched) {
          message += `  - ${item.description} 【已搜索】\n`
        } else {
          message += `  - ${item.description}\n`
        }
      }
    } else {
      message += '\n这里没有什么可以搜索的东西\n'
    }
    
    // 指令提示
    const commands = []
    if (config.hasSecondFloor || (config.hasMultipleFloors && floor < config.maxFloors)) {
      commands.push('"上楼"前往上层')
    }
    if (floor > 1) {
      commands.push('"下楼"返回下层')
    }
    if (floorItems && floorItems.length > 0) {
      const unsearched = floorItems.find(item => !this.exploredFeatures.has(`${buildingName}_${floor}_${item.description}`))
      if (unsearched) {
        commands.push(`"搜索 ${unsearched.description}"搜索物品`)
      }
    }
    commands.push('"离开"退出建筑')

    message += `\n可用指令：${commands.join('、')}`
    
    return { success: true, message }
  }
  
  goToFloor(floor) {
    if (this.status !== 'playing') {
      return { success: false, message: '请先选择初始精灵' }
    }
    
    const result = this.map.goToFloor(floor)
    
    if (!result.success) {
      return result
    }
    
    if (result.encounter) {
      this.currentEncounter = result.encounter
    }
    
    return {
      success: true,
      message: result.message,
      floor: result.floor,
      encounter: result.encounter
    }
  }
  
  async battle() {
    if (!this.currentEncounter) {
      return { success: false, message: '没有遭遇敌人' }
    }
    
    if (this.status !== 'playing') {
      return { success: false, message: '请先选择初始精灵' }
    }
    
    const encounter = this.currentEncounter
    
    let result
    
    if (encounter.type === 'wild') {
      result = await this.battleSystem.startWildBattle(encounter.pokemon)
      if (result.won) {
        this.taskSystem.updateTasks('CLEAR', 1)
        
        // 保存野生宝可梦信息供捕捉（不立即发放奖励）
        this.weakenedPokemon = {
          name: encounter.pokemon.name,
          level: encounter.pokemon.level,
          hp: Math.max(1, Math.floor(encounter.pokemon.maxHp * 0.1)), // 保留10%HP
          maxHp: encounter.pokemon.maxHp,
          rarity: encounter.pokemon.rarity,
          rewards: result.rewards,
          canCapture: true
        }
        
        // 清除遭遇，因为野生宝可梦被击败后无法再次战斗
        this.currentEncounter = null
        
        // 标记战斗胜利但不发放奖励，等待捕捉
        return {
          success: true,
          won: true,
          message: result.message + '\n\n【提示】野生宝可梦体力低下！可以使用"精灵球"尝试捕捉！',
          weakened: true,
          pokemon: this.weakenedPokemon
        }
      }
    } else {
      result = await this.battleSystem.startTrainerBattle(encounter.trainer)
      if (result.won) {
        this.taskSystem.updateTasks('RAID', 1)
        
        // 清除当前遭遇，训练家被击败
        this.currentEncounter = null
        
        // 保存击败的训练家信息到场景物品中（可抢夺）
        if (!this.defeatedTrainers) {
          this.defeatedTrainers = []
        }
        this.defeatedTrainers.push({
          name: encounter.trainer.name,
          belt: encounter.trainer.pokemon.map(p => ({
            name: p.name,
            level: p.level,
            hp: p.hp || p.maxHp,
            maxHp: p.maxHp
          })),
          backpack: encounter.trainer.items || [],
          backpackType: encounter.trainer.backpackType || '简易斜挎包',
          hasBeenLooted: false
        })
        
        return {
          success: true,
          won: true,
          message: result.message + '\n\n【提示】训练家被击败！可以"搜刮"或"抢夺"其物资！',
          lootable: true
        }
      }
    }
    
    // 野生宝可梦逃跑时发放奖励
    if (encounter.type === 'wild' && result.won && result.escaped) {
      for (const reward of result.rewards) {
        if (reward.type === 'item') {
          this.addItemToBackpack({
            type: 'item',
            name: reward.name,
            quantity: reward.quantity
          })
        } else if (reward.type === 'pokemon') {
          const pokemon = new Pokemon(reward.name, reward.level)
          this.belt.addPokemon(pokemon)
        } else if (reward.type === 'medal') {
          this.player.addMedal(reward.name)
        } else if (reward.type === 'money') {
          this.player.addMoney(reward.amount)
        }
      }
    }
    
    if (!result.won && !result.captured) {
      // 如果是没有可用精灵的情况，不触发撤离失败
      if (result.message && result.message.includes('没有可用的精灵')) {
        return result
      }
      if (!this.belt.hasAlivePokemon()) {
        return this.evacuationSystem.handleDefeat(this)
      }
    }
    
    return result
  }
  
  // 捕捉野生宝可梦
  capturePokemon(ballType = '普通精灵球') {
    if (!this.weakenedPokemon || !this.weakenedPokemon.canCapture) {
      return { success: false, message: '没有可捕捉的宝可梦' }
    }
    
    const ballItem = this.backpack.findItem(ballType)
    if (!ballItem || ballItem.quantity < 1) {
      return { success: false, message: `没有${ballType}！` }
    }
    
    this.backpack.removeItem(ballType, 1)
    
    // 计算捕捉成功率
    const pokemon = this.weakenedPokemon
    const maxHp = pokemon.maxHp
    const currentHp = pokemon.hp
    const hpRatio = currentHp / maxHp
    
    // 基础捕捉率：HP越低，捕捉率越高
    let captureChance = 0.3 * (1 - hpRatio) + 0.1
    
    // 精灵球加成
    if (ballType === '超级球') captureChance += 0.15
    if (ballType === '高级球') captureChance += 0.25
    if (ballType === '大师球') captureChance = 1.0
    
    captureChance = Math.min(captureChance, 0.95)
    
    const captured = Math.random() < captureChance
    
    if (captured) {
      // 成功捕捉
      const newPokemon = new Pokemon(pokemon.name, pokemon.level)
      newPokemon.hp = pokemon.hp
      newPokemon.maxHp = pokemon.maxHp
      this.belt.addPokemon(newPokemon)
      
      // 发放战斗奖励
      for (const reward of pokemon.rewards) {
        if (reward.type === 'item') {
          this.addItemToBackpack({
            type: 'item',
            name: reward.name,
            quantity: reward.quantity
          })
        } else if (reward.type === 'money') {
          this.player.addMoney(reward.amount)
        }
      }
      
      this.weakenedPokemon = null
      
      return {
        success: true,
        captured: true,
        message: `\n🎉 捕捉成功！\n【${pokemon.name}】成为了你的伙伴！`
      }
    } else {
      // 捕捉失败
      const runAway = Math.random() < 0.5
      
      if (runAway) {
        // 宝可梦逃跑了
        for (const reward of pokemon.rewards) {
          if (reward.type === 'item') {
            this.addItemToBackpack({
              type: 'item',
              name: reward.name,
              quantity: reward.quantity
            })
          } else if (reward.type === 'money') {
            this.player.addMoney(reward.amount)
          }
        }
        
        this.weakenedPokemon = null
        
        return {
          success: true,
          captured: false,
          ranAway: true,
          message: `\n${ballType}捕捉失败！\n${pokemon.name}逃跑了！\n但你还是获得了战斗奖励。`
        }
      } else {
        return {
          success: true,
          captured: false,
          ranAway: false,
          message: `\n${ballType}捕捉失败！\n${pokemon.name}挣脱了！但还想要逃跑...`
        }
      }
    }
  }
  
  useItem(itemName, targetIndex) {
    const item = this.backpack.findItem(itemName)
    if (!item || item.quantity < 1) {
      return { success: false, message: `\u6CA1\u6709 ${itemName}！` }
    }
    
    if (item.type === 'heal') {
      if (targetIndex < 0 || targetIndex >= this.belt.pokemon.length) {
        return { success: false, message: '位置无效' }
      }
      
      const pokemon = this.belt.pokemon[targetIndex]
      pokemon.heal(item.healAmount)
      this.backpack.removeItem(itemName, 1)
      
      return { success: true, message: `使用 ${itemName}，${pokemon.name} HP 恢复至 ${pokemon.hp}/${pokemon.maxHp}` }
    }
    
    return { success: false, message: '该物品无法使用' }
  }

  getDefeatedTrainer() {
    return this.defeatedTrainer
  }

  searchTrainer() {
    if (!this.defeatedTrainers || this.defeatedTrainers.length === 0) {
      return { success: false, message: '没有可搜刮的训练家' }
    }
    
    const trainer = this.defeatedTrainers.find(t => !t.hasBeenSearched)
    if (!trainer) {
      return { success: false, message: '所有训练家已被搜刮过' }
    }

    trainer.hasBeenSearched = true

    // 获取背包稀有度和格数
    const backpackInfo = BACKPACK_TYPES[trainer.backpackType] || {}
    const backpackQuality = backpackInfo.quality || '普通'
    const backpackCapacity = backpackInfo.slots ? backpackInfo.slots[0] : 6 // 默认取第一档位

    // 计算背包中物品占用的总格数
    let totalUsedSlots = 0
    const itemDetails = []
    for (const item of trainer.backpack) {
      const collectionInfo = getCollectionInfo(item.name)
      if (collectionInfo) {
        // 藏品：每个占用 grid 格
        const slots = collectionInfo.grid || 1
        totalUsedSlots += slots * item.quantity
        itemDetails.push({
          name: item.name,
          quantity: item.quantity,
          rarity: collectionInfo.rarity,
          slots: slots,
          isStackable: false
        })
      } else {
        // 普通物品：可堆叠（10个占1格），每种物品占1格
        const stackCount = Math.ceil(item.quantity / 10)
        totalUsedSlots += stackCount
        itemDetails.push({
          name: item.name,
          quantity: item.quantity,
          rarity: '',
          slots: stackCount,
          isStackable: true
        })
      }
    }

    let msg = `【抢夺】战败训练家 ${trainer.name}：\n\n`

    msg += `【腰带精灵】\n`
    if (trainer.belt.length === 0) {
      msg += `  无\n`
    } else {
      for (let i = 0; i < trainer.belt.length; i++) {
        const p = trainer.belt[i]
        const hpPercent = Math.floor((p.hp / p.maxHp) * 100)
        msg += `  ${i + 1}. ${p.name} Lv.${p.level} HP:${p.hp}/${p.maxHp}${hpPercent <= 0 ? ' (已倒下)' : ''}\n`
      }
    }

    msg += `\n【背包物品】${totalUsedSlots}/${backpackCapacity}格\n`
    if (itemDetails.length === 0) {
      msg += `  无\n`
    } else {
      for (const item of itemDetails) {
        const rarityText = item.rarity ? ` [${item.rarity}]` : ''
        const slotsText = item.slots > 1 ? ` (${item.slots}格)` : ''
        msg += `  ${item.name}${rarityText} x${item.quantity}${slotsText}\n`
      }
    }

    msg += `\n【装备背包】${trainer.backpackType} [${backpackQuality}] ${backpackCapacity}格\n`
    msg += `\n输入"抢夺精灵 [序号]"获取精灵，"抢夺物品 [物品名] [数量]"获取物品，"抢夺背包"更换背包`

    return {
      success: true,
      message: msg,
      trainer: trainer
    }
  }

  lootTrainerPokemon(index) {
    if (!this.defeatedTrainers || this.defeatedTrainers.length === 0) {
      return { success: false, message: '没有可搜刮的训练家' }
    }
    
    // 找到第一个未完全搜刮的训练家
    const trainer = this.defeatedTrainers.find(t => !t.hasBeenLooted && t.belt.length > 0)
    if (!trainer) {
      return { success: false, message: '没有可搜刮宝可梦的训练家' }
    }
    
    if (index < 0 || index >= trainer.belt.length) {
      return { success: false, message: `序号无效，可搜刮宝可梦数量: ${trainer.belt.length}` }
    }

    const pokemonData = trainer.belt[index]
    const pokemon = new Pokemon(pokemonData.name, pokemonData.level)
    pokemon.hp = pokemonData.hp

    const result = this.belt.addPokemon(pokemon)
    if (!result.success) {
      return result
    }

    trainer.belt.splice(index, 1)
    return { success: true, message: `成功抢夺 ${trainer.name} 的 ${pokemon.name} Lv.${pokemon.level}！` }
  }

  lootTrainerItem(itemName, quantity = 1) {
    if (!this.defeatedTrainers || this.defeatedTrainers.length === 0) {
      return { success: false, message: '没有可搜刮的训练家' }
    }
    
    // 找到第一个有该物品的训练家
    const trainer = this.defeatedTrainers.find(t => !t.hasBeenLooted && t.backpack.some(i => i.name === itemName))
    if (!trainer) {
      return { success: false, message: `训练家没有 ${itemName}` }
    }

    const itemIdx = trainer.backpack.findIndex(i => i.name === itemName)
    const item = trainer.backpack[itemIdx]
    if (item.quantity < quantity) {
      return { success: false, message: '数量不足' }
    }

    // 检查是否是藏品
    const collectionInfo = getCollectionInfo(itemName)
    
    const addResult = this.addItemToBackpack({
      type: collectionInfo ? 'collection' : 'item',
      name: itemName,
      quantity: quantity,
      slots: collectionInfo?.grid || 1,
      rarity: collectionInfo?.rarity || 'common',
      price: collectionInfo?.price || 0
    })
    
    if (!addResult.success) {
      return addResult
    }

    item.quantity -= quantity
    if (item.quantity <= 0) {
      trainer.backpack.splice(itemIdx, 1)
    }

    return { success: true, message: `成功抢夺 ${trainer.name} 的 ${itemName} x${quantity}！` }
  }

  lootTrainerBackpack() {
    if (!this.defeatedTrainers || this.defeatedTrainers.length === 0) {
      return { success: false, message: '没有可搜刮的训练家' }
    }
    
    const trainer = this.defeatedTrainers.find(t => !t.hasBeenLooted)
    if (!trainer) {
      return { success: false, message: '该训练家已被搜刮完毕' }
    }

    const newBackpackType = trainer.backpackType
    const oldBackpackType = this.player.backpackType
    const newCapacity = this.player.getBackpackCapacityByType(newBackpackType)
    const oldCapacity = this.backpack.maxSlots
    
    // 保存原有物品和藏品
    const oldItems = [...this.backpack.items]
    const oldCollections = [...this.backpack.collections]
    
    // 更换背包类型
    this.player.ownedBackpacks.push(newBackpackType)
    this.player.backpackType = newBackpackType
    
    // 创建新背包
    this.backpack = new Backpack(newCapacity)
    
    let overflowItems = []
    let overflowCollections = []
    
    // 尝试放入原有物品
    for (const item of oldItems) {
      const addResult = this.addItemToBackpack({
        type: 'item',
        name: item.name,
        quantity: item.quantity
      })
      if (!addResult.success) {
        overflowItems.push({ name: item.name, quantity: item.quantity })
      }
    }
    
    // 尝试放入原有藏品
    for (const col of oldCollections) {
      const addResult = this.addItemToBackpack({
        type: 'collection',
        name: col.name,
        slots: col.slots,
        rarity: col.rarity,
        price: col.price
      })
      if (!addResult.success) {
        overflowCollections.push(col)
      }
    }
    
    // 溢出物品放到训练家的背包中
    for (const item of overflowItems) {
      trainer.backpack.push(item)
    }
    
    // 溢出藏品放到训练家的背包中
    for (const col of overflowCollections) {
      trainer.backpack.push({ name: col.name, quantity: 1 })
    }
    
    // 标记训练家已搜刮完毕
    trainer.hasBeenLooted = true
    
    let message = `成功抢夺 ${trainer.name} 的背包！已装备【${newBackpackType}】（原：${oldBackpackType}）\n容量：${newCapacity}格（原：${oldCapacity}格）`
    
    if (overflowItems.length > 0 || overflowCollections.length > 0) {
      message += `\n⚠️ 以下物品因背包容量不足而掉落：`
      for (const item of overflowItems) {
        message += `\n  ${item.name} x${item.quantity}`
      }
      for (const col of overflowCollections) {
        message += `\n  【${col.name}】 ${col.slots}格`
      }
      message += `\n这些物品已放入训练家的背包物品中，可再次抢夺`
    }
    
    return { success: true, message }
  }
  
  evacuate() {
    if (this.status !== 'playing') {
      return { success: false, message: '请先选择初始精灵' }
    }
    
    const result = this.evacuationSystem.attemptEvacuation(this)
    
    if (result.escaped || !result.success) {
      return result
    }
    
    return {
      success: true,
      message: result.message,
      evacuationState: this.evacuationSystem.state
    }
  }
  
  forceEvacuate(player) {
    if (!player.currentGame) {
      return { success: false, message: '没有进行中的外勤任务' }
    }
    
    const game = player.currentGame
    game.status = 'ended'
    
    // 将腰带精灵存回仓库（如果还有的话）
    if (game.belt.pokemon.length > 0) {
      for (const pokemon of game.belt.pokemon) {
        const exists = player.warehouse.pokemon.some(p => 
          p.name === pokemon.name && p.level === pokemon.level
        )
        if (!exists) {
          player.warehouse.addPokemon(pokemon)
        }
      }
    }
    
    player.currentGame = null
    player.location = '火箭队基地'
    this.saveData()
    
    return {
      success: true,
      message: '【强制遣返】检测到你没有可用精灵，已强制遣返至火箭队基地！\n请先租借或获取精灵后再外勤。'
    }
  }
  
  getStatus() {
    return {
      status: this.status,
      mapTier: this.mapTier,
      currentLocation: this.map.currentLocation,
      stepsTaken: this.stepsTaken,
      maxSteps: this.maxSteps,
      stepsRemaining: this.stepsRemaining,
      turnCount: this.turnCount,
      backpackSlots: `${this.backpack.getUsedSlots()}/${this.backpack.maxSlots}`,
      beltSlots: `${this.belt.getUsedSlots()}/${this.belt.maxSlots}`,
      currentEncounter: this.currentEncounter ? this.currentEncounter.type : null,
      evacuationActive: this.evacuationSystem.state.active,
      evacuationTime: this.evacuationSystem.state.timeRemaining,
      tasks: this.taskSystem.getTasksInfo()
    }
  }
  
  endGame() {
    this.status = 'ended'
    
    if (this.belt.pokemon.length > 0) {
      for (const pokemon of this.belt.pokemon) {
        const exists = this.player.warehouse.pokemon.some(p => 
          p.name === pokemon.name && p.level === pokemon.level
        )
        if (!exists) {
          this.player.warehouse.addPokemon(pokemon)
        }
      }
    }
    
    this.player.currentGame = null
    this.player.location = '火箭队基地'
  }
  
  toJSON() {
    return {
      mapTier: this.mapTier,
      map: this.map.toJSON(),
      backpack: this.backpack.toJSON(),
      belt: this.belt.toJSON(),
      taskSystem: this.taskSystem.toJSON(),
      evacuationSystem: this.evacuationSystem.toJSON(),
      maxSteps: this.maxSteps,
      stepsTaken: this.stepsTaken,
      initialPokemon: this.initialPokemon?.toJSON(),
      status: this.status,
      currentEncounter: this.currentEncounter,
      turnCount: this.turnCount,
      defeatedTrainers: this.defeatedTrainers || [],
      weakenedPokemon: this.weakenedPokemon,
      collections: this.collections || []
    }
  }
  
  static fromJSON(data, player) {
    const game = new GameInstance(player, data.mapTier)
    game.map = GameMap.fromJSON(data.map)
    game.backpack = Backpack.fromJSON(data.backpack)
    game.belt = Belt.fromJSON(data.belt, Pokemon)
    game.taskSystem = TaskSystem.fromJSON(data.taskSystem)
    game.evacuationSystem = EvacuationSystem.fromJSON(data.evacuationSystem, player)
    game.maxSteps = data.maxSteps || data.stepsRemaining || game.maxSteps
    game.stepsTaken = data.stepsTaken || (data.stepsRemaining ? game.maxSteps - data.stepsRemaining : 0)
    game.initialPokemon = data.initialPokemon ? Pokemon.fromJSON(data.initialPokemon) : null
    game.status = data.status
    game.currentEncounter = data.currentEncounter
    game.turnCount = data.turnCount
    game.defeatedTrainers = data.defeatedTrainers || []
    game.weakenedPokemon = data.weakenedPokemon || null
    game.collections = data.collections || []
    return game
  }
}

class GameManager {
  constructor() {
    this.players = {}
    this.tradingSystem = new TradingSystem()
    // 异步初始化数据库
    this.initDatabase()
  }
  
  async initDatabase() {
    try {
      await database.init()
      console.log('[GameManager] 数据库初始化完成')
      
      // 同步加载宝可梦数据到内存
      syncLoadFromDatabase()
      
      // 加载玩家数据
      this.loadData()
      
      // 加载交易系统数据
      const listings = listingDAL.getAllListings()
      this.tradingSystem = new TradingSystem()
      for (const listing of listings) {
        this.tradingSystem.listings.push(listing)
      }
      
      console.log(`[GameManager] 加载了 ${Object.keys(this.players).length} 个玩家`)
      
      // 设置数据库就绪标志（通过全局变量通知index.js）
      if (typeof global !== 'undefined') {
        global.dbReady = true
      }
      
    } catch (e) {
      console.error('[GameManager] 数据库初始化失败:', e.message)
    }
  }
  
  loadData() {
    try {
      const players = playerDAL.getAllPlayers()
      for (const playerData of players) {
        this.players[playerData.userId] = Player.fromJSON(playerData)
        
        // 恢复进行中的游戏
        const gameState = gameStateDAL.getGameState(playerData.userId)
        if (gameState && gameState.currentGame) {
          if (gameState.currentGame.status === 'ended') {
            // 游戏已结束，清理状态并重置位置
            this.players[playerData.userId].currentGame = null
            this.players[playerData.userId].location = '火箭队基地'
            console.log(`[DEBUG] 玩家 ${playerData.userId} 游戏已结束，已重置位置`)
          } else {
            // 检查玩家是否有精灵（仓库或腰带）
            const warehouseCount = playerData.warehouse?.pokemon?.length || 0
            const beltCount = gameState.currentGame.belt?.pokemon?.length || 0
            
            if (warehouseCount === 0 && beltCount === 0) {
              // 没有精灵，强制遣返
              console.log(`[DEBUG] 玩家 ${playerData.userId} 没有精灵，强制遣返`)
            } else {
              this.players[playerData.userId].currentGame = GameInstance.fromJSON(gameState.currentGame, this.players[playerData.userId])
            }
          }
        }
      }
    } catch (e) {
      console.error('[GameManager] 加载数据失败:', e.message)
    }
  }
  
  saveData() {
    try {
      for (const [userId, player] of Object.entries(this.players)) {
        // 保存玩家基础数据
        playerDAL.updatePlayer(player)
        
        // 保存游戏状态
        if (player.currentGame) {
          gameStateDAL.saveGameState(userId, null, player.currentGame.toJSON())
        } else {
          // 没有进行中的游戏，删除游戏状态记录
          gameStateDAL.deleteGameState(userId)
        }
      }
      
      // 保存交易系统数据
      const allListings = [...this.tradingSystem.playerListings, ...this.tradingSystem.auctionListings]
      for (const listing of allListings) {
        const existing = listingDAL.getListing(listing.id)
        if (!existing) {
          listingDAL.addListing(listing.sellerId, listing.itemType, listing.itemName, listing.itemData, listing.quantity, listing.price)
        }
      }
      
      return true
    } catch (e) {
      console.error('[GameManager] 保存数据失败:', e?.message || e)
      return false
    }
  }
  
  getOrCreatePlayer(userId, username) {
    if (!this.players[userId]) {
      // 检查数据库中是否存在
      const existing = playerDAL.getPlayer(userId)
      if (existing) {
        this.players[userId] = Player.fromJSON(existing)
      } else {
        // 创建新玩家并保存到数据库
        this.players[userId] = new Player(userId, username)
        playerDAL.updatePlayer(this.players[userId])
      }
    } else {
      // 刷新用户名（群成员昵称可能变更或首次未获取到）
      this.players[userId].setUsername(username)
    }
    return this.players[userId]
  }
  
  startGame(player, mapTier) {
    if (player.currentGame) {
      return { success: false, message: '已有进行中的外勤任务' }
    }
    
    const availableMaps = getAvailableMaps(player)
    if (!availableMaps.includes(mapTier)) {
      return { success: false, message: `\u672A\u89E3\u9501\u8BE5\u5730\u56FE！\n\u53EF\u7528\u5730\u56FE：${availableMaps.join('、')}` }
    }
    
    const game = new GameInstance(player, mapTier)
    player.currentGame = game
    
    return {
      success: true,
      message: `外勤开始！\n地图：${mapTier}\n最大步数：${game.maxSteps}\n\n请选择初始精灵：\n1. 阿柏蛇（毒属性）\n2. 瓦斯弹（毒属性）\n3. 超音蝠（毒/飞行）`,
      game: game
    }
  }
  
  selectInitialPokemon(player, pokemonName) {
    if (!player.currentGame) {
      return { success: false, message: '请先开始外勤' }
    }
    
    return player.currentGame.selectInitialPokemon(pokemonName)
  }
  
  move(player, direction) {
    if (!player.currentGame) {
      return { success: false, message: '请先开始外勤' }
    }
    
    return player.currentGame.move(direction)
  }
  
  search(player) {
    if (!player.currentGame) {
      return { success: false, message: '请先开始外勤' }
    }
    
    return player.currentGame.search()
  }
  
  getLocationFeatures(player) {
    if (!player.currentGame) {
      console.log(`[DEBUG] getLocationFeatures: currentGame 为 null, userId=${player.userId}, registered=${player.registered}`)
      return { success: false, message: '请先开始外勤' }
    }
    
    const locationInfo = player.currentGame.map.getCurrentLocationInfo()
    const features = player.currentGame.map.getAvailableFeatures()
    
    return {
      success: true,
      location: player.currentGame.map.currentLocation,
      locationInfo: locationInfo,
      features: features
    }
  }
  
  searchFeature(player, featureName) {
    if (!player.currentGame) {
      return { success: false, message: '请先开始外勤' }
    }
    
    return player.currentGame.searchFeature(featureName)
  }
  
  enterFeature(player, featureName) {
    if (!player.currentGame) {
      return { success: false, message: '请先开始外勤' }
    }
    
    return player.currentGame.enterFeature(featureName)
  }
  
  leaveBuilding(player) {
    if (!player.currentGame) {
      return { success: false, message: '请先开始外勤' }
    }
    
    return player.currentGame.leaveBuilding()
  }
  
  getBuildingStatus(player) {
    if (!player.currentGame) {
      return { success: false, message: '请先开始外勤' }
    }
    
    return player.currentGame.getBuildingStatus()
  }
  
  goToFloor(player, floor) {
    if (!player.currentGame) {
      return { success: false, message: '请先开始外勤' }
    }
    
    return player.currentGame.goToFloor(floor)
  }
  
  async battle(player) {
    if (!player.currentGame) {
      return { success: false, message: '请先开始外勤' }
    }
    
    const result = await player.currentGame.battle()
    
    if (result.success || result.escaped || result.captured) {
      this.saveData()
    }
    
    return result
  }

  capturePokemon(player, ballType = '普通精灵球') {
    if (!player.currentGame) {
      return { success: false, message: '请先开始外勤' }
    }
    
    const result = player.currentGame.capturePokemon(ballType)
    
    if (result.success) {
      this.saveData()
    }
    
    return result
  }

  runAway(player) {
    if (!player.currentGame) {
      return { success: false, message: '请先开始外勤' }
    }
    
    if (!player.currentGame.weakenedPokemon) {
      return { success: false, message: '没有可逃跑的对象' }
    }
    
    // 发放奖励
    const pokemon = player.currentGame.weakenedPokemon
    for (const reward of pokemon.rewards) {
      if (reward.type === 'item') {
        player.currentGame.addItemToBackpack({
          type: 'item',
          name: reward.name,
          quantity: reward.quantity
        })
      } else if (reward.type === 'money') {
        player.currentGame.player.addMoney(reward.amount)
      }
    }
    
    player.currentGame.weakenedPokemon = null
    
    this.saveData()
    
    return {
      success: true,
      message: `野生宝可梦逃跑了...\n但你还是获得了战斗奖励！`
    }
  }

  searchTrainer(player) {
    if (!player.currentGame) {
      return { success: false, message: '请先开始外勤' }
    }
    return player.currentGame.searchTrainer()
  }

  lootTrainerPokemon(player, index) {
    if (!player.currentGame) {
      return { success: false, message: '请先开始外勤' }
    }
    return player.currentGame.lootTrainerPokemon(index)
  }

  lootTrainerItem(player, itemName, quantity) {
    if (!player.currentGame) {
      return { success: false, message: '请先开始外勤' }
    }
    return player.currentGame.lootTrainerItem(itemName, quantity)
  }

  lootTrainerBackpack(player) {
    if (!player.currentGame) {
      return { success: false, message: '请先开始外勤' }
    }
    return player.currentGame.lootTrainerBackpack()
  }
  
  catch(player, ballType) {
    if (!player.currentGame) {
      return { success: false, message: '请先开始外勤' }
    }
    
    const encounter = player.currentGame.currentEncounter
    if (!encounter || encounter.type !== 'wild') {
      return { success: false, message: '没有野生宝可梦可捕捉' }
    }
    
    const result = player.currentGame.catch(encounter.pokemon.name, ballType)
    
    if (result.success) {
      this.saveData()
    }
    
    return result
  }
  
  useItem(player, itemName, targetIndex) {
    if (!player.currentGame) {
      return { success: false, message: '请先开始外勤' }
    }
    
    const result = player.currentGame.useItem(itemName, targetIndex)
    
    if (result.success) {
      this.saveData()
    }
    
    return result
  }
  
  dropItem(player, itemName, quantity) {
    if (!player.currentGame) {
      return { success: false, message: '请先开始外勤' }
    }
    
    const result = player.currentGame.dropItemFromBackpack(itemName, quantity, false)
    
    if (result.success) {
      this.saveData()
    }
    
    return result
  }
  
  dropCollection(player, collectionName) {
    if (!player.currentGame) {
      return { success: false, message: '请先开始外勤' }
    }
    
    const result = player.currentGame.dropItemFromBackpack(collectionName, 1, true)
    
    if (result.success) {
      this.saveData()
    }
    
    return result
  }
  
  pickupItem(player, itemName) {
    if (!player.currentGame) {
      return { success: false, message: '请先开始外勤' }
    }
    
    const result = player.currentGame.pickupItem(itemName)
    
    if (result.success) {
      this.saveData()
    }
    
    return result
  }
  
  evacuate(player) {
    if (!player.currentGame) {
      return { success: false, message: '请先开始外勤' }
    }
    
    const result = player.currentGame.evacuate()
    
    if (result.escaped || (!result.success && !result.evacuationState)) {
      this.saveData()
    }
    
    return result
  }
  
  getPlayerStatus(player) {
    if (!player.currentGame) {
      return {
        status: 'idle',
        money: player.money,
        medals: player.medals.length,
        warehouseSlots: `${player.warehouse.getTotalUsedSlots()}/${player.warehouse.maxSlots}`,
        unlockedMaps: player.unlockedMaps,
        obedienceLevel: player.getObedienceLevel()
      }
    }
    
    return {
      ...player.currentGame.getStatus(),
      money: player.money,
      medals: player.medals.length,
      warehouseSlots: `${player.warehouse.getTotalUsedSlots()}/${player.warehouse.maxSlots}`
    }
  }
  
  getPlayerWarehouse(player) {
    return {
      items: player.warehouse.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        rarity: item.rarity,
        basePrice: item.basePrice || ITEM_CONFIG[item.name]?.price || 0
      })),
      collections: player.warehouse.collections,
      pokemon: player.warehouse.pokemon.map(p => ({
        name: p.name,
        level: p.level,
        rarity: p.rarity
      })),
      medals: player.warehouse.medals,
      usedSlots: player.warehouse.getTotalUsedSlots(),
      maxSlots: player.warehouse.maxSlots
    }
  }
  
  getPlayerBackpack(player) {
    if (!player.currentGame) {
      return { success: false, message: '请先开始外勤' }
    }
    
    return {
      success: true,
      items: player.currentGame.backpack.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        rarity: item.rarity
      })),
      collections: player.currentGame.backpack.collections,
      usedSlots: player.currentGame.backpack.getUsedSlots(),
      maxSlots: player.currentGame.backpack.maxSlots
    }
  }
  
  // 全部存入仓库（返回基地后使用）
  storeAll(player) {
    // 检查是否在火箭队基地
    if (!player.isAtBase()) {
      return { success: false, message: '只有返回火箭队基地后才能存入仓库' }
    }
    
    const backpack = player.currentGame.backpack
    const cleared = backpack.clear()
    
    // 存入玩家仓库
    let totalItems = 0
    let totalCollections = 0
    let totalPrice = 0
    
    for (const item of cleared.items) {
      player.warehouse.addItem(item, item.quantity)
      totalItems += item.quantity
    }
    
    for (const col of cleared.collections) {
      player.warehouse.addCollection(col.name, col.slots, col.rarity, col.price)
      totalCollections++
      totalPrice += col.price
    }
    
    this.saveData()
    
    let message = `【全部存入完成】\n`
    message += `物品：${totalItems}件已存入仓库\n`
    if (totalCollections > 0) {
      message += `藏品：${totalCollections}件已存入仓库\n`
      message += `藏品总价值：${totalPrice}金币\n`
    }
    
    return { success: true, message }
  }
  
  // 丢弃物品
  dropItem(player, itemName, quantity = 1) {
    if (!player.currentGame) {
      return { success: false, message: '请先开始外勤' }
    }
    
    const result = player.currentGame.backpack.removeItem(itemName, quantity)
    if (result.success) {
      this.saveData()
      return { success: true, message: `丢弃了 ${itemName} x${quantity}` }
    }
    return result
  }
  
  // 丢弃藏品
  dropCollection(player, collectionName) {
    if (!player.currentGame) {
      return { success: false, message: '请先开始外勤' }
    }
    
    const result = player.currentGame.backpack.removeCollection(collectionName)
    if (result.success) {
      this.saveData()
      return { success: true, message: `丢弃了藏品【${collectionName}】` }
    }
    return result
  }
  
  // 拾取藏品
  getPlayerBelt(player) {
    if (!player.currentGame) {
      return { success: false, message: '请先开始外勤' }
    }
    
    return {
      success: true,
      pokemon: player.currentGame.belt.pokemon.map((p, index) => ({
        index,
        name: p.name,
        level: p.level,
        hp: p.hp,
        maxHp: p.maxHp,
        rarity: p.rarity,
        isInitial: p.isInitial
      })),
      usedSlots: player.currentGame.belt.getUsedSlots(),
      maxSlots: player.currentGame.belt.maxSlots
    }
  }
  
  sellDirect(player, itemName, quantity) {
    const result = this.tradingSystem.sellDirect(player, itemName, quantity)
    
    if (result.success) {
      this.saveData()
    }
    
    return result
  }
  
  listItem(player, itemType, itemName, quantity, price) {
    const result = this.tradingSystem.listItem(player, itemType, itemName, quantity, price)
    
    if (result.success) {
      this.saveData()
    }
    
    return result
  }
  
  buyItem(buyer, listingId) {
    const result = this.tradingSystem.buyItem(buyer, listingId)
    
    if (result.success) {
      this.saveData()
    }
    
    return result
  }
  
  cancelListing(player, listingId) {
    const result = this.tradingSystem.cancelListing(player, listingId)
    
    if (result.success) {
      this.saveData()
    }
    
    return result
  }
  
  getListings(type) {
    if (type === 'auction') {
      return this.tradingSystem.getAuctionListings()
    }
    return this.tradingSystem.getPlayerListings()
  }
  
  getTeamRocketFunds() {
    return this.tradingSystem.getTeamRocketFunds()
  }
  
  getMedalInfo(player) {
    const medalSystem = new MedalSystem(player)
    return medalSystem.getMedalInfo()
  }
  
  getObedienceInfo(player) {
    const medalSystem = new MedalSystem(player)
    return medalSystem.getObedienceInfo()
  }
  
  getAvailableMaps(player) {
    return getAvailableMaps(player)
  }
  
  getMapInfo(mapTier) {
    return getMapInfo(mapTier)
  }

  // ===== 新系统：登记/外勤/租借/签到 =====

  // 玩家登记
  registerPlayer(player, nickname) {
    if (player.registered) {
      const rank = player.getRankInfo()
      return { success: false, message: `你已经登记过了，${rank.title} ${player.nickname}！` }
    }
    if (!nickname || nickname.length > 12) {
      return { success: false, message: '昵称格式错误（1~12个字符）' }
    }
    player.nickname = nickname
    player.registered = true
    player.location = '火箭队基地'
    this.saveData()
    const rank = player.getRankInfo()
    return {
      success: true,
      message: `欢迎回来，${rank.title}，做好"外勤"准备了吗？`
    }
  }

  // 外勤
  dispatch(player, mapName) {
    if (!player.registered) {
      return { success: false, message: '请先输入"登记 [昵称]"加入火箭队！' }
    }
    if (!player.isAtBase()) {
      return { success: false, message: '你不在火箭队基地，无法发起外勤！' }
    }
    if (player.currentGame) {
      return { success: false, message: '已有进行中的外勤任务！' }
    }

    // 检查玩家是否有精灵
    const hasPokemon = player.warehouse.pokemon.length > 0
    if (!hasPokemon) {
      return {
        success: false,
        message: '火箭队探员：什么？你还没有宝可梦就想外勤搜刮？\n我这里临时租借火箭队制式宝可梦给你，务必平安带回来！\n\n可选租借精灵：【阿柏蛇】【瓦斯弹】【超音蝠】\n请输入「租借 宝可梦名称」完成租借'
      }
    }

    if (!mapName) {
      mapName = player.unlockedMaps[0] || '低级地图'
    }

    const availableMaps = getAvailableMaps(player)
    if (!availableMaps.includes(mapName)) {
      return { success: false, message: `未解锁该地图！\n可用地图：${availableMaps.join('、')}` }
    }

    const game = new GameInstance(player, mapName)
    player.currentGame = game

    // 将仓库精灵放入腰带，直接进入游玩状态（跳过"选择初始精灵"步骤）
    for (const p of player.warehouse.pokemon) {
      // p 可能是 Pokemon 对象（刚创建）或 JSON 数据（从文件加载）
      let pokemon
      if (p instanceof Pokemon) {
        // 已经是 Pokemon 对象，直接复制一份用于战斗
        pokemon = Pokemon.fromJSON(p.toJSON())
      } else if (typeof p === 'object' && p.name) {
        // 是 JSON 数据，用 fromJSON 恢复
        pokemon = Pokemon.fromJSON(p)
      }
      if (!pokemon) {
        pokemon = new Pokemon(p.name, p.level || 5)
      }
      game.belt.addPokemon(pokemon)
      if (!game.initialPokemon) game.initialPokemon = pokemon
    }
    game.status = 'playing'
    game.stepsTaken = 0
    game.taskSystem.generateTasks(Math.floor(Math.random() * 2) + 1)

    console.log(`[DEBUG] dispatch: currentGame 已设置, userId=${player.userId}, map=${mapName}, beltCount=${game.belt.pokemon.length}`)
    this.saveData()

    return {
      success: true,
      message: `火箭队探员：确认装备齐全，准许外出搜刮，祝你满载物资安全撤离！\n你来到了【${game.map.currentLocation}】，输入"查看周围"可以查看周围情况`
    }
  }

  // 租借精灵
  rentPokemon(player, pokemonName) {
    if (!player.registered) {
      return { success: false, message: '请先输入"登记 [昵称]"加入火箭队！' }
    }
    if (!player.isAtBase()) {
      return { success: false, message: '你不在火箭队基地，无法租借精灵！' }
    }
    const initialPokemon = require('./config').INITIAL_POKEMON || ['阿柏蛇', '瓦斯弹', '超音蝠']
    if (!initialPokemon.includes(pokemonName)) {
      return { success: false, message: '可租借精灵：阿柏蛇、瓦斯弹、超音蝠' }
    }
    if (player.warehouse.pokemon.length > 0) {
      return { success: false, message: '你已有精灵在仓库中，无需租借！' }
    }

    const pokemon = new Pokemon(pokemonName, 5, { isInitial: true, isRented: true })
    player.warehouse.addPokemon(pokemon)
    this.saveData()

    return {
      success: true,
      message: `租借成功！你的腰带已临时编入【${pokemonName}】，本次外勤可正常作战。\n租赁规则提醒：成功撤离自动归还精灵；若撤离失败，精灵遗失，将扣除固定赔付金币。`
    }
  }

  // 查看可用地图（军衔限制）
  getAvailableMapsForPlayer(player) {
    if (!player.registered) {
      return { success: false, message: '请先登记！' }
    }
    if (!player.isAtBase()) {
      return { success: false, message: '你不在火箭队基地！' }
    }
    const maps = getAvailableMaps(player)
    return { success: true, maps }
  }

  // 每日签到
  dailySignIn(player) {
    if (!player.registered) {
      return { success: false, message: '请先输入"登记 [昵称]"加入火箭队！' }
    }
    if (!player.canDailySignIn()) {
      const nextTime = new Date(player.lastDailySignIn + 86400000)
      return { success: false, message: `今日已签到！下次可签到时间：${nextTime.toLocaleString('zh-CN')}` }
    }

    const rankInfo = player.getRankInfo()
    const reward = rankInfo.dailySignIn

    // 发放金币
    player.addMoney(reward.gold)
    // 发放物品
    const rewardMsgs = [`获得 ${reward.gold} 金币`]
    if (reward.items) {
      for (const item of reward.items) {
        player.warehouse.addItem(item.name, item.quantity)
        rewardMsgs.push(`获得 ${item.name} x${item.quantity}`)
      }
    }

    player.lastDailySignIn = Date.now()
    this.saveData()

    return {
      success: true,
      message: `【每日签到】\n${rankInfo.title} ${player.nickname}\n签到奖励：\n${rewardMsgs.join('\n')}`
    }
  }

  // 获取玩家军衔信息
  getPlayerRank(player) {
    if (!player.registered) {
      return { success: false, message: '尚未登记' }
    }
    const rankInfo = player.getRankInfo()
    return {
      success: true,
      rank: rankInfo.title,
      totalEvacuationValue: player.totalEvacuationValue,
      buffs: rankInfo.buffs,
      nextThreshold: rankInfo.nextThreshold
    }
  }

  // 获取玩家藏品
  getPlayerCollections(player) {
    if (!player.collections || player.collections.length === 0) {
      return { success: true, items: [] }
    }
    return {
      success: true,
      items: player.collections.map(c => ({
        name: c.name,
        quantity: c.quantity || 1,
        info: getCollectionInfo(c.name)
      }))
    }
  }

  // 添加藏品
  addCollection(player, collectionName) {
    const info = getCollectionInfo(collectionName)
    if (!info) return { success: false, message: '未知藏品' }

    const existing = player.collections.find(c => c.name === collectionName)
    if (existing) {
      existing.quantity = (existing.quantity || 1) + 1
    } else {
      player.collections.push({ name: collectionName, quantity: 1 })
    }
    this.saveData()
    return { success: true, message: `获得藏品「${collectionName}」` }
  }
}

module.exports = {
  GameManager,
  GameInstance
}