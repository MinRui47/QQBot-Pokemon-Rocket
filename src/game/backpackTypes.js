// 背包类型系统
// 撤离失败背包会丢失（装备中的背包）

const BACKPACK_TYPES = {
  '简易斜挎包': {
    quality: '灰色',
    slots: [4, 6],
    warehouseSlots: 3,
    description: '最基础的挎包，空间有限',
    price: 0 // 初始赠送
  },
  '外勤小包': {
    quality: '白色',
    slots: [8],
    warehouseSlots: 4,
    description: '标准外勤用包，容量适中',
    price: 500
  },
  '野外搜刮包': {
    quality: '绿色',
    slots: [9, 12],
    warehouseSlots: 4,
    description: '适合野外搜刮使用',
    price: 1500
  },
  '战术掠夺包': {
    quality: '蓝色',
    slots: [14, 18],
    warehouseSlots: 4,
    description: '战术设计，便于掠夺物资',
    price: 5000
  },
  '中型作战背包': {
    quality: '紫色',
    slots: [20, 22, 24],
    warehouseSlots: 4,
    description: '火箭队制式作战背包',
    price: 15000
  },
  '干部大容量背包': {
    quality: '金色',
    slots: [28, 30],
    warehouseSlots: 4,
    description: '干部专属，大容量设计',
    price: 50000
  },
  '总帅重型背包': {
    quality: '红色',
    slots: [35, 40, 45],
    warehouseSlots: 4,
    description: '总帅级重型装备',
    price: 150000
  }
}

// 获取背包容量（取最大可能值）
function getBackpackCapacity(typeName) {
  const type = BACKPACK_TYPES[typeName]
  if (!type) return 10 // 默认
  return type.slots[type.slots.length - 1]
}

// 获取背包当前档位容量
function getBackpackSlotUpgrade(typeName, upgradeLevel = 0) {
  const type = BACKPACK_TYPES[typeName]
  if (!type) return 10
  const idx = Math.min(upgradeLevel, type.slots.length - 1)
  return type.slots[idx]
}

module.exports = { BACKPACK_TYPES, getBackpackCapacity, getBackpackSlotUpgrade }
