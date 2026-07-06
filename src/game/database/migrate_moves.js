/**
 * 数据库迁移脚本 - 为 moves 表添加效果字段
 */

const fs = require('fs')
const path = require('path')
const initSqlJs = require('sql.js')

const DATA_DIR = path.join(__dirname, '..', '..', '..', 'data')
const DB_PATH = path.join(DATA_DIR, 'game.db')

async function migrate() {
  console.log('[迁移] 开始添加技能效果字段...')
  
  const SQL = await initSqlJs()
  const buffer = fs.readFileSync(DB_PATH)
  const db = new SQL.Database(buffer)
  
  // 添加新字段
  const newColumns = [
    'effect_type TEXT',
    'effect_target TEXT',
    'effect_stat TEXT',
    'effect_value INTEGER',
    'effect_duration INTEGER',
    'priority INTEGER',
    'hits INTEGER'
  ]
  
  for (const col of newColumns) {
    try {
      db.run(`ALTER TABLE moves ADD COLUMN ${col}`)
      console.log(`[迁移] 添加字段: ${col}`)
    } catch (e) {
      if (e.message.includes('duplicate column')) {
        console.log(`[迁移] 字段已存在: ${col}`)
      } else {
        console.error(`[迁移] 添加字段失败: ${col}`, e.message)
      }
    }
  }
  
  // 保存数据库
  const data = db.export()
  const newBuffer = Buffer.from(data)
  fs.writeFileSync(DB_PATH, newBuffer)
  
  db.close()
  
  console.log('[迁移] 迁移完成！')
}

migrate().catch(console.error)