const ITEM_CONFIG = {
  '普通精灵球': { type: 'ball', captureRate: 1.0, price: 100 },
  '超级球': { type: 'ball', captureRate: 1.5, price: 300 },
  '高级球': { type: 'ball', captureRate: 2.0, price: 700 },
  '大师球': { type: 'ball', captureRate: 255, price: 0 },
  '伤药': { type: 'heal', healAmount: 20, price: 100 },
  '好伤药': { type: 'heal', healAmount: 50, price: 300 },
  '神奇糖果': { type: 'candy', price: 1000 },
  '超级进化石': { type: 'mega_stone', price: 0 }
}

const RARITY_COLORS = {
  common: { color: '灰色', name: '普通' },
  uncommon: { color: '绿色', name: '罕见' },
  rare: { color: '蓝色', name: '稀有' },
  epic: { color: '紫色', name: '史诗' },
  legendary: { color: '金色', name: '传说' }
}

const MEDALS = {
  FIRST_CAPTURE: '首次捕获',
  FIRST_EVOLUTION: '首次进化',
  FIRST_MEGA: '首次超级进化',
  MAP_CLEAR: '地图通关',
  TOTAL_CAPTURE: '累计捕获',
  BATTLE_WIN: '战斗胜利',
  PERFECT_IV: '完美个体',
  MAX_EV: '努力值满'
}

const INITIAL_POKEMON = ['阿柏蛇', '瓦斯弹', '超音蝠']

module.exports = {
  ITEM_CONFIG,
  RARITY_COLORS,
  MEDALS,
  INITIAL_POKEMON
}