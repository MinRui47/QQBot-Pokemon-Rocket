/**
 * 技能效果爬虫脚本
 * 从 52poke.com 爬取技能效果数据并更新到数据库
 */

const https = require('https')
const { database } = require('./dal')

// 技能列表页面（各世代）
const GENERATION_PAGES = [
  'https://wiki.52poke.com/wiki/%E6%8B%9B%E5%BC%8F%E5%88%97%E8%A1%A8%EF%BC%88%E7%AC%AC%E4%B8%80%E4%B8%96%E4%BB%A3%EF%BC%89',
  'https://wiki.52poke.com/wiki/%E6%8B%9B%E5%BC%8F%E5%88%97%E8%A1%A8%EF%BC%88%E7%AC%AC%E4%BA%8C%E4%B8%96%E4%BB%A3%EF%BC%89',
  'https://wiki.52poke.com/wiki/%E6%8B%9B%E5%BC%8F%E5%88%97%E8%A1%A8%EF%BC%88%E7%AC%AC%E4%B8%89%E4%B8%96%E4%BB%A3%EF%BC%89',
  'https://wiki.52poke.com/wiki/%E6%8B%9B%E5%BC%8F%E5%88%97%E8%A1%A8%EF%BC%88%E7%AC%AC%E5%9B%9B%E4%B8%96%E4%BB%A3%EF%BC%89',
  'https://wiki.52poke.com/wiki/%E6%8B%9B%E5%BC%8F%E5%88%97%E8%A1%A8%EF%BC%88%E7%AC%AC%E4%BA%94%E4%B8%96%E4%BB%A3%EF%BC%89',
  'https://wiki.52poke.com/wiki/%E6%8B%9B%E5%BC%8F%E5%88%97%E8%A1%A8%EF%BC%88%E7%AC%AC%E5%85%AD%E4%B8%96%E4%BB%A3%EF%BC%89',
  'https://wiki.52poke.com/wiki/%E6%8B%9B%E5%BC%8F%E5%88%97%E8%A1%A8%EF%BC%88%E7%AC%AC%E4%B8%83%E4%B8%96%E4%BB%A3%EF%BC%89',
  'https://wiki.52poke.com/wiki/%E6%8B%9B%E5%BC%8F%E5%88%97%E8%A1%A8%EF%BC%88%E7%AC%AC%E5%85%AB%E4%B8%96%E4%BB%A3%EF%BC%89',
  'https://wiki.52poke.com/wiki/%E6%8B%9B%E5%BC%8F%E5%88%97%E8%A1%A8%EF%BC%88%E7%AC%AC%E4%B9%9D%E4%B8%96%E4%BB%A3%EF%BC%89'
]

// 已处理的技能（避免重复）
const processedMoves = new Set()

// HTTP请求封装
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve(data))
    }).on('error', reject)
  })
}

// 从列表页面提取技能链接
function extractMoveLinks(html) {
  const links = []
  // 匹配技能链接格式：/wiki/技能名
  const regex = /href="\/wiki\/([^"]+)"[^>]*>([^<]+)<\/a>/g
  let match
  
  while ((match = regex.exec(html)) !== null) {
    const [, encodedName, name] = match
    // 过滤掉非技能链接（如分类、属性等）
    if (name && !name.includes('（') && !name.includes('招式') && !name.includes('世代')) {
      links.push({
        name: name.trim(),
        url: `https://wiki.52poke.com/wiki/${encodedName}`
      })
    }
  }
  
  return links
}

// 从技能页面提取效果描述
function extractMoveEffect(html) {
  let effect = ''
  let description = ''
  
  // 提取"招式附加效果"部分
  const effectMatch = html.match(/招式附加效果[\s\S]*?<\/h2>([\s\S]*?)<h2>/)
  if (effectMatch) {
    effect = effectMatch[1]
      .replace(/<[^>]+>/g, '') // 移除HTML标签
      .replace(/\s+/g, ' ') // 合并空白字符
      .trim()
  }
  
  // 提取"招式说明"部分
  const descMatch = html.match(/招式说明[\s\S]*?<\/h2>([\s\S]*?)<h2>/)
  if (descMatch) {
    description = descMatch[1]
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }
  
  // 如果没有找到，尝试从页面开头提取描述
  if (!description) {
    const descMatch2 = html.match(/<p>([^<]{20,200})<\/p>/)
    if (descMatch2) {
      description = descMatch2[1].trim()
    }
  }
  
  return {
    effect: effect || description,
    description: description
  }
}

// 解析效果描述为结构化数据
function parseEffectToStructured(effectText) {
  const result = {
    effect_type: null,
    effect_target: null,
    effect_stat: null,
    effect_value: null,
    effect_chance: null,
    effect_duration: null
  }
  
  if (!effectText) return result
  
  const text = effectText.toLowerCase()
  
  // 状态异常
  if (text.includes('灼伤') || text.includes('烧伤')) {
    result.effect_type = 'status'
    result.effect_target = 'opponent'
    result.effect_stat = 'burn'
    result.effect_chance = extractChance(text)
  } else if (text.includes('冰冻') || text.includes('冻结')) {
    result.effect_type = 'status'
    result.effect_target = 'opponent'
    result.effect_stat = 'freeze'
    result.effect_chance = extractChance(text)
  } else if (text.includes('麻痹')) {
    result.effect_type = 'status'
    result.effect_target = 'opponent'
    result.effect_stat = 'paralysis'
    result.effect_chance = extractChance(text)
  } else if (text.includes('睡眠') || text.includes('入睡')) {
    result.effect_type = 'status'
    result.effect_target = 'opponent'
    result.effect_stat = 'sleep'
    result.effect_chance = extractChance(text)
    result.effect_duration = 3
  } else if (text.includes('中毒') || text.includes('剧毒')) {
    result.effect_type = 'status'
    result.effect_target = 'opponent'
    result.effect_stat = text.includes('剧毒') ? 'bad_poison' : 'poison'
    result.effect_chance = extractChance(text)
  } else if (text.includes('混乱')) {
    result.effect_type = 'status'
    result.effect_target = 'opponent'
    result.effect_stat = 'confusion'
    result.effect_chance = extractChance(text)
    result.effect_duration = 3
  }
  
  // 能力值变化
  else if (text.includes('降低') || text.includes('下降')) {
    result.effect_type = 'stat_change'
    result.effect_target = 'opponent'
    result.effect_stat = extractStat(text)
    result.effect_value = extractStatChange(text)
    result.effect_chance = extractChance(text) || 100
  } else if (text.includes('提升') || text.includes('上升') || text.includes('提高')) {
    result.effect_type = 'stat_change'
    result.effect_target = 'self'
    result.effect_stat = extractStat(text)
    result.effect_value = extractStatChange(text)
    result.effect_chance = extractChance(text) || 100
  }
  
  // 治疗类
  else if (text.includes('回复') || text.includes('恢复') || text.includes('治愈')) {
    result.effect_type = 'heal'
    result.effect_target = 'self'
    result.effect_stat = 'hp'
    result.effect_value = extractHealValue(text)
    result.effect_chance = 100
  }
  
  // 吸血类
  else if (text.includes('吸取') || text.includes('吸血')) {
    result.effect_type = 'drain'
    result.effect_target = 'opponent'
    result.effect_stat = 'hp'
    result.effect_value = extractDrainValue(text)
    result.effect_chance = 100
  }
  
  // 连击类
  else if (text.includes('连续') || text.includes('多次')) {
    result.effect_type = 'multi_hit'
    result.effect_target = 'opponent'
    result.effect_stat = 'hits'
    result.effect_value = extractHitCount(text)
    result.effect_chance = 100
  }
  
  // 畏缩
  else if (text.includes('畏缩') || text.includes('退缩')) {
    result.effect_type = 'flinch'
    result.effect_target = 'opponent'
    result.effect_stat = 'flinch'
    result.effect_value = 1
    result.effect_chance = extractChance(text)
  }
  
  // 反作用力
  else if (text.includes('反作用力') || text.includes(' recoil')) {
    result.effect_type = 'recoil'
    result.effect_target = 'self'
    result.effect_stat = 'recoil'
    result.effect_value = extractRecoilValue(text)
    result.effect_chance = 100
  }
  
  // 优先度
  else if (text.includes('先制') || text.includes('优先')) {
    result.effect_type = 'priority'
    result.effect_target = 'self'
    result.effect_stat = 'priority'
    result.effect_value = extractPriority(text)
    result.effect_chance = 100
  }
  
  // 固定伤害
  else if (text.includes('固定') || text.includes('一定')) {
    result.effect_type = 'fixed_damage'
    result.effect_target = 'opponent'
    result.effect_stat = 'damage'
    result.effect_value = extractFixedDamage(text)
    result.effect_chance = 100
  }
  
  return result
}

// 辅助函数：提取概率
function extractChance(text) {
  const match = text.match(/(\d+)%|(\d+)成|(\d+)分之(\d+)/)
  if (match) {
    if (match[1]) return parseInt(match[1])
    if (match[2]) return parseInt(match[2]) * 10
    if (match[3] && match[4]) return Math.floor((parseInt(match[4]) / parseInt(match[3])) * 100)
  }
  return null
}

// 辅助函数：提取能力值
function extractStat(text) {
  if (text.includes('攻击') && !text.includes('特攻')) return 'attack'
  if (text.includes('防御') && !text.includes('特防')) return 'defense'
  if (text.includes('特攻')) return 'sp_attack'
  if (text.includes('特防')) return 'sp_defense'
  if (text.includes('速度')) return 'speed'
  if (text.includes('命中') || text.includes('准确')) return 'accuracy'
  if (text.includes('回避') || text.includes('闪避')) return 'evasion'
  return null
}

// 辅助函数：提取能力值变化
function extractStatChange(text) {
  if (text.includes('大幅') || text.includes('2级')) return -2
  if (text.includes('1级')) return -1
  return -1
}

// 辅助函数：提取治疗值
function extractHealValue(text) {
  const match = text.match(/(\d+)%|最大?HP/)
  if (match) {
    if (match[1]) return parseInt(match[1])
    return 100
  }
  return 50
}

// 辅助函数：提取吸血值
function extractDrainValue(text) {
  const match = text.match(/(\d+)%/)
  if (match) return parseInt(match[1])
  return 50
}

// 辅助函数：提取连击次数
function extractHitCount(text) {
  if (text.includes('2-5')) return 0 // 表示随机2-5次
  const match = text.match(/(\d+)次/)
  if (match) return parseInt(match[1])
  return 0
}

// 辅助函数：提取反作用力
function extractRecoilValue(text) {
  const match = text.match(/(\d+)%/)
  if (match) return parseInt(match[1])
  return 25
}

// 辅助函数：提取优先度
function extractPriority(text) {
  const match = text.match(/(\+?\-?\d+)/)
  if (match) return parseInt(match[1])
  return 1
}

// 辅助函数：提取固定伤害
function extractFixedDamage(text) {
  const match = text.match(/(\d+)/)
  if (match) return parseInt(match[1])
  return 40
}

// 主函数
async function crawlMoveEffects() {
  console.log('[爬虫] 开始爬取技能效果数据...')
  
  await database.init()
  
  let totalProcessed = 0
  let totalUpdated = 0
  let totalErrors = 0
  
  // 先获取数据库中已有的技能
  const existingMoves = database.all('SELECT name FROM moves')
  const existingMoveNames = new Set(existingMoves.map(m => m.name))
  
  console.log(`[爬虫] 数据库中已有 ${existingMoveNames.size} 个技能`)
  
  // 遍历各世代页面
  for (const genPage of GENERATION_PAGES) {
    console.log(`\n[爬虫] 处理世代页面: ${genPage}`)
    
    try {
      const html = await fetchUrl(genPage)
      const moveLinks = extractMoveLinks(html)
      
      console.log(`[爬虫] 发现 ${moveLinks.length} 个技能链接`)
      
      // 处理每个技能
      for (const move of moveLinks) {
        // 跳过已处理的技能
        if (processedMoves.has(move.name)) continue
        if (!existingMoveNames.has(move.name)) continue
        
        processedMoves.add(move.name)
        totalProcessed++
        
        try {
          console.log(`  [${totalProcessed}/${existingMoveNames.size}] 获取: ${move.name}`)
          
          const moveHtml = await fetchUrl(move.url)
          const { effect, description } = extractMoveEffect(moveHtml)
          
          // 解析为结构化数据
          const structured = parseEffectToStructured(effect)
          
          // 更新数据库
          database.db.run(`
            UPDATE moves SET
              effect = ?,
              effect_type = ?,
              effect_target = ?,
              effect_stat = ?,
              effect_value = ?,
              effect_chance = ?,
              effect_duration = ?
            WHERE name = ?
          `, [
            effect || description,
            structured.effect_type,
            structured.effect_target,
            structured.effect_stat,
            structured.effect_value,
            structured.effect_chance,
            structured.effect_duration,
            move.name
          ])
          
          totalUpdated++
          
          // 延迟避免请求过快
          await new Promise(resolve => setTimeout(resolve, 200))
          
        } catch (e) {
          console.error(`    错误: ${e.message}`)
          totalErrors++
        }
      }
      
      database.save()
      
    } catch (e) {
      console.error(`[爬虫] 世代页面处理失败: ${e.message}`)
    }
  }
  
  console.log(`\n[爬虫] === 爬取统计 ===`)
  console.log(`[爬虫] 总处理: ${totalProcessed}`)
  console.log(`[爬虫] 成功更新: ${totalUpdated}`)
  console.log(`[爬虫] 错误: ${totalErrors}`)
  console.log(`[爬虫] === 完成 ===`)
  
  // 显示示例
  console.log('\n[爬虫] 示例数据:')
  const samples = database.all('SELECT name, effect_type, effect_target, effect_stat, effect_value, effect_chance FROM moves WHERE effect_type IS NOT NULL LIMIT 5')
  console.table(samples)
  
  database.close()
}

crawlMoveEffects().catch(console.error)