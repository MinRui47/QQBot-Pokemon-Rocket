const { ITEM_CONFIG } = require('../config')

class Backpack {
  constructor(capacity = 10) {
    this.items = []      // 普通物品（可堆叠，每项占1格）
    this.collections = [] // 藏品（不可堆叠，每项占slots格）
    this.capacity = capacity
  }

  isFull() {
    return this.getUsedSlots() >= this.capacity
  }

  getUsedSlots() {
    // 普通物品每项占1格
    let slots = this.items.length
    // 藏品按各自slots计算
    for (const col of this.collections) {
      slots += col.slots
    }
    return slots
  }

  get maxSlots() {
    return this.capacity
  }

  addItem(item, quantity = 1) {
    const config = ITEM_CONFIG[item.name] || {}
    const stackLimit = config.stackLimit || 10
    
    // 检查是否已有该物品
    const existingItem = this.items.find(i => i.name === item.name)
    if (existingItem) {
      // 已有物品，尝试堆叠
      const canAdd = Math.min(quantity, stackLimit - existingItem.quantity)
      if (canAdd > 0) {
        existingItem.quantity += canAdd
        return { success: true, message: `获得 ${item.name} x${canAdd}` }
      }
      // 已达堆叠上限，需要新格子
      if (this.getUsedSlots() >= this.capacity) {
        return { success: false, message: '背包已满' }
      }
      this.items.push({ ...item, ...config, quantity })
      return { success: true, message: `获得 ${item.name} x${quantity}` }
    }
    
    // 新物品，需要检查格子
    if (this.getUsedSlots() >= this.capacity) {
      return { success: false, message: '背包已满' }
    }
    
    this.items.push({ ...item, ...config, quantity: Math.min(quantity, stackLimit) })
    return { success: true, message: `获得 ${item.name} x${Math.min(quantity, stackLimit)}` }
  }

  addCollection(name, slots, rarity, price) {
    // 检查是否有足够空间
    if (this.getUsedSlots() + slots > this.capacity) {
      return { success: false, message: `背包空间不足！需要${slots}格，当前剩余${this.capacity - this.getUsedSlots()}格` }
    }
    
    this.collections.push({ name, slots, rarity, price })
    return { success: true, message: `获得藏品【${name}】` }
  }

  removeItem(itemName, quantity = 1) {
    const itemIndex = this.items.findIndex(i => i.name === itemName)
    if (itemIndex === -1) {
      return { success: false, message: '物品不存在' }
    }

    const item = this.items[itemIndex]
    if (item.quantity < quantity) {
      return { success: false, message: '物品数量不足' }
    }

    item.quantity -= quantity
    if (item.quantity <= 0) {
      this.items.splice(itemIndex, 1)
    }

    return { success: true }
  }

  removeCollection(collectionName) {
    const index = this.collections.findIndex(c => c.name === collectionName)
    if (index === -1) {
      return { success: false, message: '藏品不存在' }
    }
    
    this.collections.splice(index, 1)
    return { success: true }
  }

  findItem(itemName) {
    return this.items.find(i => i.name === itemName)
  }

  hasItem(itemName) {
    return this.items.some(i => i.name === itemName)
  }

  getItemQuantity(itemName) {
    const item = this.items.find(i => i.name === itemName)
    return item ? item.quantity : 0
  }

  getItems() {
    return [...this.items]
  }

  getCollections() {
    return [...this.collections]
  }

  // 清空背包（用于全部存入仓库）
  clear() {
    const allItems = [...this.items]
    const allCollections = [...this.collections]
    this.items = []
    this.collections = []
    return { items: allItems, collections: allCollections }
  }

  toJSON() {
    return {
      items: this.items,
      collections: this.collections,
      capacity: this.capacity
    }
  }

  static fromJSON(data) {
    if (!data) return null
    const backpack = new Backpack(data.capacity || 10)
    backpack.items = data.items || []
    backpack.collections = data.collections || []
    return backpack
  }
}

module.exports = { Backpack }