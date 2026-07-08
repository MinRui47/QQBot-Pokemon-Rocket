const { loadRarityConfig, loadMedals, loadInitialPokemon } = require('./configCache')

let ITEM_CONFIG = {
  '普通精灵球': { type: 'ball', captureRate: 1.0, price: 100 },
  '超级球': { type: 'ball', captureRate: 1.5, price: 300 },
  '高级球': { type: 'ball', captureRate: 2.0, price: 700 },
  '大师球': { type: 'ball', captureRate: 255, price: 0 },
  '伤药': { type: 'heal', healAmount: 20, price: 100 },
  '好伤药': { type: 'heal', healAmount: 50, price: 300 },
  '神奇糖果': { type: 'candy', price: 1000 },
  '超级进化石': { type: 'mega_stone', price: 0 }
}

let RARITY_COLORS = {
  common: { color: '灰色', name: '普通' },
  uncommon: { color: '绿色', name: '罕见' },
  rare: { color: '蓝色', name: '稀有' },
  epic: { color: '紫色', name: '史诗' },
  legendary: { color: '金色', name: '传说' }
}

let MEDALS = {
  FIRST_CAPTURE: '首次捕获',
  FIRST_EVOLUTION: '首次进化',
  FIRST_MEGA: '首次超级进化',
  MAP_CLEAR: '地图通关',
  TOTAL_CAPTURE: '累计捕获',
  BATTLE_WIN: '战斗胜利',
  PERFECT_IV: '完美个体',
  MAX_EV: '努力值满'
}

let INITIAL_POKEMON = ['阿柏蛇', '瓦斯弹', '超音蝠']

async function refreshFromDb() {
  const rarityConfig = await loadRarityConfig()
  const medals = await loadMedals()
  const initialPokemon = await loadInitialPokemon()
  
  RARITY_COLORS = {}
  for (const [key, config] of Object.entries(rarityConfig)) {
    RARITY_COLORS[key] = {
      color: config.color,
      name: config.name
    }
  }
  
  MEDALS = {}
  for (const [key, medal] of Object.entries(medals)) {
    MEDALS[key] = medal.name
  }
  
  INITIAL_POKEMON = initialPokemon || ['阿柏蛇', '瓦斯弹', '超音蝠']
  
  module.exports.INITIAL_POKEMON = INITIAL_POKEMON
  module.exports.RARITY_COLORS = RARITY_COLORS
  module.exports.MEDALS = MEDALS
  
  console.log('[Config] 配置已从数据库刷新')
}

module.exports = {
  ITEM_CONFIG,
  RARITY_COLORS,
  MEDALS,
  INITIAL_POKEMON,
  refreshFromDb
}