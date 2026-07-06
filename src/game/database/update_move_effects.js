/**
 * 技能效果数据补充脚本
 * 为数据库中的技能添加结构化的效果数据
 */

const { database } = require('./dal')

// 常见技能效果数据
const MOVE_EFFECTS = {
  // 能力值变化类技能
  '叫声': { effect_type: 'stat_change', effect_target: 'opponent', effect_stat: 'attack', effect_value: -1, effect_chance: 100 },
  '瞪眼': { effect_type: 'stat_change', effect_target: 'opponent', effect_stat: 'defense', effect_value: -1, effect_chance: 100 },
  '摇尾巴': { effect_type: 'stat_change', effect_target: 'opponent', effect_stat: 'defense', effect_value: -1, effect_chance: 100 },
  '刺耳声': { effect_type: 'stat_change', effect_target: 'opponent', effect_stat: 'defense', effect_value: -2, effect_chance: 100 },
  '剑舞': { effect_type: 'stat_change', effect_target: 'self', effect_stat: 'attack', effect_value: 2, effect_chance: 100 },
  '瑜伽姿势': { effect_type: 'stat_change', effect_target: 'self', effect_stat: 'attack', effect_value: 1, effect_chance: 100 },
  '聚气': { effect_type: 'stat_change', effect_target: 'self', effect_stat: 'critical_rate', effect_value: 2, effect_chance: 100 },
  '变硬': { effect_type: 'stat_change', effect_target: 'self', effect_stat: 'defense', effect_value: 1, effect_chance: 100 },
  '缩入壳中': { effect_type: 'stat_change', effect_target: 'self', effect_stat: 'defense', effect_value: 1, effect_chance: 100 },
  '变圆': { effect_type: 'stat_change', effect_target: 'self', effect_stat: 'defense', effect_value: 1, effect_chance: 100 },
  '屏障': { effect_type: 'stat_change', effect_target: 'self', effect_stat: 'defense', effect_value: 2, effect_chance: 100 },
  '高速移动': { effect_type: 'stat_change', effect_target: 'self', effect_stat: 'speed', effect_value: 2, effect_chance: 100 },
  '影子分身': { effect_type: 'stat_change', effect_target: 'self', effect_stat: 'evasion', effect_value: 1, effect_chance: 100 },
  '变小': { effect_type: 'stat_change', effect_target: 'self', effect_stat: 'evasion', effect_value: 2, effect_chance: 100 },
  '生长': { effect_type: 'stat_change', effect_target: 'self', effect_stat: 'attack_sp_attack', effect_value: 1, effect_chance: 100 },
  '自我再生': { effect_type: 'heal', effect_target: 'self', effect_stat: 'hp', effect_value: 50, effect_chance: 100 },
  '光合作用': { effect_type: 'heal', effect_target: 'self', effect_stat: 'hp', effect_value: 50, effect_chance: 100 },
  '月光': { effect_type: 'heal', effect_target: 'self', effect_stat: 'hp', effect_value: 50, effect_chance: 100 },
  '晨光': { effect_type: 'heal', effect_target: 'self', effect_stat: 'hp', effect_value: 50, effect_chance: 100 },
  
  // 状态异常类技能
  '唱歌': { effect_type: 'status', effect_target: 'opponent', effect_stat: 'sleep', effect_value: 1, effect_chance: 100, effect_duration: 3 },
  '催眠术': { effect_type: 'status', effect_target: 'opponent', effect_stat: 'sleep', effect_value: 1, effect_chance: 100, effect_duration: 3 },
  '催眠粉': { effect_type: 'status', effect_target: 'opponent', effect_stat: 'sleep', effect_value: 1, effect_chance: 100, effect_duration: 3 },
  '毒粉': { effect_type: 'status', effect_target: 'opponent', effect_stat: 'poison', effect_value: 1, effect_chance: 100 },
  '剧毒': { effect_type: 'status', effect_target: 'opponent', effect_stat: 'bad_poison', effect_value: 1, effect_chance: 100 },
  '麻痹粉': { effect_type: 'status', effect_target: 'opponent', effect_stat: 'paralysis', effect_value: 1, effect_chance: 100 },
  '电磁波': { effect_type: 'status', effect_target: 'opponent', effect_stat: 'paralysis', effect_value: 1, effect_chance: 100 },
  '超音波': { effect_type: 'status', effect_target: 'opponent', effect_stat: 'confusion', effect_value: 1, effect_chance: 100, effect_duration: 3 },
  '奇异之光': { effect_type: 'status', effect_target: 'opponent', effect_stat: 'confusion', effect_value: 1, effect_chance: 100, effect_duration: 3 },
  
  // 带有附加效果的攻击技能
  '火焰拳': { effect_type: 'status', effect_target: 'opponent', effect_stat: 'burn', effect_value: 1, effect_chance: 10 },
  '冰冻拳': { effect_type: 'status', effect_target: 'opponent', effect_stat: 'freeze', effect_value: 1, effect_chance: 10 },
  '雷电拳': { effect_type: 'status', effect_target: 'opponent', effect_stat: 'paralysis', effect_value: 1, effect_chance: 10 },
  '火花': { effect_type: 'status', effect_target: 'opponent', effect_stat: 'burn', effect_value: 1, effect_chance: 10 },
  '喷射火焰': { effect_type: 'status', effect_target: 'opponent', effect_stat: 'burn', effect_value: 1, effect_chance: 10 },
  '大字爆炎': { effect_type: 'status', effect_target: 'opponent', effect_stat: 'burn', effect_value: 1, effect_chance: 10 },
  '冰冻光束': { effect_type: 'status', effect_target: 'opponent', effect_stat: 'freeze', effect_value: 1, effect_chance: 10 },
  '暴风雪': { effect_type: 'status', effect_target: 'opponent', effect_stat: 'freeze', effect_value: 1, effect_chance: 10 },
  '电击': { effect_type: 'status', effect_target: 'opponent', effect_stat: 'paralysis', effect_value: 1, effect_chance: 10 },
  '十万伏特': { effect_type: 'status', effect_target: 'opponent', effect_stat: 'paralysis', effect_value: 1, effect_chance: 10 },
  '打雷': { effect_type: 'status', effect_target: 'opponent', effect_stat: 'paralysis', effect_value: 1, effect_chance: 30 },
  '咬住': { effect_type: 'flinch', effect_target: 'opponent', effect_stat: 'flinch', effect_value: 1, effect_chance: 30 },
  '头锤': { effect_type: 'flinch', effect_target: 'opponent', effect_stat: 'flinch', effect_value: 1, effect_chance: 30 },
  '踩踏': { effect_type: 'flinch', effect_target: 'opponent', effect_stat: 'flinch', effect_value: 1, effect_chance: 30 },
  '泰山压顶': { effect_type: 'status', effect_target: 'opponent', effect_stat: 'paralysis', effect_value: 1, effect_chance: 30 },
  '毒针': { effect_type: 'status', effect_target: 'opponent', effect_stat: 'poison', effect_value: 1, effect_chance: 30 },
  '溶解液': { effect_type: 'stat_change', effect_target: 'opponent', effect_stat: 'sp_defense', effect_value: -1, effect_chance: 10 },
  '念力': { effect_type: 'stat_change', effect_target: 'opponent', effect_stat: 'sp_defense', effect_value: -1, effect_chance: 10 },
  '精神强念': { effect_type: 'stat_change', effect_target: 'opponent', effect_stat: 'sp_defense', effect_value: -1, effect_chance: 10 },
  '泡沫光线': { effect_type: 'stat_change', effect_target: 'opponent', effect_stat: 'speed', effect_value: -1, effect_chance: 10 },
  '极光束': { effect_type: 'stat_change', effect_target: 'opponent', effect_stat: 'attack', effect_value: -1, effect_chance: 10 },
  '幻象光线': { effect_type: 'status', effect_target: 'opponent', effect_stat: 'confusion', effect_value: 1, effect_chance: 10 },
  '舌舔': { effect_type: 'status', effect_target: 'opponent', effect_stat: 'paralysis', effect_value: 1, effect_chance: 30 },
  '浊雾': { effect_type: 'status', effect_target: 'opponent', effect_stat: 'poison', effect_value: 1, effect_chance: 40 },
  '污泥攻击': { effect_type: 'status', effect_target: 'opponent', effect_stat: 'poison', effect_value: 1, effect_chance: 30 },
  '骨棒': { effect_type: 'flinch', effect_target: 'opponent', effect_stat: 'flinch', effect_value: 1, effect_chance: 10 },
  '攀瀑': { effect_type: 'flinch', effect_target: 'opponent', effect_stat: 'flinch', effect_value: 1, effect_chance: 20 },
  '泼沙': { effect_type: 'stat_change', effect_target: 'opponent', effect_stat: 'accuracy', effect_value: -1, effect_chance: 100 },
  '烟幕': { effect_type: 'stat_change', effect_target: 'opponent', effect_stat: 'accuracy', effect_value: -1, effect_chance: 100 },
  '闪光': { effect_type: 'stat_change', effect_target: 'opponent', effect_stat: 'accuracy', effect_value: -1, effect_chance: 100 },
  '吐丝': { effect_type: 'stat_change', effect_target: 'opponent', effect_stat: 'speed', effect_value: -2, effect_chance: 100 },
  '寄生种子': { effect_type: 'drain', effect_target: 'opponent', effect_stat: 'hp', effect_value: 8, effect_chance: 100 },
  '吸取': { effect_type: 'drain', effect_target: 'opponent', effect_stat: 'hp', effect_value: 50, effect_chance: 100 },
  '超级吸取': { effect_type: 'drain', effect_target: 'opponent', effect_stat: 'hp', effect_value: 50, effect_chance: 100 },
  '终极吸取': { effect_type: 'drain', effect_target: 'opponent', effect_stat: 'hp', effect_value: 75, effect_chance: 100 },
  
  // 连击类技能
  '连环巴掌': { effect_type: 'multi_hit', effect_target: 'opponent', effect_stat: 'hits', effect_value: 0, effect_chance: 100, hits: [2, 5] },
  '连续拳': { effect_type: 'multi_hit', effect_target: 'opponent', effect_stat: 'hits', effect_value: 0, effect_chance: 100, hits: [2, 5] },
  '飞弹针': { effect_type: 'multi_hit', effect_target: 'opponent', effect_stat: 'hits', effect_value: 0, effect_chance: 100, hits: [2, 5] },
  '乱击': { effect_type: 'multi_hit', effect_target: 'opponent', effect_stat: 'hits', effect_value: 0, effect_chance: 100, hits: [2, 5] },
  '尖刺加农炮': { effect_type: 'multi_hit', effect_target: 'opponent', effect_stat: 'hits', effect_value: 0, effect_chance: 100, hits: [2, 5] },
  '二连踢': { effect_type: 'multi_hit', effect_target: 'opponent', effect_stat: 'hits', effect_value: 2, effect_chance: 100 },
  '双针': { effect_type: 'multi_hit', effect_target: 'opponent', effect_stat: 'hits', effect_value: 2, effect_chance: 100 },
  
  // 先制技能
  '电光一闪': { effect_type: 'priority', effect_target: 'self', effect_stat: 'priority', effect_value: 1, effect_chance: 100 },
  '神速': { effect_type: 'priority', effect_target: 'self', effect_stat: 'priority', effect_value: 2, effect_chance: 100 },
  
  // 反击类技能
  '双倍奉还': { effect_type: 'counter', effect_target: 'opponent', effect_stat: 'damage', effect_value: 2, effect_chance: 100 },
  '忍耐': { effect_type: 'counter', effect_target: 'opponent', effect_stat: 'damage', effect_value: 2, effect_chance: 100 },
  
  // 一击必杀类
  '极落钳': { effect_type: 'ohko', effect_target: 'opponent', effect_stat: 'faint', effect_value: 1, effect_chance: 30 },
  '角钻': { effect_type: 'ohko', effect_target: 'opponent', effect_stat: 'faint', effect_value: 1, effect_chance: 30 },
  '地裂': { effect_type: 'ohko', effect_target: 'opponent', effect_stat: 'faint', effect_value: 1, effect_chance: 30 },
  
  // 固定伤害类
  '龙之怒': { effect_type: 'fixed_damage', effect_target: 'opponent', effect_stat: 'damage', effect_value: 40, effect_chance: 100 },
  '音爆': { effect_type: 'fixed_damage', effect_target: 'opponent', effect_stat: 'damage', effect_value: 20, effect_chance: 100 },
  '黑夜魔影': { effect_type: 'level_damage', effect_target: 'opponent', effect_stat: 'damage', effect_value: 0, effect_chance: 100 },
  '地球上投': { effect_type: 'level_damage', effect_target: 'opponent', effect_stat: 'damage', effect_value: 0, effect_chance: 100 },
  
  // 场地效果类
  '光墙': { effect_type: 'field', effect_target: 'team', effect_stat: 'sp_defense_boost', effect_value: 50, effect_chance: 100, effect_duration: 5 },
  '反射壁': { effect_type: 'field', effect_target: 'team', effect_stat: 'defense_boost', effect_value: 50, effect_chance: 100, effect_duration: 5 },
  '白雾': { effect_type: 'field', effect_target: 'team', effect_stat: 'stat_protect', effect_value: 1, effect_chance: 100, effect_duration: 5 },
  '黑雾': { effect_type: 'field', effect_target: 'all', effect_stat: 'stat_reset', effect_value: 1, effect_chance: 100 },
  '大晴天': { effect_type: 'weather', effect_target: 'field', effect_stat: 'sun', effect_value: 1, effect_chance: 100, effect_duration: 5 },
  '下雨': { effect_type: 'weather', effect_target: 'field', effect_stat: 'rain', effect_value: 1, effect_chance: 100, effect_duration: 5 },
  '沙暴': { effect_type: 'weather', effect_target: 'field', effect_stat: 'sandstorm', effect_value: 1, effect_chance: 100, effect_duration: 5 },
  '冰雹': { effect_type: 'weather', effect_target: 'field', effect_stat: 'hail', effect_value: 1, effect_chance: 100, effect_duration: 5 },
  
  // 保护类
  '守住': { effect_type: 'protect', effect_target: 'self', effect_stat: 'protect', effect_value: 1, effect_chance: 100 },
  '挺住': { effect_type: 'protect', effect_target: 'self', effect_stat: 'endure', effect_value: 1, effect_chance: 100 },
  '看穿': { effect_type: 'protect', effect_target: 'self', effect_stat: 'protect', effect_value: 1, effect_chance: 100 },
  
  // 束缚类
  '绑紧': { effect_type: 'trap', effect_target: 'opponent', effect_stat: 'trap', effect_value: 1, effect_chance: 100, effect_duration: [4, 5] },
  '紧束': { effect_type: 'trap', effect_target: 'opponent', effect_stat: 'trap', effect_value: 1, effect_chance: 100, effect_duration: [4, 5] },
  '火焰旋涡': { effect_type: 'trap', effect_target: 'opponent', effect_stat: 'trap', effect_value: 1, effect_chance: 100, effect_duration: [4, 5] },
  '贝壳夹击': { effect_type: 'trap', effect_target: 'opponent', effect_stat: 'trap', effect_value: 1, effect_chance: 100, effect_duration: [4, 5] },
  
  // 强制替换类
  '吼叫': { effect_type: 'force_switch', effect_target: 'opponent', effect_stat: 'switch', effect_value: 1, effect_chance: 100 },
  '吹飞': { effect_type: 'force_switch', effect_target: 'opponent', effect_stat: 'switch', effect_value: 1, effect_chance: 100 },
  
  // 提升威力类
  '猛撞': { effect_type: 'recoil', effect_target: 'self', effect_stat: 'recoil', effect_value: 25, effect_chance: 100 },
  '舍身冲撞': { effect_type: 'recoil', effect_target: 'self', effect_stat: 'recoil', effect_value: 33, effect_chance: 100 },
  '飞踢': { effect_type: 'recoil', effect_target: 'self', effect_stat: 'recoil', effect_value: 50, effect_chance: 100 },
  '破坏光线': { effect_type: 'recharge', effect_target: 'self', effect_stat: 'recharge', effect_value: 1, effect_chance: 100 },
  
  // 必中类
  '高速星星': { effect_type: 'always_hit', effect_target: 'self', effect_stat: 'accuracy', effect_value: 0, effect_chance: 100 },
  '魔法叶': { effect_type: 'always_hit', effect_target: 'self', effect_stat: 'accuracy', effect_value: 0, effect_chance: 100 },
}

async function updateMoveEffects() {
  console.log('[效果] 开始更新技能效果数据...')
  
  await database.init()
  
  let updatedCount = 0
  let skippedCount = 0
  
  for (const [moveName, effectData] of Object.entries(MOVE_EFFECTS)) {
    try {
      const move = database.get('SELECT id FROM moves WHERE name = ?', [moveName])
      if (!move) {
        console.log(`[效果] 未找到技能: ${moveName}`)
        skippedCount++
        continue
      }
      
      database.db.run(`
        UPDATE moves SET
          effect_type = ?,
          effect_target = ?,
          effect_stat = ?,
          effect_value = ?,
          effect_duration = ?,
          effect_chance = ?
        WHERE id = ?
      `, [
        effectData.effect_type || null,
        effectData.effect_target || null,
        effectData.effect_stat || null,
        effectData.effect_value || null,
        effectData.effect_duration || null,
        effectData.effect_chance || 100,
        move.id
      ])
      
      updatedCount++
    } catch (e) {
      console.error(`[效果] 更新技能 "${moveName}" 失败:`, e.message)
    }
  }
  
  database.save()
  
  console.log(`\n[效果] === 更新统计 ===`)
  console.log(`[效果] 更新成功: ${updatedCount}`)
  console.log(`[效果] 跳过: ${skippedCount}`)
  console.log(`[效果] === 完成 ===`)
  
  // 显示几个示例
  console.log('\n[效果] 示例数据:')
  const examples = ['叫声', '剑舞', '火焰拳', '唱歌', '连环巴掌']
  for (const name of examples) {
    const move = database.get('SELECT name, effect_type, effect_target, effect_stat, effect_value, effect_chance FROM moves WHERE name = ?', [name])
    if (move) {
      console.log(`  ${move.name}: ${move.effect_type} -> ${move.effect_target} ${move.effect_stat} ${move.effect_value} (${move.effect_chance}%)`)
    }
  }
  
  database.close()
}

updateMoveEffects().catch(console.error)