/**
 * 道具数据导入脚本
 * 将 data/items.json 中的道具数据导入数据库
 */

const fs = require('fs')
const path = require('path')
const { database } = require('./dal')

const DATA_DIR = path.join(__dirname, '..', '..', '..', 'data')
const ITEMS_PATH = path.join(DATA_DIR, 'items.json')

// 道具分类配置（占格、堆叠数、价格等）
const ITEM_CONFIGS = {
  // 药品类 - 可堆叠99个，占1格
  '药品': { slots: 1, maxStack: 99, battleUsable: 1, fieldUsable: 1 },
  
  // 回复药
  '伤药': { slots: 1, maxStack: 99, price: 100, sellPrice: 50, effectType: 'heal', effectValue: '20', battleUsable: 1, fieldUsable: 1 },
  '好伤药': { slots: 1, maxStack: 99, price: 250, sellPrice: 125, effectType: 'heal', effectValue: '50', battleUsable: 1, fieldUsable: 1 },
  '厉害伤药': { slots: 1, maxStack: 99, price: 700, sellPrice: 350, effectType: 'heal', effectValue: '120', battleUsable: 1, fieldUsable: 1 },
  '全满药': { slots: 1, maxStack: 99, price: 1500, sellPrice: 750, effectType: 'heal', effectValue: 'full', battleUsable: 1, fieldUsable: 1 },
  
  // 状态回复药
  '解毒药': { slots: 1, maxStack: 99, price: 100, sellPrice: 50, effectType: 'status', effectValue: 'poison', battleUsable: 1, fieldUsable: 1 },
  '解麻药': { slots: 1, maxStack: 99, price: 100, sellPrice: 50, effectType: 'status', effectValue: 'paralysis', battleUsable: 1, fieldUsable: 1 },
  '解眠药': { slots: 1, maxStack: 99, price: 100, sellPrice: 50, effectType: 'status', effectValue: 'sleep', battleUsable: 1, fieldUsable: 1 },
  '烧伤药': { slots: 1, maxStack: 99, price: 100, sellPrice: 50, effectType: 'status', effectValue: 'burn', battleUsable: 1, fieldUsable: 1 },
  '解冻药': { slots: 1, maxStack: 99, price: 100, sellPrice: 50, effectType: 'status', effectValue: 'freeze', battleUsable: 1, fieldUsable: 1 },
  '万能药': { slots: 1, maxStack: 99, price: 300, sellPrice: 150, effectType: 'status', effectValue: 'all', battleUsable: 1, fieldUsable: 1 },
  
  // PP回复药
  'PP单项补剂': { slots: 1, maxStack: 99, price: 100, sellPrice: 50, effectType: 'pp', effectValue: '10', battleUsable: 1, fieldUsable: 1 },
  'PP多项补剂': { slots: 1, maxStack: 99, price: 300, sellPrice: 150, effectType: 'pp_all', effectValue: '10', battleUsable: 1, fieldUsable: 1 },
  
  // 战斗道具
  '战斗道具': { slots: 1, maxStack: 99, battleUsable: 1 },
  'X攻击': { slots: 1, maxStack: 99, price: 500, sellPrice: 250, effectType: 'stat_boost', effectValue: 'attack', battleUsable: 1 },
  'X防御': { slots: 1, maxStack: 99, price: 500, sellPrice: 250, effectType: 'stat_boost', effectValue: 'defense', battleUsable: 1 },
  'X速度': { slots: 1, maxStack: 99, price: 500, sellPrice: 250, effectType: 'stat_boost', effectValue: 'speed', battleUsable: 1 },
  'X特攻': { slots: 1, maxStack: 99, price: 500, sellPrice: 250, effectType: 'stat_boost', effectValue: 'sp_attack', battleUsable: 1 },
  'X特防': { slots: 1, maxStack: 99, price: 500, sellPrice: 250, effectType: 'stat_boost', effectValue: 'sp_defense', battleUsable: 1 },
  'X准确': { slots: 1, maxStack: 99, price: 500, sellPrice: 250, effectType: 'stat_boost', effectValue: 'accuracy', battleUsable: 1 },
  
  // 进化石 - 不可堆叠
  '进化石': { slots: 1, maxStack: 1, price: 1000, sellPrice: 500 },
  '火之石': { slots: 1, maxStack: 1, price: 1000, sellPrice: 500 },
  '水之石': { slots: 1, maxStack: 1, price: 1000, sellPrice: 500 },
  '雷之石': { slots: 1, maxStack: 1, price: 1000, sellPrice: 500 },
  '月之石': { slots: 1, maxStack: 1, price: 1000, sellPrice: 500 },
  '日之石': { slots: 1, maxStack: 1, price: 1000, sellPrice: 500 },
  '叶之石': { slots: 1, maxStack: 1, price: 1000, sellPrice: 500 },
  '冰之石': { slots: 1, maxStack: 1, price: 1000, sellPrice: 500 },
  
  // 重要物品 - 不可堆叠，不可丢弃
  '重要物品': { slots: 1, maxStack: 1, consumable: 0 },
  
  // 携带道具 - 不可堆叠
  '携带道具': { slots: 1, maxStack: 1, holdUsable: 1 },
  
  // 树果 - 可堆叠99个
  '树果': { slots: 1, maxStack: 99, holdUsable: 1 },
  
  // 喷雾剂
  '除虫喷雾': { slots: 1, maxStack: 99, price: 100, sellPrice: 50, effectType: 'repel', effectValue: '100', fieldUsable: 1 },
  '白银喷雾': { slots: 1, maxStack: 99, price: 250, sellPrice: 125, effectType: 'repel', effectValue: '200', fieldUsable: 1 },
  '黄金喷雾': { slots: 1, maxStack: 99, price: 500, sellPrice: 250, effectType: 'repel', effectValue: '250', fieldUsable: 1 },
  
  // 其他道具
  '道具': { slots: 1, maxStack: 99 }
}

// 精灵球配置
const POKEBALL_CONFIGS = {
  '精灵球': { catchRate: 1.0, price: 200, sellPrice: 100, slots: 1, maxStack: 99, rarity: 'common' },
  '超级球': { catchRate: 1.5, price: 600, sellPrice: 300, slots: 1, maxStack: 99, rarity: 'common' },
  '高级球': { catchRate: 2.0, price: 1200, sellPrice: 600, slots: 1, maxStack: 99, rarity: 'uncommon' },
  '大师球': { catchRate: 255, price: 0, sellPrice: 0, slots: 1, maxStack: 1, rarity: 'legendary', specialCondition: 'always_catch' },
  '狩猎球': { catchRate: 1.5, price: 0, sellPrice: 0, slots: 1, maxStack: 99, rarity: 'common', specialCondition: 'safari_only' },
  '速度球': { catchRate: 1.0, price: 300, sellPrice: 150, slots: 1, maxStack: 99, rarity: 'uncommon', specialCondition: 'fast_pokemon' },
  '等级球': { catchRate: 1.0, price: 300, sellPrice: 150, slots: 1, maxStack: 99, rarity: 'uncommon', specialCondition: 'lower_level' },
  '诱饵球': { catchRate: 1.0, price: 300, sellPrice: 150, slots: 1, maxStack: 99, rarity: 'uncommon', specialCondition: 'fishing' },
  '甜蜜球': { catchRate: 1.0, price: 300, sellPrice: 150, slots: 1, maxStack: 99, rarity: 'uncommon', specialCondition: 'opposite_gender' },
  '友友球': { catchRate: 1.0, price: 300, sellPrice: 150, slots: 1, maxStack: 99, rarity: 'uncommon', specialCondition: 'friendship_boost' },
  '月亮球': { catchRate: 1.0, price: 300, sellPrice: 150, slots: 1, maxStack: 99, rarity: 'uncommon', specialCondition: 'moon_stone_evo' },
  '沉重球': { catchRate: 1.0, price: 300, sellPrice: 150, slots: 1, maxStack: 99, rarity: 'uncommon', specialCondition: 'heavy_pokemon' },
  '先机球': { catchRate: 4.0, price: 1000, sellPrice: 500, slots: 1, maxStack: 99, rarity: 'rare', specialCondition: 'first_turn' },
  '重复球': { catchRate: 3.0, price: 1000, sellPrice: 500, slots: 1, maxStack: 99, rarity: 'rare', specialCondition: 'caught_before' },
  '巢穴球': { catchRate: 1.0, price: 1000, sellPrice: 500, slots: 1, maxStack: 99, rarity: 'rare', specialCondition: 'low_level_multiplier' },
  '计时球': { catchRate: 1.0, price: 1000, sellPrice: 500, slots: 1, maxStack: 99, rarity: 'rare', specialCondition: 'turn_count' },
  '豪华球': { catchRate: 1.0, price: 800, sellPrice: 400, slots: 1, maxStack: 99, rarity: 'uncommon', specialCondition: 'style_bonus' },
  '治愈球': { catchRate: 1.0, price: 800, sellPrice: 400, slots: 1, maxStack: 99, rarity: 'uncommon', specialCondition: 'heal_on_catch' },
  '究极球': { catchRate: 2.0, price: 1500, sellPrice: 750, slots: 1, maxStack: 99, rarity: 'epic', specialCondition: 'ultra_beast_only' }
}

// 藏品名称库
const COLLECTION_NAMES = {
  common: ['旧报纸', '破损玩具', '廉价饰品', '普通石头', '废弃零件', '破旧书籍', '生锈钥匙', '破碎玻璃', '旧信封', '褪色照片'],
  uncommon: ['旧相册', '陶瓷杯子', '复古唱片', '小型雕塑', '手工编织物', '老式手表', '铜质徽章', '木制玩具', '旧式眼镜', '铁质钥匙'],
  rare: ['珍珠项链', '古董钟', '银质餐具', '稀有化石', '艺术画作', '宝石碎片', '水晶摆件', '古书手稿', '银质徽章', '稀有矿石'],
  epic: ['黄金饰品', '古代文物', '稀有矿石', '名贵瓷器', '大师画作', '传家宝', '金质徽章', '魔法水晶', '古代卷轴', '神秘钥匙'],
  legendary: ['传说徽章', '神秘宝石', '古老卷轴', '王者之证', '圣物碎片', '龙之鳞片', '永恒水晶', '神话手稿', '命运钥匙', '时间碎片'],
  mythic: ['神话遗物', '创世之石', '永恒之心', '天界神器', '命运之轮', '时空碎片', '宇宙水晶', '起源卷轴', '永恒钥匙', '无限宝石']
}

// 藏品价格配置
const RARITY_BASE_PRICE = {
  common: 50,
  uncommon: 150,
  rare: 500,
  epic: 1500,
  legendary: 5000,
  mythic: 15000
}

const SLOT_PRICE_MULTIPLIER = {
  1: 1.0,
  2: 1.5,
  3: 2.0,
  4: 3.0
}

async function importItems() {
  console.log('[道具] 开始导入道具数据...')
  
  await database.init()
  
  // 读取道具JSON文件
  const itemsData = JSON.parse(fs.readFileSync(ITEMS_PATH, 'utf-8'))
  
  let itemsCount = 0
  let pokeballsCount = 0
  
  for (const item of itemsData) {
    const category = item.category || '道具'
    
    // 精灵球单独处理
    if (category === '精灵球') {
      const config = POKEBALL_CONFIGS[item.name] || { catchRate: 1.0, slots: 1, maxStack: 99 }
      
      try {
        database.db.run(`
          INSERT OR IGNORE INTO pokeballs (name, japanese_name, english_name, description, image_url, catch_rate_multiplier, special_condition, slots, max_stack, price, sell_price, rarity)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          item.name,
          item.japaneseName,
          item.englishName,
          item.description,
          item.imageUrl,
          config.catchRate,
          config.specialCondition || null,
          config.slots,
          config.maxStack,
          config.price || 0,
          config.sellPrice || 0,
          config.rarity || 'common'
        ])
        pokeballsCount++
      } catch (e) {
        console.error(`[精灵球] 导入失败: ${item.name}`, e.message)
      }
    } else {
      // 其他道具
      const config = ITEM_CONFIGS[item.name] || ITEM_CONFIGS[category] || { slots: 1, maxStack: 99 }
      
      try {
        database.db.run(`
          INSERT OR IGNORE INTO items (name, japanese_name, english_name, description, category, image_url, slots, max_stack, price, sell_price, effect_type, effect_value, usable, consumable, battle_usable, field_usable, hold_usable)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          item.name,
          item.japaneseName,
          item.englishName,
          item.description,
          category,
          item.imageUrl,
          config.slots || 1,
          config.maxStack || 99,
          config.price || 0,
          config.sellPrice || 0,
          config.effectType || null,
          config.effectValue || null,
          config.usable || 0,
          config.consumable !== undefined ? config.consumable : 1,
          config.battleUsable || 0,
          config.fieldUsable || 0,
          config.holdUsable || 0
        ])
        itemsCount++
      } catch (e) {
        console.error(`[道具] 导入失败: ${item.name}`, e.message)
      }
    }
  }
  
  database.save()
  
  console.log(`\n[道具] === 导入统计 ===`)
  console.log(`[道具] 道具总数: ${itemsCount}`)
  console.log(`[道具] 精灵球总数: ${pokeballsCount}`)
  
  // 导入藏品数据
  console.log('\n[藏品] 开始导入藏品数据...')
  let collectionsCount = 0
  
  for (const [rarity, names] of Object.entries(COLLECTION_NAMES)) {
    for (const name of names) {
      // 随机生成格数（1-4）
      const slots = Math.floor(Math.random() * 4) + 1
      const basePrice = RARITY_BASE_PRICE[rarity]
      const price = Math.floor(basePrice * SLOT_PRICE_MULTIPLIER[slots])
      
      try {
        database.db.run(`
          INSERT OR IGNORE INTO collections (name, rarity, slots, base_price, description, source)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          name,
          rarity,
          slots,
          price,
          `${rarity}品质的藏品，占用${slots}格空间`,
          '探索获得'
        ])
        collectionsCount++
      } catch (e) {
        console.error(`[藏品] 导入失败: ${name}`, e.message)
      }
    }
  }
  
  database.save()
  
  console.log(`\n[藏品] === 导入统计 ===`)
  console.log(`[藏品] 藏品总数: ${collectionsCount}`)
  
  // 显示示例数据
  console.log('\n=== 示例数据 ===')
  
  const sampleItems = database.all('SELECT name, category, slots, max_stack, price FROM items LIMIT 5')
  console.log('\n道具示例:')
  console.table(sampleItems)
  
  const samplePokeballs = database.all('SELECT name, catch_rate_multiplier, slots, max_stack, price FROM pokeballs LIMIT 5')
  console.log('\n精灵球示例:')
  console.table(samplePokeballs)
  
  const sampleCollections = database.all('SELECT name, rarity, slots, base_price FROM collections LIMIT 10')
  console.log('\n藏品示例:')
  console.table(sampleCollections)
  
  console.log('\n=== 导入完成 ===')
  
  database.close()
}

importItems().catch(console.error)