const db = require('./db')

async function initConfigData() {
  await db.init()
  
  const types = ['一般', '火', '水', '草', '电', '超能力', '冰', '龙', '恶', '妖精', '格斗', '飞行', '毒', '地面', '岩石', '虫', '幽灵', '钢']
  
  const typeChartData = {
    '一般': { '岩石': 0.5, '钢': 0.5, '幽灵': 0 },
    '火': { '火': 0.5, '水': 0.5, '草': 2, '冰': 2, '虫': 2, '岩石': 0.5, '钢': 2 },
    '水': { '火': 2, '水': 0.5, '草': 0.5, '地面': 2, '岩石': 2 },
    '草': { '火': 0.5, '水': 2, '草': 0.5, '电': 0.5, '地面': 2, '飞行': 0.5, '毒': 0.5, '虫': 0.5, '岩石': 2 },
    '电': { '水': 2, '草': 0.5, '电': 0.5, '地面': 0, '飞行': 2 },
    '超能力': { '格斗': 2, '毒': 2, '超能力': 0.5, '恶': 0, '虫': 0.5, '幽灵': 0.5 },
    '冰': { '火': 0.5, '水': 0.5, '草': 2, '冰': 0.5, '地面': 2, '飞行': 2, '龙': 2 },
    '龙': { '火': 0.5, '水': 0.5, '草': 0.5, '电': 0.5, '冰': 0.5, '龙': 2, '妖精': 0 },
    '恶': { '格斗': 0.5, '超能力': 2, '恶': 0.5, '虫': 0.5, '幽灵': 2, '妖精': 0.5 },
    '妖精': { '格斗': 2, '毒': 0.5, '虫': 0.5, '恶': 2, '龙': 2, '钢': 0.5 },
    '格斗': { '一般': 2, '冰': 2, '恶': 2, '飞行': 0.5, '毒': 0.5, '超能力': 0.5, '虫': 0.5, '幽灵': 0, '岩石': 2, '钢': 0.5 },
    '飞行': { '草': 2, '电': 0.5, '格斗': 2, '地面': 0, '虫': 2, '岩石': 0.5, '钢': 0.5 },
    '毒': { '草': 2, '毒': 0.5, '地面': 0.5, '岩石': 0.5, '幽灵': 0.5, '钢': 0, '妖精': 2 },
    '地面': { '火': 2, '电': 2, '草': 0.5, '毒': 2, '飞行': 0, '虫': 0.5, '岩石': 2, '钢': 2 },
    '岩石': { '火': 2, '冰': 2, '格斗': 0.5, '飞行': 2, '虫': 2, '地面': 0.5, '钢': 0.5 },
    '虫': { '草': 2, '火': 0.5, '格斗': 0.5, '毒': 0.5, '飞行': 0.5, '幽灵': 0.5, '岩石': 0.5, '超能力': 2, '恶': 2 },
    '幽灵': { '一般': 0, '超能力': 2, '幽灵': 2, '恶': 0.5 },
    '钢': { '火': 0.5, '水': 0.5, '电': 0.5, '冰': 2, '岩石': 2, '钢': 0.5, '妖精': 2 }
  }
  
  console.log('=== 导入属性克制关系 ===')
  let inserted = 0
  for (const [attacker, defenders] of Object.entries(typeChartData)) {
    for (const [defender, multiplier] of Object.entries(defenders)) {
      const exists = db.get('SELECT id FROM type_chart WHERE attacker_type = ? AND defender_type = ?', [attacker, defender])
      if (!exists) {
        db.run('INSERT INTO type_chart (attacker_type, defender_type, multiplier) VALUES (?, ?, ?)', [attacker, defender, multiplier])
        inserted++
      }
    }
  }
  console.log(`属性克制关系导入完成，新增 ${inserted} 条记录`)
  
  const statusEffectsData = [
    { status_key: 'poison', name: '中毒', damage: 0.0625, message: '被毒侵蚀', lasts: -1 },
    { status_key: 'burn', name: '灼伤', damage: 0.0625, message: '被烧伤', lasts: -1, attack_mod: 0.5 },
    { status_key: 'freeze', name: '冰冻', damage: 0, message: '被冰冻', lasts: -1, skip_turn: 1 },
    { status_key: 'paralysis', name: '麻痹', damage: 0, message: '被麻痹', lasts: -1, speed_mod: 0.5, skip_turn: 1, skip_chance: 0.25 },
    { status_key: 'sleep', name: '睡眠', damage: 0, message: '睡着了', lasts: 3, skip_turn: 1 },
    { status_key: 'badPoison', name: '剧毒', damage: 0.0625, message: '中了剧毒', lasts: -1, grow: 1 },
    { status_key: 'confusion', name: '混乱', damage: 0, message: '陷入混乱', lasts: -1, self_damage: 1, skip_turn: 1, skip_chance: 0.33 },
    { status_key: 'flinch', name: '畏缩', damage: 0, message: '被畏缩', lasts: 0, skip_turn: 1 }
  ]
  
  console.log('=== 导入状态效果 ===')
  inserted = 0
  for (const effect of statusEffectsData) {
    const exists = db.get('SELECT id FROM status_effects WHERE status_key = ?', [effect.status_key])
    if (!exists) {
      db.run(`INSERT INTO status_effects (status_key, name, damage, message, lasts, attack_mod, speed_mod, skip_turn, skip_chance, grow, self_damage) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [effect.status_key, effect.name, effect.damage, effect.message, effect.lasts, effect.attack_mod || 1.0, effect.speed_mod || 1.0, effect.skip_turn || 0, effect.skip_chance || 0, effect.grow || 0, effect.self_damage || 0])
      inserted++
    }
  }
  console.log(`状态效果导入完成，新增 ${inserted} 条记录`)
  
  const rarityConfigData = [
    { rarity_key: 'common', color: '灰色', name: '普通', base_price: 50 },
    { rarity_key: 'uncommon', color: '绿色', name: '罕见', base_price: 150 },
    { rarity_key: 'rare', color: '蓝色', name: '稀有', base_price: 500 },
    { rarity_key: 'epic', color: '紫色', name: '史诗', base_price: 2000 },
    { rarity_key: 'legendary', color: '金色', name: '传说', base_price: 10000 },
    { rarity_key: 'mythic', color: '彩虹', name: '神话', base_price: 50000 }
  ]
  
  console.log('=== 导入稀有度配置 ===')
  inserted = 0
  for (const rarity of rarityConfigData) {
    const exists = db.get('SELECT id FROM rarity_config WHERE rarity_key = ?', [rarity.rarity_key])
    if (!exists) {
      db.run('INSERT INTO rarity_config (rarity_key, color, name, base_price) VALUES (?, ?, ?, ?)', [rarity.rarity_key, rarity.color, rarity.name, rarity.base_price])
      inserted++
    }
  }
  console.log(`稀有度配置导入完成，新增 ${inserted} 条记录`)
  
  const rarityProbabilityData = [
    { difficulty: 1, rarity_key: 'common', probability: 0.85 },
    { difficulty: 1, rarity_key: 'uncommon', probability: 0.12 },
    { difficulty: 1, rarity_key: 'rare', probability: 0.03 },
    { difficulty: 1, rarity_key: 'epic', probability: 0 },
    { difficulty: 1, rarity_key: 'legendary', probability: 0 },
    { difficulty: 1, rarity_key: 'mythic', probability: 0 },
    { difficulty: 2, rarity_key: 'common', probability: 0.75 },
    { difficulty: 2, rarity_key: 'uncommon', probability: 0.18 },
    { difficulty: 2, rarity_key: 'rare', probability: 0.06 },
    { difficulty: 2, rarity_key: 'epic', probability: 0.01 },
    { difficulty: 2, rarity_key: 'legendary', probability: 0 },
    { difficulty: 2, rarity_key: 'mythic', probability: 0 },
    { difficulty: 3, rarity_key: 'common', probability: 0.65 },
    { difficulty: 3, rarity_key: 'uncommon', probability: 0.22 },
    { difficulty: 3, rarity_key: 'rare', probability: 0.10 },
    { difficulty: 3, rarity_key: 'epic', probability: 0.025 },
    { difficulty: 3, rarity_key: 'legendary', probability: 0.005 },
    { difficulty: 3, rarity_key: 'mythic', probability: 0 },
    { difficulty: 4, rarity_key: 'common', probability: 0.50 },
    { difficulty: 4, rarity_key: 'uncommon', probability: 0.28 },
    { difficulty: 4, rarity_key: 'rare', probability: 0.15 },
    { difficulty: 4, rarity_key: 'epic', probability: 0.05 },
    { difficulty: 4, rarity_key: 'legendary', probability: 0.015 },
    { difficulty: 4, rarity_key: 'mythic', probability: 0.005 }
  ]
  
  console.log('=== 导入品质概率配置 ===')
  inserted = 0
  for (const prob of rarityProbabilityData) {
    const exists = db.get('SELECT id FROM rarity_probability WHERE difficulty = ? AND rarity_key = ?', [prob.difficulty, prob.rarity_key])
    if (!exists) {
      db.run('INSERT INTO rarity_probability (difficulty, rarity_key, probability) VALUES (?, ?, ?)', [prob.difficulty, prob.rarity_key, prob.probability])
      inserted++
    }
  }
  console.log(`品质概率配置导入完成，新增 ${inserted} 条记录`)
  
  const collectionNamesData = [
    { rarity_key: 'common', names: ['旧报纸', '破损玩具', '廉价饰品', '普通石头', '废弃零件', '破旧书籍'] },
    { rarity_key: 'uncommon', names: ['旧相册', '陶瓷杯子', '复古唱片', '小型雕塑', '手工编织物', '老式手表'] },
    { rarity_key: 'rare', names: ['珍珠项链', '古董钟', '银质餐具', '稀有化石', '艺术画作', '宝石碎片'] },
    { rarity_key: 'epic', names: ['黄金饰品', '古代文物', '稀有矿石', '名贵瓷器', '大师画作', '传家宝'] },
    { rarity_key: 'legendary', names: ['传说徽章', '神秘宝石', '古老卷轴', '王者之证', '圣物碎片', '龙之鳞片'] },
    { rarity_key: 'mythic', names: ['宇宙晶体', '神之遗物', '时间碎片', '空间裂隙', '创世碎片', '命运之石'] }
  ]
  
  console.log('=== 导入藏品名称库 ===')
  inserted = 0
  for (const group of collectionNamesData) {
    for (const name of group.names) {
      const exists = db.get('SELECT id FROM collection_names WHERE rarity_key = ? AND name = ?', [group.rarity_key, name])
      if (!exists) {
        db.run('INSERT INTO collection_names (rarity_key, name) VALUES (?, ?)', [group.rarity_key, name])
        inserted++
      }
    }
  }
  console.log(`藏品名称库导入完成，新增 ${inserted} 条记录`)
  
  const medalsData = [
    { medal_key: 'FIRST_CAPTURE', name: '首次捕获', description: '捕获第一只宝可梦', icon: '🏆' },
    { medal_key: 'FIRST_EVOLUTION', name: '首次进化', description: '完成第一次宝可梦进化', icon: '⭐' },
    { medal_key: 'FIRST_MEGA', name: '首次超级进化', description: '完成第一次超级进化', icon: '🌟' },
    { medal_key: 'MAP_CLEAR', name: '地图通关', description: '完成一张地图的探索', icon: '🗺️' },
    { medal_key: 'TOTAL_CAPTURE', name: '累计捕获', description: '累计捕获100只宝可梦', icon: '📊' },
    { medal_key: 'BATTLE_WIN', name: '战斗胜利', description: '获得100场战斗胜利', icon: '⚔️' },
    { medal_key: 'PERFECT_IV', name: '完美个体', description: '拥有一只6V宝可梦', icon: '💎' },
    { medal_key: 'MAX_EV', name: '努力值满', description: '完成一只宝可梦的努力值培养', icon: '🔥' }
  ]
  
  console.log('=== 导入勋章配置 ===')
  inserted = 0
  for (const medal of medalsData) {
    const exists = db.get('SELECT id FROM medal_config WHERE medal_key = ?', [medal.medal_key])
    if (!exists) {
      db.run('INSERT INTO medal_config (medal_key, name, description, icon) VALUES (?, ?, ?, ?)', [medal.medal_key, medal.name, medal.description, medal.icon])
      inserted++
    }
  }
  console.log(`勋章配置导入完成，新增 ${inserted} 条记录`)
  
  const initialPokemonData = [
    { pokemon_name: '阿柏蛇', sort_order: 1 },
    { pokemon_name: '瓦斯弹', sort_order: 2 },
    { pokemon_name: '超音蝠', sort_order: 3 }
  ]
  
  console.log('=== 导入初始宝可梦 ===')
  inserted = 0
  for (const pokemon of initialPokemonData) {
    const exists = db.get('SELECT id FROM initial_pokemon WHERE pokemon_name = ?', [pokemon.pokemon_name])
    if (!exists) {
      db.run('INSERT INTO initial_pokemon (pokemon_name, sort_order) VALUES (?, ?)', [pokemon.pokemon_name, pokemon.sort_order])
      inserted++
    }
  }
  console.log(`初始宝可梦导入完成，新增 ${inserted} 条记录`)
  
  db.save()
  console.log('=== 所有配置数据导入完成 ===')
}

if (require.main === module) {
  initConfigData().catch(err => console.error('导入失败:', err))
}

module.exports = { initConfigData }