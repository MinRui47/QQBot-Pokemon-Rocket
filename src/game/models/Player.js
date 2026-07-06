const { getRankInfo } = require('../rankSystem')
const { BACKPACK_TYPES, getBackpackSlotUpgrade } = require('../backpackTypes')

class Player {
  constructor(userId, username) {
    this.userId = userId
    this.username = username
    this.nickname = ''             // 玩家登记的昵称
    this.registered = false        // 是否已登记
    this.location = '火箭队基地'   // 玩家当前位置
    this.coins = 0                 // 金币（数据库字段名）
    this.money = 0                 // 金币（兼容旧代码）
    this.title = '火箭队炮灰'      // 军衔称号
    this.rankLevel = 1             // 军衔等级
    this.totalEvacuationValue = 0  // 累计撤离总值（用于军衔）
    this.evacuationTotal = 0       // 累计撤离次数（数据库字段名）
    this.successfulEvacuations = 0 // 成功撤离次数
    this.backpackQuality = 1
    this.backpackType = '简易斜挎包'   // 当前装备的背包类型
    this.backpackUpgradeLevel = 0      // 背包扩容等级
    this.ownedBackpacks = ['简易斜挎包'] // 拥有的背包
    this.equippedBackpack = { type: '简易斜挎包', rarity: 'gray', slots: 4 } // 装备的背包配置
    this.backpack = { type: '简易斜挎包', slots: 4, items: [], collections: [] } // 背包数据
    this.belt = { maxSlots: 6, pokemon: [] } // 腰带数据
    this.warehouseLevel = 1           // 仓库等级（1级=36格，每级+18）
    this.lastDailySignIn = 0          // 上次签到时间戳
    this.currentGame = null
    this.medals = []
    this.collections = []             // 藏品列表 [{ name, quantity }]
    this.unlockedMaps = ['低级地图']
    this.warehouse = {
      items: [],
      pokemon: [],
      medals: [],
      collections: [],  // 仓库中的藏品
      maxSlots: this._getWarehouseMaxSlots(),
      getTotalUsedSlots() {
        let slots = this.items.length + this.pokemon.length
        for (const col of this.collections) {
          slots += col.slots
        }
        return slots
      },
      addItem(itemName, quantity = 1) {
        const existing = this.items.find(i => i.name === itemName)
        if (existing) {
          existing.quantity += quantity
        } else {
          this.items.push({ name: itemName, quantity })
        }
        return { success: true }
      },
      removeItem(itemName, quantity = 1) {
        const idx = this.items.findIndex(i => i.name === itemName)
        if (idx === -1) return { success: false, message: '物品不存在' }
        const item = this.items[idx]
        if (item.quantity < quantity) return { success: false, message: '数量不足' }
        item.quantity -= quantity
        if (item.quantity <= 0) this.items.splice(idx, 1)
        return { success: true }
      },
      addPokemon(pokemon) {
        this.pokemon.push(pokemon)
        return { success: true }
      },
      addCollection(name, slots, rarity, price) {
        this.collections.push({ name, slots, rarity, price })
        return { success: true }
      }
    }
    this.createdAt = Date.now()
    this.lastActive = Date.now()
  }

  _getWarehouseMaxSlots() {
    return 36 + (this.warehouseLevel - 1) * 18
  }

  // 获取军衔信息
  getRankInfo() {
    return getRankInfo(this.totalEvacuationValue)
  }

  // 获取装备背包容量
  getBackpackCapacity() {
    return getBackpackSlotUpgrade(this.backpackType, this.backpackUpgradeLevel)
  }

  // 根据背包类型获取容量（不考虑升级等级）
  getBackpackCapacityByType(backpackType) {
    return getBackpackSlotUpgrade(backpackType, 0)
  }

  // 签到
  canDailySignIn() {
    const now = Date.now()
    return now - this.lastDailySignIn > 86400000 // 24小时
  }

  // 是否在基地
  isAtBase() {
    return this.location === '火箭队基地'
  }

  toJSON() {
    // 获取背包和腰带数据（如果有进行中的游戏）
    const backpack = this.currentGame?.backpack ? {
      type: this.backpackType,
      slots: this.currentGame.backpack.maxSlots,
      items: this.currentGame.backpack.items,
      collections: this.currentGame.backpack.collections || []
    } : { type: this.backpackType, slots: this.getBackpackCapacity(), items: [], collections: [] }
    
    const belt = this.currentGame?.belt ? {
      maxSlots: this.currentGame.belt.maxSlots,
      pokemon: this.currentGame.belt.pokemon.map(p => p.toJSON ? p.toJSON() : p)
    } : { maxSlots: 6, pokemon: [] }
    
    return {
      userId: this.userId,
      username: this.username,
      nickname: this.nickname,
      registered: this.registered,
      location: this.location,
      coins: this.coins || this.money || 0,
      money: this.money || this.coins || 0,
      title: this.title || '火箭队炮灰',
      rankLevel: this.rankLevel || 1,
      totalEvacuationValue: this.totalEvacuationValue || 0,
      evacuationTotal: this.evacuationTotal || 0,
      successfulEvacuations: this.successfulEvacuations || 0,
      backpackQuality: this.backpackQuality,
      backpackType: this.backpackType,
      backpackUpgradeLevel: this.backpackUpgradeLevel || 0,
      ownedBackpacks: this.ownedBackpacks || ['简易斜挎包'],
      equippedBackpack: this.equippedBackpack || { type: '简易斜挎包', rarity: 'gray', slots: 4 },
      warehouseLevel: this.warehouseLevel || 1,
      lastDailySignIn: this.lastDailySignIn || 0,
      currentGame: this.currentGame ? this.currentGame.toJSON() : null,
      medals: this.medals,
      collections: this.collections || [],
      unlockedMaps: this.unlockedMaps || ['低级地图'],
      warehouse: {
        items: this.warehouse.items,
        pokemon: this.warehouse.pokemon.map(p => p.toJSON ? p.toJSON() : p),
        collections: this.warehouse.collections,
        maxSlots: this._getWarehouseMaxSlots()
      },
      backpack: backpack,
      belt: belt,
      createdAt: this.createdAt,
      lastActive: this.lastActive
    }
  }

  static fromJSON(data) {
    if (!data) return null
    
    const player = new Player(data.userId, data.username)
    player.nickname = data.nickname || ''
    player.registered = data.registered || false
    player.location = data.location || '火箭队基地'
    player.coins = data.coins || data.money || 0
    player.money = data.money || data.coins || 0
    player.title = data.title || '火箭队炮灰'
    player.rankLevel = data.rankLevel || data.rank_level || 1
    player.totalEvacuationValue = data.totalEvacuationValue || 0
    player.evacuationTotal = data.evacuationTotal || data.evacuation_total || 0
    player.successfulEvacuations = data.successfulEvacuations || data.successful_evacuations || 0
    player.backpackQuality = data.backpackQuality || 1
    player.backpackType = data.backpackType || '简易斜挎包'
    player.backpackUpgradeLevel = data.backpackUpgradeLevel || 0
    player.ownedBackpacks = data.ownedBackpacks || ['简易斜挎包']
    player.equippedBackpack = data.equippedBackpack || data.equipped_backpack || { type: '简易斜挎包', rarity: 'gray', slots: 4 }
    player.backpack = data.backpack || { type: '简易斜挎包', slots: 4, items: [], collections: [] }
    player.belt = data.belt || { maxSlots: 6, pokemon: [] }
    player.warehouseLevel = data.warehouseLevel || 1
    player.lastDailySignIn = data.lastDailySignIn || 0
    player.medals = data.medals || []
    player.collections = data.collections || []
    player.unlockedMaps = data.unlockedMaps || ['低级地图']
    player.createdAt = data.createdAt || Date.now()
    player.lastActive = data.lastActive || Date.now()
    
    // 恢复仓库数据
    if (data.warehouse) {
      player.warehouse.items = data.warehouse.items || []
      player.warehouse.pokemon = (data.warehouse.pokemon || []).map(p => {
        if (typeof p === 'object' && p.name) return p
        return p
      })
      player.warehouse.collections = data.warehouse.collections || []
    }
    player.warehouse.maxSlots = player._getWarehouseMaxSlots()
    
    return player
  }

  updateActiveTime() {
    this.lastActive = Date.now()
  }

  setUsername(name) {
    if (name) this.username = name
  }

  addMoney(amount) {
    this.money = (this.money || 0) + amount
    this.coins = (this.coins || 0) + amount
    return true
  }

  addMedal(medal) {
    if (!this.medals.includes(medal)) {
      this.medals.push(medal)
      return true
    }
    return false
  }

  hasMedal(medal) {
    return this.medals.includes(medal)
  }

  getMedalCount() {
    return this.medals.length
  }

  getObedienceLevel() {
    return 100
  }
}

module.exports = { Player }
