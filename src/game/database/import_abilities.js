/**
 * 特性数据导入脚本
 * 将本地特性数据导入数据库
 */

const fs = require('fs')
const path = require('path')
const database = require('./db')

async function importAbilities() {
  console.log('[特性导入] 开始导入特性数据...')
  
  await database.init()
  
  // 创建特性表
  database.db.run(`
    CREATE TABLE IF NOT EXISTS abilities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      english_name TEXT,
      japanese_name TEXT,
      description TEXT,
      effect TEXT,
      generation INTEGER DEFAULT 1,
      is_hidden INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  database.db.run(`CREATE INDEX IF NOT EXISTS idx_abilities_name ON abilities(name)`)
  
  // 读取特性数据文件
  const abilitiesPath = path.join(__dirname, '..', '..', '..', 'data', 'abilities.json')
  const abilitiesData = JSON.parse(fs.readFileSync(abilitiesPath, 'utf8'))

  console.log(`[特性导入] 发现 ${abilitiesData.length} 个特性数据`)
  
  // 导入特性数据
  let importedCount = 0
  let skippedCount = 0
  
  abilitiesData.forEach(ability => {
    try {
      // 先检查是否已存在
      const existing = database.get('SELECT id FROM abilities WHERE name = ?', [ability.name])
      
      if (existing) {
        // 更新现有数据
        database.db.run(`
          UPDATE abilities SET
            english_name = ?,
            japanese_name = ?,
            description = ?,
            generation = ?
          WHERE name = ?
        `, [
          ability.englishName,
          ability.japaneseName,
          ability.description,
          ability.generation || 1,
          ability.name
        ])
        skippedCount++
        console.log(`[特性导入] 更新: ${ability.name}`)
      } else {
        // 插入新数据
        database.db.run(`
          INSERT INTO abilities (name, english_name, japanese_name, description, generation)
          VALUES (?, ?, ?, ?, ?)
        `, [
          ability.name,
          ability.englishName,
          ability.japaneseName,
          ability.description,
          ability.generation || 1
        ])
        importedCount++
        console.log(`[特性导入] 导入: ${ability.name}`)
      }
    } catch (e) {
      console.error(`[特性导入] 导入失败 ${ability.name}:`, e.message)
    }
  })
  
  database.save()
  
  console.log(`\n[特性导入] === 导入统计 ===`)
  console.log(`[特性导入] 总发现: ${abilitiesData.length}`)
  console.log(`[特性导入] 成功导入: ${importedCount}`)
  console.log(`[特性导入] 更新已有: ${skippedCount}`)
  console.log(`[特性导入] === 完成 ===`)
  
  // 显示导入的特性列表
  const abilities = database.all('SELECT id, name FROM abilities ORDER BY name LIMIT 20')
  console.log('\n[特性导入] 特性列表 (前20条):')
  console.table(abilities)
  
  database.close()
}

importAbilities().catch(console.error)