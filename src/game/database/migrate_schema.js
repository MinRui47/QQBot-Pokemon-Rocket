/**
 * 数据库结构迁移脚本：同步代码与数据库结构
 * 根据最新的代码需求，更新数据库表结构
 */

const db = require('./db')

async function migrateSchema() {
  console.log('[迁移] 开始同步数据库结构...')
  
  await db.init()
  
  let changes = 0
  
  console.log('\n=== 1. 检查并添加 abilities 表 ===')
  try {
    const result = db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='abilities'")
    if (result.length === 0) {
      db.run(`
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
      db.run(`CREATE INDEX IF NOT EXISTS idx_abilities_name ON abilities(name)`)
      console.log('[迁移] abilities 表已创建')
      changes++
    } else {
      console.log('[迁移] abilities 表已存在')
    }
  } catch (e) {
    console.error('[迁移] 创建 abilities 表失败:', e.message)
  }
  
  console.log('\n=== 2. 检查并添加 moves 表的效果字段 ===')
  const moveColumns = [
    'effect_type TEXT',
    'effect_target TEXT',
    'effect_stat TEXT',
    'effect_value INTEGER',
    'effect_duration INTEGER',
    'priority INTEGER',
    'hits INTEGER'
  ]
  
  for (const col of moveColumns) {
    try {
      db.run(`ALTER TABLE moves ADD COLUMN ${col}`)
      console.log(`[迁移] moves 表添加字段: ${col}`)
      changes++
    } catch (e) {
      if (e.message && e.message.includes('duplicate column')) {
        console.log(`[迁移] moves 表字段已存在: ${col}`)
      } else {
        console.error(`[迁移] moves 表添加字段失败: ${col}`, e.message)
      }
    }
  }
  
  console.log('\n=== 3. 检查并添加 pokemons 表的 growth_rate 字段 ===')
  try {
    db.run(`ALTER TABLE pokemons ADD COLUMN growth_rate TEXT DEFAULT 'medium'`)
    console.log('[迁移] pokemons 表添加字段: growth_rate')
    changes++
  } catch (e) {
    if (e.message && e.message.includes('duplicate column')) {
      console.log('[迁移] pokemons 表字段已存在: growth_rate')
    } else {
      console.error('[迁移] pokemons 表添加字段失败:', e.message)
    }
  }
  
  console.log('\n=== 4. 检查并添加 personal_pokemon 表的 is_initial 和 is_rented 字段 ===')
  const ppColumns = [
    'is_initial INTEGER DEFAULT 0',
    'is_rented INTEGER DEFAULT 0'
  ]
  
  for (const col of ppColumns) {
    try {
      db.run(`ALTER TABLE personal_pokemon ADD COLUMN ${col}`)
      console.log(`[迁移] personal_pokemon 表添加字段: ${col}`)
      changes++
    } catch (e) {
      if (e.message && e.message.includes('duplicate column')) {
        console.log(`[迁移] personal_pokemon 表字段已存在: ${col}`)
      } else {
        console.error(`[迁移] personal_pokemon 表添加字段失败: ${col}`, e.message)
      }
    }
  }
  
  console.log('\n=== 5. 检查并添加 map_instances 表 ===')
  try {
    const result = db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='map_instances'")
    if (result.length === 0) {
      db.run(`
        CREATE TABLE IF NOT EXISTS map_instances (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          map_tier TEXT NOT NULL,
          current_location TEXT NOT NULL,
          current_building TEXT,
          current_floor INTEGER DEFAULT 0,
          explored_locations TEXT DEFAULT '[]',
          explored_features TEXT DEFAULT '[]',
          visited_points TEXT DEFAULT '[]',
          state TEXT DEFAULT 'active',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id)
        )
      `)
      db.run(`CREATE INDEX IF NOT EXISTS idx_mi_user ON map_instances(user_id)`)
      db.run(`CREATE INDEX IF NOT EXISTS idx_mi_state ON map_instances(state)`)
      console.log('[迁移] map_instances 表已创建')
      changes++
    } else {
      console.log('[迁移] map_instances 表已存在')
    }
  } catch (e) {
    console.error('[迁移] 创建 map_instances 表失败:', e.message)
  }
  
  console.log('\n=== 6. 检查并添加 map_locations_state 表 ===')
  try {
    const result = db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='map_locations_state'")
    if (result.length === 0) {
      db.run(`
        CREATE TABLE IF NOT EXISTS map_locations_state (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          instance_id INTEGER,
          location_name TEXT NOT NULL,
          feature_name TEXT NOT NULL,
          is_searched INTEGER DEFAULT 0,
          searched_at TEXT,
          FOREIGN KEY (instance_id) REFERENCES map_instances(id)
        )
      `)
      db.run(`CREATE INDEX IF NOT EXISTS idx_mls_instance ON map_locations_state(instance_id)`)
      db.run(`CREATE INDEX IF NOT EXISTS idx_mls_location ON map_locations_state(location_name)`)
      console.log('[迁移] map_locations_state 表已创建')
      changes++
    } else {
      console.log('[迁移] map_locations_state 表已存在')
    }
  } catch (e) {
    console.error('[迁移] 创建 map_locations_state 表失败:', e.message)
  }
  
  console.log('\n=== 7. 检查并添加 map_dropped_items 表 ===')
  try {
    const result = db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='map_dropped_items'")
    if (result.length === 0) {
      db.run(`
        CREATE TABLE IF NOT EXISTS map_dropped_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          instance_id INTEGER,
          location_name TEXT NOT NULL,
          item_name TEXT NOT NULL,
          quantity INTEGER DEFAULT 1,
          item_data TEXT DEFAULT '{}',
          dropped_at TEXT DEFAULT CURRENT_TIMESTAMP,
          is_picked INTEGER DEFAULT 0,
          picked_at TEXT,
          FOREIGN KEY (instance_id) REFERENCES map_instances(id)
        )
      `)
      db.run(`CREATE INDEX IF NOT EXISTS idx_mdi_instance ON map_dropped_items(instance_id)`)
      db.run(`CREATE INDEX IF NOT EXISTS idx_mdi_location ON map_dropped_items(location_name)`)
      db.run(`CREATE INDEX IF NOT EXISTS idx_mdi_picked ON map_dropped_items(is_picked)`)
      console.log('[迁移] map_dropped_items 表已创建')
      changes++
    } else {
      console.log('[迁移] map_dropped_items 表已存在')
    }
  } catch (e) {
    console.error('[迁移] 创建 map_dropped_items 表失败:', e.message)
  }
  
  console.log('\n=== 8. 检查并添加 map_trainers 表 ===')
  try {
    const result = db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='map_trainers'")
    if (result.length === 0) {
      db.run(`
        CREATE TABLE IF NOT EXISTS map_trainers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          instance_id INTEGER,
          location_name TEXT NOT NULL,
          trainer_name TEXT NOT NULL,
          trainer_title TEXT,
          is_defeated INTEGER DEFAULT 0,
          defeated_at TEXT,
          trainer_data TEXT DEFAULT '{}',
          FOREIGN KEY (instance_id) REFERENCES map_instances(id),
          UNIQUE(instance_id, location_name, trainer_name)
        )
      `)
      db.run(`CREATE INDEX IF NOT EXISTS idx_mt_instance ON map_trainers(instance_id)`)
      db.run(`CREATE INDEX IF NOT EXISTS idx_mt_location ON map_trainers(location_name)`)
      db.run(`CREATE INDEX IF NOT EXISTS idx_mt_defeated ON map_trainers(is_defeated)`)
      console.log('[迁移] map_trainers 表已创建')
      changes++
    } else {
      console.log('[迁移] map_trainers 表已存在')
    }
  } catch (e) {
    console.error('[迁移] 创建 map_trainers 表失败:', e.message)
  }
  
  console.log('\n=== 9. 检查并添加 map_wild_encounters 表 ===')
  try {
    const result = db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='map_wild_encounters'")
    if (result.length === 0) {
      db.run(`
        CREATE TABLE IF NOT EXISTS map_wild_encounters (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          instance_id INTEGER,
          location_name TEXT NOT NULL,
          pokemon_name TEXT NOT NULL,
          level INTEGER NOT NULL,
          is_defeated INTEGER DEFAULT 0,
          defeated_at TEXT,
          flee_at TEXT,
          FOREIGN KEY (instance_id) REFERENCES map_instances(id)
        )
      `)
      db.run(`CREATE INDEX IF NOT EXISTS idx_mwe_instance ON map_wild_encounters(instance_id)`)
      db.run(`CREATE INDEX IF NOT EXISTS idx_mwe_location ON map_wild_encounters(location_name)`)
      console.log('[迁移] map_wild_encounters 表已创建')
      changes++
    } else {
      console.log('[迁移] map_wild_encounters 表已存在')
    }
  } catch (e) {
    console.error('[迁移] 创建 map_wild_encounters 表失败:', e.message)
  }
  
  console.log('\n=== 10. 检查并添加 map_config 表 ===')
  try {
    const result = db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='map_config'")
    if (result.length === 0) {
      db.run(`
        CREATE TABLE IF NOT EXISTS map_config (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          map_name TEXT UNIQUE NOT NULL,
          difficulty TEXT DEFAULT '简单',
          steps_min INTEGER DEFAULT 30,
          steps_max INTEGER DEFAULT 45,
          encounter_rate REAL DEFAULT 0.3,
          trainer_rate REAL DEFAULT 0.1,
          locations TEXT DEFAULT '[]',
          pokemon_pool TEXT DEFAULT '[]',
          item_pool TEXT DEFAULT '[]',
          silver_points TEXT DEFAULT '[]',
          gold_points TEXT DEFAULT '[]',
          unlock_condition TEXT,
          level_min INTEGER DEFAULT 3,
          level_max INTEGER DEFAULT 10,
          start_location TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `)
      db.run(`CREATE INDEX IF NOT EXISTS idx_mc_name ON map_config(map_name)`)
      console.log('[迁移] map_config 表已创建')
      changes++
    } else {
      console.log('[迁移] map_config 表已存在')
    }
  } catch (e) {
    console.error('[迁移] 创建 map_config 表失败:', e.message)
  }
  
  console.log('\n=== 11. 检查并添加 map_locations 和 map_connections 表 ===')
  try {
    let result = db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='map_locations'")
    if (result.length === 0) {
      db.run(`
        CREATE TABLE IF NOT EXISTS map_locations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          description TEXT,
          location_type TEXT DEFAULT 'wild',
          difficulty INTEGER DEFAULT 1,
          level_min INTEGER DEFAULT 3,
          level_max INTEGER DEFAULT 10,
          pokemon_types TEXT DEFAULT '[]',
          features TEXT DEFAULT '[]',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `)
      db.run(`CREATE INDEX IF NOT EXISTS idx_ml_name ON map_locations(name)`)
      db.run(`CREATE INDEX IF NOT EXISTS idx_ml_difficulty ON map_locations(difficulty)`)
      console.log('[迁移] map_locations 表已创建')
      changes++
    } else {
      console.log('[迁移] map_locations 表已存在')
    }
  } catch (e) {
    console.error('[迁移] 创建 map_locations 表失败:', e.message)
  }
  
  try {
    const result = db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='map_connections'")
    if (result.length === 0) {
      db.run(`
        CREATE TABLE IF NOT EXISTS map_connections (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          from_location TEXT NOT NULL,
          north TEXT,
          east TEXT,
          south TEXT,
          west TEXT,
          FOREIGN KEY (from_location) REFERENCES map_locations(name),
          UNIQUE(from_location)
        )
      `)
      db.run(`CREATE INDEX IF NOT EXISTS idx_mc_from ON map_connections(from_location)`)
      console.log('[迁移] map_connections 表已创建')
      changes++
    } else {
      console.log('[迁移] map_connections 表已存在')
    }
  } catch (e) {
    console.error('[迁移] 创建 map_connections 表失败:', e.message)
  }
  
  console.log('\n=== 12. 检查并添加 rarity_probability 和 collection_names 表 ===')
  try {
    let result = db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='rarity_probability'")
    if (result.length === 0) {
      db.run(`
        CREATE TABLE IF NOT EXISTS rarity_probability (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          difficulty INTEGER NOT NULL,
          rarity_key TEXT NOT NULL,
          probability REAL NOT NULL DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(difficulty, rarity_key)
        )
      `)
      db.run(`CREATE INDEX IF NOT EXISTS idx_rp_difficulty ON rarity_probability(difficulty)`)
      console.log('[迁移] rarity_probability 表已创建')
      changes++
    } else {
      console.log('[迁移] rarity_probability 表已存在')
    }
  } catch (e) {
    console.error('[迁移] 创建 rarity_probability 表失败:', e.message)
  }
  
  try {
    const result = db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='collection_names'")
    if (result.length === 0) {
      db.run(`
        CREATE TABLE IF NOT EXISTS collection_names (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          rarity_key TEXT NOT NULL,
          name TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `)
      db.run(`CREATE INDEX IF NOT EXISTS idx_cn_rarity ON collection_names(rarity_key)`)
      console.log('[迁移] collection_names 表已创建')
      changes++
    } else {
      console.log('[迁移] collection_names 表已存在')
    }
  } catch (e) {
    console.error('[迁移] 创建 collection_names 表失败:', e.message)
  }
  
  console.log('\n=== 13. 检查并添加 medal_config 和 initial_pokemon 表 ===')
  try {
    let result = db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='medal_config'")
    if (result.length === 0) {
      db.run(`
        CREATE TABLE IF NOT EXISTS medal_config (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          medal_key TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          icon TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `)
      db.run(`CREATE INDEX IF NOT EXISTS idx_mc_key ON medal_config(medal_key)`)
      console.log('[迁移] medal_config 表已创建')
      changes++
    } else {
      console.log('[迁移] medal_config 表已存在')
    }
  } catch (e) {
    console.error('[迁移] 创建 medal_config 表失败:', e.message)
  }
  
  try {
    const result = db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='initial_pokemon'")
    if (result.length === 0) {
      db.run(`
        CREATE TABLE IF NOT EXISTS initial_pokemon (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          pokemon_name TEXT NOT NULL,
          sort_order INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `)
      db.run(`CREATE INDEX IF NOT EXISTS idx_ip_pokemon ON initial_pokemon(pokemon_name)`)
      console.log('[迁移] initial_pokemon 表已创建')
      changes++
    } else {
      console.log('[迁移] initial_pokemon 表已存在')
    }
  } catch (e) {
    console.error('[迁移] 创建 initial_pokemon 表失败:', e.message)
  }
  
  console.log('\n=== 14. 检查并添加 player_items, player_pokeballs, player_collections 表 ===')
  const playerItemTables = [
    {
      name: 'player_items',
      schema: `
        CREATE TABLE IF NOT EXISTS player_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT,
          item_id INTEGER,
          quantity INTEGER DEFAULT 1,
          location TEXT DEFAULT 'backpack',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES players(user_id),
          FOREIGN KEY (item_id) REFERENCES items(id)
        )
      `,
      indexes: ['idx_pi_user', 'idx_pi_item']
    },
    {
      name: 'player_pokeballs',
      schema: `
        CREATE TABLE IF NOT EXISTS player_pokeballs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT,
          pokeball_id INTEGER,
          quantity INTEGER DEFAULT 1,
          location TEXT DEFAULT 'backpack',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES players(user_id),
          FOREIGN KEY (pokeball_id) REFERENCES pokeballs(id)
        )
      `,
      indexes: ['idx_pb_user', 'idx_pb_pokeball']
    },
    {
      name: 'player_collections',
      schema: `
        CREATE TABLE IF NOT EXISTS player_collections (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT,
          collection_id INTEGER,
          location TEXT DEFAULT 'backpack',
          obtained_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES players(user_id),
          FOREIGN KEY (collection_id) REFERENCES collections(id)
        )
      `,
      indexes: ['idx_pc_user', 'idx_pc_collection']
    }
  ]
  
  for (const table of playerItemTables) {
    try {
      const result = db.all(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table.name}'`)
      if (result.length === 0) {
        db.run(table.schema)
        for (const idx of table.indexes) {
          db.run(`CREATE INDEX IF NOT EXISTS ${idx} ON ${table.name}(user_id)`)
        }
        console.log(`[迁移] ${table.name} 表已创建`)
        changes++
      } else {
        console.log(`[迁移] ${table.name} 表已存在`)
      }
    } catch (e) {
      console.error(`[迁移] 创建 ${table.name} 表失败:`, e.message)
    }
  }
  
  db.save()
  
  console.log('\n[迁移] === 迁移完成 ===')
  console.log(`[迁移] 共进行了 ${changes} 项结构变更`)
  console.log('[迁移] 数据库结构已与代码同步！')
  
  db.close()
}

if (require.main === module) {
  migrateSchema().catch(console.error)
}

module.exports = { migrateSchema }